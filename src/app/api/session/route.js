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
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const searchName = searchParams.get('name');
    const searchPaid = searchParams.get('paid');
    const searchAttended = searchParams.get('attended');
    const dateFrom = searchParams.get('from');
    const dateTo = searchParams.get('to');
    const limit = parseInt(searchParams.get('limit') || '500');

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // Load from both Sessions and any Archive sheets
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    const sheetNames = spreadsheet.data.sheets.map(s => s.properties.title);
    const sessionSheets = ['Sessions', ...sheetNames.filter(n => n.startsWith('Archive_'))];

    let allSignups = [];

    for (const sheetName of sessionSheets) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A:K`,
      });
      const rows = response.data.values || [];
      const signups = rows.slice(3).filter(r => {
        const rowDate = (r[1] || '').trim();
        const rowName = (r[4] || '').trim();
        if (!rowDate || !rowName || rowName === '—') return false;

        // Filter by specific date
        if (date) {
          const formatted = formatDate(date);
          if (rowDate !== formatted) return false;
        }

        // Filter by date range
        if (dateFrom || dateTo) {
          try {
            const rowD = new Date(rowDate);
            if (dateFrom && rowD < new Date(dateFrom)) return false;
            if (dateTo && rowD > new Date(dateTo)) return false;
          } catch {}
        }

        // Filter by player name
        if (searchName && !rowName.toLowerCase().includes(searchName.toLowerCase())) return false;

        // Filter by paid status
        if (searchPaid && (r[3] || '').trim() !== searchPaid) return false;

        // Filter by attended
        if (searchAttended && (r[8] || '').trim() !== searchAttended) return false;

        return true;
      }).map(r => ({
        date: r[1] || '',
        amount: parseFloat(r[2]) || 0,
        paid: r[3] || 'No',
        name: r[4] || '',
        type: r[5] || '',
        rating: r[6] || '',
        status: r[7] || '',
        attended: r[8] || 'Yes',
        host: r[9] || 'No',
        signedUpAt: r[10] || '',
        source: sheetName,
      }));

      allSignups = [...allSignups, ...signups];
    }

    // Sort by date desc, then name
    allSignups.sort((a, b) => {
      const da = new Date(a.date); const db = new Date(b.date);
      return db - da || a.name.localeCompare(b.name);
    });

    // Load friend requests for the date if searching by date
    let friendRequests = [];
    if (date) {
      try {
        const configRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID, range: 'Config!A1:B30',
        });
        const configRows = configRes.data.values || [];
        const frRow = configRows.find(r => r[0] === `fr_${date}`);
        if (frRow?.[1]) friendRequests = JSON.parse(frRow[1]);
      } catch {}
    }

    return NextResponse.json({
      signups: allSignups.slice(0, limit),
      total: allSignups.length,
      friendRequests,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
