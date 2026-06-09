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

    // Save session to Config sheet
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

    // Remove a signup — find row by date+name and clear it
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

    // Player signup
    // Sheet columns: A=#, B=Date, C=Amount, D=Paid, E=Name, F=Type, G=Rating, H=Level
    const { date, name, type, amount, isNewPlayer } = body;
    const formattedDate = formatDate(date);

    const appendRes = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sessions!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['', formattedDate, amount, 'No', name, type, '', '']],
      },
    });

    if (isNewPlayer) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Players!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['', name, '', '', '', 'New – set rating', formattedDate]],
        },
      });
    }

    return NextResponse.json({ success: true, appended: appendRes.data });
  } catch (err) {
    return NextResponse.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
}
