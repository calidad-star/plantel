const $=id=>document.getElementById(id);
const key=name=>PLANTEL_FIELDS.find(k=>k===name)||name;
const get=(r,name)=>r?.[key(name)]??"";
const unique=arr=>[...new Set(arr.filter(x=>x!==""&&x!=null))].sort((a,b)=>String(a).localeCompare(String(b),'es',{numeric:true}));
const MONTH_ORDER=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function monthOf(value){
  const m=String(value??'').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(!m)return '';
  const names=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  return names[Number(m[2])-1]||'';
}
function fill(id,vals,placeholder){
  const el=$(id); if(!el)return;
  const current=el.value;
  el.innerHTML='';
  const o0=document.createElement('option');o0.value='';o0.textContent=placeholder;el.appendChild(o0);
  const values=id==='mes' ? [...new Set(vals.filter(x=>x!==""&&x!=null))].sort((a,b)=>MONTH_ORDER.indexOf(String(a))-MONTH_ORDER.indexOf(String(b))) : unique(vals);
  values.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;el.appendChild(o)});
  if([...el.options].some(o=>o.value===current)) el.value=current;
}
function refreshFilterOptions(){
  fill('variedad',PLANTEL_DATA.map(r=>get(r,'VARIEDAD')),'VARIEDAD');
  fill('tipo',PLANTEL_DATA.map(r=>get(r,'TIPO')),'TIPO');
  fill('propietario',PLANTEL_DATA.map(r=>get(r,'PROPIETARIO')),'PROPIETARIO');
  fill('municipio',PLANTEL_DATA.map(r=>get(r,'MUNICIPIO')),'MUNICIPIO');
  fill('semana',PLANTEL_DATA.map(r=>get(r,'SEMANA')),'SEMANA');
  fill('mes',PLANTEL_DATA.map(r=>monthOf(get(r,'FECHA'))),'MESES');
  fill('mov',PLANTEL_DATA.map(r=>get(r,'COMPRA/ PLANTACIÓN')),'PLANTEL');
  $('varCount').textContent=unique(PLANTEL_DATA.map(r=>get(r,'VARIEDAD'))).length;
  const dates=PLANTEL_DATA.map(r=>get(r,'FECHA')).filter(Boolean).sort((a,b)=>{
    const pa=String(a).split('/').reverse().join(''),pb=String(b).split('/').reverse().join('');
    return pa.localeCompare(pb);
  });
  $('lastDate').textContent=dates.at(-1)||'—';
}
function render(){
  const q=$('q').value.trim().toLowerCase();
  const va=$('variedad').value, ti=$('tipo').value, pr=$('propietario').value;
  const se=$('semana').value, me=$('mes').value, mv=$('mov').value, mu=$('municipio').value;
  const data=PLANTEL_DATA.filter(r=>{
    if(va&&get(r,'VARIEDAD')!==va)return false;
    if(ti&&get(r,'TIPO')!==ti)return false;
    if(pr&&get(r,'PROPIETARIO')!==pr)return false;
    if(se&&String(get(r,'SEMANA'))!==String(se))return false;
    if(me&&monthOf(get(r,'FECHA'))!==me)return false;
    if(mv&&get(r,'COMPRA/ PLANTACIÓN')!==mv)return false;
    if(mu&&get(r,'MUNICIPIO')!==mu)return false;
    if(q){
      return PLANTEL_FIELDS.some(k=>String(r[k]??'').toLowerCase().includes(q));
    }
    return true;
  });
  $('count').textContent=data.length;
  const list=$('list');list.innerHTML='';
  if(!data.length){list.innerHTML='<div class="empty">No hay registros con estos criterios.</div>';return}
  data.slice(0,250).forEach(r=>{
    const item=document.createElement('div');item.className='item';item.onclick=()=>show(r);
    item.innerHTML=`<div class="top"><h3>${esc(get(r,'PROPIETARIO')||'Sin propietario')}</h3><span class="pill">${esc(get(r,'COMPRA/ PLANTACIÓN')||'')}</span></div>
    <div class="muted">Variedad: ${esc(get(r,'VARIEDAD'))} · Nº ${esc(formatValue(get(r,'Nº'),'Nº'))} · Semana ${esc(formatValue(get(r,'SEMANA'),'SEMANA'))} · ${esc(get(r,'FECHA'))}</div>
    <div class="muted">${esc(get(r,'TIPO'))} · Parcela ${esc(get(r,'PARCELA'))} · ${esc(get(r,'MUNICIPIO'))}</div>`;
    list.appendChild(item);
  });
  if(data.length>250){const n=document.createElement('div');n.className='empty';n.textContent='Se muestran los primeros 250 resultados. Refina la búsqueda.';list.appendChild(n)}
}
const RECORD_DISPLAY_ORDER=['COMPRA/ PLANTACIÓN','VARIEDAD','SEMANA','BANDEJAS 16 B/hg (=Z02*15,78)','PLANTAS merma 8%','DÍA RECOLECCIÓN (100)','PROPIETARIO'];
function show(r){
  $('mtitle').textContent=(get(r,'PROPIETARIO')||'Registro')+' · Nº '+get(r,'Nº');
  const ordered=RECORD_DISPLAY_ORDER.filter(k=>r[key(k)]!==''&&r[key(k)]!=null);
  const rest=PLANTEL_FIELDS.filter(k=>!RECORD_DISPLAY_ORDER.includes(k)&&r[k]!==''&&r[k]!=null);
  $('detail').innerHTML='<div class="grid">'+[...ordered,...rest].map(k=>`<div class="field"><b>${esc(k==='COMPRA/ PLANTACIÓN'?'PLANTEL':k)}</b><span>${esc(formatValue(r[k],k))}</span></div>`).join('')+'</div>';
  $('modal').hidden=false;document.body.style.overflow='hidden';
}
function closeModal(){$('modal').hidden=true;document.body.style.overflow=''}
function formatValue(value, field=''){
  if(value===null||value===undefined||value==='') return '';
  if(typeof value==='number' && Number.isFinite(value)) return String(Math.round(value));
  return String(value);
}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function fbApplyMasterData(data){
  if(!Array.isArray(data)||!data.length)throw new Error('El Excel no contiene registros válidos.');
  PLANTEL_DATA=data;refreshFilterOptions();render();
  $('dropboxStatus').textContent='Dropbox: datos maestros actualizados';
}
refreshFilterOptions();
['q','mov','tipo','variedad','mes','semana','propietario','municipio'].forEach(id=>$(id).addEventListener('input',render));
render();

let deferredPrompt;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e;$('installBtn').hidden=false});
$('installBtn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null;$('installBtn').hidden=true}};

if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');

/* ===== Francisco Ballester V3.6 - IndexedDB local database ===== */
const FB_DB_NAME="FranciscoBallesterStock";
const FB_DB_VERSION=2;
const FB_STORE="movimientos";

function fbOpenDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(FB_DB_NAME,FB_DB_VERSION);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(FB_STORE)){
        const store=db.createObjectStore(FB_STORE,{keyPath:"id",autoIncrement:true});
        store.createIndex("fecha","fecha");store.createIndex("tipo","tipo");store.createIndex("variedad","variedad");
      }
      if(!db.objectStoreNames.contains("dropboxAuth"))db.createObjectStore("dropboxAuth",{keyPath:"id"});
    };
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
async function fbAddMovimiento(mov){
  const db=await fbOpenDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(FB_STORE,"readwrite");
    const item={...mov,fechaCreacion:new Date().toISOString(),sincronizado:false};
    const req=tx.objectStore(FB_STORE).add(item);
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
async function fbGetMovimientos(){
  const db=await fbOpenDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(FB_STORE,"readonly");const req=tx.objectStore(FB_STORE).getAll();
    req.onsuccess=()=>resolve(req.result||[]);req.onerror=()=>reject(req.error);
  });
}
async function fbExportBackup(){
  const movimientos=await fbGetMovimientos();
  const blob=new Blob([JSON.stringify({version:2,fecha:new Date().toISOString(),movimientos},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="francisco-ballester-backup.json";a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function fbUpdateConnectionStatus(){const el=document.querySelector("[data-connection-status]");if(el)el.textContent=navigator.onLine?"🟢 Con conexión":"🔴 Sin cobertura"}
window.addEventListener("online",fbUpdateConnectionStatus);window.addEventListener("offline",fbUpdateConnectionStatus);document.addEventListener("DOMContentLoaded",fbUpdateConnectionStatus);
