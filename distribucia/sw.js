// app shell, libraries and product images cached; data (Supabase) from network, offline copies kept by the app
const VER = "v10";
const IMG_HOST = "https://xytjlkcuhkekimtulnsa.supabase.co";
const SHELL = ["./", "./index.html", "./manifest.webmanifest"];
self.addEventListener("install", (e) => { e.waitUntil(caches.open("shell-" + VER).then((c) => c.addAll(SHELL))); self.skipWaiting(); });
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith("shell-") && k !== "shell-" + VER).map((k) => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener("fetch", (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (u.origin === IMG_HOST && u.pathname.startsWith("/storage/v1/object/public/catalog/")) {   // catalog images: cache first
    e.respondWith(caches.open("img").then(async (c) => (await c.match(e.request)) || fetch(e.request).then((r) => { if (r.ok || r.type === "opaque") c.put(e.request, r.clone()); return r; })));
    return;
  }
  if (/^(cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname)) {   // libraries + fonts: cache first, so the app opens offline
    e.respondWith(caches.open("lib").then(async (c) => (await c.match(e.request)) || fetch(e.request).then((r) => { if (r.ok || r.type === "opaque") c.put(e.request, r.clone()); return r; })));
    return;
  }
  if (u.origin !== location.origin) return;                                          // Supabase data untouched
  // app shell: network first (fresh version after each deploy), cache when offline
  e.respondWith(fetch(e.request).then((r) => { const cp = r.clone(); caches.open("shell-" + VER).then((c) => c.put(e.request, cp)); return r; })
    .catch(() => caches.match(e.request).then((m) => m || caches.match(new URL("index.html", self.registration.scope).href))));
});
