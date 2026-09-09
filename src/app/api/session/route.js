import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SHEET = process.env.SPREADSHEET_ID;

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

function toSheetDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function parseSheetDate(str) {
  if (!str) return null;
  const clean = str.trim().replace('Sept','Sep');
  const m = clean.match(/^(\d{1,2})\s+(\w{3})\s+(\d{4})$/);
  if (!m) return null;
  const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
  const mo = months[m[2]];
  if (mo === undefined) return null;
  return new Date(parseInt(m[3]), mo, parseInt(m[1]));
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date     = searchParams.get('date') || '';
    const nameF    = searchParams.get('name') || '';
    const paidF    = searchParams.get('paid') || '';
    const attF     = searchParams.get('attended') || '';
    const fromF    = searchParams.get('from') || '';
    const toF      = searchParams.get('to') || '';
    const limit    = parseInt(searchParams.get('limit') || '2000');

    const s = getSheets();

    // Get all sheet names
    const meta = await s.spreadsheets.get({ spreadsheetId: SHEET });
    const allSheets = meta.data.sheets.map(sh => sh.properties.title);
    const toScan = ['Sessions', ...allSheets.filter(n => n.startsWith('Archive_'))];

    const results = [];

    for (const sheetName of toScan) {
      let res;
      try {
        res = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: `'${sheetName}'!A:K` });
      } catch { continue; }

      const rows = res.data.values || [];

      for (const row of rows.slice(2)) {
        const rowDate = (row[1] || '').trim().replace('Sept', 'Sep');
        const rowName = (row[4] || '').trim();
        if (!rowDate || !rowName || rowDate === 'Date' || rowName === 'Name' || rowName === '—') continue;

        // Filter by specific date
        if (date && rowDate !== toSheetDate(date)) continue;

        // Filter by date range
        if (fromF || toF) {
          const d = parseSheetDate(rowDate);
          if (!d) continue;
          if (fromF && d < new Date(fromF + 'T00:00:00')) continue;
          if (toF   && d > new Date(toF   + 'T23:59:59')) continue;
        }

        if (nameF && !rowName.toLowerCase().includes(nameF.toLowerCase())) continue;
        if (paidF && (row[3] || '').trim() !== paidF) continue;
        if (attF  && (row[8] || '').trim() !== attF)  continue;

        results.push({
          date:       rowDate,
          amount:     parseFloat(row[2]) || 0,
          paid:       (row[3] || 'No').trim(),
          name:       rowName,
          type:       (row[5] || '').trim(),
          rating:     (row[6] || '').trim(),
          status:     (row[7] || '').trim(),
          attended:   (row[8] || 'Yes').trim(),
          host:       (row[9] || 'No').trim(),
          signedUpAt: (row[10] || '').trim(),
          source:     sheetName,
        });
      }
    }

    // Sort newest first
    results.sort((a, b) => {
      const da = parseSheetDate(a.date) || new Date(0);
      const db = parseSheetDate(b.date) || new Date(0);
      return db - da || a.name.localeCompare(b.name);
    });

    // Friend requests for specific date
    let friendRequests = [];
    if (date) {
      try {
        const cr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Config!A1:B50' });
        const fr = (cr.data.values || []).find(r => r[0] === `fr_${date}`);
        if (fr?.[1]) friendRequests = JSON.parse(fr[1]);
      } catch {}
    }

    return NextResponse.json({ signups: results.slice(0, limit), total: results.length, friendRequests });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
