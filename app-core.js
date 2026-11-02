/* Application state, persistence, audio, games, recording, and event handling. */
let homeHTML,childHTML,surahHTML,gameHTML,parentHTML,celebrate;

const KEY="bustan-quran-v1";
function freshKid(k){return {stars:0, mem:{}, weak:{}, listened:{}, level:k.level, goal:"amma"}}
function freshState(){const s={kids:{},updatedAt:0};KIDS.forEach(k=>s.kids[k.id]=freshKid(k));return s}
let S=freshState();
try{const raw=localStorage.getItem(KEY); if(raw){const p=JSON.parse(raw); if(p&&p.kids) S=mergeShape(p)}}catch(e){}
function mergeShape(p){const s=freshState(); s.updatedAt=p.updatedAt||0; KIDS.forEach(k=>{s.kids[k.id]=Object.assign(freshKid(k),p.kids[k.id]||{})}); return s}
let dbRef=null, saveTimer=null;
function save(){
  S.updatedAt=Date.now();
  try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}
  clearTimeout(saveTimer);
  saveTimer=setTimeout(()=>{ if(dbRef) dbRef.set({json:JSON.stringify(S)}).catch(()=>{}) },1500);
}
(async()=>{
  try{
    if(!window.claude||!window.claude.use) return;
    const [db,user]=await Promise.all([claude.use("db"),claude.use("user")]);
    if(!db||!user) return;
    const id=await user.id(); if(!id) return;
    dbRef=db.doc("data/users/"+id+"/bustan");
    const snap=await dbRef.get();
    if(snap.exists){const d=snap.data(); const p=JSON.parse(d.json||"{}");
      if(p.kids && (p.updatedAt||0)>(S.updatedAt||0)){S=mergeShape(p); try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){} render()}
      else if((S.updatedAt||0)>(p.updatedAt||0)) dbRef.set({json:JSON.stringify(S)}).catch(()=>{});
    } else if(S.updatedAt) dbRef.set({json:JSON.stringify(S)}).catch(()=>{});
  }catch(e){}
})();

/* ---------- helpers ---------- */
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const kidById=id=>KIDS.find(k=>k.id===id);
const ar=n=>String(n).replace(/\d/g,d=>"٠١٢٣٤٥٦٧٨٩"[d]);
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]]}return a};
const pick=a=>a[Math.random()*a.length|0];
const words=v=>v.split(" ").filter(w=>/[ء-يٱ]/.test(w));
const sname=n=>QURAN[n].name;
function kidList(kid){const st=S.kids[kid.id]; const base=[1].concat(GOALS[st.goal].list); const other=st.goal==="amma"?TABARAK:AMMA; return {goal:base, other}}
function memCount(id){const st=S.kids[id]; return GOALS[st.goal].list.filter(n=>st.mem[n]).length}
function goalTotal(id){return GOALS[S.kids[id].goal].list.length}
function weakCount(id,n){const w=S.kids[id].weak; let c=0; for(const k in w) if(k.startsWith(n+":")) c+=w[k]; return c}
function addStars(id,k){S.kids[id].stars+=k; save()}
function toast(msg){const t=$("#toast"); t.firstChild.textContent=msg; t.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>t.hidden=true,1800)}

/* ---------- audio ---------- */
const player=$("#player");
let stopAt=null, onSegEnd=null, rafId=null, playToken=0;
function segFor(n,i){ // i: 1-based ayah, 0 = basmala
  const t=TIMINGS[n]; const off=t.hasBasmala?1:0; const idx=i===0?0:(i-1+off);
  return [t.starts[idx], idx+1<t.starts.length?t.starts[idx+1]:t.end];
}
function stopAudio(){playToken++; player.pause(); stopAt=null; onSegEnd=null; cancelAnimationFrame(rafId)}
function playSeg(n,i,cb){
  stopAudio(); const tok=playToken;
  const [a,b]=segFor(n,i); const src="audio/"+String(n).padStart(3,"0")+".mp3";
  const start=()=>{ if(tok!==playToken) return; player.currentTime=a; player.muted=false; stopAt=b-0.04; onSegEnd=cb; const p=player.play(); if(p&&p.catch) p.catch(()=>{}); tick(tok) };
  if(!player.src.endsWith(src)){ player.src=src; player.preload="auto"; player.load();
    player.muted=true; player.play().catch(()=>{}); // unlock on iOS within the tap
    const wait=()=>{ if(tok!==playToken) return; if(player.readyState>=1 && player.seekable.length) start(); else setTimeout(wait,60) }; wait();
  } else start();
  return b-a;
}
function tick(tok){
  if(tok!==playToken) return;
  if(stopAt!=null && player.currentTime>=stopAt){ player.pause(); const cb=onSegEnd; stopAt=null; onSegEnd=null; if(cb) cb(); return }
  rafId=requestAnimationFrame(()=>tick(tok));
}

/* ---------- routing ---------- */
let view={name:"home"};
function go(v){stopAudio(); clearTimeout(listen.timer); view=v; render(); window.scrollTo(0,0);
  if(v.name==="home") speak("home_hello","hbuddy"); else if(v.name==="child") speak("child_hello","cbuddy");
  if(v.name==="child"){const h=document.querySelector(".stone.here"); if(h) setTimeout(()=>h.scrollIntoView({block:"center",behavior:"smooth"}),400)}}
function render(){
  const app=$("#app");
  if(view.name==="home") app.innerHTML=homeHTML();
  else if(view.name==="child") app.innerHTML=childHTML(view.kid);
  else if(view.name==="surah") app.innerHTML=surahHTML(view);
  else if(view.name==="game") app.innerHTML=gameHTML();
  else if(view.name==="parent") app.innerHTML=parentHTML();
  app.dataset.view=view.name;
  bind();
}

/* ---------- characters ---------- */
const CHARS={fatima:"فاطمة",abdulrahman:"عبدالرحمن",yaddo:"اليدّو",yaddoah:"اليدّوه"};
function buddy(who,text,opts={}){return `<div class="buddy ${opts.small?"small":""} ${opts.mood||""}" ${opts.id?`id="${opts.id}"`:""}><img src="chars/${who}.png" alt="${CHARS[who]}"><div class="bubble" ${opts.bid?`id="${opts.bid}" aria-live="polite"`:""}>${text}</div></div>`}
function setMood(id,mood,text){const b=document.getElementById(id); if(!b) return; b.classList.remove("cheer","think"); void b.offsetWidth; if(mood) b.classList.add(mood); if(text!=null){const t=b.querySelector(".bubble"); if(t) t.textContent=text}}

/* ---------- character voices (recorded by the family) ---------- */
const VOICE_LINES=[
  ["home_hello","yaddoah","هلا والله بعيالي! منو بتراجع اليوم؟"],
  ["child_hello","fatima","هلا! يلا نراجع سوا"],
  ["listen_start","fatima","اسمعي الآية زين، وبعدين ردّديها"],
  ["listen_done","fatima","ما شاء الله عليج، خلّصتي السورة!"],
  ["story_intro","yaddo","تعالي يا بنتي، أقولج قصة هالسورة"],
  ["game_start","abdulrahman","أتحداج! يلا نشوف"],
  ["game_right","abdulrahman","كفو!"],
  ["game_wrong","abdulrahman","ولا يهمج، نحاول مرة ثانية"],
  ["game_end","abdulrahman","شطورة! خذي نجومج"],
  ["prize","yaddoah","مبروك يا بنتي، الجائزة لج!"],
];
let VDBP=null;
function vdb(){return VDBP||(VDBP=new Promise((res,rej)=>{try{const r=indexedDB.open("bustan-voices",1);r.onupgradeneeded=()=>r.result.createObjectStore("v");r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)}catch(e){rej(e)}}))}
async function vOp(mode,fn){try{const db=await vdb();return await new Promise(r=>{const tx=db.transaction("v",mode);const q=fn(tx.objectStore("v"));q.onsuccess=()=>r(q.result);q.onerror=()=>r(null)})}catch(e){return null}}
const vGet=id=>vOp("readonly",s=>s.get(id));
const vPut=(id,b)=>vOp("readwrite",s=>s.put(b,id));
const vDel=id=>vOp("readwrite",s=>s.delete(id));
let VOICES=new Set();
vOp("readonly",s=>s.getAllKeys()).then(k=>{if(k) VOICES=new Set(k)});
let voiceEl=null;
async function speak(id,buddyId,after){
  const done=()=>{const b=document.getElementById(buddyId); if(b) b.classList.remove("talking"); if(after) after()};
  if(!VOICES.has(id)||(!player.paused&&stopAt!=null)){ if(after) after(); return }
  const blob=await vGet(id); if(!blob){ if(after) after(); return }
  try{ if(voiceEl){voiceEl.pause()} voiceEl=new Audio(URL.createObjectURL(blob));
    const b=document.getElementById(buddyId); if(b) b.classList.add("talking");
    voiceEl.onended=done; voiceEl.onerror=done;
    const p=voiceEl.play(); if(p&&p.catch) p.catch(done);
  }catch(e){done()}
}
let REC=null;
async function toggleRecord(id,btn){
  if(REC&&REC.id===id){REC.mr.stop(); return}
  if(REC) return;
  if(!navigator.mediaDevices||!window.MediaRecorder){toast("التسجيل يشتغل من رابط الموقع في Safari"); return}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true});
    const mr=new MediaRecorder(stream); const chunks=[];
    mr.ondataavailable=e=>{if(e.data.size) chunks.push(e.data)};
    mr.onstop=async()=>{stream.getTracks().forEach(t=>t.stop()); const blob=new Blob(chunks,{type:mr.mimeType||"audio/mp4"}); await vPut(id,blob); VOICES.add(id); REC=null; toast("انحفظ الصوت ✓"); render()};
    REC={id,mr}; mr.start(); btn.textContent="⏹ وقّفي"; btn.classList.add("rose");
  }catch(e){REC=null; toast("ما قدرنا نفتح المايك. اسمحي للموقع يستخدمه")}
}

/* listen & repeat loop */
const listen={on:false, rep:3, ayah:1, count:0, timer:null};
function listenStop(){listen.on=false; clearTimeout(listen.timer); stopAudio(); document.querySelectorAll(".ayah.on").forEach(e=>e.classList.remove("on"))}
function listenStep(){
  if(!listen.on) return; const n=view.n, q=QURAN[n];
  if(listen.ayah>q.v.length){ listenStop(); const st=S.kids[view.kid]; st.listened[n]=(st.listened[n]||0)+1; addStars(view.kid,1); toast("ما شاء الله! ⭐ نجمة جديدة"); render(); setMood("lbuddy","cheer","ما شاء الله عليج! خلّصتي السورة ⭐"); speak("listen_done","lbuddy"); return }
  document.querySelectorAll(".ayah").forEach(e=>e.classList.toggle("on",+e.dataset.ayah===listen.ayah));
  const el=document.querySelector(`.ayah[data-ayah="${listen.ayah}"]`); if(el) el.scrollIntoView({block:"center",behavior:"smooth"});
  setMood("lbuddy","think","اسمعي… 👂");
  const len=playSeg(n,listen.ayah,()=>{
    if(!listen.on) return; setMood("lbuddy","cheer","دورج! ردّدي 🗣️");
    listen.timer=setTimeout(()=>{ listen.count++; if(listen.count>=listen.rep){listen.count=0; listen.ayah++} listenStep() }, Math.max(2500,len*1000+800));
  });
}

/* ---------- games ---------- */
let G=null;
function poolFor(kid){const st=S.kids[kid]; let list=[1].concat(GOALS[st.goal].list).filter(n=>st.mem[n]||st.listened[n]); if(list.length<3) list=[1,114,113,112,111,110,109,108]; return list}
function startGame(type,n,opts={}){
  stopAudio();
  G={type, n, kid:opts.evalFor||view.kid, by:view.kid, i:0, total:5, score:[], back:{...view}, daily:!!opts.daily};
  if(type==="order") G.total=1;
  nextQ(); view={name:"game"}; render(); speak("game_start","gbuddy");
}
function weightedAyah(kid,n){const q=QURAN[n]; const w=S.kids[kid].weak; const weak=[]; for(let i=1;i<=q.v.length;i++) if(w[n+":"+i]) weak.push(i); return (weak.length&&Math.random()<.6)?pick(weak):1+(Math.random()*q.v.length|0)}
function nextQ(){
  const t=G.daily?pick(S.kids[G.kid].level>=3?["complete","which","recite"]:["which","which"]):G.type;
  const n=G.n||pick(poolFor(G.kid)); G.cur={t,n};
  const q=QURAN[n];
  if(t==="complete"){
    let tries=0,a; do{a=weightedAyah(G.kid,n);tries++}while(words(q.v[a-1]).length<4&&tries<15);
    const w=words(q.v[a-1]); if(w.length<4){G.cur.t="which"; return nextQ2()}
    const cut=Math.ceil(w.length/2); const right=w.slice(cut).join(" ");
    const pool=[]; const near=[n, ...poolFor(G.kid)];
    near.forEach(m=>QURAN[m].v.forEach((v,i)=>{const ww=words(v); if(ww.length>=3&&!(m===n&&i===a-1)) pool.push(ww.slice(Math.ceil(ww.length/2)).join(" "))}));
    const wrong=shuffle([...new Set(pool)].filter(x=>x!==right)).slice(0,2);
    Object.assign(G.cur,{a,start:w.slice(0,cut).join(" "),right,opts:shuffle([right,...wrong])});
  } else if(t==="which") nextQ2();
  else if(t==="recite"){
    const a=Math.min(q.v.length-1, Math.max(1,weightedAyah(G.kid,n)-1)) || 1;
    Object.assign(G.cur,{a:q.v.length>1?a:1,revealed:false});
  } else if(t==="order"){
    const len=q.v.length; const span=Math.min(len,5); const st0=1+(Math.random()*(len-span+1)|0);
    const ids=[]; for(let i=st0;i<st0+span;i++) ids.push(i);
    Object.assign(G.cur,{ids,shuffled:shuffle(ids),placed:[],mistakes:0});
  } else if(t==="after"){
    const order=[1].concat(TABARAK).concat(AMMA.slice().reverse()); // mushaf order of what we have
    const mine=order.filter(m=>m!==114 && m!==1);
    const s=pick(mine.filter(m=>m>=67)); const right=s+1;
    const wrong=shuffle(order.filter(m=>m!==right&&m!==s)).slice(0,2);
    Object.assign(G.cur,{s,right,opts:shuffle([right,...wrong])});
  }
}
function nextQ2(){
  const kid=G.kid; const pool=poolFor(kid); const n=G.n||pick(pool); const a=weightedAyah(kid,n);
  const wrong=shuffle([...new Set(pool.concat([1,114,113,112,108,103]))].filter(m=>m!==n)).slice(0,2);
  G.cur={t:"which",n,a,opts:shuffle([n,...wrong])};
}
function answer(ok){
  const c=G.cur; G.score[G.i]=ok;
  speak(ok?"game_right":"game_wrong","gbuddy");
  setMood("gbuddy",ok?"cheer":"think",ok?pick(["كفو! ⭐","ما شاء الله عليج!","شطورة! 👏"]):pick(["ولا يهمج، نحاول مرة ثانية","قريبة! نعيدها سوا","أنا بعد أغلط أحيانًا 😅"]));
  if(!ok && c.a) { const w=S.kids[G.kid].weak; const k=c.n+":"+(c.t==="recite"?c.a+1:c.a); w[k]=(w[k]||0)+1; save() }
  if(ok && c.a && c.t==="recite"){ const w=S.kids[G.kid].weak; const k=c.n+":"+(c.a+1); if(w[k]){w[k]--; if(!w[k]) delete w[k]; save()} }
  const wait=c.t==="complete"?Math.min(7000,(c.len||1)*1000+300):(ok?700:1300);
  setTimeout(()=>{ if(!G) return; stopAudio(); G.i++; if(G.i>=G.total) finishGame(); else {nextQ(); render()} }, wait);
}
function finishGame(){
  const good=G.score.filter(Boolean).length; const stars=G.total===1?(G.cur.mistakes===0?3:G.cur.mistakes<3?2:1):(good>=5?3:good>=3?2:good>=1?1:0);
  if(stars) addStars(G.kid,stars);
  if(G.kid!==G.by && stars) addStars(G.by,1);
  toast(stars?`${"⭐".repeat(stars)} أحسنتِ!`:"نحاول مرة ثانية 💪");
  const b=G.back; G=null; view=b; render(); speak("game_end",view.name==="child"?"cbuddy":"pbuddy");
}

/* ---------- parent ---------- */
let P={kid:"fatima", confirm:false};
/* ---------- events ---------- */
function bind(){
  const app=$("#app");
  app.onclick=e=>{
    const b=e.target.closest("button,.ayah"); if(!b) return;
    const d=b.dataset;
    if(d.home!==undefined) return go({name:"home"});
    if(d.kid && (b.classList.contains("kid")||b.classList.contains("door"))) return go({name:"child",kid:d.kid});
    if(d.kid && b.classList.contains("back")) return go({name:"child",kid:d.kid});
    if(d.surah) { listenStop(); listen.ayah=1; listen.count=0; return go({name:"surah",kid:view.kid,n:+d.surah,tab:"listen"}) }
    if(d.storyVoice){ if(!VOICES.has("story_intro")) return toast("سجّلي صوت يدو من لوحة الأهل أولًا"); return speak("story_intro","sbuddy") }
    if(d.tab){ listenStop(); view.tab=d.tab; render(); if(d.tab==="story") speak("story_intro","sbuddy"); return }
    if(d.rep){ listen.rep=+d.rep; document.querySelectorAll("[data-rep]").forEach(x=>x.setAttribute("aria-pressed",x===b)); return }
    if(b.id==="hideTxt"){ view.hide=!view.hide; return render() }
    if(b.id==="lplay"){ if(listen.on){listenStop(); b.textContent="▶ ابدئي"; setMood("lbuddy",null,"وقفنا. اضغطي ابدئي نكمّل")} else {listen.on=true; listen.count=0; b.textContent="⏸ إيقاف"; speak("listen_start","lbuddy",()=>{ if(listen.on) listenStep() })} return }
    if(b.classList.contains("ayah")){ listenStop(); const a=+d.ayah; b.classList.add("on"); playSeg(view.n,a,()=>b.classList.remove("on")); return }
    if(d.daily) return startGame("mix",null,{daily:true});
    if(d.helper){ return pickSister() }
    if(d.sister){ return startGame("recite",null,{evalFor:d.sister}) }
    if(d.game){ return startGame(d.game, d.n?+d.n:null) }
    if(b.id==="gback"){ const bk=G.back; G=null; stopAudio(); view=bk; return render() }
    if(b.id==="hear"){ playSeg(G.cur.n,G.cur.a,()=>{}); return }
    if(b.id==="reveal"){ G.cur.revealed=true; render(); playSeg(G.cur.n,G.cur.a+1,()=>{}); return }
    if(d.judge!==undefined){ const ok=d.judge==="1"; if(ok) toast("ما شاء الله ⭐"); document.querySelectorAll("[data-judge]").forEach(x=>x.disabled=true); return answer(ok) }
    if(d.opt!==undefined){ const c=G.cur; if(c.answered) return; const o=c.opts[+d.opt];
      const ok=(c.t==="which"?o===c.n:o===c.right); b.classList.add(ok?"ok":"no");
      if(!ok){ const ri=c.opts.findIndex(x=>c.t==="which"?x===c.n:x===c.right); app.querySelector(`[data-opt="${ri}"]`).classList.add("ok") }
      c.answered=true; if(c.t==="complete") c.len=playSeg(c.n,c.a,()=>{}); return answer(ok) }
    if(d.ord){ const c=G.cur; const i=+d.ord; const want=c.ids[c.placed.length];
      if(i===want){ setMood("gbuddy","cheer","صح! كمّلي 👏"); c.placed.push(i); playSeg(c.n,i,()=>{}); if(c.placed.length===c.ids.length){ render(); G.score[0]=true; setTimeout(finishGame,1600) } else render() }
      else { setMood("gbuddy","think","أوه! مو هذي، شوفي مرة ثانية"); c.mistakes++; b.classList.remove("no"); void b.offsetWidth; b.classList.add("no"); const w=S.kids[G.kid].weak,k=c.n+":"+want; w[k]=(w[k]||0)+1; save() } return }
    // parent
    if(d.pk){ P.kid=d.pk; P.confirm=false; return render() }
    if(d.level){ S.kids[P.kid].level=+d.level; save(); return render() }
    if(d.goal){ S.kids[P.kid].goal=d.goal; save(); return render() }
    if(d.mem){ const st=S.kids[P.kid], n=+d.mem; const before=memCount(P.kid)>=goalTotal(P.kid);
      if(st.mem[n]) delete st.mem[n]; else { st.mem[n]=true; st.stars+=2 } save(); render();
      if(!before && memCount(P.kid)>=goalTotal(P.kid)) celebrate(kidById(P.kid)); return }
    if(d.markall){ const st=S.kids[P.kid]; const before=memCount(P.kid)>=goalTotal(P.kid); GOALS[d.markall].list.forEach(n=>st.mem[n]=true); if(d.markall==="amma") st.mem[1]=true; save(); render();
      if(!before && memCount(P.kid)>=goalTotal(P.kid)) celebrate(kidById(P.kid)); return }
    if(d.rec){ return toggleRecord(d.rec,b) }
    if(d.vplay){ return speak(d.vplay,null) }
    if(d.vdel){ vDel(d.vdel).then(()=>{VOICES.delete(d.vdel); render()}); return }
    if(b.id==="askReset"){ P.confirm=true; return render() }
    if(b.id==="noReset"){ P.confirm=false; return render() }
    if(b.id==="doReset"){ const k=kidById(P.kid); S.kids[P.kid]=freshKid(k); P.confirm=false; save(); toast("تم المسح"); return render() }
  };
  const ph=$("#parentHold");
  if(ph){ let t=null, f=ph.querySelector(".fill");
    const down=e=>{e.preventDefault(); f.style.transition="transform 1.6s linear"; f.style.transform="scaleX(1)"; t=setTimeout(()=>go({name:"parent"}),1600)};
    const up=()=>{clearTimeout(t); f.style.transition="transform .2s"; f.style.transform="scaleX(0)"};
    ph.addEventListener("pointerdown",down); ["pointerup","pointerleave","pointercancel"].forEach(ev=>ph.addEventListener(ev,up));
    ph.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.shiftKey) go({name:"parent"})});
  }
}
function pickSister(){
  const app=$("#app");
  app.innerHTML=`<div class="row"><button class="back" data-kid="fatima">→ فاطمة</button></div><h2>لمين بتسمّعين اليوم؟</h2>
  <section class="kids">${KIDS.filter(k=>k.id!=="fatima").map(k=>`<button class="kid" data-sister="${k.id}"><span class="avatar" style="background:${k.tint}">${k.emoji}</span><span class="name">${k.name}</span></button>`).join("")}</section>
  <p class="note">اقرئي لأختك أول الآية، وخليها تكمل الآية اللي بعدها. إذا قرأت صح اضغطي «أحسنتِ». وأنتِ بعد تاخذين نجمة على تسميعك.</p>`;
}

function nextToLearn(kid){return kidList(kid).goal.find(n=>!S.kids[kid.id].mem[n])}
