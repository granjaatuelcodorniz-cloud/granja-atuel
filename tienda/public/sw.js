// Preserve the offline incubation notebook. Never cache the store, login or checkout.
const CACHE='ga-incubacion-v4';
const ASSETS=['/incubacion','/incubacion.html','/favicon.png','/logo-granja-atuel-web.webp'];

self.addEventListener('install',event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));
 self.skipWaiting();
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith('ga-incubacion-')&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!ASSETS.includes(url.pathname))return;
 event.respondWith(fetch(event.request).catch(async()=>{
  const cache=await caches.open(CACHE);
  return await cache.match(url.pathname)||Response.error();
 }));
});
