'use client';
import { useState, useEffect, useCallback } from 'react';

const ADMIN_PW    = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'OVC2026';
const WA_GROUP    = 'https://chat.whatsapp.com/GD7I8r3fnTNLAEN6s6q2b7';
const AANI_NUM    = '+971501986469';
const BANK_NAME   = 'Wio Bank';
const BANK_HOLDER = 'Keri Adonna Zeller';
const BANK_IBAN   = 'AE440860000006133847628';
const BANK_SWIFT  = 'WIOBAEADXXX';
const TEAM_COLORS = ['Blue','Black','White','Green','Yellow','Red'];
const LEVEL_MAP   = {'1':'Pro','2':'Advanced','3':'Intermediate','4':'Upper Beginner','5':'Beginner'};

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2,6); }

function fmtLong(d) {
  if (!d) return '';
  return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}

function within24h(sess) {
  if (!sess?.date || !sess?.time) return false;
  try {
    const [timePart, meridiem] = sess.time.split('–')[0].trim().split(' ');
    let [h, m] = timePart.split(':').map(Number);
    if (meridiem === 'PM' && h !== 12) h += 12;
    if (meridiem === 'AM' && h === 12) h = 0;
    const [yr, mo, dy] = sess.date.split('-').map(Number);
    const diff = new Date(yr, mo-1, dy, h, m||0) - Date.now();
    return diff >= 0 && diff <= 24*3600*1000;
  } catch { return false; }
}

const DEF = {
  id:'', title:'Volleyball Social Games', date:'', time:'8:00 PM – 10:00 PM',
  location:'ICS Khalidiya', mapUrl:'', hosts:'Keri', maxGames:18, maxTraining:0,
  notes:'', offerTraining:false, offerBoth:false, prices:{games:35,training:0,both:0},
};

const TEAM_COLOR_HEX = {
  Blue:'#3b82f6', Black:'#1e293b', White:'#94a3b8',
  Green:'#22c55e', Yellow:'#eab308', Red:'#ef4444',
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body,html{font-family:'Inter',sans-serif;background:#f1f5f9;color:#0f172a;min-height:100vh;}
input,select,textarea,button{font-family:'Inter',sans-serif;}
button{cursor:pointer;}
a{text-decoration:none;color:inherit;}

/* Nav */
.nav{display:flex;background:#0d1b5e;position:sticky;top:0;z-index:50;box-shadow:0 2px 12px rgba(13,27,94,.25);}
.nb{flex:1;padding:16px 4px;text-align:center;border:none;background:none;font-size:11px;font-weight:700;color:#94a3b8;border-bottom:3px solid transparent;margin-bottom:0;transition:all .2s;text-transform:uppercase;letter-spacing:.8px;}
.nb.on{color:#00d4c8;border-bottom-color:#00d4c8;}
.nav-badge{background:#00d4c8;color:#0d1b5e;font-size:10px;font-weight:800;border-radius:10px;padding:1px 7px;margin-left:4px;}

/* Layout */
.page{max-width:480px;margin:0 auto;}
.pad{padding:20px 16px;}

/* Inputs */
.inp{width:100%;background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;color:#0f172a;font-size:14px;padding:11px 13px;outline:none;transition:border-color .2s;-webkit-appearance:none;}
.inp:focus{border-color:#0d1b5e;}
.inp::placeholder{color:#94a3b8;}
select.inp option{color:#0f172a;}
textarea.inp{resize:vertical;}
.fl{margin-bottom:14px;}
.fl label,.lbl{display:block;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;}
.row2{display:flex;gap:12px;}.row2 .fl{flex:1;}
.row3{display:flex;gap:8px;}.row3 .fl{flex:1;}

/* Buttons */
.btn-primary{width:100%;background:#0d1b5e;color:#fff;border:none;border-radius:12px;font-size:15px;font-weight:700;padding:14px;transition:all .2s;letter-spacing:.2px;}
.btn-primary:hover{background:#1e3a8a;}
.btn-primary:disabled{opacity:.5;cursor:not-allowed;}
.btn-teal{background:#00d4c8;color:#0d1b5e;}
.btn-teal:hover{background:#00bfb3;}
.btn-outline{background:#fff;border:1.5px solid #e2e8f0;color:#475569;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:600;transition:all .2s;}
.btn-outline:hover{border-color:#0d1b5e;color:#0d1b5e;}
.btn-danger{background:#fff;border:1.5px solid #fecaca;color:#ef4444;border-radius:10px;padding:8px 16px;font-size:13px;font-weight:600;transition:all .2s;}
.btn-danger:hover{background:#fef2f2;}
.btn-ghost{background:none;border:none;color:#64748b;font-size:12px;font-weight:600;padding:4px 0;}

/* Cards */
.card{background:#fff;border-radius:14px;padding:16px;margin-bottom:12px;box-shadow:0 1px 4px rgba(0,0,0,.06),0 0 0 1px rgba(0,0,0,.04);}
.card-navy{box-shadow:none;background:#0d1b5e;color:#fff;}
.card-teal{box-shadow:none;background:#f0fdfc;border:1.5px solid #99f6e4;}

/* Section label */
.sec{font-size:10px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#0d1b5e;margin:20px 0 10px;}
.sec-line{border-top:2px solid #e2e8f0;padding-top:16px;}

/* Toggles */
.tog-row{display:flex;gap:10px;margin-bottom:12px;}
.tog{flex:1;display:flex;align-items:center;gap:8px;background:#fff;border-radius:10px;padding:11px 13px;border:1.5px solid #e2e8f0;transition:all .2s;cursor:pointer;}
.tog.on{border-color:#0d1b5e;background:#eff6ff;}
.tog span{font-size:13px;font-weight:600;color:#0f172a;}

/* Status pills */
.pill-green{display:inline-block;background:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:20px;font-size:11px;font-weight:700;padding:3px 10px;}
.pill-red{display:inline-block;background:#fef2f2;color:#dc2626;border:1px solid #fecaca;border-radius:20px;font-size:11px;font-weight:700;padding:3px 10px;}
.pill-amber{display:inline-block;background:#fffbeb;color:#d97706;border:1px solid #fde68a;border-radius:20px;font-size:11px;font-weight:700;padding:3px 10px;}
.pill-blue{display:inline-block;background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:20px;font-size:11px;font-weight:700;padding:3px 10px;}
.pill-navy{display:inline-block;background:#0d1b5e;color:#fff;border-radius:20px;font-size:12px;font-weight:700;padding:5px 16px;margin-top:10px;}
.pill-teal{display:inline-block;background:#0d1b5e22;color:#0d1b5e;border-radius:20px;font-size:10px;font-weight:700;padding:3px 10px;}

/* Alerts */
.alert-err{background:#fef2f2;border:1px solid #fecaca;color:#dc2626;border-radius:10px;padding:12px 14px;font-size:13px;margin-top:12px;font-weight:500;}
.alert-warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e;border-radius:10px;padding:12px 14px;font-size:13px;margin-bottom:14px;font-weight:500;}
.alert-info{background:#f0fdfc;border:1px solid #99f6e4;color:#134e4a;border-radius:10px;padding:12px 14px;font-size:13px;}

/* Banner */
.banner{background:#0d1b5e;padding:24px 20px 20px;position:relative;overflow:hidden;}
.banner-glow{position:absolute;width:200px;height:200px;background:#00d4c8;border-radius:50%;opacity:.06;top:-80px;right:-60px;pointer-events:none;}
.banner-tag{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:#00d4c8;font-weight:700;margin-bottom:6px;}
.banner-title{font-size:clamp(18px,5vw,26px);font-weight:900;color:#fff;line-height:1.15;margin-bottom:12px;}
.banner-row{font-size:13px;color:#94a3b8;display:flex;gap:8px;margin-bottom:4px;}
.banner-row a{color:#00d4c8;}

/* Spots */
.spots-bar{display:flex;background:#fff;border-bottom:1px solid #f1f5f9;}
.spot{flex:1;padding:14px 6px;text-align:center;border-right:1px solid #f1f5f9;}
.spot:last-child{border-right:none;}
.spot-n{font-size:24px;font-weight:900;line-height:1;}
.spot-l{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-top:3px;font-weight:600;}

/* Price row */
.price-bar{display:flex;background:#f8fafc;border-bottom:1px solid #f1f5f9;}
.pc{flex:1;padding:10px 4px;text-align:center;border-right:1px solid #f1f5f9;}
.pc:last-child{border-right:none;}
.pa{font-size:16px;font-weight:800;color:#0d1b5e;}
.pl{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-top:2px;font-weight:600;}

/* Type buttons */
.tbtn{width:100%;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;padding:14px 16px;text-align:left;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;transition:all .2s;box-shadow:0 1px 3px rgba(0,0,0,.04);}
.tbtn:hover:not([disabled]){border-color:#0d1b5e;}
.tbtn.sel{border-color:#0d1b5e;background:#eff6ff;box-shadow:0 0 0 3px rgba(13,27,94,.08);}
.tbtn[disabled]{opacity:.4;cursor:not-allowed;}
.tbtn.wait{border-color:#fecaca;}
.tbtn.wait.sel{background:#fef2f2;border-color:#ef4444;}
.tbtn-l{font-size:14px;font-weight:600;color:#0f172a;}
.tbtn-sub{font-size:11px;color:#94a3b8;margin-top:2px;}
.tbtn-price{font-size:17px;font-weight:800;color:#0d1b5e;}
.tbtn-price.red{color:#ef4444;}
.tbtn-psub{font-size:10px;color:#94a3b8;margin-top:1px;text-align:right;}

/* Suggestions */
.sugg-wrap{position:relative;margin-bottom:14px;}
.suggs{position:absolute;top:calc(100%+4px);left:0;right:0;background:#fff;border:1.5px solid #e2e8f0;border-radius:12px;z-index:100;overflow:hidden;box-shadow:0 8px 24px rgba(0,0,0,.1);}
.sugg{padding:11px 14px;font-size:14px;font-weight:500;color:#0f172a;transition:background .1s;border-bottom:1px solid #f8fafc;}
.sugg:last-child{border-bottom:none;}
.sugg:hover{background:#f8fafc;cursor:pointer;}

/* Success */
.succ{margin:20px 16px;background:#fff;border-radius:16px;padding:28px 20px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,.08);}
.succ-icon{font-size:48px;margin-bottom:12px;}
.succ-h{font-size:22px;font-weight:900;color:#0d1b5e;margin-bottom:6px;}
.succ-sub{font-size:14px;color:#64748b;line-height:1.6;}

/* Payment box */
.pay-box{margin:0 16px 16px;background:#fff;border-radius:14px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,.06);}
.pay-title{font-size:11px;font-weight:700;color:#0d1b5e;text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;}
.pay-m{padding-bottom:12px;margin-bottom:12px;border-bottom:1px solid #f1f5f9;}
.pay-m:last-child{padding-bottom:0;margin-bottom:0;border-bottom:none;}
.pay-mname{font-size:13px;font-weight:700;color:#0f172a;margin-bottom:4px;}
.pay-detail{font-size:13px;color:#64748b;line-height:1.8;}
.pay-detail strong{color:#0f172a;}

/* Policy box */
.policy{margin:0 16px 16px;background:#f8fafc;border-radius:12px;padding:14px 16px;font-size:13px;color:#475569;line-height:1.7;border:1px solid #e2e8f0;}
.policy strong{color:#0f172a;display:block;margin-bottom:6px;font-size:13px;}

/* Who list */
.who{padding:0 16px 16px;}
.who-hdr{font-size:11px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:#0d1b5e;margin:20px 0 14px;padding-top:18px;border-top:2px solid #f1f5f9;}
.who-lbl{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#64748b;margin-bottom:8px;}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;}
.chip{background:#fff;border:1px solid #e2e8f0;border-radius:20px;padding:6px 12px;font-size:13px;font-weight:500;color:#0f172a;display:flex;align-items:center;gap:6px;box-shadow:0 1px 2px rgba(0,0,0,.04);}
.chip-n{font-size:11px;color:#94a3b8;font-weight:600;}
.chip-del{background:none;border:none;color:#cbd5e1;font-size:13px;line-height:1;padding:0;transition:color .2s;}
.chip-del:hover{color:#ef4444;}
.chip-wait{border-color:#fecaca;background:#fef2f2;}

/* WhatsApp */
.wa{display:flex;align-items:center;gap:12px;margin:0 16px 16px;background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:14px 16px;transition:all .2s;box-shadow:0 1px 4px rgba(0,0,0,.04);}
.wa:hover{border-color:#25D366;box-shadow:0 2px 8px rgba(37,211,102,.1);}
.wa-txt{flex:1;font-size:13px;color:#64748b;}
.wa-txt strong{color:#0f172a;display:block;margin-bottom:1px;font-size:14px;}
.wa-arr{color:#25D366;font-size:18px;font-weight:700;}

/* Session picker */
.pick{background:#fff;border:1.5px solid #e2e8f0;border-radius:14px;padding:16px;margin-bottom:12px;transition:all .2s;box-shadow:0 1px 4px rgba(0,0,0,.05);}
.pick:hover{border-color:#0d1b5e;box-shadow:0 4px 16px rgba(13,27,94,.1);cursor:pointer;}
.pick-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:6px;}
.pick-title{font-size:16px;font-weight:800;color:#0f172a;flex:1;}
.pick-price{font-size:16px;font-weight:900;color:#0d1b5e;white-space:nowrap;}
.pick-meta{font-size:13px;color:#64748b;margin-top:4px;}
.pick-spots{display:flex;gap:8px;margin-top:12px;}
.psn{flex:1;background:#f8fafc;border-radius:10px;padding:8px;text-align:center;}
.psn-n{font-size:20px;font-weight:900;}
.psn-l{font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;font-weight:600;}

/* Back button */
.back-btn{background:none;border:none;color:#64748b;font-size:13px;font-weight:600;padding:0;margin-bottom:16px;display:flex;align-items:center;gap:6px;transition:color .2s;}
.back-btn:hover{color:#0d1b5e;}

/* Admin */
.atabs{display:flex;background:#0d1b5e;border-bottom:1px solid #1e3a8a;}
.atb{flex:1;padding:14px 4px;text-align:center;border:none;background:none;font-size:10px;font-weight:700;color:#475569;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .2s;text-transform:uppercase;letter-spacing:.5px;}
.atb.on{color:#00d4c8;border-bottom-color:#00d4c8;}

/* Game night / history rows */
.gn-row{background:#fff;border:1px solid #f1f5f9;border-radius:12px;margin-bottom:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04);}
.gn-top{display:flex;align-items:center;gap:8px;padding:12px 14px;}
.gn-info{flex:1;min-width:0;}
.gn-name{font-size:14px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.gn-sub{font-size:11px;color:#94a3b8;margin-top:2px;}
.tog-btn{font-size:11px;font-weight:700;padding:5px 10px;border-radius:20px;border:1.5px solid;background:none;white-space:nowrap;transition:all .2s;flex-shrink:0;}
.tog-btn.yes{color:#16a34a;border-color:#bbf7d0;background:#f0fdf4;}
.tog-btn.no{color:#dc2626;border-color:#fecaca;background:#fef2f2;}
.tog-btn.cash{color:#d97706;border-color:#fde68a;background:#fffbeb;}
.gn-expand{padding:12px 14px;border-top:1px solid #f1f5f9;background:#f8fafc;}
.rate-row{display:flex;align-items:center;gap:8px;margin-bottom:10px;}
.rate-row:last-child{margin-bottom:0;}
.rate-lbl{font-size:11px;font-weight:600;color:#64748b;width:52px;flex-shrink:0;}
.rbtns{display:flex;gap:5px;}
.rb{width:30px;height:30px;border-radius:8px;border:1.5px solid #e2e8f0;background:#fff;color:#94a3b8;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center;transition:all .2s;cursor:pointer;}
.rb:hover{border-color:#0d1b5e;color:#0d1b5e;}
.rb.on{background:#0d1b5e;border-color:#0d1b5e;color:#fff;}
.rb.setter-on{background:#f59e0b;border-color:#f59e0b;color:#fff;}
.rb-wide{width:auto;padding:0 12px;font-size:12px;}

/* Teams */
.team-card{background:#fff;border-radius:14px;padding:14px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,.06);}
.team-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:10px;border-bottom:2px solid #f1f5f9;}
.team-nm{font-size:15px;font-weight:800;}
.tstat{font-size:11px;color:#64748b;background:#f1f5f9;padding:4px 10px;border-radius:20px;font-weight:600;}
.tp{display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f8fafc;border-radius:8px;margin-bottom:4px;cursor:grab;border:1px solid #f1f5f9;transition:all .2s;}
.tp:hover{border-color:#e2e8f0;box-shadow:0 2px 6px rgba(0,0,0,.06);}
.tp:active{cursor:grabbing;opacity:.7;}
.tp-name{font-size:13px;font-weight:600;color:#0f172a;flex:1;}
.tp-r{font-size:11px;font-weight:800;width:24px;height:24px;border-radius:6px;background:#0d1b5e;display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;}
.tp-tag{font-size:10px;font-weight:600;padding:2px 7px;border-radius:8px;flex-shrink:0;}
.tp-setter{color:#d97706;background:#fef3c7;}
.tp-friend{color:#7c3aed;background:#ede9fe;}
.drop{min-height:36px;border:2px dashed #e2e8f0;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#cbd5e1;margin-top:4px;transition:all .2s;}
.drop.over{border-color:#0d1b5e;background:#eff6ff;color:#0d1b5e;}
.pool{background:#f8fafc;border-radius:12px;padding:12px;margin-bottom:12px;border:1px solid #e2e8f0;}
.pool-hdr{font-size:10px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;}
.n-sel{display:flex;gap:8px;margin-bottom:14px;}
.n-btn{flex:1;padding:10px;border-radius:10px;border:1.5px solid #e2e8f0;background:#fff;color:#64748b;font-weight:800;font-size:15px;transition:all .2s;box-shadow:0 1px 3px rgba(0,0,0,.04);}
.n-btn.on{border-color:#0d1b5e;background:#0d1b5e;color:#fff;}

/* History */
.hist-row{background:#fff;border:1px solid #f1f5f9;border-radius:12px;padding:14px 16px;margin-bottom:8px;transition:all .2s;box-shadow:0 1px 3px rgba(0,0,0,.04);}
.hist-row:hover{border-color:#0d1b5e;box-shadow:0 2px 8px rgba(13,27,94,.08);cursor:pointer;}
.hist-date{font-size:14px;font-weight:700;color:#0f172a;}
.hist-pills{display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;}
.hpill{font-size:11px;color:#64748b;background:#f1f5f9;padding:3px 10px;border-radius:20px;font-weight:600;}

/* Total bar */
.total-bar{padding:14px 16px;background:#0d1b5e;border-radius:12px;display:flex;justify-content:space-between;align-items:center;margin-top:16px;}

/* Copy button */
.copy-btn{background:#f0fdfc;border:1.5px solid #99f6e4;color:#0d9488;font-size:13px;font-weight:600;padding:9px 14px;border-radius:10px;transition:all .2s;}
.copy-btn:hover{background:#ccfbf1;}

/* Empty */
.empty{text-align:center;padding:60px 20px;color:#94a3b8;}
.empty-icon{font-size:48px;margin-bottom:14px;}
.empty-title{font-size:16px;font-weight:700;color:#64748b;margin-bottom:6px;}
.empty-sub{font-size:13px;}

/* Lock */
.lock{max-width:320px;margin:80px auto;padding:0 20px;text-align:center;}
.lock-card{background:#fff;border-radius:20px;padding:32px 24px;box-shadow:0 4px 24px rgba(0,0,0,.08);}
.lock-title{font-size:24px;font-weight:900;color:#0d1b5e;margin-bottom:6px;}
.lock-sub{font-size:13px;color:#64748b;margin-bottom:24px;}
`;

export default function App() {
  const [view, setView]   = useState('signup');
  const [av, setAv]       = useState('setup');
  const [sessions, setSessions] = useState([]);
  const [players, setPlayers]   = useState([]);
  const [selId, setSelId] = useState(null);
  const [signups, setSignups] = useState([]);
  const [counts, setCounts]   = useState({});

  // Sign up
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
  const [draft, setDraft]     = useState({...DEF, id:genId()});
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
  const [histGroups, setHistGroups] = useState([]);
  const [histSel, setHistSel]       = useState(null);
  const [histRows, setHistRows]     = useState([]);
  const [histF, setHistF]           = useState({name:'',paid:'',attended:'',from:'',to:''});
  const [histLoading, setHistLoading] = useState(false);
  const [histSearched, setHistSearched] = useState(false);

  const sess = selId ? sessions.find(s=>s.id===selId)||null : null;

  // ── Load ─────────────────────────────────────────────────────
  const loadAll = useCallback(() => {
    fetch('/api/signup').then(r=>r.json()).then(d=>{
      setPlayers(d.players||[]);
      const loaded = d.sessions||[];
      setSessions(loaded);
      Promise.all(loaded.map(s=>
        s.date
          ? fetch(`/api/session?date=${encodeURIComponent(s.date)}`).then(r=>r.json())
              .then(data=>({id:s.id, count:(data.signups||[]).filter(p=>p.type!=='Waitlist').length}))
              .catch(()=>({id:s.id,count:0}))
          : Promise.resolve({id:s.id,count:0})
      )).then(res=>{
        const c={};
        res.forEach(r=>{c[r.id]=r.count;});
        setCounts(c);
      });
    }).catch(()=>{});
  },[]);

  useEffect(()=>{loadAll();},[loadAll]);

  // ── Fetch signups ────────────────────────────────────────────
  const fetchSignups = useCallback(()=>{
    if(!sess?.date) return;
    fetch(`/api/session?date=${encodeURIComponent(sess.date)}`)
      .then(r=>r.json()).then(d=>setSignups(d.signups||[])).catch(()=>{});
  },[sess?.date]);

  useEffect(()=>{
    setSignups([]);
    if(sess?.date) fetchSignups();
    const iv=setInterval(fetchSignups,15000);
    return()=>clearInterval(iv);
  },[fetchSignups]);

  // ── Spots ────────────────────────────────────────────────────
  const confirmed  = signups.filter(s=>s.type!=='Waitlist');
  const waitlisted = signups.filter(s=>s.type==='Waitlist');
  const gamesLeft  = sess ? Math.max(0, sess.maxGames-confirmed.filter(s=>s.type!=='Training Only').length) : 0;
  const trainLeft  = sess ? Math.max(0,(sess.maxTraining||0)-confirmed.filter(s=>s.type==='Training Only'||s.type==='Training + Games').length) : 0;

  function getAmt(type){
    if(!sess) return 0;
    if(type==='Games Only') return sess.prices.games||35;
    if(type==='Training Only') return sess.prices.training||0;
    if(type==='Training + Games') return sess.prices.both||0;
    return 0;
  }

  const typeOpts = sess ? [
    {key:'Training Only',    price:sess.prices.training||0,  show:sess.offerTraining,                 full:trainLeft<=0, wait:false},
    {key:'Games Only',       price:sess.prices.games||35,    show:true,                               full:gamesLeft<=0, wait:false},
    {key:'Training + Games', price:sess.prices.both||0,      show:sess.offerTraining&&sess.offerBoth, full:trainLeft<=0||gamesLeft<=0, wait:false},
    {key:'Waitlist',         price:sess.prices.games||35,    show:gamesLeft<=0,                       full:false,        wait:true},
  ].filter(o=>o.show) : [];

  const suggs = showSuggs && form.name.trim().length>1
    ? players.filter(p=>p.name.toLowerCase().startsWith(form.name.trim().toLowerCase())
        && !signups.find(s=>s.name.toLowerCase()===p.name.toLowerCase())).slice(0,6)
    : [];

  // ── Signup ───────────────────────────────────────────────────
  const doSignup = async()=>{
    const name=form.name.trim();
    if(!name){setFormErr('Please enter your name.');return;}
    if(!form.type){setFormErr("Please select what you're joining for.");return;}
    if(signups.find(s=>s.name.toLowerCase()===name.toLowerCase())){
      setFormErr("This name is already on the list. If you're a different person with the same name, please add an initial (e.g. 'Sara M').");
      return;
    }
    setLoading(true); setFormErr('');
    try{
      const isNew=!players.find(p=>p.name.toLowerCase()===name.toLowerCase());
      const res=await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'signup',date:sess.date,name,type:form.type,amount:getAmt(form.type),isNew,friend:form.friend.trim()})});
      const d=await res.json();
      if(d.error==='duplicate'){setFormErr("This name is already signed up. If you have the same name as another player, please add an initial.");return;}
      if(d.error==='strike_block'){setFormErr(`You have ${d.strikes} no-shows in the last 3 months and can only join the waitlist.`);return;}
      if(!res.ok){setFormErr('Something went wrong. Please try again.');return;}
      setStrikes(d.strikes||0);
      setSubmitted(true);
      fetchSignups(); loadAll();
    }finally{setLoading(false);}
  };

  // ── Remove ───────────────────────────────────────────────────
  const doRemove = async(name,session)=>{
    if(!confirm(`Remove ${name} from the list?`)) return;
    await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'remove',date:session.date,name,title:session.title,late:within24h(session)})});
    fetchSignups(); loadAll();
  };

  // ── Publish ──────────────────────────────────────────────────
  const doPublish = async()=>{
    if(!draft.date){alert('Please set a date.');return;}
    setSaving(true);
    try{
      await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'publish',session:draft})});
      loadAll();
      setDraft({...DEF,id:genId()}); setEditId(null);
      alert('Session published!');
    }finally{setSaving(false);}
  };

  const doClose=async(id)=>{
    if(!confirm('Close this session?')) return;
    await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'close',sessionId:id})});
    loadAll();
    if(selId===id) setSelId(null);
    if(gnSess?.id===id) setGnSess(null);
    if(tmSess?.id===id) setTmSess(null);
  };

  // ── Game Night ───────────────────────────────────────────────
  const loadGn=useCallback(async(s)=>{
    if(!s) return;
    const res=await fetch(`/api/session?date=${encodeURIComponent(s.date)}`);
    const d=await res.json();
    setGnList(d.signups||[]);
    setGnFriends(d.friendRequests||[]);
  },[]);

  useEffect(()=>{if(gnSess) loadGn(gnSess);},[gnSess,loadGn]);

  const gnToggle=async(name,field,val)=>{
    const key=`${name}_${field}`;
    setGnBusy(p=>({...p,[key]:true}));
    setGnList(prev=>prev.map(s=>s.name===name?{...s,[field]:val}:s));
    await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'update_signup',date:gnSess.date,name,field,value:val})});
    setGnBusy(p=>{const n={...p};delete n[key];return n;});
  };

  const gnRate=async(name,field,val)=>{
    const key=`${name}_${field}`;
    setGnBusy(p=>({...p,[key]:true}));
    setPlayers(prev=>prev.map(p=>p.name===name?{...p,[field]:val}:p));
    await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'rate_player',name,field,value:val})});
    setGnBusy(p=>{const n={...p};delete n[key];return n;});
  };

  // ── Mark host ────────────────────────────────────────────────
  const markHost = async (name, isHost) => {
    setGnBusy(p => ({...p, [`${name}_host`]: true}));
    setGnList(prev => prev.map(s => s.name === name
      ? {...s, host: isHost ? 'Yes' : 'No', paid: isHost ? 'Yes' : s.paid, amount: isHost ? 0 : s.amount}
      : s));
    await fetch('/api/signup', {
      method: 'POST', headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({action: 'mark_host', date: gnSess.date, name, isHost}),
    });
    setGnBusy(p => { const n={...p}; delete n[`${name}_host`]; return n; });
  };

  // ── Teams ────────────────────────────────────────────────────
  const loadTm=useCallback(async(s)=>{
    if(!s) return;
    const res=await fetch(`/api/session?date=${encodeURIComponent(s.date)}`);
    const d=await res.json();
    setTmFriends(d.friendRequests||[]);
    // Include paid, cash, and hosts — exclude waitlist and training only
    const eligible=(d.signups||[]).filter(p=>p.type!=='Waitlist'&&p.type!=='Training Only'&&(p.paid==='Yes'||p.paid==='Cash'||p.host==='Yes'));
    const enriched=eligible.map(p=>{
      const pl=players.find(pp=>pp.name.toLowerCase()===p.name.toLowerCase());
      return{...p,rating:pl?.rating||p.rating||'',setter:pl?.setter==='Setter',attack:pl?.attack||'',receive:pl?.receive||'',gender:pl?.gender||''};
    });
    setTmPool(enriched); setTmTeams([]); setTmSaved(false);
  },[players]);

  useEffect(()=>{if(tmSess) loadTm(tmSess);},[tmSess,loadTm]);

  const autoBalance=()=>{
    const n=tmCount;
    const colors=TEAM_COLORS.slice(0,n);
    const sorted=[...tmPool].sort((a,b)=>{
      if(a.setter&&!b.setter) return -1;
      if(!a.setter&&b.setter) return 1;
      return(parseInt(a.rating)||99)-(parseInt(b.rating)||99);
    });
    const processed=new Set();
    const ordered=[];
    for(const p of sorted){
      if(processed.has(p.name)) continue;
      processed.add(p.name); ordered.push(p);
      const fr=tmFriends.find(f=>f.name===p.name);
      if(fr){
        const buddy=sorted.find(pp=>pp.name===fr.with&&!processed.has(pp.name));
        if(buddy){processed.add(buddy.name);ordered.push(buddy);}
      }
    }
    const teams=colors.map(c=>({color:c,players:[]}));
    let dir=1,ti=0;
    for(const p of ordered){
      teams[ti].players.push(p);
      ti+=dir;
      if(ti>=n){ti=n-1;dir=-1;}
      else if(ti<0){ti=0;dir=1;}
    }
    setTmTeams(teams); setTmPool([]);
  };

  const teamAvg=t=>{
    const rs=t.players.map(p=>parseInt(p.rating)).filter(r=>!isNaN(r));
    return rs.length?(rs.reduce((a,b)=>a+b,0)/rs.length).toFixed(1):'—';
  };

  const onDragStart=(p,from)=>setTmDrag({p,from});
  const onDragOver=(e,to)=>{e.preventDefault();setTmOver(to);};
  const onDrop=(e,to)=>{
    e.preventDefault();
    if(!tmDrag||tmDrag.from===to){setTmOver(null);return;}
    const{p,from}=tmDrag;
    if(from==='pool') setTmPool(prev=>prev.filter(x=>x.name!==p.name));
    else setTmTeams(prev=>prev.map(t=>t.color===from?{...t,players:t.players.filter(x=>x.name!==p.name)}:t));
    if(to==='pool') setTmPool(prev=>[...prev,p]);
    else setTmTeams(prev=>prev.map(t=>t.color===to?{...t,players:[...t.players,p]}:t));
    setTmDrag(null); setTmOver(null);
  };

  const saveTm=async()=>{
    await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({action:'save_teams',date:tmSess.date,teams:tmTeams,title:tmSess.title})});
    setTmSaved(true);
  };

  // ── History ──────────────────────────────────────────────────
  const loadHist=useCallback(async()=>{
    setHistLoading(true); setHistSearched(true);
    try{
      const p=new URLSearchParams();
      if(histF.name) p.set('name',histF.name);
      if(histF.paid) p.set('paid',histF.paid);
      if(histF.attended) p.set('attended',histF.attended);
      if(histF.from) p.set('from',histF.from);
      if(histF.to) p.set('to',histF.to);
      const res=await fetch(`/api/session?${p}&limit=2000`);
      const d=await res.json();
      const groups={};
      for(const s of(d.signups||[])){
        if(!groups[s.date]) groups[s.date]=[];
        groups[s.date].push(s);
      }
      const parse=str=>{
        const months={Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
        const m=str.match(/(\d+)\s+(\w+)\s+(\d+)/);
        return m?new Date(m[3],months[m[2]],m[1]):new Date(0);
      };
      setHistGroups(Object.entries(groups).sort((a,b)=>parse(b[0])-parse(a[0])));
    }finally{setHistLoading(false);}
  },[histF]);

  // ── Who list component ───────────────────────────────────────
  const WhoList=({session,list,isAdmin=false})=>{
    const locked=within24h(session);
    const main=list.filter(s=>s.type!=='Waitlist');
    const wait=list.filter(s=>s.type==='Waitlist');
    return(
      <div className="who">
        <div className="who-hdr">
          Who's Joining · {main.length} player{main.length!==1?'s':''}
          {wait.length>0&&<span style={{color:'#ef4444',marginLeft:6}}>· {wait.length} waitlist</span>}
        </div>
        {['Games Only','Training + Games','Training Only'].map(type=>{
          const g=main.filter(s=>s.type===type);
          if(!g.length) return null;
          return(
            <div key={type}>
              <div className="who-lbl">{type}</div>
              <div className="chips">
                {g.map((s,i)=>(
                  <div key={i} className="chip">
                    <span className="chip-n">{i+1}</span>
                    {s.name}
                    {(isAdmin||!locked)
                      ? <button className="chip-del" onClick={()=>doRemove(s.name,session)}>✕</button>
                      : <span style={{fontSize:11,color:'#cbd5e1',marginLeft:2}}>🔒</span>
                    }
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {wait.length>0&&(
          <div>
            <div className="who-lbl" style={{color:'#ef4444'}}>Waitlist</div>
            <div className="chips">
              {wait.map((s,i)=>(
                <div key={i} className="chip chip-wait">
                  <span className="chip-n">{i+1}</span>
                  {s.name}
                  {(isAdmin||!locked)
                    ? <button className="chip-del" onClick={()=>doRemove(s.name,session)}>✕</button>
                    : <span style={{fontSize:11,color:'#fca5a5',marginLeft:2}}>🔒</span>
                  }
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Rating panel ─────────────────────────────────────────────
  const RatePanel=({s,histDate})=>{
    const pl=players.find(p=>p.name.toLowerCase()===s.name.toLowerCase());
    const date=histDate||gnSess?.date;
    const prefix=histDate?`hist_${s.name}`:s.name;
    return(
      <div className="gn-expand">
        <div className="rate-row">
          <span className="rate-lbl">Rating</span>
          <div className="rbtns">
            {[1,2,3,4,5].map(n=>(
              <button key={n} className={`rb${(pl?.rating||s.rating)===String(n)?' on':''}`}
                onClick={()=>{gnRate(s.name,'rating',String(n));if(histDate) setHistRows(prev=>prev.map(r=>r.name===s.name?{...r,rating:String(n)}:r));}}>
                {gnBusy[`${s.name}_rating`]?'…':n}
              </button>
            ))}
          </div>
          <span style={{fontSize:11,color:'#94a3b8',marginLeft:4}}>{LEVEL_MAP[pl?.rating]||''}</span>
        </div>
        <div className="rate-row">
          <span className="rate-lbl">Attack</span>
          <div className="rbtns">{[1,2,3,4,5].map(n=><button key={n} className={`rb${pl?.attack===String(n)?' on':''}`} onClick={()=>gnRate(s.name,'attack',String(n))}>{n}</button>)}</div>
        </div>
        <div className="rate-row">
          <span className="rate-lbl">Receive</span>
          <div className="rbtns">{[1,2,3,4,5].map(n=><button key={n} className={`rb${pl?.receive===String(n)?' on':''}`} onClick={()=>gnRate(s.name,'receive',String(n))}>{n}</button>)}</div>
        </div>
        <div className="rate-row">
          <span className="rate-lbl">Setter</span>
          <div className="rbtns">
            <button className={`rb rb-wide${pl?.setter==='Setter'?' setter-on':''}`}
              onClick={()=>gnRate(s.name,'setter',pl?.setter==='Setter'?'':'Setter')}>
              {pl?.setter==='Setter'?'✓ Setter':'Setter'}
            </button>
          </div>
        </div>
        {!histDate && (
          <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid #f1f5f9'}}>
            <button
              onClick={()=>markHost(s.name, s.host!=='Yes')}
              style={{
                width:'100%', padding:'9px', borderRadius:10, border:'1.5px solid',
                fontSize:13, fontWeight:700, cursor:'pointer', transition:'all .2s',
                borderColor: s.host==='Yes' ? '#bbf7d0' : '#e2e8f0',
                background:  s.host==='Yes' ? '#f0fdf4'  : '#fff',
                color:       s.host==='Yes' ? '#16a34a'  : '#64748b',
              }}>
              {gnBusy[`${s.name}_host`] ? '…' : s.host==='Yes' ? '✓ Host (tap to remove)' : 'Mark as Host'}
            </button>
            {s.host==='Yes' && <div style={{fontSize:11,color:'#94a3b8',textAlign:'center',marginTop:4}}>Host — no payment required</div>}
          </div>
        )}
      </div>
    );
  };

  return(
    <div style={{minHeight:'100vh',background:'#f1f5f9',color:'#0f172a'}}>
      <style>{CSS}</style>

      {/* Nav */}
      <div className="nav">
        <button className={`nb${view==='signup'?' on':''}`} onClick={()=>setView('signup')}>
          🏐 Sign Up
          {sessions.length>0&&<span className="nav-badge">{sessions.length}</span>}
        </button>
        <button className={`nb${view==='admin'?' on':''}`} onClick={()=>setView('admin')}>
          🔒 Admin
        </button>
      </div>

      {/* ══ SIGN UP ══ */}
      {view==='signup'&&(
        <div className="page">
          {sessions.length===0?(
            <>
              <div className="empty">
                <div className="empty-icon">🏐</div>
                <div className="empty-title">No sessions open yet</div>
                <div className="empty-sub">Check back soon or join our WhatsApp group for updates.</div>
              </div>
              <a href={WA_GROUP} target="_blank" rel="noreferrer" className="wa">
                <span style={{fontSize:24}}>💬</span>
                <div className="wa-txt"><strong>Join our WhatsApp group</strong>Be the first to know about upcoming sessions</div>
                <span className="wa-arr">→</span>
              </a>
            </>
          ):!selId?(
            <div className="pad">
              <div className="sec sec-line" style={{marginTop:4}}>Upcoming Sessions</div>
              {sessions.map(s=>{
                const pl=s.offerTraining?`${s.prices.training}–${s.prices.both} AED`:`${s.prices.games||35} AED`;
                const rem=Math.max(0,s.maxGames-(counts[s.id]||0));
                return(
                  <div key={s.id} className="pick" onClick={()=>{setSelId(s.id);setSubmitted(false);setForm({name:'',type:'',friend:''});setFormErr('');}}>
                    <div className="pick-head">
                      <div className="pick-title">{s.title}</div>
                      <div className="pick-price">{pl}</div>
                    </div>
                    <div className="pick-meta">📅 {fmtLong(s.date)}</div>
                    <div className="pick-meta">⏰ {s.time} · 📍 {s.location}</div>
                    <div className="pick-meta" style={{marginTop:4}}>👋 Hosted by {s.hosts}</div>
                    <div className="pick-spots">
                      <div className="psn">
                        <div className="psn-n" style={{color:rem===0?'#ef4444':rem<=5?'#f59e0b':'#16a34a'}}>{rem}</div>
                        <div className="psn-l">spots left</div>
                      </div>
                      <div className="psn">
                        <div className="psn-n" style={{color:'#0d1b5e'}}>{counts[s.id]||0}</div>
                        <div className="psn-l">signed up</div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <a href={WA_GROUP} target="_blank" rel="noreferrer" className="wa" style={{marginTop:4}}>
                <span style={{fontSize:24}}>💬</span>
                <div className="wa-txt"><strong>Join our WhatsApp group</strong>Stay updated on upcoming sessions</div>
                <span className="wa-arr">→</span>
              </a>
            </div>
          ):sess?(
            <>
              <div className="banner">
                <div className="banner-glow"/>
                <button className="back-btn" style={{color:'#94a3b8',marginBottom:14}} onClick={()=>{setSelId(null);setSubmitted(false);}}>
                  ← Back to sessions
                </button>
                <div className="banner-tag">Oasis Volleyball Club · Abu Dhabi</div>
                <div className="banner-title">{sess.title}</div>
                <div className="banner-row">📅 {fmtLong(sess.date)}</div>
                <div className="banner-row">⏰ {sess.time}</div>
                <div className="banner-row">
                  📍 {sess.mapUrl
                    ? <a href={sess.mapUrl} target="_blank" rel="noreferrer">{sess.location}</a>
                    : sess.location}
                </div>
                <div className="banner-row">👋 {sess.hosts}</div>
                {sess.notes&&<div className="banner-row" style={{fontSize:12,color:'#64748b',marginTop:4}}>ℹ️ {sess.notes}</div>}
              </div>

              <div className="spots-bar">
                {sess.offerTraining&&(
                  <div className="spot">
                    <div className="spot-n" style={{color:trainLeft===0?'#ef4444':trainLeft<=3?'#f59e0b':'#16a34a'}}>{trainLeft}</div>
                    <div className="spot-l">Training</div>
                  </div>
                )}
                <div className="spot">
                  <div className="spot-n" style={{color:gamesLeft===0?'#ef4444':gamesLeft<=5?'#f59e0b':'#16a34a'}}>{gamesLeft}</div>
                  <div className="spot-l">Spots left</div>
                </div>
                <div className="spot">
                  <div className="spot-n" style={{color:'#0d1b5e'}}>{confirmed.length}</div>
                  <div className="spot-l">Signed up</div>
                </div>
                {waitlisted.length>0&&(
                  <div className="spot">
                    <div className="spot-n" style={{color:'#ef4444'}}>{waitlisted.length}</div>
                    <div className="spot-l">Waitlist</div>
                  </div>
                )}
              </div>

              <div className="price-bar">
                {sess.offerTraining&&<div className="pc"><div className="pa">{sess.prices.training} AED</div><div className="pl">Training</div></div>}
                <div className="pc"><div className="pa">{sess.prices.games||35} AED</div><div className="pl">Games</div></div>
                {sess.offerTraining&&sess.offerBoth&&<div className="pc"><div className="pa">{sess.prices.both} AED</div><div className="pl">Both</div></div>}
              </div>

              {submitted?(
                <>
                  <div className="succ">
                    <div className="succ-icon">{form.type==='Waitlist'?'📋':'🎉'}</div>
                    <div className="succ-h">{form.type==='Waitlist'?"You're on the waitlist!":"You're in!"}</div>
                    <div className="succ-sub">
                      {form.type==='Waitlist'
                        ? `We'll let you know if a spot opens, ${form.name}!`
                        : `See you on the court, ${form.name}! Please pay within 24 hours to hold your spot.`}
                    </div>
                    {form.type!=='Waitlist'&&<div className="pill-navy">{form.type} · {getAmt(form.type)} AED</div>}
                    {strikes>0&&<div className="alert-warn" style={{marginTop:12,textAlign:'left'}}>⚠️ You have {strikes} no-show{strikes>1?'s':''} in the last 3 months. Please attend or cancel in advance.</div>}
                    <button onClick={()=>{setSubmitted(false);setForm({name:'',type:'',friend:''}); }}
                      style={{marginTop:16,background:'none',border:'1.5px solid #e2e8f0',color:'#64748b',borderRadius:10,padding:'8px 16px',fontSize:13,fontWeight:600}}>
                      Sign up another player
                    </button>
                  </div>

                  {form.type!=='Waitlist'&&(
                    <div className="pay-box">
                      <div className="pay-title">💳 Payment — {getAmt(form.type)} AED</div>
                      <div className="pay-m">
                        <div className="pay-mname">Aani (instant · free)</div>
                        <div className="pay-detail">Open your banking app → Payments → Aani<br/>Send to: <strong>{AANI_NUM}</strong></div>
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
                      <div style={{fontSize:12,color:'#94a3b8',marginTop:10,lineHeight:1.5}}>
                        Payment must be received within 24 hours to hold your spot.
                      </div>
                    </div>
                  )}

                  <div className="policy">
                    <strong>Cancellation Policy</strong>
                    Payments must be made 24 hours in advance, or you will be moved to the waitlist. If you cancel less than 24 hours before the session, you are still required to pay for the session or find a replacement for your spot. Multiple late cancellations or no-shows will result in being placed on the waitlist for future sessions.
                  </div>

                  <WhoList session={sess} list={signups}/>
                </>
              ):(
                <div className="pad">
                  <div className="fl">
                    <label className="lbl">Your Name</label>
                    <div className="sugg-wrap">
                      <input className="inp" placeholder="Enter your name…" value={form.name}
                        onChange={e=>{setForm(p=>({...p,name:e.target.value}));setFormErr('');setShowSuggs(true);}}
                        onFocus={()=>setShowSuggs(true)}
                        onBlur={()=>setTimeout(()=>setShowSuggs(false),300)}
                        autoComplete="off"/>
                      {suggs.length>0&&(
                        <div className="suggs">
                          {suggs.map(p=><div key={p.name} className="sugg" onClick={()=>{setForm(f=>({...f,name:p.name}));setShowSuggs(false);}}>{p.name}</div>)}
                        </div>
                      )}
                    </div>
                  </div>

                  <label className="lbl">I'm joining for…</label>
                  {typeOpts.map(o=>(
                    <button key={o.key} className={`tbtn${form.type===o.key?' sel':''}${o.wait?' wait':''}`}
                      disabled={o.full} onClick={()=>setForm(p=>({...p,type:o.key}))}>
                      <div>
                        <div className="tbtn-l">
                          {o.wait?'📋 Join Waitlist':o.key}
                          {o.full&&<span style={{fontSize:11,color:'#ef4444',marginLeft:8,fontWeight:700}}>FULL</span>}
                        </div>
                        {o.wait&&<div className="tbtn-sub">Only payable if your spot is confirmed</div>}
                      </div>
                      <div>
                        <div className={`tbtn-price${o.wait?' red':''}`}>{o.price} AED</div>
                        {o.wait&&<div className="tbtn-psub">if confirmed</div>}
                      </div>
                    </button>
                  ))}

                  <div style={{marginBottom:16}}>
                    <button className="btn-ghost" onClick={()=>setShowFriend(p=>!p)}>
                      {showFriend?'▲ Hide':'+ Playing with someone?'}
                    </button>
                    {showFriend&&(
                      <div style={{marginTop:8}}>
                        <input className="inp" placeholder="Who are you hoping to play with?" value={form.friend}
                          onChange={e=>setForm(p=>({...p,friend:e.target.value}))}/>
                        <div style={{fontSize:12,color:'#94a3b8',marginTop:5}}>We'll do our best to put you on the same team.</div>
                      </div>
                    )}
                  </div>

                  <button className="btn-primary btn-teal" onClick={doSignup} disabled={loading}>
                    {loading?'Signing up…':'Sign Me Up →'}
                  </button>
                  {formErr&&<div className="alert-err">⚠️ {formErr}</div>}

                  {signups.length>0&&(
                    <>
                      <div className="policy" style={{marginTop:16}}>
                        <strong>Cancellation Policy</strong>
                        Payments must be made 24 hours in advance, or you will be moved to the waitlist. If you cancel less than 24 hours before the session, you are still required to pay for the session or find a replacement for your spot. Multiple late cancellations or no-shows will result in being placed on the waitlist for future sessions.
                      </div>
                      <WhoList session={sess} list={signups}/>
                    </>
                  )}
                </div>
              )}
              <a href={WA_GROUP} target="_blank" rel="noreferrer" className="wa" style={{margin:'0 16px 24px'}}>
                <span style={{fontSize:24}}>💬</span>
                <div className="wa-txt"><strong>Not in our WhatsApp group?</strong>Join to stay updated</div>
                <span className="wa-arr">→</span>
              </a>
            </>
          ):null}
        </div>
      )}

      {/* ══ ADMIN ══ */}
      {view==='admin'&&(
        !adminOk?(
          <div className="lock">
            <div className="lock-card">
              <div style={{fontSize:40,marginBottom:12}}>🔒</div>
              <div className="lock-title">Admin</div>
              <div className="lock-sub">Enter your password to continue</div>
              <input className="inp" type="password" placeholder="Password…" value={pw}
                onChange={e=>setPw(e.target.value)}
                onKeyDown={e=>e.key==='Enter'&&pw===ADMIN_PW&&setAdminOk(true)}
                style={{marginBottom:12}}/>
              <button className="btn-primary" onClick={()=>pw===ADMIN_PW?setAdminOk(true):alert('Wrong password')}>
                Unlock
              </button>
            </div>
          </div>
        ):(
          <>
            <div className="atabs">
              <button className={`atb${av==='setup'?' on':''}`}   onClick={()=>setAv('setup')}>⚙️ Setup</button>
              <button className={`atb${av==='night'?' on':''}`}   onClick={()=>setAv('night')}>🎮 On Night</button>
              <button className={`atb${av==='teams'?' on':''}`}   onClick={()=>setAv('teams')}>👥 Teams</button>
              <button className={`atb${av==='history'?' on':''}`} onClick={()=>{setAv('history');if(!histSearched)loadHist();}}>📅 History</button>
            </div>

            {/* ── SETUP ── */}
            {av==='setup'&&(
              <div className="pad">
                {sessions.length>0&&(
                  <>
                    <div className="sec sec-line" style={{marginTop:4}}>Open Sessions</div>
                    {sessions.map(s=>(
                      <div key={s.id} className="card">
                        <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:3}}>{s.title}</div>
                        <div style={{fontSize:13,color:'#64748b',marginBottom:10}}>{fmtLong(s.date)} · {s.location}</div>
                        <div style={{fontSize:13,color:'#64748b',marginBottom:10}}>{s.maxGames} spots · {s.prices.games||35} AED · Hosts: {s.hosts}</div>
                        <div style={{display:'flex',gap:8}}>
                          <button className="btn-outline" onClick={()=>{setDraft({...s});setEditId(s.id);}}>Edit</button>
                          <button className="btn-danger" onClick={()=>doClose(s.id)}>Close</button>
                        </div>
                      </div>
                    ))}
                  </>
                )}

                <div className="sec sec-line" style={{marginTop:sessions.length>0?4:4}}>{editId?'Edit Session':'New Session'}</div>
                <div className="fl"><label>Session Title</label>
                  <input className="inp" value={draft.title} onChange={e=>setDraft(p=>({...p,title:e.target.value}))}/>
                </div>
                <div className="row2">
                  <div className="fl"><label>Date</label>
                    <input className="inp" type="date" value={draft.date} onChange={e=>setDraft(p=>({...p,date:e.target.value}))}/>
                  </div>
                  <div className="fl"><label>Time</label>
                    <input className="inp" value={draft.time} onChange={e=>setDraft(p=>({...p,time:e.target.value}))}/>
                  </div>
                </div>
                <div className="fl"><label>Location</label>
                  <input className="inp" value={draft.location} onChange={e=>setDraft(p=>({...p,location:e.target.value}))}/>
                </div>
                <div className="fl"><label>Google Maps Link (optional)</label>
                  <input className="inp" placeholder="https://maps.app.goo.gl/…" value={draft.mapUrl} onChange={e=>setDraft(p=>({...p,mapUrl:e.target.value}))}/>
                </div>
                <div className="fl"><label>Hosts</label>
                  <input className="inp" value={draft.hosts} onChange={e=>setDraft(p=>({...p,hosts:e.target.value}))}/>
                </div>
                <div className="tog-row">
                  <label className={`tog${draft.offerTraining?' on':''}`}>
                    <input type="checkbox" checked={draft.offerTraining} onChange={e=>setDraft(p=>({...p,offerTraining:e.target.checked}))} style={{accentColor:'#0d1b5e'}}/>
                    <span>Training</span>
                  </label>
                  <label className={`tog${draft.offerBoth?' on':''}`}>
                    <input type="checkbox" checked={draft.offerBoth} onChange={e=>setDraft(p=>({...p,offerBoth:e.target.checked}))} style={{accentColor:'#0d1b5e'}}/>
                    <span>Training + Games</span>
                  </label>
                </div>
                <p style={{fontSize:12,color:'#94a3b8',marginBottom:14}}>Games Only is always available.</p>
                <div className="row2">
                  <div className="fl"><label>Max Players</label>
                    <input className="inp" type="number" value={draft.maxGames} onChange={e=>setDraft(p=>({...p,maxGames:parseInt(e.target.value)||0}))}/>
                  </div>
                  <div className="fl"><label>Price (AED)</label>
                    <input className="inp" type="number" value={draft.prices.games} onChange={e=>setDraft(p=>({...p,prices:{...p.prices,games:parseInt(e.target.value)||0}}))}/>
                  </div>
                </div>
                {draft.offerTraining&&(
                  <div className="row3">
                    <div className="fl"><label>Training AED</label>
                      <input className="inp" type="number" value={draft.prices.training} onChange={e=>setDraft(p=>({...p,prices:{...p.prices,training:parseInt(e.target.value)||0}}))}/>
                    </div>
                    {draft.offerBoth&&<div className="fl"><label>Both AED</label>
                      <input className="inp" type="number" value={draft.prices.both} onChange={e=>setDraft(p=>({...p,prices:{...p.prices,both:parseInt(e.target.value)||0}}))}/>
                    </div>}
                    <div className="fl"><label>Max Training</label>
                      <input className="inp" type="number" value={draft.maxTraining} onChange={e=>setDraft(p=>({...p,maxTraining:parseInt(e.target.value)||0}))}/>
                    </div>
                  </div>
                )}
                <div className="fl"><label>Notes (shown to players)</label>
                  <textarea className="inp" rows={2} value={draft.notes} onChange={e=>setDraft(p=>({...p,notes:e.target.value}))}/>
                </div>
                <button className="btn-primary" onClick={doPublish} disabled={saving}>
                  {saving?'Saving…':editId?'Update Session':'Publish Session'}
                </button>
                {editId&&(
                  <button className="btn-outline" style={{width:'100%',marginTop:10}}
                    onClick={()=>{setEditId(null);setDraft({...DEF,id:genId()});}}>
                    Cancel edit
                  </button>
                )}
              </div>
            )}

            {/* ── ON THE NIGHT ── */}
            {av==='night'&&(
              <div className="pad">
                {!gnSess?(
                  <>
                    <div className="sec sec-line" style={{marginTop:4}}>Select Session</div>
                    {sessions.length===0&&(
                      <div className="alert-info">No open sessions. Go to History to edit past sessions.</div>
                    )}
                    {sessions.map(s=>(
                      <div key={s.id} className="card" style={{cursor:'pointer'}} onClick={()=>setGnSess(s)}>
                        <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:3}}>{s.title}</div>
                        <div style={{fontSize:13,color:'#64748b'}}>{fmtLong(s.date)} · {s.location}</div>
                      </div>
                    ))}
                  </>
                ):(
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:14}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>{gnSess.title}</div>
                        <div style={{fontSize:13,color:'#64748b',marginBottom:4}}>{fmtLong(gnSess.date)}</div>
                        <button className="back-btn" onClick={()=>setGnSess(null)}>← Change session</button>
                      </div>
                      <button className="btn-outline" onClick={()=>loadGn(gnSess)}>↻ Refresh</button>
                    </div>

                    {gnFriends.length>0&&(
                      <div className="card card-teal" style={{marginBottom:12}}>
                        <div style={{fontSize:10,fontWeight:700,color:'#0d9488',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Friend Requests</div>
                        {gnFriends.map((f,i)=><div key={i} style={{fontSize:13,color:'#0f172a',marginBottom:3}}><strong>{f.name}</strong> → {f.with}</div>)}
                      </div>
                    )}

                    {/* Copy buttons */}
                    <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
                      <button className="copy-btn" onClick={()=>{
                        const main = gnList.filter(s => s.type !== 'Waitlist');
                        const wait = gnList.filter(s => s.type === 'Waitlist');
                        const max  = gnSess.maxGames || 18;
                        const price = gnSess.prices?.games || 35;

                        // Format date: "Monday, 14 September 8-10pm"
                        const d = new Date(gnSess.date + 'T00:00:00');
                        const dateStr = d.toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'});
                        const rawTime = (gnSess.time || '8:00 PM – 10:00 PM');
                        const timeStr = rawTime
                          .replace(':00', '').replace(':00', '')
                          .replace(' PM', 'pm').replace(' AM', 'am')
                          .replace(' – ', '-').replace(' - ', '-');

                        // Numbered player rows — fill empty spots with blank
                        const playerLines = [];
                        for (let i = 0; i < max; i++) {
                          const p = main[i];
                          playerLines.push((i + 1) + '. ' + (p ? p.name : ''));
                        }

                        // Waitlist — show actual names or 3 blank lines
                        const waitLines = wait.length > 0
                          ? wait.map((p, i) => (i + 1) + '. ' + p.name)
                          : ['1. ', '2. ', '3. '];

                        const mapUrl = gnSess.mapUrl || '';
                        const appUrl = 'https://volleyball-signup.vercel.app/';

                        const lines = [
                          dateStr + ' ' + timeStr,
                          gnSess.location || 'ICS Khalidiya',
                          '',
                          '*' + price + ' AED each*',
                          '',
                          'Hosts: ' + (gnSess.hosts || ''),
                          '',
                          ...playerLines,
                          '',
                          'Waitlist:',
                          ...waitLines,
                          '',
                          'Location:',
                          mapUrl,
                          '',
                          'Sign up here:',
                          appUrl,
                        ];

                        navigator.clipboard.writeText(lines.join('\n'));
                        alert('Copied! (' + main.length + '/' + max + ' players)');
                      }}>📋 Copy player list</button>
                      <button className="copy-btn" onClick={()=>{
                        const unpaid=gnList.filter(s=>s.paid==='No'&&s.type!=='Waitlist'&&s.host!=='Yes');
                        const cash=gnList.filter(s=>s.paid==='Cash'&&s.type!=='Waitlist'&&s.host!=='Yes');
                        if(!unpaid.length&&!cash.length){alert('Everyone has paid! ✓');return;}
                        const lines=[];
                        if(cash.length){lines.push('💵 Collect cash on the night:');cash.forEach((s,i)=>lines.push((i+1)+'. '+s.name));lines.push('');}
                        if(unpaid.length){lines.push('✗ Not yet paid:');unpaid.forEach((s,i)=>lines.push((i+1)+'. '+s.name));}
                        navigator.clipboard.writeText(lines.join('\n'));
                        alert('Copied!');
                      }}>💸 Copy unpaid</button>
                    </div>

                    {gnList.length===0&&<p style={{color:'#94a3b8',fontSize:13,textAlign:'center',padding:'20px 0'}}>No signups yet.</p>}

                    {['Games Only','Training + Games','Training Only','Waitlist'].map(type=>{
                      const g=gnList.filter(s=>s.type===type);
                      if(!g.length) return null;
                      return(
                        <div key={type}>
                          <div className="sec" style={{marginTop:type==='Games Only'?4:16}}>{type} <span style={{color:'#94a3b8',fontWeight:600}}>({g.length})</span></div>
                          {g.map(s=>{
                            const pl=players.find(p=>p.name.toLowerCase()===s.name.toLowerCase());
                            const isOpen=gnExp===s.name;
                            return(
                              <div key={s.name} className="gn-row">
                                <div className="gn-top">
                                  <div className="gn-info" onClick={()=>setGnExp(isOpen?null:s.name)} style={{cursor:'pointer'}}>
                                    <div className="gn-name">{s.name}</div>
                                    <div className="gn-sub">R:{pl?.rating||'—'} · {LEVEL_MAP[pl?.rating]||'Unrated'}{pl?.setter==='Setter'?' · Setter':''}</div>
                                  </div>
                                  <button className={`tog-btn ${s.paid==='Yes'?'yes':s.paid==='Cash'?'cash':'no'}`}
                                    onClick={()=>{
                                      const next = s.paid==='No'?'Cash':s.paid==='Cash'?'Yes':'No';
                                      gnToggle(s.name,'paid',next);
                                    }}>
                                    {gnBusy[`${s.name}_paid`]?'…':s.paid==='Yes'?'✓ Paid':s.paid==='Cash'?'💵 Cash':'✗ Unpaid'}
                                  </button>
                                  <button className={`tog-btn ${s.attended==='Yes'?'yes':'no'}`}
                                    onClick={()=>gnToggle(s.name,'attended',s.attended==='Yes'?'No':'Yes')}>
                                    {gnBusy[`${s.name}_attended`]?'…':s.attended==='Yes'?'✓ Here':'✗ Absent'}
                                  </button>
                                  <button onClick={()=>setGnExp(isOpen?null:s.name)} style={{background:'none',border:'none',color:'#94a3b8',fontSize:14,marginLeft:4,padding:4}}>
                                    {isOpen?'▲':'▼'}
                                  </button>
                                </div>
                                {isOpen&&<RatePanel s={s}/>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}

                    <div className="total-bar">
                      <span style={{fontSize:13,color:'#94a3b8',fontWeight:600}}>Expected total</span>
                      <span style={{fontSize:18,fontWeight:900,color:'#00d4c8'}}>
                        {gnList.filter(s=>s.type!=='Waitlist'&&s.host!=='Yes').reduce((a,s)=>a+(parseFloat(s.amount)||0),0)} AED
                      </span>
                    </div>

                    {/* Admin who list with remove */}
                    <div className="sec sec-line" style={{marginTop:20}}>Full List</div>
                    <WhoList session={gnSess} list={gnList} isAdmin={true}/>
                  </>
                )}
              </div>
            )}

            {/* ── TEAMS ── */}
            {av==='teams'&&(
              <div className="pad">
                {!tmSess?(
                  <>
                    <div className="sec sec-line" style={{marginTop:4}}>Select Session</div>
                    {sessions.length===0&&<div className="alert-info">No open sessions.</div>}
                    {sessions.map(s=>(
                      <div key={s.id} className="card" style={{cursor:'pointer'}} onClick={()=>setTmSess(s)}>
                        <div style={{fontSize:15,fontWeight:800,color:'#0f172a',marginBottom:3}}>{s.title}</div>
                        <div style={{fontSize:13,color:'#64748b'}}>{fmtLong(s.date)} · {s.location}</div>
                      </div>
                    ))}
                  </>
                ):(
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
                      <div>
                        <div style={{fontSize:15,fontWeight:800,color:'#0f172a'}}>{tmSess.title}</div>
                        <button className="back-btn" onClick={()=>setTmSess(null)}>← Change session</button>
                      </div>
                      <button className="btn-outline" onClick={()=>loadTm(tmSess)}>↻ Refresh</button>
                    </div>

                    {tmFriends.length>0&&(
                      <div className="card" style={{borderLeft:'4px solid #7c3aed',marginBottom:12}}>
                        <div style={{fontSize:10,fontWeight:700,color:'#7c3aed',textTransform:'uppercase',letterSpacing:1,marginBottom:6}}>Friend Requests</div>
                        {tmFriends.map((f,i)=><div key={i} style={{fontSize:13,color:'#0f172a',marginBottom:3}}><strong>{f.name}</strong> → {f.with}</div>)}
                      </div>
                    )}

                    <div className="sec sec-line" style={{marginTop:4}}>Number of Teams</div>
                    <div className="n-sel">
                      {[3,4,5,6].map(n=>(
                        <button key={n} className={`n-btn${tmCount===n?' on':''}`}
                          onClick={()=>{setTmCount(n);setTmTeams([]);setTmPool(prev=>prev.length?prev:tmPool);}}>
                          {n}
                        </button>
                      ))}
                    </div>

                    <button className="btn-primary btn-teal" style={{marginBottom:14}} onClick={autoBalance}>
                      ⚡ Auto-Balance Teams
                    </button>

                    {tmPool.length>0&&(
                      <div className="pool" onDragOver={e=>onDragOver(e,'pool')} onDrop={e=>onDrop(e,'pool')}>
                        <div className="pool-hdr">Unassigned ({tmPool.length})</div>
                        {tmPool.map(p=>(
                          <div key={p.name} className="tp" draggable onDragStart={()=>onDragStart(p,'pool')}>
                            <div className="tp-name">{p.name}</div>
                            {tmFriends.find(f=>f.name===p.name||f.with===p.name)&&<span className="tp-tag tp-friend">🤝</span>}
                            {p.setter&&<span className="tp-tag tp-setter">Setter</span>}
                            <div className="tp-r">{p.rating||'?'}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {tmTeams.map(t=>(
                      <div key={t.color} className="team-card" onDragOver={e=>onDragOver(e,t.color)} onDrop={e=>onDrop(e,t.color)}>
                        <div className="team-hdr">
                          <div className="team-nm" style={{color:TEAM_COLOR_HEX[t.color]||'#0f172a'}}>
                            {t.color} Team
                          </div>
                          <div style={{display:'flex',gap:6,alignItems:'center'}}>
                            <span className="tstat">avg {teamAvg(t)}</span>
                            <span className="tstat">{t.players.length} players</span>
                          </div>
                        </div>
                        {t.players.map(p=>(
                          <div key={p.name} className="tp" draggable onDragStart={()=>onDragStart(p,t.color)}>
                            <div className="tp-name">{p.name}</div>
                            {tmFriends.find(f=>f.name===p.name||f.with===p.name)&&<span className="tp-tag tp-friend">🤝</span>}
                            {p.setter&&<span className="tp-tag tp-setter">Setter</span>}
                            <div className="tp-r">{p.rating||'?'}</div>
                          </div>
                        ))}
                        <div className={`drop${tmOver===t.color?' over':''}`}>Drop player here</div>
                      </div>
                    ))}

                    {tmPool.length===0&&tmTeams.length===0&&(
                      <div className="alert-info">No confirmed paid players yet. Mark players as paid in On the Night first.</div>
                    )}

                    {tmTeams.length>0&&(
                      <button className="btn-primary" style={{marginTop:10}} onClick={saveTm}>
                        {tmSaved?'✓ Teams Saved to Sheet':'💾 Confirm & Save Teams'}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── HISTORY ── */}
            {av==='history'&&(
              <div className="pad">
                <div className="sec sec-line" style={{marginTop:4}}>Search History</div>
                <div className="fl">
                  <input className="inp" placeholder="Search by player name…" value={histF.name}
                    onChange={e=>setHistF(p=>({...p,name:e.target.value}))}/>
                </div>
                <div className="row2">
                  <div className="fl">
                    <select className="inp" value={histF.paid} onChange={e=>setHistF(p=>({...p,paid:e.target.value}))}>
                      <option value="">Any payment status</option>
                      <option value="Yes">Paid ✓</option>
                      <option value="No">Unpaid ✗</option>
                    </select>
                  </div>
                  <div className="fl">
                    <select className="inp" value={histF.attended} onChange={e=>setHistF(p=>({...p,attended:e.target.value}))}>
                      <option value="">Any attendance</option>
                      <option value="Yes">Attended ✓</option>
                      <option value="No">No-show ✗</option>
                    </select>
                  </div>
                </div>
                <div className="row2">
                  <div className="fl"><label>From</label>
                    <input className="inp" type="date" value={histF.from} onChange={e=>setHistF(p=>({...p,from:e.target.value}))}/>
                  </div>
                  <div className="fl"><label>To</label>
                    <input className="inp" type="date" value={histF.to} onChange={e=>setHistF(p=>({...p,to:e.target.value}))}/>
                  </div>
                </div>
                <button className="btn-primary btn-teal" style={{marginBottom:14}} onClick={loadHist}>
                  Search
                </button>

                <button className="btn-danger" style={{width:'100%',marginBottom:20}} onClick={async()=>{
                  if(!confirm('Archive sessions older than 3 months? They will move to an Archive tab and player session counts will be updated.')) return;
                  const res=await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'archive'})});
                  const d=await res.json();
                  alert(d.archived>0?`Archived ${d.archived} rows to ${d.archiveName}.`:'Nothing to archive yet.');
                  if(d.archived>0) loadHist();
                }}>
                  📦 Archive Sessions Older Than 3 Months
                </button>

                {histLoading&&<p style={{color:'#94a3b8',textAlign:'center',padding:'20px 0'}}>Loading…</p>}

                {!histSel?(
                  histGroups.length===0&&histSearched&&!histLoading
                    ?<div className="alert-info">No sessions found. Try adjusting your filters.</div>
                    :histGroups.map(([date,rows])=>(
                      <div key={date} className="hist-row" onClick={()=>{setHistSel(date);setHistRows(rows);}}>
                        <div className="hist-date">{date}</div>
                        <div className="hist-pills">
                          <span className="hpill">{rows.filter(s=>s.type!=='Waitlist').length} players</span>
                          <span className="hpill">{rows.filter(s=>s.paid==='Yes'&&s.host!=='Yes').length} paid</span>
                          <span className="hpill">{rows.filter(s=>s.attended==='No'&&s.host!=='Yes').length} no-shows</span>
                          <span className="hpill">{rows.filter(s=>s.host!=='Yes'&&s.type!=='Waitlist').reduce((a,s)=>a+(parseFloat(s.amount)||0),0)} AED</span>
                        </div>
                      </div>
                    ))
                ):(
                  <>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
                      <div>
                        <div style={{fontSize:16,fontWeight:800,color:'#0f172a'}}>{histSel}</div>
                        <button className="back-btn" onClick={()=>setHistSel(null)}>← Back to list</button>
                      </div>
                    </div>
                    {histRows.map((s,i)=>{
                      const pl=players.find(p=>p.name.toLowerCase()===s.name.toLowerCase());
                      const isOpen=gnExp===`hist_${s.name}_${i}`;
                      return(
                        <div key={i} className="gn-row">
                          <div className="gn-top">
                            <div className="gn-info" onClick={()=>setGnExp(isOpen?null:`hist_${s.name}_${i}`)} style={{cursor:'pointer'}}>
                              <div className="gn-name">{s.name}</div>
                              <div className="gn-sub">{s.type} · {s.amount} AED · R:{pl?.rating||s.rating||'—'}</div>
                            </div>
                            <button className={`tog-btn ${s.paid==='Yes'?'yes':s.paid==='Cash'?'cash':'no'}`}
                              onClick={async()=>{
                                const v=s.paid==='No'?'Cash':s.paid==='Cash'?'Yes':'No';
                                await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update_signup',date:histSel,name:s.name,field:'paid',value:v})});
                                setHistRows(prev=>prev.map(r=>r.name===s.name&&r.type===s.type?{...r,paid:v}:r));
                              }}>
                              {s.paid==='Yes'?'✓ Paid':s.paid==='Cash'?'💵 Cash':'✗ Unpaid'}
                            </button>
                            <button className={`tog-btn ${s.attended==='Yes'?'yes':'no'}`}
                              onClick={async()=>{
                                const v=s.attended==='Yes'?'No':'Yes';
                                await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'update_signup',date:histSel,name:s.name,field:'attended',value:v})});
                                setHistRows(prev=>prev.map(r=>r.name===s.name&&r.type===s.type?{...r,attended:v}:r));
                              }}>
                              {s.attended==='Yes'?'✓ Here':'✗ NS'}
                            </button>
                            <button onClick={()=>setGnExp(isOpen?null:`hist_${s.name}_${i}`)} style={{background:'none',border:'none',color:'#94a3b8',fontSize:14,marginLeft:4,padding:4}}>
                              {isOpen?'▲':'▼'}
                            </button>
                          </div>
                          {isOpen&&<RatePanel s={s} histDate={histSel}/>}
                        </div>
                      );
                    })}
                    {histRows.length===0&&<div className="alert-info">No players found for this session.</div>}
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
