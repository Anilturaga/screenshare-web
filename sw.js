// Offline-capable app shell. Hashed build assets and tailcat.wasm.gz are
// cache-first; the page itself is network-first so new deploys load.
// `make web` stamps VERSION; a new version drops the old cache.
const VERSION = "4b83d2ffaaeb";
const CACHE = "screenshare-" + VERSION;
const PRECACHE = ["./", "wasm_exec.js", "tailcat.wasm.gz", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith("screenshare-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => put(req, r)).catch(() => caches.match("./")));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((r) => put(req, r))));
});

function put(req, res) {
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(req.mode === "navigate" ? "./" : req, copy));
  }
  return res;
}
