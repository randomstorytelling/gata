/* ============================================================
   GATA — application core
   Architecture:
     • Store        — single source of truth, local-first (localStorage)
     • Sync         — OPTIONAL Firebase adapter (Google sign-in + Firestore)
     • Cycle        — adaptive cycle engine (learns from logged periods)
     • Breath/Med   — guided practice players
     • UI           — view renderers + router
   The app is fully functional with NO Firebase. Sync lights up the
   moment a config is pasted below — it is an adapter, never the spine.
   ============================================================ */

/* ---- 1) Firebase config -----------------------------------------
   PASTE the web config from your Firebase project here (Project
   settings → General → "Your apps" → SDK setup → Config).
   It is safe to ship in the browser — these are not secret keys.
   Also enable Authentication → Google, and add your hosting domain
   (e.g. randomstorytelling.github.io) under Auth → Settings →
   Authorized domains. Until apiKey is filled, sync stays off and the
   app runs local-only. */
const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
};
const SYNC_AVAILABLE = !!FIREBASE_CONFIG.apiKey;

/* ---- 2) Content + constants ---- */
const C = window.GATA;
const LS_KEY = "gata_v2";
const PHASE_META = [
  {key:"menstrual", label:"Menstrual", season:"Winter", emoji:"🌑", accent:"#B0496B", soft:"#F6E6EC", softDark:"#3a2630"},
  {key:"follicular", label:"Follicular", season:"Spring", emoji:"🌱", accent:"#4E9A6B", soft:"#E4F1E9", softDark:"#21342a"},
  {key:"ovulatory", label:"Ovulatory", season:"Summer", emoji:"☀️", accent:"#D98A2B", soft:"#FBEFDC", softDark:"#3a2e1a"},
  {key:"luteal", label:"Luteal", season:"Autumn", emoji:"🍂", accent:"#C2683E", soft:"#F8E7DC", softDark:"#392419"}
];
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

/* ---- 3) Helpers ---- */
const $ = (id) => document.getElementById(id);
function esc(s){ return (s||"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])); }
function todayISO(){ return iso(new Date()); }
function iso(d){ return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function parseISO(s){ const [y,m,d]=s.split("-").map(Number); return new Date(y,m-1,d); }
function daysBetween(a,b){ return Math.round((parseISO(b)-parseISO(a))/86400000); }
function addDays(s,n){ const d=parseISO(s); d.setDate(d.getDate()+n); return iso(d); }
function niceDate(ds){ return parseISO(ds).toLocaleString("en-US",{month:"short",day:"numeric"}); }
function clampCycle(n){ return Math.max(20,Math.min(45, Math.round(+n||28))); }
function hexA(hex,a){ const h=hex.replace("#",""); return `rgba(${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)},${a})`; }
function toast(msg){ const t=$("toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),1700); }
function fmtTime(sec){ const m=Math.floor(sec/60), s=Math.floor(sec%60); return m+":"+String(s).padStart(2,"0"); }

/* flagged herb/supplement lookup */
const FLAGGED = C.safety.flaggedItems.map(f=>f.name.toLowerCase().split(" (")[0]);
function isFlagged(name){ const b=name.toLowerCase(); return FLAGGED.some(f=> b.includes(f) || f.includes(b.split(" (")[0])); }

/* resolve a practiceMap recommendation key to a real content item */
function breathByKey(k){ return C.breath.patterns.find(p=>p.key===k); }
function medByKey(k){ return C.meditations.find(m=>m.key===k) || C.meditations.find(m=>m.theme===k); }

/* ---- 4) Store (local-first) ---- */
function freshState(){
  return {
    v:2,
    profile:{ name:"", theme:"auto", onboarded:false, cycleLength:28, periodLength:5, lastPeriodStart:"" },
    cycles:{ starts:[] },
    logs:{},
    practice:{ sessions:[] },
    reminders:{ checkin:{on:false,time:"08:00"}, meditation:{on:false,time:"08:30"}, breath:{on:false,time:"15:00"} },
    meta:{ updatedAt:0 }
  };
}
function loadState(){
  try { const raw=localStorage.getItem(LS_KEY); if(raw){ return Object.assign(freshState(), JSON.parse(raw)); } } catch(e){}
  return freshState();
}
let S = loadState();
function persistLocal(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(S)); }catch(e){} }
function commit(push=true){
  S.meta = S.meta || {}; S.meta.updatedAt = Date.now();
  persistLocal();
  if(push && SYNC_AVAILABLE && !Sync.applyingRemote) Sync.pushDebounced();
}

/* merge two states without losing logged data (additive for logs/cycles/practice) */
function mergeState(remote, local){
  if(!remote) return local;
  const out = JSON.parse(JSON.stringify(local));
  out.logs = out.logs || {};
  for(const [d,r] of Object.entries(remote.logs||{})){
    const l = out.logs[d];
    out.logs[d] = !l ? r : (((r._u||0) > (l._u||0)) ? Object.assign({},l,r) : Object.assign({},r,l));
  }
  const starts = new Set([...(out.cycles&&out.cycles.starts||[]), ...(remote.cycles&&remote.cycles.starts||[])]);
  out.cycles = { starts:[...starts].filter(Boolean).sort() };
  const seen=new Set(), sessions=[];
  for(const s of [...(out.practice&&out.practice.sessions||[]), ...(remote.practice&&remote.practice.sessions||[])]){
    const id=(s.ts||"")+"|"+(s.key||"")+"|"+(s.type||"");
    if(!seen.has(id)){ seen.add(id); sessions.push(s); }
  }
  out.practice = { sessions };
  const remoteNewer = (remote.meta&&remote.meta.updatedAt||0) > (local.meta&&local.meta.updatedAt||0);
  if(remoteNewer){
    out.profile = Object.assign({}, local.profile, remote.profile);
    out.reminders = remote.reminders || local.reminders;
  }
  out.profile.onboarded = !!(local.profile.onboarded || (remote.profile&&remote.profile.onboarded));
  out.meta = { updatedAt: Math.max(remote.meta&&remote.meta.updatedAt||0, local.meta&&local.meta.updatedAt||0) };
  return out;
}

/* ---- 5) Sync (Firebase adapter — optional) ---- */
const Sync = {
  user:null, db:null, docRef:null, snapUnsub:null, applyingRemote:false, pushTimer:null,
  init(){
    if(!SYNC_AVAILABLE) return;
    try{
      firebase.initializeApp(FIREBASE_CONFIG);
      this.db = firebase.firestore();
      try { this.db.enablePersistence({synchronizeTabs:true}); } catch(e){}
      firebase.auth().onAuthStateChanged(u=>this.onAuth(u));
      firebase.auth().getRedirectResult().catch(()=>{});
    }catch(e){ console.warn("Firebase init failed", e); }
  },
  signIn(){
    if(!SYNC_AVAILABLE){ toast("Sync isn't set up yet"); return; }
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt:"select_account" });
    if(isMobile){ firebase.auth().signInWithRedirect(provider); }
    else { firebase.auth().signInWithPopup(provider).catch(()=>firebase.auth().signInWithRedirect(provider)); }
  },
  signOut(){ if(this.snapUnsub){this.snapUnsub();this.snapUnsub=null;} firebase.auth().signOut(); },
  async onAuth(u){
    this.user = u || null;
    updateSyncUI();
    if(!u){ if(this.snapUnsub){this.snapUnsub();this.snapUnsub=null;} render(); return; }
    this.docRef = this.db.collection("gataUsers").doc(u.uid);
    try{
      const snap = await this.docRef.get();
      const remote = snap.exists ? snap.data() : null;
      this.applyingRemote = true;
      S = mergeState(remote, S);
      persistLocal();
      this.applyingRemote = false;
      await this.docRef.set(S, {merge:false});
      this.attachSnapshot();
    }catch(e){ console.warn("first sync failed", e); }
    Reminders.scheduleAll();
    render();
  },
  attachSnapshot(){
    if(this.snapUnsub) this.snapUnsub();
    this.snapUnsub = this.docRef.onSnapshot({includeMetadataChanges:false}, (snap)=>{
      if(!snap.exists || snap.metadata.hasPendingWrites) return;
      const remote = snap.data();
      if((remote.meta&&remote.meta.updatedAt||0) <= (S.meta&&S.meta.updatedAt||0)) return;
      this.applyingRemote = true;
      S = mergeState(remote, S);
      persistLocal();
      this.applyingRemote = false;
      render();
    });
  },
  pushDebounced(){
    if(!this.user || !this.docRef) return;
    clearTimeout(this.pushTimer);
    this.pushTimer = setTimeout(()=>{ this.docRef.set(S, {merge:false}).catch(()=>{}); }, 1200);
  }
};
function updateSyncUI(){ const d=$("syncDot"); if(d) d.classList.toggle("on", !!Sync.user); }

/* ---- 6) Cycle engine (adaptive) ---- */
const Cycle = {
  starts(){
    const a = [...(S.cycles && S.cycles.starts || [])];
    if(S.profile.lastPeriodStart && !a.includes(S.profile.lastPeriodStart)) a.push(S.profile.lastPeriodStart);
    return a.filter(Boolean).sort();
  },
  hasData(){ return this.starts().length>0; },
  learnedCycleLength(){
    const s=this.starts();
    if(s.length<2) return clampCycle(S.profile.cycleLength);
    const gaps=[]; for(let i=1;i<s.length;i++){ const g=daysBetween(s[i-1],s[i]); if(g>=18&&g<=45) gaps.push(g); }
    if(!gaps.length) return clampCycle(S.profile.cycleLength);
    const recent=gaps.slice(-6);
    return clampCycle(recent.reduce((a,b)=>a+b,0)/recent.length);
  },
  periodLength(){ return Math.max(2,Math.min(10, +S.profile.periodLength||5)); },
  lastStart(){ const s=this.starts(); return s.length ? s[s.length-1] : null; },
  info(dateStr){
    const last=this.lastStart(); if(!last) return null;
    const len=this.learnedCycleLength(), plen=this.periodLength();
    const target=dateStr||todayISO();
    let diff=daysBetween(last,target);
    let day=((diff%len)+len)%len+1;
    const ovDay=Math.max(plen+2, len-14);
    let idx; if(day<=plen)idx=0; else if(day<ovDay-1)idx=1; else if(day<=ovDay+1)idx=2; else idx=3;
    const daysUntilNext=len-day+1;
    return { day,len,plen,ovDay,idx,daysUntilNext, nextStart:addDays(target,daysUntilNext), count:this.starts().length };
  },
  segments(info){
    const {len,plen,ovDay}=info;
    const spans=[[1,plen],[plen+1,ovDay-2],[ovDay-1,ovDay+1],[ovDay+2,len]];
    return spans.map((s,i)=>({ idx:i, startFrac:(s[0]-1)/len, lenFrac:Math.max(0,(s[1]-s[0]+1))/len }));
  },
  logStart(ds){ const set=new Set(this.starts()); set.add(ds); const arr=[...set].sort(); S.cycles={starts:arr}; S.profile.lastPeriodStart=arr[arr.length-1]; commit(); },
  removeStart(ds){ const arr=this.starts().filter(d=>d!==ds); S.cycles={starts:arr}; S.profile.lastPeriodStart=arr.length?arr[arr.length-1]:""; commit(); }
};

/* ---- 7) Practice log + progression ---- */
function recordPractice(type,key,seconds){
  S.practice = S.practice || {sessions:[]};
  S.practice.sessions.push({type,key,date:todayISO(),ts:Date.now(),seconds:Math.round(seconds||0)});
  commit();
}
function practiceCount(){ return (S.practice&&S.practice.sessions||[]).length; }
function practiceToday(){ return (S.practice&&S.practice.sessions||[]).filter(s=>s.date===todayISO()).length; }
function currentMilestone(){
  const n=practiceCount(); const ms=C.practiceMap.progression.milestones;
  let cur=ms[0]; for(const m of ms){ if(n>=m.at) cur=m; } return {n, milestone:cur};
}

/* ---- 8) Accent theming ---- */
function setAccent(idx){
  const m=PHASE_META[idx] ?? PHASE_META[0];
  const dark=document.documentElement.getAttribute("data-theme")==="dark";
  document.documentElement.style.setProperty("--accent", m.accent);
  document.documentElement.style.setProperty("--accent-soft", dark?m.softDark:m.soft);
}
function applyTheme(){
  const t=S.profile.theme||"auto";
  const dark = t==="dark" || (t==="auto" && window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark?"dark":"light");
  const tc=document.querySelector('meta[name=theme-color]'); if(tc) tc.setAttribute("content", dark?"#18130F":"#FBF6F2");
  const info = S.profile.onboarded ? Cycle.info() : null;
  setAccent(info?info.idx:0);
}
if(window.matchMedia) matchMedia("(prefers-color-scheme: dark)").addEventListener("change",()=>{ if((S.profile.theme||"auto")==="auto") applyTheme(); });

/* ============================================================
   ROUTER + RENDER
   ============================================================ */
const main = $("main");
let currentTab="today", activePhaseTab=0, calmTab="breathe";
let calMonth=(()=>{ const d=new Date(); return {y:d.getFullYear(), m:d.getMonth()}; })();

function render(){
  if(!S.profile.onboarded){ renderOnboarding(); return; }
  $("calmQuick").classList.remove("hidden");
  ({today:renderToday, phases:renderPhases, calm:renderCalm, cycle:renderCycle, more:renderMore}[currentTab]||renderToday)();
  renderTabbar();
  $("brandMark").style.background="var(--accent)";
}
function switchTab(t){ currentTab=t; window.scrollTo(0,0); render(); }

/* ---- TODAY ---- */
function renderToday(){
  const info=Cycle.info();
  const idx=info?info.idx:0;
  setAccent(idx);
  const ph=C.phases[idx], meta=PHASE_META[idx];
  const log=S.logs[todayISO()]||{};
  const greetName=S.profile.name?`, ${esc(S.profile.name)}`:"";
  const hr=new Date().getHours();
  const tod=hr<12?"Good morning":hr<18?"Good afternoon":"Good evening";

  // ring
  const R=82, CIRC=2*Math.PI*R; let segs="";
  if(info){
    Cycle.segments(info).forEach(s=>{ const m=PHASE_META[s.idx], gap=0.012;
      const dash=Math.max(0,(s.lenFrac-gap))*CIRC, rot=s.startFrac*360-90;
      segs+=`<circle cx="100" cy="100" r="${R}" fill="none" stroke="${m.accent}" stroke-width="13" stroke-dasharray="${dash} ${CIRC-dash}" transform="rotate(${rot} 100 100)" stroke-linecap="round" opacity="${s.idx===idx?1:.38}"/>`;
    });
    const ang=((info.day-0.5)/info.len)*2*Math.PI - Math.PI/2;
    segs+=`<circle cx="${100+R*Math.cos(ang)}" cy="${100+R*Math.sin(ang)}" r="9" fill="#fff" stroke="${meta.accent}" stroke-width="4"/>`;
  }

  // recommended practices for this phase
  const map=C.practiceMap.byPhase.find(p=>p.phaseKey===meta.key)||C.practiceMap.byPhase[0];
  const recBreath=breathByKey(map.recommendedBreath[0]);
  const recMed=medByKey(map.recommendedMeditation[0]);

  const energyDots=[1,2,3,4,5].map(n=>`<div class="energy-dot ${log.energy===n?"sel":""}" data-energy="${n}">${n}</div>`).join("");
  const moodChips=C.tracking.moods.map(m=>`<div class="pill ${log.mood===m?"sel":""}" data-mood="${esc(m)}">${esc(m)}</div>`).join("");
  const sympChips=C.tracking.symptoms.map(s=>`<div class="pill ${(log.symptoms||[]).includes(s)?"sel":""}" data-symp="${esc(s)}">${esc(s)}</div>`).join("");
  const habits=C.tracking.dailyHabits.map((h,i)=>`<div class="habit ${(log.habits||{})[i]?"done":""}" data-habit="${i}"><div class="check">✓</div><div><div class="h-txt">${esc(h.habit)}</div><div class="h-why">${esc(h.why)}</div></div></div>`).join("");
  const promptIdx=(new Date().getDate())%C.tracking.logPrompts.length;
  const {n:pn, milestone}=currentMilestone();

  main.innerHTML=`
  <div class="view">
    <div class="greet">${tod}<b>${greetName}</b></div>
    ${info?`<div class="muted" style="font-size:13px;margin-bottom:6px">You're in your <b style="color:var(--accent)">${meta.season.toLowerCase()}</b> — day ${info.day} of your cycle.</div>`:`<div class="muted" style="font-size:13px;margin-bottom:6px">Let's find your rhythm.</div>`}

    <div class="card" style="padding-top:8px">
      <div class="ring-wrap"><svg viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="13"/>${segs}
        <text x="100" y="92" text-anchor="middle" fill="var(--text)" style="font-size:42px;font-family:var(--serif)">${info?info.day:"–"}</text>
        <text x="100" y="112" text-anchor="middle" fill="var(--text-soft)" style="font-size:11px;letter-spacing:1px">DAY</text>
      </svg></div>
      <div class="phase-head">
        <div class="season">${meta.emoji} ${esc(meta.season)} · ${esc(meta.label)}</div>
        <div class="ttl">${esc(ph.phase.replace(" phase",""))}</div>
        ${info?`<div class="next">${info.idx===0?`Period · day ${info.day} of ~${info.plen}`:`~${info.daysUntilNext} day${info.daysUntilNext===1?"":"s"} until your next period`}</div>`:""}
        ${info?`<div class="confidence">${info.count>=3?`📈 learned from your last ${Math.min(info.count-1,6)} cycle${info.count-1===1?"":"s"}`:`✨ log each period and Gata sharpens this automatically`}</div>`:""}
        <button class="pill" id="goPhase" style="margin-top:12px">Full ${esc(meta.label.toLowerCase())} guide →</button>
      </div>
    </div>

    ${info?`<div class="card"><div class="section-label">Today's focus</div>
      <div class="focus-grid">
        <div class="focus-item"><div class="k">Move</div><div class="v">${esc(ph.workouts[0].type)}</div></div>
        <div class="focus-item"><div class="k">Eat</div><div class="v">${esc(ph.foods[0].name)}</div></div>
        <div class="focus-item"><div class="k">Sip</div><div class="v">${esc(ph.teas[0].name)}</div></div>
        <div class="focus-item"><div class="k">Ease off</div><div class="v">${esc((ph.eatLess[0]||"").split(" (")[0].split(",")[0].split(" —")[0])}</div></div>
      </div></div>`:""}

    <div class="card">
      <div class="section-label">Calm, matched to your ${esc(meta.season.toLowerCase())}</div>
      <div class="rec-row">
        ${recBreath?`<button class="rec-card" data-breath="${recBreath.key}"><div class="rk">🫧 Breathe</div><div class="rt">${esc(recBreath.name)}</div><div class="rs">${esc(recBreath.tagline)}</div></button>`:""}
        ${recMed?`<button class="rec-card" data-med="${recMed.key}"><div class="rk">🧘‍♀️ Meditate</div><div class="rt">${esc(recMed.name)}</div><div class="rs">${recMed.durationMin} min · ${esc(recMed.theme)}</div></button>`:""}
      </div>
      <button class="btn calm" id="calmBtn" style="margin-top:12px">Reset my nervous system</button>
    </div>

    <div class="affirm">${esc(ph.affirmation)}”</div>

    <div class="card">
      <div class="section-label">Daily check-in</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">${esc(C.tracking.energyScaleLabel)}</div>
      <div class="energy-row" id="energyRow">${energyDots}</div>
      <div style="font-size:13px;font-weight:600;margin:16px 0 8px">How are you feeling?</div>
      <div class="chips" id="moodChips">${moodChips}</div>
      <div style="font-size:13px;font-weight:600;margin:16px 0 8px">Anything in your body? <span class="muted" style="font-weight:400">(tap any)</span></div>
      <div class="chips" id="sympChips">${sympChips}</div>
      <div style="font-size:13px;font-weight:600;margin:18px 0 4px">Notes</div>
      <textarea id="noteBox" placeholder="${esc(C.tracking.logPrompts[promptIdx])}">${esc(log.note||"")}</textarea>
    </div>

    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="section-label" style="margin:0">Daily anchors</div>
        <div class="streak">🔥 ${streakCount()} day${streakCount()===1?"":"s"}</div>
      </div>
      <div style="font-size:12px;color:var(--text-soft);margin-bottom:6px">The things that steady hormones every day, whatever the phase.</div>
      <div id="habitList">${habits}</div>
    </div>

    <button class="btn" id="saveBtn">Save today</button>
    <div class="center muted" style="font-size:11px;margin-top:14px;padding:0 10px">Gata is wellness education, not medical advice. <a class="link" id="openSafety">Read the safety note →</a></div>
  </div>`;

  $("energyRow").onclick=e=>{const d=e.target.closest("[data-energy]"); if(!d)return; setLog("energy", (S.logs[todayISO()]||{}).energy===+d.dataset.energy?null:+d.dataset.energy); renderToday();};
  $("moodChips").onclick=e=>{const d=e.target.closest("[data-mood]"); if(!d)return; setLog("mood",(S.logs[todayISO()]||{}).mood===d.dataset.mood?null:d.dataset.mood); renderToday();};
  $("sympChips").onclick=e=>{const d=e.target.closest("[data-symp]"); if(!d)return; toggleSymptom(d.dataset.symp); renderToday();};
  $("habitList").onclick=e=>{const d=e.target.closest("[data-habit]"); if(!d)return; toggleHabit(+d.dataset.habit); renderToday();};
  $("noteBox").oninput=e=>setLog("note",e.target.value);
  $("saveBtn").onclick=()=>{ commit(); toast("Saved ✓"); };
  $("calmBtn").onclick=()=>Breath.open(map.recommendedBreath[0]);
  $("goPhase").onclick=()=>{ activePhaseTab=idx; switchTab("phases"); };
  $("openSafety").onclick=openSafetySheet;
  main.querySelectorAll("[data-breath]").forEach(b=>b.onclick=()=>Breath.open(b.dataset.breath));
  main.querySelectorAll("[data-med]").forEach(b=>b.onclick=()=>Med.open(b.dataset.med));
}
function setLog(k,v){ const t=todayISO(); S.logs[t]=S.logs[t]||{}; if(v===null) delete S.logs[t][k]; else S.logs[t][k]=v; S.logs[t]._u=Date.now(); commit(); }
function toggleSymptom(s){ const t=todayISO(); S.logs[t]=S.logs[t]||{}; const a=S.logs[t].symptoms||[]; const i=a.indexOf(s); i>=0?a.splice(i,1):a.push(s); S.logs[t].symptoms=a; S.logs[t]._u=Date.now(); commit(); }
function toggleHabit(i){ const t=todayISO(); S.logs[t]=S.logs[t]||{}; const h=S.logs[t].habits||{}; h[i]=!h[i]; S.logs[t].habits=h; S.logs[t]._u=Date.now(); commit(); }
function streakCount(){ let n=0,d=new Date(); for(;;){ const l=S.logs[iso(d)]; const has=l&&(l.energy||l.mood||(l.symptoms&&l.symptoms.length)||l.note||(l.habits&&Object.values(l.habits).some(Boolean))); if(has){n++; d.setDate(d.getDate()-1);} else break; } return n; }

/* ---- PHASES ---- */
function renderPhases(){
  const info=Cycle.info(); const curIdx=info?info.idx:-1;
  setAccent(activePhaseTab);
  const ph=C.phases[activePhaseTab], meta=PHASE_META[activePhaseTab];
  const map=C.practiceMap.byPhase.find(p=>p.phaseKey===meta.key);
  const tabs=PHASE_META.map((m,i)=>`<div class="phase-tab ${i===activePhaseTab?"active":""}" data-ptab="${i}" style="${i===activePhaseTab?`background:${m.accent}`:""}"><div class="e">${m.emoji}</div><div class="l">${m.label}</div></div>`).join("");
  const itemList=(arr,nk,wk,flag)=>arr.map(x=>`<div class="item"><div class="nm">${esc(x[nk])} ${flag&&isFlagged(x[nk])?`<span class="flag-tag" data-flagopen="1">⚠ check first</span>`:""}</div><div class="wy">${esc(x[wk])}</div>${x.caution?`<div class="caution">⚠️ ${esc(x.caution)}</div>`:""}</div>`).join("");
  const acc=(id,icon,title,body)=>`<div class="acc" data-acc="${id}"><div class="acc-head"><span><span class="ico">${icon}</span>${title}</span><span class="chev">›</span></div><div class="acc-body">${body}</div></div>`;
  const practiceBody = map ? `<div style="font-size:13px;color:var(--text-soft);margin:2px 0 10px">${esc(map.why)}</div>`+
    map.recommendedBreath.map(k=>breathByKey(k)).filter(Boolean).map(p=>`<div class="lib-card" data-breath="${p.key}"><div><div class="lt">${esc(p.name)}</div><div class="ls">${esc(p.tagline)}</div></div><div class="play">▶</div></div>`).join("")+
    map.recommendedMeditation.map(k=>medByKey(k)).filter(Boolean).slice(0,2).map(m=>`<div class="lib-card" data-med="${m.key}"><div><div class="lt">${esc(m.name)}</div><div class="ls">${m.durationMin} min meditation</div></div><div class="play">▶</div></div>`).join("") : "";

  main.innerHTML=`
  <div class="view">
    <div class="phase-tabs">${tabs}</div>
    ${activePhaseTab===curIdx?`<div class="you-are" style="color:${meta.accent};margin-bottom:8px">● You're here right now${info?` — day ${info.day}`:""}</div>`:""}
    <div class="card" style="background:var(--accent-soft);border-color:transparent">
      <div class="season" style="color:var(--accent);font-weight:700;font-size:12px;letter-spacing:.05em;text-transform:uppercase">${meta.emoji} ${meta.season}</div>
      <h2 style="margin:4px 0 2px">${esc(ph.phase.replace(" phase",""))}</h2>
      <div class="muted" style="font-size:13px">${esc(ph.alsoCalled)}</div>
      <div style="font-size:13px;margin-top:10px"><b>When:</b> ${esc(ph.typicalDays)}</div>
    </div>
    ${acc("horm","🧬","What's happening","<div style='font-size:14px;margin-bottom:12px'>"+esc(ph.hormones)+"</div><div style='font-size:14px'><b>Body &amp; mind:</b> "+esc(ph.bodyMind)+"</div>")}
    ${acc("prac","🫧","Calm &amp; meditation for this phase", practiceBody)}
    ${acc("work","🏃‍♀️","Move your body",itemList(ph.workouts,"type","why",false))}
    ${acc("food","🥗","Eat",itemList(ph.foods,"name","why",false))}
    ${acc("tea","🍵","Teas",itemList(ph.teas,"name","why",false))}
    ${acc("herb","🌿","Herbs",itemList(ph.herbs,"name","why",true))}
    ${acc("supp","💊","Supplements",itemList(ph.supplements,"name","why",true))}
    ${acc("life","✨","Lifestyle","<ul class='lifelist'>"+ph.lifestyle.map(x=>`<li>${esc(x)}</li>`).join("")+"</ul>")}
    ${acc("ns","🌙","Nervous-system practices","<ul class='lifelist'>"+ph.nervousSystem.map(x=>`<li>${esc(x)}</li>`).join("")+"</ul>")}
    ${acc("less","🚫","Go easier on","<ul class='lifelist'>"+(ph.eatLess||[]).map(x=>`<li>${esc(x)}</li>`).join("")+"</ul>")}
    <div class="affirm" style="margin-top:16px">${esc(ph.affirmation)}”</div>
    <div class="center muted" style="font-size:11px;margin-top:14px"><a class="link" id="openSafety2">⚠ Herb &amp; supplement safety →</a></div>
  </div>`;

  main.querySelector(".phase-tabs").onclick=e=>{const d=e.target.closest("[data-ptab]"); if(!d)return; activePhaseTab=+d.dataset.ptab; renderPhases();};
  main.querySelectorAll("[data-acc]").forEach(a=>a.querySelector(".acc-head").onclick=()=>a.classList.toggle("open"));
  main.querySelector('[data-acc="horm"]').classList.add("open");
  main.querySelectorAll("[data-flagopen]").forEach(b=>b.onclick=(e)=>{e.stopPropagation();openSafetySheet();});
  main.querySelectorAll("[data-breath]").forEach(b=>b.onclick=()=>Breath.open(b.dataset.breath));
  main.querySelectorAll("[data-med]").forEach(b=>b.onclick=()=>Med.open(b.dataset.med));
  $("openSafety2").onclick=openSafetySheet;
}

/* ---- CALM ---- */
function renderCalm(){
  const info=Cycle.info(); if(info) setAccent(info.idx);
  const meta=info?PHASE_META[info.idx]:null;
  const map=meta?C.practiceMap.byPhase.find(p=>p.phaseKey===meta.key):null;
  const recBreathKeys=map?map.recommendedBreath:[];
  const recMedKeys=map?map.recommendedMeditation:[];
  const {n:pn, milestone}=currentMilestone();

  const tabBtn=(k,l)=>`<button data-ctab="${k}" class="${calmTab===k?"on":""}">${l}</button>`;
  let body="";
  if(calmTab==="breathe"){
    const ordered=[...C.breath.patterns].sort((a,b)=>(recBreathKeys.includes(b.key)?1:0)-(recBreathKeys.includes(a.key)?1:0));
    body=ordered.map(p=>`<div class="lib-card" data-breath="${p.key}">
      <div><div class="lt">${esc(p.name)}${recBreathKeys.includes(p.key)?`<span class="rec-badge">for your ${esc(meta.season.toLowerCase())}</span>`:""}</div>
      <div class="ls">${esc(p.tagline)}</div><div class="lmeta">${esc(p.bestFor[0])}</div></div>
      <div class="play">▶</div></div>`).join("");
  } else if(calmTab==="meditate"){
    const ordered=[...C.meditations].sort((a,b)=>(recMedKeys.includes(b.key)?1:0)-(recMedKeys.includes(a.key)?1:0));
    body=ordered.map(m=>`<div class="lib-card" data-med="${m.key}">
      <div><div class="lt">${esc(m.name)}${recMedKeys.includes(m.key)?`<span class="rec-badge">for your ${esc(meta.season.toLowerCase())}</span>`:""}</div>
      <div class="ls">${esc(m.description)}</div><div class="lmeta">${m.durationMin} min · ${esc(m.theme)}</div></div>
      <div class="play">▶</div></div>`).join("");
  } else {
    const micro=C.practiceMap.reminders.microPractices.map((m,i)=>`<div class="micro" ${m.pattern?`data-breath="${m.pattern}" style="cursor:pointer"`:""}><div class="mn">${esc(m.name)} <span class="muted" style="font-weight:400">· ${m.seconds}s${m.pattern?" · tap to start":""}</span></div><div class="mh">${esc(m.how)}</div></div>`).join("");
    const rit=(arr)=>arr.map(r=>`<div class="item"><div class="nm">${esc(r.name)} <span class="muted" style="font-weight:400;font-size:12px">· ${r.minutes}m</span></div><div class="wy">${esc(r.how)}</div></div>`).join("");
    body=`<div class="card"><div class="section-label">Quick resets · 30–90 seconds</div>${micro}</div>
      <div class="card"><div class="section-label">☀️ Morning rituals</div>${rit(C.ns.morningRituals)}</div>
      <div class="card"><div class="section-label">🌙 Evening rituals</div>${rit(C.ns.eveningRituals)}</div>
      <div class="card"><div class="section-label">Daily non-negotiables</div><ul class="lifelist">${C.ns.dailyNonNegotiables.map(x=>`<li>${esc(x)}</li>`).join("")}</ul></div>
      <div class="card"><div class="section-label">Read your nervous system</div><div class="twocol">
        <div><div style="font-weight:700;font-size:13px;color:var(--accent);margin-bottom:6px">Dysregulated</div><div class="signlist">${C.ns.signsDysregulated.map(s=>`<div>${esc(s)}</div>`).join("")}</div></div>
        <div><div style="font-weight:700;font-size:13px;color:#4E9A6B;margin-bottom:6px">Regulated</div><div class="signlist">${C.ns.signsRegulated.map(s=>`<div>${esc(s)}</div>`).join("")}</div></div>
      </div></div>`;
  }

  main.innerHTML=`
  <div class="view">
    <h2 style="margin:2px 0 4px">Calm</h2>
    <div class="prog-card">
      <div style="display:flex;align-items:center;gap:14px">
        <div class="prog-num">${pn}</div>
        <div><div style="font-weight:600">practices gathered</div><div class="muted" style="font-size:12.5px">${practiceToday()} today · keep tending it, gently</div></div>
      </div>
      <div class="prog-milestone">“${esc(milestone.text)}”</div>
    </div>
    <div class="seg-tabs">${tabBtn("breathe","🫧 Breathe")}${tabBtn("meditate","🧘‍♀️ Meditate")}${tabBtn("reset","🌿 Reset")}</div>
    ${calmTab!=="reset"?`<div class="muted" style="font-size:13px;margin-bottom:12px">${calmTab==="breathe"?"Evidence-based breathing, with a guided animation. Tap any to begin.":"Gentle guided meditations that unfold on screen. No sound needed."}</div>`:""}
    ${body}
  </div>`;

  main.querySelector(".seg-tabs").onclick=e=>{const b=e.target.closest("[data-ctab]"); if(!b)return; calmTab=b.dataset.ctab; renderCalm();};
  main.querySelectorAll("[data-breath]").forEach(b=>b.onclick=()=>Breath.open(b.dataset.breath));
  main.querySelectorAll("[data-med]").forEach(b=>b.onclick=()=>Med.open(b.dataset.med));
}

/* ---- CYCLE / CALENDAR ---- */
function renderCycle(){
  const info=Cycle.info(); if(info) setAccent(info.idx);
  const {y,m}=calMonth; const first=new Date(y,m,1); const startDow=first.getDay();
  const daysIn=new Date(y,m+1,0).getDate();
  const monthName=first.toLocaleString("en-US",{month:"long",year:"numeric"});
  const dow=["S","M","T","W","T","F","S"].map(d=>`<div class="cal-dow">${d}</div>`).join("");
  const startSet=new Set(Cycle.starts());
  let cells=""; for(let i=0;i<startDow;i++) cells+=`<div class="cal-cell out"></div>`;
  for(let d=1;d<=daysIn;d++){
    const ds=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const ci=Cycle.info(ds); const col=ci?PHASE_META[ci.idx].accent:"transparent";
    const isToday=ds===todayISO();
    const l=S.logs[ds]; const logged=l&&(l.energy||l.mood||(l.symptoms&&l.symptoms.length)||l.note);
    const bg=ci?`background:${hexA(col, document.documentElement.getAttribute("data-theme")==="dark"?.30:.18)}`:"";
    cells+=`<div class="cal-cell ${isToday?"today":""}" data-day="${ds}" style="${bg}">
      ${startSet.has(ds)?`<span class="startdot">🩸</span>`:""}
      <span style="${ci?`color:${col};font-weight:700`:""}">${d}</span>${logged?`<span class="logdot"></span>`:""}</div>`;
  }
  const legend=PHASE_META.map(p=>`<span><i style="background:${p.accent}"></i>${p.label}</span>`).join("");

  main.innerHTML=`
  <div class="view">
    <h2 style="margin:2px 0 12px">Your cycle</h2>
    ${info?`<div class="stat-row" style="margin-bottom:16px">
      <div class="stat"><div class="num" style="color:var(--accent)">${info.day}</div><div class="lbl">Cycle day</div></div>
      <div class="stat"><div class="num">${info.len}</div><div class="lbl">Avg length</div></div>
      <div class="stat"><div class="num">${info.daysUntilNext}</div><div class="lbl">Days to period</div></div>
    </div>
    <div class="card" style="background:var(--accent-soft);border-color:transparent;padding:14px">
      <div style="font-size:13px"><b>${PHASE_META[info.idx].emoji} ${PHASE_META[info.idx].label}</b> · next period around <b>${niceDate(info.nextStart)}</b></div>
      <div class="muted" style="font-size:12px;margin-top:4px">${info.count>=3?`Auto-learned from your last ${Math.min(info.count-1,6)} cycle${info.count-1===1?"":"s"}.`:`Log each period start and Gata refines your prediction automatically.`}</div>
    </div>`:`<div class="card">Add your last period in <b>More → Cycle details</b>, or tap a day below and mark it, to begin.</div>`}

    <div class="card">
      <div class="cal-head"><button class="icon-btn" id="prevM">‹</button><div style="font-family:var(--serif);font-size:18px;font-weight:600">${monthName}</div><button class="icon-btn" id="nextM">›</button></div>
      <div class="cal-grid">${dow}${cells}</div>
      <div class="legend">${legend}<span>🩸 period start</span></div>
    </div>
    <button class="btn ghost" id="markPeriod">🩸 My period started today</button>
    <div class="center muted" style="font-size:11.5px;margin-top:12px">Tap any day to log it or mark a period start. The more you log, the smarter your phases get.</div>
  </div>`;

  $("prevM").onclick=()=>{calMonth.m--; if(calMonth.m<0){calMonth.m=11;calMonth.y--;} renderCycle();};
  $("nextM").onclick=()=>{calMonth.m++; if(calMonth.m>11){calMonth.m=0;calMonth.y++;} renderCycle();};
  $("markPeriod").onclick=()=>{ Cycle.logStart(todayISO()); toast("Period start logged 🩸"); renderCycle(); };
  main.querySelectorAll("[data-day]").forEach(c=>c.onclick=()=>openDaySheet(c.dataset.day));
}

/* ---- MORE / SETTINGS ---- */
function renderMore(){
  const p=S.profile, r=S.reminders, theme=p.theme||"auto";
  const u=Sync.user;
  const accountCard = SYNC_AVAILABLE ? (u ? `
      <div class="settings-row">
        <div style="display:flex;align-items:center;gap:12px">
          ${u.photoURL?`<img class="avatar" src="${u.photoURL}" referrerpolicy="no-referrer" style="object-fit:cover">`:`<div class="avatar">${esc((u.displayName||u.email||"G")[0].toUpperCase())}</div>`}
          <div><div class="sl">${esc(u.displayName||"Signed in")}</div><div class="sd">${esc(u.email||"")} · ✅ synced</div></div>
        </div>
      </div>
      <button class="btn ghost" id="signOut" style="margin-top:6px">Sign out</button>` : `
      <div class="sd" style="margin-bottom:10px">Sign in with Google so your check-ins, cycle, and practice sync across devices and are safely backed up.</div>
      <button class="btn google" id="signIn"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.4 5.4 2.6 13.2l7.8 6.1C12.2 13.4 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7C43.9 38 46.5 31.8 46.5 24.5z"/><path fill="#FBBC05" d="M10.4 28.3c-.5-1.5-.8-3.1-.8-4.8s.3-3.3.8-4.8l-7.8-6.1C1 16.1 0 19.9 0 24s1 7.9 2.6 11.4l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.4-5.7c-2 1.4-4.7 2.3-7.8 2.3-6.4 0-11.8-3.9-13.6-9.4l-7.8 6.1C6.4 42.6 14.6 48 24 48z"/></svg>Sign in with Google</button>`)
    : `<div class="sd">Cloud sync isn't configured yet. Your data is saved privately on this device — use Export below to back it up.</div>`;

  const remRow=(key,label,desc)=>`
    <div class="settings-row">
      <div><div class="sl">${label}</div><div class="sd">${desc}</div></div>
      <div style="display:flex;align-items:center;gap:10px">
        <input type="time" value="${r[key].time}" data-remtime="${key}" style="width:auto">
        <div class="switch ${r[key].on?"on":""}" data-remtog="${key}"></div>
      </div>
    </div>`;

  main.innerHTML=`
  <div class="view">
    <h2 style="margin:2px 0 14px">More</h2>

    <div class="card"><div class="section-label">Account &amp; sync</div>${accountCard}</div>

    <div class="card">
      <div class="section-label">Cycle details</div>
      <div class="field"><label>Your name</label><input type="text" id="mName" value="${esc(p.name)}" placeholder="Your name"></div>
      <div class="field"><label>First day of your last period</label><input type="date" id="mLast" value="${esc(Cycle.lastStart()||"")}"></div>
      <div class="row2">
        <div class="field"><label>Avg cycle length${Cycle.starts().length>=2?" (auto-learned)":""}</label><input type="number" id="mCycle" value="${Cycle.learnedCycleLength()}" min="20" max="45"></div>
        <div class="field"><label>Period length</label><input type="number" id="mPeriod" value="${p.periodLength}" min="2" max="10"></div>
      </div>
      <button class="btn" id="mSave">Save details</button>
      <div class="sd" style="margin-top:8px">Tip: just tap <b>“My period started today”</b> on the Cycle tab each month — Gata learns your real length automatically.</div>
    </div>

    <div class="card">
      <div class="section-label">Reminders</div>
      ${remRow("checkin","Daily check-in","A gentle nudge to log your day")}
      ${remRow("meditation","Meditation","A moment of stillness, matched to your phase")}
      ${remRow("breath","Breath reset","A quick nervous-system reset")}
      <button class="btn ghost" id="dlIcs" style="margin-top:10px">📅 Add these to my phone calendar</button>
      <div class="sd" style="margin-top:8px">In-app nudges fire while Gata is open; the calendar reminders fire even when it's closed — the most reliable on iPhone.</div>
    </div>

    <div class="card">
      <div class="section-label">Appearance</div>
      <div class="settings-row"><div class="sl">Theme</div>
        <div class="seg" id="themeSeg">
          <button data-th="light" class="${theme==="light"?"on":""}">Light</button>
          <button data-th="dark" class="${theme==="dark"?"on":""}">Dark</button>
          <button data-th="auto" class="${theme==="auto"?"on":""}">Auto</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="section-label">Your data</div>
      <div class="settings-row"><div class="sl" id="expData">Export my data</div><span class="muted">↓ JSON</span></div>
      <div class="settings-row"><label class="sl" for="impFile" style="cursor:pointer">Import data</label><input type="file" id="impFile" accept="application/json" style="display:none"><span class="muted">↑ JSON</span></div>
      <div class="settings-row"><div class="sl" id="resetData" style="color:#b23b3b">Reset everything</div></div>
    </div>

    <div class="card"><div class="section-label">About &amp; safety</div>
      <div class="settings-row"><div class="sl" id="safetyLink">Safety &amp; medical disclaimer</div><span class="muted">›</span></div>
      <div class="sd" style="margin-top:8px">Made with care for you. 🤍 Gata is wellness education, not medical advice.</div>
    </div>
  </div>`;

  const si=$("signIn"); if(si) si.onclick=()=>Sync.signIn();
  const so=$("signOut"); if(so) so.onclick=()=>{ Sync.signOut(); toast("Signed out"); };
  $("mSave").onclick=()=>{
    S.profile.name=$("mName").value.trim();
    const last=$("mLast").value; if(last) Cycle.logStart(last);
    S.profile.cycleLength=clampCycle($("mCycle").value);
    S.profile.periodLength=Math.max(2,Math.min(10,+$("mPeriod").value||5));
    commit(); toast("Saved ✓"); applyTheme();
  };
  main.querySelectorAll("[data-remtog]").forEach(el=>el.onclick=function(){ const k=this.dataset.remtog; r[k].on=!r[k].on; if(r[k].on) Reminders.request(); commit(); this.classList.toggle("on"); Reminders.scheduleAll(); });
  main.querySelectorAll("[data-remtime]").forEach(el=>el.onchange=function(){ r[this.dataset.remtime].time=this.value; commit(); Reminders.scheduleAll(); });
  $("dlIcs").onclick=Reminders.downloadIcs;
  $("themeSeg").onclick=e=>{const b=e.target.closest("[data-th]"); if(!b)return; S.profile.theme=b.dataset.th; commit(); applyTheme(); renderMore();};
  $("expData").onclick=exportData;
  $("impFile").onchange=importData;
  $("resetData").onclick=()=>{ if(confirm("Reset everything on this device? (Cloud data, if signed in, is unaffected.)")){ localStorage.removeItem(LS_KEY); S=loadState(); applyTheme(); render(); } };
  $("safetyLink").onclick=openSafetySheet;
}

/* ---- TAB BAR ---- */
function renderTabbar(){
  const icons={
    today:'<path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/>',
    phases:'<circle cx="12" cy="12" r="9"/><path d="M12 3v9l6 3"/>',
    calm:'<path d="M12 21c5-3 8-7 8-11a4 4 0 0 0-8-1 4 4 0 0 0-8 1c0 4 3 8 8 11z"/>',
    cycle:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    more:'<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'
  };
  const labels={today:"Today",phases:"Phases",calm:"Calm",cycle:"Cycle",more:"More"};
  $("tabbar").innerHTML=Object.keys(labels).map(k=>`<button class="tab ${currentTab===k?"active":""}" data-tab="${k}"><svg viewBox="0 0 24 24">${icons[k]}</svg><span>${labels[k]}</span></button>`).join("");
  $("tabbar").onclick=e=>{const b=e.target.closest("[data-tab]"); if(!b)return; switchTab(b.dataset.tab);};
}

/* ============================================================
   BREATH PLAYER
   ============================================================ */
const Breath = {
  key:"coherence", minutes:null, timer:null, startTs:0, rounds:0, sound:false, haptic:true, audio:null,
  open(key){
    if(key) this.key=key;
    const p=breathByKey(this.key)||C.breath.patterns[0]; this.minutes=p.defaultMinutes; this.rounds=0;
    const ov=document.createElement("div"); ov.className="breath-overlay"; ov.id="breathOv";
    ov.innerHTML=`
      <button class="breath-close" id="bClose">×</button>
      <div class="ov-tools">
        <button id="bSound" class="${this.sound?"":"off"}" title="sound">🔊</button>
        <button id="bHaptic" class="${this.haptic?"":"off"}" title="vibration">📳</button>
      </div>
      <div class="breath-count" id="bCount"></div>
      <div class="breath-circle" id="bCircle"></div>
      <div class="breath-txt" id="bTxt">Get comfortable…</div>
      <div class="breath-sub" id="bSub">${esc(p.tagline)}</div>
      <div class="breath-picker" id="bPicker">${C.breath.patterns.map(x=>`<button data-bp="${x.key}" class="${x.key===this.key?"on":""}">${esc(x.name)}</button>`).join("")}</div>
      <div class="len-picker" id="bLen">${[1,3,5,10].map(mm=>`<button data-len="${mm}" class="${mm===this.minutes?"on":""}">${mm}m</button>`).join("")}</div>`;
    document.body.appendChild(ov);
    $("bClose").onclick=()=>this.close();
    $("bSound").onclick=()=>{ this.sound=!this.sound; $("bSound").classList.toggle("off",!this.sound); };
    $("bHaptic").onclick=()=>{ this.haptic=!this.haptic; $("bHaptic").classList.toggle("off",!this.haptic); };
    $("bPicker").onclick=e=>{const b=e.target.closest("[data-bp]"); if(!b)return; this.key=b.dataset.bp; this.minutes=(breathByKey(this.key)||{}).defaultMinutes||5; this.run(); $("bPicker").querySelectorAll("[data-bp]").forEach(x=>x.classList.toggle("on",x.dataset.bp===this.key)); $("bLen").querySelectorAll("[data-len]").forEach(x=>x.classList.toggle("on",+x.dataset.len===this.minutes)); $("bSub").textContent=(breathByKey(this.key)||{}).tagline||"";};
    $("bLen").onclick=e=>{const b=e.target.closest("[data-len]"); if(!b)return; this.minutes=+b.dataset.len; $("bLen").querySelectorAll("[data-len]").forEach(x=>x.classList.toggle("on",+x.dataset.len===this.minutes)); this.run();};
    setTimeout(()=>this.run(),700);
  },
  run(){
    clearTimeout(this.timer);
    const p=breathByKey(this.key)||C.breath.patterns[0];
    const circle=$("bCircle"); if(!circle) return;
    this.startTs=Date.now(); this.rounds=0;
    let i=0; let scale=1;
    const step=()=>{
      const elapsed=(Date.now()-this.startTs)/1000;
      if(i===0 && elapsed >= this.minutes*60){ this.finish(); return; }
      const s=p.steps[i]; const txt=$("bTxt"), sub=$("bSub"), cnt=$("bCount");
      if(txt) txt.textContent=s.label;
      if(cnt) cnt.textContent=`${Math.max(0,Math.ceil(this.minutes*60-elapsed))}s · round ${this.rounds+1}`;
      if(s.kind==="in"){ scale=1.7; } else if(s.kind==="sip"){ scale=1.9; } else if(s.kind==="out"){ scale=1; }
      circle.style.transitionDuration=(s.seconds)+"s";
      circle.style.transform=`scale(${scale})`;
      if(sub){ sub.textContent = s.seconds>=1 ? "" : sub.textContent; }
      this.cue(s.kind);
      i++; if(i>=p.steps.length){ i=0; this.rounds++; }
      this.timer=setTimeout(step, s.seconds*1000);
    };
    step();
  },
  cue(kind){
    if(this.haptic && navigator.vibrate){ navigator.vibrate(kind==="in"?18:kind==="out"?[8,40,8]:6); }
    if(this.sound){ try{
      this.audio=this.audio||new (window.AudioContext||window.webkitAudioContext)();
      const o=this.audio.createOscillator(), g=this.audio.createGain();
      o.frequency.value = kind==="in"||kind==="sip" ? 396 : kind==="out" ? 297 : 350;
      o.type="sine"; o.connect(g); g.connect(this.audio.destination);
      g.gain.setValueAtTime(0,this.audio.currentTime); g.gain.linearRampToValueAtTime(.05,this.audio.currentTime+.1);
      g.gain.exponentialRampToValueAtTime(.0001,this.audio.currentTime+.6); o.start(); o.stop(this.audio.currentTime+.65);
    }catch(e){} }
  },
  finish(){
    const elapsed=(Date.now()-this.startTs)/1000;
    if(elapsed>20) recordPractice("breath", this.key, elapsed);
    const txt=$("bTxt"), sub=$("bSub"); if(txt) txt.textContent="Beautifully done"; if(sub) sub.textContent="Notice how you feel now.";
    const c=$("bCircle"); if(c){ c.style.transitionDuration="2s"; c.style.transform="scale(1.2)"; }
    setTimeout(()=>this.close(),2200);
  },
  close(){ clearTimeout(this.timer); const ov=$("breathOv"); if(ov) ov.remove(); if(currentTab==="calm") renderCalm(); if(currentTab==="today") renderToday(); }
};

/* ============================================================
   MEDITATION PLAYER
   ============================================================ */
const Med = {
  key:null, total:0, elapsed:0, playing:false, raf:null, lastTick:0, cueIdx:-1, audio:null,
  open(key){
    const m=medByKey(key); if(!m) return; this.key=key; this.total=m.durationMin*60; this.elapsed=0; this.cueIdx=-1; this.playing=true; this.lastTick=Date.now();
    const R=92, CIRC=2*Math.PI*R;
    const ov=document.createElement("div"); ov.className="med-overlay"; ov.id="medOv";
    ov.innerHTML=`
      <button class="breath-close" id="mClose">×</button>
      <div class="med-title">${esc(m.name)}</div>
      <div class="med-ring">
        <svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="${R}" fill="none" stroke="rgba(255,255,255,.15)" stroke-width="6"/>
        <circle id="mProg" cx="100" cy="100" r="${R}" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"/></svg>
        <div class="med-time" id="mTime">${fmtTime(this.total)}</div>
      </div>
      <div class="med-cue" id="mCue">${esc(m.cues[0]?m.cues[0].text:"")}</div>
      <div class="med-controls"><button class="pp" id="mPP">⏸</button></div>`;
    document.body.appendChild(ov);
    $("mClose").onclick=()=>this.close();
    $("mPP").onclick=()=>this.toggle();
    this.CIRC=CIRC; this.tick();
  },
  tick(){
    const m=medByKey(this.key); if(!m) return;
    const now=Date.now();
    if(this.playing){ this.elapsed += (now-this.lastTick)/1000; }
    this.lastTick=now;
    const prog=Math.min(1, this.elapsed/this.total);
    const pc=$("mProg"); if(pc) pc.style.strokeDashoffset = this.CIRC*(1-prog);
    const tt=$("mTime"); if(tt) tt.textContent=fmtTime(Math.max(0,this.total-this.elapsed));
    // advance cue
    let idx=-1; for(let i=0;i<m.cues.length;i++){ if(this.elapsed>=m.cues[i].atSeconds) idx=i; }
    if(idx!==this.cueIdx){ this.cueIdx=idx; const cue=$("mCue"); if(cue&&m.cues[idx]){ cue.style.opacity=0; setTimeout(()=>{ cue.textContent=m.cues[idx].text; cue.style.opacity=1; },350); } }
    if(this.elapsed>=this.total){ this.finish(); return; }
    this.raf=requestAnimationFrame(()=>this.tick());
  },
  toggle(){ this.playing=!this.playing; const b=$("mPP"); if(b) b.textContent=this.playing?"⏸":"▶"; this.lastTick=Date.now(); },
  finish(){
    cancelAnimationFrame(this.raf); this.playing=false;
    recordPractice("med", this.key, this.total);
    const cue=$("mCue"); if(cue) cue.textContent="Take your time coming back. 🤍";
    const b=$("mPP"); if(b) b.textContent="✓";
    this.bell();
    setTimeout(()=>this.close(),3000);
  },
  bell(){ try{ const a=new (window.AudioContext||window.webkitAudioContext)(); const o=a.createOscillator(),g=a.createGain(); o.frequency.value=528; o.type="sine"; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(.0001,a.currentTime); g.gain.exponentialRampToValueAtTime(.12,a.currentTime+.05); g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+2.5); o.start(); o.stop(a.currentTime+2.6);}catch(e){} },
  close(){ cancelAnimationFrame(this.raf); const ov=$("medOv"); if(ov) ov.remove(); if(currentTab==="calm") renderCalm(); if(currentTab==="today") renderToday(); }
};

/* ============================================================
   SHEETS (safety + day detail)
   ============================================================ */
function openSheet(html){ const ov=document.createElement("div"); ov.className="overlay"; ov.id="sheetOv"; ov.innerHTML=`<div class="sheet">${html}</div>`; ov.onclick=e=>{ if(e.target===ov) closeSheet(); }; document.body.appendChild(ov); }
function closeSheet(){ const o=$("sheetOv"); if(o) o.remove(); }
window.closeSheet=closeSheet;
function openSafetySheet(){
  const s=C.safety;
  openSheet(`
    <h2>Safety &amp; disclaimer</h2>
    <div class="disclaimer-box" style="margin:12px 0 18px">${esc(s.disclaimer)}</div>
    <div class="section-label">Talk to a clinician first if…</div>
    <ul class="lifelist" style="margin-bottom:16px">${s.talkToDoctorIf.map(x=>`<li style="font-size:13px">${esc(x)}</li>`).join("")}</ul>
    <div class="section-label">Herbs &amp; supplements with real interaction concerns</div>
    <div class="card" style="box-shadow:none;margin-bottom:16px">${s.flaggedItems.map(f=>`<div class="item"><div class="nm" style="color:#b23b3b">⚠ ${esc(f.name)}</div><div class="wy"><b>Why:</b> ${esc(f.concern)}</div><div class="wy" style="margin-top:4px"><b>Do:</b> ${esc(f.recommendation)}</div></div>`).join("")}</div>
    <div class="section-label">General cautions</div>
    <ul class="lifelist">${s.generalCautions.map(x=>`<li style="font-size:13px">${esc(x)}</li>`).join("")}</ul>
    <button class="btn" style="margin-top:16px" onclick="closeSheet()">Got it</button>`);
}
function openDaySheet(ds){
  const ci=Cycle.info(ds), log=S.logs[ds]||{}, meta=ci?PHASE_META[ci.idx]:null;
  const has=log.energy||log.mood||(log.symptoms&&log.symptoms.length)||log.note;
  const isStart=Cycle.starts().includes(ds);
  openSheet(`
    <h2>${niceDate(ds)}</h2>
    ${ci?`<div class="muted" style="margin-bottom:14px">${meta.emoji} ${meta.label} · cycle day ${ci.day}</div>`:""}
    ${has?`
      ${log.energy?`<div class="field"><label>Energy</label><div>${"●".repeat(log.energy)}${"○".repeat(5-log.energy)} (${log.energy}/5)</div></div>`:""}
      ${log.mood?`<div class="field"><label>Mood</label><div>${esc(log.mood)}</div></div>`:""}
      ${(log.symptoms&&log.symptoms.length)?`<div class="field"><label>Symptoms</label><div class="chips">${log.symptoms.map(x=>`<span class="pill">${esc(x)}</span>`).join("")}</div></div>`:""}
      ${log.note?`<div class="field"><label>Notes</label><div>${esc(log.note)}</div></div>`:""}
    `:`<div class="muted">No check-in logged for this day.</div>`}
    ${ds===todayISO()?`<button class="btn" style="margin-top:6px" onclick="closeSheet();switchTab('today')">Open today's check-in</button>`:""}
    <button class="btn ghost" style="margin-top:10px" onclick="Cycle.${isStart?`removeStart`:`logStart`}('${ds}');closeSheet();renderCycle();toast('${isStart?"Period start removed":"Period start set 🩸"}')">${isStart?"Remove period-start mark":"Mark this as a period start 🩸"}</button>
    <button class="btn ghost" style="margin-top:10px" onclick="closeSheet()">Close</button>`);
}
window.switchTab=switchTab; window.renderCycle=renderCycle; window.toast=toast; window.Cycle=Cycle;

/* ============================================================
   REMINDERS (in-app notifications + .ics)
   ============================================================ */
const Reminders = {
  timers:{},
  request(){ if("Notification" in window && Notification.permission==="default") Notification.requestPermission(); },
  scheduleAll(){
    Object.values(this.timers).forEach(t=>clearTimeout(t)); this.timers={};
    const cfg={ checkin:()=>"Time for your daily Gata check-in 🌸",
      meditation:()=>pick(C.practiceMap.reminders.meditationCopy),
      breath:()=>pick(C.practiceMap.reminders.breathCopy) };
    Object.keys(cfg).forEach(k=>{ const r=S.reminders[k]; if(!r||!r.on) return;
      const [h,mi]=r.time.split(":").map(Number); const now=new Date(); const next=new Date(); next.setHours(h,mi,0,0); if(next<=now) next.setDate(next.getDate()+1);
      this.timers[k]=setTimeout(()=>{ if("Notification" in window && Notification.permission==="granted"){ new Notification("Gata", {body:cfg[k]()}); } this.scheduleAll(); }, next-now);
    });
  },
  downloadIcs(){
    const parts=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Gata//EN","CALSCALE:GREGORIAN"];
    const stamp=d=>d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0")+"T"+String(d.getHours()).padStart(2,"0")+String(d.getMinutes()).padStart(2,"0")+"00";
    const titles={checkin:"Gata check-in 🌸", meditation:"Gata meditation 🧘‍♀️", breath:"Gata breath reset 🫧"};
    let any=false;
    Object.keys(titles).forEach(k=>{ const r=S.reminders[k]; if(!r||!r.on) return; any=true;
      const [h,mi]=r.time.split(":").map(Number); const start=new Date(); start.setDate(start.getDate()+1); start.setHours(h,mi,0,0);
      parts.push("BEGIN:VEVENT","UID:gata-"+k+"-"+stamp(start)+"@gata","DTSTAMP:"+stamp(new Date()),"DTSTART:"+stamp(start),"DURATION:PT10M","RRULE:FREQ=DAILY","SUMMARY:"+titles[k],"DESCRIPTION:Your daily Gata practice.","BEGIN:VALARM","TRIGGER:PT0M","ACTION:DISPLAY","DESCRIPTION:"+titles[k],"END:VALARM","END:VEVENT");
    });
    if(!any){ toast("Turn a reminder on first"); return; }
    parts.push("END:VCALENDAR");
    const blob=new Blob([parts.join("\r\n")],{type:"text/calendar"}); const url=URL.createObjectURL(blob);
    const a=document.createElement("a"); a.href=url; a.download="gata-reminders.ics"; a.click(); setTimeout(()=>URL.revokeObjectURL(url),2000);
    toast("Calendar reminders downloaded 📅");
  }
};
function pick(arr){ return arr[(new Date().getDate()+new Date().getHours())%arr.length]; }

/* ============================================================
   DATA EXPORT / IMPORT
   ============================================================ */
function exportData(){ const blob=new Blob([JSON.stringify(S,null,2)],{type:"application/json"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download="gata-backup-"+todayISO()+".json"; a.click(); setTimeout(()=>URL.revokeObjectURL(url),2000); toast("Exported ✓"); }
function importData(e){ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(r.result); if(d.profile&&d.logs){ S=Object.assign(freshState(),d); commit(); applyTheme(); render(); toast("Imported ✓"); } else toast("That file doesn't look right"); }catch(err){ toast("Couldn't read that file"); } }; r.readAsText(f); }

/* ============================================================
   ONBOARDING
   ============================================================ */
let obStep=0; const ob={name:"",last:todayISO(),cycle:28,period:5};
function renderOnboarding(){
  $("tabbar").innerHTML=""; $("calmQuick").classList.add("hidden");
  const steps = SYNC_AVAILABLE ? 5 : 4; // welcome, name, cycle, [signin], disclaimer
  const dots=Array.from({length:steps},(_,i)=>`<i class="${i<=obStep?"on":""}"></i>`).join("");
  let body="";
  if(obStep===0){
    body=`<div class="hero-emoji">🌙</div><h2 class="center" style="margin-top:10px">Welcome to Gata</h2>
      <p class="center muted" style="margin:8px 0 22px">A gentle daily companion for your cycle and your nervous system — what to eat, how to move, which herbs and teas, world-class breathwork and meditation, and how to come back to calm, all matched to where you are this month.</p>
      <button class="btn" id="obNext">Let's begin</button>`;
  } else if(obStep===1){
    body=`<h2>What should I call you?</h2><p class="muted" style="margin:6px 0 16px">So your check-ins feel like yours.</p>
      <div class="field"><input type="text" id="obName" value="${esc(ob.name)}" placeholder="Your name"></div>
      <button class="btn" id="obNext">Next</button><button class="btn ghost" id="obSkip" style="margin-top:10px">Skip</button>`;
  } else if(obStep===2){
    body=`<h2>Your cycle</h2><p class="muted" style="margin:6px 0 16px">This lets Gata show the right phase each day, and it learns your real rhythm as you log. Change it anytime.</p>
      <div class="field"><label>First day of your last period</label><input type="date" id="obLast" value="${esc(ob.last)}"></div>
      <div class="row2"><div class="field"><label>Average cycle length</label><input type="number" id="obCycle" value="${ob.cycle}" min="20" max="45"></div>
      <div class="field"><label>Period length</label><input type="number" id="obPeriod" value="${ob.period}" min="2" max="10"></div></div>
      <p class="muted" style="font-size:12px;margin-top:-4px">Not sure? The defaults (28 / 5) are a fine start — Gata adapts as you log.</p>
      <button class="btn" id="obNext">Next</button>`;
  } else if(obStep===3 && SYNC_AVAILABLE){
    body=`<div class="hero-emoji">☁️</div><h2 class="center" style="margin-top:8px">Sync across your devices</h2>
      <p class="center muted" style="margin:8px 0 20px">Sign in with Google and your check-ins, cycle, and practice are safely backed up and follow you everywhere. Totally optional.</p>
      <button class="btn google" id="obSignIn"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.4 5.4 2.6 13.2l7.8 6.1C12.2 13.4 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7C43.9 38 46.5 31.8 46.5 24.5z"/><path fill="#FBBC05" d="M10.4 28.3c-.5-1.5-.8-3.1-.8-4.8s.3-3.3.8-4.8l-7.8-6.1C1 16.1 0 19.9 0 24s1 7.9 2.6 11.4l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.4-5.7c-2 1.4-4.7 2.3-7.8 2.3-6.4 0-11.8-3.9-13.6-9.4l-7.8 6.1C6.4 42.6 14.6 48 24 48z"/></svg>Sign in with Google</button>
      <button class="btn ghost" id="obNext" style="margin-top:10px">Maybe later</button>`;
  } else {
    body=`<h2>One important note</h2><div class="disclaimer-box" style="margin:14px 0">${esc(C.safety.disclaimer)}</div>
      <button class="btn" id="obDone">I understand — open Gata</button>`;
  }
  main.innerHTML=`<div class="view" style="padding-top:30px"><div class="step-dots">${dots}</div>${body}</div>`;
  setAccent(0);
  const nx=$("obNext"); if(nx) nx.onclick=()=>{
    if(obStep===1) ob.name=($("obName")?.value||"").trim();
    if(obStep===2){ ob.last=$("obLast").value||ob.last; ob.cycle=clampCycle($("obCycle").value); ob.period=Math.max(2,Math.min(10,+$("obPeriod").value||5)); }
    obStep++; renderOnboarding();
  };
  const sk=$("obSkip"); if(sk) sk.onclick=()=>{ obStep++; renderOnboarding(); };
  const osi=$("obSignIn"); if(osi) osi.onclick=()=>Sync.signIn();
  const dn=$("obDone"); if(dn) dn.onclick=()=>{
    S.profile.name=ob.name; S.profile.cycleLength=ob.cycle; S.profile.periodLength=ob.period; S.profile.onboarded=true;
    Cycle.logStart(ob.last);
    commit(); $("calmQuick").classList.remove("hidden"); currentTab="today"; render();
  };
}

/* ============================================================
   BOOT
   ============================================================ */
$("calmQuick").onclick=()=>Breath.open();
applyTheme();
Sync.init();
updateSyncUI();
Reminders.scheduleAll();
render();
window.addEventListener("load",()=>{ if(Object.values(S.reminders).some(r=>r&&r.on)) Reminders.request(); });
// register service worker (only meaningful over http/https)
if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
