import { google } from 'googleapis';
import { NextResponse } from 'next/server';

const SHEET = process.env.SPREADSHEET_ID;

function auth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

function sheets() {
  return google.sheets({ version: 'v4', auth: auth() });
}

function fmtDate(d) {
  if (!d) return '';
  if (d instanceof Date) return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const s = String(d).trim().replace('Sept','Sep');
  if (!s || s === 'nan') return '';
  return s;
}

function fmtDate2(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' }).replace('Sept','Sep');
}

function now() {
  return new Date().toLocaleString('en-GB', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', hour12:true,
  });
}

async function getSessions(s) {
  try {
    const r = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Config!A1:B30' });
    const rows = r.data.values || [];
    const row = rows.find(r => r[0] === 'sessions');
    return row?.[1] ? JSON.parse(row[1]) : [];
  } catch { return []; }
}

async function setSessions(s, sessions) {
  const r = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Config!A1:B30' });
  const rows = r.data.values || [];
  const idx = rows.findIndex(r => r[0] === 'sessions');
  if (idx >= 0) {
    await s.spreadsheets.values.update({
      spreadsheetId: SHEET, range: `Config!B${idx+1}`,
      valueInputOption: 'RAW', requestBody: { values: [[JSON.stringify(sessions)]] },
    });
  } else {
    await s.spreadsheets.values.append({
      spreadsheetId: SHEET, range: 'Config!A:B',
      valueInputOption: 'RAW', requestBody: { values: [['sessions', JSON.stringify(sessions)]] },
    });
  }
}

async function nextRow(s) {
  const r = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Sessions!E:E' });
  const rows = r.data.values || [];
  // Find last row with a real name (col E = Name, data starts row 3, index 2)
  let last = 2;
  for (let i = 2; i < rows.length; i++) {
    const v = (rows[i]?.[0] || '').trim();
    if (v && v !== 'Name' && v !== '—') last = i;
  }
  return last + 2; // 1-indexed, one row after last data
}

async function countStrikes(s, name) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);
  const r = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Sessions!B:J' });
  const rows = r.data.values || [];
  let strikes = 0;
  for (const row of rows.slice(2)) {
    if ((row[3]||'').trim().toLowerCase() !== name.toLowerCase()) continue;
    if ((row[8]||'').trim() === 'Yes') continue; // host
    if ((row[7]||'').trim() !== 'No') continue;  // attended = No
    try {
      const d = new Date(row[0]);
      if (d >= cutoff) strikes++;
    } catch {}
  }
  return strikes;
}

export async function GET() {
  try {
    const s = sheets();

    // Players — rows start at index 2 (row 3 after 2 header rows)
    const pr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Players!A:N' });
    const prows = pr.data.values || [];
    const players = prows.slice(2).filter(r => r[1]?.trim() && r[1].trim() !== 'Name').map(r => ({
      name: r[1]?.trim() || '',
      gender: r[2] || '',
      rating: r[3] || '',
      level: r[4] || '',
      setter: r[5] || '',
      attack: r[6] || '',
      receive: r[7] || '',
    }));

    const sessions = await getSessions(s);

    // Auto-bump unpaid at 18h mark
    for (const sess of sessions) {
      if (!sess.date || !sess.time) continue;
      try {
        const start = sess.time.split('–')[0].trim();
        const diff = new Date(sess.date + ' ' + start) - Date.now();
        if (diff >= 0 && diff <= 18 * 3600 * 1000) {
          const sr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Sessions!A:K' });
          const srows = sr.data.values || [];
          const fd = fmtDate2(sess.date);
          for (let i = 2; i < srows.length; i++) {
            const row = srows[i];
            if ((row[1]||'').trim() !== fd) continue;
            if (!(row[4]||'').trim() || (row[4]||'').trim() === '—') continue;
            if ((row[9]||'').trim() === 'Yes') continue; // host
            if ((row[5]||'').trim() === 'Waitlist') continue;
            if ((row[3]||'').trim() === 'No') {
              await s.spreadsheets.values.update({
                spreadsheetId: SHEET, range: `Sessions!F${i+1}`,
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
    const s = sheets();

    // ── publish ──────────────────────────────────────────────
    if (body.action === 'publish') {
      const sessions = await getSessions(s);
      const { session } = body;
      const idx = sessions.findIndex(x => x.id === session.id);
      if (idx >= 0) {
        const old = sessions[idx];
        sessions[idx] = session;
        await setSessions(s, sessions);
        // Auto-promote waitlist if maxGames increased
        if (session.maxGames > (old.maxGames||0) && session.date) {
          const fd = fmtDate2(session.date);
          const sr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Sessions!A:K' });
          const rows = sr.data.values || [];
          const confirmed = rows.slice(2).filter(r => r[1]===fd && r[4]?.trim() && r[5]!=='Waitlist' && r[9]!=='Yes').length;
          const toFill = Math.min(session.maxGames - old.maxGames, session.maxGames - confirmed);
          const wl = rows.slice(2).filter(r => r[1]===fd && r[4]?.trim() && r[5]==='Waitlist');
          for (let i = 0; i < Math.min(toFill, wl.length); i++) {
            const wi = rows.indexOf(wl[i]);
            await s.spreadsheets.values.update({
              spreadsheetId: SHEET, range: `Sessions!F${wi+1}`,
              valueInputOption: 'RAW', requestBody: { values: [['Games Only']] },
            });
          }
        }
      } else {
        sessions.push(session);
        await setSessions(s, sessions);
      }
      return NextResponse.json({ success: true });
    }

    // ── close ────────────────────────────────────────────────
    if (body.action === 'close') {
      const sessions = await getSessions(s);
      await setSessions(s, sessions.filter(x => x.id !== body.sessionId));
      return NextResponse.json({ success: true });
    }

    // ── signup ───────────────────────────────────────────────
    if (body.action === 'signup') {
      const { date, name, type, amount, isNew, friend } = body;
      const fd = fmtDate2(date);
      const ts = now();

      const strikes = await countStrikes(s, name);
      if (strikes >= 3 && type !== 'Waitlist') {
        return NextResponse.json({ error: 'strike_block', strikes }, { status: 400 });
      }

      // Get player rating
      const pr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Players!B:G' });
      const prows = pr.data.values || [];
      const pm = prows.slice(2).find(r => r[0]?.trim().toLowerCase() === name.trim().toLowerCase());
      const rating = pm?.[2] || '';

      const row = await nextRow(s);
      // Columns: #, Date, Amount, Paid, Name, Type, Rating, Status, Attended, Host, SignedUpAt
      await s.spreadsheets.values.update({
        spreadsheetId: SHEET, range: `Sessions!A${row}:K${row}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [['', fd, amount, 'No', name, type, rating, 'Pending', 'Yes', 'No', ts]] },
      });

      // Friend request
      if (friend) {
        const cr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Config!A1:B50' });
        const crows = cr.data.values || [];
        const key = `fr_${date}`;
        const ci = crows.findIndex(r => r[0] === key);
        let existing = [];
        if (ci >= 0 && crows[ci][1]) { try { existing = JSON.parse(crows[ci][1]); } catch {} }
        existing.push({ name: name.trim(), with: friend });
        if (ci >= 0) {
          await s.spreadsheets.values.update({ spreadsheetId: SHEET, range: `Config!B${ci+1}`, valueInputOption:'RAW', requestBody:{ values:[[JSON.stringify(existing)]] } });
        } else {
          await s.spreadsheets.values.append({ spreadsheetId: SHEET, range: 'Config!A:B', valueInputOption:'RAW', requestBody:{ values:[[key, JSON.stringify(existing)]] } });
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

      return NextResponse.json({ success: true, strikes });
    }

    // ── remove ───────────────────────────────────────────────
    if (body.action === 'remove') {
      const { date, name, title, late } = body;
      const fd = fmtDate2(date);
      const ts = now();

      const sr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Sessions!A:K' });
      const rows = sr.data.values || [];
      const ri = rows.findIndex(r => r[1]===fd && r[4]===name);
      const ctype = ri >= 0 ? (rows[ri][5]||'') : '';
      const isMain = ctype==='Games Only'||ctype==='Training + Games';

      if (ri >= 0) {
        await s.spreadsheets.values.update({
          spreadsheetId: SHEET, range: `Sessions!A${ri+1}:K${ri+1}`,
          valueInputOption: 'RAW', requestBody: { values: [['','','','','','','','','','','']] },
        });
      }

      let promoted = null;
      if (isMain) {
        const wl = rows.find((r,i) => i!==ri && r[1]===fd && r[4]?.trim() && r[5]==='Waitlist');
        if (wl) {
          const wi = rows.indexOf(wl);
          await s.spreadsheets.values.update({
            spreadsheetId: SHEET, range: `Sessions!F${wi+1}:I${wi+1}`,
            valueInputOption: 'RAW', requestBody: { values: [['Games Only','Pending','Yes','No']] },
          });
          promoted = wl[4];
        }
      }

      try {
        await s.spreadsheets.values.append({
          spreadsheetId: SHEET, range: 'Cancellations!A:G',
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [[ts, name, fd, title||'', ctype, promoted||'', late?'Yes':'No']] },
        });
      } catch {}

      return NextResponse.json({ success: true, promoted });
    }

    // ── update_signup (paid / attended) ──────────────────────
    if (body.action === 'update_signup') {
      const { date, name, field, value } = body;
      const fd = fmtDate2(date);
      const colMap = { paid: 'D', attended: 'I' };
      const col = colMap[field];
      if (!col) return NextResponse.json({ error: 'bad field' }, { status: 400 });

      const sr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Sessions!A:K' });
      const rows = sr.data.values || [];
      const ri = rows.findIndex(r => (r[1]||'').trim()===fd && (r[4]||'').trim()===name);
      if (ri >= 0) {
        await s.spreadsheets.values.update({
          spreadsheetId: SHEET, range: `Sessions!${col}${ri+1}`,
          valueInputOption: 'RAW', requestBody: { values: [[value]] },
        });
      }
      return NextResponse.json({ success: true });
    }

    // ── rate_player (rating / attack / receive / setter) ─────
    if (body.action === 'rate_player') {
      const { name, field, value } = body;
      const colMap = { rating:'D', setter:'F', attack:'G', receive:'H' };
      const col = colMap[field];
      if (!col) return NextResponse.json({ error: 'bad field' }, { status: 400 });

      const pr = await s.spreadsheets.values.get({ spreadsheetId: SHEET, range: 'Players!B:B' });
      const rows = pr.data.values || [];
      const ri = rows.findIndex(r => r[0]?.trim().toLowerCase() === name.trim().toLowerCase());
      if (ri >= 0) {
        const sheetRow = ri + 1; // 1-indexed
        await s.spreadsheets.values.update({
          spreadsheetId: SHEET, range: `Players!${col}${sheetRow}`,
          valueInputOption: 'RAW', requestBody: { values: [[value]] },
        });
      }
      return NextResponse.json({ success: true });
    }

    // ── save_teams ───────────────────────────────────────────
    if (body.action === 'save_teams') {
      const { date, teams, title } = body;
      const fd = fmtDate2(date);
      const rows = [];
      let n = 1;
      for (const t of teams) {
        for (const p of t.players) {
          rows.push([n++, fd, p.name, t.color, p.setter?'Setter':'Player', p.rating||'']);
        }
      }
      await s.spreadsheets.values.append({
        spreadsheetId: SHEET, range: 'Teams!A:F',
        valueInputOption: 'USER_ENTERED', requestBody: { values: rows },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
