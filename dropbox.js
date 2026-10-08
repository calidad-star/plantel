/* Francisco Ballester - Dropbox OAuth 2.0 + PKCE
   No App Secret is used: this is a public browser application. */
const FB_DROPBOX = {
  appKey: 'etmtuf5ltib9htn',
  redirectUri: 'https://calidad-star.github.io/plantel/',
  filePath: '/plantel-sync/movimientos.json',
  tokenStore: 'dropboxAuth'
};

function fbRandomString(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, v => chars[v % chars.length]).join('');
}

function fbBase64Url(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function fbSha256(value) {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
}

async function fbPkceChallenge(verifier) {
  return fbBase64Url(await fbSha256(verifier));
}

function fbOpenAuthDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(FB_DB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FB_STORE)) {
        const store = db.createObjectStore(FB_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('fecha', 'fecha');
        store.createIndex('tipo', 'tipo');
        store.createIndex('variedad', 'variedad');
      }
      if (!db.objectStoreNames.contains(FB_DROPBOX.tokenStore)) {
        db.createObjectStore(FB_DROPBOX.tokenStore, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function fbSaveDropboxToken(token) {
  const db = await fbOpenAuthDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FB_DROPBOX.tokenStore, 'readwrite');
    tx.objectStore(FB_DROPBOX.tokenStore).put({ id: 'current', ...token });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function fbGetDropboxToken() {
  const db = await fbOpenAuthDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FB_DROPBOX.tokenStore, 'readonly');
    const req = tx.objectStore(FB_DROPBOX.tokenStore).get('current');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function fbDeleteDropboxToken() {
  const db = await fbOpenAuthDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(FB_DROPBOX.tokenStore, 'readwrite');
    tx.objectStore(FB_DROPBOX.tokenStore).delete('current');
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function fbDropboxAuthorize() {
  const verifier = fbRandomString(64);
  const state = fbRandomString(32);
  const challenge = await fbPkceChallenge(verifier);
  sessionStorage.setItem('fb_dropbox_verifier', verifier);
  sessionStorage.setItem('fb_dropbox_state', state);

  const params = new URLSearchParams({
    client_id: FB_DROPBOX.appKey,
    response_type: 'code',
    redirect_uri: FB_DROPBOX.redirectUri,
    token_access_type: 'offline',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });
  location.href = 'https://www.dropbox.com/oauth2/authorize?' + params.toString();
}

async function fbDropboxHandleCallback() {
  const params = new URLSearchParams(location.search);
  const code = params.get('code');
  const state = params.get('state');
  const error = params.get('error');
  if (error) throw new Error('Dropbox no autorizó la aplicación: ' + error);
  if (!code) return false;

  const savedState = sessionStorage.getItem('fb_dropbox_state');
  const verifier = sessionStorage.getItem('fb_dropbox_verifier');
  if (!savedState || savedState !== state || !verifier) throw new Error('Validación OAuth/PKCE no válida. Vuelve a iniciar la conexión.');

  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    redirect_uri: FB_DROPBOX.redirectUri,
    client_id: FB_DROPBOX.appKey,
    code_verifier: verifier
  });
  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error_summary || 'Error al obtener el token de Dropbox.');

  await fbSaveDropboxToken({
    access_token: data.access_token,
    refresh_token: data.refresh_token || null,
    expires_at: Date.now() + (Number(data.expires_in || 14400) * 1000) - 60000,
    scope: data.scope || '',
    account_id: data.account_id || ''
  });
  sessionStorage.removeItem('fb_dropbox_state');
  sessionStorage.removeItem('fb_dropbox_verifier');
  history.replaceState({}, document.title, FB_DROPBOX.redirectUri);
  return true;
}

async function fbDropboxRefresh() {
  const token = await fbGetDropboxToken();
  if (!token?.refresh_token) throw new Error('No hay refresh token. Debes volver a conectar Dropbox.');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: token.refresh_token,
    client_id: FB_DROPBOX.appKey
  });
  const response = await fetch('https://api.dropboxapi.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await response.json();
  if (!response.ok) {
    await fbDeleteDropboxToken();
    throw new Error(data.error_description || data.error_summary || 'No se pudo renovar el acceso a Dropbox.');
  }
  const updated = {
    ...token,
    access_token: data.access_token,
    expires_at: Date.now() + (Number(data.expires_in || 14400) * 1000) - 60000,
    scope: data.scope || token.scope
  };
  await fbSaveDropboxToken(updated);
  return updated;
}

async function fbDropboxAccessToken() {
  let token = await fbGetDropboxToken();
  if (!token) throw new Error('Dropbox no está conectado.');
  if (!token.expires_at || Date.now() >= token.expires_at) token = await fbDropboxRefresh();
  return token.access_token;
}

async function fbDropboxApi(endpoint, body = null) {
  let accessToken = await fbDropboxAccessToken();
  const doRequest = async token => fetch('https://api.dropboxapi.com/2/' + endpoint, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : '{}'
  });
  let response = await doRequest(accessToken);
  if (response.status === 401) {
    await fbDropboxRefresh();
    accessToken = await fbDropboxAccessToken();
    response = await doRequest(accessToken);
  }
  return response;
}

async function fbDropboxDownloadSync() {
  let accessToken = await fbDropboxAccessToken();
  const response = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Dropbox-API-Arg': JSON.stringify({ path: FB_DROPBOX.filePath })
    }
  });
  if (response.status === 401) {
    await fbDropboxRefresh();
    return fbDropboxDownloadSync();
  }
  if (response.status === 409) {
    const text = await response.text();
    if (text.includes('path/not_found')) return null;
  }
  if (!response.ok) throw new Error('No se pudo descargar la sincronización de Dropbox.');
  return await response.json();
}

async function fbDropboxUploadSync(payload) {
  const accessToken = await fbDropboxAccessToken();
  const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + accessToken,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': JSON.stringify({ path: FB_DROPBOX.filePath, mode: 'overwrite', autorename: false, mute: true })
    },
    body: new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  });
  if (response.status === 401) {
    await fbDropboxRefresh();
    return fbDropboxUploadSync(payload);
  }
  if (!response.ok) throw new Error('No se pudo subir la sincronización a Dropbox.');
  return response.json();
}

async function fbDropboxIsConnected() {
  const token = await fbGetDropboxToken();
  return !!token?.refresh_token || !!token?.access_token;
}

function fbMovementUuid(m) {
  if (m.uuid) return m.uuid;
  return crypto.randomUUID ? crypto.randomUUID() : 'fb-' + Date.now() + '-' + Math.random().toString(36).slice(2);
}

async function fbGetNormalizedMovimientos() {
  const local = await fbGetMovimientos();
  let changed = false;
  const normalized = local.map(m => {
    if (m.uuid) return m;
    changed = true;
    return { ...m, uuid: fbMovementUuid(m), actualizado: m.fechaCreacion || new Date().toISOString() };
  });
  if (changed) {
    const db = await fbOpenDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(FB_STORE, 'readwrite');
      const store = tx.objectStore(FB_STORE);
      normalized.forEach(m => store.put(m));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
  return normalized;
}

async function fbSyncDropbox() {
  if (!navigator.onLine) throw new Error('Sin conexión a Internet.');
  if (!(await fbDropboxIsConnected())) throw new Error('Dropbox no está conectado.');

  const local = await fbGetNormalizedMovimientos();
  const cloud = await fbDropboxDownloadSync();
  const map = new Map();
  (cloud?.movimientos || []).forEach(m => map.set(m.uuid, m));
  local.forEach(m => {
    const old = map.get(m.uuid);
    const lm = Date.parse(m.actualizado || m.fechaCreacion || 0);
    const cm = Date.parse(old?.actualizado || old?.fechaCreacion || 0);
    if (!old || lm >= cm) map.set(m.uuid, m);
  });
  const merged = Array.from(map.values()).sort((a,b) => String(a.fechaCreacion||'').localeCompare(String(b.fechaCreacion||'')));
  await fbDropboxUploadSync({ version: 3, app: 'Plantel Francisco Ballester', fecha: new Date().toISOString(), movimientos: merged });

  // Bring cloud-only movements into this device.
  const db = await fbOpenDB();
  const existing = new Map(local.map(m => [m.uuid, m]));
  await new Promise((resolve, reject) => {
    const tx = db.transaction(FB_STORE, 'readwrite');
    const store = tx.objectStore(FB_STORE);
    merged.forEach(m => { if (!existing.has(m.uuid)) store.add({ ...m, sincronizado: true }); });
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  return { total: merged.length, cloudHad: cloud?.movimientos?.length || 0, localHad: local.length };
}
