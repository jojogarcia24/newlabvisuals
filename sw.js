/* All Things REELestate — service worker
   Handles offline app-shell caching, web-push notifications, and click routing. */
const VERSION = "atr-v2";
const SHELL = [
  "index.html",
  "assets/css/styles.css",
  "assets/js/main.js",
  "manifest.webmanifest",
  "assets/icons/icon-192.png",
  "assets/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll(SHELL)).catch(() => {}),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Only handle same-origin GETs; let Supabase / fonts / CDNs pass straight through.
  if (url.origin !== self.location.origin) return;

  // Network-first: always fetch fresh when online (so updates apply immediately),
  // fall back to cache only when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((r) => r || (req.mode === "navigate" ? caches.match("index.html") : undefined)),
      ),
  );
});

/* ---------- Web push ---------- */
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = { title: "All Things REELestate", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "All Things REELestate";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "assets/icons/icon-192.png",
      badge: "assets/icons/icon-192.png",
      data: { url: data.url || "portal/app.html" },
      vibrate: [80, 40, 80],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "portal/app.html";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((cs) => {
      for (const c of cs) {
        if ("focus" in c) { c.navigate(target); return c.focus(); }
      }
      return self.clients.openWindow(target);
    }),
  );
});
