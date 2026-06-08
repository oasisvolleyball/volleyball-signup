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
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Players!B4:E200',
    });
    const rows = response.data.values || [];
    const players = rows
      .filter(r => r[0] && r[0].trim())
      .map(r => ({ name: r[0], rating: r[2] || '—', level: r[3] || '—' }));
    return NextResponse.json({ players });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { date, name, type, amount, isNewPlayer } = await request.json();
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sessions!A:H',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['', date, name, '', '', type, 'No', amount]],
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
