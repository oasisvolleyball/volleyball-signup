import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const WHATSAPP_GROUP = 'https://chat.whatsapp.com/GD7I8r3fnTNLAEN6s6q2b7';

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function nowTimestamp() {
  return new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isWithin18Hours(session) {
  if (!session?.date || !session?.time) return false;
  try {
    const startTime = session.time.split('–')[0].trim();
    const sessionDate = new Date(session.date + ' ' + startTime);
    if (isNaN(sessionDate)) return false;
    const diff = sessionDate - Date.now();
    return diff >= 0 && diff <= 18 * 60 * 60 * 1000;
  } catch { return false; }
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
    const row = rows.find(r => r[0] === 'sessions');
    if (row?.[1]) return JSON.parse(row[1]);
    return [];
  } catch { return []; }
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

async function findNextSessionRow(sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sessions!B1:B3000',
  });
  const rows = res.data.values || [];
  let lastDataRow = 3;
  for (let i = 3; i < rows.length; i++) {
    const val = rows[i]?.[0]?.trim() || '';
    if (val && val !== '—') lastDataRow = i + 1;
  }
  return lastDataRow + 1;
}

async function getPlayerStrikes(sheets, name) {
  // Count no-shows in last 3 months in Sessions sheet
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Sessions!B:J',
  });
  const rows = res.data.values || [];
  let strikes = 0;
  for (const row of rows.slice(3)) {
    const rowName = (row[3] || '').trim(); // col E = index 3 in B:J
    const attended = (row[7] || '').trim(); // col I = index 7
    const host = (row[8] || '').trim();    // col J = index 8
    const dateStr = (row[0] || '').trim(); // col B = index 0
    if (rowName.toLowerCase() !== name.toLowerCase()) continue;
    if (host === 'Yes') continue;
    if (attended !== 'No') continue;
    // Check if within 3 months
    try {
      const d = new Date(dateStr);
      if (d >= threeMonthsAgo) strikes++;
    } catch {}
  }
  return strikes;
}

export async function GET() {
  try {
    const sheets = await getSheetsClient();

    // Load players
    const playersRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Players!A:N',
    });
    const playerRows = playersRes.data.values || [];
    const players = playerRows.slice(3)
      .filter(r => r[1] && r[1].trim() && r[1] !== 'Name')
      .map(r => ({
        name: r[1]?.trim() || '',
        gender: r[2] || '',
        rating: r[3] || '',
        level: r[4] || '',
        setter: r[5] || '',
        attack: r[6] || '',
        receive: r[7] || '',
      }));

    // Load sessions
    const sessions = await loadSessions(sheets);

    // Auto-bump unpaid players at 18h mark
    let bumped = false;
    for (const session of sessions) {
      if (isWithin18Hours(session)) {
        // Find unpaid non-waitlist signups and move to bottom of waitlist
        const sessRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Sessions!A:K',
        });
        const sessRows = sessRes.data.values || [];
        const formattedDate = formatDate(session.date);
        for (let i = 3; i < sessRows.length; i++) {
          const row = sessRows[i];
          const rowDate = (row[1] || '').trim();
          const paid = (row[3] || '').trim();
          const name = (row[4] || '').trim();
          const type = (row[5] || '').trim();
          const host = (row[9] || '').trim();
          if (rowDate !== formattedDate) continue;
          if (!name || name === '—') continue;
          if (host === 'Yes') continue;
          if (type === 'Waitlist') continue;
          if (paid === 'No') {
            // Move to waitlist
            await sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: `Sessions!F${i + 1}`,
              valueInputOption: 'RAW',
              requestBody: { values: [['Waitlist']] },
            });
            bumped = true;
          }
        }
      }
    }

    return NextResponse.json({ players, sessions, bumped });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const sheets = await getSheetsClient();

    // ── Publish session ──────────────────────────────────────
    if (body.action === 'publish_session') {
      const sessions = await loadSessions(sheets);
      const { session } = body;
      const idx = sessions.findIndex(s => s.id === session.id);
      if (idx >= 0) {
        // Check if maxGames increased — auto-promote waitlist
        const oldMax = sessions[idx].maxGames || 0;
        const newMax = session.maxGames || 0;
        sessions[idx] = session;
        await saveSessions(sheets, sessions);
        if (newMax > oldMax && session.date) {
          const formattedDate = formatDate(session.date);
          const sessRes = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID, range: 'Sessions!A:K',
          });
          const rows = sessRes.data.values || [];
          const confirmed = rows.slice(3).filter(r =>
            r[1] === formattedDate && r[4]?.trim() &&
            (r[5] === 'Games Only' || r[5] === 'Training + Games') && r[9] !== 'Yes'
          ).length;
          const spotsToFill = Math.min(newMax - oldMax, newMax - confirmed);
          const waitlist = rows.slice(3).filter(r =>
            r[1] === formattedDate && r[4]?.trim() && r[5] === 'Waitlist'
          );
          for (let i = 0; i < Math.min(spotsToFill, waitlist.length); i++) {
            const wIdx = rows.indexOf(waitlist[i]);
            await sheets.spreadsheets.values.update({
              spreadsheetId: SPREADSHEET_ID,
              range: `Sessions!F${wIdx + 1}`,
              valueInputOption: 'RAW',
              requestBody: { values: [['Games Only']] },
            });
          }
        }
      } else {
        sessions.push(session);
        await saveSessions(sheets, sessions);
      }
      return NextResponse.json({ success: true });
    }

    // ── Close session ────────────────────────────────────────
    if (body.action === 'close_session') {
      const sessions = await loadSessions(sheets);
      await saveSessions(sheets, sessions.filter(s => s.id !== body.sessionId));
      return NextResponse.json({ success: true });
    }

    // ── Signup ───────────────────────────────────────────────
    if (body.action === 'signup') {
      const { date, name, type, amount, isNewPlayer, friendRequest } = body;
      const formattedDate = formatDate(date);
      const timestamp = nowTimestamp();

      // Check strikes
      const strikes = await getPlayerStrikes(sheets, name);
      if (strikes >= 3 && type !== 'Waitlist') {
        return NextResponse.json({ error: 'strike_block', strikes }, { status: 400 });
      }

      // Look up player rating
      const playersRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID, range: 'Players!B4:H300',
      });
      const playerRows = playersRes.data.values || [];
      const playerMatch = playerRows.find(r =>
        r[0]?.trim().toLowerCase() === name.trim().toLowerCase()
      );
      const rating = playerMatch?.[2] || '';

      const nextRow = await findNextSessionRow(sheets);

      // Sessions columns: #, Date, Amount, Paid, Name, Type, Rating, Status, Attended, Host, SignedUpAt
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sessions!A${nextRow}:K${nextRow}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [['', formattedDate, amount, 'No', name, type, rating, 'Pending', 'Yes', 'No', timestamp]],
        },
      });

      // Store friend request in Config if provided
      if (friendRequest?.trim()) {
        const configRes = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID, range: 'Config!A1:B30',
        });
        const configRows = configRes.data.values || [];
        const frKey = `fr_${date}`;
        const frIdx = configRows.findIndex(r => r[0] === frKey);
        let existing = [];
        if (frIdx >= 0 && configRows[frIdx][1]) {
          try { existing = JSON.parse(configRows[frIdx][1]); } catch {}
        }
        existing.push({ name: name.trim(), with: friendRequest.trim() });
        if (frIdx >= 0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Config!B${frIdx + 1}`,
            valueInputOption: 'RAW',
            requestBody: { values: [[JSON.stringify(existing)]] },
          });
        } else {
          await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Config!A:B',
            valueInputOption: 'RAW',
            requestBody: { values: [[frKey, JSON.stringify(existing)]] },
          });
        }
      }

      // Add new player to Players sheet
      if (isNewPlayer) {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Players!A:N',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['', name.trim(), '', '', '', '', '', '', 'New player — set rating', formattedDate]] },
        });
      }

      return NextResponse.json({ success: true, strikes });
    }

    // ── Remove signup ────────────────────────────────────────
    if (body.action === 'remove_signup') {
      const { date, name, sessionTitle, isLateCancel } = body;
      const formattedDate = formatDate(date);
      const timestamp = nowTimestamp();

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID, range: 'Sessions!A:K',
      });
      const rows = res.data.values || [];
      const rowIdx = rows.findIndex(r => r[1] === formattedDate && r[4] === name);
      const cancelledType = rowIdx >= 0 ? (rows[rowIdx][5] || '') : '';
      const isMainList = cancelledType === 'Games Only' || cancelledType === 'Training + Games';

      if (rowIdx >= 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Sessions!A${rowIdx + 1}:K${rowIdx + 1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [['', '', '', '', '', '', '', '', '', '', '']] },
        });
      }

      // Auto-promote waitlist if main list cancelled
      let promoted = null;
      if (isMainList) {
        const waitlistRow = rows.find((r, i) =>
          i !== rowIdx && r[1] === formattedDate && r[4]?.trim() && r[5] === 'Waitlist'
        );
        if (waitlistRow) {
          const wIdx = rows.indexOf(waitlistRow);
          await sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Sessions!F${wIdx + 1}:I${wIdx + 1}`,
            valueInputOption: 'RAW',
            requestBody: { values: [['Games Only', 'Pending', 'Yes', 'No']] },
          });
          promoted = waitlistRow[4];
        }
      }

      // Log to Cancellations
      try {
        await sheets.spreadsheets.values.append({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Cancellations!A:G',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[timestamp, name, formattedDate, sessionTitle || '', cancelledType, promoted || '', isLateCancel ? 'Yes' : 'No']],
          },
        });
      } catch {}

      return NextResponse.json({ success: true, promoted });
    }

    // ── Update signup field (paid, attended, rating) ─────────
    if (body.action === 'update_signup') {
      const { date, name, field, value } = body;
      const formattedDate = formatDate(date);
      const colMap = { paid: 'D', attended: 'I' };
      const col = colMap[field];
      if (!col) return NextResponse.json({ error: 'Invalid field' }, { status: 400 });

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID, range: 'Sessions!A:K',
      });
      const rows = res.data.values || [];
      const rowIdx = rows.findIndex(r => r[1] === formattedDate && r[4] === name);
      if (rowIdx >= 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Sessions!${col}${rowIdx + 1}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[value]] },
        });
      }
      return NextResponse.json({ success: true });
    }

    // ── Update player profile (rating, attack, receive, setter) ──
    if (body.action === 'update_player') {
      const { name, field, value } = body;
      const colMap = { rating: 'D', setter: 'F', attack: 'G', receive: 'H' };
      const col = colMap[field];
      if (!col) return NextResponse.json({ error: 'Invalid field' }, { status: 400 });

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID, range: 'Players!B4:B300',
      });
      const rows = res.data.values || [];
      const rowIdx = rows.findIndex(r => r[0]?.trim().toLowerCase() === name.trim().toLowerCase());
      if (rowIdx >= 0) {
        const sheetRow = rowIdx + 4;
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `Players!${col}${sheetRow}`,
          valueInputOption: 'RAW',
          requestBody: { values: [[value]] },
        });
      }
      return NextResponse.json({ success: true });
    }

    // ── Save teams ───────────────────────────────────────────
    if (body.action === 'save_teams') {
      const { date, teams, sessionTitle } = body;
      const formattedDate = formatDate(date);
      const timestamp = nowTimestamp();
      const rows = [];
      let num = 1;
      for (const team of teams) {
        for (const player of team.players) {
          rows.push([num++, formattedDate, player.name, team.color, player.setter ? 'Setter' : 'Player', player.rating || '']);
        }
      }
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Teams!A:F',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
      return NextResponse.json({ success: true });
    }

    // ── Archive old sessions ─────────────────────────────────
    if (body.action === 'archive') {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID, range: 'Sessions!A:K',
      });
      const rows = res.data.values || [];
      const headers = rows.slice(0, 3);
      const dataRows = rows.slice(3);

      const toArchive = [];
      const toKeep = headers.slice();

      for (const row of dataRows) {
        if (!row[1] || !row[4]) { toKeep.push(row); continue; }
        try {
          const d = new Date(row[1]);
          if (d < threeMonthsAgo) toArchive.push(row);
          else toKeep.push(row);
        } catch { toKeep.push(row); }
      }

      if (toArchive.length === 0) return NextResponse.json({ success: true, archived: 0 });

      // Create archive sheet name
      const archiveName = `Archive_${threeMonthsAgo.toLocaleString('en-GB', { month: 'short', year: 'numeric' }).replace(' ','_')}`;

      // Add archive sheet
      const sheetsApi = await getSheetsClient();
      try {
        await sheetsApi.spreadsheets.batchUpdate({
          spreadsheetId: SPREADSHEET_ID,
          requestBody: { requests: [{ addSheet: { properties: { title: archiveName } } }] },
        });
      } catch {}

      // Write to archive
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${archiveName}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [...headers, ...toArchive] },
      });

      // Clear archived rows from Sessions (replace with empty rows)
      const clearRows = dataRows.map(row => {
        try {
          const d = new Date(row[1]);
          return d < threeMonthsAgo ? ['', '', '', '', '', '', '', '', '', '', ''] : row;
        } catch { return row; }
      });

      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `Sessions!A4`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: clearRows },
      });

      return NextResponse.json({ success: true, archived: toArchive.length, archiveName });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
