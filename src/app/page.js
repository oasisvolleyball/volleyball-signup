'use client';
import { useState, useEffect, useCallback } from 'react';

const TYPE_COLOR = { 'Training Only': '#a78bfa', 'Games Only': '#38bdf8', 'Training + Games': '#f59e0b' };
const WHATSAPP_GROUP = 'https://chat.whatsapp.com/GD7I8r3fnTNLAEN6s6q2b7';

function safeMapUrl(url) {
  if (!url) return '#';
  return url.startsWith('http://') || url.startsWith('https://') ? url : 'https://' + url;
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatShortDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function isWithin12Hours(session) {
  if (!session?.date || !session?.time) return false;
  try {
    // Parse time like "8:30 PM" or "7:00 PM – 10:00 PM" — take the start time
    const startTime = session.time.split('–')[0].trim();
    const dateTimeStr = session.date + ' ' + startTime;
    const sessionDate = new Date(dateTimeStr);
    if (isNaN(sessionDate)) return false;
    const diff = sessionDate - Date.now();
    return diff >= 0 && diff <= 12 * 60 * 60 * 1000;
  } catch { return false; }
}

const EMPTY_SESSION = {
  id: '',
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
  const [view, setView] = useState('signup');
  const [adminView, setAdminView] = useState('setup'); // 'setup' | 'list'
  const [sessions, setSessions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [listSession, setListSession] = useState(null);
  const [signups, setSignups] = useState([]);
  const [draft, setDraft] = useState({ ...EMPTY_SESSION, id: genId() });
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', type: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'volleyball2025';

  useEffect(() => {
    fetch('/api/signup')
      .then(r => r.json())
      .then(d => {
        setPlayers(d.players || []);
        setSessions(d.sessions || []);
      })
      .catch(() => {});
  }, []);

  const activeDate = (view === 'admin' ? listSession?.date : selectedSession?.date) || null;

  const fetchSignups = useCallback(() => {
    if (!activeDate) return;
    fetch(`/api/session?date=${encodeURIComponent(activeDate)}`)
      .then(r => r.json())
      .then(d => setSignups(d.signups || []))
      .catch(() => {});
  }, [activeDate]);

  useEffect(() => {
    setSignups([]);
    fetchSignups();
    const interval = setInterval(fetchSignups, 15000);
    return () => clearInterval(interval);
  }, [fetchSignups]);

  const sess = selectedSession;
  const trainingCount = signups.filter(s => s.type === 'Training Only' || s.type === 'Training + Games').length;
  const gamesCount = signups.filter(s => s.type === 'Games Only' || s.type === 'Training + Games').length;
  const trainingLeft = sess ? (sess.maxTraining - trainingCount) : 0;
  const gamesLeft = sess ? (sess.maxGames - gamesCount) : 0;

  const typeOptions = sess ? [
    { key: 'Training Only', price: sess.prices.training, show: sess.offerTraining, full: trainingLeft <= 0 },
    { key: 'Games Only', price: sess.prices.games, show: true, full: gamesLeft <= 0 },
    { key: 'Training + Games', price: sess.prices.both, show: sess.offerTraining && sess.offerBoth, full: trainingLeft <= 0 || gamesLeft <= 0 },
  ].filter(o => o.show) : [];

  function getAmount(type) {
    if (!sess) return 0;
    if (type === 'Training Only') return sess.prices.training;
    if (type === 'Games Only') return sess.prices.games;
    if (type === 'Training + Games') return sess.prices.both;
    return 0;
  }

  const publish = async () => {
    if (!draft.date) { alert('Please set a date first!'); return; }
    setPublishing(true);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish_session', session: draft }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      const reload = await fetch('/api/signup').then(r => r.json());
      setSessions(reload.sessions || []);
      setDraft({ ...EMPTY_SESSION, id: genId() });
      setEditingId(null);
      alert('Session published!');
    } catch (e) {
      alert('Failed to publish: ' + e.message);
    } finally {
      setPublishing(false);
    }
  };

  const closeSession = async (sessionId) => {
    if (!confirm('Close this session? Players will no longer be able to sign up.')) return;
    try {
      await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close_session', sessionId }),
      });
      const reload = await fetch('/api/signup').then(r => r.json());
      setSessions(reload.sessions || []);
      if (selectedSession?.id === sessionId) setSelectedSession(null);
      if (listSession?.id === sessionId) setListSession(null);
    } catch (e) { alert('Failed to close session.'); }
  };

  const editSession = (s) => { setDraft({ ...s }); setEditingId(s.id); };

  const handleSignup = async () => {
    const name = form.name.trim();
    if (!name) { setError('Please enter your name.'); return; }
    if (!form.type) { setError("Please select what you're joining for."); return; }
    if (!sess) { setError('No session selected.'); return; }
    if (signups.find(s => s.name.toLowerCase() === name.toLowerCase())) {
      setError("You're already on the list!"); return;
    }
    if ((form.type === 'Training Only' || form.type === 'Training + Games') && trainingLeft <= 0) {
      setError('Sorry, training is full!'); return;
    }
    if ((form.type === 'Games Only' || form.type === 'Training + Games') && gamesLeft <= 0) {
      setError('Sorry, games is full!'); return;
    }
    setLoading(true);
    const isNewPlayer = !players.find(p => p.name.toLowerCase() === name.toLowerCase());
    const amount = getAmount(form.type);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', date: sess.date, name, type: form.type, amount, isNewPlayer }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Failed'); }
      setSubmitted(true);
      setError('');
      fetchSignups();
    } catch (e) {
      setError('Something went wrong — please try again.');
    } finally {
      setLoading(false);
    }
  };

  const removeSignup = async (name, sessionForRemoval) => {
    const target = sessionForRemoval || (view === 'admin' ? listSession : selectedSession);
    if (!target) return;
    try {
      await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'remove_signup', date: target.date, name }),
      });
      fetchSignups();
    } catch (e) {}
  };

  const suggestions = form.name.trim().length > 1
    ? players.filter(p =>
        p.name.toLowerCase().startsWith(form.name.trim().toLowerCase()) &&
        !signups.find(s => s.name.toLowerCase() === p.name.toLowerCase())
      ).slice(0, 4)
    : [];

  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap');
    * { box-sizing:border-box; margin:0; padding:0; }
    input,select,textarea,button { font-family:'DM Sans',sans-serif; }
    .nav { display:flex; background:#1e293b; border-bottom:1px solid #334155; }
    .nb { flex:1; padding:13px 6px; text-align:center; border:none; background:none; font-size:12px; font-weight:600; color:#64748b; cursor:pointer; border-bottom:3px solid transparent; margin-bottom:-1px; transition:all 0.2s; }
    .nb.on { color:#f8fafc; border-bottom-color:#f59e0b; }
    .badge { background:#f59e0b22; color:#f59e0b; font-size:11px; font-weight:700; border-radius:10px; padding:1px 6px; margin-left:4px; }
    .page { max-width:480px; margin:0 auto; padding:0; }
    /* Lock */
    .lock-wrap { max-width:320px; margin:60px auto; padding:0 20px; text-align:center; }
    .lock-title { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; margin-bottom:20px; color:#f1f5f9; }
    /* Admin tabs */
    .admin-tabs { display:flex; background:#0f172a; border-bottom:1px solid #1e293b; }
    .atb { flex:1; padding:10px; text-align:center; border:none; background:none; font-size:12px; font-weight:600; color:#475569; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-1px; transition:all 0.2s; }
    .atb.on { color:#f59e0b; border-bottom-color:#f59e0b; }
    /* Forms */
    .aw { padding:20px 16px; }
    .st { font-family:'Syne',sans-serif; font-size:10px; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#f59e0b; margin:20px 0 10px; }
    .fl { margin-bottom:12px; }
    .fl label { display:block; font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:5px; }
    .inp { width:100%; background:#1e293b; border:1.5px solid #334155; border-radius:10px; color:#f1f5f9; font-size:14px; padding:10px 13px; outline:none; transition:border-color 0.2s; }
    .inp:focus { border-color:#f59e0b; }
    .inp::placeholder { color:#475569; }
    .row2 { display:flex; gap:10px; }
    .row2 .fl { flex:1; }
    .price-row { display:flex; gap:8px; }
    .price-row .fl { flex:1; }
    .tog-row { display:flex; gap:10px; margin-bottom:4px; }
    .tog { flex:1; display:flex; align-items:center; gap:8px; cursor:pointer; background:#1e293b; border-radius:10px; padding:10px 12px; border:1.5px solid #334155; transition:all 0.2s; }
    .tog.on { border-color:#f59e0b; }
    .tog-txt { font-size:13px; font-weight:600; color:#f1f5f9; }
    .pub-btn { width:100%; margin-top:24px; background:#f59e0b; color:#0f172a; border:none; border-radius:12px; font-family:'Syne',sans-serif; font-size:16px; font-weight:800; padding:14px; cursor:pointer; letter-spacing:1px; transition:all 0.2s; }
    .pub-btn:hover { background:#fbbf24; }
    .pub-btn:disabled { opacity:0.6; cursor:not-allowed; }
    /* Session cards in admin */
    .sess-card { background:#1e293b; border:1.5px solid #334155; border-radius:12px; padding:14px 16px; margin-bottom:10px; }
    .sess-card-title { font-family:'Syne',sans-serif; font-size:15px; font-weight:800; color:#f1f5f9; margin-bottom:3px; }
    .sess-card-meta { font-size:12px; color:#64748b; margin-bottom:10px; }
    .sess-card-actions { display:flex; gap:8px; }
    .btn-sm { font-size:12px; font-weight:600; padding:5px 12px; border-radius:8px; border:1.5px solid; cursor:pointer; background:none; transition:all 0.2s; }
    .btn-edit { color:#f59e0b; border-color:#f59e0b44; }
    .btn-edit:hover { background:#f59e0b22; }
    .btn-close { color:#ef4444; border-color:#ef444444; }
    .btn-close:hover { background:#ef444422; }
    /* Picker */
    .pick-card { background:#1e293b; border:1.5px solid #334155; border-radius:12px; padding:14px 16px; margin-bottom:10px; cursor:pointer; transition:border-color 0.2s; }
    .pick-card:hover { border-color:#475569; }
    .pick-header { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:4px; }
    .pick-title { font-family:'Syne',sans-serif; font-size:15px; font-weight:800; color:#f1f5f9; flex:1; }
    .pick-price { font-family:'Syne',sans-serif; font-size:15px; font-weight:800; color:#f59e0b; flex-shrink:0; }
    .pick-meta { font-size:12px; color:#64748b; margin-top:2px; }
    .pick-spots { display:flex; gap:8px; margin-top:10px; }
    .pick-spot { flex:1; background:#0f172a; border-radius:8px; padding:6px 8px; text-align:center; }
    .pick-spot-n { font-family:'Syne',sans-serif; font-size:18px; font-weight:800; }
    .pick-spot-l { font-size:10px; color:#475569; text-transform:uppercase; letter-spacing:1px; }
    /* Session header */
    .sc { background:linear-gradient(135deg,#1e293b,#0f172a); padding:22px 20px 18px; border-bottom:2px solid #f59e0b33; position:relative; overflow:hidden; }
    .sc::before { content:'🏐'; position:absolute; right:16px; top:50%; transform:translateY(-50%); font-size:72px; opacity:0.06; pointer-events:none; }
    .sc-back { font-size:12px; color:#64748b; cursor:pointer; margin-bottom:10px; display:inline-flex; align-items:center; gap:4px; transition:color 0.2s; background:none; border:none; padding:0; }
    .sc-back:hover { color:#f59e0b; }
    .sc-tag { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:#f59e0b; font-weight:700; margin-bottom:4px; }
    .sc-title { font-family:'Syne',sans-serif; font-size:clamp(18px,5vw,26px); font-weight:800; color:#fff; line-height:1.1; }
    .sc-meta { margin-top:10px; display:flex; flex-direction:column; gap:4px; }
    .sc-row { display:flex; align-items:flex-start; gap:8px; font-size:13px; color:#94a3b8; }
    .sc-icon { width:18px; text-align:center; flex-shrink:0; }
    /* Spots bar */
    .spots { display:flex; background:#1e293b; border-bottom:1px solid #334155; }
    .spot { flex:1; padding:12px 8px; text-align:center; border-right:1px solid #334155; }
    .spot:last-child { border-right:none; }
    .spot-n { font-family:'Syne',sans-serif; font-size:22px; font-weight:800; }
    .spot-l { font-size:10px; color:#475569; text-transform:uppercase; letter-spacing:1px; margin-top:2px; }
    /* Price row */
    .prow { display:flex; background:#0f172a; border-bottom:1px solid #1e293b; }
    .pc { flex:1; padding:10px 6px; text-align:center; border-right:1px solid #1e293b; }
    .pc:last-child { border-right:none; }
    .pa { font-family:'Syne',sans-serif; font-size:16px; font-weight:700; color:#f59e0b; }
    .pt { font-size:10px; color:#475569; text-transform:uppercase; letter-spacing:1px; margin-top:2px; }
    /* Signup form */
    .fa { padding:20px 16px; }
    .fl-lbl { font-size:11px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:1px; margin-bottom:7px; display:block; }
    .name-wrap { position:relative; margin-bottom:18px; }
    .suggs { position:absolute; top:calc(100% + 4px); left:0; right:0; background:#1e293b; border:1.5px solid #334155; border-radius:10px; z-index:10; overflow:hidden; box-shadow:0 4px 16px rgba(0,0,0,0.3); }
    .sugg { padding:10px 14px; cursor:pointer; font-size:13px; font-weight:600; color:#f1f5f9; transition:background 0.15s; }
    .sugg:hover { background:#334155; }
    .type-btns { display:flex; flex-direction:column; gap:10px; margin-bottom:18px; }
    .tbtn { background:#1e293b; border:2px solid #334155; border-radius:12px; padding:14px 16px; cursor:pointer; text-align:left; transition:all 0.2s; display:flex; justify-content:space-between; align-items:center; }
    .tbtn:hover { border-color:#475569; }
    .tbtn.sel { border-color:#f59e0b; background:#f59e0b11; }
    .tbtn.dis { opacity:0.4; cursor:not-allowed; }
    .tbtn-name { font-size:14px; font-weight:600; color:#f1f5f9; }
    .tbtn-price { font-family:'Syne',sans-serif; font-size:16px; font-weight:800; color:#f59e0b; }
    .sub-btn { width:100%; background:#f59e0b; color:#0f172a; border:none; border-radius:12px; font-family:'Syne',sans-serif; font-size:16px; font-weight:800; padding:14px; cursor:pointer; letter-spacing:1px; transition:all 0.2s; }
    .sub-btn:hover { background:#fbbf24; }
    .sub-btn:disabled { opacity:0.6; cursor:not-allowed; }
    .err { background:#ef444422; border:1px solid #ef444444; color:#fca5a5; border-radius:8px; padding:10px 14px; font-size:13px; margin-top:10px; }
    /* Success */
    .succ { margin:20px 16px; background:#1e293b; border:2px solid #34d39944; border-radius:16px; padding:28px 20px; text-align:center; }
    .succ-icon { font-size:44px; margin-bottom:10px; }
    .succ-title { font-family:'Syne',sans-serif; font-size:20px; font-weight:800; color:#34d399; margin-bottom:6px; }
    .succ-sub { font-size:13px; color:#64748b; line-height:1.5; }
    .succ-type { display:inline-block; margin-top:10px; padding:5px 14px; border-radius:20px; font-size:12px; font-weight:700; background:#f59e0b22; color:#f59e0b; }
    /* Who's joining (public) */
    .who { padding:0 16px 24px; }
    .who-title { font-family:'Syne',sans-serif; font-size:11px; font-weight:800; letter-spacing:2px; text-transform:uppercase; color:#334155; margin:20px 0 12px; border-top:1px solid #1e293b; padding-top:18px; }
    .who-section { margin-bottom:12px; }
    .who-lbl { font-size:10px; font-weight:700; letter-spacing:2px; text-transform:uppercase; margin-bottom:8px; }
    .who-chips { display:flex; flex-wrap:wrap; gap:6px; }
    .chip { background:#1e293b; border-radius:20px; padding:5px 12px; font-size:13px; font-weight:600; color:#f1f5f9; display:flex; align-items:center; gap:6px; }
    .chip-num { font-size:11px; color:#475569; }
    .chip-del { background:none; border:none; color:#334155; cursor:pointer; font-size:12px; padding:0 0 0 2px; line-height:1; transition:color 0.2s; }
    .chip-del:hover { color:#ef4444; }
    .chip-locked { color:#475569; font-size:11px; cursor:default; }
    /* WhatsApp banner */
    .wa-banner { margin:16px 16px 0; background:#1e293b; border:1.5px solid #25D36622; border-radius:12px; padding:12px 14px; display:flex; align-items:center; gap:10px; text-decoration:none; transition:border-color 0.2s; }
    .wa-banner:hover { border-color:#25D36666; }
    .wa-icon { font-size:22px; flex-shrink:0; }
    .wa-text { font-size:13px; color:#94a3b8; flex:1; }
    .wa-text strong { color:#f1f5f9; display:block; margin-bottom:1px; }
    .wa-arrow { font-size:14px; color:#25D366; flex-shrink:0; }
    /* Admin list */
    .lw { padding:16px; }
    .lh { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:8px; }
    .lt { font-family:'Syne',sans-serif; font-size:17px; font-weight:800; color:#f1f5f9; }
    .exp-btn { background:#1e293b; border:1.5px solid #334155; color:#94a3b8; font-size:12px; font-weight:600; padding:7px 12px; border-radius:8px; cursor:pointer; transition:all 0.2s; }
    .exp-btn:hover { border-color:#f59e0b; color:#f59e0b; }
    .ls { margin-bottom:18px; }
    .ls-hdr { font-size:10px; font-weight:700; letter-spacing:2px; text-transform:uppercase; padding-bottom:6px; border-bottom:1px solid #1e293b; margin-bottom:8px; }
    .lr { display:flex; align-items:center; gap:8px; padding:9px 12px; background:#1e293b; border-radius:10px; margin-bottom:5px; }
    .lr-num { font-size:12px; color:#475569; width:16px; text-align:right; flex-shrink:0; }
    .lr-name { font-size:14px; font-weight:600; color:#f1f5f9; flex:1; }
    .lr-level { font-size:11px; color:#64748b; flex-shrink:0; }
    .lr-badge { font-size:11px; font-weight:700; padding:2px 8px; border-radius:14px; flex-shrink:0; }
    .lr-paid { font-size:11px; font-weight:700; flex-shrink:0; }
    .lr-del { background:none; border:none; color:#334155; cursor:pointer; font-size:14px; padding:4px; border-radius:6px; transition:color 0.2s; flex-shrink:0; }
    .lr-del:hover { color:#ef4444; }
    .total-bar { margin-top:16px; padding:13px 16px; background:#1e293b; border-radius:12px; display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; }
    .list-sess-btn { width:100%; text-align:left; background:#1e293b; border:1.5px solid #334155; border-radius:10px; padding:12px 14px; margin-bottom:8px; cursor:pointer; transition:all 0.2s; color:#f1f5f9; }
    .list-sess-btn:hover { border-color:#475569; }
    .list-sess-btn.sel { border-color:#f59e0b; }
    .list-sess-name { font-size:14px; font-weight:600; }
    .list-sess-date { font-size:12px; color:#64748b; margin-top:2px; }
    .no-session { text-align:center; padding:60px 20px; color:#475569; }
    .no-session .ico { font-size:44px; margin-bottom:12px; }
    .cancel-note { margin:0 16px 24px; background:#1e293b; border-radius:10px; padding:12px 14px; font-size:12px; color:#64748b; line-height:1.5; }
    .cancel-note a { color:#25D366; text-decoration:none; }
  `;

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", minHeight:'100vh', background:'#0f172a', color:'#f1f5f9' }}>
      <style>{CSS}</style>

      {/* Nav — only 2 tabs */}
      <div className="nav">
        <button className={`nb${view==='signup'?' on':''}`} onClick={() => setView('signup')}>
          🏐 Sign Up {sessions.length > 0 && <span className="badge">{sessions.length}</span>}
        </button>
        <button className={`nb${view==='admin'?' on':''}`} onClick={() => setView('admin')}>
          🔒 Admin
        </button>
      </div>

      {/* ══════════════════════ SIGN UP TAB ══════════════════════ */}
      {view === 'signup' && (
        <div className="page">
          {sessions.length === 0 ? (
            <>
              <div className="no-session">
                <div className="ico">🏐</div>
                <p style={{fontSize:15,marginBottom:8}}>No sessions open yet.</p>
                <p style={{fontSize:13}}>Check back soon or contact your host.</p>
              </div>
              <a href={WHATSAPP_GROUP} target="_blank" rel="noreferrer" className="wa-banner">
                <span className="wa-icon">💬</span>
                <div className="wa-text"><strong>Join our WhatsApp group</strong>Be the first to know about upcoming sessions</div>
                <span className="wa-arrow">→</span>
              </a>
            </>
          ) : !selectedSession ? (
            // Session picker
            <>
              <div style={{padding:'20px 16px 8px'}}>
                <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:800,letterSpacing:3,textTransform:'uppercase',color:'#475569',marginBottom:14}}>
                  Select a session
                </div>
                {sessions.map(s => {
                  const priceLabel = s.offerTraining
                    ? `${s.prices.training}–${s.prices.both} AED`
                    : `${s.prices.games} AED`;
                  return (
                    <div key={s.id} className="pick-card" onClick={() => { setSelectedSession(s); setSubmitted(false); setForm({name:'',type:''}); setError(''); }}>
                      <div className="pick-header">
                        <div className="pick-title">{s.title}</div>
                        <div className="pick-price">{priceLabel}</div>
                      </div>
                      <div className="pick-meta">📅 {formatDisplayDate(s.date)}</div>
                      <div className="pick-meta">⏰ {s.time} &nbsp;·&nbsp; 📍 {s.location}</div>
                      <div className="pick-meta">👋 Hosts: {s.hosts}</div>
                      <div className="pick-spots">
                        <div className="pick-spot">
                          <div className="pick-spot-n" style={{color:'#34d399'}}>{s.maxGames}</div>
                          <div className="pick-spot-l">available spots</div>
                        </div>
                        <div className="pick-spot">
                          <div className="pick-spot-n" style={{color:'#f59e0b'}}>Open</div>
                          <div className="pick-spot-l">status</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <a href={WHATSAPP_GROUP} target="_blank" rel="noreferrer" className="wa-banner">
                <span className="wa-icon">💬</span>
                <div className="wa-text"><strong>Not in our WhatsApp group?</strong>Join to stay updated on upcoming sessions</div>
                <span className="wa-arrow">→</span>
              </a>
            </>
          ) : (
            // Signup form
            <>
              <div className="sc">
                <button className="sc-back" onClick={() => { setSelectedSession(null); setSubmitted(false); }}>← Back to sessions</button>
                <div className="sc-tag">Volleyball Social · Abu Dhabi</div>
                <div className="sc-title">{sess.title}</div>
                <div className="sc-meta">
                  <div className="sc-row"><span className="sc-icon">📅</span>{formatDisplayDate(sess.date)}</div>
                  <div className="sc-row"><span className="sc-icon">⏰</span>{sess.time}</div>
                  <div className="sc-row"><span className="sc-icon">📍</span>
                    <a href={safeMapUrl(sess.mapUrl)} target="_blank" rel="noreferrer" style={{color:'#f59e0b',textDecoration:'none'}}>{sess.location}</a>
                  </div>
                  <div className="sc-row"><span className="sc-icon">👋</span>Hosts: {sess.hosts}</div>
                  {sess.notes && <div className="sc-row"><span className="sc-icon">ℹ️</span><span style={{fontSize:12,color:'#64748b'}}>{sess.notes}</span></div>}
                </div>
              </div>

              <div className="spots">
                {sess.offerTraining && (
                  <div className="spot">
                    <div className="spot-n" style={{color:trainingLeft===0?'#ef4444':trainingLeft<=3?'#f59e0b':'#34d399'}}>{trainingLeft}</div>
                    <div className="spot-l">Training left</div>
                  </div>
                )}
                <div className="spot">
                  <div className="spot-n" style={{color:gamesLeft===0?'#ef4444':gamesLeft<=5?'#f59e0b':'#34d399'}}>{gamesLeft}</div>
                  <div className="spot-l">Games left</div>
                </div>
                <div className="spot">
                  <div className="spot-n" style={{color:'#94a3b8'}}>{signups.length}</div>
                  <div className="spot-l">Signed up</div>
                </div>
              </div>

              <div className="prow">
                {sess.offerTraining && <div className="pc"><div className="pa">{sess.prices.training} AED</div><div className="pt">Training</div></div>}
                <div className="pc"><div className="pa">{sess.prices.games} AED</div><div className="pt">Games</div></div>
                {sess.offerTraining && sess.offerBoth && <div className="pc"><div className="pa">{sess.prices.both} AED</div><div className="pt">Both</div></div>}
              </div>

              {submitted ? (
                <>
                  <div className="succ">
                    <div className="succ-icon">🎉</div>
                    <div className="succ-title">You're in!</div>
                    <div className="succ-sub">See you on the court, <strong>{form.name}</strong>!<br/>Payment due on the night.</div>
                    <div className="succ-type">{form.type} · {getAmount(form.type)} AED</div>
                    <button onClick={() => { setSubmitted(false); setForm({name:'',type:''}); }}
                      style={{marginTop:16,background:'none',border:'1px solid #334155',color:'#64748b',borderRadius:8,padding:'7px 14px',cursor:'pointer',fontSize:12}}>
                      Sign up another player
                    </button>
                  </div>
                  {/* Public who's joining — names only, no levels, no prices */}
                  <div className="who">
                    <div className="who-title">Who's Joining · {signups.length} players</div>
                    {['Training + Games','Training Only','Games Only'].map(type => {
                      const group = signups.filter(s => s.type === type);
                      if (!group.length) return null;
                      const locked = isWithin12Hours(sess);
                      return (
                        <div key={type} className="who-section">
                          <div className="who-lbl" style={{color:TYPE_COLOR[type]}}>{type} ({group.length})</div>
                          <div className="who-chips">
                            {group.map((s,i) => (
                              <div key={i} className="chip">
                                <span className="chip-num">{i+1}.</span>
                                {s.name}
                                {locked
                                  ? <span className="chip-locked" title="Cancellations locked within 12 hours">🔒</span>
                                  : <button className="chip-del" onClick={() => removeSignup(s.name, sess)} title="Remove yourself">✕</button>
                                }
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {isWithin12Hours(sess) && (
                    <div className="cancel-note">
                      🔒 Cancellations are locked within 12 hours of the session. To cancel please message the hosts in the <a href={WHATSAPP_GROUP} target="_blank" rel="noreferrer">WhatsApp group</a>.
                    </div>
                  )}
                </>
              ) : (
                <div className="fa">
                  <label className="fl-lbl">Your Name</label>
                  <div className="name-wrap">
                    <input className="inp" placeholder="Enter your name…" value={form.name}
                      onChange={e => { setForm(p => ({...p,name:e.target.value})); setError(''); }}
                      autoComplete="off" />
                    {suggestions.length > 0 && (
                      <div className="suggs">
                        {suggestions.map(p => (
                          <div key={p.name} className="sugg" onClick={() => setForm(f => ({...f,name:p.name}))}>{p.name}</div>
                        ))}
                      </div>
                    )}
                  </div>
                  <label className="fl-lbl">I'm joining for…</label>
                  <div className="type-btns">
                    {typeOptions.map(opt => (
                      <button key={opt.key} className={`tbtn${form.type===opt.key?' sel':''}${opt.full?' dis':''}`}
                        onClick={() => !opt.full && setForm(p => ({...p,type:opt.key}))}>
                        <div className="tbtn-name">{opt.key}{opt.full && <span style={{fontSize:11,color:'#ef4444',marginLeft:8}}>FULL</span>}</div>
                        <div className="tbtn-price">{opt.price} AED</div>
                      </button>
                    ))}
                  </div>
                  <button className="sub-btn" onClick={handleSignup} disabled={loading}>
                    {loading ? 'Signing up…' : 'SIGN ME UP →'}
                  </button>
                  {error && <div className="err">⚠️ {error}</div>}

                  {/* Who's joining shown before submitting too */}
                  {signups.length > 0 && (
                    <div className="who">
                      <div className="who-title">Who's Joining · {signups.length} players</div>
                      {['Training + Games','Training Only','Games Only'].map(type => {
                        const group = signups.filter(s => s.type === type);
                        if (!group.length) return null;
                        const locked = isWithin12Hours(sess);
                        return (
                          <div key={type} className="who-section">
                            <div className="who-lbl" style={{color:TYPE_COLOR[type]}}>{type} ({group.length})</div>
                            <div className="who-chips">
                              {group.map((s,i) => (
                                <div key={i} className="chip">
                                  <span className="chip-num">{i+1}.</span>
                                  {s.name}
                                  {locked
                                    ? <span className="chip-locked" title="Locked within 12 hours">🔒</span>
                                    : <button className="chip-del" onClick={() => removeSignup(s.name, sess)} title="Remove">✕</button>
                                  }
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

              <a href={WHATSAPP_GROUP} target="_blank" rel="noreferrer" className="wa-banner" style={{marginBottom:24}}>
                <span className="wa-icon">💬</span>
                <div className="wa-text"><strong>Not in our WhatsApp group?</strong>Join to stay updated on upcoming sessions</div>
                <span className="wa-arrow">→</span>
              </a>
            </>
          )}
        </div>
      )}

      {/* ══════════════════════ ADMIN TAB ══════════════════════ */}
      {view === 'admin' && (
        !adminUnlocked ? (
          <div className="lock-wrap">
            <div className="lock-title">🔒 Admin</div>
            <input className="inp" type="password" placeholder="Password…"
              value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
              onKeyDown={e => e.key==='Enter' && adminPassword===PASSWORD && setAdminUnlocked(true)} />
            <button className="pub-btn" style={{marginTop:14}}
              onClick={() => adminPassword===PASSWORD ? setAdminUnlocked(true) : alert('Wrong password')}>
              Unlock
            </button>
          </div>
        ) : (
          <>
            {/* Admin sub-tabs */}
            <div className="admin-tabs">
              <button className={`atb${adminView==='setup'?' on':''}`} onClick={() => setAdminView('setup')}>⚙️ Setup</button>
              <button className={`atb${adminView==='list'?' on':''}`} onClick={() => setAdminView('list')}>📋 List</button>
            </div>

            {/* ── Setup ── */}
            {adminView === 'setup' && (
              <div className="aw">
                {sessions.length > 0 && (
                  <>
                    <div className="st">Open Sessions</div>
                    {sessions.map(s => (
                      <div key={s.id} className="sess-card">
                        <div className="sess-card-title">{s.title}</div>
                        <div className="sess-card-meta">{formatDisplayDate(s.date)} · {s.location}</div>
                        <div className="sess-card-actions">
                          <button className="btn-sm btn-edit" onClick={() => editSession(s)}>Edit</button>
                          <button className="btn-sm btn-close" onClick={() => closeSession(s.id)}>Close session</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <div className="st">{editingId ? 'Edit Session' : 'New Session'}</div>
                <div className="fl"><label>Title</label>
                  <input className="inp" value={draft.title} onChange={e => setDraft(p => ({...p,title:e.target.value}))} />
                </div>
                <div className="row2">
                  <div className="fl"><label>Date</label>
                    <input className="inp" type="date" value={draft.date} onChange={e => setDraft(p => ({...p,date:e.target.value}))} />
                  </div>
                  <div className="fl"><label>Time</label>
                    <input className="inp" value={draft.time} onChange={e => setDraft(p => ({...p,time:e.target.value}))} />
                  </div>
                </div>
                <div className="fl"><label>Location</label>
                  <input className="inp" value={draft.location} onChange={e => setDraft(p => ({...p,location:e.target.value}))} />
                </div>
                <div className="fl"><label>Google Maps Link</label>
                  <input className="inp" value={draft.mapUrl} onChange={e => setDraft(p => ({...p,mapUrl:e.target.value}))} placeholder="https://maps.google.com/..." />
                </div>
                <div className="fl"><label>Hosts</label>
                  <input className="inp" value={draft.hosts} onChange={e => setDraft(p => ({...p,hosts:e.target.value}))} />
                </div>
                <div className="st">What's on offer?</div>
                <div className="tog-row">
                  <label className={`tog${draft.offerTraining?' on':''}`}>
                    <input type="checkbox" checked={draft.offerTraining} onChange={e => setDraft(p => ({...p,offerTraining:e.target.checked}))} style={{accentColor:'#f59e0b'}} />
                    <div><div className="tog-txt">Training</div></div>
                  </label>
                  <label className={`tog${draft.offerBoth?' on':''}`}>
                    <input type="checkbox" checked={draft.offerBoth} onChange={e => setDraft(p => ({...p,offerBoth:e.target.checked}))} style={{accentColor:'#f59e0b'}} />
                    <div><div className="tog-txt">Training + Games</div></div>
                  </label>
                </div>
                <p style={{fontSize:11,color:'#475569',marginBottom:4}}>Games Only is always available.</p>
                <div className="st">Spots Available</div>
                <div className="row2">
                  <div className="fl"><label>Max Training</label>
                    <input className="inp" type="number" value={draft.maxTraining} onChange={e => setDraft(p => ({...p,maxTraining:parseInt(e.target.value)||0}))} />
                  </div>
                  <div className="fl"><label>Max Games</label>
                    <input className="inp" type="number" value={draft.maxGames} onChange={e => setDraft(p => ({...p,maxGames:parseInt(e.target.value)||0}))} />
                  </div>
                </div>
                <div className="st">Pricing (AED)</div>
                <div className="price-row">
                  <div className="fl"><label>Training</label>
                    <input className="inp" type="number" value={draft.prices.training} onChange={e => setDraft(p => ({...p,prices:{...p.prices,training:parseInt(e.target.value)||0}}))} />
                  </div>
                  <div className="fl"><label>Games</label>
                    <input className="inp" type="number" value={draft.prices.games} onChange={e => setDraft(p => ({...p,prices:{...p.prices,games:parseInt(e.target.value)||0}}))} />
                  </div>
                  <div className="fl"><label>Both</label>
                    <input className="inp" type="number" value={draft.prices.both} onChange={e => setDraft(p => ({...p,prices:{...p.prices,both:parseInt(e.target.value)||0}}))} />
                  </div>
                </div>
                <div className="st">Notes</div>
                <div className="fl">
                  <textarea className="inp" rows={3} value={draft.notes} onChange={e => setDraft(p => ({...p,notes:e.target.value}))} style={{resize:'vertical'}} />
                </div>
                <button className="pub-btn" onClick={publish} disabled={publishing}>
                  {publishing ? 'Publishing…' : editingId ? '🔄 Update Session' : '🚀 Publish Session'}
                </button>
                {editingId && (
                  <button style={{width:'100%',marginTop:8,background:'none',border:'1.5px solid #334155',color:'#64748b',borderRadius:12,padding:'10px',cursor:'pointer',fontSize:13}}
                    onClick={() => { setEditingId(null); setDraft({...EMPTY_SESSION,id:genId()}); }}>
                    Cancel edit
                  </button>
                )}
              </div>
            )}

            {/* ── List ── */}
            {adminView === 'list' && (
              !listSession ? (
                <div className="lw">
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:11,fontWeight:800,letterSpacing:3,textTransform:'uppercase',color:'#475569',marginBottom:12}}>
                    View signups for…
                  </div>
                  {sessions.length === 0 && <div style={{color:'#475569',fontSize:13}}>No open sessions.</div>}
                  {sessions.map(s => (
                    <button key={s.id} className={`list-sess-btn${listSession?.id===s.id?' sel':''}`} onClick={() => setListSession(s)}>
                      <div className="list-sess-name">{s.title}</div>
                      <div className="list-sess-date">{formatDisplayDate(s.date)} · {s.location}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="lw">
                  <div className="lh">
                    <div>
                      <div className="lt">{formatShortDate(listSession.date)} · {signups.length} signed up</div>
                      <div style={{fontSize:12,color:'#475569',marginTop:2,cursor:'pointer'}} onClick={() => setListSession(null)}>← Change session</div>
                    </div>
                    <button className="exp-btn" onClick={() => {
                      const rows = ['Name,Level,Type,Amount (AED),Paid', ...signups.map(s => `${s.name},${s.level},${s.type},${s.amount},${s.paid}`)];
                      const blob = new Blob([rows.join('\n')], {type:'text/csv'});
                      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
                      a.download = `signups-${listSession.date}.csv`; a.click();
                    }}>⬇ Export CSV</button>
                  </div>

                  {['Training + Games','Training Only','Games Only'].map(type => {
                    const group = signups.filter(s => s.type === type);
                    if (!group.length) return null;
                    return (
                      <div key={type} className="ls">
                        <div className="ls-hdr" style={{color:TYPE_COLOR[type]}}>{type} ({group.length})</div>
                        {group.map((s,i) => (
                          <div key={i} className="lr">
                            <span className="lr-num">{i+1}</span>
                            <span className="lr-name">{s.name}</span>
                            <span className="lr-level">{s.level}</span>
                            <span className="lr-badge" style={{background:TYPE_COLOR[type]+'22',color:TYPE_COLOR[type]}}>{s.amount} AED</span>
                            <span className="lr-paid" style={{color:s.paid==='Yes'?'#34d399':'#ef4444'}}>{s.paid==='Yes'?'✓':'✗'}</span>
                            <button className="lr-del" onClick={() => removeSignup(s.name, listSession)} title="Remove">✕</button>
                          </div>
                        ))}
                      </div>
                    );
                  })}

                  {signups.length === 0 && <div style={{textAlign:'center',color:'#334155',padding:'40px 0',fontSize:14}}>No signups yet.</div>}

                  {signups.length > 0 && (
                    <div className="total-bar">
                      <span style={{fontSize:13,color:'#64748b'}}>Expected total</span>
                      <span style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,color:'#f59e0b'}}>
                        {signups.reduce((sum,s) => sum + (parseFloat(s.amount)||0), 0)} AED
                      </span>
                    </div>
                  )}
                </div>
              )
            )}
          </>
        )
      )}
    </div>
  );
}
