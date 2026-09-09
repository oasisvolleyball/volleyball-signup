'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

// ── Constants ──────────────────────────────────────────────────
const ADMIN_PW   = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'OVC2026';
const WA_GROUP   = 'https://chat.whatsapp.com/GD7I8r3fnTNLAEN6s6q2b7';
const AANI_NUM   = '+971501986469';
const BANK_NAME  = 'Wio Bank';
const BANK_HOLDER= 'Keri Adonna Zeller';
const BANK_IBAN  = 'AE440860000006133847628';
const BANK_SWIFT = 'WIOBAEADXXX';
const TEAM_COLORS= ['Blue','Black','White','Green','Yellow','Red'];
const LEVEL_MAP  = {'1':'Pro','2':'Advanced','3':'Intermediate','4':'Upper Beginner','5':'Beginner'};

const TEAM_HEX = {
  Blue:  {bg:'#1d4ed8', light:'#dbeafe', text:'#1e3a8a'},
  Black: {bg:'#1e293b', light:'#f1f5f9', text:'#0f172a'},
  White: {bg:'#94a3b8', light:'#f8fafc',  text:'#475569'},
  Green: {bg:'#16a34a', light:'#dcfce7', text:'#14532d'},
  Yellow:{bg:'#ca8a04', light:'#fef9c3', text:'#713f12'},
  Red:   {bg:'#dc2626', light:'#fee2e2', text:'#7f1d1d'},
};

// ── Helpers ────────────────────────────────────────────────────
function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function fmtLong(d) {
  if (!d) return '';
  return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
function fmtShort(d) {
  if (!d) return '';
  return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
}

function within2h(sess) {
  if (!sess?.date || !sess?.time) return false;
  try {
    const [timePart, meridiem] = sess.time.split('–')[0].trim().split(' ');
    let [h, m] = timePart.split(':').map(Number);
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    const [yr, mo, dy] = sess.date.split('-').map(Number);
    const diff = new Date(yr, mo-1, dy, h, m||0) - Date.now();
    return diff >= 0 && diff <= 2*3600*1000;
  } catch { return false; }
}

const DEF_SESSION = {
  id:'', title:'Volleyball Social Games', date:'', time:'8:00 PM – 10:00 PM',
  location:'ICS Khalidiya', mapUrl:'', hosts:'Keri', maxGames:18, maxTraining:0,
  notes:'', offerTraining:false, offerBoth:false, prices:{games:35,training:0,both:0},
};

// ── CSS ────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body,html{font-family:'Inter',sans-serif;background:#0d1b5e;color:#f1f5f9;min-height:100vh;}
input,select,textarea,button{font-family:'Inter',sans-serif;}
button{cursor:pointer;}

/* Nav */
.nav{display:flex;background:#091235;border-bottom:2px solid #00d4c8;position:sticky;top:0;z-index:50;}
.nb{flex:1;padding:14px 4px;text-align:center;border:none;background:none;font-size:11px;font-weight:700;color:#334155;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all .2s;text-transform:uppercase;letter-spacing:.5px;}
.nb.on{color:#00d4c8;border-bottom-color:#00d4c8;}

/* Page */
.page{max-width:480px;margin:0 auto;}

/* Inputs */
.inp{width:100%;background:#162454;border:1.5px solid #1e3a8a;border-radius:10px;color:#f1f5f9;font-size:14px;padding:11px 13px;outline:none;transition:border-color .2s;}
.inp:focus{border-color:#00d4c8;}
.inp::placeholder{color:#334155;}
select.inp{cursor:pointer;}
textarea.inp{resize:vertical;}
.fl{margin-bottom:12px;}
.fl label,.lbl{display:block;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;}
.row2{display:flex;gap:10px;}.row2 .fl{flex:1;}
.row3{display:flex;gap:8px;}.row3 .fl{flex:1;}

/* Buttons */
.btn-primary{width:100%;background:#00d4c8;color:#0d1b5e;border:none;border-radius:10px;font-size:15px;font-weight:800;padding:13px;transition:all .2s;letter-spacing:.3px;}
.btn-primary:hover{background:#00bfb3;}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;}
.btn-outline{background:none;border:1.5px solid #1e3a8a;color:#64748b;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:600;transition:all .2s;}
.btn-outline:hover{border-color:#00d4c8;color:#00d4c8;}
.btn-danger{background:none;border:1.5px solid #f8717144;color:#f87171;border-radius:8px;padding:6px 12px;font-size:12px;font-weight:600;transition:all .2s;}
.btn-danger:hover{background:#f8717111;}

/* Cards */
.card{background:#162454;border:1px solid #1e3a8a;border-radius:12px;padding:14px 16px;margin-bottom:10px;}

/* Section label */
.sec{font-size:10px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#00d4c8;margin:20px 0 10px;}

/* Toggles */
.tog-row{display:flex;gap:10px;margin-bottom:8px;}
.tog{flex:1;display:flex;align-items:center;gap:8px;background:#162454;border-radius:10px;padding:10px 12px;border:1.5px solid #1e3a8a;transition:all .2s;}
.tog.on{border-color:#00d4c8;background:#00d4c811;}
.tog span{font-size:13px;font-weight:600;color:#f1f5f9;}

/* Alerts */
.err{background:#f8717122;border:1px solid #f8717144;color:#fca5a5;border-radius:8px;padding:10px 14px;font-size:13px;margin-top:10px;}
.warn{background:#f59e0b22;border:1px solid #f59e0b44;color:#fcd34d;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:12px;}
.note{background:#162454;border:1px solid #1e3a8a;border-radius:10px;padding:12px 14px;font-size:12px;color:#475569;line-height:1.6;}
.note strong{color:#94a3b8;}

/* Banner */
.banner{background:linear-gradient(135deg,#0d1b5e,#162454);padding:22px 20px 18px;border-bottom:2px solid #00d4c822;position:relative;overflow:hidden;}
.banner::after{content:'🏐';position:absolute;right:14px;top:50%;transform:translateY(-50%);font-size:80px;opacity:.05;pointer-events:none;}
.banner-tag{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#00d4c8;font-weight:700;margin-bottom:6px;}
.banner-title{font-size:clamp(17px,5vw,24px);font-weight:900;color:#fff;line-height:1.15;}
.banner-meta{margin-top:10px;display:flex;flex-direction:column;gap:5px;}
.banner-row{font-size:13px;color:#94a3b8;display:flex;gap:8px;}
.back-btn{background:none;border:none;color:#475569;font-size:12px;padding:0;margin-bottom:12px;display:flex;align-items:center;gap:4px;transition:color .2s;}
.back-btn:hover{color:#00d4c8;}

/* Spots bar */
.spots{display:flex;background:#091235;border-bottom:1px solid #1e3a8a;}
.spot{flex:1;padding:12px 6px;text-align:center;border-right:1px solid #1e3a8a;}
.spot:last-child{border-right:none;}
.spot-n{font-size:22px;font-weight:900;line-height:1;}
.spot-l{font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-top:3px;}

/* Price row */
.prow{display:flex;background:#071030;border-bottom:1px solid #1e3a8a;}
.pc{flex:1;padding:10px 4px;text-align:center;border-right:1px solid #1e3a8a;}
.pc:last-child{border-right:none;}
.pa{font-size:16px;font-weight:800;color:#00d4c8;}
.pl{font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-top:2px;}

/* Type buttons */
.tbtn{width:100%;background:#162454;border:2px solid #1e3a8a;border-radius:12px;padding:14px 16px;text-align:left;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;transition:all .2s;}
.tbtn:hover:not([disabled]){border-color:#00d4c844;}
.tbtn.sel{border-color:#00d4c8;background:#00d4c811;}
.tbtn[disabled]{opacity:.4;cursor:not-allowed;}
.tbtn.wait{border-color:#f8717166;}
.tbtn.wait.sel{background:#f8717111;}
.tbtn-l{font-size:14px;font-weight:600;color:#f1f5f9;}
.tbtn-sub{font-size:11px;color:#475569;margin-top:2px;}
.tbtn-r{text-align:right;}
.tbtn-price{font-size:16px;font-weight:900;color:#00d4c8;}
.tbtn-price.red{color:#f87171;}
.tbtn-psub{font-size:10px;color:#475569;margin-top:1px;}

/* Suggestions */
.sugg-wrap{position:relative;margin-bottom:16px;}
.suggs{position:absolute;top:calc(100%+4px);left:0;right:0;background:#162454;border:1.5px solid #00d4c833;border-radius:10px;z-index:100;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.5);}
.sugg{padding:10px 14px;font-size:13px;font-weight:600;color:#f1f5f9;transition:background .15s;}
.sugg:hover{background:#0d1b5e;cursor:pointer;}

/* Success */
.succ{margin:20px 16px;background:#162454;border:2px solid #00d4c844;border-radius:16px;padding:28px 20px;text-align:center;}
.succ-icon{font-size:44px;margin-bottom:10px;}
.succ-h{font-size:20px;font-weight:900;color:#00d4c8;margin-bottom:6px;}
.succ-sub{font-size:13px;color:#64748b;line-height:1.6;}
.pill{display:inline-block;padding:5px 16px;border-radius:20px;font-size:12px;font-weight:700;background:#00d4c822;color:#00d4c8;margin-top:10px;}

/* Payment box */
.pay-box{margin:0 16px 16px;background:#091235;border:1.5px solid #00d4c822;border-radius:12px;padding:14px 16px;}
.pay-title{font-size:10px;font-weight:800;color:#00d4c8;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;}
.pay-m{padding-bottom:10px;margin-bottom:10px;border-bottom:1px solid #1e3a8a;}
.pay-m:last-child{padding-bottom:0;margin-bottom:0;border-bottom:none;}
.pay-mname{font-size:12px;font-weight:700;color:#f1f5f9;margin-bottom:4px;}
.pay-detail{font-size:12px;color:#64748b;line-height:1.7;}
.pay-detail strong{color:#94a3b8;}

/* Who list */
.who{padding:0 16px 16px;}
.who-hdr{font-size:10px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#1e3a8a;margin:18px 0 12px;padding-top:18px;border-top:1px solid #1e3a8a;}
.who-lbl{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#00d4c8;margin-bottom:8px;}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.chip{background:#162454;border:1px solid #1e3a8a;border-radius:20px;padding:5px 12px;font-size:13px;font-weight:600;color:#f1f5f9;display:flex;align-items:center;gap:6px;}
.chip-n{font-size:10px;color:#334155;}
.chip-del{background:none;border:none;color:#334155;font-size:12px;line-height:1;padding:0;transition:color .2s;}
.chip-del:hover{color:#f87171;}

/* WhatsApp */
.wa{display:flex;align-items:center;gap:10px;margin:0 16px 16px;background:#162454;border:1.5px solid #25D36622;border-radius:12px;padding:12px 14px;text-decoration:none;transition:border-color .2s;}
.wa:hover{border-color:#25D36644;}
.wa-txt{flex:1;font-size:13px;color:#64748b;}
.wa-txt strong{color:#f1f5f9;display:block;margin-bottom:1px;}

/* Session picker */
.pick{background:#162454;border:1.5px solid #1e3a8a;border-radius:12px;padding:14px 16px;margin-bottom:10px;transition:border-color .2s;}
.pick:hover{border-color:#00d4c844;cursor:pointer;}
.pick-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:5px;}
.pick-title{font-size:15px;font-weight:800;color:#f1f5f9;flex:1;}
.pick-price{font-size:15px;font-weight:900;color:#00d4c8;white-space:nowrap;}
.pick-meta{font-size:12px;color:#64748b;margin-top:3px;}
.pick-spots{display:flex;gap:8px;margin-top:10px;}
.psn{flex:1;background:#091235;border-radius:8px;padding:6px 8px;text-align:center;}
.psn-n{font-size:18px;font-weight:900;}
.psn-l{font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:1px;}

/* Admin */
.atabs{display:flex;background:#071030;border-bottom:1px solid #1e3a8a;}
.atb{flex:1;padding:12px 4px;text-align:center;border:none;background:none;font-size:10px;font-weight:700;color:#334155;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .2s;text-transform:uppercase;letter-spacing:.5px;}
.atb.on{color:#00d4c8;border-bottom-color:#00d4c8;}
.aw{padding:20px 16px;}
.sess-acts{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;}

/* Game night */
.gn-row{background:#162454;border:1px solid #1e3a8a;border-radius:10px;margin-bottom:6px;overflow:hidden;}
.gn-top{display:flex;align-items:center;gap:8px;padding:10px 12px;}
.gn-info{flex:1;min-width:0;}
.gn-name{font-size:14px;font-weight:700;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gn-sub{font-size:11px;color:#64748b;margin-top:1px;}
.tog-btn{font-size:11px;font-weight:700;padding:5px 10px;border-radius:20px;border:1.5px solid;background:none;white-space:nowrap;transition:all .2s;flex-shrink:0;}
.tog-btn.yes{color:#4ade80;border-color:#4ade8033;background:#4ade8011;}
.tog-btn.no{color:#f87171;border-color:#f8717133;background:#f8717111;}
.tog-btn.neutral{color:#64748b;border-color:#1e3a8a;}
.gn-bottom{padding:10px 12px 12px;border-top:1px solid #1e3a8a;background:#0d1b5e;}
.rate-row{display:flex;align-items:center;gap:6px;margin-bottom:8px;}
.rate-lbl{font-size:10px;color:#475569;width:52px;flex-shrink:0;}
.rbtns{display:flex;gap:4px;}
.rb{width:28px;height:28px;border-radius:6px;border:1.5px solid #1e3a8a;background:#162454;color:#475569;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;transition:all .2s;}
.rb.on{background:#00d4c8;border-color:#00d4c8;color:#0d1b5e;}
.rb.setter-on{background:#f59e0b;border-color:#f59e0b;color:#0d1b5e;}
.rb-wide{width:auto;padding:0 10px;}

/* Teams */
.team-card{background:#162454;border-radius:12px;padding:14px;margin-bottom:10px;border:1.5px solid #1e3a8a;}
.team-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.team-nm{font-size:14px;font-weight:800;}
.team-stats{display:flex;gap:6px;}
.tstat{font-size:11px;color:#475569;background:#091235;padding:3px 8px;border-radius:20px;}
.tp{display:flex;align-items:center;gap:8px;padding:7px 10px;background:#091235;border-radius:8px;margin-bottom:4px;cursor:grab;user-select:none;}
.tp:active{cursor:grabbing;opacity:.7;}
.tp-name{font-size:13px;font-weight:600;color:#f1f5f9;flex:1;}
.tp-r{font-size:11px;font-weight:700;width:22px;height:22px;border-radius:5px;background:#162454;display:flex;align-items:center;justify-content:center;color:#00d4c8;flex-shrink:0;}
.tp-tag{font-size:10px;padding:2px 6px;border-radius:8px;flex-shrink:0;}
.tp-setter{color:#f59e0b;background:#f59e0b11;}
.tp-friend{color:#a78bfa;background:#a78bfa11;}
.drop{min-height:34px;border:2px dashed #1e3a8a;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#1e3a8a;margin-top:4px;transition:all .2s;}
.drop.over{border-color:#00d4c8;background:#00d4c811;color:#00d4c8;}
.pool{background:#091235;border-radius:12px;padding:12px;margin-bottom:12px;}
.pool-hdr{font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;}
.n-sel{display:flex;gap:6px;margin-bottom:14px;}
.n-btn{flex:1;padding:10px;border-radius:8px;border:1.5px solid #1e3a8a;background:#162454;color:#475569;font-weight:800;font-size:14px;transition:all .2s;}
.n-btn.on{border-color:#00d4c8;background:#00d4c811;color:#00d4c8;}

/* History */
.hist-row{background:#162454;border:1px solid #1e3a8a;border-radius:10px;padding:12px 14px;margin-bottom:6px;transition:border-color .2s;}
.hist-row:hover{border-color:#00d4c844;cursor:pointer;}
.hist-date{font-size:13px;font-weight:700;color:#f1f5f9;}
.pills{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;}
.hist-pill{font-size:10px;color:#475569;background:#091235;padding:3px 8px;border-radius:10px;}

/* Total bar */
.total-bar{padding:13px 16px;background:#162454;border-radius:12px;display:flex;justify-content:space-between;align-items:center;margin-top:14px;border:1px solid #1e3a8a;}

/* Empty state */
.empty{text-align:center;padding:48px 20px;color:#334155;}
.empty-icon{font-size:48px;margin-bottom:12px;}

/* Lock screen */
.lock{max-width:300px;margin:60px auto;padding:0 20px;text-align:center;}
.lock-title{font-size:22px;font-weight:900;margin-bottom:20px;}

/* Misc */
.copy-btn{background:#00d4c811;border:1.5px solid #00d4c833;color:#00d4c8;font-size:12px;font-weight:700;padding:7px 12px;border-radius:8px;transition:all .2s;}
.copy-btn:hover{background:#00d4c822;}
`;

export default function App() {
  // ── Core state ───────────────────────────────────────────────
  const [view, setView]       = useState('signup');
  const [av, setAv]           = useState('setup');
  const [sessions, setSessions] = useState([]);
  const [players, setPlayers]   = useState([]);
  const [selId, setSelId]     = useState(null);
  const [signups, setSignups] = useState([]);
  const [counts, setCounts]   = useState({});

  // Sign up form
  const [form, setForm]         = useState({name:'',type:'',friend:''});
  const [showFriend, setShowFriend] = useState(false);
  const [showSuggs, setShowSuggs]   = useState(false);
  const [submitted, setSubmitted]   = useState(false);
  const [strikes, setStrikes]       = useState(0);
  const [formErr, setFormErr]       = useState('');
  const [loading, setLoading]       = useState(false);

  // Admin
  const [adminOk, setAdminOk] = useState(false);
  const [pw, setPw]           = useState('');
  const [draft, setDraft]     = useState({...DEF_SESSION, id:genId()});
  const [editId, setEditId]   = useState(null);
  const [saving, setSaving]   = useState(false);

  // Game night
  const [gnSess, setGnSess]   = useState(null);
  const [gnList, setGnList]   = useState([]);
  const [gnFriends, setGnFriends] = useState([]);
  const [gnExp, setGnExp]     = useState(null);
  const [gnBusy, setGnBusy]   = useState({});

  // Teams
  const [tmSess, setTmSess]   = useState(null);
  const [tmPool, setTmPool]   = useState([]);
  const [tmTeams, setTmTeams] = useState([]);
  const [tmCount, setTmCount] = useState(3);
  const [tmDrag, setTmDrag]   = useState(null);
  const [tmOver, setTmOver]   = useState(null);
  const [tmSaved, setTmSaved] = useState(false);
  const [tmFriends, setTmFriends] = useState([]);

  // History
  const [histGroups, setHistGroups]   = useState([]);
  const [histSel, setHistSel]         = useState(null);
  const [histRows, setHistRows]       = useState([]);
  const [histF, setHistF]             = useState({name:'',paid:'',attended:'',from:'',to:''});
  const [histLoading, setHistLoading] = useState(false);
  const [histSearched, setHistSearched] = useState(false);

  // ── Derived ──────────────────────────────────────────────────
  const sess = selId ? sessions.find(s => s.id === selId) || null : null;

  // ── Load data ────────────────────────────────────────────────
  const loadAll = useCallback(() => {
    fetch('/api/signup')
      .then(r => r.json())
      .then(d => {
        setPlayers(d.players || []);
        const loaded = d.sessions || [];
        setSessions(loaded);
        // Fetch counts for each session in parallel
        Promise.all(loaded.map(s =>
          s.date
            ? fetch(`/api/session?date=${encodeURIComponent(s.date)}`)
                .then(r => r.json())
                .then(data => ({
                  id: s.id,
                  count: (data.signups || []).filter(p => p.type !== 'Waitlist' && p.host !== 'Yes').length,
                }))
                .catch(() => ({ id: s.id, count: 0 }))
            : Promise.resolve({ id: s.id, count: 0 })
        )).then(results => {
          const c = {};
          results.forEach(r => { c[r.id] = r.count; });
          setCounts(c);
        });
      })
      .catch(() => {});
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Fetch signups for selected session ───────────────────────
  const fetchSignups = useCallback(() => {
    if (!sess?.date) return;
    fetch(`/api/session?date=${encodeURIComponent(sess.date)}`)
      .then(r => r.json())
      .then(d => setSignups(d.signups || []))
      .catch(() => {});
  }, [sess?.date]);

  useEffect(() => {
    setSignups([]);
    if (sess?.date) fetchSignups();
    const iv = setInterval(fetchSignups, 15000);
    return () => clearInterval(iv);
  }, [fetchSignups]);

  // ── Spots ────────────────────────────────────────────────────
  const confirmed   = signups.filter(s => s.type !== 'Waitlist' && s.host !== 'Yes');
  const waitlisted  = signups.filter(s => s.type === 'Waitlist');
  const gamesLeft   = sess ? Math.max(0, sess.maxGames - confirmed.filter(s => s.type !== 'Training Only').length) : 0;
  const trainLeft   = sess ? Math.max(0, (sess.maxTraining || 0) - confirmed.filter(s => s.type === 'Training Only' || s.type === 'Training + Games').length) : 0;

  function getAmt(type) {
    if (!sess) return 0;
    if (type === 'Games Only')       return sess.prices.games  || 35;
    if (type === 'Training Only')    return sess.prices.training || 0;
    if (type === 'Training + Games') return sess.prices.both   || 0;
    return 0;
  }

  const typeOpts = sess ? [
    {key:'Training Only',    price:sess.prices.training||0,  show:sess.offerTraining,              full:trainLeft<=0||gamesLeft<=0, wait:false},
    {key:'Games Only',       price:sess.prices.games||35,    show:true,                            full:gamesLeft<=0,               wait:false},
    {key:'Training + Games', price:sess.prices.both||0,      show:sess.offerTraining&&sess.offerBoth, full:trainLeft<=0||gamesLeft<=0, wait:false},
    {key:'Waitlist',         price:sess.prices.games||35,    show:gamesLeft<=0,                    full:false,                      wait:true},
  ].filter(o => o.show) : [];

  // ── Suggestions ──────────────────────────────────────────────
  const suggs = showSuggs && form.name.trim().length > 1
    ? players
        .filter(p =>
          p.name.toLowerCase().startsWith(form.name.trim().toLowerCase()) &&
          !signups.find(s => s.name.toLowerCase() === p.name.toLowerCase())
        )
        .slice(0, 6)
    : [];

  // ── Signup ───────────────────────────────────────────────────
  const doSignup = async () => {
    const name = form.name.trim();
    if (!name) { setFormErr('Please enter your name.'); return; }
    if (!form.type) { setFormErr("Please select what you're joining for."); return; }
    // Client-side duplicate check
    if (signups.find(s => s.name.toLowerCase() === name.toLowerCase())) {
      setFormErr("You're already on the list! If someone else has the same name, please add an initial (e.g. 'Sara M').");
      return;
    }
    setLoading(true); setFormErr('');
    try {
      const isNew = !players.find(p => p.name.toLowerCase() === name.toLowerCase());
      const res = await fetch('/api/signup', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({action:'signup', date:sess.date, name, type:form.type, amount:getAmt(form.type), isNew, friend:form.friend.trim()}),
      });
      const d = await res.json();
      if (d.error === 'duplicate') {
        setFormErr("You're already signed up! If someone else has the same name, please add an initial.");
        return;
      }
      if (d.error === 'strike_block') {
        setFormErr(`You have ${d.strikes} no-shows in the last 3 months and can only join the waitlist.`);
        return;
      }
      if (!res.ok) { setFormErr('Something went wrong. Please try again.'); return; }
      setStrikes(d.strikes || 0);
      setSubmitted(true);
      fetchSignups(); loadAll();
    } finally { setLoading(false); }
  };

  // ── Remove ───────────────────────────────────────────────────
  const doRemove = async (name, session, late) => {
    if (!confirm(`Remove ${name} from the list?`)) return;
    await fetch('/api/signup', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({action:'remove', date:session.date, name, title:session.title, late}),
    });
    fetchSignups(); loadAll();
  };

  // ── Publish session ──────────────────────────────────────────
  const doPublish = async () => {
    if (!draft.date) { alert('Please set a date.'); return; }
    setSaving(true);
    try {
      await fetch('/api/signup', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({action:'publish', session:draft}),
      });
      loadAll();
      setDraft({...DEF_SESSION, id:genId()}); setEditId(null);
      alert('Session published!');
    } finally { setSaving(false); }
  };

  const doClose = async (id) => {
    if (!confirm('Close this session?')) return;
    await fetch('/api/signup', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({action:'close', sessionId:id}),
    });
    loadAll();
    if (selId === id) setSelId(null);
    if (gnSess?.id === id) setGnSess(null);
    if (tmSess?.id === id) setTmSess(null);
  };

  // ── Game Night ───────────────────────────────────────────────
  const loadGn = useCallback(async (s) => {
    if (!s) return;
    const res = await fetch(`/api/session?date=${encodeURIComponent(s.date)}`);
    const d = await res.json();
    setGnList(d.signups || []);
    setGnFriends(d.friendRequests || []);
  }, []);

  useEffect(() => { if (gnSess) loadGn(gnSess); }, [gnSess, loadGn]);

  const gnToggle = async (name, field, val) => {
    const key = `${name}_${field}`;
    setGnBusy(p => ({...p, [key]:true}));
    setGnList(prev => prev.map(s => s.name === name ? {...s, [field]:val} : s));
    await fetch('/api/signup', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({action:'update_signup', date:gnSess.date, name, field, value:val}),
    });
    setGnBusy(p => { const n={...p}; delete n[key]; return n; });
  };

  // ── Teams ────────────────────────────────────────────────────
  const loadTm = useCallback(async (s) => {
    if (!s) return;
    const res = await fetch(`/api/session?date=${encodeURIComponent(s.date)}`);
    const d = await res.json();
    setTmFriends(d.friendRequests || []);
    const eligible = (d.signups || []).filter(p =>
      p.type !== 'Waitlist' && p.type !== 'Training Only' && p.paid === 'Yes' && p.host !== 'Yes'
    );
    const enriched = eligible.map(p => {
      const pl = players.find(pp => pp.name.toLowerCase() === p.name.toLowerCase());
      return {...p, rating:pl?.rating||p.rating||'', setter:pl?.setter==='Setter', attack:pl?.attack||'', receive:pl?.receive||'', gender:pl?.gender||''};
    });
    setTmPool(enriched); setTmTeams([]); setTmSaved(false);
  }, [players]);

  useEffect(() => { if (tmSess) loadTm(tmSess); }, [tmSess, loadTm]);

  const autoBalance = () => {
    const n = tmCount;
    const colors = TEAM_COLORS.slice(0, n);
    // Sort: setters first, then by rating ascending (1=best so lower = better)
    const sorted = [...tmPool].sort((a, b) => {
      if (a.setter && !b.setter) return -1;
      if (!a.setter && b.setter) return 1;
      return (parseInt(a.rating) || 99) - (parseInt(b.rating) || 99);
    });
    // Apply friend pairs — keep together
    const processed = new Set();
    const ordered = [];
    for (const p of sorted) {
      if (processed.has(p.name)) continue;
      processed.add(p.name);
      ordered.push(p);
      const fr = tmFriends.find(f => f.name === p.name);
      if (fr) {
        const buddy = sorted.find(pp => pp.name === fr.with && !processed.has(pp.name));
        if (buddy) { processed.add(buddy.name); ordered.push(buddy); }
      }
    }
    // Snake draft
    const teams = colors.map(c => ({color:c, players:[]}));
    let dir = 1, ti = 0;
    for (const p of ordered) {
      teams[ti].players.push(p);
      ti += dir;
      if (ti >= n)  { ti = n-1; dir = -1; }
      else if (ti < 0) { ti = 0; dir = 1; }
    }
    setTmTeams(teams); setTmPool([]);
  };

  const teamAvg = t => {
    const rs = t.players.map(p => parseInt(p.rating)).filter(r => !isNaN(r));
    return rs.length ? (rs.reduce((a,b)=>a+b,0)/rs.length).toFixed(1) : '—';
  };

  const onDragStart = (p, from) => setTmDrag({p, from});
  const onDragOver  = (e, to) => { e.preventDefault(); setTmOver(to); };
  const onDrop = (e, to) => {
    e.preventDefault();
    if (!tmDrag || tmDrag.from === to) { setTmOver(null); return; }
    const {p, from} = tmDrag;
    if (from === 'pool') setTmPool(prev => prev.filter(x => x.name !== p.name));
    else setTmTeams(prev => prev.map(t => t.color === from ? {...t, players:t.players.filter(x=>x.name!==p.name)} : t));
    if (to === 'pool') setTmPool(prev => [...prev, p]);
    else setTmTeams(prev => prev.map(t => t.color === to ? {...t, players:[...t.players, p]} : t));
    setTmDrag(null); setTmOver(null);
  };

  const saveTm = async () => {
    await fetch('/api/signup', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({action:'save_teams', date:tmSess.date, teams:tmTeams, title:tmSess.title}),
    });
    setTmSaved(true);
  };

  // ── History ──────────────────────────────────────────────────
  const loadHist = useCallback(async () => {
    setHistLoading(true); setHistSearched(true);
    try {
      const p = new URLSearchParams();
      if (histF.name)     p.set('name',     histF.name);
      if (histF.paid)     p.set('paid',     histF.paid);
      if (histF.attended) p.set('attended', histF.attended);
      if (histF.from)     p.set('from',     histF.from);
      if (histF.to)       p.set('to',       histF.to);
      const res = await fetch(`/api/session?${p}&limit=2000`);
      const d = await res.json();
      // Group by date
      const groups = {};
      for (const s of (d.signups || [])) {
        if (!groups[s.date]) groups[s.date] = [];
        groups[s.date].push(s);
      }
      setHistGroups(Object.entries(groups).sort((a,b) => {
        // Parse "07 Sep 2026" for sorting
        const parse = str => {
          const months = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
          const m = str.match(/(\d+)\s+(\w+)\s+(\d+)/);
          return m ? new Date(m[3], months[m[2]], m[1]) : new Date(0);
        };
        return parse(b[0]) - parse(a[0]);
      }));
    } finally { setHistLoading(false); }
  }, [histF]);

  const gnRate = async (name, field, val) => {
    const key = `${name}_${field}`;
    setGnBusy(p => ({...p, [key]:true}));
    setPlayers(prev => prev.map(p => p.name === name ? {...p, [field]:val} : p));
    await fetch('/api/signup', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({action:'rate_player', name, field, value:val}),
    });
    setGnBusy(p => { const n={...p}; delete n[key]; return n; });
  };

  // ── Who's Joining component ──────────────────────────────────
  const WhoList = ({session, list}) => {
    const locked = within2h(session);
    const main = list.filter(s => s.type !== 'Waitlist');
    const wait = list.filter(s => s.type === 'Waitlist');
    return (
      <div className="who">
        <div className="who-hdr">
          Who's Joining · {main.length} players{wait.length > 0 ? ` · ${wait.length} waitlist` : ''}
        </div>
        {['Games Only','Training + Games','Training Only'].map(type => {
          const g = main.filter(s => s.type === type);
          if (!g.length) return null;
          return (
            <div key={type}>
              <div className="who-lbl">{type} ({g.length})</div>
              <div className="chips">
                {g.map((s, i) => (
                  <div key={i} className="chip">
                    <span className="chip-n">{i+1}.</span>
                    {s.name}
                    {locked
                      ? <span style={{fontSize:11,color:'#334155'}}>🔒</span>
                      : <button className="chip-del" onClick={() => doRemove(s.name, session, false)}>✕</button>
                    }
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {wait.length > 0 && (
          <div>
            <div className="who-lbl" style={{color:'#f87171'}}>Waitlist ({wait.length})</div>
            <div className="chips">
              {wait.map((s, i) => (
                <div key={i} className="chip" style={{borderColor:'#f8717133'}}>
                  <span className="chip-n">{i+1}.</span>
                  {s.name}
                  {locked
                    ? <span style={{fontSize:11,color:'#334155'}}>🔒</span>
                    : <button className="chip-del" onClick={() => doRemove(s.name, session, false)}>✕</button>
                  }
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── On the Night — session options ───────────────────────────
  // Show: open sessions + the most recent past session (for next-day edits)
  const gnSessionOptions = (() => {
    const open = sessions;
    // We don't have past sessions here (they're in the sheet)
    // We'll just show open sessions; past sessions accessible via History
    return open;
  })();

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={{minHeight:'100vh', background:'#0d1b5e', color:'#f1f5f9'}}>
      <style>{CSS}</style>

      {/* Nav */}
      <div className="nav">
        <button className={`nb${view==='signup'?' on':''}`} onClick={() => setView('signup')}>
          🏐 Sign Up
          {sessions.length > 0 && <span style={{background:'#00d4c822',color:'#00d4c8',fontSize:10,fontWeight:800,borderRadius:10,padding:'1px 6px',marginLeft:4}}>{sessions.length}</span>}
        </button>
        <button className={`nb${view==='admin'?' on':''}`} onClick={() => setView('admin')}>🔒 Admin</button>
      </div>

      {/* ══════════════ SIGN UP ══════════════ */}
      {view === 'signup' && (
        <div className="page">
          {sessions.length === 0 ? (
            <>
              <div className="empty">
                <div className="empty-icon">🏐</div>
                <p style={{fontSize:15,fontWeight:700,marginBottom:6}}>No sessions open yet.</p>
                <p style={{fontSize:13}}>Check back soon!</p>
              </div>
              <a href={WA_GROUP} target="_blank" rel="noreferrer" className="wa">
                <span style={{fontSize:22}}>💬</span>
                <div className="wa-txt"><strong>Join our WhatsApp group</strong>Be the first to know about upcoming sessions</div>
                <span style={{color:'#25D366',fontSize:16}}>→</span>
              </a>
            </>
          ) : !selId ? (
            /* Session picker */
            <>
              <div style={{padding:'20px 16px 8px'}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:3,textTransform:'uppercase',color:'#334155',marginBottom:14}}>Select a session</div>
                {sessions.map(s => {
                  const pl = s.offerTraining ? `${s.prices.training}–${s.prices.both} AED` : `${s.prices.games||35} AED`;
                  const rem = Math.max(0, s.maxGames - (counts[s.id] || 0));
                  return (
                    <div key={s.id} className="pick" onClick={() => { setSelId(s.id); setSubmitted(false); setForm({name:'',type:'',friend:''}); setFormErr(''); }}>
                      <div className="pick-head">
                        <div className="pick-title">{s.title}</div>
                        <div className="pick-price">{pl}</div>
                      </div>
                      <div className="pick-meta">📅 {fmtLong(s.date)}</div>
                      <div className="pick-meta">⏰ {s.time} · 📍 {s.location}</div>
                      <div className="pick-meta">👋 {s.hosts}</div>
                      <div className="pick-spots">
                        <div className="psn">
                          <div className="psn-n" style={{color:rem===0?'#f87171':rem<=5?'#fbbf24':'#4ade80'}}>{rem}</div>
                          <div className="psn-l">spots left</div>
                        </div>
                        <div className="psn">
                          <div className="psn-n" style={{color:'#94a3b8'}}>{counts[s.id]||0}</div>
                          <div className="psn-l">signed up</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <a href={WA_GROUP} target="_blank" rel="noreferrer" className="wa" style={{margin:'0 16px 16px'}}>
                <span style={{fontSize:22}}>💬</span>
                <div className="wa-txt"><strong>Not in our WhatsApp group?</strong>Join to stay updated</div>
                <span style={{color:'#25D366',fontSize:16}}>→</span>
              </a>
            </>
          ) : sess ? (
            /* Signup form */
            <>
              <div className="banner">
                <button className="back-btn" onClick={() => { setSelId(null); setSubmitted(false); }}>← Back to sessions</button>
                <div className="banner-tag">Oasis Volleyball Club · Abu Dhabi</div>
                <div className="banner-title">{sess.title}</div>
                <div className="banner-meta">
                  <div className="banner-row">📅 {fmtLong(sess.date)}</div>
                  <div className="banner-row">⏰ {sess.time}</div>
                  <div className="banner-row">
                    📍 {sess.mapUrl
                      ? <a href={sess.mapUrl} target="_blank" rel="noreferrer" style={{color:'#00d4c8',textDecoration:'none'}}>{sess.location}</a>
                      : sess.location}
                  </div>
                  <div className="banner-row">👋 {sess.hosts}</div>
                  {sess.notes && <div className="banner-row" style={{fontSize:12,color:'#64748b'}}>ℹ️ {sess.notes}</div>}
                </div>
              </div>

              <div className="spots">
                {sess.offerTraining && (
                  <div className="spot">
                    <div className="spot-n" style={{color:trainLeft===0?'#f87171':trainLeft<=3?'#fbbf24':'#4ade80'}}>{trainLeft}</div>
                    <div className="spot-l">Training left</div>
                  </div>
                )}
                <div className="spot">
                  <div className="spot-n" style={{color:gamesLeft===0?'#f87171':gamesLeft<=5?'#fbbf24':'#4ade80'}}>{gamesLeft}</div>
                  <div className="spot-l">Spots left</div>
                </div>
                <div className="spot">
                  <div className="spot-n" style={{color:'#94a3b8'}}>{confirmed.length}</div>
                  <div className="spot-l">Signed up</div>
                </div>
                {waitlisted.length > 0 && (
                  <div className="spot">
                    <div className="spot-n" style={{color:'#f87171'}}>{waitlisted.length}</div>
                    <div className="spot-l">Waitlist</div>
                  </div>
                )}
              </div>

              <div className="prow">
                {sess.offerTraining && <div className="pc"><div className="pa">{sess.prices.training} AED</div><div className="pl">Training</div></div>}
                <div className="pc"><div className="pa">{sess.prices.games||35} AED</div><div className="pl">Games</div></div>
                {sess.offerTraining && sess.offerBoth && <div className="pc"><div className="pa">{sess.prices.both} AED</div><div className="pl">Both</div></div>}
              </div>

              {submitted ? (
                <>
                  <div className="succ">
                    <div className="succ-icon">{form.type === 'Waitlist' ? '📋' : '🎉'}</div>
                    <div className="succ-h">{form.type === 'Waitlist' ? "You're on the waitlist!" : "You're in!"}</div>
                    <div className="succ-sub">
                      {form.type === 'Waitlist'
                        ? `We'll let you know if a spot opens, ${form.name}!`
                        : `See you on the court, ${form.name}! Please pay before the session.`}
                    </div>
                    {form.type !== 'Waitlist' && <div className="pill">{form.type} · {getAmt(form.type)} AED</div>}
                    {strikes > 0 && <div className="warn" style={{marginTop:12}}>⚠️ You have {strikes} no-show{strikes>1?'s':''} in the last 3 months. Please attend or cancel in advance.</div>}
                    <button onClick={() => { setSubmitted(false); setForm({name:'',type:'',friend:''}); }}
                      style={{marginTop:16,background:'none',border:'1px solid #1e3a8a',color:'#64748b',borderRadius:8,padding:'7px 14px',fontSize:12}}>
                      Sign up another player
                    </button>
                  </div>

                  {form.type !== 'Waitlist' && (
                    <div className="pay-box">
                      <div className="pay-title">💳 Payment — {getAmt(form.type)} AED</div>
                      <div className="pay-m">
                        <div className="pay-mname">Aani (instant · free)</div>
                        <div className="pay-detail">Open your bank app → Payments → Aani<br/>Send to: <strong>{AANI_NUM}</strong></div>
                      </div>
                      <div className="pay-m">
                        <div className="pay-mname">Bank Transfer</div>
                        <div className="pay-detail">
                          Bank: <strong>{BANK_NAME}</strong><br/>
                          Name: <strong>{BANK_HOLDER}</strong><br/>
                          IBAN: <strong>{BANK_IBAN}</strong><br/>
                          SWIFT: <strong>{BANK_SWIFT}</strong>
                        </div>
                      </div>
                      <div style={{fontSize:11,color:'#334155',marginTop:8}}>⚠️ Payment must be received 24 hours before the session to hold your spot.</div>
                    </div>
                  )}

                  <div className="note" style={{margin:'0 16px 16px'}}>
                    <strong>Cancellation Policy</strong><br/>
                    You may remove your name if you can no longer join. Less than 12 hours before the game please message the hosts directly. Cancelling in the last 2 hours means you must still pay. Please do not remove other players' names.
                  </div>

                  <WhoList session={sess} list={signups} />
                </>
              ) : (
                <div style={{padding:'20px 16px'}}>
                  <label className="lbl">Your Name</label>
                  <div className="sugg-wrap">
                    <input className="inp" placeholder="Enter your name…" value={form.name}
                      onChange={e => { setForm(p=>({...p,name:e.target.value})); setFormErr(''); setShowSuggs(true); }}
                      onFocus={() => setShowSuggs(true)}
                      onBlur={() => setTimeout(() => setShowSuggs(false), 300)}
                      autoComplete="off" />
                    {suggs.length > 0 && (
                      <div className="suggs">
                        {suggs.map(p => (
                          <div key={p.name} className="sugg" onClick={() => { setForm(f=>({...f,name:p.name})); setShowSuggs(false); }}>
                            {p.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <label className="lbl">I'm joining for…</label>
                  {typeOpts.map(o => (
                    <button key={o.key}
                      className={`tbtn${form.type===o.key?' sel':''}${o.wait?' wait':''}`}
                      disabled={o.full}
                      onClick={() => setForm(p=>({...p,type:o.key}))}>
                      <div>
                        <div className="tbtn-l">
                          {o.wait ? '📋 Join Waitlist' : o.key}
                          {o.full && <span style={{fontSize:11,color:'#f87171',marginLeft:8}}>FULL</span>}
                        </div>
                        {o.wait && <div className="tbtn-sub">Only payable if confirmed</div>}
                      </div>
                      <div className="tbtn-r">
                        <div className={`tbtn-price${o.wait?' red':''}`}>{o.price} AED</div>
                        {o.wait && <div className="tbtn-psub">if confirmed</div>}
                      </div>
                    </button>
                  ))}

                  <div style={{marginBottom:16}}>
                    <button onClick={() => setShowFriend(p=>!p)}
                      style={{background:'none',border:'none',color:'#00d4c8',fontSize:12,fontWeight:600,padding:0}}>
                      {showFriend ? '▲ Hide' : '+ Playing with someone?'}
                    </button>
                    {showFriend && (
                      <div style={{marginTop:8}}>
                        <input className="inp" placeholder="Who are you hoping to play with?" value={form.friend}
                          onChange={e => setForm(p=>({...p,friend:e.target.value}))} />
                        <div style={{fontSize:11,color:'#334155',marginTop:4}}>We'll do our best to put you on the same team.</div>
                      </div>
                    )}
                  </div>

                  <button className="btn-primary" onClick={doSignup} disabled={loading}>
                    {loading ? 'Signing up…' : 'SIGN ME UP →'}
                  </button>
                  {formErr && <div className="err">⚠️ {formErr}</div>}

                  {signups.length > 0 && (
                    <>
                      <div className="note" style={{marginTop:16}}>
                        <strong>Cancellation Policy</strong><br/>
                        You may remove your name if you can no longer join. Less than 12 hours before the game please message the hosts directly. Cancelling in the last 2 hours means you must still pay. Please do not remove other players' names.
                      </div>
                      <WhoList session={sess} list={signups} />
                    </>
                  )}
                </div>
              )}

              <a href={WA_GROUP} target="_blank" rel="noreferrer" className="wa" style={{margin:'0 16px 24px'}}>
                <span style={{fontSize:22}}>💬</span>
                <div className="wa-txt"><strong>Not in our WhatsApp group?</strong>Join to stay updated</div>
                <span style={{color:'#25D366',fontSize:16}}>→</span>
              </a>
            </>
          ) : null}
        </div>
      )}

      {/* ══════════════ ADMIN ══════════════ */}
      {view === 'admin' && (
        !adminOk ? (
          <div className="lock">
            <div className="lock-title">🔒 Admin</div>
            <input className="inp" type="password" placeholder="Password…" value={pw}
              onChange={e => setPw(e.target.value)}
              onKeyDown={e => e.key==='Enter' && pw===ADMIN_PW && setAdminOk(true)} />
            <button className="btn-primary" style={{marginTop:14}}
              onClick={() => pw===ADMIN_PW ? setAdminOk(true) : alert('Wrong password')}>
              Unlock
            </button>
          </div>
        ) : (
          <>
            <div className="atabs">
              <button className={`atb${av==='setup'?' on':''}`}   onClick={() => setAv('setup')}>⚙️ Setup</button>
              <button className={`atb${av==='night'?' on':''}`}   onClick={() => setAv('night')}>🎮 On Night</button>
              <button className={`atb${av==='teams'?' on':''}`}   onClick={() => setAv('teams')}>👥 Teams</button>
              <button className={`atb${av==='history'?' on':''}`} onClick={() => { setAv('history'); if (!histSearched) loadHist(); }}>📅 History</button>
            </div>

            {/* ── SETUP ── */}
            {av === 'setup' && (
              <div className="aw">
                {sessions.length > 0 && (
                  <>
                    <div className="sec">Open Sessions</div>
                    {sessions.map(s => (
                      <div key={s.id} className="card">
                        <div style={{fontSize:15,fontWeight:800,color:'#f1f5f9',marginBottom:3}}>{s.title}</div>
                        <div style={{fontSize:12,color:'#64748b',marginBottom:8}}>{fmtLong(s.date)} · {s.location} · {s.maxGames} spots · {s.prices.games||35} AED</div>
                        <div className="sess-acts">
                          <button className="btn-outline" onClick={() => { setDraft({...s}); setEditId(s.id); }}>Edit</button>
                          <button className="btn-danger" onClick={() => doClose(s.id)}>Close session</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <div className="sec">{editId ? 'Edit Session' : 'New Session'}</div>
                <div className="fl"><label>Title</label>
                  <input className="inp" value={draft.title} onChange={e => setDraft(p=>({...p,title:e.target.value}))} />
                </div>
                <div className="row2">
                  <div className="fl"><label>Date</label>
                    <input className="inp" type="date" value={draft.date} onChange={e => setDraft(p=>({...p,date:e.target.value}))} />
                  </div>
                  <div className="fl"><label>Time</label>
                    <input className="inp" value={draft.time} onChange={e => setDraft(p=>({...p,time:e.target.value}))} />
                  </div>
                </div>
                <div className="fl"><label>Location</label>
                  <input className="inp" value={draft.location} onChange={e => setDraft(p=>({...p,location:e.target.value}))} />
                </div>
                <div className="fl"><label>Maps Link (optional)</label>
                  <input className="inp" placeholder="https://maps.app.goo.gl/…" value={draft.mapUrl} onChange={e => setDraft(p=>({...p,mapUrl:e.target.value}))} />
                </div>
                <div className="fl"><label>Hosts</label>
                  <input className="inp" value={draft.hosts} onChange={e => setDraft(p=>({...p,hosts:e.target.value}))} />
                </div>
                <div className="tog-row">
                  <label className={`tog${draft.offerTraining?' on':''}`}>
                    <input type="checkbox" checked={draft.offerTraining} onChange={e => setDraft(p=>({...p,offerTraining:e.target.checked}))} style={{accentColor:'#00d4c8'}} />
                    <span>Training</span>
                  </label>
                  <label className={`tog${draft.offerBoth?' on':''}`}>
                    <input type="checkbox" checked={draft.offerBoth} onChange={e => setDraft(p=>({...p,offerBoth:e.target.checked}))} style={{accentColor:'#00d4c8'}} />
                    <span>Training + Games</span>
                  </label>
                </div>
                <p style={{fontSize:11,color:'#334155',marginBottom:12}}>Games Only is always available.</p>
                <div className="row2">
                  <div className="fl"><label>Max Players</label>
                    <input className="inp" type="number" value={draft.maxGames} onChange={e => setDraft(p=>({...p,maxGames:parseInt(e.target.value)||0}))} />
                  </div>
                  <div className="fl"><label>Price (AED)</label>
                    <input className="inp" type="number" value={draft.prices.games} onChange={e => setDraft(p=>({...p,prices:{...p.prices,games:parseInt(e.target.value)||0}}))} />
                  </div>
                </div>
                {draft.offerTraining && (
                  <div className="row3">
                    <div className="fl"><label>Training AED</label>
                      <input className="inp" type="number" value={draft.prices.training} onChange={e => setDraft(p=>({...p,prices:{...p.prices,training:parseInt(e.target.value)||0}}))} />
                    </div>
                    {draft.offerBoth && (
                      <div className="fl"><label>Both AED</label>
                        <input className="inp" type="number" value={draft.prices.both} onChange={e => setDraft(p=>({...p,prices:{...p.prices,both:parseInt(e.target.value)||0}}))} />
                      </div>
                    )}
                    <div className="fl"><label>Max Training</label>
                      <input className="inp" type="number" value={draft.maxTraining} onChange={e => setDraft(p=>({...p,maxTraining:parseInt(e.target.value)||0}))} />
                    </div>
                  </div>
                )}
                <div className="fl"><label>Notes</label>
                  <textarea className="inp" rows={2} value={draft.notes} onChange={e => setDraft(p=>({...p,notes:e.target.value}))} />
                </div>
                <button className="btn-primary" onClick={doPublish} disabled={saving}>
                  {saving ? 'Saving…' : editId ? 'Update Session' : 'Publish Session'}
                </button>
                {editId && (
                  <button className="btn-outline" style={{width:'100%',marginTop:8}}
                    onClick={() => { setEditId(null); setDraft({...DEF_SESSION,id:genId()}); }}>
                    Cancel edit
                  </button>
                )}
              </div>
            )}

            {/* ── ON THE NIGHT ── */}
            {av === 'night' && (
              <div className="aw">
                {!gnSess ? (
                  <>
                    <div className="sec">Select Session</div>
                    {sessions.length === 0 && <p style={{color:'#334155',fontSize:13}}>No open sessions. Use History to edit past sessions.</p>}
                    {sessions.map(s => (
                      <div key={s.id} className="card" style={{cursor:'pointer'}} onClick={() => setGnSess(s)}>
                        <div style={{fontSize:15,fontWeight:800,color:'#f1f5f9',marginBottom:3}}>{s.title}</div>
                        <div style={{fontSize:12,color:'#64748b'}}>{fmtLong(s.date)} · {s.location}</div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:800}}>{gnSess.title}</div>
                        <button className="back-btn" onClick={() => setGnSess(null)}>← Change session</button>
                      </div>
                      <button className="btn-outline" onClick={() => loadGn(gnSess)}>↻ Refresh</button>
                    </div>

                    {gnFriends.length > 0 && (
                      <div className="card" style={{borderColor:'#f59e0b33',marginBottom:12}}>
                        <div style={{fontSize:10,fontWeight:700,color:'#f59e0b',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Friend Requests</div>
                        {gnFriends.map((f,i) => (
                          <div key={i} style={{fontSize:12,color:'#94a3b8',marginBottom:2}}>{f.name} → <strong style={{color:'#f1f5f9'}}>{f.with}</strong></div>
                        ))}
                      </div>
                    )}

                    {gnList.length === 0 && <p style={{color:'#334155',fontSize:13,textAlign:'center',padding:'20px 0'}}>No signups yet.</p>}

                    {['Games Only','Training + Games','Training Only','Waitlist'].map(type => {
                      const g = gnList.filter(s => s.type === type);
                      if (!g.length) return null;
                      return (
                        <div key={type}>
                          <div className="sec">{type} ({g.length})</div>
                          {g.map(s => {
                            const pl = players.find(p => p.name.toLowerCase() === s.name.toLowerCase());
                            const isOpen = gnExp === s.name;
                            return (
                              <div key={s.name} className="gn-row">
                                <div className="gn-top" onClick={() => setGnExp(isOpen ? null : s.name)}>
                                  <div className="gn-info">
                                    <div className="gn-name">{s.name}</div>
                                    <div className="gn-sub">R:{pl?.rating||'—'} A:{pl?.attack||'—'} Rcv:{pl?.receive||'—'}{pl?.setter==='Setter'?' · Setter':''}</div>
                                  </div>
                                  <button className={`tog-btn ${s.paid==='Yes'?'yes':'no'}`}
                                    onClick={e => { e.stopPropagation(); gnToggle(s.name,'paid',s.paid==='Yes'?'No':'Yes'); }}>
                                    {gnBusy[`${s.name}_paid`] ? '…' : s.paid==='Yes' ? '✓ Paid' : '✗ Unpaid'}
                                  </button>
                                  <button className={`tog-btn ${s.attended==='Yes'?'yes':'no'}`}
                                    onClick={e => { e.stopPropagation(); gnToggle(s.name,'attended',s.attended==='Yes'?'No':'Yes'); }}>
                                    {gnBusy[`${s.name}_attended`] ? '…' : s.attended==='Yes' ? '✓ Here' : '✗ No-show'}
                                  </button>
                                  <span style={{fontSize:12,color:'#334155',marginLeft:4,flexShrink:0}}>{isOpen?'▲':'▼'}</span>
                                </div>
                                {isOpen && (
                                  <div className="gn-bottom">
                                    <div className="rate-row">
                                      <span className="rate-lbl">Rating</span>
                                      <div className="rbtns">
                                        {[1,2,3,4,5].map(n => (
                                          <button key={n} className={`rb${(pl?.rating||s.rating)===String(n)?' on':''}`}
                                            onClick={() => gnRate(s.name,'rating',String(n))}>
                                            {gnBusy[`${s.name}_rating`] ? '…' : n}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="rate-row">
                                      <span className="rate-lbl">Attack</span>
                                      <div className="rbtns">
                                        {[1,2,3,4,5].map(n => (
                                          <button key={n} className={`rb${pl?.attack===String(n)?' on':''}`}
                                            onClick={() => gnRate(s.name,'attack',String(n))}>{n}</button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="rate-row">
                                      <span className="rate-lbl">Receive</span>
                                      <div className="rbtns">
                                        {[1,2,3,4,5].map(n => (
                                          <button key={n} className={`rb${pl?.receive===String(n)?' on':''}`}
                                            onClick={() => gnRate(s.name,'receive',String(n))}>{n}</button>
                                        ))}
                                      </div>
                                    </div>
                                    <div className="rate-row">
                                      <span className="rate-lbl">Setter</span>
                                      <div className="rbtns">
                                        <button className={`rb rb-wide${pl?.setter==='Setter'?' setter-on':''}`}
                                          onClick={() => gnRate(s.name,'setter',pl?.setter==='Setter'?'':'Setter')}>
                                          {pl?.setter==='Setter' ? '✓ Setter' : 'Setter'}
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    {gnList.filter(s=>s.paid==='No'&&s.type!=='Waitlist'&&s.host!=='Yes').length > 0 && (
                      <div style={{marginTop:16}}>
                        <div className="sec">Unpaid ({gnList.filter(s=>s.paid==='No'&&s.type!=='Waitlist'&&s.host!=='Yes').length})</div>
                        <button className="copy-btn" onClick={() => {
                          const txt = gnList.filter(s=>s.paid==='No'&&s.type!=='Waitlist'&&s.host!=='Yes')
                            .map(s=>`${s.name} — ${s.amount} AED`).join('\n');
                          navigator.clipboard.writeText('Unpaid players:\n'+txt);
                          alert('Copied to clipboard!');
                        }}>📋 Copy unpaid list for WhatsApp</button>
                      </div>
                    )}

                    <div className="total-bar">
                      <span style={{fontSize:13,color:'#64748b'}}>Expected total</span>
                      <span style={{fontSize:16,fontWeight:900,color:'#00d4c8'}}>
                        {gnList.filter(s=>s.type!=='Waitlist'&&s.host!=='Yes').reduce((a,s)=>a+(parseFloat(s.amount)||0),0)} AED
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ── TEAMS ── */}
            {av === 'teams' && (
              <div className="aw">
                {!tmSess ? (
                  <>
                    <div className="sec">Select Session</div>
                    {sessions.length === 0 && <p style={{color:'#334155',fontSize:13}}>No open sessions.</p>}
                    {sessions.map(s => (
                      <div key={s.id} className="card" style={{cursor:'pointer'}} onClick={() => setTmSess(s)}>
                        <div style={{fontSize:15,fontWeight:800,color:'#f1f5f9',marginBottom:3}}>{s.title}</div>
                        <div style={{fontSize:12,color:'#64748b'}}>{fmtLong(s.date)} · {s.location}</div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:800}}>{tmSess.title}</div>
                        <button className="back-btn" onClick={() => setTmSess(null)}>← Change session</button>
                      </div>
                      <button className="btn-outline" onClick={() => loadTm(tmSess)}>↻ Refresh</button>
                    </div>

                    {tmFriends.length > 0 && (
                      <div className="card" style={{borderColor:'#a78bfa33',marginBottom:12}}>
                        <div style={{fontSize:10,fontWeight:700,color:'#a78bfa',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Friend Requests</div>
                        {tmFriends.map((f,i) => <div key={i} style={{fontSize:12,color:'#94a3b8',marginBottom:2}}>{f.name} → <strong style={{color:'#f1f5f9'}}>{f.with}</strong></div>)}
                      </div>
                    )}

                    <div className="sec">Number of Teams</div>
                    <div className="n-sel">
                      {[3,4,5,6].map(n => (
                        <button key={n} className={`n-btn${tmCount===n?' on':''}`}
                          onClick={() => { setTmCount(n); setTmTeams([]); setTmPool(tmPool.length?tmPool:[...tmPool]); }}>
                          {n}
                        </button>
                      ))}
                    </div>

                    <button className="btn-primary" style={{marginBottom:12}} onClick={autoBalance}>
                      ⚡ Auto-Balance Teams
                    </button>

                    {tmPool.length > 0 && (
                      <div className="pool" onDragOver={e=>onDragOver(e,'pool')} onDrop={e=>onDrop(e,'pool')}>
                        <div className="pool-hdr">Unassigned ({tmPool.length})</div>
                        {tmPool.map(p => (
                          <div key={p.name} className="tp" draggable
                            onDragStart={() => onDragStart(p,'pool')}>
                            <div className="tp-name">{p.name}</div>
                            {tmFriends.find(f=>f.name===p.name||f.with===p.name) && <span className="tp-tag tp-friend">🤝</span>}
                            {p.setter && <span className="tp-tag tp-setter">S</span>}
                            <div className="tp-r">{p.rating||'?'}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {tmTeams.map(t => (
                      <div key={t.color} className="team-card"
                        style={{borderColor:TEAM_HEX[t.color]?.bg+'44'}}
                        onDragOver={e=>onDragOver(e,t.color)}
                        onDrop={e=>onDrop(e,t.color)}>
                        <div className="team-hdr">
                          <div className="team-nm" style={{color:TEAM_HEX[t.color]?.bg}}>{t.color} Team</div>
                          <div className="team-stats">
                            <span className="tstat">avg {teamAvg(t)}</span>
                            <span className="tstat">{t.players.length} players</span>
                          </div>
                        </div>
                        {t.players.map(p => (
                          <div key={p.name} className="tp" draggable
                            onDragStart={() => onDragStart(p,t.color)}>
                            <div className="tp-name">{p.name}</div>
                            {tmFriends.find(f=>f.name===p.name||f.with===p.name) && <span className="tp-tag tp-friend">🤝</span>}
                            {p.setter && <span className="tp-tag tp-setter">S</span>}
                            <div className="tp-r">{p.rating||'?'}</div>
                          </div>
                        ))}
                        <div className={`drop${tmOver===t.color?' over':''}`}>Drop player here</div>
                      </div>
                    ))}

                    {tmPool.length===0 && tmTeams.length===0 && (
                      <p style={{color:'#334155',fontSize:13,textAlign:'center',padding:'20px 0'}}>
                        No confirmed paid players yet for this session.
                      </p>
                    )}

                    {tmTeams.length > 0 && (
                      <button className="btn-primary" style={{marginTop:8}} onClick={saveTm}>
                        {tmSaved ? '✓ Teams Saved!' : '💾 Confirm & Save Teams'}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── HISTORY ── */}
            {av === 'history' && (
              <div className="aw">
                <div className="sec">Search Sessions</div>
                <div className="fl">
                  <input className="inp" placeholder="Player name…" value={histF.name}
                    onChange={e => setHistF(p=>({...p,name:e.target.value}))} />
                </div>
                <div className="row2">
                  <div className="fl">
                    <select className="inp" value={histF.paid} onChange={e => setHistF(p=>({...p,paid:e.target.value}))}>
                      <option value="">Any payment</option>
                      <option value="Yes">Paid ✓</option>
                      <option value="No">Unpaid ✗</option>
                    </select>
                  </div>
                  <div className="fl">
                    <select className="inp" value={histF.attended} onChange={e => setHistF(p=>({...p,attended:e.target.value}))}>
                      <option value="">Any attendance</option>
                      <option value="Yes">Attended ✓</option>
                      <option value="No">No-show ✗</option>
                    </select>
                  </div>
                </div>
                <div className="row2">
                  <div className="fl"><label>From</label>
                    <input className="inp" type="date" value={histF.from} onChange={e => setHistF(p=>({...p,from:e.target.value}))} />
                  </div>
                  <div className="fl"><label>To</label>
                    <input className="inp" type="date" value={histF.to} onChange={e => setHistF(p=>({...p,to:e.target.value}))} />
                  </div>
                </div>
                <button className="btn-primary" style={{marginBottom:16}} onClick={loadHist}>
                  🔍 Search
                </button>

                {/* Archive button */}
                <button className="btn-danger" style={{width:'100%',marginBottom:20,padding:'10px'}} onClick={async () => {
                  if (!confirm('Archive sessions older than 3 months? They will move to an Archive tab in the sheet.')) return;
                  const res = await fetch('/api/signup', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'archive'})});
                  const d = await res.json();
                  alert(d.archived > 0 ? `Archived ${d.archived} rows to ${d.archiveName}.` : 'Nothing to archive yet (no sessions older than 3 months).');
                  if (d.archived > 0) loadHist();
                }}>
                  📦 Archive Sessions Older Than 3 Months
                </button>

                {histLoading && <p style={{color:'#334155',textAlign:'center',padding:'20px 0'}}>Loading…</p>}

                {!histSel ? (
                  histGroups.length === 0 && histSearched && !histLoading
                    ? <p style={{color:'#334155',fontSize:13,textAlign:'center'}}>No sessions found.</p>
                    : histGroups.map(([date, rows]) => (
                      <div key={date} className="hist-row" onClick={() => { setHistSel(date); setHistRows(rows); }}>
                        <div className="hist-date">{date}</div>
                        <div className="pills">
                          <span className="hist-pill">{rows.filter(s=>s.type!=='Waitlist').length} players</span>
                          <span className="hist-pill">{rows.filter(s=>s.paid==='Yes'&&s.host!=='Yes').length} paid</span>
                          <span className="hist-pill">{rows.filter(s=>s.attended==='No'&&s.host!=='Yes').length} no-shows</span>
                          <span className="hist-pill">{rows.filter(s=>s.host!=='Yes'&&s.type!=='Waitlist').reduce((a,s)=>a+(parseFloat(s.amount)||0),0)} AED</span>
                        </div>
                      </div>
                    ))
                ) : (
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:800}}>{histSel}</div>
                        <button className="back-btn" onClick={() => setHistSel(null)}>← Back to list</button>
                      </div>
                    </div>

                    {/* Player list with rate, paid, attended */}
                    {histRows.map((s, i) => {
                      const pl = players.find(p => p.name.toLowerCase() === s.name.toLowerCase());
                      const isOpen = gnExp === `hist_${s.name}`;
                      return (
                        <div key={i} className="gn-row">
                          <div className="gn-top" onClick={() => setGnExp(isOpen ? null : `hist_${s.name}`)}>
                            <div className="gn-info">
                              <div className="gn-name">{s.name}</div>
                              <div className="gn-sub">{s.type} · {s.amount} AED · R:{pl?.rating||s.rating||'—'}</div>
                            </div>
                            <button className={`tog-btn ${s.paid==='Yes'?'yes':'no'}`}
                              onClick={async e => {
                                e.stopPropagation();
                                const v = s.paid==='Yes'?'No':'Yes';
                                await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update_signup',date:histSel,name:s.name,field:'paid',value:v})});
                                setHistRows(prev => prev.map(r => r.name===s.name ? {...r,paid:v} : r));
                              }}>
                              {s.paid==='Yes'?'✓ Paid':'✗ Unpaid'}
                            </button>
                            <button className={`tog-btn ${s.attended==='Yes'?'yes':'no'}`}
                              onClick={async e => {
                                e.stopPropagation();
                                const v = s.attended==='Yes'?'No':'Yes';
                                await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update_signup',date:histSel,name:s.name,field:'attended',value:v})});
                                setHistRows(prev => prev.map(r => r.name===s.name ? {...r,attended:v} : r));
                              }}>
                              {s.attended==='Yes'?'✓ Here':'✗ NS'}
                            </button>
                            <span style={{fontSize:12,color:'#334155',marginLeft:4,flexShrink:0}}>{isOpen?'▲':'▼'}</span>
                          </div>
                          {isOpen && (
                            <div className="gn-bottom">
                              <div className="rate-row">
                                <span className="rate-lbl">Rating</span>
                                <div className="rbtns">
                                  {[1,2,3,4,5].map(n => (
                                    <button key={n} className={`rb${(pl?.rating||s.rating)===String(n)?' on':''}`}
                                      onClick={() => {
                                        gnRate(s.name,'rating',String(n));
                                        setHistRows(prev => prev.map(r => r.name===s.name ? {...r,rating:String(n)} : r));
                                      }}>{gnBusy[`${s.name}_rating`]?'…':n}</button>
                                  ))}
                                </div>
                              </div>
                              <div className="rate-row">
                                <span className="rate-lbl">Attack</span>
                                <div className="rbtns">
                                  {[1,2,3,4,5].map(n => (
                                    <button key={n} className={`rb${pl?.attack===String(n)?' on':''}`}
                                      onClick={() => gnRate(s.name,'attack',String(n))}>{n}</button>
                                  ))}
                                </div>
                              </div>
                              <div className="rate-row">
                                <span className="rate-lbl">Receive</span>
                                <div className="rbtns">
                                  {[1,2,3,4,5].map(n => (
                                    <button key={n} className={`rb${pl?.receive===String(n)?' on':''}`}
                                      onClick={() => gnRate(s.name,'receive',String(n))}>{n}</button>
                                  ))}
                                </div>
                              </div>
                              <div className="rate-row">
                                <span className="rate-lbl">Setter</span>
                                <div className="rbtns">
                                  <button className={`rb rb-wide${pl?.setter==='Setter'?' setter-on':''}`}
                                    onClick={() => gnRate(s.name,'setter',pl?.setter==='Setter'?'':'Setter')}>
                                    {pl?.setter==='Setter'?'✓ Setter':'Setter'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {histRows.length === 0 && <p style={{color:'#334155',fontSize:13,textAlign:'center'}}>No players found.</p>}
                  </>
                )}
              </div>
            )}
          </>
        )
      )}
    </div>
  );
}
