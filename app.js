const $=id=>document.getElementById(id);
const key=(name)=>PLANTEL_FIELDS.find(k=>k===name)||name;
const get=(r,name)=>r[key(name)]||"";
const unique=arr=>[...new Set(arr.filter(x=>x!==""&&x!=null))].sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));
function fill(id, vals){const el=$(id); unique(vals).forEach(v=>{let o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o)})}
fill('variedad',PLANTEL_DATA.map(r=>get(r,'VARIEDAD')));
fill('propietario',PLANTEL_DATA.map(r=>get(r,'PROPIETARIO')));
fill('semana',PLANTEL_DATA.map(r=>get(r,'SEMANA')));
$('varCount').textContent=unique(PLANTEL_DATA.map(r=>get(r,'VARIEDAD'))).length;
const dates=PLANTEL_DATA.map(r=>get(r,'FECHA')).filter(Boolean).sort((a,b)=>{let pa=a.split('/').reverse().join('');let pb=b.split('/').reverse().join('');return pa.localeCompare(pb)});
$('lastDate').textContent=dates.at(-1)||'—';
function render(){
 const q=$('q').value.trim().toLowerCase(), va=$('variedad').value, pr=$('propietario').value, se=$('semana').value, mv=$('mov').value;
 let data=PLANTEL_DATA.filter(r=>{
   if(va&&get(r,'VARIEDAD')!==va)return false;if(pr&&get(r,'PROPIETARIO')!==pr)return false;if(se&&get(r,'SEMANA')!==se)return false;
   if(mv&&get(r,'COMPRA/ PLANTACIÓN')!==mv)return false;
   if(q){return Object.values(r).some(v=>String(v).toLowerCase().includes(q))}
   return true;
 });
 $('count').textContent=data.length;
 const list=$('list'); list.innerHTML='';
 if(!data.length){list.innerHTML='<div class="empty">No hay registros con estos criterios.</div>';return}
 data.slice(0,250).forEach(r=>{
   const item=document.createElement('div');item.className='item';item.onclick=()=>show(r);
   item.innerHTML=`<div class="top"><h3>${esc(get(r,'VARIEDAD')||'Sin variedad')}</h3><span class="pill">${esc(get(r,'COMPRA/ PLANTACIÓN')||'')}</span></div>
   <div class="muted">Nº ${esc(get(r,'Nº'))} · Semana ${esc(get(r,'SEMANA'))} · ${esc(get(r,'FECHA'))}</div>
   <div class="muted">${esc(get(r,'PROPIETARIO'))} · Parcela ${esc(get(r,'PARCELA'))} · ${esc(get(r,'MUNICIPIO'))}</div>`;
   list.appendChild(item);
 });
 if(data.length>250){let n=document.createElement('div');n.className='empty';n.textContent='Se muestran los primeros 250 resultados. Refina la búsqueda.';list.appendChild(n)}
}
function show(r){
 $('mtitle').textContent=(get(r,'VARIEDAD')||'Registro')+' · Nº '+get(r,'Nº');
 $('detail').innerHTML='<div class="grid">'+PLANTEL_FIELDS.filter(k=>r[k]!==''&&r[k]!=null).map(k=>`<div class="field"><b>${esc(k)}</b><span>${esc(r[k])}</span></div>`).join('')+'</div>';
 $('modal').hidden=false;document.body.style.overflow='hidden';
}
function closeModal(){$('modal').hidden=true;document.body.style.overflow=''}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
['q','variedad','propietario','semana','mov'].forEach(id=>$(id).addEventListener('input',render));
render();
let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').hidden=false});
$('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').hidden=true}};

if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');



/* ===== Francisco Ballester V2 - IndexedDB local database ===== */
const FB_DB_NAME = "FranciscoBallesterStock";
const FB_DB_VERSION = 1;
const FB_STORE = "movimientos";

function fbOpenDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FB_DB_NAME, FB_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FB_STORE)) {
        const store = db.createObjectStore(FB_STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("fecha", "fecha");
        store.createIndex("tipo", "tipo");
        store.createIndex("variedad", "variedad");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function fbAddMovimiento(mov) {
  const db = await fbOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FB_STORE, "readwrite");
    const item = {
      ...mov,
      fechaCreacion: new Date().toISOString(),
      sincronizado: false
    };
    const req = tx.objectStore(FB_STORE).add(item);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function fbGetMovimientos() {
  const db = await fbOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FB_STORE, "readonly");
    const req = tx.objectStore(FB_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function fbExportBackup() {
  const movimientos = await fbGetMovimientos();
  const blob = new Blob([JSON.stringify({
    version: 2,
    fecha: new Date().toISOString(),
    movimientos
  }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "francisco-ballester-backup.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function fbUpdateConnectionStatus() {
  const el = document.querySelector("[data-connection-status]");
  if (el) el.textContent = navigator.onLine ? "🟢 Con conexión" : "🔴 Sin cobertura";
}

window.addEventListener("online", fbUpdateConnectionStatus);
window.addEventListener("offline", fbUpdateConnectionStatus);
document.addEventListener("DOMContentLoaded", fbUpdateConnectionStatus);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(console.error);
  });
}
