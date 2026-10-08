/* Francisco Ballester V3.4 - Dropbox OAuth 2.0 + PKCE
   Master data: /plantel-sync/Libro1_v3.4_maestro.xlsx
   Movements:   /plantel-sync/movimientos.json */
const FB_DROPBOX={
  appKey:'etmtuf5ltib9htn',
  redirectUri:'https://calidad-star.github.io/plantel/',
  filePath:'/plantel-sync/movimientos.json',
  masterPath:'/plantel-sync/Libro1_v3.4_maestro.xlsx',
  tokenStore:'dropboxAuth',
  requiredScopes:['files.metadata.read','files.content.read','files.content.write']
};

function fbRandomString(length=64){
  const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values=new Uint8Array(length);crypto.getRandomValues(values);
  return Array.from(values,v=>chars[v%chars.length]).join('');
}
function fbBase64Url(buffer){
  let binary='';const bytes=new Uint8Array(buffer);bytes.forEach(b=>binary+=String.fromCharCode(b));
  return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/g,'');
}
async function fbSha256(value){return crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))}
async function fbPkceChallenge(verifier){return fbBase64Url(await fbSha256(verifier))}

function fbOpenAuthDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(FB_DB_NAME,2);
    req.onupgradeneeded=()=>{
      const db=req.result;
      if(!db.objectStoreNames.contains(FB_STORE)){
        const store=db.createObjectStore(FB_STORE,{keyPath:'id',autoIncrement:true});
        store.createIndex('fecha','fecha');store.createIndex('tipo','tipo');store.createIndex('variedad','variedad');
      }
      if(!db.objectStoreNames.contains(FB_DROPBOX.tokenStore))db.createObjectStore(FB_DROPBOX.tokenStore,{keyPath:'id'});
    };
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
async function fbSaveDropboxToken(token){
  const db=await fbOpenAuthDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(FB_DROPBOX.tokenStore,'readwrite');
    tx.objectStore(FB_DROPBOX.tokenStore).put({id:'current',...token});
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
}
async function fbGetDropboxToken(){
  const db=await fbOpenAuthDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(FB_DROPBOX.tokenStore,'readonly');
    const req=tx.objectStore(FB_DROPBOX.tokenStore).get('current');
    req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
  });
}
async function fbDeleteDropboxToken(){
  const db=await fbOpenAuthDB();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(FB_DROPBOX.tokenStore,'readwrite');
    tx.objectStore(FB_DROPBOX.tokenStore).delete('current');
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
}
function fbScopeList(scope){
  return String(scope||'').split(/[ ,]+/).map(s=>s.trim()).filter(Boolean);
}
function fbHasRequiredScopes(token){
  const got=fbScopeList(token?.scope);
  return FB_DROPBOX.requiredScopes.every(s=>got.includes(s));
}
async function fbDropboxAuthorize(force=true){
  const verifier=fbRandomString(64),state=fbRandomString(32),challenge=await fbPkceChallenge(verifier);
  sessionStorage.setItem('fb_dropbox_verifier',verifier);
  sessionStorage.setItem('fb_dropbox_state',state);
  const params=new URLSearchParams({
    client_id:FB_DROPBOX.appKey,response_type:'code',redirect_uri:FB_DROPBOX.redirectUri,
    token_access_type:'offline',state,code_challenge:challenge,code_challenge_method:'S256',
    scope:FB_DROPBOX.requiredScopes.join(' ')
  });
  if(force) params.set('force_reapprove','true');
  location.href='https://www.dropbox.com/oauth2/authorize?'+params.toString();
}
async function fbDropboxHandleCallback(){
  const params=new URLSearchParams(location.search),code=params.get('code'),state=params.get('state'),error=params.get('error');
  if(error)throw new Error('Dropbox no autorizó la aplicación: '+error);
  if(!code)return false;
  const savedState=sessionStorage.getItem('fb_dropbox_state'),verifier=sessionStorage.getItem('fb_dropbox_verifier');
  if(!savedState||savedState!==state||!verifier)throw new Error('Validación OAuth/PKCE no válida. Vuelve a iniciar la conexión.');
  const body=new URLSearchParams({
    code,grant_type:'authorization_code',redirect_uri:FB_DROPBOX.redirectUri,
    client_id:FB_DROPBOX.appKey,code_verifier:verifier
  });
  const response=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error_description||data.error_summary||'Error al obtener el token de Dropbox.');
  const token={
    access_token:data.access_token,refresh_token:data.refresh_token||null,
    expires_at:Date.now()+(Number(data.expires_in||14400)*1000)-60000,
    scope:data.scope||'',account_id:data.account_id||''
  };
  await fbSaveDropboxToken(token);
  sessionStorage.removeItem('fb_dropbox_state');sessionStorage.removeItem('fb_dropbox_verifier');
  history.replaceState({},document.title,FB_DROPBOX.redirectUri);
  if(!fbHasRequiredScopes(token)){
    throw new Error('Dropbox autorizado, pero faltan permisos. Se requieren: '+FB_DROPBOX.requiredScopes.join(', ')+'.');
  }
  return true;
}
async function fbDropboxRefresh(){
  const token=await fbGetDropboxToken();
  if(!token?.refresh_token)throw new Error('No hay refresh token. Debes volver a conectar Dropbox.');
  const body=new URLSearchParams({grant_type:'refresh_token',refresh_token:token.refresh_token,client_id:FB_DROPBOX.appKey});
  const response=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  const data=await response.json();
  if(!response.ok){await fbDeleteDropboxToken();throw new Error(data.error_description||data.error_summary||'No se pudo renovar el acceso a Dropbox.');}
  const updated={...token,access_token:data.access_token,expires_at:Date.now()+(Number(data.expires_in||14400)*1000)-60000,scope:data.scope||token.scope};
  await fbSaveDropboxToken(updated);
  if(!fbHasRequiredScopes(updated))throw new Error('El refresh token de Dropbox no tiene los permisos necesarios. Pulsa "Volver a autorizar".');
  return updated;
}
async function fbDropboxAccessToken(){
  let token=await fbGetDropboxToken();
  if(!token)throw new Error('Dropbox no está conectado.');
  if(!fbHasRequiredScopes(token))throw new Error('El token de Dropbox no tiene files.content.write. Pulsa "Volver a autorizar Dropbox".');
  if(!token.expires_at||Date.now()>=token.expires_at)token=await fbDropboxRefresh();
  return token.access_token;
}
async function fbDropboxApi(endpoint,body=null){
  let accessToken=await fbDropboxAccessToken();
  const doRequest=token=>fetch('https://api.dropboxapi.com/2/'+endpoint,{
    method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:body?JSON.stringify(body):'{}'
  });
  let response=await doRequest(accessToken);
  if(response.status===401){await fbDropboxRefresh();accessToken=await fbDropboxAccessToken();response=await doRequest(accessToken);}
  return response;
}
async function fbDropboxEnsureFolder(){
  const response=await fbDropboxApi('files/create_folder_v2',{path:'/plantel-sync',autorename:false});
  if(response.ok)return true;
  const text=await response.text();let data=null;try{data=JSON.parse(text)}catch(_){}
  const summary=String(data?.error_summary||'');
  if(response.status===409&&(summary.includes('path/conflict/folder')||summary.includes('path/conflict')))return true;
  throw new Error('Dropbox: no se pudo crear/verificar /plantel-sync ('+response.status+'): '+(data?.error_summary||text||response.statusText));
}
async function fbDropboxDownloadFile(path){
  let token=await fbDropboxAccessToken();
  const doRequest=t=>fetch('https://content.dropboxapi.com/2/files/download',{
    method:'POST',headers:{Authorization:'Bearer '+t,'Dropbox-API-Arg':JSON.stringify({path})}
  });
  let response=await doRequest(token);
  if(response.status===401){await fbDropboxRefresh();token=await fbDropboxAccessToken();response=await doRequest(token);}
  if(response.status===409){
    const text=await response.text();if(text.includes('path/not_found'))return null;
  }
  if(!response.ok)throw new Error('Dropbox: no se pudo descargar '+path+' ('+response.status+').');
  return response.arrayBuffer();
}
async function fbDropboxUploadBinary(path,blob){
  await fbDropboxEnsureFolder();
  let token=await fbDropboxAccessToken();
  const doUpload=t=>fetch('https://content.dropboxapi.com/2/files/upload',{
    method:'POST',headers:{
      Authorization:'Bearer '+t,'Content-Type':'application/octet-stream',
      'Dropbox-API-Arg':JSON.stringify({path,mode:'overwrite',autorename:false,mute:true})
    },body:blob
  });
  let response=await doUpload(token);
  if(response.status===401){await fbDropboxRefresh();token=await fbDropboxAccessToken();response=await doUpload(token);}
  if(!response.ok){
    const text=await response.text();let data=null;try{data=JSON.parse(text)}catch(_){}
    throw new Error('Dropbox: error al subir '+path+' ('+response.status+'): '+(data?.error_summary||text||response.statusText));
  }
  return response.json();
}
async function fbDropboxDownloadSync(){
  const ab=await fbDropboxDownloadFile(FB_DROPBOX.filePath);if(!ab)return null;
  return JSON.parse(new TextDecoder().decode(ab));
}
async function fbDropboxUploadSync(payload){
  return fbDropboxUploadBinary(FB_DROPBOX.filePath,new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));
}
async function fbDropboxDownloadMaster(){
  const ab=await fbDropboxDownloadFile(FB_DROPBOX.masterPath);
  if(!ab)return null;
  return await fbParseXlsx(ab);
}
async function fbDropboxUploadMasterFile(file){
  if(!file)throw new Error('No se seleccionó ningún Excel.');
  const name=String(file.name||'').toLowerCase();
  if(!name.endsWith('.xlsx'))throw new Error('Selecciona un archivo .xlsx.');
  return fbDropboxUploadBinary(FB_DROPBOX.masterPath,file);
}
async function fbDropboxIsConnected(){
  const token=await fbGetDropboxToken();
  return !!token?.refresh_token||!!token?.access_token;
}
function fbMovementUuid(m){return m.uuid||(crypto.randomUUID?crypto.randomUUID():'fb-'+Date.now()+'-'+Math.random().toString(36).slice(2))}
async function fbGetNormalizedMovimientos(){
  const local=await fbGetMovimientos();let changed=false;
  const normalized=local.map(m=>{if(m.uuid)return m;changed=true;return {...m,uuid:fbMovementUuid(m),actualizado:m.fechaCreacion||new Date().toISOString()}});
  if(changed){
    const db=await fbOpenDB();
    await new Promise((resolve,reject)=>{const tx=db.transaction(FB_STORE,'readwrite'),store=tx.objectStore(FB_STORE);normalized.forEach(m=>store.put(m));tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
  }
  return normalized;
}
async function fbSyncDropbox(){
  if(!navigator.onLine)throw new Error('Sin conexión a Internet.');
  if(!(await fbDropboxIsConnected()))throw new Error('Dropbox no está conectado.');

  // 1) Master Excel -> application. If absent, keep embedded V3.4 data.
  let masterUpdated=false;
  try{
    const master=await fbDropboxDownloadMaster();
    if(master&&master.length){fbApplyMasterData(master);masterUpdated=true;}
  }catch(e){
    console.warn('No se pudo actualizar el Excel maestro:',e);
  }

  // 2) Movements remain a separate dataset and are merged without touching master data.
  const local=await fbGetNormalizedMovimientos();
  const cloud=await fbDropboxDownloadSync();
  const map=new Map();
  (cloud?.movimientos||[]).forEach(m=>map.set(m.uuid,m));
  local.forEach(m=>{
    const old=map.get(m.uuid),lm=Date.parse(m.actualizado||m.fechaCreacion||0),cm=Date.parse(old?.actualizado||old?.fechaCreacion||0);
    if(!old||lm>=cm)map.set(m.uuid,m);
  });
  const merged=Array.from(map.values()).sort((a,b)=>String(a.fechaCreacion||'').localeCompare(String(b.fechaCreacion||'')));
  await fbDropboxUploadSync({version:4,app:'Plantel Francisco Ballester',fecha:new Date().toISOString(),movimientos:merged});
  const db=await fbOpenDB(),existing=new Map(local.map(m=>[m.uuid,m]));
  await new Promise((resolve,reject)=>{const tx=db.transaction(FB_STORE,'readwrite'),store=tx.objectStore(FB_STORE);merged.forEach(m=>{if(!existing.has(m.uuid))store.add({...m,sincronizado:true})});tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});
  return {total:merged.length,cloudHad:cloud?.movimientos?.length||0,localHad:local.length,masterUpdated};
}

function fbSetDropboxStatus(text){const el=document.getElementById('dropboxStatus');if(el)el.textContent=text}
async function fbDropboxConnectFlow(){
  try{fbSetDropboxStatus('Dropbox: conectando…');await fbDropboxAuthorize(true)}catch(e){fbSetDropboxStatus('Dropbox: '+e.message)}
}
async function fbDropboxSyncFlow(){
  try{
    fbSetDropboxStatus('Dropbox: sincronizando Excel y movimientos…');
    const r=await fbSyncDropbox();
    fbSetDropboxStatus('Dropbox: sincronizado · '+r.total+' movimientos'+(r.masterUpdated?' · Excel actualizado':''));
  }catch(e){fbSetDropboxStatus(e.message||String(e))}
}
async function fbDropboxUploadMasterFlow(file){
  try{
    fbSetDropboxStatus('Dropbox: subiendo Excel maestro…');
    await fbDropboxUploadMasterFile(file);
    const master=await fbDropboxDownloadMaster();
    if(master?.length)fbApplyMasterData(master);
    fbSetDropboxStatus('Dropbox: Excel maestro actualizado');
  }catch(e){fbSetDropboxStatus(e.message||String(e))}
}

document.addEventListener('DOMContentLoaded',async()=>{
  const connect=document.getElementById('dropboxConnectBtn');
  const sync=document.getElementById('dropboxSyncBtn');
  const upload=document.getElementById('dropboxUploadMasterBtn');
  const input=document.getElementById('dropboxMasterInput');
  if(connect)connect.onclick=async()=>{await fbDropboxConnectFlow()};
  if(sync)sync.onclick=async()=>{await fbDropboxSyncFlow()};
  if(upload&&input)upload.onclick=()=>input.click();
  if(input)input.onchange=async()=>{const f=input.files?.[0];if(f)await fbDropboxUploadMasterFlow(f);input.value=''};
  try{
    const callback=await fbDropboxHandleCallback();
    if(callback){
      if(sync)sync.disabled=false;
      fbSetDropboxStatus('Dropbox: conectado · permisos correctos');
      await fbDropboxSyncFlow();
      return;
    }
    if(await fbDropboxIsConnected()){
      if(sync)sync.disabled=false;
      fbSetDropboxStatus('Dropbox: conectado');
      // Automatic master-data refresh on app open.
      await fbDropboxSyncFlow();
    }
  }catch(e){fbSetDropboxStatus('Dropbox: '+e.message)}
});
