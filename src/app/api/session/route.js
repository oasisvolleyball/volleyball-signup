import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SHEET = process.env.SPREADSHEET_ID;

function auth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function fmtDate2(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }).replace('Sept','Sep');
}

function parseDate(s) {
  if (!s) return null;
  const clean = s.trim().replace('Sept','Sep');
  // Try "08 Jun 2025" or "8 Jun 2025"
  const m = clean.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (m) {
    const d = new Date(`${m[2]} ${m[1].padStart(2,'0')} ${m[3]}`);
    if (!isNaN(d)) return d;
  }
  const d = new Date(clean);
  return isNaN(d) ? null : d;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date       = searchParams.get('date') || '';
    const nameF      = searchParams.get('name') || '';
    const paidF      = searchParams.get('paid') || '';
    const attF       = searchParams.get('attended') || '';
    const fromF      = searchParams.get('from') || '';
    const toF        = searchParams.get('to') || '';
    const limit      = parseInt(searchParams.get('limit') || '2000');

    const s = google.sheets({ version:'v4', auth: auth() });

    // Find all sheets to scan (Sessions + Archive_*)
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
      // Data starts at row 3 = index 2 (rows 0,1 are title and note, row 2 is header)
      for (const row of rows.slice(2)) {
        const rowDate = (row[1]||'').trim().replace('Sept','Sep');
        const rowName = (row[4]||'').trim();

        // Skip empty, header rows
        if (!rowDate || !rowName) continue;
        if (rowDate === 'Date' || rowName === 'Name' || rowName === '—') continue;

        // Filter by specific date
        if (date) {
          if (rowDate !== fmtDate2(date)) continue;
        }

        // Filter by date range
        if (fromF || toF) {
          const d = parseDate(rowDate);
          if (!d) continue;
          if (fromF && d < new Date(fromF+'T00:00:00')) continue;
          if (toF   && d > new Date(toF+'T23:59:59')) continue;
        }

        if (nameF && !rowName.toLowerCase().includes(nameF.toLowerCase())) continue;
        if (paidF && (row[3]||'').trim() !== paidF) continue;
        if (attF  && (row[8]||'').trim() !== attF)  continue;

        results.push({
          date:      rowDate,
          amount:    parseFloat(row[2]) || 0,
          paid:      (row[3]||'No').trim(),
          name:      rowName,
          type:      (row[5]||'').trim(),
          rating:    (row[6]||'').trim(),
          status:    (row[7]||'').trim(),
          attended:  (row[8]||'Yes').trim(),
          host:      (row[9]||'No').trim(),
          signedUpAt:(row[10]||'').trim(),
          source:    sheetName,
        });
      }
    }

    // Sort newest first
    results.sort((a,b) => {
      const da = parseDate(a.date) || new Date(0);
      const db = parseDate(b.date) || new Date(0);
      return db - da || a.name.localeCompare(b.name);
    });

    // Friend requests for specific date
    let friendRequests = [];
    if (date) {
      try {
        const cr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Config!A1:B50' });
        const crows = cr.data.values || [];
        const fr = crows.find(r => r[0] === `fr_${date}`);
        if (fr?.[1]) friendRequests = JSON.parse(fr[1]);
      } catch {}
    }

    return NextResponse.json({ signups: results.slice(0, limit), total: results.length, friendRequests });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
