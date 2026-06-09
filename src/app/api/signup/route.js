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

    // Sheet columns: A=#, B=Date, C=Amount, D=Paid, E=Name, F=Type, G=Rating, H=Level
    const { date, name, type, amount, isNewPlayer } = body;

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sessions!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['', date, amount, 'No', name, type, '', '']],
      },
    });

    if (isNewPlayer) {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Players!A:G',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['', name, '', '', '', 'New – set rating', date]],
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
