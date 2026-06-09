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
  const results = {};

  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    results.auth = 'OK';
    results.spreadsheet_id = SPREADSHEET_ID;

    // Test read
    try {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sessions!A1:H5',
      });
      results.read = 'OK';
      results.first_rows = res.data.values;
    } catch (e) {
      results.read = 'FAILED: ' + e.message;
    }

    // Test write
    try {
      const appendRes = await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sessions!A:H',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['', '12 Jun 2026', 35, 'No', 'TEST_DELETE_ME', 'Games Only', '', '']],
        },
      });
      results.write = 'OK';
      results.written_to = appendRes.data.updates?.updatedRange;
    } catch (e) {
      results.write = 'FAILED: ' + e.message;
    }

  } catch (e) {
    results.auth = 'FAILED: ' + e.message;
  }

  return NextResponse.json(results, { status: 200 });
}
