// Squished service worker: offline app shell, cached build assets, and the Web Share Target.
// Files shared to the app are kept in IndexedDB on this device only, then handed to the page.
const SHELL = "squished-shell-v1";
const ASSETS = "squished-assets-v1";
const PRECACHE = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function openShareDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("squished-share", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files", { autoIncrement: true });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function handleShare(request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files").filter((f) => f instanceof File);
    const db = await openShareDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      files.forEach((f) => tx.objectStore("files").add(f));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.warn("[squished] share target failed:", err);
  }
  return Response.redirect("/?shared=1", 303);
}

const isImmutable = (url) =>
  (url.origin === self.location.origin && /^\/(assets|wasm|icons)\//.test(url.pathname)) ||
  (url.origin === "https://unpkg.com" && url.pathname.startsWith("/@ffmpeg/core@"));

async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function networkFirst(request) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return (await cache.match(request, { ignoreSearch: true })) || (await cache.match("/")) || Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method === "POST" && url.origin === self.location.origin && url.pathname === "/share-target") {
    event.respondWith(handleShare(request));
    return;
  }
  if (request.method !== "GET") return;
  if (request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  } else if (isImmutable(url)) {
    event.respondWith(cacheFirst(request));
  }
});
