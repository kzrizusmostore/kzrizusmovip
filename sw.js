const CACHE_NAME='kzrizusmo-ff-pwa-v6';
const CORE=['/manifest.webmanifest','/icon-192.png','/icon-512.png'];
self.addEventListener('install',event=>{
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(async cache=>{
    for(const url of CORE){ try{ await cache.add(url); }catch(e){} }
  }));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>caches.match('/')));
    return;
  }
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});
