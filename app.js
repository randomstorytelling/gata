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

/* ---- 1b) Gata AI proxy --------------------------------------------
   Ask Gata + Yapping are powered by a tiny serverless proxy (see
   /gata-ai-proxy) that holds the model key safely and can call Gemini,
   Claude, or ChatGPT. Paste your deployed Worker URL here — then AI just
   works for everyone, with NOTHING for them to set up. Until it's filled,
   the AI features show a gentle "coming soon". The proxy keeps the key
   off every phone; nothing secret lives in this file. */
const GATA_AI_PROXY = "";
const AI_AVAILABLE = /^https?:\/\//.test(GATA_AI_PROXY);

/* ---- 2) Content + constants ---- */
const C = window.GATA;
const LS_KEY = "gata_v2";
/* accent = bright FILL (rings/chips/buttons, needs 3:1); ink/inkDark = darkened/lightened
   INK for small text & icons (needs WCAG-AA 4.5:1 on light/dark surfaces respectively). */
const PHASE_META = [
  {key:"menstrual", label:"Menstrual", season:"Winter", emoji:"🌑", accent:"#B0496B", ink:"#A8456A", inkDark:"#E58BA8", soft:"#F6E6EC", softDark:"#3a2630"},
  {key:"follicular", label:"Follicular", season:"Spring", emoji:"🌱", accent:"#4E9A6B", ink:"#3E7E55", inkDark:"#82C99B", soft:"#E4F1E9", softDark:"#21342a"},
  {key:"ovulatory", label:"Ovulatory", season:"Summer", emoji:"☀️", accent:"#D98A2B", ink:"#8A6410", inkDark:"#E6B765", soft:"#FBEFDC", softDark:"#3a2e1a"},
  {key:"luteal", label:"Luteal", season:"Autumn", emoji:"🍂", accent:"#C2683E", ink:"#A8542E", inkDark:"#E0926A", soft:"#F8E7DC", softDark:"#392419"}
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
    v:3,
    profile:{ name:"", theme:"auto", onboarded:false, cycleLength:28, periodLength:5, lastPeriodStart:"", goals:[], supplements:[], soundscape:"none", soundVol:0.6, aiKey:"", aiModel:"claude-opus-4-8" },
    cycles:{ starts:[] },
    logs:{},
    practice:{ sessions:[] },
    reminders:{ checkin:{on:false,time:"08:00"}, meditation:{on:false,time:"08:30"}, breath:{on:false,time:"15:00"} },
    meta:{ updatedAt:0 }
  };
}
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
/* Single source of truth for state shape. Deep-fills every section against
   freshState() defaults, runs migrations (mood→moods), and sanitizes untrusted
   values. Called by loadState, importData, AND after every sync merge — so adding
   a new state section is one edit here, not N defensive guards across the app. */
function normalizeState(p){
  const f=freshState();
  p=(p&&typeof p==="object")?p:{};
  const st=Object.assign({}, f, p);
  st.profile=Object.assign({}, f.profile, (p.profile&&typeof p.profile==="object")?p.profile:{});
  st.cycles=Object.assign({}, f.cycles, (p.cycles&&typeof p.cycles==="object")?p.cycles:{});
  st.practice=Object.assign({}, f.practice, (p.practice&&typeof p.practice==="object")?p.practice:{});
  st.meta=Object.assign({}, f.meta, (p.meta&&typeof p.meta==="object")?p.meta:{});
  st.reminders={}; for(const k of Object.keys(f.reminders)) st.reminders[k]=Object.assign({}, f.reminders[k], ((p.reminders||{})[k])||{});
  st.profile.goals=Array.isArray(st.profile.goals)?st.profile.goals.filter(x=>typeof x==="string"):[];
  st.profile.supplements=Array.isArray(st.profile.supplements)?st.profile.supplements.filter(x=>typeof x==="string"):[];
  if(typeof st.profile.aiKey!=="string") st.profile.aiKey="";
  if(typeof st.profile.aiModel!=="string"||!st.profile.aiModel) st.profile.aiModel="claude-opus-4-8";
  st.profile.cycleLength=clampCycle(st.profile.cycleLength);
  st.profile.periodLength=Math.max(2,Math.min(10,+st.profile.periodLength||5));
  st.profile.soundVol=(typeof st.profile.soundVol==="number"&&st.profile.soundVol>=0&&st.profile.soundVol<=1)?st.profile.soundVol:0.6;
  if(st.profile.lastPeriodStart&&!ISO_RE.test(st.profile.lastPeriodStart)) st.profile.lastPeriodStart="";
  st.cycles.starts=Array.isArray(st.cycles.starts)?[...new Set(st.cycles.starts.filter(d=>typeof d==="string"&&ISO_RE.test(d)))].sort():[];
  st.practice.sessions=Array.isArray(st.practice.sessions)?st.practice.sessions.filter(s=>s&&typeof s==="object"):[];
  const logs={}, src=(st.logs&&typeof st.logs==="object")?st.logs:{};
  for(const d of Object.keys(src)){ const v=src[d]; if(!ISO_RE.test(d)||!v||typeof v!=="object"||Array.isArray(v)) continue;
    const e=Object.assign({}, v);
    if(e.mood && !Array.isArray(e.moods)) e.moods=[e.mood];
    if("mood" in e) delete e.mood;
    if(e.moods && !Array.isArray(e.moods)) delete e.moods;
    if(e.symptoms && !Array.isArray(e.symptoms)) delete e.symptoms;
    if(e.nutrition && !Array.isArray(e.nutrition)) delete e.nutrition;
    logs[d]=e;
  }
  st.logs=logs; st.v=f.v;
  return st;
}
function loadState(){
  let raw=null;
  try { raw=localStorage.getItem(LS_KEY); if(raw) return normalizeState(JSON.parse(raw)); }
  catch(e){ try{ localStorage.setItem(LS_KEY+"_corrupt_"+Date.now(), raw||""); }catch(_){}
    setTimeout(()=>{ try{ toast("Couldn't read saved data — a backup was kept"); }catch(_){} }, 900); }
  return freshState();
}
let S = loadState();
let lastPersistOk = true;
function persistLocal(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(S)); lastPersistOk=true; return true; }catch(e){ lastPersistOk=false; return false; } }
function commit(push=true){
  S.meta = S.meta || {}; S.meta.updatedAt = Date.now();
  const ok=persistLocal();
  if(push && SYNC_AVAILABLE && !Sync.applyingRemote) Sync.pushDebounced();
  return ok;
}

/* merge two states without losing logged data (additive for logs/cycles/practice) */
function mergeState(remote, local){
  if(!remote || typeof remote!=="object") return normalizeState(local);
  local = local || {};
  const rNewer = (remote.meta&&remote.meta.updatedAt||0) > (local.meta&&local.meta.updatedAt||0);
  // Seed from BOTH sides (newer overlays) so any section we don't explicitly merge —
  // including future ones (labs, supplements, AI history) — is preserved, never dropped.
  const out = rNewer
    ? Object.assign({}, JSON.parse(JSON.stringify(local)), JSON.parse(JSON.stringify(remote)))
    : Object.assign({}, JSON.parse(JSON.stringify(remote)), JSON.parse(JSON.stringify(local)));
  // logs: per-day last-write-wins by _u (replace outright so a cleared field on the newer device propagates)
  out.logs={}; const lLogs=(local.logs&&typeof local.logs==="object")?local.logs:{}, rLogs=(remote.logs&&typeof remote.logs==="object")?remote.logs:{};
  for(const d of new Set([...Object.keys(lLogs), ...Object.keys(rLogs)])){
    const l=lLogs[d], r=rLogs[d];
    out.logs[d] = !l ? r : (!r ? l : (((r._u||0) > (l._u||0)) ? r : l));
  }
  // cycles + practice: additive union (never lose a logged period or practice)
  out.cycles={ starts:[...new Set([...(local.cycles&&local.cycles.starts||[]), ...(remote.cycles&&remote.cycles.starts||[])])].filter(Boolean).sort() };
  const seen=new Set(), sessions=[];
  for(const s of [...(local.practice&&local.practice.sessions||[]), ...(remote.practice&&remote.practice.sessions||[])]){ if(!s) continue; const id=(s.ts||"")+"|"+(s.key||"")+"|"+(s.type||""); if(!seen.has(id)){ seen.add(id); sessions.push(s); } }
  out.practice={ sessions };
  // profile: newer side wins per-field, but goals are unioned and onboarded is sticky
  out.profile = rNewer ? Object.assign({}, local.profile, remote.profile) : Object.assign({}, remote.profile, local.profile);
  out.profile.goals=[...new Set([...((local.profile&&local.profile.goals)||[]), ...((remote.profile&&remote.profile.goals)||[])])];
  out.profile.onboarded = !!((local.profile&&local.profile.onboarded) || (remote.profile&&remote.profile.onboarded));
  // reminders: per-key, newer side wins (so a key one device hasn't seen yet isn't wiped)
  out.reminders={}; const lR=(local.reminders||{}), rR=(remote.reminders||{});
  for(const k of new Set([...Object.keys(lR), ...Object.keys(rR)])) out.reminders[k]= rNewer ? (rR[k]||lR[k]) : (lR[k]||rR[k]);
  out.meta={ updatedAt: Math.max(remote.meta&&remote.meta.updatedAt||0, local.meta&&local.meta.updatedAt||0) };
  return normalizeState(out);
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
      const merged = mergeState(snap.data(), S);
      if(JSON.stringify(merged)===JSON.stringify(S)) return; // already converged — no wall-clock gate, so a clock-skewed device can't drop genuinely newer edits
      this.applyingRemote = true;
      S = merged; persistLocal();
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

/* ---- living affirmation: cycle phase × her state today (body · mind · spirit) ---- */
const MOOD_STATE = { Depleted:"low", Foggy:"low", Tender:"low", Flat:"low", Anxious:"activated", Irritable:"activated", Steady:"steady", Content:"steady", Calm:"steady", Connected:"steady", Energized:"high", Radiant:"high" };
function logMoods(log){ if(!log) return []; if(Array.isArray(log.moods)) return log.moods; if(log.mood) return [log.mood]; return []; } // multi-select, back-compat with old single mood
function moodsToState(moods){ if(!moods||!moods.length) return null; const states=moods.map(m=>MOOD_STATE[m]).filter(Boolean); for(const pri of ["activated","low","high","steady"]) if(states.includes(pri)) return pri; return null; } // address distress first, then low energy, then high, then steady
function pickAffirmation(idx, log){
  const fallback = C.phases[idx].affirmation;
  const lib = C.affirmations && C.affirmations.byPhase;
  if(!lib) return fallback;
  const pa = lib.find(p=>p.phaseKey===PHASE_META[idx].key);
  if(!pa) return fallback;
  let stateKey = moodsToState(logMoods(log));
  if(!stateKey && log && log.energy) stateKey = log.energy<=2 ? "low" : (log.energy===3 ? "steady" : "high");
  if(!stateKey && log && log.health && log.health.sleepHours!=null && log.health.sleepHours<6) stateKey="low"; // a tired body, from Apple Health
  if(!stateKey) return pa.default || fallback;     // not checked in yet → phase anchor
  const st = (pa.states||[]).find(s=>s.stateKey===stateKey);
  if(!st || !st.affirmations || !st.affirmations.length) return pa.default || fallback;
  return st.affirmations[new Date().getDate() % st.affirmations.length]; // rotate daily, stable within a day
}

/* ---- goals & personalization ---- */
function selectedGoals(){ return (S.profile.goals||[]).map(k=>(C.goals||[]).find(g=>g.key===k)).filter(Boolean); }
function goalFocus(kind){ const set=new Set(); selectedGoals().forEach(g=>(g[kind]||[]).forEach(x=>set.add(x))); return [...set]; }
function rotatingGoalTip(){ const tips=[...goalFocus("focusPractices"),...goalFocus("focusFoods")]; return tips.length ? tips[new Date().getDate()%tips.length] : ""; }
function goalMatch(name){ // does this guidance item support a selected goal? (conservative substring match)
  if(!selectedGoals().length) return false;
  const base=name.toLowerCase().split(" (")[0].split(",")[0].trim();
  if(base.length<4) return false;
  return [...goalFocus("focusHerbs"),...goalFocus("focusFoods")].some(f=>{ const ff=f.toLowerCase(); return ff.includes(base) || base.includes(ff.split(" (")[0].split(",")[0].trim()); });
}

/* ============================================================
   FORECAST — the "weather forecast for her body"
   Pure OUTPUT: looks ahead from the adaptive cycle engine and
   names what's coming in a warm, glanceable way. No inputs.
   ============================================================ */
const Forecast = {
  // next `days` days, each tagged with phase idx + cycle day + event markers
  strip(days=8){
    if(!Cycle.hasData()) return [];
    const out=[];
    for(let i=0;i<days;i++){
      const ds=addDays(todayISO(),i); const inf=Cycle.info(ds); if(!inf) break;
      const pmsStart=Math.max(inf.ovDay+2, inf.len-5);
      out.push({ ds, i, idx:inf.idx, day:inf.day, len:inf.len, ovDay:inf.ovDay, plen:inf.plen,
        isPeriod: inf.day<=inf.plen,
        isOvuPeak: inf.day===inf.ovDay,
        isPmsOnset: inf.day===pmsStart });
    }
    return out;
  },
  // nearest notable event ahead, with supportive framing (the headline of the forecast)
  upcoming(){
    const inf=Cycle.info(); if(!inf) return null;
    const {day,len,ovDay,daysUntilNext}=inf;
    const pmsStart=Math.max(ovDay+2, len-5);
    const est = inf.count<2; // single logged period → it's an estimate, say so gently
    const ev=[];
    if(day<ovDay) ev.push({ in:ovDay-day, tone:"bright", emoji:"☀️", title:"Ovulation",
      line:"energy, mood, and libido often peak — a strong window for big conversations, creative work, and harder training." });
    if(day<pmsStart) ev.push({ in:pmsStart-day, tone:"soft", emoji:"🌧️", title:"Premenstrual window",
      line:"sensitivity, cravings, and a need for more rest are normal here. Ease your calendar where you can and be extra kind to yourself." });
    ev.push({ in:daysUntilNext, tone:"deep", emoji:"🌑", title:"Period likely",
      line:"a good time to stock comfort basics — heat, magnesium-rich food, easy meals — and plan a softer few days." });
    ev.sort((a,b)=>a.in-b.in);
    const next=ev.find(e=>e.in>=0) || ev[0];
    next.est=est; next.date=addDays(todayISO(), next.in);
    return next;
  },
  // a one-line "today's outlook" in weather voice, tuned to the current phase
  outlook(){
    const inf=Cycle.info(); if(!inf) return "";
    return [
      "Inner winter — low and restorative. Permission to slow down; your body is doing quiet work.",
      "Inner spring — energy rising. A good stretch to start things and lean into momentum.",
      "Inner summer — your peak. Connection, confidence, and output usually come easiest now.",
      "Inner autumn — winding down. Focus turns inward; protect your energy and finish gently."
    ][inf.idx];
  }
};

/* ============================================================
   INSIGHTS — gentle pattern reports over her own logs.
   Blends real detection (her data) with vetted, warm copy
   (GATA.insights templates). Surfaces ONE at a time on Today;
   the Cycle tab shows the fuller picture. A friend that notices,
   not a dashboard that demands.
   ============================================================ */
function insightById(id){ return (C.insights||[]).find(i=>i.id===id); }
const Insights = {
  phaseOf(ds){ const inf=Cycle.info(ds); return inf?inf.idx:null; },
  loggedDates(){ return Object.keys(S.logs||{}).filter(d=>ISO_RE.test(d)).sort(); },
  // returns an array of {id, headline, interpretation, suggestion, evidence, tone}
  detect(){
    const out=[]; const logs=S.logs||{}; const dates=this.loggedDates();
    const SEASON=i=>PHASE_META[i].season.toLowerCase();
    const SYMPMAP={0:"sp-menstrual-symptom-concentration",1:"sp-follicular-symptom-low",2:"sp-ovulation-symptom-load",3:"sp-late-luteal-symptom-cluster"};

    // 1) symptom × phase clustering
    if(Cycle.hasData()){
      const withS=dates.filter(d=>(logs[d].symptoms||[]).length);
      if(withS.length>=5){
        const by={};
        withS.forEach(d=>{ const idx=this.phaseOf(d); if(idx==null) return; (logs[d].symptoms||[]).forEach(s=>{ (by[s]=by[s]||[0,0,0,0])[idx]++; }); });
        let best=null;
        for(const s in by){ const arr=by[s], total=arr.reduce((a,b)=>a+b,0); if(total<3) continue;
          const mi=arr.indexOf(Math.max(...arr)), frac=arr[mi]/total;
          if(frac>=0.55 && (!best||total>best.total)) best={s,idx:mi,total,frac}; }
        if(best){
          const dig=/digest|bloat|nausea|cravings/i.test(best.s);
          const t=insightById(dig&&best.idx>=2?"sp-digestive-perimenstrual":SYMPMAP[best.idx]);
          if(t) out.push({ id:t.id, tone: best.idx===1?"bright":"soft",
            headline:`Your ${SEASON(best.idx)} and your ${esc(best.s.toLowerCase())} keep showing up together`,
            interpretation:t.interpretation, suggestion:t.suggestion,
            evidence:`${Math.round(best.frac*100)}% of the times you logged ${best.s.toLowerCase()} fell in your ${PHASE_META[best.idx].label.toLowerCase()} phase (${best.total} logs).` });
        }
      }
    }

    // 2) mood × cycle
    if(Cycle.hasData()){
      const withM=dates.filter(d=>logMoods(logs[d]).length);
      if(withM.length>=6){
        let lutLowDays=0, follPosDays=0, lutTotal=0, follTotal=0;
        withM.forEach(d=>{ const idx=this.phaseOf(d); if(idx==null) return; const st=moodsToState(logMoods(logs[d]));
          if(idx===3){ lutTotal++; if(st==="low"||st==="activated") lutLowDays++; }
          if(idx===1){ follTotal++; if(st==="high"||st==="steady") follPosDays++; } });
        if(lutTotal>=3 && lutLowDays/lutTotal>=0.6){
          const irr=withM.some(d=>this.phaseOf(d)===3 && logMoods(logs[d]).includes("Irritable"));
          const t=insightById(irr?"mc-irritability-late-luteal":"mc-premenstrual-mood-dip");
          if(t) out.push({ id:t.id, tone:"soft",
            headline:`Heavier moods cluster in the days before your period`,
            interpretation:t.interpretation, suggestion:t.suggestion,
            evidence:`On ${lutLowDays} of ${lutTotal} luteal-phase check-ins, you felt tender, low, or on-edge.` });
        } else if(follTotal>=3 && follPosDays/follTotal>=0.6){
          const t=insightById("mc-follicular-mood-lift");
          if(t) out.push({ id:t.id, tone:"bright",
            headline:`Your mood tends to lift in your spring`,
            interpretation:t.interpretation, suggestion:t.suggestion,
            evidence:`${follPosDays} of ${follTotal} follicular-phase check-ins felt steady or bright.` });
        } else if(withM.length>=12){
          const t=insightById("mc-mood-stability-overall");
          if(t) out.push({ id:t.id, tone:"bright",
            headline:`Your mood has been fairly steady across your cycle`,
            interpretation:t.interpretation, suggestion:t.suggestion,
            evidence:`Across ${withM.length} mood check-ins, no single phase dominated the harder days.` });
        }
      }
    }

    // 3) cycle regularity (needs ≥3 logged starts → ≥2 gaps)
    const starts=Cycle.starts();
    if(starts.length>=3){
      const gaps=[]; for(let i=1;i<starts.length;i++){ const g=daysBetween(starts[i-1],starts[i]); if(g>=18&&g<=60) gaps.push(g); }
      if(gaps.length>=2){
        const min=Math.min(...gaps), max=Math.max(...gaps), range=max-min;
        if(range<=4){ const t=insightById("reg-regular-cycle");
          if(t) out.push({ id:t.id, tone:"bright", headline:`Your cycle has been running like clockwork`,
            interpretation:t.interpretation, suggestion:t.suggestion,
            evidence:`Your last ${gaps.length+1} cycles stayed within ${range} day${range===1?"":"s"} of each other (${min}–${max} days).` });
        } else if(range>=8){ const t=insightById("reg-variable-cycle-length");
          if(t) out.push({ id:t.id, tone:"neutral", headline:`Your cycle length has been varying a fair bit`,
            interpretation:t.interpretation, suggestion:t.suggestion,
            evidence:`Recent cycles ranged from ${min} to ${max} days. Gata keeps adapting its predictions as you log.` });
        }
      }
    }

    // 4) sleep ↔ energy (from Apple Health + check-ins)
    const pairs=dates.map(d=>({s:logs[d].health&&logs[d].health.sleepHours, e:logs[d].energy})).filter(p=>typeof p.s==="number"&&typeof p.e==="number");
    if(pairs.length>=5){
      const short=pairs.filter(p=>p.s<6.5), rest=pairs.filter(p=>p.s>=6.5);
      if(short.length>=2 && rest.length>=2){
        const avg=a=>a.reduce((x,p)=>x+p.e,0)/a.length;
        if(avg(rest)-avg(short)>=0.8){ const t=insightById("se-post-short-sleep-energy-dip");
          if(t) out.push({ id:t.id, tone:"neutral", headline:`Short nights show up in your energy the next day`,
            interpretation:t.interpretation, suggestion:t.suggestion,
            evidence:`After nights under 6.5h, your energy averaged about a point lower than after fuller sleep.` });
        }
      }
    }

    // 5) logging momentum (always available — a kind nudge of progress)
    const streak=streakCount();
    if(streak>=5){ const t=insightById("pc-logging-streak-momentum");
      if(t) out.push({ id:t.id, tone:"bright", headline:`${streak} days of showing up for yourself`,
        interpretation:t.interpretation, suggestion:t.suggestion,
        evidence:`Every check-in sharpens Gata's picture of your unique rhythm.` });
    }
    return out;
  },
  // strongest single insight for the Today card (rotates daily when several exist)
  top(){ const f=this.detect(); if(!f.length) return null; return f[(new Date().getDate())%f.length]; }
};

/* ---- 8) Accent theming ---- */
function setAccent(idx){
  const m=PHASE_META[idx] ?? PHASE_META[0];
  const dark=document.documentElement.getAttribute("data-theme")==="dark";
  document.documentElement.style.setProperty("--accent", m.accent);
  document.documentElement.style.setProperty("--accent-ink", dark?m.inkDark:m.ink);
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

/* ---- TODAY render helpers (forecast + insight cards) ---- */
function forecastCardHTML(){
  const up=Forecast.upcoming(); const strip=Forecast.strip(8);
  if(!up || !strip.length) return "";
  const DOW=["Su","Mo","Tu","We","Th","Fr","Sa"];
  const cells=strip.map(d=>{
    const m=PHASE_META[d.idx]; const dt=parseISO(d.ds);
    const mark = d.i===0 ? "•" : d.isOvuPeak ? "☀️" : d.isPmsOnset ? "🌧️" : d.isPeriod ? "🌑" : "";
    return `<div class="fc-day ${d.i===0?"today":""}">
      <div class="dow">${d.i===0?"Today":DOW[dt.getDay()]}</div>
      <div class="dnum">${dt.getDate()}</div>
      <div class="dbar" style="background:${m.accent}"></div>
      <div class="dmark">${mark}</div>
    </div>`;
  }).join("");
  const when = up.in===0?"today":up.in===1?"tomorrow":`in ~${up.in} days`;
  return `<div class="card">
    <div class="section-label">The week ahead</div>
    <div class="fc-headline">
      <div class="fe">${up.emoji}</div>
      <div class="ft"><b>${esc(up.title)} ${when}</b>${up.est?` <span class="muted">(early estimate)</span>`:""} — ${esc(up.line)}</div>
    </div>
    <div class="forecast-strip">${cells}</div>
    <div class="fc-outlook">${esc(Forecast.outlook())}</div>
  </div>`;
}
function insightCardHTML(){
  const ins=Insights.top(); if(!ins) return "";
  return `<div class="insight">
    <div class="section-label" style="color:var(--accent)">✦ Gata noticed</div>
    <div class="ih">${esc(ins.headline)}</div>
    <div class="ib">${esc(ins.interpretation)}</div>
    <div class="isug"><b>A gentle idea:</b> ${esc(ins.suggestion)}</div>
    <div class="iev">${esc(ins.evidence)}</div>
  </div>`;
}

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
  const moodChips=C.tracking.moods.map(m=>`<div class="pill ${logMoods(log).includes(m)?"sel":""}" data-mood="${esc(m)}">${esc(m)}</div>`).join("");
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

    ${forecastCardHTML()}

    ${info?`<div class="card"><div class="section-label">Today's focus</div>
      <div class="focus-grid">
        <div class="focus-item"><div class="k">Move</div><div class="v">${esc(ph.workouts[0].type)}</div></div>
        <div class="focus-item"><div class="k">Eat</div><div class="v">${esc(ph.foods[0].name)}</div></div>
        <div class="focus-item"><div class="k">Sip</div><div class="v">${esc(ph.teas[0].name)}</div></div>
        <div class="focus-item"><div class="k">Ease off</div><div class="v">${esc((ph.eatLess[0]||"").split(" (")[0].split(",")[0].split(" —")[0])}</div></div>
      </div>
      <button class="pill" id="goNourish" style="margin-top:12px">🥗 What to eat this phase →</button></div>`:""}

    ${insightCardHTML()}

    ${selectedGoals().length?`<div class="card"><div class="section-label">Your focus</div>
      <div class="chips" style="margin-bottom:${rotatingGoalTip()?"10px":"0"}">${selectedGoals().map(g=>`<span class="pill sel">${esc(g.label)}</span>`).join("")}</div>
      ${rotatingGoalTip()?`<div style="font-size:13.5px"><b style="color:var(--accent)">Today, lean into:</b> ${esc(rotatingGoalTip())}</div>`:""}
    </div>`:""}

    ${log.health?`<div class="card"><div class="section-label">From Apple Health ⌚</div>
      <div class="focus-grid">${healthMetrics(log.health).map(it=>`<div class="focus-item"><div class="k">${esc(it[0])}</div><div class="v">${esc(it[1])}</div></div>`).join("")}</div>
    </div>`:""}

    <div class="card">
      <div class="section-label">Calm, matched to your ${esc(meta.season.toLowerCase())}</div>
      <div class="rec-row">
        ${recBreath?`<button class="rec-card" data-breath="${recBreath.key}"><div class="rk">🫧 Breathe</div><div class="rt">${esc(recBreath.name)}</div><div class="rs">${esc(recBreath.tagline)}</div></button>`:""}
        ${recMed?`<button class="rec-card" data-med="${recMed.key}"><div class="rk">🧘‍♀️ Meditate</div><div class="rt">${esc(recMed.name)}</div><div class="rs">${recMed.durationMin} min · ${esc(recMed.theme)}</div></button>`:""}
      </div>
      <button class="btn calm" id="calmBtn" style="margin-top:12px">Reset my nervous system</button>
    </div>

    <div class="card">
      <div class="section-label">Gata, your companion ✨</div>
      <div class="rec-row">
        <button class="rec-card" id="askGata"><div class="rk">💬 Ask Gata</div><div class="rt">Talk it through</div><div class="rs">Phase-aware answers, anytime</div></button>
        <button class="rec-card" id="yapGata"><div class="rk">🎙️ Yapping</div><div class="rt">Say what you ate</div><div class="rs">Nutrient read + gentle ideas</div></button>
      </div>
    </div>

    <div class="affirm">${esc(pickAffirmation(idx, log))}”${(logMoods(log).length||log.energy)?`<div style="font-family:var(--sans);font-style:normal;font-size:10.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--accent);margin-top:14px;opacity:.85">✦ for you, right now</div>`:""}</div>

    <div class="card">
      <div class="section-label">Daily check-in</div>
      <div style="font-size:13px;font-weight:600;margin-bottom:8px">${esc(C.tracking.energyScaleLabel)}</div>
      <div class="energy-row" id="energyRow">${energyDots}</div>
      <div style="font-size:13px;font-weight:600;margin:16px 0 8px">How are you feeling? <span class="muted" style="font-weight:400">(tap all that fit)</span></div>
      <div class="chips" id="moodChips">${moodChips}</div>
      <div style="font-size:13px;font-weight:600;margin:16px 0 8px">Anything in your body? <span class="muted" style="font-weight:400">(tap any)</span></div>
      <div class="chips" id="sympChips">${sympChips}</div>
      <div style="font-size:13px;font-weight:600;margin:18px 0 4px">Notes</div>
      <textarea id="noteBox" placeholder="${esc(C.tracking.logPrompts[promptIdx])}">${esc(log.note||"")}</textarea>
    </div>

    <div class="card">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div class="section-label" style="margin:0">Daily anchors</div>
        ${(()=>{ const c=checkinsThisCycle(); return c>0?`<div class="streak">🌿 ${c} check-in${c===1?"":"s"} this cycle</div>`:""; })()}
      </div>
      <div style="font-size:12px;color:var(--text-soft);margin-bottom:6px">The things that steady hormones every day, whatever the phase.</div>
      <div id="habitList">${habits}</div>
    </div>

    <button class="btn" id="saveBtn">Save today</button>
    <div class="center muted" style="font-size:11px;margin-top:14px;padding:0 10px">Gata is wellness education, not medical advice. <a class="link" id="openSafety">Read the safety note →</a></div>
  </div>`;

  $("energyRow").onclick=e=>{const d=e.target.closest("[data-energy]"); if(!d)return; setLog("energy", (S.logs[todayISO()]||{}).energy===+d.dataset.energy?null:+d.dataset.energy); renderToday();};
  $("moodChips").onclick=e=>{const d=e.target.closest("[data-mood]"); if(!d)return; toggleMood(d.dataset.mood); renderToday();};
  $("sympChips").onclick=e=>{const d=e.target.closest("[data-symp]"); if(!d)return; toggleSymptom(d.dataset.symp); renderToday();};
  $("habitList").onclick=e=>{const d=e.target.closest("[data-habit]"); if(!d)return; toggleHabit(+d.dataset.habit); renderToday();};
  $("noteBox").oninput=e=>setLog("note",e.target.value);
  $("saveBtn").onclick=()=>{ toast(commit() ? "Saved ✓" : "Couldn't save on this device — storage may be full or in Private Mode"); };
  $("calmBtn").onclick=()=>Breath.open(map.recommendedBreath[0]);
  $("goPhase").onclick=()=>{ activePhaseTab=idx; switchTab("phases"); };
  { const gn=$("goNourish"); if(gn) gn.onclick=openNourishSheet; }
  { const ag=$("askGata"); if(ag) ag.onclick=()=>Ask.open(); const yg=$("yapGata"); if(yg) yg.onclick=()=>Yap.open(); }
  $("openSafety").onclick=openSafetySheet;
  main.querySelectorAll("[data-breath]").forEach(b=>b.onclick=()=>Breath.open(b.dataset.breath));
  main.querySelectorAll("[data-med]").forEach(b=>b.onclick=()=>Med.open(b.dataset.med));
}
function setLog(k,v){ const t=todayISO(); S.logs[t]=S.logs[t]||{}; if(v===null) delete S.logs[t][k]; else S.logs[t][k]=v; S.logs[t]._u=Date.now(); commit(); }
function toggleSymptom(s){ const t=todayISO(); S.logs[t]=S.logs[t]||{}; const a=S.logs[t].symptoms||[]; const i=a.indexOf(s); i>=0?a.splice(i,1):a.push(s); S.logs[t].symptoms=a; S.logs[t]._u=Date.now(); commit(); }
function toggleMood(m){ const t=todayISO(); S.logs[t]=S.logs[t]||{}; const a=logMoods(S.logs[t]).slice(); const i=a.indexOf(m); i>=0?a.splice(i,1):a.push(m); S.logs[t].moods=a; if("mood" in S.logs[t]) delete S.logs[t].mood; S.logs[t]._u=Date.now(); commit(); }
function toggleHabit(i){ const t=todayISO(); S.logs[t]=S.logs[t]||{}; const h=S.logs[t].habits||{}; h[i]=!h[i]; S.logs[t].habits=h; S.logs[t]._u=Date.now(); commit(); }
function loggedOn(l){ return !!(l&&(l.energy||l.mood||(l.moods&&l.moods.length)||(l.symptoms&&l.symptoms.length)||l.note||(l.nutrition&&l.nutrition.length)||(l.habits&&Object.values(l.habits).some(Boolean)))); }
function streakCount(){ let n=0,d=new Date(); for(;;){ if(loggedOn(S.logs[iso(d)])){n++; d.setDate(d.getDate()-1);} else break; } return n; }
/* gap-forgiving, no-shame: how many days she's checked in since this cycle began
   (or in the last 30 days if no cycle data). Never resets to zero for a missed day. */
function checkinsThisCycle(){
  const start = Cycle.lastStart() || iso((()=>{ const d=new Date(); d.setDate(d.getDate()-29); return d; })());
  let n=0; const today=todayISO();
  for(const d in S.logs){ if(ISO_RE.test(d) && d>=start && d<=today && loggedOn(S.logs[d])) n++; }
  return n;
}

/* ---- PHASES ---- */
function renderPhases(){
  const info=Cycle.info(); const curIdx=info?info.idx:-1;
  setAccent(activePhaseTab);
  const ph=C.phases[activePhaseTab], meta=PHASE_META[activePhaseTab];
  const map=C.practiceMap.byPhase.find(p=>p.phaseKey===meta.key);
  const tabs=PHASE_META.map((m,i)=>`<div class="phase-tab ${i===activePhaseTab?"active":""}" data-ptab="${i}" style="${i===activePhaseTab?`background:${m.accent}`:""}"><div class="e">${m.emoji}</div><div class="l">${m.label}</div></div>`).join("");
  const itemList=(arr,nk,wk,flag)=>arr.map(x=>`<div class="item"><div class="nm">${esc(x[nk])} ${flag&&isFlagged(x[nk])?`<span class="flag-tag" data-flagopen="1">⚠ check first</span>`:""}${goalMatch(x[nk])?`<span class="rec-badge">★ your goals</span>`:""}</div><div class="wy">${esc(x[wk])}</div>${x.caution?`<div class="caution">⚠️ ${esc(x.caution)}</div>`:""}</div>`).join("");
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
  } else if(calmTab==="tap"){
    const e=C.eft||{};
    const seqs=(e.sequences||[]).map(s=>`<div class="lib-card" data-eft="${s.key}"><div><div class="lt">${esc(s.name)}</div><div class="ls">${esc(s.concern)}</div><div class="lmeta">${s.durationMin} min · tap to start</div></div><div class="play">▶</div></div>`).join("");
    const pts=(e.points||[]).slice().sort((a,b)=>a.order-b.order).map(p=>`<div class="item"><div class="nm"><span class="rec-badge">${EFT_LABEL[p.key]||"•"}</span> ${esc(p.name)}</div><div class="wy"><b>Where:</b> ${esc(p.location)}<br><b>Good for:</b> ${esc(p.goodFor)}</div></div>`).join("");
    body=`<div class="card"><div class="section-label">Tapping (EFT) 🫶</div>
      <div class="sd" style="margin-bottom:12px">${esc(e.overview||"")}</div>${seqs}</div>
      <div class="acc" data-acc="eftpts"><div class="acc-head"><span><span class="ico">📍</span>The tapping points</span><span class="chev">›</span></div>
        <div class="acc-body"><div style="text-align:center;margin:6px 0 10px" id="eftStaticDiagram"></div>${pts}</div></div>
      <div class="card" style="box-shadow:none"><div class="sd"><b>Good to know:</b> ${esc(e.evidenceNote||"")}</div><div class="caution" style="margin-top:10px">⚠️ ${esc(e.caution||"")}</div></div>`;
  } else {
    const micro=C.practiceMap.reminders.microPractices.map((m,i)=>`<div class="micro" ${m.pattern?`data-breath="${m.pattern}" style="cursor:pointer"`:""}><div class="mn">${esc(m.name)} <span class="muted" style="font-weight:400">· ${m.seconds}s${m.pattern?" · tap to start":""}</span></div><div class="mh">${esc(m.how)}</div></div>`).join("");
    const rit=(arr)=>arr.map(r=>`<div class="item"><div class="nm">${esc(r.name)} <span class="muted" style="font-weight:400;font-size:12px">· ${r.minutes}m</span></div><div class="wy">${esc(r.how)}</div></div>`).join("");
    body=`<div class="card"><div class="section-label">Soundscapes 🎧</div>
      <div class="sd" style="margin-bottom:10px">Play a calming sound on its own, or pick one and it comes with you into breathwork &amp; meditation.</div>
      ${soundChipsHTML()}
      <div class="vol-row"><span class="muted" style="font-size:12px">Volume</span><input type="range" id="soundVol" min="0" max="1" step="0.05" value="${Soundscape.vol()}"></div></div>
      <div class="card"><div class="section-label">Quick resets · 30–90 seconds</div>${micro}</div>
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
    <div class="seg-tabs">${tabBtn("breathe","🫧 Breathe")}${tabBtn("meditate","🧘‍♀️ Meditate")}${tabBtn("tap","🫶 Tap")}${tabBtn("reset","🌿 Reset")}</div>
    ${calmTab!=="reset"?`<div class="muted" style="font-size:13px;margin-bottom:12px">${calmTab==="breathe"?"Evidence-based breathing, with a guided animation. Tap any to begin.":"Gentle guided meditations that unfold on screen. No sound needed."}</div>`:""}
    ${body}
  </div>`;

  main.querySelector(".seg-tabs").onclick=e=>{const b=e.target.closest("[data-ctab]"); if(!b)return; calmTab=b.dataset.ctab; renderCalm();};
  main.querySelectorAll("[data-breath]").forEach(b=>b.onclick=()=>Breath.open(b.dataset.breath));
  main.querySelectorAll("[data-med]").forEach(b=>b.onclick=()=>Med.open(b.dataset.med));
  if(calmTab==="reset"){ wireSoundChips(main); const sv=$("soundVol"); if(sv) sv.oninput=e=>Soundscape.setVolume(+e.target.value); }
  if(calmTab==="tap"){
    main.querySelectorAll("[data-eft]").forEach(c=>c.onclick=()=>EFT.open(c.dataset.eft));
    const sd=$("eftStaticDiagram"); if(sd) sd.innerHTML=eftDiagramSVG(null, true);
    const acc=main.querySelector('[data-acc="eftpts"]'); if(acc) acc.querySelector(".acc-head").onclick=()=>acc.classList.toggle("open");
  }
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
    const l=S.logs[ds]; const logged=l&&(l.energy||l.mood||(l.moods&&l.moods.length)||(l.symptoms&&l.symptoms.length)||l.note);
    const bg=ci?`background:${hexA(col, document.documentElement.getAttribute("data-theme")==="dark"?.30:.18)}`:"";
    cells+=`<div class="cal-cell ${isToday?"today":""}" data-day="${ds}" style="${bg}">
      ${startSet.has(ds)?`<span class="startdot">🩸</span>`:""}
      <span style="${ci?`color:${col};font-weight:700`:""}">${d}</span>${logged?`<span class="logdot"></span>`:""}</div>`;
  }
  const legend=PHASE_META.map(p=>`<span><i style="background:${p.accent}"></i>${p.emoji} ${p.label}</span>`).join("");

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

    ${patternsSectionHTML()}

    <button class="btn ghost" id="markPeriod">🩸 My period started today</button>
    <div class="center muted" style="font-size:11.5px;margin-top:12px">Tap any day to log it or mark a period start. The more you log, the smarter your phases get.</div>
  </div>`;

  $("prevM").onclick=()=>{calMonth.m--; if(calMonth.m<0){calMonth.m=11;calMonth.y--;} renderCycle();};
  $("nextM").onclick=()=>{calMonth.m++; if(calMonth.m>11){calMonth.m=0;calMonth.y++;} renderCycle();};
  $("markPeriod").onclick=()=>{ Cycle.logStart(todayISO()); toast("Period start logged 🩸"); renderCycle(); };
  main.querySelectorAll("[data-day]").forEach(c=>c.onclick=()=>openDaySheet(c.dataset.day));
}

/* the fuller pattern picture — all detected insights, or a kind nudge to keep logging */
function patternsSectionHTML(){
  const all=Insights.detect();
  const loggedCount=Insights.loggedDates().length;
  if(!all.length){
    return `<div class="card">
      <div class="section-label">Patterns Gata sees</div>
      <div class="insight-empty">${loggedCount<5
        ? "As you check in and log a few periods, Gata starts to notice your rhythms — which symptoms travel with which phase, how sleep touches your energy, and more. Nothing to do here yet; just keep showing up for yourself."
        : "No clear patterns are standing out just yet — that's completely normal. Gata keeps watching gently, and the picture sharpens with each cycle you log."}</div>
    </div>`;
  }
  const cards=all.map(i=>`<div class="card" style="box-shadow:none;margin-bottom:12px">
    <div class="ih" style="font-family:var(--serif);font-size:17px;line-height:1.3;margin-bottom:7px">${esc(i.headline)}</div>
    <div class="ib" style="font-size:13.5px;line-height:1.5">${esc(i.interpretation)}</div>
    <div class="isug" style="font-size:13px;line-height:1.5;margin-top:9px"><b style="color:var(--accent)">A gentle idea:</b> ${esc(i.suggestion)}</div>
    <div class="iev" style="font-size:12px;color:var(--text-soft);margin-top:9px;padding-top:9px;border-top:1px solid var(--border)">${esc(i.evidence)}</div>
  </div>`).join("");
  return `<div class="card" style="background:transparent;border:none;box-shadow:none;padding:0;margin-bottom:0">
    <div class="section-label">Patterns Gata sees</div>${cards}
    <div class="center muted" style="font-size:11px;margin-top:2px">Patterns are gentle observations from your own logs — not diagnoses. Bring anything that worries you to a clinician.</div>
  </div>`;
}

/* ---- MORE / SETTINGS ---- */
function renderMore(){
  const p=S.profile, r=S.reminders, theme=p.theme||"auto";
  const u=Sync.user;
  const accountCard = SYNC_AVAILABLE ? (u ? `
      <div class="settings-row">
        <div style="display:flex;align-items:center;gap:12px">
          ${u.photoURL?`<img class="avatar" src="${esc(u.photoURL)}" referrerpolicy="no-referrer" style="object-fit:cover">`:`<div class="avatar">${esc((u.displayName||u.email||"G")[0].toUpperCase())}</div>`}
          <div><div class="sl">${esc(u.displayName||"Signed in")}</div><div class="sd">${esc(u.email||"")} · ✅ synced</div></div>
        </div>
      </div>
      <button class="btn ghost" id="signOut" style="margin-top:6px">Sign out</button>` : `
      <div class="sd" style="margin-bottom:10px">Sign in with Google so your check-ins, cycle, and practice sync across devices and are safely backed up.</div>
      <button class="btn google" id="signIn"><svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.4 5.4 2.6 13.2l7.8 6.1C12.2 13.4 17.6 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.4 5.7C43.9 38 46.5 31.8 46.5 24.5z"/><path fill="#FBBC05" d="M10.4 28.3c-.5-1.5-.8-3.1-.8-4.8s.3-3.3.8-4.8l-7.8-6.1C1 16.1 0 19.9 0 24s1 7.9 2.6 11.4l7.8-6.1z"/><path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.2-5.5l-7.4-5.7c-2 1.4-4.7 2.3-7.8 2.3-6.4 0-11.8-3.9-13.6-9.4l-7.8 6.1C6.4 42.6 14.6 48 24 48z"/></svg>Sign in with Google</button>`)
    : `<div class="sd">Cloud sync isn't configured yet. Your data is saved privately on this device — use Export below to back it up.</div>`;

  const remRow=(key,label,desc)=>{
    const rk=(r&&r[key])||{on:false,time:"08:00"};
    return `
    <div class="settings-row">
      <div><div class="sl">${label}</div><div class="sd">${desc}</div></div>
      <div style="display:flex;align-items:center;gap:10px">
        <input type="time" value="${esc(rk.time||"08:00")}" data-remtime="${key}" style="width:auto">
        <div class="switch ${rk.on?"on":""}" data-remtog="${key}"></div>
      </div>
    </div>`;
  };

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
      <div class="section-label">Your goals</div>
      <div class="sd" style="margin-bottom:10px">What you're working on — Gata spotlights the herbs, foods, and practices that support these across Today and Phases.</div>
      <div class="chips" id="goalChips">${(C.goals||[]).map(g=>`<div class="pill ${(p.goals||[]).includes(g.key)?"sel":""}" data-goal="${g.key}">${esc(g.label)}</div>`).join("")}</div>
    </div>

    <div class="card">
      <div class="section-label">Learn &amp; reference</div>
      <div class="lib-card" data-ref="nourish"><div><div class="lt">🥗 Nourish</div><div class="ls">Phase foods, seed cycling &amp; everyday principles</div></div><div class="muted">›</div></div>
      <div class="lib-card" data-ref="supp"><div><div class="lt">💊 Supplements &amp; herbs</div><div class="ls">A guide tuned to your phase &amp; goals — track what you take</div></div><div class="muted">›</div></div>
      <div class="lib-card" data-ref="labs"><div><div class="lt">🧪 Hormone &amp; lab markers</div><div class="ls">What to test, when, and why it matters</div></div><div class="muted">›</div></div>
      <div class="lib-card" data-ref="learn" style="margin-bottom:0"><div><div class="lt">📖 Understand your hormones</div><div class="ls">Short, warm, science-backed reads</div></div><div class="muted">›</div></div>
    </div>

    <div class="card" id="aiKeyCard">
      <div class="section-label">Gata AI ✨ ${AI.available()?`<span class="rec-badge">on</span>`:""}</div>
      <div class="sd">${AI.available()
        ? "<b>Ask Gata</b> (a companion who knows your phase) and <b>Yapping</b> (speak what you ate → nutrient read) are ready — find them on the Today tab. Nothing to set up. 🤍"
        : "Soon, <b>Ask Gata</b> (a companion who knows your phase) and <b>Yapping</b> (speak what you ate → nutrient read) will live right here on your Today tab — with nothing for you to set up."}</div>
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
      <div class="section-label">Apple Health ⌚</div>
      <div class="sd" style="margin-bottom:10px">Pull in sleep, HRV, resting heart rate, activity, mindful minutes, and your period dates. Your data stays on your phone.</div>
      <a class="btn" href="shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}">⌚ Sync from Apple Health</a>
      <button class="btn ghost" id="healthHelp" style="margin-top:10px">How to set up the sync</button>
      <details style="margin-top:12px">
        <summary class="sl" style="cursor:pointer">Paste Health data manually</summary>
        <textarea id="healthPaste" style="margin-top:8px" placeholder='Paste the JSON your Shortcut produced, e.g. {"sleepHours":7.5,"hrv":62,"steps":8200}'></textarea>
        <button class="btn ghost" id="healthImport" style="margin-top:8px">Import</button>
      </details>
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
  { const gc=$("goalChips"); if(gc) gc.onclick=e=>{const d=e.target.closest("[data-goal]"); if(!d)return; const k=d.dataset.goal; S.profile.goals=S.profile.goals||[]; const i=S.profile.goals.indexOf(k); i>=0?S.profile.goals.splice(i,1):S.profile.goals.push(k); commit(); renderMore();}; }
  main.querySelectorAll("[data-remtog]").forEach(el=>el.onclick=function(){ const k=this.dataset.remtog; r[k].on=!r[k].on; if(r[k].on) Reminders.request(); commit(); this.classList.toggle("on"); Reminders.scheduleAll(); });
  main.querySelectorAll("[data-remtime]").forEach(el=>el.onchange=function(){ r[this.dataset.remtime].time=this.value; commit(); Reminders.scheduleAll(); });
  $("dlIcs").onclick=Reminders.downloadIcs;
  $("themeSeg").onclick=e=>{const b=e.target.closest("[data-th]"); if(!b)return; S.profile.theme=b.dataset.th; commit(); applyTheme(); renderMore();};
  $("expData").onclick=exportData;
  $("impFile").onchange=importData;
  $("resetData").onclick=()=>{ if(confirm("Reset everything on this device? (Cloud data, if signed in, is unaffected.)")){ localStorage.removeItem(LS_KEY); S=loadState(); applyTheme(); render(); } };
  { const hh=$("healthHelp"); if(hh) hh.onclick=openHealthSheet;
    const hi=$("healthImport"); if(hi) hi.onclick=()=>{ const v=($("healthPaste").value||"").trim(); if(v) Health.importPaste(v); else toast("Paste your Health JSON first"); }; }
  $("safetyLink").onclick=openSafetySheet;
  { const rh={nourish:openNourishSheet, supp:openSupplementsSheet, labs:openLabsSheet, learn:openLearnSheet};
    main.querySelectorAll("[data-ref]").forEach(el=>el.onclick=()=>{ const fn=rh[el.dataset.ref]; if(fn) fn(); }); }
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
   SOUNDSCAPES — procedural ambient audio (Web Audio, no files)
   Nature beds + noise colors that loop forever and work offline.
   Playable under breathwork/meditation or on their own.
   ============================================================ */
const SOUNDSCAPES = [
  {key:"none", name:"Silent", emoji:"🤍"},
  {key:"rain", name:"Rain", emoji:"🌧"},
  {key:"ocean", name:"Ocean", emoji:"🌊"},
  {key:"stream", name:"Stream", emoji:"🏞"},
  {key:"wind", name:"Wind", emoji:"🍃"},
  {key:"forest", name:"Forest", emoji:"🌲"},
  {key:"fire", name:"Fireplace", emoji:"🔥"},
  {key:"night", name:"Night", emoji:"🌙"},
  {key:"brown", name:"Deep noise", emoji:"📻"},
  {key:"drone", name:"Warm drone", emoji:"🎐"}
];
const Soundscape = {
  ctx:null, master:null, nodes:[], timers:[], current:"none",
  vol(){ return (S.profile && typeof S.profile.soundVol==="number") ? S.profile.soundVol : 0.6; },
  ensure(){ if(!this.ctx){ const AC=window.AudioContext||window.webkitAudioContext; if(!AC) return false; this.ctx=new AC(); this.master=this.ctx.createGain(); this.master.gain.value=this.vol(); this.master.connect(this.ctx.destination); } if(this.ctx.state==="suspended") this.ctx.resume(); return true; },
  setVolume(v){ if(S.profile){ S.profile.soundVol=v; commit(); } if(this.master&&this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1); },
  noise(seconds, color){ const ctx=this.ctx, len=Math.floor(ctx.sampleRate*seconds), buf=ctx.createBuffer(1,len,ctx.sampleRate), d=buf.getChannelData(0);
    if(color==="brown"){ let last=0; for(let i=0;i<len;i++){ const w=Math.random()*2-1; last=(last+0.02*w)/1.02; d[i]=last*3.5; } }
    else if(color==="pink"){ let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0; for(let i=0;i<len;i++){ const w=Math.random()*2-1; b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759; b2=0.969*b2+w*0.153852; b3=0.8665*b3+w*0.3104856; b4=0.55*b4+w*0.5329522; b5=-0.7616*b5-w*0.016898; d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11; b6=w*0.115926; } }
    else { for(let i=0;i<len;i++) d[i]=Math.random()*2-1; }
    return buf; },
  loop(buf){ const s=this.ctx.createBufferSource(); s.buffer=buf; s.loop=true; return s; },
  filt(type,freq,q){ const f=this.ctx.createBiquadFilter(); f.type=type; f.frequency.value=freq; if(q!=null) f.Q.value=q; return f; },
  gain(v){ const g=this.ctx.createGain(); g.gain.value=v; return g; },
  lfo(freq, depth, targetParam, base){ const o=this.ctx.createOscillator(); o.frequency.value=freq; const g=this.gain(depth); o.connect(g); g.connect(targetParam); if(base!=null) targetParam.value=base; o.start(); this.nodes.push(o); },
  play(key){ if(!this.ensure()) return; this.stop(); this.current=key; if(key==="none") return; const ctx=this.ctx, push=n=>{ try{n.start&&n.start();}catch(e){} this.nodes.push(n); };
    if(key==="brown"){ const s=this.loop(this.noise(3,"brown")); s.connect(this.gain(0.55)).connect(this.master); push(s); }
    else if(key==="rain"){ const s=this.loop(this.noise(3,"pink")); const hp=this.filt("highpass",500); const bp=this.filt("bandpass",2000,0.6); const g=this.gain(0.6); s.connect(hp).connect(bp).connect(g).connect(this.master); push(s); }
    else if(key==="ocean"){ const s=this.loop(this.noise(4,"brown")); const lp=this.filt("lowpass",650,0.5); const g=this.gain(0.5); s.connect(lp).connect(g).connect(this.master); push(s); this.lfo(0.07,0.45,g.gain,0.5); }
    else if(key==="stream"){ const s=this.loop(this.noise(3,"white")); const bp=this.filt("bandpass",2600,0.6); const g=this.gain(0.4); s.connect(bp).connect(g).connect(this.master); push(s); this.lfo(0.4,0.08,g.gain,0.4); }
    else if(key==="wind"){ const s=this.loop(this.noise(4,"pink")); const bp=this.filt("bandpass",500,3); const g=this.gain(0.5); s.connect(bp).connect(g).connect(this.master); push(s); this.lfo(0.06,340,bp.frequency,500); this.lfo(0.05,0.25,g.gain,0.5); }
    else if(key==="forest"){ const s=this.loop(this.noise(4,"pink")); const lp=this.filt("lowpass",1100); const g=this.gain(0.28); s.connect(lp).connect(g).connect(this.master); push(s); this.lfo(0.05,0.1,g.gain,0.28); this.timers.push(setInterval(()=>{ if(Math.random()<0.6) this.chirp(); }, 2200)); }
    else if(key==="fire"){ const s=this.loop(this.noise(4,"brown")); const lp=this.filt("lowpass",480); const g=this.gain(0.5); s.connect(lp).connect(g).connect(this.master); push(s); this.timers.push(setInterval(()=>{ const n=1+Math.floor(Math.random()*3); for(let i=0;i<n;i++) setTimeout(()=>this.crackle(), Math.random()*450); }, 650)); }
    else if(key==="night"){ const s=this.loop(this.noise(4,"brown")); const lp=this.filt("lowpass",300); const g=this.gain(0.32); s.connect(lp).connect(g).connect(this.master); push(s); this.timers.push(setInterval(()=>{ if(Math.random()<0.8) this.cricket(); }, 1500)); }
    else if(key==="drone"){ [110,164.81,220].forEach((f,i)=>{ const o=ctx.createOscillator(); o.type=i===2?"sine":"triangle"; o.frequency.value=f; o.detune.value=(i-1)*4; o.connect(this.gain(i===0?0.16:0.08)).connect(this.master); o.start(); this.nodes.push(o); }); }
  },
  chirp(){ const ctx=this.ctx,o=ctx.createOscillator(),g=this.gain(0),base=1900+Math.random()*1700; o.frequency.setValueAtTime(base,ctx.currentTime); o.frequency.exponentialRampToValueAtTime(base*1.5,ctx.currentTime+0.08); o.connect(g).connect(this.master); g.gain.setValueAtTime(0.0001,ctx.currentTime); g.gain.linearRampToValueAtTime(0.05,ctx.currentTime+0.02); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.18); o.start(); o.stop(ctx.currentTime+0.2); },
  crackle(){ const ctx=this.ctx,s=ctx.createBufferSource(); s.buffer=this.noise(0.05,"white"); const bp=this.filt("bandpass",1500+Math.random()*1500,1),g=this.gain(0); s.connect(bp).connect(g).connect(this.master); g.gain.setValueAtTime(0.0001,ctx.currentTime); g.gain.linearRampToValueAtTime(0.04+Math.random()*0.1,ctx.currentTime+0.005); g.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+0.06); s.start(); s.stop(ctx.currentTime+0.08); },
  cricket(){ const ctx=this.ctx,o=ctx.createOscillator(),g=this.gain(0); o.frequency.value=4200+Math.random()*400; o.connect(g).connect(this.master); const t0=ctx.currentTime; for(let i=0;i<6;i++){ const t=t0+i*0.06; g.gain.setValueAtTime(0.0001,t); g.gain.linearRampToValueAtTime(0.025,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+0.04); } o.start(t0); o.stop(t0+0.42); },
  stop(){ this.nodes.forEach(n=>{ try{n.stop&&n.stop();}catch(e){} try{n.disconnect&&n.disconnect();}catch(e){} }); this.nodes=[]; this.timers.forEach(clearInterval); this.timers=[]; this.current="none"; if(this.ctx && this.ctx.state==="running"){ try{ this.ctx.suspend(); }catch(e){} } }
};
function soundChipsHTML(){ return `<div class="sound-row">`+SOUNDSCAPES.map(s=>`<button class="sound-chip ${s.key===Soundscape.current?"on":""}" data-sound="${s.key}">${s.emoji} ${esc(s.name)}</button>`).join("")+`</div>`; }
function wireSoundChips(root){ const r=root.querySelector(".sound-row"); if(!r) return; r.onclick=e=>{ const b=e.target.closest("[data-sound]"); if(!b) return; const k=b.dataset.sound; Soundscape.play(k); if(S.profile){ S.profile.soundscape=k; commit(); } r.querySelectorAll("[data-sound]").forEach(x=>x.classList.toggle("on", x.dataset.sound===k)); }; }
function closeAllPlayers(){ if($("breathOv")) Breath.close(); if($("medOv")) Med.close(); if($("eftOv")) EFT.close(); } // ensure only one player owns the timer/rAF + audio graph at a time

/* ============================================================
   BREATH PLAYER
   ============================================================ */
const Breath = {
  key:"coherence", minutes:null, timer:null, startTs:0, rounds:0, sound:false, haptic:true, audio:null,
  open(key){
    closeAllPlayers();
    if(key) this.key=key;
    const p=breathByKey(this.key)||C.breath.patterns[0]; this.minutes=p.defaultMinutes; this.rounds=0;
    if(S.profile.soundscape && S.profile.soundscape!=="none") Soundscape.play(S.profile.soundscape);
    const ov=document.createElement("div"); ov.className="breath-overlay"; ov.id="breathOv";
    ov.innerHTML=`
      <button class="breath-close" id="bClose">×</button>
      <div class="ov-tools">
        <button id="bSound" class="${this.sound?"":"off"}" title="chime">🔔</button>
        <button id="bHaptic" class="${this.haptic?"":"off"}" title="vibration">📳</button>
      </div>
      <div class="b-sounds">${soundChipsHTML()}</div>
      <div class="breath-count" id="bCount"></div>
      <div class="breath-circle" id="bCircle"></div>
      <div class="breath-txt" id="bTxt">Get comfortable…</div>
      <div class="breath-sub" id="bSub">${esc(p.tagline)}</div>
      <div class="breath-picker" id="bPicker">${C.breath.patterns.map(x=>`<button data-bp="${x.key}" class="${x.key===this.key?"on":""}">${esc(x.name)}</button>`).join("")}</div>
      <div class="len-picker" id="bLen">${[1,3,5,10].map(mm=>`<button data-len="${mm}" class="${mm===this.minutes?"on":""}">${mm}m</button>`).join("")}</div>`;
    document.body.appendChild(ov);
    wireSoundChips(ov);
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
  close(){ clearTimeout(this.timer); if(this.audio){ try{ this.audio.close(); }catch(e){} this.audio=null; } Soundscape.stop(); const ov=$("breathOv"); if(ov) ov.remove(); if(currentTab==="calm") renderCalm(); if(currentTab==="today") renderToday(); }
};

/* ============================================================
   MEDITATION PLAYER
   ============================================================ */
const Med = {
  key:null, total:0, elapsed:0, playing:false, raf:null, lastTick:0, cueIdx:-1, audio:null,
  open(key){
    const m=medByKey(key); if(!m) return; closeAllPlayers(); this.key=key; this.total=m.durationMin*60; this.elapsed=0; this.cueIdx=-1; this.playing=true; this.lastTick=Date.now();
    const R=92, CIRC=2*Math.PI*R;
    if(S.profile.soundscape && S.profile.soundscape!=="none") Soundscape.play(S.profile.soundscape);
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
      <div class="med-controls"><button class="pp" id="mPP">⏸</button></div>
      <div class="m-sounds">${soundChipsHTML()}</div>`;
    document.body.appendChild(ov);
    wireSoundChips(ov);
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
  bell(){ try{ const a=new (window.AudioContext||window.webkitAudioContext)(); const o=a.createOscillator(),g=a.createGain(); o.frequency.value=528; o.type="sine"; o.connect(g); g.connect(a.destination); g.gain.setValueAtTime(.0001,a.currentTime); g.gain.exponentialRampToValueAtTime(.12,a.currentTime+.05); g.gain.exponentialRampToValueAtTime(.0001,a.currentTime+2.5); o.start(); o.stop(a.currentTime+2.6); setTimeout(()=>{ try{ a.close(); }catch(e){} }, 2900);}catch(e){} },
  close(){ cancelAnimationFrame(this.raf); Soundscape.stop(); const ov=$("medOv"); if(ov) ov.remove(); if(currentTab==="calm") renderCalm(); if(currentTab==="today") renderToday(); }
};

/* ============================================================
   EFT TAPPING — labeled face/body diagram + guided player
   ============================================================ */
const EFT_XY = { topOfHead:[110,30], eyebrow:[97,103], sideOfEye:[142,116], underEye:[97,132], underNose:[110,156], chin:[110,178], collarbone:[88,246], underArm:[172,264], karateChop:[46,300] };
const EFT_LABEL = { karateChop:"KC", eyebrow:"1", sideOfEye:"2", underEye:"3", underNose:"4", chin:"5", collarbone:"6", underArm:"7", topOfHead:"8" };
function eftDiagramSVG(activeKey, labels){
  const dots=Object.entries(EFT_XY).map(([k,xy])=>{ const [x,y]=xy, on=k===activeKey, left=x<108;
    const ring = on?`<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="var(--accent)" stroke-width="2"><animate attributeName="r" values="10;19;10" dur="2.1s" repeatCount="indefinite"/><animate attributeName="opacity" values=".9;0;.9" dur="2.1s" repeatCount="indefinite"/></circle>`:"";
    const dot = `<circle cx="${x}" cy="${y}" r="${on?7:5}" fill="${on?'var(--accent)':'none'}" stroke="${on?'var(--accent)':'currentColor'}" stroke-width="1.8"/>`;
    const tx = labels ? `<text x="${left?x-9:x+10}" y="${y+3.4}" font-size="9.5" fill="currentColor" opacity=".75" text-anchor="${left?'end':'start'}">${EFT_LABEL[k]}</text>` : "";
    return ring+dot+tx;
  }).join("");
  return `<svg viewBox="0 0 220 330" width="200" height="300" style="max-width:80%" aria-label="EFT tapping points">
   <g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6">
    <path d="M68 120 C58 72 92 36 110 36 C128 36 162 72 152 120 C150 96 140 70 110 70 C80 70 70 96 68 120 Z" fill="currentColor" fill-opacity=".07" stroke-opacity=".35"/>
    <path d="M110 60 C84 60 70 84 70 116 C70 140 78 162 90 176 C97 184 104 188 110 188 C116 188 123 184 130 176 C142 162 150 140 150 116 C150 84 136 60 110 60 Z" stroke-opacity=".5"/>
    <path d="M70 114 C61 112 59 126 68 132" stroke-opacity=".4"/>
    <path d="M150 114 C159 112 161 126 152 132" stroke-opacity=".4"/>
    <path d="M80 99 C88 94 98 95 104 100" stroke-opacity=".5"/>
    <path d="M140 99 C132 94 122 95 116 100" stroke-opacity=".5"/>
    <path d="M82 114 C88 108 100 108 104 114 C100 120 88 120 82 114 Z" stroke-opacity=".42"/>
    <path d="M116 114 C120 108 132 108 138 114 C132 120 120 120 116 114 Z" stroke-opacity=".42"/>
    <circle cx="93" cy="114" r="2.6" fill="currentColor" fill-opacity=".42" stroke="none"/>
    <circle cx="127" cy="114" r="2.6" fill="currentColor" fill-opacity=".42" stroke="none"/>
    <path d="M110 116 L106 145 C106 150 114 150 114 145" stroke-opacity=".42"/>
    <path d="M99 162 C105 158 115 158 121 162 C115 169 105 169 99 162 Z" stroke-opacity=".42"/>
    <path d="M97 187 L95 216 M123 187 L125 216" stroke-opacity=".4"/>
    <path d="M36 330 C36 256 84 240 110 238 C136 240 184 256 184 330" stroke-opacity=".45"/>
    <path d="M40 289 q3 -9 6 0 M48 288 q3 -10 6 0 M56 289 q3 -9 6 0" stroke-opacity=".4"/>
    <rect x="38" y="290" width="28" height="30" rx="11" stroke-opacity=".45"/>
    <path d="M66 300 q9 -1 7 8 q-5 4 -7 -1" stroke-opacity=".4"/>
   </g>
   ${dots}
  </svg>`;
}
const EFT = {
  seqKey:null, steps:[], i:0, playing:true, timer:null, stepMs:7000,
  open(seqKey){ const seq=(C.eft.sequences||[]).find(s=>s.key===seqKey); if(!seq) return;
    closeAllPlayers();
    this.seqKey=seqKey;
    this.steps=[{point:"karateChop", phrase:seq.setup, label:"Setup — tap the side of your hand and say:"}]
      .concat(seq.rounds.map(r=>({point:r.pointKey, phrase:r.phrase})));
    this.stepMs=Math.max(4500, Math.round(seq.durationMin*60000/this.steps.length));
    this.i=0; this.playing=true;
    const ov=document.createElement("div"); ov.className="med-overlay"; ov.id="eftOv";
    ov.innerHTML=`<button class="breath-close" id="eftClose">×</button>
      <div class="med-title">${esc(seq.name)}</div>
      <div id="eftDiagram" style="color:#efe9f4"></div>
      <div class="med-cue" id="eftPhrase"></div>
      <div class="breath-sub" id="eftPoint" style="min-height:34px"></div>
      <div class="med-controls"><button class="pp" id="eftPP">⏸</button></div>
      <div class="breath-sub" id="eftProg" style="margin-top:14px">tap the diagram to advance</div>`;
    document.body.appendChild(ov);
    $("eftClose").onclick=()=>this.close();
    $("eftPP").onclick=(e)=>{ e.stopPropagation(); this.toggle(); };
    $("eftDiagram").onclick=()=>this.advance();
    this.render(); this.schedule();
  },
  render(){ const st=this.steps[this.i]; const pt=(C.eft.points||[]).find(p=>p.key===st.point);
    $("eftDiagram").innerHTML=eftDiagramSVG(st.point);
    $("eftPhrase").textContent="“"+st.phrase+"”";
    $("eftPoint").textContent= st.label ? st.label : (pt ? pt.name+" — "+pt.location : "");
    $("eftProg").textContent=(this.i+1)+" / "+this.steps.length;
  },
  schedule(){ clearTimeout(this.timer); if(this.playing) this.timer=setTimeout(()=>this.advance(), this.stepMs); },
  advance(){ if(this.i>=this.steps.length-1){ this.finish(); return; } this.i++; this.render(); this.schedule(); },
  toggle(){ this.playing=!this.playing; const b=$("eftPP"); if(b) b.textContent=this.playing?"⏸":"▶"; this.schedule(); },
  finish(){ clearTimeout(this.timer); recordPractice("eft", this.seqKey, this.steps.length*(this.stepMs/1000));
    $("eftPhrase").textContent="Take a breath. Notice how you feel now. 🤍"; $("eftPoint").textContent=""; const b=$("eftPP"); if(b) b.textContent="✓";
    setTimeout(()=>this.close(),2800);
  },
  close(){ clearTimeout(this.timer); const ov=$("eftOv"); if(ov) ov.remove(); if(currentTab==="calm") renderCalm(); }
};

/* ============================================================
   APPLE HEALTH bridge
   HealthKit has no web API, so an Apple Shortcut reads Health and
   hands Gata a JSON payload via the URL *fragment* (#health=…) — the
   fragment stays on-device and is never sent to any server. A paste
   box is the manual fallback. Imported metrics live in the day's log
   and sync with everything else once Google sign-in is on.
   ============================================================ */
const SHORTCUT_NAME = "Gata Health Sync";
function healthMetrics(h){
  const a=[];
  if(h.sleepHours!=null) a.push(["Sleep", (Math.round(h.sleepHours*10)/10)+" h"]);
  if(h.hrv!=null) a.push(["HRV", Math.round(h.hrv)+" ms"]);
  if(h.restingHR!=null) a.push(["Resting HR", Math.round(h.restingHR)+" bpm"]);
  if(h.steps!=null) a.push(["Steps", Math.round(h.steps).toLocaleString()]);
  if(h.activeEnergy!=null) a.push(["Active", Math.round(h.activeEnergy)+" kcal"]);
  if(h.mindfulMinutes!=null) a.push(["Mindful", Math.round(h.mindfulMinutes)+" min"]);
  if(h.workouts) a.push(["Workout", h.workouts]);
  return a;
}
const Health = {
  importFromHash(){
    const h = location.hash || "";
    const m = h.match(/health=([^&]+)/);
    if(!m) return false;
    let obj=null;
    try { obj = JSON.parse(decodeURIComponent(m[1])); }
    catch(e){ try { obj = JSON.parse(atob(decodeURIComponent(m[1]))); } catch(e2){ obj=null; } }
    history.replaceState(null, "", location.pathname + location.search); // clear so it won't re-import
    if(obj){ this.apply(obj); return true; }
    toast("Couldn't read that Health data");
    return false;
  },
  apply(obj){
    const date = (obj.date && /^\d{4}-\d{2}-\d{2}$/.test(obj.date)) ? obj.date : todayISO();
    const num = v => (v===0 || (v && !isNaN(+v))) ? +v : undefined;
    const h = { sleepHours:num(obj.sleepHours), hrv:num(obj.hrv), restingHR:num(obj.restingHR),
      steps:num(obj.steps), activeEnergy:num(obj.activeEnergy), mindfulMinutes:num(obj.mindfulMinutes),
      workouts: obj.workouts ? String(obj.workouts).slice(0,80) : undefined, syncedAt: Date.now() };
    Object.keys(h).forEach(k=> h[k]===undefined && delete h[k]);
    if(Object.keys(h).length<=1 && !obj.periodStart){ toast("No Health values found"); return; }
    S.logs[date] = S.logs[date] || {};
    S.logs[date].health = Object.assign(S.logs[date].health||{}, h);
    S.logs[date]._u = Date.now();
    let msg = "Synced from Apple Health ✓";
    if(obj.periodStart && /^\d{4}-\d{2}-\d{2}$/.test(obj.periodStart) && !Cycle.starts().includes(obj.periodStart)){
      Cycle.logStart(obj.periodStart); msg = "Apple Health synced · period start added 🩸";
    }
    commit();
    if(S.profile.onboarded) render();
    toast(msg);
  },
  importPaste(text){
    let obj=null; try{ obj=JSON.parse(text); }catch(e){ toast("That isn't valid Health JSON"); return; }
    this.apply(obj);
  }
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
function openHealthSheet(){
  openSheet(`
    <h2>Connect Apple Health ⌚</h2>
    <div class="disclaimer-box" style="margin:12px 0 18px">Apple Health can't talk to a web app directly, so a quick <b>Apple Shortcut</b> reads your Health data and hands it to Gata. You set it up once (~10 min); after that it's one tap. Your data goes straight from your phone into Gata and isn't sent to any server.</div>
    <div class="section-label">One-time setup</div>
    <ul class="lifelist" style="font-size:13.5px">
      <li>Open the <b>Shortcuts</b> app → <b>+</b> → name it exactly <b>“${esc(SHORTCUT_NAME)}”</b>.</li>
      <li>Add a <b>Find Health Samples</b> action for <b>Sleep Analysis</b> (Today), and get the hours. Repeat for <b>Heart Rate Variability</b>, <b>Resting Heart Rate</b>, <b>Steps</b>, <b>Active Energy</b>, <b>Mindful Minutes</b>, and (if your iOS offers it) <b>Menstruation</b>.</li>
      <li>Add a <b>Dictionary</b> with keys: <code>date, sleepHours, hrv, restingHR, steps, activeEnergy, mindfulMinutes, workouts, periodStart</code> — set each value from the matching sample. (Use only the ones you want; missing keys are fine.)</li>
      <li><b>Get text from Dictionary</b> → <b>URL Encode</b> that text.</li>
      <li>Add a <b>Text</b> action: <code>https://randomstorytelling.github.io/gata/#health=</code> then the encoded text.</li>
      <li><b>Open URLs</b> with that text — it bounces back into Gata and imports.</li>
      <li>Optional: add a <b>Personal Automation</b> to run it every morning automatically.</li>
    </ul>
    <div class="section-label" style="margin-top:14px">Then, anytime</div>
    <div class="sd">Tap <b>“Sync from Apple Health”</b> in Settings (it runs the Shortcut and returns with your data), or paste the JSON into the manual box.</div>
    <div class="sd" style="margin-top:10px">Need help building it? Ask Lawrence — the recipe above is all it takes.</div>
    <button class="btn" style="margin-top:16px" onclick="closeSheet()">Got it</button>`);
}
/* ---- Nourish: hormone food + seed cycling, tuned to her phase & goals ---- */
const GOAL_FOOD_MAP = { "regulate-irregular-cycle":"regulate-cycle", "ease-pms-pmdd":"ease-pms", "steadier-energy":"energy", "calmer-mood-anxiety":"mood-anxiety", "clearer-skin":"skin-acne", "perimenopause-support":"perimenopause", "fertility-ttc-support":"regulate-cycle", "better-sleep":"mood-anxiety" };
const FOOD_GOAL_LABEL = { "ease-pms":"Ease PMS", "energy":"Steadier energy", "regulate-cycle":"Cycle regularity", "skin-acne":"Clearer skin", "perimenopause":"Perimenopause", "mood-anxiety":"Calmer mood" };
function openNourishSheet(){
  const f=C.food||{}; const info=Cycle.info(); const idx=info?info.idx:0; const meta=PHASE_META[idx]; const ph=C.phases[idx];
  // seed-cycling window: follicular half (idx 0-1) vs luteal half (idx 2-3)
  const sc=(f.seedCycling||[])[idx<=1?0:1];
  // goal-matched foods
  const wantKeys=new Set((S.profile.goals||[]).map(k=>GOAL_FOOD_MAP[k]).filter(Boolean));
  const goalFoods=(f.byGoal||[]).filter(b=>wantKeys.has(b.goalKey));
  const phaseFoods=(ph.foods||[]).map(x=>`<div class="item"><div class="nm">${esc(x.name)}</div><div class="wy">${esc(x.why)}</div></div>`).join("");
  openSheet(`
    <h2>Nourish</h2>
    <div class="sd" style="margin:2px 0 16px">${meta.emoji} Eating with your <b style="color:var(--accent)">${esc(meta.season.toLowerCase())}</b> — small, kind shifts, not rules.</div>

    <div class="section-label">Lean in this phase</div>
    <div class="card" style="box-shadow:none;margin-bottom:18px">${phaseFoods}</div>

    ${sc?`<div class="section-label">Seed cycling — ${esc(sc.window.split("(")[0].trim())}</div>
    <div class="card" style="background:var(--accent-soft);border-color:transparent;margin-bottom:18px">
      <div class="chips" style="margin-bottom:10px">${sc.seeds.map(s=>`<span class="pill sel">🌱 ${esc(s)}</span>`).join("")}</div>
      <div style="font-size:13px;line-height:1.5">${esc(sc.why)}</div>
    </div>`:""}

    ${goalFoods.length?`<div class="section-label">For your goals</div>
    ${goalFoods.map(b=>`<div class="card" style="box-shadow:none;margin-bottom:12px"><div class="lt" style="font-weight:600;margin-bottom:6px">${esc(FOOD_GOAL_LABEL[b.goalKey]||b.goalKey.replace(/-/g," "))}</div><ul class="lifelist" style="font-size:13px">${b.foods.map(x=>`<li>${esc(x)}</li>`).join("")}</ul><div class="wy" style="font-size:12.5px;color:var(--text-soft);margin-top:4px">${esc(b.why)}</div></div>`).join("")}`:""}

    <div class="section-label">Everyday principles</div>
    <ul class="lifelist" style="font-size:13px;margin-bottom:8px">${(f.principles||[]).map(p=>`<li style="margin-bottom:6px">${esc(p)}</li>`).join("")}</ul>
    <div class="center muted" style="font-size:11px;margin-top:10px">General wellness education, not a meal plan or medical advice.</div>
    <button class="btn" style="margin-top:16px" onclick="closeSheet()">Close</button>`);
}

/* ---- Supplements & herbs: a phase/goal-aware guide + optional personal stack ---- */
function isTakingSupp(name){ return (S.profile.supplements||[]).includes(name); }
function toggleSupp(name){ const a=S.profile.supplements||[]; const i=a.indexOf(name); i>=0?a.splice(i,1):a.push(name); S.profile.supplements=a; commit(); }
function suppRelevantToPhase(s){ const info=Cycle.info(); if(!info) return false; const seasons=["menstrual","luteal","premenstrual","ovulat","follicul"]; const ph=PHASE_META[info.idx].label.toLowerCase(); return new RegExp(ph.slice(0,5),"i").test(s.phase||""); }
function openSupplementsSheet(){
  const items=(C.supplements&&C.supplements.items)||[]; const info=Cycle.info();
  const taking=(S.profile.supplements||[]);
  const row=s=>{
    const flag=s.flagged?`<span class="flag-tag" data-flagopen="1">⚠ check safety</span>`:"";
    const rel=suppRelevantToPhase(s)?`<span class="rec-badge">for your ${esc(PHASE_META[info.idx].label.toLowerCase())}</span>`:"";
    const goalHit=goalMatch(s.name)?`<span class="rec-badge">your goals</span>`:"";
    return `<div class="card" style="box-shadow:none;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div class="lt" style="font-weight:600;font-size:15px">${esc(s.name)} ${flag}${rel}${goalHit}</div>
        <div class="pill ${isTakingSupp(s.name)?"sel":""}" data-supp="${esc(s.name)}" style="flex:none;cursor:pointer">${isTakingSupp(s.name)?"✓ Taking":"+ Track"}</div>
      </div>
      <div class="wy" style="font-size:13px;margin-top:6px">${esc(s.purpose)}</div>
      <div class="focus-grid" style="margin-top:10px">
        <div class="focus-item"><div class="k">Typical</div><div class="v" style="font-size:12.5px">${esc(s.doseRange)}</div></div>
        <div class="focus-item"><div class="k">When</div><div class="v" style="font-size:12.5px">${esc(s.timing)}</div></div>
      </div>
      ${s.note?`<div class="wy" style="font-size:12px;color:var(--text-soft);margin-top:8px"><b>Note:</b> ${esc(s.note)}</div>`:""}
    </div>`;
  };
  openSheet(`
    <h2>Supplements &amp; herbs</h2>
    <div class="disclaimer-box" style="margin:12px 0 16px">${esc((C.supplements&&C.supplements.disclaimer)||"Educational only. Talk with your clinician or pharmacist before starting anything, especially if pregnant, nursing, or on medication.")}</div>
    ${taking.length?`<div class="section-label">Your stack</div><div class="chips" style="margin-bottom:18px">${taking.map(n=>`<span class="pill sel">${esc(n)}</span>`).join("")}</div>`:""}
    <div class="section-label">Browse</div>
    <div id="suppList">${items.map(row).join("")}</div>
    <button class="btn" style="margin-top:8px" onclick="closeSheet()">Close</button>`);
  const list=$("suppList");
  if(list) list.onclick=e=>{
    const fl=e.target.closest("[data-flagopen]"); if(fl){ openSafetySheet(); return; }
    const b=e.target.closest("[data-supp]"); if(!b) return; toggleSupp(b.dataset.supp);
    b.classList.toggle("sel"); b.textContent=isTakingSupp(b.dataset.supp)?"✓ Taking":"+ Track";
    const head=document.querySelector("#sheetOv .section-label"); // refresh "your stack" without losing scroll: cheap re-open
  };
}

/* ---- Lab & hormone markers: what to test, when, and why ---- */
function openLabsSheet(){
  const markers=(C.labs&&C.labs.markers)||[];
  openSheet(`
    <h2>Hormone &amp; lab markers</h2>
    <div class="disclaimer-box" style="margin:12px 0 16px">${esc((C.labs&&C.labs.disclaimer)||"Reference ranges vary by lab, age, and cycle day. Always interpret results with your clinician — these are for understanding, not self-diagnosis.")}</div>
    <div class="sd" style="margin-bottom:14px">A plain-language guide to the markers a clinician might check, and the cycle day that makes each most meaningful.</div>
    ${markers.map(mk=>`<div class="acc" data-acc="lab-${esc(mk.name.replace(/[^a-z]/gi,''))}">
      <div class="acc-head"><span><span class="ico">🧪</span>${esc(mk.name)}</span><span class="chev">›</span></div>
      <div class="acc-body">
        <div class="wy" style="font-size:13px"><b>What it measures:</b> ${esc(mk.measures)}</div>
        <div class="wy" style="font-size:13px;margin-top:8px"><b>Typical range:</b> ${esc(mk.generalRange)}</div>
        <div class="wy" style="font-size:13px;margin-top:8px"><b>Best day to test:</b> ${esc(mk.bestTestDay)}</div>
        <div class="wy" style="font-size:13px;margin-top:8px"><b>Why it matters:</b> ${esc(mk.whyItMatters)}</div>
      </div></div>`).join("")}
    <button class="btn" style="margin-top:16px" onclick="closeSheet()">Close</button>`);
  document.querySelectorAll("#sheetOv [data-acc]").forEach(a=>{ const h=a.querySelector(".acc-head"); if(h) h.onclick=()=>a.classList.toggle("open"); });
}

/* ---- Learn: short, warm hormone explainers ---- */
function openLearnSheet(){
  const arts=(C.education||[]);
  openSheet(`
    <h2>Understand your hormones</h2>
    <div class="sd" style="margin:2px 0 16px">Short, science-backed reads — each ends with one small thing you can do.</div>
    ${arts.map(a=>`<div class="acc" data-acc="edu-${esc((a.title||'').replace(/[^a-z]/gi,'').slice(0,12))}">
      <div class="acc-head"><span><span class="ico">📖</span>${esc(a.title)}</span><span class="chev">›</span></div>
      <div class="acc-body">
        <div class="wy" style="font-size:13.5px;line-height:1.55">${esc(a.body)}</div>
        <div class="card" style="background:var(--accent-soft);border-color:transparent;box-shadow:none;margin-top:12px"><b style="color:var(--accent);font-size:12px">TRY THIS</b><div style="font-size:13px;margin-top:4px">${esc(a.takeaway)}</div></div>
      </div></div>`).join("")}
    <button class="btn" style="margin-top:16px" onclick="closeSheet()">Close</button>`);
  document.querySelectorAll("#sheetOv [data-acc]").forEach(a=>{ const h=a.querySelector(".acc-head"); if(h) h.onclick=()=>a.classList.toggle("open"); });
}

function openDaySheet(ds){
  const ci=Cycle.info(ds), log=S.logs[ds]||{}, meta=ci?PHASE_META[ci.idx]:null;
  const moods=logMoods(log); const has=log.energy||moods.length||(log.symptoms&&log.symptoms.length)||log.note;
  const isStart=Cycle.starts().includes(ds);
  openSheet(`
    <h2>${niceDate(ds)}</h2>
    ${ci?`<div class="muted" style="margin-bottom:14px">${meta.emoji} ${meta.label} · cycle day ${ci.day}</div>`:""}
    ${has?`
      ${log.energy?`<div class="field"><label>Energy</label><div>${"●".repeat(log.energy)}${"○".repeat(5-log.energy)} (${log.energy}/5)</div></div>`:""}
      ${moods.length?`<div class="field"><label>Mood</label><div class="chips">${moods.map(x=>`<span class="pill">${esc(x)}</span>`).join("")}</div></div>`:""}
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
      if(!/^\d{2}:\d{2}$/.test(r.time||"")) return;
      const [h,mi]=r.time.split(":").map(Number); if(isNaN(h)||isNaN(mi)) return;
      const now=new Date(); const next=new Date(); next.setHours(h,mi,0,0); if(next<=now) next.setDate(next.getDate()+1);
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
function importData(e){ const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=()=>{ try{ const d=JSON.parse(r.result); if(d&&typeof d==="object"&&d.profile&&d.logs){ S=normalizeState(d); commit(); applyTheme(); render(); toast("Imported ✓"); } else toast("That file doesn't look right"); }catch(err){ toast("Couldn't read that file"); } }; r.readAsText(f); }

/* ============================================================
   AI LAYER — Ask Gata (streaming chat) + Yapping (nutrient logger)
   Powered by the Gata AI proxy (GATA_AI_PROXY), a tiny serverless
   function that holds the model key and can call Gemini / Claude /
   ChatGPT. The people using Gata set up NOTHING — no keys, no screens.
   The app is fully useful with no proxy configured; AI is additive.
   The proxy normalizes every provider into one shape:
     stream  → SSE of  data:{"text":"…"}  …  data:[DONE]
     json    → { "json": {…} }   |   errors → {"error":"…"}
   ============================================================ */
const AI = {
  available(){ return AI_AVAILABLE; },
  // shared phase/log context so replies are personal and phase-aware
  context(){
    const info=Cycle.info(); const log=S.logs[todayISO()]||{};
    const phase = info ? `${PHASE_META[info.idx].label} phase (inner ${PHASE_META[info.idx].season.toLowerCase()}), cycle day ${info.day} of ~${info.len}` : "an unknown phase (no cycle data yet)";
    const goals = selectedGoals().map(g=>g.label).join(", ") || "none set";
    const moods = logMoods(log).join(", ");
    const recent = [moods&&`feeling ${moods}`, log.energy&&`energy ${log.energy}/5`, (log.symptoms||[]).length&&`noticing ${log.symptoms.join(", ")}`].filter(Boolean).join("; ") || "no check-in today yet";
    const name = S.profile.name || "she";
    return { phase, goals, recent, name };
  },
  chatSystem(){
    const c=this.context();
    return `You are Gata — a warm, grounded companion for ${c.name}'s menstrual-cycle and nervous-system wellbeing. Right now she is in her ${c.phase}. Her focus areas: ${c.goals}. Today: ${c.recent}.

Speak like a wise, caring friend who happens to know a lot about women's hormones — never clinical, never alarmist, body-neutral and affirming. Keep answers concise and practical, tuned to her current phase (foods, herbs, teas, movement, rest, breathwork, nervous-system regulation). When she's struggling, validate first, then offer one or two gentle, doable ideas. You are wellness education, not medical advice; for anything severe, persistent, or worrying, kindly encourage her to see a clinician. Never diagnose or prescribe. Avoid bullet-dumps; write like a real person texting back.`;
  },
  async _post(payload){
    if(!AI_AVAILABLE) throw new Error("Gata AI isn't set up yet.");
    return fetch(GATA_AI_PROXY, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(payload) });
  },
  // streaming chat → calls onText(delta) as tokens arrive; resolves with full text
  async chat(messages, onText){
    const res = await this._post({ stream:true, system:this.chatSystem(), messages });
    if(!res.ok || !res.body){ throw new Error(await this._errText(res)); }
    const reader=res.body.getReader(), dec=new TextDecoder(); let buf="", full="";
    for(;;){ const {done,value}=await reader.read(); if(done) break;
      buf+=dec.decode(value,{stream:true}); let i;
      while((i=buf.indexOf("\n\n"))>=0){ const chunk=buf.slice(0,i); buf=buf.slice(i+2);
        const dl=chunk.split("\n").find(l=>l.startsWith("data:")); if(!dl) continue;
        const data=dl.slice(5).trim(); if(!data||data==="[DONE]") continue;
        try{ const ev=JSON.parse(data);
          if(ev.error){ throw new Error(ev.error); }
          if(typeof ev.text==="string"){ full+=ev.text; onText&&onText(ev.text); }
        }catch(e){ if(e instanceof SyntaxError) continue; throw e; }
      }
    }
    return full;
  },
  // structured one-shot → returns parsed object conforming to schema
  async json(userText, system, schema){
    const res = await this._post({ stream:false, system, messages:[{role:"user",content:userText}], schema });
    if(!res.ok){ throw new Error(await this._errText(res)); }
    const data=await res.json();
    if(data.error) throw new Error(data.error);
    return data.json;
  },
  async _errText(res){
    try{ const j=await res.json(); if(j&&j.error) return j.error; }catch(e){}
    if(res.status>=500) return "Gata's AI is having a moment — please try again shortly.";
    return `Something went wrong (${res.status}). Please try again.`;
  }
};

/* gentle screen shown when AI features are tapped before the proxy is configured */
function aiConnectPromptHTML(blurb){
  return `<div class="ai-connect">
    <div style="font-size:30px">✨</div>
    <div class="ih" style="font-family:var(--serif);font-size:20px;margin:8px 0 6px">Gata's companion is on its way</div>
    <div class="sd" style="font-size:13.5px;line-height:1.5;margin-bottom:14px">${esc(blurb)}</div>
    <div class="sd" style="font-size:12.5px;opacity:.85">This part of Gata is being set up — it'll be here soon, with nothing for you to configure. 🤍</div>
    <button class="btn" style="margin-top:14px" onclick="closeSheet()">Got it</button>
  </div>`;
}

/* ---- Ask Gata: streaming chat companion ---- */
const Ask = {
  msgs: [],
  open(){
    if(!AI.available()){ openSheet(aiConnectPromptHTML("Ask anything about your cycle, symptoms, cravings, mood, or what might help today — Gata answers with your current phase and recent check-ins in mind.")); return; }
    closeAllPlayers();
    const ov=document.createElement("div"); ov.className="overlay"; ov.id="askOv";
    const c=AI.context();
    ov.innerHTML=`<div class="sheet ask-sheet">
      <div class="ask-head"><div><h2 style="margin:0;font-size:22px">Ask Gata</h2><div class="sd">${esc(c.phase)}</div></div><button class="icon-btn" id="askClose">✕</button></div>
      <div class="ask-log" id="askLog"></div>
      <div class="ask-input"><textarea id="askText" rows="1" placeholder="Tell Gata what's on your mind…"></textarea><button class="ask-send" id="askSend">↑</button></div>
    </div>`;
    document.body.appendChild(ov);
    $("askClose").onclick=()=>this.close();
    ov.onclick=e=>{ if(e.target===ov) this.close(); };
    const ta=$("askText");
    ta.oninput=()=>{ ta.style.height="auto"; ta.style.height=Math.min(120,ta.scrollHeight)+"px"; };
    $("askSend").onclick=()=>this.send();
    ta.onkeydown=e=>{ if(e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); this.send(); } };
    this.renderLog();
    if(!this.msgs.length){ this.bubble("assistant", `Hi${S.profile.name?" "+esc(S.profile.name):""} — I'm here. You're in your ${PHASE_META[(Cycle.info()||{idx:0}).idx].season.toLowerCase()} right now. How are you feeling, or what can I help with?`, true); }
    setTimeout(()=>ta.focus(),100);
  },
  renderLog(){ const log=$("askLog"); if(!log) return; log.innerHTML=this.msgs.map(m=>`<div class="ask-msg ${m.role}">${esc(m.content)}</div>`).join(""); log.scrollTop=log.scrollHeight; },
  bubble(role, content, displayOnly){ if(!displayOnly) this.msgs.push({role,content}); else { const log=$("askLog"); if(log){ const d=document.createElement("div"); d.className="ask-msg "+role; d.textContent=content; log.appendChild(d); log.scrollTop=log.scrollHeight; } } },
  async send(){
    const ta=$("askText"); const text=(ta.value||"").trim(); if(!text) return;
    ta.value=""; ta.style.height="auto";
    this.msgs.push({role:"user",content:text}); this.renderLog();
    const log=$("askLog"); const a=document.createElement("div"); a.className="ask-msg assistant typing"; a.textContent="…"; log.appendChild(a); log.scrollTop=log.scrollHeight;
    let acc="";
    try{
      await AI.chat(this.msgs.map(m=>({role:m.role,content:m.content})), (t)=>{ acc+=t; a.classList.remove("typing"); a.textContent=acc; log.scrollTop=log.scrollHeight; });
      if(!acc){ a.textContent="(no response)"; }
      this.msgs.push({role:"assistant",content:acc});
    }catch(e){ a.classList.remove("typing"); a.classList.add("err"); a.textContent="⚠ "+e.message; }
  },
  close(){ const ov=$("askOv"); if(ov) ov.remove(); }
};

/* ---- Yapping: speak or type what you ate → nutrient read + gentle suggestions ---- */
const YAP_SCHEMA = {
  type:"object",
  properties:{
    items:{ type:"array", items:{ type:"object", properties:{ food:{type:"string"}, amount:{type:"string"} }, required:["food"] } },
    nutrients:{ type:"array", items:{ type:"object", properties:{
      name:{type:"string", description:"one of: Magnesium, Zinc, Potassium, Vitamin C, Vitamin D, Iron, Omega-3, Protein, Fiber, Calcium, B6"},
      rating:{type:"string", enum:["low","some","good"]},
      note:{type:"string"} }, required:["name","rating"] } },
    summary:{ type:"string", description:"one warm sentence about what she ate, hormone-supportive lens" },
    suggestions:{ type:"array", items:{type:"string"}, description:"1-3 gentle, specific food/herb ideas to fill gaps, phase-aware, supportive not clinical" }
  },
  required:["items","nutrients","summary"]
};
const Yap = {
  rec: null, listening:false, last:null,
  open(){
    if(!AI.available()){ openSheet(aiConnectPromptHTML("Just say or type what you ate — “oatmeal with berries and a coffee” — and Gata sorts it into the nutrients that matter most for your hormones (magnesium, zinc, potassium, B6, iron, omega-3 and more), then suggests easy ways to fill any gaps.")); return; }
    closeAllPlayers();
    const ov=document.createElement("div"); ov.className="overlay"; ov.id="yapOv";
    const canSpeak = !!(window.SpeechRecognition||window.webkitSpeechRecognition);
    ov.innerHTML=`<div class="sheet yap-sheet">
      <div class="ask-head"><h2 style="margin:0;font-size:22px">Yapping 🍽️</h2><button class="icon-btn" id="yapClose">✕</button></div>
      <div class="sd" style="margin-bottom:14px">Say or type what you ate or drank — Gata reads it for the nutrients your hormones care about.</div>
      ${canSpeak?`<button class="yap-mic" id="yapMic"><span class="micicon">🎙️</span><span id="yapMicTxt">Tap to speak</span></button>`:`<div class="sd" style="margin-bottom:8px">Voice isn't supported in this browser — type below.</div>`}
      <textarea id="yapText" rows="3" placeholder="e.g. Greek yogurt with walnuts and honey, and a spearmint tea"></textarea>
      <button class="btn" id="yapGo" style="margin-top:10px">Analyze</button>
      <div id="yapResult" style="margin-top:16px"></div>
    </div>`;
    document.body.appendChild(ov);
    $("yapClose").onclick=()=>this.close();
    ov.onclick=e=>{ if(e.target===ov) this.close(); };
    $("yapGo").onclick=()=>this.analyze();
    if(canSpeak){ $("yapMic").onclick=()=>this.toggleMic(); }
  },
  toggleMic(){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition; if(!SR) return;
    if(this.listening){ try{ this.rec.stop(); }catch(e){} return; }
    this.rec=new SR(); this.rec.lang="en-US"; this.rec.interimResults=true; this.rec.continuous=true;
    let base=($("yapText").value||"");
    this.rec.onstart=()=>{ this.listening=true; const b=$("yapMic"); if(b) b.classList.add("on"); const t=$("yapMicTxt"); if(t) t.textContent="Listening… tap to stop"; };
    this.rec.onend=()=>{ this.listening=false; const b=$("yapMic"); if(b) b.classList.remove("on"); const t=$("yapMicTxt"); if(t) t.textContent="Tap to speak"; };
    this.rec.onerror=()=>{ this.listening=false; const b=$("yapMic"); if(b) b.classList.remove("on"); };
    this.rec.onresult=(e)=>{ let s=""; for(let i=0;i<e.results.length;i++) s+=e.results[i][0].transcript; $("yapText").value=(base?base+" ":"")+s; };
    try{ this.rec.start(); }catch(e){}
  },
  async analyze(){
    if(this.listening){ try{ this.rec.stop(); }catch(e){} }
    const text=($("yapText").value||"").trim(); if(!text){ toast("Tell Gata what you ate first"); return; }
    const r=$("yapResult"); r.innerHTML=`<div class="center muted" style="padding:16px">Reading your plate…</div>`;
    const c=AI.context();
    const sys=`You are Gata's nutrition lens for women's hormone health. The user describes food/drink; identify the items and estimate how well today's intake (so far) covers hormone-supportive nutrients. Focus on: Magnesium, Zinc, Potassium, Vitamin C, Vitamin D, Iron, Omega-3, Protein, Fiber, Calcium, B6. Rate each you can reasonably assess as low/some/good for a day. She is in her ${c.phase}; her goals: ${c.goals}. Give a warm one-line summary and 1-3 gentle, phase-aware suggestions to fill the biggest gaps (specific foods/teas/herbs). Supportive, not clinical. Wellness education, not medical advice.`;
    try{
      const out=await AI.json(text, sys, YAP_SCHEMA); this.last={text, out, ts:Date.now()};
      this.renderResult(out);
    }catch(e){ r.innerHTML=`<div class="insight" style="background:#fbe3e3;border:none"><b>⚠ ${esc(e.message)}</b></div>`; }
  },
  renderResult(out){
    const r=$("yapResult"); if(!r) return;
    const dot=v=>v==="good"?"#4E9A6B":v==="some"?"#D98A2B":"#B0496B";
    const nuts=(out.nutrients||[]).map(n=>`<div class="nut-row"><span class="nut-dot" style="background:${dot(n.rating)}"></span><span class="nut-name">${esc(n.name)}</span><span class="nut-rate">${esc(n.rating)}</span>${n.note?`<div class="nut-note">${esc(n.note)}</div>`:""}</div>`).join("");
    r.innerHTML=`
      <div class="insight" style="margin-bottom:14px">
        <div class="section-label" style="color:var(--accent)">✦ Gata's read</div>
        <div class="ib" style="font-size:14px">${esc(out.summary||"")}</div>
      </div>
      ${nuts?`<div class="section-label">Hormone-supportive nutrients</div><div class="card" style="box-shadow:none">${nuts}</div>`:""}
      ${(out.suggestions||[]).length?`<div class="section-label">Easy ways to fill gaps</div><ul class="lifelist" style="font-size:13.5px">${out.suggestions.map(s=>`<li style="margin-bottom:6px">${esc(s)}</li>`).join("")}</ul>`:""}
      <button class="btn" id="yapSave" style="margin-top:14px">Save to today's log</button>`;
    const sv=$("yapSave"); if(sv) sv.onclick=()=>this.save();
  },
  save(){
    if(!this.last) return;
    const t=todayISO(); S.logs[t]=S.logs[t]||{};
    const arr=S.logs[t].nutrition||[]; arr.push({ text:this.last.text, summary:this.last.out.summary||"", nutrients:this.last.out.nutrients||[], ts:this.last.ts });
    S.logs[t].nutrition=arr; S.logs[t]._u=Date.now(); commit();
    toast("Saved to today ✓"); this.close();
  },
  close(){ if(this.listening){ try{ this.rec.stop(); }catch(e){} } const ov=$("yapOv"); if(ov) ov.remove(); }
};

/* ============================================================
   ONBOARDING
   ============================================================ */
let obStep=0; const ob={name:"",last:todayISO(),cycle:28,period:5,goals:[]};
function renderOnboarding(){
  $("tabbar").innerHTML=""; $("calmQuick").classList.add("hidden");
  const steps = SYNC_AVAILABLE ? 6 : 5; // welcome, name, cycle, goals, [signin], disclaimer
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
  } else if(obStep===3){
    body=`<h2>What are you working on?</h2><p class="muted" style="margin:6px 0 16px">Pick what matters to you and Gata will spotlight the herbs, foods, and practices that support it. Choose any number, or none.</p>
      <div class="chips" id="obGoals">${(C.goals||[]).map(g=>`<div class="pill ${ob.goals.includes(g.key)?"sel":""}" data-goal="${g.key}">${esc(g.label)}</div>`).join("")}</div>
      <button class="btn" id="obNext" style="margin-top:18px">Next</button>
      <button class="btn ghost" id="obSkip" style="margin-top:10px">Skip</button>`;
  } else if(obStep===4 && SYNC_AVAILABLE){
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
  const og=$("obGoals"); if(og) og.onclick=e=>{const d=e.target.closest("[data-goal]"); if(!d)return; const k=d.dataset.goal, i=ob.goals.indexOf(k); i>=0?ob.goals.splice(i,1):ob.goals.push(k); renderOnboarding();};
  const osi=$("obSignIn"); if(osi) osi.onclick=()=>Sync.signIn();
  const dn=$("obDone"); if(dn) dn.onclick=()=>{
    S.profile.name=ob.name; S.profile.cycleLength=ob.cycle; S.profile.periodLength=ob.period; S.profile.goals=ob.goals; S.profile.onboarded=true;
    Cycle.logStart(ob.last);
    commit(); $("calmQuick").classList.remove("hidden"); currentTab="today"; render();
  };
}

/* ============================================================
   BOOT
   ============================================================ */
$("calmQuick").onclick=()=>Breath.open();
applyTheme();
// Storage-availability check: in Private Mode / disabled storage, warn once that nothing will persist.
(function(){
  let ok=false;
  try{ const k="__gata_probe__"; localStorage.setItem(k,"1"); localStorage.removeItem(k); ok=true; }catch(e){ ok=false; }
  if(!ok) setTimeout(()=>{ try{ toast("Heads up: this browser is blocking storage — your entries won't be saved. Try turning off Private Browsing."); }catch(_){} }, 1200);
})();
Sync.init();
updateSyncUI();
Reminders.scheduleAll();
Health.importFromHash();   // ingest Apple Health payload if launched via the Shortcut deep link
render();
window.addEventListener("hashchange", ()=>Health.importFromHash()); // app already open → re-sync
window.addEventListener("load",()=>{ if(Object.values(S.reminders).some(r=>r&&r.on)) Reminders.request(); });
// register service worker (only meaningful over http/https)
if("serviceWorker" in navigator && location.protocol.startsWith("http")){
  window.addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
}
