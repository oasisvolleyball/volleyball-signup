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
    if (!date) return NextResponse.json({ signups: [] });
    const formattedDate = formatDate(date);

    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sessions!A:I',
    });

    const rows = response.data.values || [];
    // Columns: A=#, B=Date, C=Amount, D=Paid, E=Name, F=Type, G=Rating, H=Level, I=Signed Up At
    const signups = rows
      .slice(3)
      .filter(r => {
        const rowDate = (r[1] || '').trim();
        const rowName = (r[4] || '').trim();
        return rowDate === formattedDate && rowName !== '' && rowName !== '—';
      })
      .map(r => ({
        name: r[4] || '',
        type: r[5] || '',
        paid: r[3] || 'No',
        amount: parseFloat(r[2]) || 0,
        rating: r[6] || '',
        level: r[7] || '',
        signedUpAt: r[8] || '',
      }));

    return NextResponse.json({ signups });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
