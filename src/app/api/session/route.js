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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sessions!A:H',
    });

    const rows = response.data.values || [];
    const signups = rows
      .slice(3)
      .filter(r => r[1] === date && r[2] && r[2].trim())
      .map(r => ({
        name: r[2],
        rating: r[3] || '—',
        level: r[4] || '—',
        type: r[5] || '',
        paid: r[6] || 'No',
        amount: r[7] || 0,
      }));

    return NextResponse.json({ signups });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
