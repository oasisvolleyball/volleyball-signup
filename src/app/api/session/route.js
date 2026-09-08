import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function parseSheetDate(dateStr) {
  // Parse "08 Jun 2025", "8 Jun 2025", "2025-06-08" etc
  if (!dateStr) return null;
  const s = dateStr.trim().replace('Sept','Sep');
  // Try ISO first
  let d = new Date(s);
  if (!isNaN(d)) return d;
  // Try "DD Mon YYYY"
  const parts = s.split(' ');
  if (parts.length === 3) {
    d = new Date(`${parts[1]} ${parts[0].padStart(2,'0')} ${parts[2]}`);
    if (!isNaN(d)) return d;
  }
  return null;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date       = searchParams.get('date');
    const searchName = searchParams.get('name') || '';
    const searchPaid = searchParams.get('paid') || '';
    const searchAtt  = searchParams.get('attended') || '';
    const dateFrom   = searchParams.get('from') || '';
    const dateTo     = searchParams.get('to') || '';
    const limit      = parseInt(searchParams.get('limit') || '1000');

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Load Sessions + all Archive_ sheets
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetNames  = spreadsheet.data.sheets.map(s => s.properties.title);
    const toScan = ['Sessions', ...sheetNames.filter(n => n.startsWith('Archive_'))];

    let allSignups = [];

    for (const sheetName of toScan) {
      let res;
      try {
        res = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `'${sheetName}'!A:K`,
        });
      } catch { continue; }

      const rows = res.data.values || [];
      // Data starts at row 3 (index 2) — rows 0,1 are title+note, row 2 is header
      const dataRows = rows.slice(2);

      for (const r of dataRows) {
        const rowDate = (r[1] || '').trim().replace('Sept','Sep');
        const rowName = (r[4] || '').trim();

        // Skip empty / header rows
        if (!rowDate || !rowName || rowName === '—' || rowName === 'Name') continue;
        // Skip header row that might have slipped in
        if (rowDate === 'Date' || rowDate === 'Date\n(AED)') continue;

        // Filter by specific date
        if (date) {
          const formatted = formatDate(date);
          if (rowDate !== formatted) continue;
        }

        // Filter by date range
        if (dateFrom || dateTo) {
          const rowD = parseSheetDate(rowDate);
          if (!rowD) continue;
          if (dateFrom && rowD < new Date(dateFrom + 'T00:00:00')) continue;
          if (dateTo   && rowD > new Date(dateTo   + 'T23:59:59')) continue;
        }

        // Filter by name
        if (searchName && !rowName.toLowerCase().includes(searchName.toLowerCase())) continue;
        // Filter by paid
        if (searchPaid && (r[3] || '').trim() !== searchPaid) continue;
        // Filter by attended
        if (searchAtt  && (r[8] || '').trim() !== searchAtt) continue;

        allSignups.push({
          date:       rowDate,
          amount:     parseFloat(r[2]) || 0,
          paid:       (r[3] || 'No').trim(),
          name:       rowName,
          type:       (r[5] || '').trim(),
          rating:     (r[6] || '').trim(),
          status:     (r[7] || '').trim(),
          attended:   (r[8] || 'Yes').trim(),
          host:       (r[9] || 'No').trim(),
          signedUpAt: (r[10] || '').trim(),
          source:     sheetName,
        });
      }
    }

    // Sort: newest date first, then name
    allSignups.sort((a, b) => {
      const da = parseSheetDate(a.date) || new Date(0);
      const db = parseSheetDate(b.date) || new Date(0);
      return db - da || a.name.localeCompare(b.name);
    });

    // Load friend requests for specific date
    let friendRequests = [];
    if (date) {
      try {
        const cfgRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID, range: 'Config!A1:B50',
        });
        const cfgRows = cfgRes.data.values || [];
        const frRow = cfgRows.find(r => r[0] === `fr_${date}`);
        if (frRow?.[1]) friendRequests = JSON.parse(frRow[1]);
      } catch {}
    }

    return NextResponse.json({
      signups: allSignups.slice(0, limit),
      total:   allSignups.length,
      friendRequests,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
