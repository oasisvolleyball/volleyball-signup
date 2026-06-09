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

async function findNextEmptyRow(sheets) {
  // Read only column B (Date) to find first empty row after headers
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sessions!B1:B2000',
  });
  const rows = res.data.values || [];
  // Find first row after row 3 (headers) where B is empty
  for (let i = 3; i < rows.length; i++) {
    if (!rows[i] || !rows[i][0] || rows[i][0].trim() === '' || rows[i][0] === '—') {
      return i + 1; // 1-indexed row number
    }
  }
  return rows.length + 1;
}

export async function GET() {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const playersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Players!B3:E200',
    });
    const rows = playersRes.data.values || [];
    const players = rows
      .filter(r => r[0] && r[0].trim() && r[0] !== 'Name')
      .map(r => ({ name: r[0], rating: r[2] || '—', level: r[3] || '—' }));

    let session = null;
    try {
      const configRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Config!A1:B10',
      });
      const configRows = configRes.data.values || [];
      const sessionRow = configRows.find(r => r[0] === 'session');
      if (sessionRow && sessionRow[1] && sessionRow[1].trim()) {
        session = JSON.parse(sessionRow[1]);
      }
    } catch (e) {}

    return NextResponse.json({ players, session });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    if (body.action === 'publish_session') {
      const { session } = body;
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Config!B2',
        valueInputOption: 'RAW',
        requestBody: { values: [[JSON.stringify(session)]] },
      });
      return NextResponse.json({ success: true });
    }

    if (body.action === 'remove_signup') {
      const { date, name } = body;
      const formattedDate = formatDate(date);
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sessions!A:H',
      });
      const rows = res.data.values || [];
      const rowIndex = rows.findIndex(r => r[1] === formattedDate && r[4] === name);
      if (rowIndex >= 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Sessions!A${rowIndex + 1}:H${rowIndex + 1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [['', '', '', '', '', '', '', '']] },
        });
      }
      return NextResponse.json({ success: true });
    }

    // Player signup — find first empty row and write directly to it
    const { date, name, type, amount, isNewPlayer } = body;
    const formattedDate = formatDate(date);

    // Look up player rating and level from Players sheet
    const playersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Players!B3:E500',
    });
    const playerRows = playersRes.data.values || [];
    const playerRow = playerRows.find(r => r[0] && r[0].trim().toLowerCase() === name.trim().toLowerCase());
    const rating = playerRow ? (playerRow[2] || '') : '';
    const level = playerRow ? (playerRow[3] || '') : '';

    const nextRow = await findNextEmptyRow(sheets);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Sessions!A${nextRow}:H${nextRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['', formattedDate, amount, 'No', name, type, rating, level]],
      },
    });

    if (isNewPlayer) {
      // Find next empty row in Players sheet
      const playersRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Players!B3:B500',
      });
      const playerRows = playersRes.data.values || [];
      let nextPlayerRow = 3;
      for (let i = 0; i < playerRows.length; i++) {
        if (!playerRows[i] || !playerRows[i][0] || playerRows[i][0].trim() === '') {
          nextPlayerRow = i + 3;
          break;
        }
        nextPlayerRow = i + 4;
      }
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Players!A${nextPlayerRow}:G${nextPlayerRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['', name, '', '', '', 'New – set rating', formattedDate]],
        },
      });
    }

    return NextResponse.json({ success: true, row: nextRow });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
