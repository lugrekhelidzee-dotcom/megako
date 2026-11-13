/* JDE vs MEGAKO — ოფლაინ რეჟიმი: აპის ფაილები, ბიბლიოთეკები და ფოტოები ინახება მოწყობილობაზე */
const C = "mg-app-v1", IMG = "mg-img-v1", LIB = "mg-lib-v1";
const CORE = ["./", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).catch(() => {})); self.skipWaiting(); });
self.addEventListener("activate", e => { e.waitUntil((async () => { const keep = [C, IMG, LIB]; for (const k of await caches.keys()) if (!keep.includes(k)) await caches.delete(k); await self.clients.claim(); })()); });
const timeout = (p, ms) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("timeout")), ms); p.then(v => { clearTimeout(t); res(v); }, e => { clearTimeout(t); rej(e); }); });
async function trim(name, max) { const c = await caches.open(name); const ks = await c.keys(); for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]); }
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const u = new URL(req.url);
  // აპი: ჯერ ინტერნეტი (ყოველთვის ახალი ვერსია), ვერ შედგა — შენახული ასლი
  if (u.origin === location.origin) {
    e.respondWith((async () => {
      const isPage = req.mode === "navigate" || u.pathname.endsWith("/") || u.pathname.endsWith(".html");
      try { const r = await timeout(fetch(req, { cache: "no-store" }), isPage ? 6000 : 10000); if (r && r.ok && !u.search) { const c = await caches.open(C); c.put(isPage ? "./" : req, r.clone()); } return r; }
      catch (err) { const c = await caches.open(C); return (await c.match(isPage ? "./" : req, { ignoreSearch: true })) || (await c.match("./")) || Response.error(); }
    })());
    return;
  }
  // ბიბლიოთეკები და შრიფტები (Excel და სხვ.) — ერთხელ ჩამოტვირთვა და შენახვა
  if (/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(u.hostname)) {
    e.respondWith(caches.open(LIB).then(async c => { const m = await c.match(req); if (m) return m; const r = await fetch(req); if (r && (r.ok || r.type === "opaque")) c.put(req, r.clone()); return r; }));
    return;
  }
  // ფოტოები (Supabase Storage) — ნანახი ფოტოები ოფლაინაც ჩანს
  if (/supabase\.co$/.test(u.hostname) && u.pathname.includes("/storage/v1/object/public/")) {
    e.respondWith(caches.open(IMG).then(async c => { const m = await c.match(req); if (m) return m; const r = await fetch(req); if (r && (r.ok || r.type === "opaque")) { c.put(req, r.clone()); trim(IMG, 600); } return r; }));
  }
});
