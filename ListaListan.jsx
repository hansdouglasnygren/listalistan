import { useState, useEffect, useRef } from "react";


const FONT_LINK = document.createElement("link");
FONT_LINK.rel = "stylesheet";
FONT_LINK.href = "https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Fraunces:ital,opsz,wght@0,9..144,600;1,9..144,400&display=swap";
document.head.appendChild(FONT_LINK);

// ─── Firebase ─────────────────────────────────────────────────────────────────
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDMJY5XlX6nzIaDdC0g4To9eXiTS6RnMOI",
  authDomain: "listalistan.firebaseapp.com",
  projectId: "listalistan",
  storageBucket: "listalistan.firebasestorage.app",
  messagingSenderId: "1060510592590",
  appId: "1:1060510592590:web:eaa2d282a5417aba44dd1f",
  measurementId: "G-HG8PWWB4MD"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);
const DATA_DOC = doc(db, "listalistan", "shared");

async function saveData(data) {
  try { await setDoc(DATA_DOC, { payload: JSON.stringify(data) }); } catch(e) { console.error("Save error", e); }
}

// ─── Notifications ────────────────────────────────────────────────────────────
async function requestNotificationPermission() {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

function sendNotification(title, body) {
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      icon: "/icon.png",
      badge: "/icon.png",
      vibrate: [200, 100, 200],
    });
  } catch(e) { console.log("Notification error", e); }
}

// Compare two data states and find what changed
function findChanges(oldData, newData, userName) {
  if (!oldData || !newData) return null;
  const oldAct = (oldData.activity||[]);
  const newAct = (newData.activity||[]);
  if (newAct.length > oldAct.length) {
    const latest = newAct[0];
    // Only notify if it was done by someone else
    if (latest && !latest.msg.startsWith(userName)) {
      return latest.msg;
    }
  }
  return null;
}

const PALETTE = ["#FFD6E0","#FFDAB9","#C8F0D8","#E0D4F7","#C8E6F5","#FFF3B0","#F5C6EC","#B8DFC8","#FFE0CC","#D4EAF7"];
const PRIORITY_OPTS = [
  { id: null,     label: "Ingen",  emoji: "⚪", color: "#ccc",    bg: "#f5f5f5" },
  { id: "low",    label: "Låg",    emoji: "🟢", color: "#77C77A", bg: "#E8F5E9" },
  { id: "medium", label: "Medel",  emoji: "🟡", color: "#FFB347", bg: "#FFF3E0" },
  { id: "high",   label: "Hög",    emoji: "🔴", color: "#FF7B7B", bg: "#FFE8E8" },
];
const EMOJIS = ["📋","🛒","🔨","🏠","⭐","🌿","🧹","💊","📦","🎁","🍳","🚗","💡","🌸","🧺","📅","🎯","💰","📚","🐾","🛁","🪟","🛏️","🪑","🍽️","🧴","🔑","🌳","🎨","🧰"];
const SUGGESTED_NAMES = ["Douglas","Camilla"];

function uid() { return Math.random().toString(36).slice(2,10); }
function today() { return new Date().toISOString().slice(0,10); }
function getPrio(id) { return PRIORITY_OPTS.find(p=>p.id===id)||PRIORITY_OPTS[0]; }
function cyclePrio(id) { const ids=[null,"low","medium","high"]; return ids[(ids.indexOf(id)+1)%ids.length]; }
function isOverdue(d) { return d && d < today(); }
function isDueSoon(d) { if(!d) return false; const dd=new Date(d),t=new Date(); return dd>=t&&(dd-t)<3*24*60*60*1000; }
function timeAgo(iso) {
  const diff=Date.now()-new Date(iso).getTime(), m=Math.floor(diff/60000);
  if(m<1) return "just nu";
  if(m<60) return `${m} min sedan`;
  const h=Math.floor(m/60);
  if(h<24) return `${h} tim sedan`;
  return `${Math.floor(h/24)} dagar sedan`;
}

function makeList(name,emoji,color,extra={}) {
  return { id:uid(), name, emoji, color, priority:null, archived:false, isGrocery:false, dueDate:null, sublists:[], items:[], ...extra };
}
function makeItem(text,qty=1) {
  return { id:uid(), text, done:false, priority:null, comment:"", qty };
}

function makeDefault() {
  return {
    folders: [
      { id:"f1", name:"Hushåll", emoji:"🏠", color:"#C8E6F5", priority:null, archived:false,
        lists:[
          makeList("Inköp till huset","🛒","#C8F0D8",{ isGrocery:true,
            sublists:[
              makeList("Badrum","🛁","#F5C6EC",{ items:[makeItem("Toalettpapper",3),makeItem("Tvål",2)] }),
              makeList("Kök","🍽️","#FFF3B0",{ items:[makeItem("Diskmedel",1),makeItem("Sponge",4)] }),
            ], items:[makeItem("Glödlampor",2)] }),
          makeList("Renovering","🔨","#FFDAB9",{ priority:"medium",
            sublists:[
              makeList("Badrum","🛁","#FFD6E0",{ items:[makeItem("Köpa kakel",1),makeItem("Boka plattsättare",1)] }),
              makeList("Vardagsrum","🛋️","#E0D4F7",{ items:[makeItem("Köpa färg",1),makeItem("Måla tak",1)] }),
            ], items:[] }),
        ]
      },
      { id:"f2", name:"Vardagligt", emoji:"🌿", color:"#C8F0D8", priority:null, archived:false,
        lists:[
          makeList("Veckohandling","🍳","#FFF3B0",{ isGrocery:true,
            sublists:[
              makeList("Mejeri","🧀","#FFE8D6",{ items:[makeItem("Mjölk",2),makeItem("Ägg",1),makeItem("Smör",1)] }),
              makeList("Grönsaker","🥦","#C8F0D8",{ items:[makeItem("Tomater",4),makeItem("Gurka",1),makeItem("Lök",2)] }),
              makeList("Övrigt","🛒","#F5F0FF",{ items:[makeItem("Bröd",1),makeItem("Pasta",2)] }),
            ], items:[] }),
          makeList("Apotek & hygien","💊","#F5C6EC",{ items:[] }),
        ]
      },
      { id:"f3", name:"Övrigt", emoji:"⭐", color:"#E0D4F7", priority:null, archived:false,
        lists:[ makeList("Önskelista","🎁","#FFD6E0",{ items:[] }) ]
      },
    ],
    templates: [
      { id:"t1", name:"Veckohandling bas", emoji:"🛒", color:"#C8F0D8", items:[
        {text:"Mjölk",qty:2},{text:"Ägg",qty:1},{text:"Bröd",qty:1},{text:"Smör",qty:1},{text:"Ost",qty:1},
        {text:"Yoghurt",qty:2},{text:"Pasta",qty:2},{text:"Ris",qty:1},{text:"Tomater",qty:4},{text:"Lök",qty:2},{text:"Potatis",qty:1},{text:"Kycklingfilé",qty:2},
      ]},
      { id:"t2", name:"Italiensk middag", emoji:"🍳", color:"#FFDAB9", items:[
        {text:"Pasta",qty:2},{text:"Krossade tomater",qty:2},{text:"Vitlök",qty:1},{text:"Basilika",qty:1},{text:"Olivolja",qty:1},{text:"Parmesan",qty:1},{text:"Köttfärs",qty:1},
      ]},
      { id:"t3", name:"Tacos-kväll", emoji:"🌮", color:"#FFF3B0", items:[
        {text:"Tacoskal",qty:1},{text:"Köttfärs",qty:1},{text:"Tacokrydda",qty:1},{text:"Salsa",qty:1},{text:"Gräddfil",qty:1},{text:"Cheddar",qty:1},{text:"Sallad",qty:1},{text:"Avokado",qty:2},
      ]},
      { id:"t4", name:"Städning hem", emoji:"🧹", color:"#E0D4F7", items:[
        {text:"Allrengöring",qty:1},{text:"Toalettrengöring",qty:1},{text:"Fönsterputs",qty:1},{text:"Dammsuga",qty:1},{text:"Moppa",qty:1},{text:"Byta lakan",qty:1},
      ]},
      { id:"t5", name:"Renoveringsprojekt", emoji:"🔨", color:"#FFDAB9", items:[
        {text:"Planera & mät upp",qty:1},{text:"Köp material",qty:1},{text:"Skydda golv",qty:1},{text:"Genomförande",qty:1},{text:"Städa upp",qty:1},{text:"Kontrollera",qty:1},
      ]},
    ],
    activity:[],
  };
}

function loadLocal() { try { const r=localStorage.getItem("listalistan_v3"); return r?JSON.parse(r):makeDefault(); } catch { return makeDefault(); } }

function countItems(list) {
  let total=(list.items||[]).length, done=(list.items||[]).filter(i=>i.done).length;
  for(const sub of (list.sublists||[])) { const c=countItems(sub); total+=c.total; done+=c.done; }
  return {total,done};
}

const S = {
  app: { fontFamily:"'Nunito',sans-serif", minHeight:"100vh", background:"linear-gradient(135deg,#fef6fb 0%,#f0f7ff 50%,#f5fdf0 100%)", maxWidth:480, margin:"0 auto", position:"relative" },
  card: (color,depth=0) => ({ background:color||"#fff", borderRadius:18-depth*2, padding:depth>0?"11px 13px":"14px 16px", marginBottom:8, boxShadow:depth>0?"0 1px 6px rgba(160,130,200,0.08)":"0 2px 12px rgba(160,130,200,0.10)", border:"1.5px solid rgba(200,180,230,0.25)", cursor:"pointer", transition:"transform 0.15s,box-shadow 0.15s" }),
  btn: (bg,color) => ({ background:bg||"#e8dff5", color:color||"#6a4f8c", border:"none", borderRadius:12, padding:"8px 16px", fontFamily:"'Nunito',sans-serif", fontWeight:700, fontSize:14, cursor:"pointer" }),
  iconBtn: (bg) => ({ background:bg||"#f0ebfa", border:"none", borderRadius:10, width:32, height:32, display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", fontSize:15, flexShrink:0 }),
  input: { border:"1.5px solid #e0d4f0", borderRadius:12, padding:"9px 13px", fontFamily:"'Nunito',sans-serif", fontSize:14, color:"#4a3f6b", outline:"none", background:"#faf8ff", width:"100%", boxSizing:"border-box" },
  tag: (color,bg) => ({ background:bg, color, borderRadius:8, padding:"2px 8px", fontSize:11, fontWeight:700, display:"inline-flex", alignItems:"center", gap:3 }),
  progress: (pct,color) => ({ height:5, borderRadius:99, background:`linear-gradient(90deg,${color||"#b8a0d8"} ${pct}%,#ede8f5 ${pct}%)`, marginTop:6 }),
};

function HouseIllustration() {
  return (
    <svg viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg" style={{width:"100%",maxWidth:320,display:"block",margin:"0 auto"}}>
      <rect width="320" height="220" rx="24" fill="#EEF6FF"/>
      <ellipse cx="60" cy="38" rx="28" ry="14" fill="white" opacity="0.9"/>
      <ellipse cx="80" cy="32" rx="22" ry="13" fill="white" opacity="0.9"/>
      <ellipse cx="46" cy="34" rx="18" ry="11" fill="white" opacity="0.9"/>
      <ellipse cx="240" cy="44" rx="24" ry="12" fill="white" opacity="0.85"/>
      <ellipse cx="258" cy="38" rx="18" ry="11" fill="white" opacity="0.85"/>
      <circle cx="270" cy="30" r="16" fill="#FFE97A" opacity="0.9"/>
      <circle cx="270" cy="30" r="12" fill="#FFD740"/>
      <ellipse cx="160" cy="198" rx="130" ry="14" fill="#C8F0C0" opacity="0.6"/>
      <rect x="60" y="185" width="200" height="18" rx="8" fill="#A8E090"/>
      <rect x="90" y="120" width="140" height="80" rx="6" fill="#FFE8D6"/>
      <rect x="90" y="185" width="140" height="15" rx="6" fill="#FFDAB9"/>
      <polygon points="75,122 160,58 245,122" fill="#FFB3C6"/>
      <polygon points="75,122 160,62 245,122" fill="#FF8FAB"/>
      <rect x="188" y="72" width="18" height="34" rx="4" fill="#E8A0B0"/>
      <rect x="185" y="68" width="24" height="10" rx="4" fill="#D4809A"/>
      <ellipse cx="197" cy="58" rx="5" ry="7" fill="white" opacity="0.6"/>
      <ellipse cx="200" cy="48" rx="4" ry="6" fill="white" opacity="0.4"/>
      <rect x="143" y="150" width="34" height="50" rx="8" fill="#C8A0E0"/>
      <circle cx="171" cy="175" r="3" fill="#9b70c8"/>
      <rect x="100" y="135" width="36" height="30" rx="7" fill="#C8E6F5"/>
      <line x1="118" y1="135" x2="118" y2="165" stroke="#a0c8e8" strokeWidth="1.5"/>
      <line x1="100" y1="150" x2="136" y2="150" stroke="#a0c8e8" strokeWidth="1.5"/>
      <rect x="184" y="135" width="36" height="30" rx="7" fill="#C8E6F5"/>
      <line x1="202" y1="135" x2="202" y2="165" stroke="#a0c8e8" strokeWidth="1.5"/>
      <line x1="184" y1="150" x2="220" y2="150" stroke="#a0c8e8" strokeWidth="1.5"/>
      <circle cx="80" cy="185" r="7" fill="#FFB3C6"/><circle cx="80" cy="185" r="4" fill="#FFD740"/>
      <rect x="79" y="185" width="3" height="12" rx="2" fill="#7AC870"/>
      <circle cx="68" cy="182" r="6" fill="#C8B0F0"/><circle cx="68" cy="182" r="3" fill="#FFD740"/>
      <rect x="67" y="182" width="3" height="10" rx="2" fill="#7AC870"/>
      <circle cx="240" cy="185" r="7" fill="#FFB3C6"/><circle cx="240" cy="185" r="4" fill="#FFD740"/>
      <rect x="239" y="185" width="3" height="12" rx="2" fill="#7AC870"/>
      <circle cx="252" cy="182" r="6" fill="#A0D8F0"/><circle cx="252" cy="182" r="3" fill="#FFD740"/>
      <rect x="251" y="182" width="3" height="10" rx="2" fill="#7AC870"/>
    </svg>
  );
}

function SplashScreen({ onEnter }) {
  const [phase,setPhase]=useState("splash");
  const [customName,setCustomName]=useState("");
  useEffect(()=>{ const t=setTimeout(()=>setPhase("pick"),2200); return ()=>clearTimeout(t); },[]);

  if(phase==="splash") return (
    <div style={{...S.app,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"linear-gradient(160deg,#ffeef5 0%,#f0f7ff 60%,#f0fff4 100%)"}}>
      <style>{`@keyframes bobble{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}} @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}`}</style>
      <div style={{animation:"bobble 3s ease-in-out infinite",width:"85%",maxWidth:300}}><HouseIllustration/></div>
      <h1 style={{fontFamily:"'Fraunces',serif",fontSize:38,fontWeight:600,color:"#6a3a8a",margin:"16px 0 6px",animation:"fadeUp 0.8s 0.3s both ease"}}>ListaListan</h1>
      <p style={{color:"#b090cc",fontSize:15,margin:0,animation:"fadeUp 0.8s 0.6s both ease"}}>Er lilla hemapp 🌸</p>
    </div>
  );

  return (
    <div style={{...S.app,display:"flex",flexDirection:"column",alignItems:"center",minHeight:"100vh",padding:"0 24px",boxSizing:"border-box",background:"linear-gradient(160deg,#ffeef5 0%,#f0f7ff 60%,#f0fff4 100%)"}}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}`}</style>
      <div style={{width:"75%",maxWidth:220,marginTop:36,animation:"fadeUp 0.5s ease both"}}><HouseIllustration/></div>
      <h1 style={{fontFamily:"'Fraunces',serif",fontSize:28,color:"#6a3a8a",margin:"10px 0 4px"}}>ListaListan</h1>
      <p style={{color:"#b090cc",fontSize:14,margin:"0 0 24px",textAlign:"center"}}>Vem använder appen just nu?</p>
      <div style={{width:"100%",display:"flex",flexDirection:"column",gap:9,animation:"fadeUp 0.5s 0.15s ease both"}}>
        {SUGGESTED_NAMES.map(name=>(
          <button key={name} onClick={()=>onEnter(name)} style={{background:"white",border:"1.5px solid #e8d8f8",borderRadius:16,padding:"13px 20px",fontFamily:"'Nunito',sans-serif",fontSize:16,fontWeight:700,color:"#5a3a7a",cursor:"pointer",textAlign:"left",display:"flex",alignItems:"center",gap:12,boxShadow:"0 2px 10px rgba(160,120,220,0.08)",transition:"all 0.15s"}}
            onMouseEnter={e=>{e.currentTarget.style.background="#f5eeff";e.currentTarget.style.transform="translateX(4px)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="white";e.currentTarget.style.transform="";}}>
            <span style={{fontSize:20}}>👤</span>{name}
          </button>
        ))}

      </div>
    </div>
  );
}

function EmojiPicker({value,onChange}) {
  const [open,setOpen]=useState(false);
  return (
    <div style={{position:"relative"}}>
      <button onClick={()=>setOpen(!open)} style={{...S.iconBtn("#f0ebfa"),width:40,height:40,fontSize:20}}>{value||"📋"}</button>
      {open&&(
        <div style={{position:"absolute",top:44,left:0,zIndex:200,background:"#fff",borderRadius:14,padding:8,boxShadow:"0 4px 24px rgba(100,80,160,0.18)",display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:3,width:210}}>
          {EMOJIS.map(e=>(<button key={e} onClick={()=>{onChange(e);setOpen(false);}} style={{background:value===e?"#e8dff5":"transparent",border:"none",borderRadius:8,padding:3,fontSize:18,cursor:"pointer"}}>{e}</button>))}
        </div>
      )}
    </div>
  );
}

function ColorPicker({value,onChange}) {
  return (
    <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
      {PALETTE.map(c=>(<button key={c} onClick={()=>onChange(c)} style={{width:22,height:22,borderRadius:"50%",background:c,border:"none",cursor:"pointer",outline:value===c?"2.5px solid #9b70c8":"none",outlineOffset:2}}/>))}
    </div>
  );
}

function ItemRow({item,onUpdate,onDelete}) {
  const [showComment,setShowComment]=useState(!!item.comment);
  const [editing,setEditing]=useState(false);
  const [editText,setEditText]=useState(item.text);
  const inputRef=useRef(null);
  const prio=getPrio(item.priority);
  useEffect(()=>{if(editing)inputRef.current?.focus();},[editing]);
  function upd(patch){onUpdate({...item,...patch});}
  return (
    <div style={{marginBottom:4}}>
      <div style={{background:item.done?"#f4f2f8":"#fff",borderRadius:12,border:`1.5px solid ${prio.id?prio.color+"44":"#ede8f5"}`,overflow:"hidden",boxShadow:item.done?"none":"0 1px 5px rgba(160,130,200,0.07)"}}>
        <div style={{display:"flex",alignItems:"center",padding:"8px 10px",gap:6}}>
          <button onClick={()=>upd({done:!item.done})} style={{width:21,height:21,borderRadius:"50%",flexShrink:0,cursor:"pointer",border:`2px solid ${prio.id?prio.color:"#c8b8e0"}`,background:item.done?(prio.id?prio.color:"#c8b8e0"):"white",display:"flex",alignItems:"center",justifyContent:"center"}}>
            {item.done&&<span style={{color:"white",fontSize:10}}>✓</span>}
          </button>
          <div style={{flex:1,minWidth:0}}>
            {editing?(
              <input ref={inputRef} value={editText} onChange={e=>setEditText(e.target.value)}
                onBlur={()=>{if(editText.trim())upd({text:editText.trim()});setEditing(false);}}
                onKeyDown={e=>{if(e.key==="Enter"){if(editText.trim())upd({text:editText.trim()});setEditing(false);}}}
                style={{...S.input,padding:"2px 6px",fontSize:14}}/>
            ):(
              <span onDoubleClick={()=>setEditing(true)} style={{fontSize:14,color:item.done?"#bbb":"#4a3f6b",textDecoration:item.done?"line-through":"none",cursor:"text",wordBreak:"break-word"}}>{item.text}</span>
            )}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:2,flexShrink:0}}>
            <button onClick={()=>upd({qty:Math.max(1,(item.qty||1)-1)})} style={{...S.iconBtn("#f5f2fc"),width:20,height:20,fontSize:11}}>−</button>
            <span style={{fontSize:12,color:"#9b8bbf",minWidth:14,textAlign:"center"}}>{item.qty||1}</span>
            <button onClick={()=>upd({qty:(item.qty||1)+1})} style={{...S.iconBtn("#f5f2fc"),width:20,height:20,fontSize:11}}>+</button>
          </div>
          <button onClick={()=>upd({priority:cyclePrio(item.priority)})} style={{...S.iconBtn(prio.id?prio.bg:"#f5f2fc"),width:26,height:26,fontSize:12}}>{prio.emoji}</button>
          <button onClick={()=>setShowComment(!showComment)} style={{...S.iconBtn(item.comment?"#e0f0ff":"#f5f2fc"),width:26,height:26,fontSize:12}}>💬</button>
          <button onClick={()=>onDelete(item.id)} style={{...S.iconBtn("#fff0f0"),width:26,height:26,fontSize:11,color:"#ffaaaa"}}>✕</button>
        </div>
        {showComment&&(
          <div style={{padding:"0 10px 8px 36px"}}>
            <textarea value={item.comment||""} onChange={e=>upd({comment:e.target.value})} placeholder="Kommentar..." rows={2} style={{...S.input,resize:"none",padding:"6px 10px",fontSize:13}}/>
          </div>
        )}
      </div>
    </div>
  );
}

function ListScreen({list,onUpdate,breadcrumb,onBack,userName,onActivity,templates}) {
  const [newItemText,setNewItemText]=useState("");
  const [showNewSub,setShowNewSub]=useState(false);
  const [showTemplates,setShowTemplates]=useState(false);
  const [newSub,setNewSub]=useState({name:"",emoji:"📋",color:PALETTE[3],isGrocery:false,priority:null,dueDate:null});
  const [activeSubId,setActiveSubId]=useState(null);
  const [filterPrio,setFilterPrio]=useState(null);
  const [sortBy,setSortBy]=useState("order");

  const activeSub=(list.sublists||[]).find(s=>s.id===activeSubId);

  function updSub(updated){onUpdate({...list,sublists:(list.sublists||[]).map(s=>s.id===updated.id?updated:s)});}
  function delSub(id){
    const s=(list.sublists||[]).find(x=>x.id===id);
    onUpdate({...list,sublists:(list.sublists||[]).filter(s=>s.id!==id)});
    if(s) onActivity(`${userName} tog bort underlistan "${s.name}"`);
  }
  function createSub(){
    if(!newSub.name.trim()) return;
    const s=makeList(newSub.name.trim(),newSub.emoji,newSub.color,{isGrocery:newSub.isGrocery,priority:newSub.priority,dueDate:newSub.dueDate});
    onUpdate({...list,sublists:[...(list.sublists||[]),s]});
    onActivity(`${userName} lade till "${s.name}" i "${list.name}"`);
    setNewSub({name:"",emoji:"📋",color:PALETTE[3],isGrocery:false,priority:null,dueDate:null});
    setShowNewSub(false);
  }
  function fromTemplate(t){
    const s=makeList(t.name,t.emoji,t.color,{isGrocery:true,items:t.items.map(i=>makeItem(i.text,i.qty))});
    onUpdate({...list,sublists:[...(list.sublists||[]),s]});
    onActivity(`${userName} skapade "${t.name}" från mall i "${list.name}"`);
    setShowTemplates(false);
  }
  function addItem(){
    if(!newItemText.trim()) return;
    onUpdate({...list,items:[...(list.items||[]),makeItem(newItemText.trim())]});
    setNewItemText("");
  }
  function updItem(item){onUpdate({...list,items:(list.items||[]).map(i=>i.id===item.id?item:i)});}
  function delItem(id){onUpdate({...list,items:(list.items||[]).filter(i=>i.id!==id)});}

  if(activeSub) return (
    <ListScreen list={activeSub} onUpdate={updSub}
      breadcrumb={[...breadcrumb,{name:list.name,emoji:list.emoji}]}
      onBack={()=>setActiveSubId(null)} userName={userName} onActivity={onActivity} templates={templates}/>
  );

  const {total,done}=countItems(list);
  let items=[...(list.items||[])];
  if(filterPrio) items=items.filter(i=>i.priority===filterPrio);
  if(sortBy==="prio"){const o={high:0,medium:1,low:2};items.sort((a,b)=>(o[a.priority]??3)-(o[b.priority]??3));}
  else if(sortBy==="alpha") items.sort((a,b)=>a.text.localeCompare(b.text,"sv"));
  else items.sort((a,b)=>a.done===b.done?0:a.done?1:-1);
  const sublists=(list.sublists||[]).filter(s=>!s.archived);

  return (
    <div style={S.app}>
      <div style={{background:list.color,padding:"16px 16px 12px"}}>
        <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:8,flexWrap:"wrap"}}>
          <button onClick={onBack} style={{...S.iconBtn("rgba(255,255,255,0.6)"),fontSize:16,width:28,height:28}}>←</button>
          {breadcrumb.map((b,i)=>(
            <span key={i} style={{fontSize:12,color:"rgba(80,40,100,0.6)",display:"flex",alignItems:"center",gap:3}}>
              <span>{b.emoji}</span><span>{b.name}</span><span style={{opacity:0.4}}>›</span>
            </span>
          ))}
          <span style={{fontSize:13,fontWeight:700,color:"#5a3a7a"}}>{list.emoji} {list.name}</span>
        </div>
        {total>0&&(
          <>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#7a5a9a",marginBottom:2}}><span>{done} av {total} klara</span><span>{Math.round(done/total*100)}%</span></div>
            <div style={S.progress(Math.round(done/total*100),"#9b70c8")}/>
          </>
        )}
        {list.dueDate&&<div style={{marginTop:6,fontSize:12,color:isOverdue(list.dueDate)?"#e05555":isDueSoon(list.dueDate)?"#d07000":"#7a5a9a"}}>📅 {isOverdue(list.dueDate)?"Försenad: ":isDueSoon(list.dueDate)?"Snart: ":""}{list.dueDate}</div>}
        {list.isGrocery&&<button onClick={()=>onUpdate({...list,items:(list.items||[]).map(i=>({...i,done:false}))})} style={{...S.btn("rgba(255,255,255,0.65)","#5a4070"),marginTop:8,fontSize:12,padding:"5px 12px"}}>🔄 Återställ punkter</button>}
      </div>

      <div style={{padding:"8px 14px",display:"flex",gap:5,flexWrap:"wrap",borderBottom:"1px solid #f0ebf8"}}>
        {PRIORITY_OPTS.filter(p=>p.id).map(p=>(
          <button key={p.id} onClick={()=>setFilterPrio(filterPrio===p.id?null:p.id)}
            style={{...S.btn(filterPrio===p.id?p.bg:"#f0ebfa",filterPrio===p.id?p.color:"#9b8bbf"),padding:"4px 9px",fontSize:11}}>
            {p.emoji} {p.label}
          </button>
        ))}
        <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={{...S.btn("#f0ebfa","#9b8bbf"),padding:"4px 9px",fontSize:11,appearance:"none"}}>
          <option value="order">Ordning</option><option value="prio">Prioritet</option><option value="alpha">A–Ö</option>
        </select>
      </div>

      <div style={{padding:"12px 14px 120px"}}>
        {sublists.length>0&&(
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,fontWeight:800,color:"#9b70c8",marginBottom:6,letterSpacing:"0.5px"}}>📁 UNDERLISTOR</div>
            {sublists.map(sub=>{
              const sc=countItems(sub), spct=sc.total>0?Math.round(sc.done/sc.total*100):0, sprio=getPrio(sub.priority);
              const subSubCount=(sub.sublists||[]).filter(s=>!s.archived).length;
              return (
                <div key={sub.id} onClick={()=>setActiveSubId(sub.id)} style={S.card(sub.color,1)}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 5px 16px rgba(160,130,200,0.16)";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 1px 6px rgba(160,130,200,0.08)";}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:9}}>
                    <span style={{fontSize:20,flexShrink:0}}>{sub.emoji}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
                        <span style={{fontWeight:700,fontSize:14,color:"#4a3060"}}>{sub.name}</span>
                        {sub.priority&&<span style={S.tag(sprio.color,sprio.bg)}>{sprio.emoji}</span>}
                        {sub.dueDate&&<span style={S.tag(isOverdue(sub.dueDate)?"#e05555":"#9b70c8",isOverdue(sub.dueDate)?"#ffe8e8":"#f0ebff")}>📅 {sub.dueDate}</span>}
                      </div>
                      <div style={{fontSize:11,color:"#9b80c0",marginTop:2}}>
                        {subSubCount>0?`${subSubCount} underlistor · `:""}{sc.done}/{sc.total} klara
                      </div>
                      {sc.total>0&&<div style={S.progress(spct,"#9b70c8")}/>}
                    </div>
                    <button onClick={e=>{e.stopPropagation();delSub(sub.id);}} style={{...S.iconBtn("#fff0f0"),color:"#ffaaaa",flexShrink:0,width:26,height:26,fontSize:11}}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(items.length>0||filterPrio)&&(
          <div style={{marginBottom:8}}>
            {sublists.length>0&&<div style={{fontSize:11,fontWeight:800,color:"#9b70c8",marginBottom:6,letterSpacing:"0.5px"}}>✅ PUNKTER</div>}
            {items.length===0&&<p style={{color:"#c0b0d8",fontSize:13,textAlign:"center",padding:"10px 0"}}>Inga punkter</p>}
            {items.map(item=><ItemRow key={item.id} item={item} onUpdate={updItem} onDelete={delItem}/>)}
          </div>
        )}

        {sublists.length===0&&items.length===0&&!showNewSub&&(
          <div style={{textAlign:"center",padding:"32px 0",color:"#c0b0d8"}}>
            <div style={{fontSize:36,marginBottom:8}}>🌸</div>
            <div style={{fontSize:14}}>Tom lista — lägg till underlistor eller punkter!</div>
          </div>
        )}

        {showNewSub&&(
          <div style={{background:"#faf8ff",borderRadius:16,padding:14,border:"1.5px solid #e8dff5",marginBottom:10}}>
            <p style={{margin:"0 0 10px",fontWeight:700,color:"#6a4f8c",fontSize:13}}>Ny underlista i "{list.name}"</p>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <EmojiPicker value={newSub.emoji} onChange={v=>setNewSub({...newSub,emoji:v})}/>
              <input value={newSub.name} onChange={e=>setNewSub({...newSub,name:e.target.value})}
                onKeyDown={e=>{if(e.key==="Enter")createSub();}} placeholder="Namn på underlistan..." style={{...S.input,flex:1}} autoFocus/>
            </div>
            <ColorPicker value={newSub.color} onChange={v=>setNewSub({...newSub,color:v})}/>
            <div style={{display:"flex",gap:6,marginTop:8,alignItems:"center",flexWrap:"wrap"}}>
              <label style={{fontSize:12,color:"#7a5a9a",display:"flex",alignItems:"center",gap:4,cursor:"pointer"}}>
                <input type="checkbox" checked={newSub.isGrocery} onChange={e=>setNewSub({...newSub,isGrocery:e.target.checked})}/> Inköpslista
              </label>
              {PRIORITY_OPTS.filter(p=>p.id).map(p=>(
                <button key={p.id} onClick={()=>setNewSub({...newSub,priority:newSub.priority===p.id?null:p.id})}
                  style={S.btn(newSub.priority===p.id?p.bg:"#f0ebfa",newSub.priority===p.id?p.color:"#9b8bbf")}>{p.emoji}</button>
              ))}
              <input type="date" value={newSub.dueDate||""} onChange={e=>setNewSub({...newSub,dueDate:e.target.value||null})}
                style={{...S.input,width:"auto",flex:1,padding:"5px 8px",fontSize:12}}/>
            </div>
            <div style={{display:"flex",gap:8,marginTop:10}}>
              <button onClick={createSub} style={S.btn("#c8b8e8","#5a3a8a")}>Skapa</button>
              <button onClick={()=>setShowNewSub(false)} style={S.btn("#f0ebfa","#9b8bbf")}>Avbryt</button>
            </div>
          </div>
        )}

        {showTemplates&&(
          <div style={{background:"#faf8ff",borderRadius:16,padding:14,border:"1.5px solid #e8dff5",marginBottom:10}}>
            <p style={{margin:"0 0 10px",fontWeight:700,color:"#6a4f8c",fontSize:13}}>Välj mall</p>
            {templates.map(t=>(
              <div key={t.id} onClick={()=>fromTemplate(t)} style={{...S.card(t.color,1),padding:"9px 12px",display:"flex",gap:9,alignItems:"center"}}>
                <span style={{fontSize:20}}>{t.emoji}</span>
                <div><div style={{fontWeight:700,fontSize:13,color:"#4a3060"}}>{t.name}</div><div style={{fontSize:11,color:"#9b80c0"}}>{t.items.length} punkter</div></div>
              </div>
            ))}
            <button onClick={()=>setShowTemplates(false)} style={{...S.btn("#f0ebfa","#9b8bbf"),marginTop:4}}>Avbryt</button>
          </div>
        )}
      </div>

      {!showNewSub&&!showTemplates&&(
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"rgba(253,248,255,0.97)",backdropFilter:"blur(8px)",borderTop:"1.5px solid #ede8f5",padding:"10px 14px",boxSizing:"border-box"}}>
          <div style={{display:"flex",gap:7,marginBottom:7}}>
            <button onClick={()=>setShowNewSub(true)} style={{...S.btn("#e0d4f7","#6a3a8a"),flex:1,fontSize:13}}>📁 Ny underlista</button>
            <button onClick={()=>setShowTemplates(true)} style={{...S.btn("#c8f0d8","#3a7a5a"),flex:1,fontSize:13}}>📋 Från mall</button>
          </div>
          <div style={{display:"flex",gap:7}}>
            <input value={newItemText} onChange={e=>setNewItemText(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter")addItem();}} placeholder="Lägg till en punkt..." style={{...S.input,flex:1}}/>
            <button onClick={addItem} style={{...S.btn("#c8b8e8","#5a3a8a"),padding:"9px 14px",fontSize:17}}>＋</button>
          </div>
        </div>
      )}
    </div>
  );
}

function FolderScreen({folder,templates,onUpdate,onBack,userName,onActivity}) {
  const [showNewList,setShowNewList]=useState(false);
  const [showTemplates,setShowTemplates]=useState(false);
  const [activeListId,setActiveListId]=useState(null);
  const [newList,setNewList]=useState({name:"",emoji:"📋",color:PALETTE[0],isGrocery:false,priority:null,dueDate:null});

  const activeList=(folder.lists||[]).find(l=>l.id===activeListId);
  function updList(updated){onUpdate({...folder,lists:(folder.lists||[]).map(l=>l.id===updated.id?updated:l)});}
  function createList(){
    if(!newList.name.trim()) return;
    const l=makeList(newList.name.trim(),newList.emoji,newList.color,{isGrocery:newList.isGrocery,priority:newList.priority,dueDate:newList.dueDate});
    onUpdate({...folder,lists:[...(folder.lists||[]),l]});
    onActivity(`${userName} lade till listan "${l.name}" i ${folder.name}`);
    setNewList({name:"",emoji:"📋",color:PALETTE[0],isGrocery:false,priority:null,dueDate:null});
    setShowNewList(false);
  }
  function fromTemplate(t){
    const l=makeList(t.name,t.emoji,t.color,{isGrocery:true,items:t.items.map(i=>makeItem(i.text,i.qty))});
    onUpdate({...folder,lists:[...(folder.lists||[]),l]});
    onActivity(`${userName} skapade "${t.name}" från mall`);
    setShowTemplates(false);
  }
  function deleteList(id){
    const l=(folder.lists||[]).find(x=>x.id===id);
    onUpdate({...folder,lists:(folder.lists||[]).filter(l=>l.id!==id)});
    if(l) onActivity(`${userName} tog bort listan "${l.name}"`);
  }

  if(activeList) return (
    <ListScreen list={activeList} onUpdate={updList} breadcrumb={[{name:folder.name,emoji:folder.emoji}]}
      onBack={()=>setActiveListId(null)} userName={userName} onActivity={onActivity} templates={templates}/>
  );

  const visibleLists=(folder.lists||[]).filter(l=>!l.archived);
  return (
    <div style={S.app}>
      <div style={{background:folder.color,padding:"20px 16px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{...S.iconBtn("rgba(255,255,255,0.6)"),fontSize:18}}>←</button>
          <span style={{fontSize:26}}>{folder.emoji}</span>
          <h2 style={{fontFamily:"'Fraunces',serif",fontSize:21,color:"#4a3060",margin:0,flex:1}}>{folder.name}</h2>
          <span style={{fontSize:12,color:"#7a5a9a"}}>{visibleLists.length} listor</span>
        </div>
      </div>
      <div style={{padding:"14px 14px 100px"}}>
        {visibleLists.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:"#c0b0d8"}}><div style={{fontSize:40,marginBottom:8}}>📂</div>Inga listor här</div>}
        {visibleLists.map(list=>{
          const {total,done}=countItems(list), pct=total>0?Math.round(done/total*100):0, prio=getPrio(list.priority);
          const subCount=(list.sublists||[]).filter(s=>!s.archived).length;
          return (
            <div key={list.id} onClick={()=>setActiveListId(list.id)} style={S.card(list.color)}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(160,130,200,0.18)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 12px rgba(160,130,200,0.10)";}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <span style={{fontSize:24,flexShrink:0}}>{list.emoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontWeight:700,fontSize:15,color:"#4a3060"}}>{list.name}</span>
                    {list.priority&&<span style={S.tag(prio.color,prio.bg)}>{prio.emoji} {prio.label}</span>}
                    {list.dueDate&&<span style={S.tag(isOverdue(list.dueDate)?"#e05555":"#9b70c8",isOverdue(list.dueDate)?"#ffe8e8":"#f0ebff")}>📅 {list.dueDate}</span>}
                  </div>
                  <div style={{fontSize:12,color:"#9b80c0",marginTop:2}}>{subCount>0?`${subCount} underlistor · `:""}{done}/{total} klara</div>
                  {total>0&&<div style={S.progress(pct,"#9b70c8")}/>}
                </div>
                <button onClick={e=>{e.stopPropagation();deleteList(list.id);}} style={{...S.iconBtn("#fff0f0"),color:"#ffaaaa",flexShrink:0}}>✕</button>
              </div>
            </div>
          );
        })}
        {showNewList&&(
          <div style={{background:"#faf8ff",borderRadius:18,padding:16,border:"1.5px solid #e8dff5"}}>
            <p style={{margin:"0 0 10px",fontWeight:700,color:"#6a4f8c",fontSize:14}}>Ny lista</p>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <EmojiPicker value={newList.emoji} onChange={v=>setNewList({...newList,emoji:v})}/>
              <input value={newList.name} onChange={e=>setNewList({...newList,name:e.target.value})}
                onKeyDown={e=>{if(e.key==="Enter")createList();}} placeholder="Listans namn..." style={{...S.input,flex:1}} autoFocus/>
            </div>
            <ColorPicker value={newList.color} onChange={v=>setNewList({...newList,color:v})}/>
            <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap",alignItems:"center"}}>
              <label style={{fontSize:13,color:"#7a5a9a",display:"flex",alignItems:"center",gap:5,cursor:"pointer"}}>
                <input type="checkbox" checked={newList.isGrocery} onChange={e=>setNewList({...newList,isGrocery:e.target.checked})}/> Inköpslista
              </label>
              {PRIORITY_OPTS.filter(p=>p.id).map(p=>(
                <button key={p.id} onClick={()=>setNewList({...newList,priority:newList.priority===p.id?null:p.id})}
                  style={S.btn(newList.priority===p.id?p.bg:"#f0ebfa",newList.priority===p.id?p.color:"#9b8bbf")}>{p.emoji}</button>
              ))}
              <input type="date" value={newList.dueDate||""} onChange={e=>setNewList({...newList,dueDate:e.target.value||null})}
                style={{...S.input,width:"auto",flex:1,padding:"6px 10px",fontSize:13}}/>
            </div>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={createList} style={S.btn("#c8b8e8","#5a3a8a")}>Skapa lista</button>
              <button onClick={()=>setShowNewList(false)} style={S.btn("#f0ebfa","#9b8bbf")}>Avbryt</button>
            </div>
          </div>
        )}
        {showTemplates&&(
          <div style={{background:"#faf8ff",borderRadius:18,padding:16,border:"1.5px solid #e8dff5"}}>
            <p style={{margin:"0 0 10px",fontWeight:700,color:"#6a4f8c",fontSize:14}}>Välj mall</p>
            {templates.map(t=>(
              <div key={t.id} onClick={()=>fromTemplate(t)} style={{...S.card(t.color,1),padding:"10px 12px",display:"flex",gap:9,alignItems:"center"}}>
                <span style={{fontSize:20}}>{t.emoji}</span>
                <div><div style={{fontWeight:700,fontSize:14,color:"#4a3060"}}>{t.name}</div><div style={{fontSize:12,color:"#9b80c0"}}>{t.items.length} punkter</div></div>
              </div>
            ))}
            <button onClick={()=>setShowTemplates(false)} style={{...S.btn("#f0ebfa","#9b8bbf"),marginTop:4}}>Avbryt</button>
          </div>
        )}
      </div>
      {!showNewList&&!showTemplates&&(
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"rgba(253,248,255,0.97)",backdropFilter:"blur(8px)",borderTop:"1.5px solid #ede8f5",padding:"12px 14px",boxSizing:"border-box",display:"flex",gap:8}}>
          <button onClick={()=>setShowNewList(true)} style={{...S.btn("#c8b8e8","#5a3a8a"),flex:1}}>＋ Ny lista</button>
          <button onClick={()=>setShowTemplates(true)} style={{...S.btn("#c8f0d8","#3a7a5a"),flex:1}}>📋 Från mall</button>
        </div>
      )}
    </div>
  );
}

function HomeScreen({data,setData,userName,onSwitchUser}) {
  const [activeFolderId,setActiveFolderId]=useState(null);
  const [search,setSearch]=useState("");
  const [showNewFolder,setShowNewFolder]=useState(false);
  const [showArchive,setShowArchive]=useState(false);
  const [showActivity,setShowActivity]=useState(false);
  const [newFolder,setNewFolder]=useState({name:"",emoji:"📁",color:PALETTE[2],priority:null});

  function addActivity(msg){
    const entry={id:uid(),msg,time:new Date().toISOString()};
    setData(d=>({...d,activity:[entry,...(d.activity||[])].slice(0,40)}));
  }
  function updFolder(updated){setData(d=>({...d,folders:d.folders.map(f=>f.id===updated.id?updated:f)}));}
  function createFolder(){
    if(!newFolder.name.trim()) return;
    const f={id:uid(),...newFolder,name:newFolder.name.trim(),archived:false,lists:[]};
    setData(d=>({...d,folders:[...d.folders,f]}));
    addActivity(`${userName} skapade mappen "${f.name}"`);
    setNewFolder({name:"",emoji:"📁",color:PALETTE[2],priority:null});
    setShowNewFolder(false);
  }
  function deleteFolder(id){
    const f=data.folders.find(x=>x.id===id);
    setData(d=>({...d,folders:d.folders.filter(f=>f.id!==id)}));
    if(f) addActivity(`${userName} tog bort "${f.name}"`);
  }
  function archiveFolder(id){
    const f=data.folders.find(x=>x.id===id);
    setData(d=>({...d,folders:d.folders.map(f=>f.id===id?{...f,archived:true}:f)}));
    if(f) addActivity(`${userName} arkiverade "${f.name}"`);
  }

  const activeFolder=data.folders.find(f=>f.id===activeFolderId);
  if(activeFolder) return (
    <FolderScreen folder={activeFolder} templates={data.templates}
      onUpdate={f=>{updFolder(f);}} onBack={()=>setActiveFolderId(null)}
      userName={userName} onActivity={addActivity}/>
  );

  const allLists=data.folders.flatMap(f=>(f.lists||[]).map(l=>({...l,folderName:f.name})));
  const searchResults=search.length>1?allLists.filter(l=>l.name.toLowerCase().includes(search.toLowerCase())):[];
  const visibleFolders=data.folders.filter(f=>showArchive?f.archived:!f.archived);
  const totalItems=allLists.reduce((s,l)=>s+countItems(l).total,0);
  const doneItems=allLists.reduce((s,l)=>s+countItems(l).done,0);
  const activity=data.activity||[];

  return (
    <div style={S.app}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}`}</style>
      <div style={{background:"linear-gradient(135deg,#ffd6e0,#e8d4f7,#c8e6f5)",padding:"20px 18px 16px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
          <div style={{flex:1}}>
            <h1 style={{fontFamily:"'Fraunces',serif",fontSize:25,color:"#5a3a7a",margin:"0 0 2px"}}>ListaListan 🏡</h1>
            <p style={{margin:0,fontSize:13,color:"#9b70c8"}}>Hej, <strong>{userName}</strong>! 👋</p>
          </div>
          <button onClick={onSwitchUser} style={{...S.btn("rgba(255,255,255,0.7)","#7a5a9a"),fontSize:12,padding:"6px 11px"}}>Byt</button>
        </div>
        <div style={{background:"rgba(255,255,255,0.55)",borderRadius:14,padding:"10px 14px",display:"flex",gap:14,marginBottom:10}}>
          <div style={{textAlign:"center"}}><div style={{fontWeight:800,fontSize:17,color:"#6a3a8a"}}>{data.folders.filter(f=>!f.archived).length}</div><div style={{fontSize:11,color:"#b090cc"}}>mappar</div></div>
          <div style={{textAlign:"center"}}><div style={{fontWeight:800,fontSize:17,color:"#6a3a8a"}}>{allLists.length}</div><div style={{fontSize:11,color:"#b090cc"}}>listor</div></div>
          <div style={{textAlign:"center"}}><div style={{fontWeight:800,fontSize:17,color:"#6a3a8a"}}>{doneItems}/{totalItems}</div><div style={{fontSize:11,color:"#b090cc"}}>klara</div></div>
          <div style={{flex:1,display:"flex",alignItems:"center"}}><div style={{width:"100%"}}><div style={S.progress(totalItems>0?Math.round(doneItems/totalItems*100):0,"#9b70c8")}/><div style={{fontSize:10,color:"#b090cc",marginTop:3,textAlign:"right"}}>{totalItems>0?Math.round(doneItems/totalItems*100):0}%</div></div></div>
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Sök listor..." style={{...S.input,background:"rgba(255,255,255,0.75)"}}/>
      </div>

      {activity.length>0&&!search&&(
        <div style={{padding:"10px 16px 0"}}>
          <button onClick={()=>setShowActivity(!showActivity)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",gap:6,color:"#9b70c8",fontFamily:"'Nunito',sans-serif",fontWeight:700,fontSize:13,padding:0}}>
            📋 Senaste händelser {showActivity?"▾":"▸"}
          </button>
          {showActivity&&(
            <div style={{marginTop:7,background:"#faf8ff",borderRadius:13,border:"1.5px solid #ede8f5",overflow:"hidden"}}>
              {activity.slice(0,5).map((a,i)=>(
                <div key={a.id} style={{padding:"8px 13px",borderBottom:i<Math.min(activity.length,5)-1?"1px solid #f0ebf8":"none",display:"flex",gap:9,animation:`fadeUp 0.3s ${i*0.05}s both ease`}}>
                  <span style={{fontSize:14,flexShrink:0}}>🌸</span>
                  <div style={{flex:1}}><div style={{fontSize:12,color:"#5a3a7a"}}>{a.msg}</div><div style={{fontSize:11,color:"#c0a8d8",marginTop:1}}>{timeAgo(a.time)}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {search.length>1&&(
        <div style={{padding:"10px 16px"}}>
          <p style={{margin:"0 0 6px",fontSize:13,fontWeight:700,color:"#9b70c8"}}>Sökresultat</p>
          {searchResults.length===0?<p style={{color:"#c0b0d8",fontSize:13}}>Inga resultat</p>
            :searchResults.map(l=>(<div key={l.id} style={{...S.card(l.color),padding:"10px 13px"}}><span>{l.emoji}</span><span style={{fontWeight:700,fontSize:14,color:"#4a3060",marginLeft:7}}>{l.name}</span><span style={{fontSize:12,color:"#9b80c0",marginLeft:5}}>({l.folderName})</span></div>))}
        </div>
      )}

      <div style={{padding:"12px 14px 100px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <span style={{fontWeight:800,fontSize:15,color:"#7a5a9a"}}>{showArchive?"📦 Arkiv":"📁 Mappar"}</span>
          <button onClick={()=>setShowArchive(!showArchive)} style={S.btn(showArchive?"#e0d4f7":"#f0ebfa","#9b70c8")}>{showArchive?"← Tillbaka":"📦 Arkiv"}</button>
        </div>
        {visibleFolders.length===0&&<div style={{textAlign:"center",padding:"40px 0",color:"#c0b0d8"}}><div style={{fontSize:40,marginBottom:8}}>{showArchive?"📦":"🌸"}</div>{showArchive?"Inget arkiverat":"Inga mappar!"}</div>}
        {visibleFolders.map((folder,i)=>{
          const tot=((folder.lists||[])).reduce((s,l)=>s+countItems(l).total,0);
          const dn=((folder.lists||[])).reduce((s,l)=>s+countItems(l).done,0);
          const pct=tot>0?Math.round(dn/tot*100):0, prio=getPrio(folder.priority);
          return (
            <div key={folder.id} onClick={()=>!showArchive&&setActiveFolderId(folder.id)}
              style={{...S.card(folder.color),cursor:showArchive?"default":"pointer",animation:`fadeUp 0.4s ${i*0.07}s both ease`}}
              onMouseEnter={e=>{if(!showArchive){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 6px 20px rgba(160,130,200,0.18)";}}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 2px 12px rgba(160,130,200,0.10)";}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:10}}>
                <span style={{fontSize:26,flexShrink:0}}>{folder.emoji}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                    <span style={{fontWeight:800,fontSize:15,color:"#4a3060"}}>{folder.name}</span>
                    {folder.priority&&<span style={S.tag(prio.color,prio.bg)}>{prio.emoji} {prio.label}</span>}
                  </div>
                  <div style={{fontSize:12,color:"#9b80c0",marginTop:2}}>{(folder.lists||[]).length} listor · {dn}/{tot} klara</div>
                  {tot>0&&<div style={S.progress(pct,"#b090d0")}/>}
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                  {!showArchive&&<button onClick={()=>archiveFolder(folder.id)} style={{...S.iconBtn("#f5f0ff"),fontSize:12}}>📦</button>}
                  <button onClick={()=>deleteFolder(folder.id)} style={{...S.iconBtn("#fff0f0"),color:"#ffaaaa",fontSize:11}}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
        {showNewFolder&&(
          <div style={{background:"#faf8ff",borderRadius:18,padding:16,border:"1.5px solid #e8dff5"}}>
            <p style={{margin:"0 0 10px",fontWeight:700,color:"#6a4f8c",fontSize:14}}>Ny mapp</p>
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <EmojiPicker value={newFolder.emoji} onChange={v=>setNewFolder({...newFolder,emoji:v})}/>
              <input value={newFolder.name} onChange={e=>setNewFolder({...newFolder,name:e.target.value})}
                onKeyDown={e=>{if(e.key==="Enter")createFolder();}} placeholder="Mappens namn..." style={{...S.input,flex:1}} autoFocus/>
            </div>
            <ColorPicker value={newFolder.color} onChange={v=>setNewFolder({...newFolder,color:v})}/>
            <div style={{display:"flex",gap:6,marginTop:10,alignItems:"center"}}>
              <label style={{fontSize:13,color:"#7a5a9a"}}>Prioritet:</label>
              {PRIORITY_OPTS.filter(p=>p.id).map(p=>(
                <button key={p.id} onClick={()=>setNewFolder({...newFolder,priority:newFolder.priority===p.id?null:p.id})}
                  style={S.btn(newFolder.priority===p.id?p.bg:"#f0ebfa",newFolder.priority===p.id?p.color:"#9b8bbf")}>{p.emoji}</button>
              ))}
            </div>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <button onClick={createFolder} style={S.btn("#c8b8e8","#5a3a8a")}>Skapa mapp</button>
              <button onClick={()=>setShowNewFolder(false)} style={S.btn("#f0ebfa","#9b8bbf")}>Avbryt</button>
            </div>
          </div>
        )}
      </div>
      {!showNewFolder&&!showArchive&&(
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,background:"rgba(253,248,255,0.97)",backdropFilter:"blur(8px)",borderTop:"1.5px solid #ede8f5",padding:"12px 14px",boxSizing:"border-box"}}>
          <button onClick={()=>setShowNewFolder(true)} style={{...S.btn("#c8b8e8","#5a3a8a"),width:"100%",padding:"11px"}}>＋ Ny mapp</button>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [data,setData]=useState(null);
  const [userName,setUserName]=useState(null);
  const [syncing,setSyncing]=useState(true);
  const prevData = useRef(null);
  const userNameRef = useRef(null);

  useEffect(()=>{ userNameRef.current = userName; },[userName]);

  // Ask for notification permission when user picks their name
  async function handleEnter(name) {
    setUserName(name);
    await requestNotificationPermission();
  }

  // Listen to Firestore in real-time
  useEffect(()=>{
    const unsub = onSnapshot(DATA_DOC, (snap)=>{
      if(snap.exists()){
        try {
          const newData = JSON.parse(snap.data().payload);
          // Check for changes made by the other person
          if (prevData.current && userNameRef.current) {
            const change = findChanges(prevData.current, newData, userNameRef.current);
            if (change) {
              sendNotification("ListaListan 🏡", change);
            }
          }
          prevData.current = newData;
          setData(newData);
        } catch { setData(makeDefault()); }
      } else {
        const d=makeDefault();
        setData(d);
        saveData(d);
      }
      setSyncing(false);
    }, (err)=>{
      console.error("Firestore error", err);
      setData(loadLocal());
      setSyncing(false);
    });
    return ()=>unsub();
  },[]);

  // Save to Firestore on every data change
  useEffect(()=>{
    if(data && data !== prevData.current){
      prevData.current = data;
      saveData(data);
    }
  },[data]);

  if(syncing) return (
    <div style={{...S.app,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"linear-gradient(160deg,#ffeef5 0%,#f0f7ff 60%,#f0fff4 100%)"}}>
      <style>{`@keyframes bobble{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
      <div style={{animation:"bobble 1.5s ease-in-out infinite",width:"60%",maxWidth:200}}><HouseIllustration/></div>
      <p style={{color:"#b090cc",fontSize:15,marginTop:16,fontFamily:"'Nunito',sans-serif"}}>Ansluter... 🌸</p>
    </div>
  );

  if(!userName) return <SplashScreen onEnter={handleEnter}/>;
  return <HomeScreen data={data} setData={setData} userName={userName} onSwitchUser={()=>setUserName(null)}/>;
}
