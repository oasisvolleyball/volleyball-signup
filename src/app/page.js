'use client';
import { useState, useEffect, useCallback } from 'react';

const PRICES = { 'Training Only': 15, 'Games Only': 30, 'Training + Games': 40 };
const TYPE_COLOR = { 'Training Only': '#a78bfa', 'Games Only': '#38bdf8', 'Training + Games': '#f59e0b' };

const EMPTY_SESSION = {
  title: 'Volleyball Training & Games',
  date: '',
  time: '7:00 PM – 10:00 PM',
  location: 'ADNEC, Abu Dhabi',
  mapUrl: 'https://www.google.com/maps?q=ADSS+Abu+Dhabi',
  hosts: 'Keri, Mariyah, Ines',
  maxTraining: 10,
  maxGames: 18,
  notes: 'Max 3 teams. Limited beginner spots.',
  offerTraining: true,
  offerBoth: true,
  prices: { training: 15, games: 30, both: 40 },
};

export default function App() {
  const [view, setView] = useState('admin');
  const [draft, setDraft] = useState(EMPTY_SESSION);
  const [session, setSession] = useState(null);
  const [signups, setSignups] = useState([]);
  const [players, setPlayers] = useState([]);
  const [form, setForm] = useState({ name: '', type: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'volleyball2025';

  // Load players from sheet on mount
  useEffect(() => {
    fetch('/api/signup')
      .then(r => r.json())
      .then(d => setPlayers(d.players || []))
      .catch(() => {});
  }, []);

  // Poll signups every 15s when session is live
  const fetchSignups = useCallback(() => {
    if (!session?.date) return;
    fetch(`/api/session?date=${encodeURIComponent(session.date)}`)
      .then(r => r.json())
      .then(d => setSignups(d.signups || []))
      .catch(() => {});
  }, [session?.date]);

  useEffect(() => {
    fetchSignups();
    const interval = setInterval(fetchSignups, 15000);
    return () => clearInterval(interval);
  }, [fetchSignups]);

  const trainingCount = signups.filter(s => s.type === 'Training Only' || s.type === 'Training + Games').length;
  const gamesCount = signups.filter(s => s.type === 'Games Only' || s.type === 'Training + Games').length;
  const trainingLeft = (session?.maxTraining || 0) - trainingCount;
  const gamesLeft = (session?.maxGames || 0) - gamesCount;

  const publish = () => {
    if (!draft.date) { alert('Please set a date first!'); return; }
    setSession({ ...draft });
    setSignups([]);
    setSubmitted(false);
    setView('signup');
  };

  const handleSignup = async () => {
    const name = form.name.trim();
    if (!name) { setError('Please enter your name.'); return; }
    if (!form.type) { setError('Please select what you\'re joining for.'); return; }
    if (signups.find(s => s.name.toLowerCase() === name.toLowerCase())) {
      setError('You\'re already on the list!'); return;
    }
    if ((form.type === 'Training Only' || form.type === 'Training + Games') && trainingLeft <= 0) {
      setError('Sorry, training is full!'); return;
    }
    if ((form.type === 'Games Only' || form.type === 'Training + Games') && gamesLeft <= 0) {
      setError('Sorry, games is full!'); return;
    }

    setLoading(true);
    const isNewPlayer = !players.find(p => p.name.toLowerCase() === name.toLowerCase());
    const amount = PRICES[form.type] || 0;

    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: session.date,
          name,
          type: form.type,
          amount,
          isNewPlayer,
        }),
      });
      if (!res.ok) throw new Error('Failed to sign up');
      setSubmitted(true);
      setError('');
      fetchSignups();
    } catch (e) {
      setError('Something went wrong — please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Name suggestions from player directory
  const suggestions = form.name.trim().length > 1
    ? players.filter(p => p.name.toLowerCase().startsWith(form.name.trim().toLowerCase()) &&
        !signups.find(s => s.name.toLowerCase() === p.name.toLowerCase()))
      .slice(0, 4)
    : [];

  const typeOptions = [
    { key: 'Training Only', sub: '7:00–7:30 PM · Beginner & novice', price: session?.prices.training || 15, show: session?.offerTraining, full: trainingLeft <= 0 },
    { key: 'Games Only', sub: '7:30–10:00 PM', price: session?.prices.games || 30, show: true, full: gamesLeft <= 0 },
    { key: 'Training + Games', sub: 'Full evening · 7:00–10:00 PM', price: session?.prices.both || 40, show: session?.offerTraining && session?.offerBoth, full: trainingLeft <= 0 || gamesLeft <= 0 },
  ].filter(o => o.show);

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: '#0f172a', color: '#f1f5f9' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nav { display:flex; background:#1e293b; border-bottom:1px solid #334155; overflow-x:auto; }
        .nb { flex:1; min-width:72px; padding:12px 6px; text-align:center; border:none; background:none;
          font-family:'DM Sans',sans-serif; font-size:12px; font-weight:600; color:#64748b;
          cursor:pointer; border-bottom:3px solid transparent; margin-bottom:-1px; transition:all 0.2s; white-space:nowrap; }
        .nb.on { color:#f8fafc; border-bottom-color:#f59e0b; }
        .badge { background:#f59e0b22; color:#f59e0b; font-size:11px; font-weight:700;
          border-radius:10px; padding:1px 6px; margin-left:4px; }
        input, select, textarea { font-family:'DM Sans',sans-serif; }

        /* ADMIN */
        .aw { padding:20px 16px; max-width:540px; margin:0 auto; }
        .st { font-family:'Syne',sans-serif; font-size:10px; font-weight:700; letter-spacing:3px;
          text-transform:uppercase; color:#f59e0b; margin:20px 0 10px; }
        .st:first-child { margin-top:0; }
        .fl { margin-bottom:12px; }
        .fl label { display:block; font-size:11px; font-weight:600; color:#64748b;
          text-transform:uppercase; letter-spacing:1px; margin-bottom:5px; }
        .inp { width:100%; background:#1e293b; border:1.5px solid #334155; border-radius:10px;
          color:#f1f5f9; font-size:14px; padding:10px 13px; outline:none; transition:border-color 0.2s; }
        .inp:focus { border-color:#f59e0b; }
        .inp::placeholder { color:#475569; }
        .row2 { display:flex; gap:10px; }
        .row2 .fl { flex:1; }
        .price-row { display:flex; gap:8px; }
        .price-row .fl { flex:1; }
        .tog-row { display:flex; gap:10px; margin-bottom:4px; }
        .tog { flex:1; display:flex; align-items:center; gap:8px; cursor:pointer;
          background:#1e293b; border-radius:10px; padding:10px 12px; border:1.5px solid #334155; transition:all 0.2s; }
        .tog.on { border-color:#f59e0b; }
        .tog-txt { font-size:13px; font-weight:600; }
        .tog-sub { font-size:10px; color:#475569; }
        .pub-btn { width:100%; margin-top:24px; background:#f59e0b; color:#0f172a; border:none;
          border-radius:12px; font-family:'Syne',sans-serif; font-size:16px; font-weight:800;
          padding:14px; cursor:pointer; letter-spacing:1px; transition:all 0.2s; }
        .pub-btn:hover { background:#fbbf24; }
        .lock-wrap { max-width:340px; margin:60px auto; padding:0 20px; text-align:center; }
        .lock-title { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; margin-bottom:20px; }

        /* SIGNUP */
        .sw { max-width:480px; margin:0 auto; }
        .sc { background:linear-gradient(135deg,#1e293b,#0f172a); padding:28px 20px 24px;
          border-bottom:2px solid #f59e0b33; position:relative; overflow:hidden; }
        .sc::before { content:'🏐'; position:absolute; right:16px; top:50%; transform:translateY(-50%);
          font-size:72px; opacity:0.06; pointer-events:none; }
        .sc-tag { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#f59e0b; font-weight:700; margin-bottom:6px; }
        .sc-title { font-family:'Syne',sans-serif; font-size:clamp(20px,5vw,28px); font-weight:800; color:#fff; line-height:1.1; }
        .sc-meta { margin-top:12px; display:flex; flex-direction:column; gap:5px; }
        .sc-row { display:flex; align-items:center; gap:8px; font-size:13px; color:#94a3b8; }
        .sc-icon { font-size:14px; width:18px; text-align:center; flex-shrink:0; }
        .spots { display:flex; background:#1e293b; border-bottom:1px solid #334155; }
        .spot { flex:1; padding:12px 8px; text-align:center; border-right:1px solid #334155; }
        .spot:last-child { border-right:none; }
        .spot-n { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; }
        .spot-l { font-size:10px; color:#475569; text-transform:uppercase; letter-spacing:1px; margin-top:2px; }
        .prow { display:flex; background:#0f172a; border-bottom:1px solid #1e293b; }
        .pc { flex:1; padding:10px 6px; text-align:center; border-right:1px solid #1e293b; }
        .pc:last-child { border-right:none; }
        .pa { font-family:'Syne',sans-serif; font-size:16px; font-weight:700; color:#f59e0b; }
        .pt { font-size:10px; color:#475569; text-transform:uppercase; letter-spacing:1px; margin-top:2px; }
        .fa { padding:20px 16px; }
        .fl-lbl { font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase;
          letter-spacing:1px; margin-bottom:7px; display:block; }
        .name-wrap { position:relative; margin-bottom:18px; }
        .suggs { position:absolute; top:calc(100% + 4px); left:0; right:0; background:#1e293b;
          border:1.5px solid #334155; border-radius:10px; z-index:10; overflow:hidden;
          box-shadow:0 4px 16px rgba(0,0,0,0.3); }
        .sugg { padding:10px 14px; cursor:pointer; display:flex; justify-content:space-between;
          align-items:center; transition:background 0.15s; font-size:13px; }
        .sugg:hover { background:#334155; }
        .type-btns { display:flex; flex-direction:column; gap:10px; margin-bottom:18px; }
        .tbtn { background:#1e293b; border:2px solid #334155; border-radius:12px;
          padding:14px 16px; cursor:pointer; text-align:left; transition:all 0.2s;
          display:flex; justify-content:space-between; align-items:center; }
        .tbtn:hover { border-color:#475569; }
        .tbtn.sel { border-color:#f59e0b; background:#f59e0b11; }
        .tbtn.dis { opacity:0.4; cursor:not-allowed; }
        .tbtn-name { font-size:14px; font-weight:600; color:#f1f5f9; }
        .tbtn-sub { font-size:11px; color:#64748b; margin-top:2px; }
        .tbtn-price { font-family:'Syne',sans-serif; font-size:16px; font-weight:800; color:#f59e0b; }
        .sub-btn { width:100%; background:#f59e0b; color:#0f172a; border:none; border-radius:12px;
          font-family:'Syne',sans-serif; font-size:16px; font-weight:800; padding:14px;
          cursor:pointer; letter-spacing:1px; transition:all 0.2s; }
        .sub-btn:hover { background:#fbbf24; }
        .sub-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .err { background:#ef444422; border:1px solid #ef444444; color:#fca5a5;
          border-radius:8px; padding:10px 14px; font-size:13px; margin-top:10px; }
        .succ { margin:20px 16px; background:#1e293b; border:2px solid #34d39944;
          border-radius:16px; padding:28px 20px; text-align:center; }
        .succ-icon { font-size:44px; margin-bottom:10px; }
        .succ-title { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; color:#34d399; margin-bottom:6px; }
        .succ-sub { font-size:13px; color:#64748b; line-height:1.5; }
        .succ-type { display:inline-block; margin-top:10px; padding:5px 14px; border-radius:20px;
          font-size:12px; font-weight:700; background:#f59e0b22; color:#f59e0b; }
        .who { padding:0 16px 32px; }
        .who-title { font-family:'Syne',sans-serif; font-size:12px; font-weight:800; letter-spacing:2px;
          text-transform:uppercase; color:#334155; margin:20px 0 14px; border-top:1px solid #1e293b; padding-top:20px; }
        .who-section { margin-bottom:14px; }
        .who-lbl { font-size:10px; font-weight:700; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
        .who-chips { display:flex; flex-wrap:wrap; gap:7px; }
        .chip { background:#1e293b; border-radius:20px; padding:5px 13px; font-size:13px;
          font-weight:600; color:#f1f5f9; display:flex; align-items:center; gap:5px; }
        .chip-num { font-size:11px; color:#475569; }

        /* LIST */
        .lw { padding:16px; max-width:540px; margin:0 auto; }
        .lh { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px; }
        .lt { font-family:'Syne',sans-serif; font-size:17px; font-weight:800; }
        .exp-btn { background:#1e293b; border:1.5px solid #334155; color:#94a3b8;
          font-size:12px; font-weight:600; padding:7px 12px; border-radius:8px; cursor:pointer; transition:all 0.2s; }
        .exp-btn:hover { border-color:#f59e0b; color:#f59e0b; }
        .ls { margin-bottom:18px; }
        .ls-hdr { font-size:10px; font-weight:700; letter-spacing:2px; text-transform:uppercase;
          padding-bottom:6px; border-bottom:1px solid #1e293b; margin-bottom:8px; }
        .lr { display:flex; align-items:center; gap:8px; padding:9px 12px;
          background:#1e293b; border-radius:10px; margin-bottom:5px; }
        .lr-num { font-size:12px; color:#475569; width:16px; text-align:right; flex-shrink:0; }
        .lr-name { font-size:14px; font-weight:600; flex:1; }
        .lr-level { font-size:11px; color:#64748b; flex-shrink:0; }
        .lr-badge { font-size:11px; font-weight:700; padding:2px 8px; border-radius:14px; flex-shrink:0; }
        .lr-del { background:none; border:none; color:#334155; cursor:pointer; font-size:13px;
          padding:3px; border-radius:5px; transition:color 0.2s; }
        .lr-del:hover { color:#ef4444; }
        .total-bar { margin-top:16px; padding:13px 16px; background:#1e293b; border-radius:12px;
          display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; }
        .no-session { text-align:center; padding:60px 20px; color:#334155; }
        .no-session .ico { font-size:44px; margin-bottom:12px; }
      `}</style>

      {/* Nav */}
      <div className="nav">
        <button className={`nb${view === 'admin' ? ' on' : ''}`} onClick={() => setView('admin')}>⚙️ Setup</button>
        <button className={`nb${view === 'signup' ? ' on' : ''}`} onClick={() => setView('signup')}>
          🏐 Sign Up {session && <span className="badge">{signups.length}</span>}
        </button>
        <button className={`nb${view === 'list' ? ' on' : ''}`} onClick={() => setView('list')}>
          📋 List {session && <span className="badge">{signups.length}</span>}
        </button>
      </div>

      {/* ── ADMIN ── */}
      {view === 'admin' && (
        !adminUnlocked ? (
          <div className="lock-wrap">
            <div className="lock-title">🔒 Admin Access</div>
            <input className="inp" type="password" placeholder="Enter password…"
              value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && adminPassword === PASSWORD && setAdminUnlocked(true)} />
            <button className="pub-btn" style={{ marginTop: 14 }}
              onClick={() => adminPassword === PASSWORD ? setAdminUnlocked(true) : alert('Wrong password')}>
              Unlock
            </button>
          </div>
        ) : (
          <div className="aw">
            <div className="st">Session Details</div>
            <div className="fl"><label>Title</label>
              <input className="inp" value={draft.title} onChange={e => setDraft(p => ({ ...p, title: e.target.value }))} />
            </div>
            <div className="row2">
              <div className="fl"><label>Date</label>
                <input className="inp" type="date" value={draft.date} onChange={e => setDraft(p => ({ ...p, date: e.target.value }))} />
              </div>
              <div className="fl"><label>Time</label>
                <input className="inp" value={draft.time} onChange={e => setDraft(p => ({ ...p, time: e.target.value }))} />
              </div>
            </div>
            <div className="fl"><label>Location</label>
              <input className="inp" value={draft.location} onChange={e => setDraft(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div className="fl"><label>Google Maps Link</label>
              <input className="inp" value={draft.mapUrl} onChange={e => setDraft(p => ({ ...p, mapUrl: e.target.value }))} />
            </div>
            <div className="fl"><label>Hosts</label>
              <input className="inp" value={draft.hosts} onChange={e => setDraft(p => ({ ...p, hosts: e.target.value }))} />
            </div>

            <div className="st">What's on offer?</div>
            <div className="tog-row">
              <label className={`tog${draft.offerTraining ? ' on' : ''}`}>
                <input type="checkbox" checked={draft.offerTraining} onChange={e => setDraft(p => ({ ...p, offerTraining: e.target.checked }))} style={{ accentColor: '#f59e0b' }} />
                <div><div className="tog-txt">Training</div><div className="tog-sub">7:00–7:30 PM</div></div>
              </label>
              <label className={`tog${draft.offerBoth ? ' on' : ''}`}>
                <input type="checkbox" checked={draft.offerBoth} onChange={e => setDraft(p => ({ ...p, offerBoth: e.target.checked }))} style={{ accentColor: '#f59e0b' }} />
                <div><div className="tog-txt">Training + Games</div><div className="tog-sub">Full evening</div></div>
              </label>
            </div>
            <p style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>Games Only is always available.</p>

            <div className="st">Spots Available</div>
            <div className="row2">
              <div className="fl"><label>Max Training</label>
                <input className="inp" type="number" value={draft.maxTraining} onChange={e => setDraft(p => ({ ...p, maxTraining: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="fl"><label>Max Games</label>
                <input className="inp" type="number" value={draft.maxGames} onChange={e => setDraft(p => ({ ...p, maxGames: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>

            <div className="st">Pricing (AED)</div>
            <div className="price-row">
              <div className="fl"><label>Training</label>
                <input className="inp" type="number" value={draft.prices.training} onChange={e => setDraft(p => ({ ...p, prices: { ...p.prices, training: parseInt(e.target.value) || 0 } }))} />
              </div>
              <div className="fl"><label>Games</label>
                <input className="inp" type="number" value={draft.prices.games} onChange={e => setDraft(p => ({ ...p, prices: { ...p.prices, games: parseInt(e.target.value) || 0 } }))} />
              </div>
              <div className="fl"><label>Both</label>
                <input className="inp" type="number" value={draft.prices.both} onChange={e => setDraft(p => ({ ...p, prices: { ...p.prices, both: parseInt(e.target.value) || 0 } }))} />
              </div>
            </div>

            <div className="st">Notes</div>
            <div className="fl">
              <textarea className="inp" rows={3} value={draft.notes} onChange={e => setDraft(p => ({ ...p, notes: e.target.value }))} style={{ resize: 'vertical' }} />
            </div>

            <button className="pub-btn" onClick={publish}>
              {session ? '🔄 UPDATE & REPUBLISH' : '🚀 PUBLISH SESSION'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 12, color: '#475569', marginTop: 10 }}>
              Share the Sign Up tab link in WhatsApp after publishing
            </p>
          </div>
        )
      )}

      {/* ── SIGNUP ── */}
      {view === 'signup' && (
        !session ? (
          <div className="no-session"><div className="ico">⚙️</div><p>No session published yet.</p></div>
        ) : (
          <div className="sw">
            <div className="sc">
              <div className="sc-tag">Volleyball Social · Abu Dhabi</div>
              <div className="sc-title">{session.title}</div>
              <div className="sc-meta">
                {session.date && <div className="sc-row"><span className="sc-icon">📅</span>
                  {new Date(session.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </div>}
                <div className="sc-row"><span className="sc-icon">⏰</span>{session.time}</div>
                <div className="sc-row"><span className="sc-icon">📍</span>
                  <a href={session.mapUrl} target="_blank" rel="noreferrer" style={{ color: '#f59e0b', textDecoration: 'none' }}>{session.location}</a>
                </div>
                <div className="sc-row"><span className="sc-icon">👋</span>Hosts: {session.hosts}</div>
                {session.notes && <div className="sc-row"><span className="sc-icon">ℹ️</span>
                  <span style={{ fontSize: 12, color: '#64748b' }}>{session.notes}</span></div>}
              </div>
            </div>

            <div className="spots">
              {session.offerTraining && (
                <div className="spot">
                  <div className="spot-n" style={{ color: trainingLeft === 0 ? '#ef4444' : trainingLeft <= 3 ? '#f59e0b' : '#34d399' }}>{trainingLeft}</div>
                  <div className="spot-l">Training left</div>
                </div>
              )}
              <div className="spot">
                <div className="spot-n" style={{ color: gamesLeft === 0 ? '#ef4444' : gamesLeft <= 5 ? '#f59e0b' : '#34d399' }}>{gamesLeft}</div>
                <div className="spot-l">Games left</div>
              </div>
              <div className="spot">
                <div className="spot-n" style={{ color: '#94a3b8' }}>{signups.length}</div>
                <div className="spot-l">Signed up</div>
              </div>
            </div>

            <div className="prow">
              {session.offerTraining && <div className="pc"><div className="pa">{session.prices.training} AED</div><div className="pt">Training</div></div>}
              <div className="pc"><div className="pa">{session.prices.games} AED</div><div className="pt">Games</div></div>
              {session.offerTraining && session.offerBoth && <div className="pc"><div className="pa">{session.prices.both} AED</div><div className="pt">Both</div></div>}
            </div>

            {submitted ? (
              <>
                <div className="succ">
                  <div className="succ-icon">🎉</div>
                  <div className="succ-title">You're in!</div>
                  <div className="succ-sub">See you on the court, <strong>{form.name}</strong>!<br />Payment due on the night.</div>
                  <div className="succ-type">{form.type} · {PRICES[form.type]} AED</div>
                  <button onClick={() => { setSubmitted(false); setForm({ name: '', type: '' }); }}
                    style={{ marginTop: 16, background: 'none', border: '1px solid #334155', color: '#64748b', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontSize: 12 }}>
                    Sign up another player
                  </button>
                </div>
                <div className="who">
                  <div className="who-title">Who's Joining · {signups.length} players</div>
                  {['Training + Games', 'Training Only', 'Games Only'].map(type => {
                    const group = signups.filter(s => s.type === type);
                    if (!group.length) return null;
                    return (
                      <div key={type} className="who-section">
                        <div className="who-lbl" style={{ color: TYPE_COLOR[type] }}>{type} ({group.length})</div>
                        <div className="who-chips">
                          {group.map((s, i) => (
                            <div key={i} className="chip">
                              <span className="chip-num">{i + 1}.</span>{s.name}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="fa">
                <label className="fl-lbl">Your Name</label>
                <div className="name-wrap">
                  <input className="inp" placeholder="Enter your name…" value={form.name}
                    onChange={e => { setForm(p => ({ ...p, name: e.target.value })); setError(''); }}
                    autoComplete="off" />
                  {suggestions.length > 0 && (
                    <div className="suggs">
                      {suggestions.map(p => (
                        <div key={p.name} className="sugg" onClick={() => setForm(f => ({ ...f, name: p.name }))}>
                          <span style={{ fontWeight: 600 }}>{p.name}</span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>{p.level}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <label className="fl-lbl">I'm joining for…</label>
                <div className="type-btns">
                  {typeOptions.map(opt => (
                    <button key={opt.key} className={`tbtn${form.type === opt.key ? ' sel' : ''}${opt.full ? ' dis' : ''}`}
                      onClick={() => !opt.full && setForm(p => ({ ...p, type: opt.key }))}>
                      <div>
                        <div className="tbtn-name">{opt.key}{opt.full && <span style={{ fontSize: 11, color: '#ef4444', marginLeft: 8 }}>FULL</span>}</div>
                        <div className="tbtn-sub">{opt.sub}</div>
                      </div>
                      <div className="tbtn-price">{opt.price} AED</div>
                    </button>
                  ))}
                </div>

                <button className="sub-btn" onClick={handleSignup} disabled={loading}>
                  {loading ? 'Signing up…' : 'SIGN ME UP →'}
                </button>
                {error && <div className="err">⚠️ {error}</div>}

                {signups.length > 0 && (
                  <div className="who">
                    <div className="who-title">Who's Joining · {signups.length} players</div>
                    {['Training + Games', 'Training Only', 'Games Only'].map(type => {
                      const group = signups.filter(s => s.type === type);
                      if (!group.length) return null;
                      return (
                        <div key={type} className="who-section">
                          <div className="who-lbl" style={{ color: TYPE_COLOR[type] }}>{type} ({group.length})</div>
                          <div className="who-chips">
                            {group.map((s, i) => (
                              <div key={i} className="chip">
                                <span className="chip-num">{i + 1}.</span>{s.name}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      )}

      {/* ── LIST ── */}
      {view === 'list' && (
        !session ? (
          <div className="no-session"><div className="ico">📋</div><p>No session published yet.</p></div>
        ) : (
          <div className="lw">
            <div className="lh">
              <div className="lt">
                {session.date ? new Date(session.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Session'} · {signups.length} signed up
              </div>
              <button className="exp-btn" onClick={() => {
                const rows = ['Name,Type,Amount (AED),Paid', ...signups.map(s => `${s.name},${s.type},${PRICES[s.type]},${s.paid}`)];
                const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
                const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                a.download = `signups-${session.date}.csv`; a.click();
              }}>⬇ Export CSV</button>
            </div>

            {['Training + Games', 'Training Only', 'Games Only'].map(type => {
              const group = signups.filter(s => s.type === type);
              if (!group.length) return null;
              return (
                <div key={type} className="ls">
                  <div className="ls-hdr" style={{ color: TYPE_COLOR[type] }}>{type} ({group.length})</div>
                  {group.map((s, i) => (
                    <div key={i} className="lr">
                      <span className="lr-num">{i + 1}</span>
                      <span className="lr-name">{s.name}</span>
                      <span className="lr-level">{s.level}</span>
                      <span className="lr-badge" style={{ background: TYPE_COLOR[type] + '22', color: TYPE_COLOR[type] }}>
                        {PRICES[s.type]} AED
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: s.paid === 'Yes' ? '#34d399' : '#ef4444', flexShrink: 0 }}>
                        {s.paid === 'Yes' ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}

            {signups.length === 0 && <div style={{ textAlign: 'center', color: '#334155', padding: '40px 0', fontSize: 14 }}>No signups yet.</div>}

            {signups.length > 0 && (
              <div className="total-bar">
                <span style={{ fontSize: 13, color: '#64748b' }}>Expected total</span>
                <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: '#f59e0b' }}>
                  {signups.reduce((s, p) => s + (PRICES[p.type] || 0), 0)} AED
                </span>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}
