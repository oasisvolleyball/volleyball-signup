'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

// ── Constants ──────────────────────────────────────────────────
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'OVC2026';
const WHATSAPP_GROUP = 'https://chat.whatsapp.com/GD7I8r3fnTNLAEN6s6q2b7';
const AANI_NUMBER = '+971501986469';
const BANK_NAME = 'Wio Bank';
const BANK_ACCOUNT_NAME = 'Keri Adonna Zeller';
const BANK_IBAN = 'AE440860000006133847628';
const BANK_SWIFT = 'WIOBAEADXXX';

const TEAM_COLORS = ['Blue','Black','White','Green','Yellow','Red'];
const TEAM_BG = {
  Blue:'#dbeafe', Black:'#1e293b', White:'#f8fafc',
  Green:'#dcfce7', Yellow:'#fef9c3', Red:'#fee2e2',
};
const TEAM_TEXT = {
  Blue:'#1d4ed8', Black:'#f1f5f9', White:'#374151',
  Green:'#15803d', Yellow:'#854d0e', Red:'#991b1b',
};

const LEVEL_LABEL = { '1':'Pro','2':'Advanced','3':'Intermediate','4':'Upper Beginner','5':'Beginner' };

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function formatDisplayDate(d) {
  if (!d) return '';
  return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
function formatShortDate(d) {
  if (!d) return '';
  return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short'});
}
function isWithin2Hours(session) {
  if (!session?.date || !session?.time) return false;
  try {
    const start = session.time.split('–')[0].trim();
    const diff = new Date(session.date+' '+start) - Date.now();
    return diff >= 0 && diff <= 2*60*60*1000;
  } catch { return false; }
}
function isWaitlist(type) { return type === 'Waitlist'; }
function safeUrl(url) {
  if (!url) return '#';
  return url.startsWith('http') ? url : 'https://'+url;
}

const EMPTY_SESSION = {
  id:'', title:'Volleyball Social Games', date:'', time:'7:00 PM – 10:00 PM',
  location:'ADNEC, Abu Dhabi', mapUrl:'', hosts:'Keri',
  maxGames:18, maxTraining:0, notes:'', offerTraining:false, offerBoth:false,
  prices:{ games:35, training:0, both:0 },
};

// ── Styles ─────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Inter',sans-serif;background:#0d1b5e;color:#f1f5f9;min-height:100vh;}
input,select,textarea,button{font-family:'Inter',sans-serif;}

/* Nav */
.nav{display:flex;background:#0a1545;border-bottom:2px solid #00d4c8;position:sticky;top:0;z-index:50;}
.nb{flex:1;padding:14px 6px;text-align:center;border:none;background:none;font-size:12px;font-weight:700;color:#64748b;cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;transition:all 0.2s;letter-spacing:0.5px;text-transform:uppercase;}
.nb.on{color:#00d4c8;border-bottom-color:#00d4c8;}
.badge{background:#00d4c822;color:#00d4c8;font-size:10px;font-weight:800;border-radius:10px;padding:1px 6px;margin-left:4px;}

/* Page wrapper */
.page{max-width:480px;margin:0 auto;}

/* Cards */
.card{background:#1a2d6d;border-radius:14px;padding:16px;margin-bottom:12px;border:1px solid #1e3a8a;}
.card-teal{border-color:#00d4c833;}

/* Header banner */
.banner{background:linear-gradient(135deg,#0d1b5e,#1a2d6d);padding:24px 20px 20px;border-bottom:2px solid #00d4c833;position:relative;overflow:hidden;}
.banner::after{content:'🏐';position:absolute;right:16px;top:50%;transform:translateY(-50%);font-size:72px;opacity:0.06;pointer-events:none;}
.banner-tag{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#00d4c8;font-weight:700;margin-bottom:6px;}
.banner-title{font-size:clamp(18px,5vw,26px);font-weight:900;color:#fff;line-height:1.1;}
.banner-back{font-size:12px;color:#64748b;cursor:pointer;margin-bottom:12px;display:inline-flex;align-items:center;gap:4px;background:none;border:none;padding:0;color:#64748b;transition:color 0.2s;}
.banner-back:hover{color:#00d4c8;}
.banner-meta{margin-top:10px;display:flex;flex-direction:column;gap:5px;}
.banner-row{display:flex;align-items:flex-start;gap:8px;font-size:13px;color:#94a3b8;}

/* Spots bar */
.spots-bar{display:flex;background:#0a1545;border-bottom:1px solid #1e3a8a;}
.spot{flex:1;padding:12px 6px;text-align:center;border-right:1px solid #1e3a8a;}
.spot:last-child{border-right:none;}
.spot-n{font-size:22px;font-weight:900;line-height:1;}
.spot-l{font-size:9px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-top:3px;}

/* Price row */
.price-bar{display:flex;background:#091235;border-bottom:1px solid #1e3a8a;}
.price-cell{flex:1;padding:10px 4px;text-align:center;border-right:1px solid #1e3a8a;}
.price-cell:last-child{border-right:none;}
.price-amt{font-size:16px;font-weight:800;color:#00d4c8;}
.price-lbl{font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:1px;margin-top:2px;}

/* Forms */
.form-area{padding:20px 16px;}
.form-label{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:7px;display:block;}
.inp{width:100%;background:#1a2d6d;border:1.5px solid #1e3a8a;border-radius:10px;color:#f1f5f9;font-size:14px;padding:11px 13px;outline:none;transition:border-color 0.2s;}
.inp:focus{border-color:#00d4c8;}
.inp::placeholder{color:#334155;}
.inp-wrap{position:relative;margin-bottom:16px;}
.suggs{position:absolute;top:calc(100%+4px);left:0;right:0;background:#1a2d6d;border:1.5px solid #00d4c833;border-radius:10px;z-index:100;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,0.4);}
.sugg{padding:10px 14px;cursor:pointer;font-size:13px;font-weight:600;color:#f1f5f9;transition:background 0.15s;display:flex;align-items:center;gap:8px;}
.sugg:hover{background:#0d1b5e;}
.sugg-level{font-size:10px;color:#00d4c8;background:#00d4c811;padding:2px 6px;border-radius:10px;}

/* Type buttons */
.type-btns{display:flex;flex-direction:column;gap:10px;margin-bottom:16px;}
.tbtn{background:#1a2d6d;border:2px solid #1e3a8a;border-radius:12px;padding:14px 16px;cursor:pointer;text-align:left;transition:all 0.2s;display:flex;justify-content:space-between;align-items:center;}
.tbtn:hover:not(.dis){border-color:#00d4c844;}
.tbtn.sel{border-color:#00d4c8;background:#00d4c811;}
.tbtn.dis{opacity:0.4;cursor:not-allowed;}
.tbtn.waitlist-btn{border-color:#f87171;}
.tbtn.waitlist-btn.sel{background:#f8717111;}
.tbtn-name{font-size:14px;font-weight:600;color:#f1f5f9;}
.tbtn-price{font-size:16px;font-weight:900;color:#00d4c8;}
.tbtn-price.red{color:#f87171;}

/* Submit button */
.sub-btn{width:100%;background:#00d4c8;color:#0d1b5e;border:none;border-radius:12px;font-size:15px;font-weight:900;padding:14px;cursor:pointer;letter-spacing:0.5px;transition:all 0.2s;}
.sub-btn:hover{background:#00bfb3;}
.sub-btn:disabled{opacity:0.5;cursor:not-allowed;}

/* Error */
.err{background:#f8717122;border:1px solid #f8717144;color:#fca5a5;border-radius:8px;padding:10px 14px;font-size:13px;margin-top:10px;}

/* Strike warning */
.strike-warn{background:#f59e0b22;border:1.5px solid #f59e0b44;border-radius:10px;padding:12px 14px;margin-bottom:14px;font-size:13px;color:#fcd34d;}

/* Success */
.succ{margin:20px 16px;background:#1a2d6d;border:2px solid #00d4c844;border-radius:16px;padding:28px 20px;text-align:center;}
.succ-icon{font-size:44px;margin-bottom:10px;}
.succ-title{font-size:20px;font-weight:900;color:#00d4c8;margin-bottom:6px;}
.succ-sub{font-size:13px;color:#64748b;line-height:1.6;}
.succ-type{display:inline-block;margin-top:10px;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;background:#00d4c822;color:#00d4c8;}

/* Payment box */
.pay-box{margin:16px;background:#0a1545;border:1.5px solid #00d4c833;border-radius:12px;padding:14px;}
.pay-title{font-size:11px;font-weight:700;color:#00d4c8;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;}
.pay-method{margin-bottom:10px;padding-bottom:10px;border-bottom:1px solid #1e3a8a;}
.pay-method:last-child{margin-bottom:0;padding-bottom:0;border-bottom:none;}
.pay-method-name{font-size:12px;font-weight:700;color:#f1f5f9;margin-bottom:4px;}
.pay-detail{font-size:12px;color:#64748b;line-height:1.6;}
.pay-detail strong{color:#94a3b8;}

/* Who's joining */
.who{padding:0 16px 16px;}
.who-title{font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#334155;margin:20px 0 12px;border-top:1px solid #1e3a8a;padding-top:18px;}
.who-section{margin-bottom:12px;}
.who-lbl{font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;color:#00d4c8;}
.who-chips{display:flex;flex-wrap:wrap;gap:6px;}
.chip{background:#1a2d6d;border-radius:20px;padding:5px 12px;font-size:13px;font-weight:600;color:#f1f5f9;display:flex;align-items:center;gap:6px;border:1px solid #1e3a8a;}
.chip-num{font-size:10px;color:#475569;}
.chip-del{background:none;border:none;color:#334155;cursor:pointer;font-size:12px;padding:0;line-height:1;transition:color 0.2s;}
.chip-del:hover{color:#f87171;}
.chip-locked{color:#334155;font-size:11px;}

/* Cancel policy */
.policy{margin:0 16px 16px;background:#1a2d6d;border-radius:10px;padding:12px 14px;font-size:12px;color:#475569;line-height:1.6;border:1px solid #1e3a8a;}
.policy a{color:#00d4c8;text-decoration:none;}

/* WhatsApp banner */
.wa{margin:16px;background:#1a2d6d;border:1.5px solid #25D36622;border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px;text-decoration:none;transition:border-color 0.2s;}
.wa:hover{border-color:#25D36644;}
.wa-icon{font-size:22px;flex-shrink:0;}
.wa-text{font-size:13px;color:#64748b;flex:1;}
.wa-text strong{color:#f1f5f9;display:block;margin-bottom:1px;}
.wa-arrow{font-size:14px;color:#25D366;flex-shrink:0;}

/* Session picker */
.pick-card{background:#1a2d6d;border:1.5px solid #1e3a8a;border-radius:12px;padding:14px 16px;margin-bottom:10px;cursor:pointer;transition:border-color 0.2s;}
.pick-card:hover{border-color:#00d4c844;}
.pick-header{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:6px;}
.pick-title{font-size:15px;font-weight:800;color:#f1f5f9;flex:1;}
.pick-price{font-size:15px;font-weight:900;color:#00d4c8;flex-shrink:0;}
.pick-meta{font-size:12px;color:#64748b;margin-top:2px;}
.pick-spots{display:flex;gap:8px;margin-top:10px;}
.pick-spot{flex:1;background:#0a1545;border-radius:8px;padding:6px 8px;text-align:center;}
.pick-spot-n{font-size:18px;font-weight:900;}
.pick-spot-l{font-size:9px;color:#475569;text-transform:uppercase;letter-spacing:1px;}

/* No session */
.no-sess{text-align:center;padding:60px 20px;color:#334155;}
.no-sess-icon{font-size:48px;margin-bottom:14px;}

/* Admin */
.lock-wrap{max-width:320px;margin:60px auto;padding:0 20px;text-align:center;}
.lock-title{font-size:22px;font-weight:900;margin-bottom:20px;color:#f1f5f9;}
.admin-tabs{display:flex;background:#091235;border-bottom:1px solid #1e3a8a;}
.atb{flex:1;padding:11px 4px;text-align:center;border:none;background:none;font-size:11px;font-weight:700;color:#475569;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all 0.2s;letter-spacing:0.5px;text-transform:uppercase;}
.atb.on{color:#00d4c8;border-bottom-color:#00d4c8;}
.aw{padding:20px 16px;}
.st{font-size:10px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#00d4c8;margin:20px 0 10px;}
.fl{margin-bottom:12px;}
.fl label{display:block;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;}
.row2{display:flex;gap:10px;}
.row2 .fl{flex:1;}
.price-row{display:flex;gap:8px;}
.price-row .fl{flex:1;}
.tog-row{display:flex;gap:10px;margin-bottom:4px;}
.tog{flex:1;display:flex;align-items:center;gap:8px;cursor:pointer;background:#1a2d6d;border-radius:10px;padding:10px 12px;border:1.5px solid #1e3a8a;transition:all 0.2s;}
.tog.on{border-color:#00d4c8;}
.tog-txt{font-size:13px;font-weight:600;color:#f1f5f9;}
.pub-btn{width:100%;margin-top:20px;background:#00d4c8;color:#0d1b5e;border:none;border-radius:12px;font-size:15px;font-weight:900;padding:14px;cursor:pointer;transition:all 0.2s;}
.pub-btn:hover{background:#00bfb3;}
.pub-btn:disabled{opacity:0.5;cursor:not-allowed;}
.pub-btn.danger{background:#ef4444;color:#fff;}
.pub-btn.danger:hover{background:#dc2626;}
.sess-card{background:#1a2d6d;border:1.5px solid #1e3a8a;border-radius:12px;padding:14px 16px;margin-bottom:10px;}
.sess-card-title{font-size:15px;font-weight:800;color:#f1f5f9;margin-bottom:3px;}
.sess-card-meta{font-size:12px;color:#64748b;margin-bottom:10px;}
.sess-actions{display:flex;gap:8px;flex-wrap:wrap;}
.btn-sm{font-size:12px;font-weight:700;padding:5px 12px;border-radius:8px;border:1.5px solid;cursor:pointer;background:none;transition:all 0.2s;}
.btn-teal{color:#00d4c8;border-color:#00d4c844;}
.btn-teal:hover{background:#00d4c811;}
.btn-red{color:#f87171;border-color:#f8717144;}
.btn-red:hover{background:#f8717111;}

/* Game night */
.gn-player{display:flex;align-items:center;gap:8px;padding:10px 12px;background:#1a2d6d;border-radius:10px;margin-bottom:6px;border:1px solid #1e3a8a;}
.gn-name{font-size:14px;font-weight:700;color:#f1f5f9;flex:1;}
.gn-type{font-size:10px;color:#64748b;margin-top:1px;}
.gn-toggle{font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;border:1.5px solid;cursor:pointer;background:none;transition:all 0.2s;white-space:nowrap;}
.gn-toggle.paid-yes{color:#4ade80;border-color:#4ade8044;background:#4ade8011;}
.gn-toggle.paid-no{color:#f87171;border-color:#f8717144;background:#f8717111;}
.gn-toggle.att-yes{color:#4ade80;border-color:#4ade8044;background:#4ade8011;}
.gn-toggle.att-no{color:#f87171;border-color:#f8717144;background:#f8717111;}
.rate-row{display:flex;gap:4px;margin-top:8px;flex-wrap:wrap;}
.rate-btn{font-size:11px;font-weight:700;width:28px;height:28px;border-radius:6px;border:1.5px solid #1e3a8a;cursor:pointer;background:#0a1545;color:#64748b;transition:all 0.2s;display:flex;align-items:center;justify-content:center;}
.rate-btn.sel{background:#00d4c8;color:#0d1b5e;border-color:#00d4c8;}
.rate-lbl{font-size:10px;color:#475569;margin-right:4px;align-self:center;}

/* Team builder */
.team-card{background:#1a2d6d;border-radius:12px;padding:14px;margin-bottom:10px;border:1.5px solid #1e3a8a;}
.team-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.team-name{font-size:14px;font-weight:800;}
.team-avg{font-size:12px;color:#64748b;background:#0a1545;padding:3px 8px;border-radius:20px;}
.team-player{display:flex;align-items:center;gap:8px;padding:7px 10px;background:#0a1545;border-radius:8px;margin-bottom:4px;cursor:grab;}
.team-player:active{cursor:grabbing;}
.team-player-name{font-size:13px;font-weight:600;color:#f1f5f9;flex:1;}
.team-player-rating{font-size:11px;font-weight:700;width:20px;height:20px;border-radius:4px;background:#1a2d6d;display:flex;align-items:center;justify-content:center;color:#00d4c8;}
.team-player-setter{font-size:10px;color:#00d4c8;background:#00d4c811;padding:2px 6px;border-radius:10px;}
.team-drop{min-height:40px;border:2px dashed #1e3a8a;border-radius:8px;margin-top:4px;display:flex;align-items:center;justify-content:center;color:#334155;font-size:12px;}
.team-drop.over{border-color:#00d4c8;background:#00d4c811;}
.unassigned-pool{background:#091235;border-radius:12px;padding:12px;margin-bottom:12px;}
.pool-title{font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;}
.friend-badge{font-size:10px;color:#f59e0b;background:#f59e0b11;padding:2px 6px;border-radius:10px;}

/* History */
.hist-filters{display:flex;flex-direction:column;gap:8px;margin-bottom:14px;}
.hist-session{background:#1a2d6d;border-radius:10px;padding:12px 14px;margin-bottom:6px;border:1px solid #1e3a8a;cursor:pointer;transition:border-color 0.2s;}
.hist-session:hover{border-color:#00d4c844;}
.hist-date{font-size:13px;font-weight:700;color:#f1f5f9;}
.hist-meta{font-size:11px;color:#64748b;margin-top:2px;}
.hist-stats{display:flex;gap:8px;margin-top:6px;flex-wrap:wrap;}
.hist-stat{font-size:10px;color:#475569;background:#0a1545;padding:3px 8px;border-radius:10px;}

/* List tab */
.lw{padding:16px;}
.lr{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#1a2d6d;border-radius:10px;margin-bottom:5px;border:1px solid #1e3a8a;}
.lr-name{font-size:14px;font-weight:700;color:#f1f5f9;flex:1;}
.lr-type{font-size:10px;color:#64748b;}
.lr-badge{font-size:11px;font-weight:700;padding:2px 8px;border-radius:14px;}
.lr-del{background:none;border:none;color:#334155;cursor:pointer;font-size:14px;padding:4px;border-radius:6px;transition:color 0.2s;}
.lr-del:hover{color:#f87171;}
.total-bar{margin-top:14px;padding:13px 16px;background:#1a2d6d;border-radius:12px;display:flex;justify-content:space-between;align-items:center;border:1px solid #1e3a8a;}
.export-btn{background:#1a2d6d;border:1.5px solid #1e3a8a;color:#94a3b8;font-size:12px;font-weight:600;padding:7px 12px;border-radius:8px;cursor:pointer;transition:all 0.2s;}
.export-btn:hover{border-color:#00d4c8;color:#00d4c8;}
.copy-btn{background:#00d4c811;border:1.5px solid #00d4c833;color:#00d4c8;font-size:12px;font-weight:600;padding:7px 12px;border-radius:8px;cursor:pointer;transition:all 0.2s;}
.copy-btn:hover{background:#00d4c822;}
`;

export default function App() {
  // ── State ────────────────────────────────────────────────────
  const [view, setView] = useState('signup');
  const [adminView, setAdminView] = useState('setup');
  const [sessions, setSessions] = useState([]);
  const [players, setPlayers] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [listSessionId, setListSessionId] = useState(null);
  const [signups, setSignups] = useState([]);
  const [sessionCounts, setSessionCounts] = useState({});
  const [draft, setDraft] = useState({ ...EMPTY_SESSION, id: genId() });
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', type: '', friendRequest: '' });
  const [showFriendField, setShowFriendField] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedStrikes, setSubmittedStrikes] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPw, setAdminPw] = useState('');
  const [showSuggs, setShowSuggs] = useState(false);

  // Game night
  const [gnSession, setGnSession] = useState(null);
  const [gnSignups, setGnSignups] = useState([]);
  const [gnExpanded, setGnExpanded] = useState(null);
  const [gnUpdating, setGnUpdating] = useState({});
  const [gnFriendRequests, setGnFriendRequests] = useState([]);

  // Teams
  const [teamSession, setTeamSession] = useState(null);
  const [teamCount, setTeamCount] = useState(3);
  const [teams, setTeams] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [dragPlayer, setDragPlayer] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [teamsSaved, setTeamsSaved] = useState(false);
  const [teamSignups, setTeamSignups] = useState([]);

  // History
  const [histSessions, setHistSessions] = useState([]);
  const [histSelected, setHistSelected] = useState(null);
  const [histSignups, setHistSignups] = useState([]);
  const [histFilters, setHistFilters] = useState({ name:'', paid:'', attended:'', from:'', to:'' });
  const [histLoading, setHistLoading] = useState(false);

  // ── Derived ──────────────────────────────────────────────────
  const sess = selectedSessionId ? sessions.find(s => s.id === selectedSessionId) || null : null;
  const listSess = listSessionId ? sessions.find(s => s.id === listSessionId) || null : null;

  // ── Load data ────────────────────────────────────────────────
  const loadData = useCallback(() => {
    fetch('/api/signup')
      .then(r => r.json())
      .then(d => {
        setPlayers(d.players || []);
        const loaded = d.sessions || [];
        setSessions(loaded);
        loaded.forEach(s => {
          if (!s.date) return;
          fetch(`/api/session?date=${encodeURIComponent(s.date)}`)
            .then(r => r.json())
            .then(data => {
              const count = (data.signups || []).filter(p =>
                (p.type === 'Games Only' || p.type === 'Training + Games') && !isWaitlist(p.type)
              ).length;
              setSessionCounts(prev => ({ ...prev, [s.id]: count }));
            }).catch(() => {});
        });
      }).catch(() => {});
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Fetch signups for selected session ───────────────────────
  const activeDate = sess?.date || null;
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
    const iv = setInterval(fetchSignups, 15000);
    return () => clearInterval(iv);
  }, [fetchSignups]);

  // ── Spots calculation ────────────────────────────────────────
  const confirmedGames = signups.filter(s => !isWaitlist(s.type) && s.type !== 'Training Only').length;
  const confirmedTraining = signups.filter(s => s.type === 'Training Only' || s.type === 'Training + Games').length;
  const waitlistCount = signups.filter(s => isWaitlist(s.type)).length;
  const gamesLeft = sess ? Math.max(0, sess.maxGames - confirmedGames) : 0;
  const trainingLeft = sess ? Math.max(0, (sess.maxTraining || 0) - confirmedTraining) : 0;

  function getAmount(type) {
    if (!sess) return 0;
    if (type === 'Training Only') return sess.prices.training || 0;
    if (type === 'Games Only') return sess.prices.games || 35;
    if (type === 'Training + Games') return sess.prices.both || 0;
    return 0;
  }

  const typeOptions = sess ? [
    { key:'Training Only', price:sess.prices.training||0, show:sess.offerTraining, full:trainingLeft<=0, waitlist:false },
    { key:'Games Only', price:sess.prices.games||35, show:true, full:gamesLeft<=0, waitlist:false },
    { key:'Training + Games', price:sess.prices.both||0, show:sess.offerTraining&&sess.offerBoth, full:trainingLeft<=0||gamesLeft<=0, waitlist:false },
    { key:'Waitlist', price:sess.prices.games||35, show:gamesLeft<=0, full:false, waitlist:true },
  ].filter(o => o.show) : [];

  // ── Suggestions ──────────────────────────────────────────────
  const suggestions = showSuggs && form.name.trim().length > 1
    ? players.filter(p =>
        p.name.toLowerCase().startsWith(form.name.trim().toLowerCase()) &&
        !signups.find(s => s.name.toLowerCase() === p.name.toLowerCase())
      ).slice(0, 5)
    : [];

  const playerStrikes = useCallback(async (name) => {
    // Client-side approximation from loaded signups — server checks on submit
    return 0;
  }, []);

  // ── Signup handler ───────────────────────────────────────────
  const handleSignup = async () => {
    const name = form.name.trim();
    if (!name) { setError('Please enter your name.'); return; }
    if (!form.type) { setError('Please select what you\'re joining for.'); return; }
    if (!sess) { setError('No session selected.'); return; }
    if (signups.find(s => s.name.toLowerCase() === name.toLowerCase())) {
      setError('You\'re already on the list!'); return;
    }
    setLoading(true);
    const isNewPlayer = !players.find(p => p.name.toLowerCase() === name.toLowerCase());
    const amount = getAmount(form.type);
    try {
      const res = await fetch('/api/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'signup', date: sess.date, name, type: form.type,
          amount, isNewPlayer, friendRequest: form.friendRequest.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.error === 'strike_block') {
          setError(`You have ${data.strikes} no-shows in the last 3 months. You can only join the waitlist.`);
        } else {
          setError('Something went wrong — please try again.');
        }
        return;
      }
      setSubmitted(true);
      setSubmittedStrikes(data.strikes || 0);
      setError('');
      fetchSignups();
      loadData();
    } finally { setLoading(false); }
  };

  // ── Remove signup (player-facing) ────────────────────────────
  const removeSignup = async (name, session, isLate) => {
    if (!window.confirm(`Remove ${name} from the list?`)) return;
    await fetch('/api/signup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action:'remove_signup', date:session.date, name, sessionTitle:session.title, isLateCancel:isLate }),
    });
    fetchSignups();
    loadData();
  };

  // ── Admin: publish ───────────────────────────────────────────
  const publish = async () => {
    if (!draft.date) { alert('Please set a date.'); return; }
    setPublishing(true);
    try {
      await fetch('/api/signup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action:'publish_session', session:draft }),
      });
      loadData();
      setDraft({ ...EMPTY_SESSION, id: genId() });
      setEditingId(null);
      alert('Session published!');
    } catch(e) { alert('Failed: '+e.message); }
    finally { setPublishing(false); }
  };

  const closeSession = async (id) => {
    if (!window.confirm('Close this session?')) return;
    await fetch('/api/signup', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'close_session', sessionId:id }),
    });
    loadData();
    if (selectedSessionId === id) setSelectedSessionId(null);
    if (listSessionId === id) setListSessionId(null);
    if (gnSession?.id === id) setGnSession(null);
    if (teamSession?.id === id) setTeamSession(null);
  };

  // ── Game Night ───────────────────────────────────────────────
  const loadGnSignups = useCallback(async (session) => {
    if (!session) return;
    const res = await fetch(`/api/session?date=${encodeURIComponent(session.date)}`);
    const data = await res.json();
    setGnSignups(data.signups || []);
    setGnFriendRequests(data.friendRequests || []);
  }, []);

  useEffect(() => { if (gnSession) loadGnSignups(gnSession); }, [gnSession, loadGnSignups]);

  const gnUpdate = async (name, field, value) => {
    const key = `${name}_${field}`;
    setGnUpdating(p => ({ ...p, [key]: true }));
    setGnSignups(prev => prev.map(s => s.name === name ? { ...s, [field]: value } : s));
    await fetch('/api/signup', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'update_signup', date:gnSession.date, name, field, value }),
    });
    setGnUpdating(p => { const n={...p}; delete n[key]; return n; });
  };

  const gnRatePlayer = async (name, field, value) => {
    const key = `${name}_${field}`;
    setGnUpdating(p => ({ ...p, [key]: true }));
    await fetch('/api/signup', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'update_player', name, field, value }),
    });
    setPlayers(prev => prev.map(p => p.name === name ? { ...p, [field]: value } : p));
    setGnUpdating(p => { const n={...p}; delete n[key]; return n; });
  };

  // ── Team Builder ─────────────────────────────────────────────
  const loadTeamSignups = useCallback(async (session) => {
    if (!session) return;
    const res = await fetch(`/api/session?date=${encodeURIComponent(session.date)}`);
    const data = await res.json();
    // Only confirmed paid players (not waitlist, not training only)
    const eligible = (data.signups || []).filter(s =>
      !isWaitlist(s.type) && s.type !== 'Training Only' && s.paid === 'Yes' && s.host !== 'Yes'
    );
    // Enrich with player data
    const enriched = eligible.map(s => {
      const p = players.find(pp => pp.name.toLowerCase() === s.name.toLowerCase());
      return {
        ...s,
        rating: p?.rating || s.rating || '',
        setter: p?.setter === 'Setter',
        attack: p?.attack || '',
        receive: p?.receive || '',
        gender: p?.gender || '',
        level: p?.rating ? LEVEL_LABEL[p.rating] || '' : '',
      };
    });
    setTeamSignups(enriched);
    setUnassigned(enriched);
    setTeams([]);
    setTeamsSaved(false);
  }, [players]);

  useEffect(() => { if (teamSession) loadTeamSignups(teamSession); }, [teamSession, loadTeamSignups]);

  const autoBalance = () => {
    if (teamSignups.length === 0) return;
    const n = teamCount;
    const colors = TEAM_COLORS.slice(0, n);

    // Sort players: setters first, then by rating
    const sorted = [...teamSignups].sort((a, b) => {
      if (a.setter && !b.setter) return -1;
      if (!a.setter && b.setter) return 1;
      return (parseInt(a.rating) || 3) - (parseInt(b.rating) || 3);
    });

    // Apply friend requests from gnFriendRequests
    const fr = gnFriendRequests;

    // Snake draft to balance ratings
    const teamArrays = colors.map(c => ({ color: c, players: [] }));
    let dir = 1, teamIdx = 0;
    for (const player of sorted) {
      teamArrays[teamIdx].players.push(player);
      teamIdx += dir;
      if (teamIdx >= n) { teamIdx = n-1; dir = -1; }
      else if (teamIdx < 0) { teamIdx = 0; dir = 1; }
    }

    setTeams(teamArrays);
    setUnassigned([]);
  };

  const teamAvg = (team) => {
    const ratings = team.players.map(p => parseInt(p.rating)).filter(r => !isNaN(r));
    if (ratings.length === 0) return '—';
    return (ratings.reduce((a,b) => a+b, 0) / ratings.length).toFixed(1);
  };

  const onDragStart = (player, fromTeam) => setDragPlayer({ player, fromTeam });
  const onDragOver = (e, toTeam) => { e.preventDefault(); setDragOver(toTeam); };
  const onDrop = (e, toTeam) => {
    e.preventDefault();
    if (!dragPlayer) return;
    const { player, fromTeam } = dragPlayer;
    if (fromTeam === toTeam) { setDragOver(null); return; }

    if (fromTeam === 'unassigned') {
      setUnassigned(prev => prev.filter(p => p.name !== player.name));
    } else {
      setTeams(prev => prev.map(t => t.color === fromTeam
        ? { ...t, players: t.players.filter(p => p.name !== player.name) } : t));
    }

    if (toTeam === 'unassigned') {
      setUnassigned(prev => [...prev, player]);
    } else {
      setTeams(prev => prev.map(t => t.color === toTeam
        ? { ...t, players: [...t.players, player] } : t));
    }
    setDragPlayer(null);
    setDragOver(null);
  };

  const saveTeams = async () => {
    await fetch('/api/signup', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ action:'save_teams', date:teamSession.date, teams, sessionTitle:teamSession.title }),
    });
    setTeamsSaved(true);
  };

  // ── History ──────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const params = new URLSearchParams();
      if (histFilters.name) params.set('name', histFilters.name);
      if (histFilters.paid) params.set('paid', histFilters.paid);
      if (histFilters.attended) params.set('attended', histFilters.attended);
      if (histFilters.from) params.set('from', histFilters.from);
      if (histFilters.to) params.set('to', histFilters.to);
      const res = await fetch(`/api/session?${params}&limit=500`);
      const data = await res.json();
      // Group by date
      const grouped = {};
      for (const s of (data.signups || [])) {
        if (!grouped[s.date]) grouped[s.date] = [];
        grouped[s.date].push(s);
      }
      setHistSessions(Object.entries(grouped).sort((a,b) => new Date(b[0])-new Date(a[0])));
    } finally { setHistLoading(false); }
  }, [histFilters]);

  // ── Render ───────────────────────────────────────────────────
  return (
    <div style={{ fontFamily:"'Inter',sans-serif", minHeight:'100vh', background:'#0d1b5e', color:'#f1f5f9' }}>
      <style>{CSS}</style>

      {/* Nav */}
      <div className="nav">
        <button className={`nb${view==='signup'?' on':''}`} onClick={() => setView('signup')}>
          🏐 Sign Up {sessions.length > 0 && <span className="badge">{sessions.length}</span>}
        </button>
        <button className={`nb${view==='admin'?' on':''}`} onClick={() => setView('admin')}>
          🔒 Admin
        </button>
      </div>

      {/* ════════════ SIGN UP ════════════ */}
      {view === 'signup' && (
        <div className="page">
          {sessions.length === 0 ? (
            <>
              <div className="no-sess">
                <div className="no-sess-icon">🏐</div>
                <p style={{fontSize:15,marginBottom:8,fontWeight:700}}>No sessions open yet.</p>
                <p style={{fontSize:13}}>Check back soon or contact your host.</p>
              </div>
              <a href={WHATSAPP_GROUP} target="_blank" rel="noreferrer" className="wa">
                <span className="wa-icon">💬</span>
                <div className="wa-text"><strong>Join our WhatsApp group</strong>Be the first to know about upcoming sessions</div>
                <span className="wa-arrow">→</span>
              </a>
            </>
          ) : !selectedSessionId ? (
            /* Session picker */
            <>
              <div style={{padding:'20px 16px 8px'}}>
                <div style={{fontSize:10,fontWeight:800,letterSpacing:3,textTransform:'uppercase',color:'#475569',marginBottom:14}}>
                  Select a session
                </div>
                {sessions.map(s => {
                  const priceLabel = s.offerTraining ? `${s.prices.training}–${s.prices.both} AED` : `${s.prices.games||35} AED`;
                  const rem = Math.max(0, s.maxGames - (sessionCounts[s.id] || 0));
                  return (
                    <div key={s.id} className="pick-card" onClick={() => { setSelectedSessionId(s.id); setSubmitted(false); setForm({name:'',type:'',friendRequest:''}); setError(''); }}>
                      <div className="pick-header">
                        <div className="pick-title">{s.title}</div>
                        <div className="pick-price">{priceLabel}</div>
                      </div>
                      <div className="pick-meta">📅 {formatDisplayDate(s.date)}</div>
                      <div className="pick-meta">⏰ {s.time} · 📍 {s.location}</div>
                      <div className="pick-meta">👋 Hosts: {s.hosts}</div>
                      <div className="pick-spots">
                        <div className="pick-spot">
                          <div className="pick-spot-n" style={{color:rem===0?'#f87171':rem<=5?'#fbbf24':'#4ade80'}}>{rem}</div>
                          <div className="pick-spot-l">spots left</div>
                        </div>
                        <div className="pick-spot">
                          <div className="pick-spot-n" style={{color:'#94a3b8'}}>{sessionCounts[s.id]||0}</div>
                          <div className="pick-spot-l">signed up</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <a href={WHATSAPP_GROUP} target="_blank" rel="noreferrer" className="wa" style={{margin:'8px 16px 16px'}}>
                <span className="wa-icon">💬</span>
                <div className="wa-text"><strong>Not in our WhatsApp group?</strong>Join to stay updated on upcoming sessions</div>
                <span className="wa-arrow">→</span>
              </a>
            </>
          ) : sess ? (
            /* Signup form */
            <>
              <div className="banner">
                <button className="banner-back" onClick={() => { setSelectedSessionId(null); setSubmitted(false); }}>← Back to sessions</button>
                <div className="banner-tag">Oasis Volleyball Club · Abu Dhabi</div>
                <div className="banner-title">{sess.title}</div>
                <div className="banner-meta">
                  <div className="banner-row">📅 {formatDisplayDate(sess.date)}</div>
                  <div className="banner-row">⏰ {sess.time}</div>
                  <div className="banner-row">📍 <a href={safeUrl(sess.mapUrl)} target="_blank" rel="noreferrer" style={{color:'#00d4c8',textDecoration:'none'}}>{sess.location}</a></div>
                  <div className="banner-row">👋 Hosts: {sess.hosts}</div>
                  {sess.notes && <div className="banner-row" style={{fontSize:12,color:'#64748b'}}>ℹ️ {sess.notes}</div>}
                </div>
              </div>

              <div className="spots-bar">
                {sess.offerTraining && (
                  <div className="spot">
                    <div className="spot-n" style={{color:trainingLeft===0?'#f87171':trainingLeft<=3?'#fbbf24':'#4ade80'}}>{trainingLeft}</div>
                    <div className="spot-l">Training left</div>
                  </div>
                )}
                <div className="spot">
                  <div className="spot-n" style={{color:gamesLeft===0?'#f87171':gamesLeft<=5?'#fbbf24':'#4ade80'}}>{gamesLeft}</div>
                  <div className="spot-l">Spots left</div>
                </div>
                <div className="spot">
                  <div className="spot-n" style={{color:'#94a3b8'}}>{signups.filter(s=>!isWaitlist(s.type)).length}</div>
                  <div className="spot-l">Signed up</div>
                </div>
                {waitlistCount > 0 && (
                  <div className="spot">
                    <div className="spot-n" style={{color:'#f87171'}}>{waitlistCount}</div>
                    <div className="spot-l">Waitlist</div>
                  </div>
                )}
              </div>

              <div className="price-bar">
                {sess.offerTraining && <div className="price-cell"><div className="price-amt">{sess.prices.training} AED</div><div className="price-lbl">Training</div></div>}
                <div className="price-cell"><div className="price-amt">{sess.prices.games||35} AED</div><div className="price-lbl">Games</div></div>
                {sess.offerTraining && sess.offerBoth && <div className="price-cell"><div className="price-amt">{sess.prices.both} AED</div><div className="price-lbl">Both</div></div>}
              </div>

              {submitted ? (
                <>
                  <div className="succ">
                    <div className="succ-icon">{form.type==='Waitlist'?'📋':'🎉'}</div>
                    <div className="succ-title">{form.type==='Waitlist'?"You're on the waitlist!":"You're in!"}</div>
                    <div className="succ-sub">
                      {form.type==='Waitlist'
                        ? `We'll let you know if a spot opens, ${form.name}!`
                        : `See you on the court, ${form.name}! Please pay before the session.`}
                    </div>
                    {form.type !== 'Waitlist' && (
                      <div className="succ-type">{form.type} · {getAmount(form.type)} AED</div>
                    )}
                    {submittedStrikes > 0 && (
                      <div className="strike-warn" style={{marginTop:12}}>
                        ⚠️ You have {submittedStrikes} no-show{submittedStrikes>1?'s':''} in the last 3 months. Please make sure to attend or cancel in advance.
                      </div>
                    )}
                    <button onClick={() => { setSubmitted(false); setForm({name:'',type:'',friendRequest:''}); }}
                      style={{marginTop:16,background:'none',border:'1px solid #1e3a8a',color:'#64748b',borderRadius:8,padding:'7px 14px',cursor:'pointer',fontSize:12}}>
                      Sign up another player
                    </button>
                  </div>

                  {/* Payment instructions */}
                  {form.type !== 'Waitlist' && (
                    <div className="pay-box">
                      <div className="pay-title">💳 Payment — {getAmount(form.type)} AED</div>
                      <div className="pay-method">
                        <div className="pay-method-name">Aani (instant, free)</div>
                        <div className="pay-detail">
                          Open your banking app → Payments → Aani<br/>
                          Send to mobile: <strong>{AANI_NUMBER}</strong>
                        </div>
                      </div>
                      <div className="pay-method">
                        <div className="pay-method-name">Bank Transfer</div>
                        <div className="pay-detail">
                          Bank: <strong>{BANK_NAME}</strong><br/>
                          Name: <strong>{BANK_ACCOUNT_NAME}</strong><br/>
                          IBAN: <strong>{BANK_IBAN}</strong><br/>
                          SWIFT: <strong>{BANK_SWIFT}</strong>
                        </div>
                      </div>
                      <div style={{fontSize:11,color:'#475569',marginTop:8}}>
                        ⚠️ Payment must be received 24 hours before the session to confirm your spot.
                      </div>
                    </div>
                  )}

                  {/* Cancellation policy */}
                  <div className="policy">
                    <strong style={{color:'#94a3b8',display:'block',marginBottom:4}}>Cancellation Policy</strong>
                    You may remove your name if you can no longer join. Cancelling less than 12 hours before the game please message the hosts directly. Cancelling in the last 2 hours means you must still pay for your spot. Please do not remove other players' names.
                  </div>

                  {/* Who's joining */}
                  <div className="who">
                    <div className="who-title">Who's Joining · {signups.filter(s=>!isWaitlist(s.type)).length} players{waitlistCount>0?` · ${waitlistCount} on waitlist`:''}</div>
                    {['Games Only','Training + Games','Training Only','Waitlist'].map(type => {
                      const group = signups.filter(s => s.type === type);
                      if (!group.length) return null;
                      const locked = isWithin2Hours(sess);
                      return (
                        <div key={type} className="who-section">
                          <div className="who-lbl">{type} ({group.length})</div>
                          <div className="who-chips">
                            {group.map((s,i) => (
                              <div key={i} className="chip">
                                <span className="chip-num">{i+1}.</span>
                                {s.name}
                                {locked
                                  ? <span className="chip-locked">🔒</span>
                                  : <button className="chip-del" onClick={() => removeSignup(s.name, sess, false)}>✕</button>
                                }
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="form-area">
                  <label className="form-label">Your Name</label>
                  <div className="inp-wrap">
                    <input className="inp" placeholder="Enter your name…" value={form.name}
                      onChange={e => { setForm(p=>({...p,name:e.target.value})); setError(''); setShowSuggs(true); }}
                      onFocus={() => setShowSuggs(true)}
                      onBlur={() => setTimeout(() => setShowSuggs(false), 300)}
                      autoComplete="off" />
                    {suggestions.length > 0 && (
                      <div className="suggs">
                        {suggestions.map(p => (
                          <div key={p.name} className="sugg" onClick={() => { setForm(f=>({...f,name:p.name})); setShowSuggs(false); }}>
                            {p.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <label className="form-label">I'm joining for…</label>
                  <div className="type-btns">
                    {typeOptions.map(opt => (
                      <button key={opt.key}
                        className={`tbtn${form.type===opt.key?' sel':''}${opt.full?' dis':''}${opt.waitlist?' waitlist-btn':''}`}
                        onClick={() => !opt.full && setForm(p=>({...p,type:opt.key}))}>
                        <div>
                          <div className="tbtn-name">
                            {opt.waitlist ? '📋 Join Waitlist' : opt.key}
                            {opt.full && <span style={{fontSize:11,color:'#f87171',marginLeft:8}}>FULL</span>}
                          </div>
                          {opt.waitlist && <div style={{fontSize:11,color:'#64748b',marginTop:2}}>Only payable if confirmed</div>}
                        </div>
                        <div style={{textAlign:'right'}}>
                          <div className={`tbtn-price${opt.waitlist?' red':''}`}>{opt.price} AED</div>
                          {opt.waitlist && <div style={{fontSize:10,color:'#64748b',marginTop:1}}>if confirmed</div>}
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Friend request */}
                  <div style={{marginBottom:16}}>
                    <button onClick={() => setShowFriendField(p=>!p)}
                      style={{background:'none',border:'none',color:'#00d4c8',fontSize:12,cursor:'pointer',padding:0,fontWeight:600}}>
                      {showFriendField ? '▲ Hide' : '+ Playing with someone?'}
                    </button>
                    {showFriendField && (
                      <div style={{marginTop:8}}>
                        <input className="inp" placeholder="Who are you hoping to play with?" value={form.friendRequest}
                          onChange={e => setForm(p=>({...p,friendRequest:e.target.value}))} />
                        <div style={{fontSize:11,color:'#475569',marginTop:4}}>We'll do our best to put you on the same team.</div>
                      </div>
                    )}
                  </div>

                  <button className="sub-btn" onClick={handleSignup} disabled={loading}>
                    {loading ? 'Signing up…' : 'SIGN ME UP →'}
                  </button>
                  {error && <div className="err">⚠️ {error}</div>}

                  {signups.length > 0 && (
                    <>
                      <div className="policy" style={{marginTop:16,marginLeft:0,marginRight:0}}>
                        <strong style={{color:'#94a3b8',display:'block',marginBottom:4}}>Cancellation Policy</strong>
                        You may remove your name if you can no longer join. Cancelling less than 12 hours before the game please message the hosts directly. Cancelling in the last 2 hours means you must still pay for your spot. Please do not remove other players' names.
                      </div>
                      <div className="who" style={{paddingLeft:0,paddingRight:0}}>
                        <div className="who-title">Who's Joining · {signups.filter(s=>!isWaitlist(s.type)).length} players{waitlistCount>0?` · ${waitlistCount} on waitlist`:''}</div>
                        {['Games Only','Training + Games','Training Only','Waitlist'].map(type => {
                          const group = signups.filter(s => s.type === type);
                          if (!group.length) return null;
                          const locked = isWithin2Hours(sess);
                          return (
                            <div key={type} className="who-section">
                              <div className="who-lbl">{type} ({group.length})</div>
                              <div className="who-chips">
                                {group.map((s,i) => (
                                  <div key={i} className="chip">
                                    <span className="chip-num">{i+1}.</span>
                                    {s.name}
                                    {locked
                                      ? <span className="chip-locked">🔒</span>
                                      : <button className="chip-del" onClick={() => removeSignup(s.name, sess, false)}>✕</button>
                                    }
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              <a href={WHATSAPP_GROUP} target="_blank" rel="noreferrer" className="wa" style={{marginBottom:24}}>
                <span className="wa-icon">💬</span>
                <div className="wa-text"><strong>Not in our WhatsApp group?</strong>Join to stay updated</div>
                <span className="wa-arrow">→</span>
              </a>
            </>
          ) : null}
        </div>
      )}

      {/* ════════════ ADMIN ════════════ */}
      {view === 'admin' && (
        !adminUnlocked ? (
          <div className="lock-wrap">
            <div className="lock-title">🔒 Admin</div>
            <input className="inp" type="password" placeholder="Password…" value={adminPw}
              onChange={e => setAdminPw(e.target.value)}
              onKeyDown={e => e.key==='Enter' && adminPw===ADMIN_PASSWORD && setAdminUnlocked(true)} />
            <button className="pub-btn" style={{marginTop:14}}
              onClick={() => adminPw===ADMIN_PASSWORD ? setAdminUnlocked(true) : alert('Wrong password')}>
              Unlock
            </button>
          </div>
        ) : (
          <>
            {/* Admin sub-tabs */}
            <div className="admin-tabs">
              <button className={`atb${adminView==='setup'?' on':''}`} onClick={() => setAdminView('setup')}>⚙ Setup</button>
              <button className={`atb${adminView==='gamenight'?' on':''}`} onClick={() => setAdminView('gamenight')}>🎮 Game Night</button>
              <button className={`atb${adminView==='teams'?' on':''}`} onClick={() => setAdminView('teams')}>👥 Teams</button>
              <button className={`atb${adminView==='list'?' on':''}`} onClick={() => setAdminView('list')}>📋 List</button>
              <button className={`atb${adminView==='history'?' on':''}`} onClick={() => { setAdminView('history'); loadHistory(); }}>📅 History</button>
            </div>

            {/* ── SETUP ── */}
            {adminView === 'setup' && (
              <div className="aw">
                {sessions.length > 0 && (
                  <>
                    <div className="st">Open Sessions</div>
                    {sessions.map(s => (
                      <div key={s.id} className="sess-card">
                        <div className="sess-card-title">{s.title}</div>
                        <div className="sess-card-meta">{formatDisplayDate(s.date)} · {s.location}</div>
                        <div className="sess-actions">
                          <button className="btn-sm btn-teal" onClick={() => { setDraft({...s}); setEditingId(s.id); }}>Edit</button>
                          <button className="btn-sm btn-red" onClick={() => closeSession(s.id)}>Close</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <div className="st">{editingId ? 'Edit Session' : 'New Session'}</div>

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
                <div className="fl"><label>Google Maps Link</label>
                  <input className="inp" value={draft.mapUrl} onChange={e => setDraft(p=>({...p,mapUrl:e.target.value}))} placeholder="https://maps.google.com/…" />
                </div>
                <div className="fl"><label>Hosts</label>
                  <input className="inp" value={draft.hosts} onChange={e => setDraft(p=>({...p,hosts:e.target.value}))} />
                </div>

                <div className="st">What's on offer?</div>
                <div className="tog-row">
                  <label className={`tog${draft.offerTraining?' on':''}`}>
                    <input type="checkbox" checked={draft.offerTraining} onChange={e => setDraft(p=>({...p,offerTraining:e.target.checked}))} style={{accentColor:'#00d4c8'}} />
                    <div className="tog-txt">Training</div>
                  </label>
                  <label className={`tog${draft.offerBoth?' on':''}`}>
                    <input type="checkbox" checked={draft.offerBoth} onChange={e => setDraft(p=>({...p,offerBoth:e.target.checked}))} style={{accentColor:'#00d4c8'}} />
                    <div className="tog-txt">Training + Games</div>
                  </label>
                </div>
                <p style={{fontSize:11,color:'#475569',marginBottom:4}}>Games Only is always available.</p>

                <div className="st">Spots & Pricing</div>
                <div className="row2">
                  <div className="fl"><label>Max Games</label>
                    <input className="inp" type="number" value={draft.maxGames} onChange={e => setDraft(p=>({...p,maxGames:parseInt(e.target.value)||0}))} />
                  </div>
                  {draft.offerTraining && (
                    <div className="fl"><label>Max Training</label>
                      <input className="inp" type="number" value={draft.maxTraining} onChange={e => setDraft(p=>({...p,maxTraining:parseInt(e.target.value)||0}))} />
                    </div>
                  )}
                </div>
                <div className="price-row">
                  <div className="fl"><label>Games (AED)</label>
                    <input className="inp" type="number" value={draft.prices.games} onChange={e => setDraft(p=>({...p,prices:{...p.prices,games:parseInt(e.target.value)||0}}))} />
                  </div>
                  {draft.offerTraining && <>
                    <div className="fl"><label>Training (AED)</label>
                      <input className="inp" type="number" value={draft.prices.training} onChange={e => setDraft(p=>({...p,prices:{...p.prices,training:parseInt(e.target.value)||0}}))} />
                    </div>
                    {draft.offerBoth && <div className="fl"><label>Both (AED)</label>
                      <input className="inp" type="number" value={draft.prices.both} onChange={e => setDraft(p=>({...p,prices:{...p.prices,both:parseInt(e.target.value)||0}}))} />
                    </div>}
                  </>}
                </div>

                <div className="st">Notes</div>
                <div className="fl">
                  <textarea className="inp" rows={3} value={draft.notes} onChange={e => setDraft(p=>({...p,notes:e.target.value}))} style={{resize:'vertical'}} />
                </div>

                <button className="pub-btn" onClick={publish} disabled={publishing}>
                  {publishing ? 'Publishing…' : editingId ? '🔄 Update Session' : '🚀 Publish Session'}
                </button>
                {editingId && (
                  <button style={{width:'100%',marginTop:8,background:'none',border:'1.5px solid #1e3a8a',color:'#64748b',borderRadius:12,padding:'10px',cursor:'pointer',fontSize:13}}
                    onClick={() => { setEditingId(null); setDraft({...EMPTY_SESSION,id:genId()}); }}>
                    Cancel edit
                  </button>
                )}

                {/* Archive button */}
                <div className="st" style={{marginTop:32}}>Archive</div>
                <p style={{fontSize:12,color:'#475569',marginBottom:12}}>Move sessions older than 3 months to an archive tab. No-show strikes also reset.</p>
                <button className="pub-btn danger" onClick={async () => {
                  if (!window.confirm('Archive sessions older than 3 months?')) return;
                  const res = await fetch('/api/signup', {
                    method:'POST', headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({ action:'archive' }),
                  });
                  const d = await res.json();
                  alert(d.archived > 0 ? `Archived ${d.archived} rows to ${d.archiveName}.` : 'Nothing to archive yet.');
                }}>
                  📦 Archive Old Sessions
                </button>
              </div>
            )}

            {/* ── GAME NIGHT ── */}
            {adminView === 'gamenight' && (
              <div className="aw">
                {!gnSession ? (
                  <>
                    <div className="st">Select Session</div>
                    {sessions.length === 0 && <p style={{color:'#475569',fontSize:13}}>No open sessions.</p>}
                    {sessions.map(s => (
                      <div key={s.id} className="sess-card" style={{cursor:'pointer'}} onClick={() => setGnSession(s)}>
                        <div className="sess-card-title">{s.title}</div>
                        <div className="sess-card-meta">{formatDisplayDate(s.date)} · {s.location}</div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:800,color:'#f1f5f9'}}>{gnSession.title}</div>
                        <div style={{fontSize:12,color:'#475569',marginTop:2,cursor:'pointer'}} onClick={() => setGnSession(null)}>← Change session</div>
                      </div>
                      <button className="export-btn" onClick={() => loadGnSignups(gnSession)}>🔄 Refresh</button>
                    </div>

                    {gnFriendRequests.length > 0 && (
                      <div style={{background:'#0a1545',borderRadius:10,padding:'10px 12px',marginBottom:12,border:'1px solid #1e3a8a'}}>
                        <div style={{fontSize:10,fontWeight:700,color:'#f59e0b',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Friend Requests</div>
                        {gnFriendRequests.map((fr,i) => (
                          <div key={i} style={{fontSize:12,color:'#94a3b8',marginBottom:2}}>{fr.name} wants to play with <strong style={{color:'#f1f5f9'}}>{fr.with}</strong></div>
                        ))}
                      </div>
                    )}

                    {['Games Only','Training + Games','Training Only','Waitlist'].map(type => {
                      const group = gnSignups.filter(s => s.type === type);
                      if (!group.length) return null;
                      return (
                        <div key={type}>
                          <div className="st">{type} ({group.length})</div>
                          {group.map(s => {
                            const p = players.find(pp => pp.name.toLowerCase() === s.name.toLowerCase());
                            const isOpen = gnExpanded === s.name;
                            return (
                              <div key={s.name} className="gn-player" style={{flexDirection:'column',alignItems:'flex-start'}}>
                                <div style={{display:'flex',alignItems:'center',gap:8,width:'100%'}} onClick={() => setGnExpanded(isOpen ? null : s.name)}>
                                  <div style={{flex:1}}>
                                    <div className="gn-name">{s.name}</div>
                                    <div className="gn-type">Rating: {p?.rating || '—'} · {p?.level || '—'}</div>
                                  </div>
                                  {/* Paid toggle */}
                                  <button className={`gn-toggle ${s.paid==='Yes'?'paid-yes':'paid-no'}`}
                                    onClick={e => { e.stopPropagation(); gnUpdate(s.name, 'paid', s.paid==='Yes'?'No':'Yes'); }}>
                                    {gnUpdating[`${s.name}_paid`] ? '…' : (s.paid==='Yes'?'✓ Paid':'✗ Unpaid')}
                                  </button>
                                  {/* Attended toggle */}
                                  <button className={`gn-toggle ${s.attended==='Yes'?'att-yes':'att-no'}`}
                                    onClick={e => { e.stopPropagation(); gnUpdate(s.name, 'attended', s.attended==='Yes'?'No':'Yes'); }}>
                                    {gnUpdating[`${s.name}_attended`] ? '…' : (s.attended==='Yes'?'✓ Here':'✗ No-show')}
                                  </button>
                                  <span style={{fontSize:12,color:'#334155'}}>{isOpen?'▲':'▼'}</span>
                                </div>

                                {/* Expanded rating panel */}
                                {isOpen && (
                                  <div style={{width:'100%',marginTop:10,paddingTop:10,borderTop:'1px solid #1e3a8a'}}>
                                    <div className="rate-row">
                                      <span className="rate-lbl">Rating:</span>
                                      {[1,2,3,4,5].map(n => (
                                        <button key={n} className={`rate-btn${(p?.rating||s.rating)==String(n)?' sel':''}`}
                                          onClick={() => gnRatePlayer(s.name,'rating',String(n))}>
                                          {gnUpdating[`${s.name}_rating`]?'…':n}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="rate-row" style={{marginTop:6}}>
                                      <span className="rate-lbl">Attack:</span>
                                      {[1,2,3,4,5].map(n => (
                                        <button key={n} className={`rate-btn${(p?.attack)==String(n)?' sel':''}`}
                                          onClick={() => gnRatePlayer(s.name,'attack',String(n))}>
                                          {n}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="rate-row" style={{marginTop:6}}>
                                      <span className="rate-lbl">Receive:</span>
                                      {[1,2,3,4,5].map(n => (
                                        <button key={n} className={`rate-btn${(p?.receive)==String(n)?' sel':''}`}
                                          onClick={() => gnRatePlayer(s.name,'receive',String(n))}>
                                          {n}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="rate-row" style={{marginTop:6}}>
                                      <span className="rate-lbl">Setter:</span>
                                      <button className={`rate-btn${p?.setter==='Setter'?' sel':''}`} style={{width:'auto',padding:'0 8px'}}
                                        onClick={() => gnRatePlayer(s.name,'setter',p?.setter==='Setter'?'':' Setter')}>
                                        Setter
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    {gnSignups.length === 0 && <p style={{color:'#475569',fontSize:13,textAlign:'center',padding:'20px 0'}}>No signups yet.</p>}
                  </>
                )}
              </div>
            )}

            {/* ── TEAMS ── */}
            {adminView === 'teams' && (
              <div className="aw">
                {!teamSession ? (
                  <>
                    <div className="st">Select Session</div>
                    {sessions.length === 0 && <p style={{color:'#475569',fontSize:13}}>No open sessions.</p>}
                    {sessions.map(s => (
                      <div key={s.id} className="sess-card" style={{cursor:'pointer'}} onClick={() => setTeamSession(s)}>
                        <div className="sess-card-title">{s.title}</div>
                        <div className="sess-card-meta">{formatDisplayDate(s.date)} · {s.location}</div>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                      <div>
                        <div style={{fontSize:14,fontWeight:800,color:'#f1f5f9'}}>{teamSession.title}</div>
                        <div style={{fontSize:12,color:'#475569',marginTop:2,cursor:'pointer'}} onClick={() => setTeamSession(null)}>← Change session</div>
                      </div>
                    </div>

                    {/* Friend requests */}
                    {gnFriendRequests.length > 0 && (
                      <div style={{background:'#0a1545',borderRadius:10,padding:'10px 12px',marginBottom:12,border:'1px solid #f59e0b33'}}>
                        <div style={{fontSize:10,fontWeight:700,color:'#f59e0b',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Friend Requests</div>
                        {gnFriendRequests.map((fr,i) => (
                          <div key={i} style={{fontSize:12,color:'#94a3b8',marginBottom:2}}>{fr.name} + <strong style={{color:'#f1f5f9'}}>{fr.with}</strong></div>
                        ))}
                      </div>
                    )}

                    {/* Team count selector */}
                    <div className="st">Number of Teams</div>
                    <div style={{display:'flex',gap:8,marginBottom:16}}>
                      {[3,4,5,6].map(n => (
                        <button key={n}
                          style={{flex:1,padding:'10px',borderRadius:8,border:'1.5px solid',cursor:'pointer',fontWeight:800,fontSize:14,
                            borderColor:teamCount===n?'#00d4c8':'#1e3a8a',
                            background:teamCount===n?'#00d4c811':'#1a2d6d',
                            color:teamCount===n?'#00d4c8':'#64748b'}}
                          onClick={() => { setTeamCount(n); setTeams([]); setUnassigned(teamSignups); }}>
                          {n}
                        </button>
                      ))}
                    </div>

                    <button className="pub-btn" onClick={autoBalance} style={{marginTop:0,marginBottom:12}}>
                      ⚡ Auto-Balance Teams
                    </button>

                    {/* Unassigned pool */}
                    {unassigned.length > 0 && (
                      <div className="unassigned-pool"
                        onDragOver={e => onDragOver(e,'unassigned')}
                        onDrop={e => onDrop(e,'unassigned')}>
                        <div className="pool-title">Unassigned ({unassigned.length})</div>
                        {unassigned.map(p => (
                          <div key={p.name} className="team-player"
                            draggable onDragStart={() => onDragStart(p,'unassigned')}>
                            <div className="team-player-name">{p.name}</div>
                            {p.setter && <span className="team-player-setter">Setter</span>}
                            {gnFriendRequests.find(fr => fr.name===p.name) && (
                              <span className="friend-badge">🤝 {gnFriendRequests.find(fr=>fr.name===p.name).with}</span>
                            )}
                            <div className="team-player-rating">{p.rating||'?'}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Team cards */}
                    {teams.map(team => (
                      <div key={team.color} className="team-card"
                        style={{borderColor:TEAM_BG[team.color]+'88'}}
                        onDragOver={e => onDragOver(e, team.color)}
                        onDrop={e => onDrop(e, team.color)}>
                        <div className="team-header">
                          <div className="team-name" style={{color:TEAM_TEXT[team.color]}}>
                            {team.color} Team
                          </div>
                          <div style={{display:'flex',gap:6,alignItems:'center'}}>
                            <div className="team-avg">avg {teamAvg(team)}</div>
                            <div style={{fontSize:11,color:'#475569'}}>{team.players.length} players</div>
                          </div>
                        </div>
                        {team.players.map(p => (
                          <div key={p.name} className="team-player"
                            draggable onDragStart={() => onDragStart(p, team.color)}>
                            <div className="team-player-name">{p.name}</div>
                            {p.setter && <span className="team-player-setter">Setter</span>}
                            {gnFriendRequests.find(fr => fr.name===p.name || fr.with===p.name) && (
                              <span className="friend-badge">🤝</span>
                            )}
                            <div className="team-player-rating">{p.rating||'?'}</div>
                          </div>
                        ))}
                        <div className={`team-drop${dragOver===team.color?' over':''}`}>
                          Drop player here
                        </div>
                      </div>
                    ))}

                    {teams.length > 0 && (
                      <button className="pub-btn" onClick={saveTeams} style={{marginTop:8}}>
                        {teamsSaved ? '✓ Teams Saved!' : '💾 Confirm & Save Teams'}
                      </button>
                    )}

                    {teamSignups.length === 0 && (
                      <p style={{color:'#475569',fontSize:13,textAlign:'center',padding:'20px 0'}}>
                        No confirmed paid players yet for this session.
                      </p>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── LIST ── */}
            {adminView === 'list' && (
              <div className="lw">
                {!listSessionId ? (
                  <>
                    <div style={{fontSize:10,fontWeight:800,letterSpacing:3,textTransform:'uppercase',color:'#475569',marginBottom:12}}>View signups for…</div>
                    {sessions.length === 0 && <p style={{color:'#475569',fontSize:13}}>No open sessions.</p>}
                    {sessions.map(s => (
                      <button key={s.id} style={{width:'100%',textAlign:'left',background:'#1a2d6d',border:'1.5px solid #1e3a8a',borderRadius:10,padding:'12px 14px',marginBottom:8,cursor:'pointer',color:'#f1f5f9',transition:'border-color 0.2s'}}
                        onClick={() => setListSessionId(s.id)}>
                        <div style={{fontSize:14,fontWeight:700}}>{s.title}</div>
                        <div style={{fontSize:12,color:'#475569',marginTop:2}}>{formatDisplayDate(s.date)} · {s.location}</div>
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
                      <div>
                        <div style={{fontSize:17,fontWeight:800,color:'#f1f5f9'}}>{formatShortDate(listSess?.date)} · {signups.filter(s=>!isWaitlist(s.type)).length} signed up</div>
                        <div style={{fontSize:12,color:'#475569',marginTop:2,cursor:'pointer'}} onClick={() => setListSessionId(null)}>← Change session</div>
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button className="copy-btn" onClick={() => {
                          const unpaid = signups.filter(s=>s.paid==='No'&&!isWaitlist(s.type)&&s.host!=='Yes');
                          const text = unpaid.length ? `Outstanding payments:\n${unpaid.map(s=>`${s.name} — ${s.amount} AED`).join('\n')}` : 'All paid! ✓';
                          navigator.clipboard.writeText(text);
                          alert('Copied to clipboard!');
                        }}>💬 Copy Unpaid</button>
                        <button className="export-btn" onClick={() => {
                          const rows = ['Name,Type,Amount,Paid,Attended,Signed Up At',...signups.map(s=>`${s.name},${s.type},${s.amount},${s.paid},${s.attended},${s.signedUpAt}`)];
                          const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv'}));
                          a.download = `signups-${listSess?.date}.csv`; a.click();
                        }}>⬇ CSV</button>
                      </div>
                    </div>

                    {['Games Only','Training + Games','Training Only','Waitlist'].map(type => {
                      const group = signups.filter(s => s.type === type);
                      if (!group.length) return null;
                      return (
                        <div key={type} style={{marginBottom:16}}>
                          <div style={{fontSize:10,fontWeight:700,letterSpacing:2,textTransform:'uppercase',paddingBottom:6,borderBottom:'1px solid #1e3a8a',marginBottom:8,color:'#00d4c8'}}>{type} ({group.length})</div>
                          {group.map((s,i) => (
                            <div key={i} className="lr">
                              <span style={{fontSize:12,color:'#475569',width:16,textAlign:'right',flexShrink:0}}>{i+1}</span>
                              <div style={{flex:1}}>
                                <div className="lr-name">{s.name}</div>
                                <div className="lr-type">{s.signedUpAt}</div>
                              </div>
                              <span style={{fontSize:11,fontWeight:700,color:s.paid==='Yes'?'#4ade80':'#f87171',flexShrink:0}}>{s.paid==='Yes'?'✓ Paid':'✗ Unpaid'}</span>
                              <span style={{fontSize:11,fontWeight:700,color:s.attended==='Yes'?'#4ade80':'#f87171',flexShrink:0,marginLeft:4}}>{s.attended==='Yes'?'✓':'✗ NS'}</span>
                              <span style={{fontSize:11,color:'#475569',flexShrink:0,marginLeft:4}}>{s.amount} AED</span>
                              <button className="lr-del" onClick={async () => {
                                if (!window.confirm(`Remove ${s.name}?`)) return;
                                await fetch('/api/signup', {
                                  method:'POST', headers:{'Content-Type':'application/json'},
                                  body:JSON.stringify({action:'remove_signup',date:listSess.date,name:s.name,sessionTitle:listSess.title})
                                });
                                fetchSignups();
                              }}>✕</button>
                            </div>
                          ))}
                        </div>
                      );
                    })}

                    {signups.length === 0 && <div style={{textAlign:'center',color:'#334155',padding:'40px 0',fontSize:14}}>No signups yet.</div>}

                    {signups.length > 0 && (
                      <div className="total-bar">
                        <span style={{fontSize:13,color:'#64748b'}}>Expected total</span>
                        <span style={{fontSize:16,fontWeight:900,color:'#00d4c8'}}>
                          {signups.filter(s=>!isWaitlist(s.type)&&s.host!=='Yes').reduce((sum,s)=>sum+(parseFloat(s.amount)||0),0)} AED
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── HISTORY ── */}
            {adminView === 'history' && (
              <div className="lw">
                <div style={{fontSize:10,fontWeight:800,letterSpacing:3,textTransform:'uppercase',color:'#475569',marginBottom:12}}>Session History</div>

                {/* Filters */}
                <div className="hist-filters">
                  <input className="inp" placeholder="Search by player name…" value={histFilters.name}
                    onChange={e => setHistFilters(p=>({...p,name:e.target.value}))} />
                  <div style={{display:'flex',gap:8}}>
                    <select className="inp" value={histFilters.paid} onChange={e => setHistFilters(p=>({...p,paid:e.target.value}))}>
                      <option value="">All payments</option>
                      <option value="Yes">Paid</option>
                      <option value="No">Unpaid</option>
                    </select>
                    <select className="inp" value={histFilters.attended} onChange={e => setHistFilters(p=>({...p,attended:e.target.value}))}>
                      <option value="">All attendance</option>
                      <option value="Yes">Attended</option>
                      <option value="No">No-show</option>
                    </select>
                  </div>
                  <div style={{display:'flex',gap:8}}>
                    <input className="inp" type="date" placeholder="From" value={histFilters.from}
                      onChange={e => setHistFilters(p=>({...p,from:e.target.value}))} />
                    <input className="inp" type="date" placeholder="To" value={histFilters.to}
                      onChange={e => setHistFilters(p=>({...p,to:e.target.value}))} />
                  </div>
                  <button className="pub-btn" style={{marginTop:0}} onClick={loadHistory}>
                    🔍 Search
                  </button>
                </div>

                {histLoading && <p style={{color:'#475569',textAlign:'center',padding:'20px 0'}}>Loading…</p>}

                {!histSelected ? (
                  /* Session list */
                  histSessions.map(([date, sups]) => (
                    <div key={date} className="hist-session" onClick={() => { setHistSelected(date); setHistSignups(sups); }}>
                      <div className="hist-date">{date}</div>
                      <div className="hist-stats">
                        <span className="hist-stat">{sups.length} players</span>
                        <span className="hist-stat">{sups.filter(s=>s.paid==='Yes').length} paid</span>
                        <span className="hist-stat">{sups.filter(s=>s.attended==='No').length} no-shows</span>
                        <span className="hist-stat">{sups.reduce((a,s)=>a+(parseFloat(s.amount)||0),0)} AED</span>
                      </div>
                    </div>
                  ))
                ) : (
                  /* Session detail */
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:800,color:'#f1f5f9'}}>{histSelected}</div>
                        <div style={{fontSize:12,color:'#475569',cursor:'pointer',marginTop:2}} onClick={() => setHistSelected(null)}>← Back to list</div>
                      </div>
                    </div>

                    {histSignups.map((s,i) => (
                      <div key={i} className="lr" style={{flexDirection:'column',alignItems:'flex-start'}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,width:'100%'}}>
                          <div style={{flex:1}}>
                            <div className="lr-name">{s.name}</div>
                            <div className="lr-type">{s.type} · {s.amount} AED</div>
                          </div>
                          {/* Paid toggle */}
                          <button className={`gn-toggle ${s.paid==='Yes'?'paid-yes':'paid-no'}`}
                            onClick={async () => {
                              const newVal = s.paid==='Yes'?'No':'Yes';
                              await fetch('/api/signup', {
                                method:'POST', headers:{'Content-Type':'application/json'},
                                body:JSON.stringify({action:'update_signup',date:histSelected,name:s.name,field:'paid',value:newVal})
                              });
                              setHistSignups(prev => prev.map(p => p.name===s.name ? {...p,paid:newVal} : p));
                            }}>
                            {s.paid==='Yes'?'✓ Paid':'✗ Unpaid'}
                          </button>
                          {/* Attended toggle */}
                          <button className={`gn-toggle ${s.attended==='Yes'?'att-yes':'att-no'}`}
                            onClick={async () => {
                              const newVal = s.attended==='Yes'?'No':'Yes';
                              await fetch('/api/signup', {
                                method:'POST', headers:{'Content-Type':'application/json'},
                                body:JSON.stringify({action:'update_signup',date:histSelected,name:s.name,field:'attended',value:newVal})
                              });
                              setHistSignups(prev => prev.map(p => p.name===s.name ? {...p,attended:newVal} : p));
                            }}>
                            {s.attended==='Yes'?'✓ Here':'✗ NS'}
                          </button>
                        </div>
                      </div>
                    ))}

                    {histSignups.length === 0 && <p style={{color:'#475569',fontSize:13,textAlign:'center'}}>No players found.</p>}
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
