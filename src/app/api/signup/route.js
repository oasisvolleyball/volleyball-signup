import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SHEET = process.env.SPREADSHEET_ID;

function getSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

// Convert YYYY-MM-DD to "07 Sep 2026"
function toSheetDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function nowTs() {
  return new Date().toLocaleString('en-GB', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', hour12:true,
  });
}

async function getSessions(s) {
  try {
    const r = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Config!A1:B30' });
    const row = (r.data.values || []).find(r => r[0] === 'sessions');
    return row?.[1] ? JSON.parse(row[1]) : [];
  } catch { return []; }
}

async function saveSessions(s, sessions) {
  const r = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Config!A1:B30' });
  const rows = r.data.values || [];
  const idx = rows.findIndex(r => r[0] === 'sessions');
  if (idx >= 0) {
    await s.spreadsheets.values.update({
      spreadsheetId: SHEET, range: `Config!B${idx + 1}`,
      valueInputOption: 'RAW', requestBody: { values: [[JSON.stringify(sessions)]] },
    });
  } else {
    await s.spreadsheets.values.append({
      spreadsheetId: SHEET, range: 'Config!A:B',
      valueInputOption: 'RAW', requestBody: { values: [['sessions', JSON.stringify(sessions)]] },
    });
  }
}

async function findNextRow(s) {
  const r = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Sessions!E:E' });
  const rows = r.data.values || [];
  let last = 2; // header rows are 0,1,2 (indices), data from index 2
  for (let i = 2; i < rows.length; i++) {
    const v = (rows[i]?.[0] || '').trim();
    if (v && v !== 'Name' && v !== '—') last = i;
  }
  return last + 2; // 1-indexed sheet row
}

async function getStrikeCount(s, name) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);
  const r = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Sessions!B:J' });
  let strikes = 0;
  for (const row of (r.data.values || []).slice(2)) {
    if ((row[3] || '').trim().toLowerCase() !== name.trim().toLowerCase()) continue;
    if ((row[8] || '').trim() === 'Yes') continue; // host
    if ((row[7] || '').trim() !== 'No') continue;  // not a no-show
    try { if (new Date(row[0]) >= cutoff) strikes++; } catch {}
  }
  return strikes;
}

export async function GET() {
  try {
    const s = getSheets();

    const [pr, sessions] = await Promise.all([
      s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Players!B:H' }),
      getSessions(s),
    ]);

    const players = (pr.data.values || []).slice(2)
      .filter(r => r[0]?.trim() && r[0].trim() !== 'Name')
      .map(r => ({
        name: r[0].trim(),
        gender: r[1] || '',
        rating: r[2] || '',
        level: r[3] || '',
        setter: r[4] || '',
        attack: r[5] || '',
        receive: r[6] || '',
      }));

    // Auto-bump unpaid at 18h mark
    for (const sess of sessions) {
      if (!sess.date || !sess.time) continue;
      try {
        const timeStr = sess.time.split('–')[0].trim();
        const [timePart, meridiem] = timeStr.split(' ');
        let [h, m] = timePart.split(':').map(Number);
        if (meridiem === 'PM' && h !== 12) h += 12;
        if (meridiem === 'AM' && h === 12) h = 0;
        const [yr, mo, dy] = sess.date.split('-').map(Number);
        const sessTime = new Date(yr, mo - 1, dy, h, m || 0);
        const diff = sessTime - Date.now();
        if (diff >= 0 && diff <= 18 * 3600 * 1000) {
          const fd = toSheetDate(sess.date);
          const sr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Sessions!A:K' });
          for (let i = 2; i < sr.data.values.length; i++) {
            const row = sr.data.values[i];
            if ((row[1] || '').trim() !== fd) continue;
            if (!(row[4] || '').trim() || row[4].trim() === '—') continue;
            if ((row[9] || '').trim() === 'Yes') continue; // host
            if ((row[5] || '').trim() === 'Waitlist') continue;
            if ((row[3] || '').trim() === 'No') {
              await s.spreadsheets.values.update({
                spreadsheetId: SHEET, range: `Sessions!F${i + 1}`,
                valueInputOption: 'RAW', requestBody: { values: [['Waitlist']] },
              });
            }
          }
        }
      } catch {}
    }

    return NextResponse.json({ players, sessions });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const s = getSheets();

    // ── publish ──────────────────────────────────────────────
    if (body.action === 'publish') {
      const sessions = await getSessions(s);
      const { session } = body;
      const idx = sessions.findIndex(x => x.id === session.id);
      if (idx >= 0) {
        const oldMax = sessions[idx].maxGames || 0;
        sessions[idx] = session;
        await saveSessions(s, sessions);
        // Auto-promote waitlist if max increased
        if (session.maxGames > oldMax && session.date) {
          const fd = toSheetDate(session.date);
          const sr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Sessions!A:K' });
          const rows = sr.data.values || [];
          const confirmed = rows.slice(2).filter(r =>
            r[1] === fd && r[4]?.trim() && r[5] !== 'Waitlist' && r[9] !== 'Yes'
          ).length;
          const toFill = Math.min(session.maxGames - oldMax, session.maxGames - confirmed);
          const wl = rows.slice(2).filter(r => r[1] === fd && r[4]?.trim() && r[5] === 'Waitlist');
          for (let i = 0; i < Math.min(toFill, wl.length); i++) {
            const wi = rows.indexOf(wl[i]);
            await s.spreadsheets.values.update({
              spreadsheetId: SHEET, range: `Sessions!F${wi + 1}`,
              valueInputOption: 'RAW', requestBody: { values: [['Games Only']] },
            });
          }
        }
      } else {
        sessions.push(session);
        await saveSessions(s, sessions);
      }
      return NextResponse.json({ success: true });
    }

    // ── close ────────────────────────────────────────────────
    if (body.action === 'close') {
      const sessions = await getSessions(s);
      await saveSessions(s, sessions.filter(x => x.id !== body.sessionId));
      return NextResponse.json({ success: true });
    }

    // ── signup ───────────────────────────────────────────────
    if (body.action === 'signup') {
      const { date, name, type, amount, isNew, friend } = body;
      const fd = toSheetDate(date);
      const ts = nowTs();

      // Server-side duplicate check
      const sr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Sessions!B:F' });
      const existing = (sr.data.values || []).slice(2).find(r =>
        r[0]?.trim() === fd && r[3]?.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (existing) return NextResponse.json({ error: 'duplicate' }, { status: 400 });

      // Strike check
      const strikes = await getStrikeCount(s, name);
      if (strikes >= 3 && type !== 'Waitlist') {
        return NextResponse.json({ error: 'strike_block', strikes }, { status: 400 });
      }

      // Get player rating
      const pr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Players!B:D' });
      const pm = (pr.data.values || []).slice(2).find(r =>
        r[0]?.trim().toLowerCase() === name.trim().toLowerCase()
      );
      const rating = pm?.[2] || '';

      // Check if player is a host for this session
      const sessions = await getSessions(s);
      const sess = sessions.find(s => s.date === date);
      const hostNames = (sess?.hosts || '').split(',').map(h => h.trim().toLowerCase());
      const isHost = hostNames.includes(name.trim().toLowerCase());
      const finalAmount = isHost ? 0 : amount;
      const finalPaid = isHost ? 'Yes' : 'No';
      const finalHost = isHost ? 'Yes' : 'No';
      const finalType = isHost ? (type === 'Waitlist' ? 'Games Only' : type) : type;

      const row = await findNextRow(s);
      await s.spreadsheets.values.update({
        spreadsheetId: SHEET, range: `Sessions!A${row}:K${row}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['', fd, finalAmount, finalPaid, name.trim(), finalType, rating, 'Pending', 'Yes', finalHost, ts]] },
      });

      // Friend request
      if (friend?.trim()) {
        const cr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Config!A1:B50' });
        const crows = cr.data.values || [];
        const key = `fr_${date}`;
        const ci = crows.findIndex(r => r[0] === key);
        let existing = [];
        if (ci >= 0 && crows[ci][1]) { try { existing = JSON.parse(crows[ci][1]); } catch {} }
        existing.push({ name: name.trim(), with: friend.trim() });
        if (ci >= 0) {
          await s.spreadsheets.values.update({ spreadsheetId: SHEET, range: `Config!B${ci + 1}`, valueInputOption: 'RAW', requestBody: { values: [[JSON.stringify(existing)]] } });
        } else {
          await s.spreadsheets.values.append({ spreadsheetId: SHEET, range: 'Config!A:B', valueInputOption: 'RAW', requestBody: { values: [[key, JSON.stringify(existing)]] } });
        }
      }

      // New player
      if (isNew) {
        await s.spreadsheets.values.append({
          spreadsheetId: SHEET, range: 'Players!A:K',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [['', name.trim(), '', '', '', '', '', '', 'New — set rating', fd]] },
        });
      }

      return NextResponse.json({ success: true, strikes, isHost });
    }

    // ── remove ───────────────────────────────────────────────
    if (body.action === 'remove') {
      const { date, name, title, late } = body;
      const fd = toSheetDate(date);
      const ts = nowTs();

      const sr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Sessions!A:K' });
      const rows = sr.data.values || [];
      const ri = rows.findIndex(r => r[1]?.trim() === fd && r[4]?.trim() === name);
      const ctype = ri >= 0 ? (rows[ri][5] || '') : '';
      const isMain = ctype === 'Games Only' || ctype === 'Training + Games';

      if (ri >= 0) {
        await s.spreadsheets.values.update({
          spreadsheetId: SHEET, range: `Sessions!A${ri + 1}:K${ri + 1}`,
          valueInputOption: 'RAW', requestBody: { values: [['', '', '', '', '', '', '', '', '', '', '']] },
        });
      }

      // Auto-promote waitlist
      let promoted = null;
      if (isMain) {
        const wl = rows.find((r, i) => i !== ri && r[1]?.trim() === fd && r[4]?.trim() && r[5] === 'Waitlist');
        if (wl) {
          const wi = rows.indexOf(wl);
          await s.spreadsheets.values.update({
            spreadsheetId: SHEET, range: `Sessions!F${wi + 1}:I${wi + 1}`,
            valueInputOption: 'RAW', requestBody: { values: [['Games Only', 'Pending', 'Yes', 'No']] },
          });
          promoted = wl[4];
        }
      }

      // Log cancellation
      try {
        await s.spreadsheets.values.append({
          spreadsheetId: SHEET, range: 'Cancellations!A:G',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[ts, name, fd, title || '', ctype, promoted || '', late ? 'Yes' : 'No']] },
        });
      } catch {}

      return NextResponse.json({ success: true, promoted });
    }

    // ── update paid/attended ─────────────────────────────────
    if (body.action === 'update_signup') {
      const { date, name, field, value } = body;
      const fd = toSheetDate(date);
      const colMap = { paid: 'D', attended: 'I' };
      const col = colMap[field];
      if (!col) return NextResponse.json({ error: 'bad field' }, { status: 400 });
      const sr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Sessions!A:K' });
      const rows = sr.data.values || [];
      const ri = rows.findIndex(r => r[1]?.trim() === fd && r[4]?.trim() === name);
      if (ri >= 0) {
        await s.spreadsheets.values.update({
          spreadsheetId: SHEET, range: `Sessions!${col}${ri + 1}`,
          valueInputOption: 'RAW', requestBody: { values: [[value]] },
        });
      }
      return NextResponse.json({ success: true });
    }

    // ── rate player ──────────────────────────────────────────
    if (body.action === 'rate_player') {
      const { name, field, value } = body;
      const colMap = { rating: 'D', setter: 'F', attack: 'G', receive: 'H' };
      const col = colMap[field];
      if (!col) return NextResponse.json({ error: 'bad field' }, { status: 400 });
      const pr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Players!B:B' });
      const rows = pr.data.values || [];
      const ri = rows.findIndex(r => r[0]?.trim().toLowerCase() === name.trim().toLowerCase());
      if (ri >= 0) {
        await s.spreadsheets.values.update({
          spreadsheetId: SHEET, range: `Players!${col}${ri + 1}`,
          valueInputOption: 'RAW', requestBody: { values: [[value]] },
        });
      }
      return NextResponse.json({ success: true });
    }

    // ── save teams ───────────────────────────────────────────
    if (body.action === 'save_teams') {
      const { date, teams } = body;
      const fd = toSheetDate(date);
      const rows = [];
      let n = 1;
      for (const t of teams) {
        for (const p of t.players) {
          rows.push([n++, fd, p.name, t.color, p.setter ? 'Setter' : 'Player', p.rating || '']);
        }
      }
      await s.spreadsheets.values.append({
        spreadsheetId: SHEET, range: 'Teams!A:F',
        valueInputOption: 'USER_ENTERED', requestBody: { values: rows },
      });
      return NextResponse.json({ success: true });
    }

    // ── archive ──────────────────────────────────────────────
    if (body.action === 'archive') {
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - 3);
      const sr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Sessions!A:K' });
      const rows = sr.data.values || [];
      const headers = rows.slice(0, 2);
      const dataRows = rows.slice(2);
      const toArchive = [], toKeep = [];
      for (const row of dataRows) {
        if (!row[1] || !row[4]) { toKeep.push(row); continue; }
        try {
          const months = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
          const [, dy, mo, yr] = row[1].trim().match(/(\d+)\s+(\w+)\s+(\d+)/) || [];
          const d = new Date(yr, months[mo], dy);
          if (!isNaN(d) && d < cutoff) toArchive.push(row);
          else toKeep.push(row);
        } catch { toKeep.push(row); }
      }
      if (toArchive.length === 0) return NextResponse.json({ success: true, archived: 0 });
      const archiveName = `Archive_${cutoff.toLocaleString('en-GB', { month: 'short', year: 'numeric' }).replace(' ', '_')}`;
      try {
        await s.spreadsheets.batchUpdate({
          spreadsheetId: SHEET,
          requestBody: { requests: [{ addSheet: { properties: { title: archiveName } } }] },
        });
      } catch {}
      await s.spreadsheets.values.update({
        spreadsheetId: SHEET, range: `'${archiveName}'!A1`,
        valueInputOption: 'USER_ENTERED', requestBody: { values: [...headers, ...toArchive] },
      });
      const clearRows = [...headers, ...toKeep, ...toArchive.map(() => ['','','','','','','','','','',''])];
      await s.spreadsheets.values.update({
        spreadsheetId: SHEET, range: 'Sessions!A1',
        valueInputOption: 'USER_ENTERED', requestBody: { values: clearRows },
      });
      return NextResponse.json({ success: true, archived: toArchive.length, archiveName });
    }

    return NextResponse.json({ error: 'unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
