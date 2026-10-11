// Offline-capable app shell. Hashed build assets and tailcat.wasm.gz are
// cache-first; the page itself is network-first so new deploys load.
//
// Cache Storage is shared by every page on this origin (all of the
// account's GitHub Pages sites), so a cached response is only served if its
// SHA-256 matches HASHES. `make web` (scripts/stamp-sw.mjs) stamps VERSION
// and HASHES; the browser always fetches this file itself from the network.
const VERSION = "2916b7e0a273";
const HASHES = {"assets/index-BAOxSNP5.js":"j2I/BIs7dP0+2E4cow11ans7+PE4evv2PkTEmaifoL0=","assets/index-VYJC8LNZ.css":"CXQCsfVy9I67pDN5cIQeAivO1HzEZQdTRMQLuQCHdws=","icon-192.png":"vaFoSdPPFKlFxO3XahKqGPJclTehJupO9r5asO5Njh4=","icon-512.png":"yJ90S/eQIJYVoIWxmQoQuuGau+5PQlDG1aS4FFUFHqA=","icon.svg":"4/9kMVKtY0X6SNJoc9WUmG27wukukQU1Uzl6iByJiII=","index.html":"6QL7tVpR0/AdkMZrX+teA3rZg9ng9aUfanQJNKTuh38=","manifest.webmanifest":"mPdMpKkUTeLwVwfUh1G0yOeN6Ku/DZmIaxC5xkReOiU=","tailcat.wasm.gz":"6iJY6ec4SloF9wO+KNQ+u+Fy8mJGgDNe6JkNpov7734=","wasm_exec.js":"DJSfSZb5qJaY5LXFht4yJJw7abe6rbZNIgBzzASsuhQ="};
const CACHE = "screenshare-" + VERSION;
const PRECACHE = ["wasm_exec.js", "tailcat.wasm.gz", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png"];
const SCOPE = new URL(self.registration.scope).pathname;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", ...PRECACHE])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k.startsWith("screenshare-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin || !url.pathname.startsWith(SCOPE)) return;
  const path = url.pathname.slice(SCOPE.length) || "index.html";
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((r) => store("./", r)).catch(() => fromCache("./", "index.html")));
    return;
  }
  e.respondWith(fromCache(req, path).then((hit) => hit || fetch(req).then((r) => store(req, r))));
});

// fromCache returns a cached response only if it matches its build hash.
async function fromCache(key, path) {
  const want = HASHES[path];
  if (!want) return undefined;
  const cache = await caches.open(CACHE);
  const hit = await cache.match(key, { ignoreSearch: true });
  if (!hit) return undefined;
  if ((await digest(hit.clone())) === want) return hit;
  await cache.delete(key, { ignoreSearch: true }); // tampered or stale
  return undefined;
}

function store(key, res) {
  if (res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(key, copy));
  }
  return res;
}

async function digest(res) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", await res.arrayBuffer()));
  return btoa(String.fromCharCode(...h));
}
