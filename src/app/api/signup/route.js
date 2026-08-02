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

function nowTimestamp() {
  return new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });
}

async function getSheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

async function loadSessions(sheets) {
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Config!A1:B20',
    });
    const rows = res.data.values || [];
    const sessionsRow = rows.find(r => r[0] === 'sessions');
    if (sessionsRow && sessionsRow[1] && sessionsRow[1].trim()) {
      return JSON.parse(sessionsRow[1]);
    }
    const sessionRow = rows.find(r => r[0] === 'session');
    if (sessionRow && sessionRow[1] && sessionRow[1].trim()) {
      return [JSON.parse(sessionRow[1])];
    }
    return [];
  } catch (e) { return []; }
}

async function saveSessions(sheets, sessions) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Config!A1:B20',
  });
  const rows = res.data.values || [];
  const idx = rows.findIndex(r => r[0] === 'sessions');
  if (idx >= 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Config!B${idx + 1}`,
      valueInputOption: 'RAW',
      requestBody: { values: [[JSON.stringify(sessions)]] },
    });
  } else {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Config!A:B',
      valueInputOption: 'RAW',
      requestBody: { values: [['sessions', JSON.stringify(sessions)]] },
    });
  }
}

async function findNextEmptySessionRow(sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sessions!B1:B2000',
  });
  const rows = res.data.values || [];
  for (let i = 3; i < rows.length; i++) {
    const val = rows[i] ? (rows[i][0] || '').trim() : '';
    if (!val || val === '—') return i + 1;
  }
  return rows.length + 1;
}

async function findNextEmptyPlayerRow(sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Players!B3:B500',
  });
  const rows = res.data.values || [];
  for (let i = 0; i < rows.length; i++) {
    const val = rows[i] ? (rows[i][0] || '').trim() : '';
    if (!val) return i + 3;
  }
  return rows.length + 3;
}

export async function GET() {
  try {
    const sheets = await getSheetsClient();

    const playersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Players!B3:E500',
    });
    const playerRows = playersRes.data.values || [];
    const players = playerRows
      .filter(r => r[0] && r[0].trim() && r[0] !== 'Name')
      .map(r => ({ name: r[0].trim(), rating: r[2] || '', level: r[3] || '' }));

    const sessions = await loadSessions(sheets);
    return NextResponse.json({ players, sessions });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const sheets = await getSheetsClient();

    // ── Publish session ──
    if (body.action === 'publish_session') {
      const sessions = await loadSessions(sheets);
      const { session } = body;
      const existing = sessions.findIndex(s => s.id === session.id);
      if (existing >= 0) sessions[existing] = session;
      else sessions.push(session);
      await saveSessions(sheets, sessions);
      return NextResponse.json({ success: true });
    }

    // ── Close session ──
    if (body.action === 'close_session') {
      const sessions = await loadSessions(sheets);
      await saveSessions(sheets, sessions.filter(s => s.id !== body.sessionId));
      return NextResponse.json({ success: true });
    }

    // ── Remove signup ──
    if (body.action === 'remove_signup') {
      const { date, name, sessionTitle } = body;
      const formattedDate = formatDate(date);
      const timestamp = nowTimestamp();

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Sessions!A:I',
      });
      const rows = res.data.values || [];

      // Find and get details of the cancelled row
      const rowIndex = rows.findIndex(r => r[1] === formattedDate && r[4] === name);
      const cancelledType = rowIndex >= 0 ? (rows[rowIndex][5] || '') : '';
      const cancelledAmount = rowIndex >= 0 ? (rows[rowIndex][2] || '0') : '0';

      // Clear the cancelled row
      if (rowIndex >= 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Sessions!A${rowIndex + 1}:I${rowIndex + 1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [['', '', '', '', '', '', '', '', '']] },
        });
      }

      // Only promote from waitlist if the cancelled player was in the MAIN list
      // (Games Only or Training + Games) — NOT if they were already on the Waitlist
      const isMainListCancellation = cancelledType === 'Games Only' || cancelledType === 'Training + Games';
      let promoted = null;

      if (isMainListCancellation) {
        const waitlistRow = rows.find((r, i) =>
          i !== rowIndex &&
          r[1] === formattedDate &&
          r[4] && r[4].trim() &&
          r[5] === 'Waitlist'
        );
        if (waitlistRow) {
          const waitlistRowIndex = rows.indexOf(waitlistRow);
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Sessions!A${waitlistRowIndex + 1}:I${waitlistRowIndex + 1}`,
            valueInputOption: 'USER_ENTERED',
            requestBody: {
              values: [[
                waitlistRow[0], waitlistRow[1], cancelledAmount, 'No',
                waitlistRow[4], 'Games Only', waitlistRow[6], waitlistRow[7],
                waitlistRow[8] || '', // keep original signup timestamp
              ]],
            },
          });
          promoted = waitlistRow[4];
        }
      }

      // Log to Cancellations sheet
      // Columns: Date Cancelled, Player Name, Session Date, Session Title, Type, Promoted Player
      try {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Cancellations!A:F',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[timestamp, name, formattedDate, sessionTitle || '', cancelledType, promoted || '']],
          },
        });
      } catch (e) {
        console.error('Cancellations log error:', e.message);
      }

      return NextResponse.json({ success: true, promoted });
    }

    // ── Player signup ──
    if (body.action === 'signup' || (!body.action && body.name)) {
      const { date, name, type, amount, isNewPlayer } = body;
      const formattedDate = formatDate(date);
      const timestamp = nowTimestamp();

      // Look up player rating and level
      const playersRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Players!B3:E500',
      });
      const playerRows = playersRes.data.values || [];
      const playerMatch = playerRows.find(
        r => r[0] && r[0].trim().toLowerCase() === name.trim().toLowerCase()
      );
      const rating = playerMatch ? (playerMatch[2] || '') : '';
      const level = playerMatch ? (playerMatch[3] || '') : '';

      const nextRow = await findNextEmptySessionRow(sheets);

      // Sheet columns: A=#, B=Date, C=Amount, D=Paid, E=Name, F=Type, G=Rating, H=Level, I=Signed Up At
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sessions!A${nextRow}:I${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['', formattedDate, amount, 'No', name, type, rating, level, timestamp]],
        },
      });

      if (isNewPlayer) {
        const nextPlayerRow = await findNextEmptyPlayerRow(sheets);
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Players!A${nextPlayerRow}:G${nextPlayerRow}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['', name.trim(), '', '', '', 'New – set rating', formattedDate]],
          },
        });
      }

      return NextResponse.json({ success: true, row: nextRow });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
