/* Plantel Francisco Ballester V4.0 - actualización de aplicación */
const CACHE='plantel-fb-v40';
const ASSETS=['./','./index.html','./styles.css','./app.js','./data.js','./xlsx-parser.js','./dropbox.js','./manifest.json'];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  if(event.request.method!=='GET'||url.hostname.includes('dropboxapi.com'))return;
  const sameOrigin=url.origin===self.location.origin;
  if(!sameOrigin)return;
  // HTML y JavaScript: red primero para evitar servir versiones antiguas.
  const isShell=/\.(html|js|css|json)$/.test(url.pathname)||url.pathname.endsWith('/');
  if(isShell){
    event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{
      if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
      return response;
    }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
  }else{
    event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
  }
});
