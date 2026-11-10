/*
 * Service worker:
 * 1. Offline: keeps a copy of the app (code, styles, recipes) so it opens with no connection.
 *    Each request is answered from the copy straight away, and the copy is refreshed from the
 *    network in the background, so a new version shows up on the next open.
 * 2. Step notifications while the screen is locked, and bringing the app back when one is tapped.
 * Your brews and beans are not here: they live in the page's own storage.
 */
const CACHE = "brew-bench-v1"; // bump to drop old copies after changing the file list

const APP_FILES = [
  "./",
  "index.html",
  "style.css",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "js/main.js",
  "js/router.js",
  "js/setup.js",
  "js/home.js",
  "js/recipelist.js",
  "js/brew.js",
  "js/timer.js",
  "js/journal.js",
  "js/shelf.js",
  "js/log.js",
  "js/state.js",
  "js/recipes.js",
  "js/icons.js",
  "js/util.js",
  "recipes/index.json",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await cache.addAll(APP_FILES);
      // recipe files are listed in recipes/index.json, so they never need adding here by hand
      const recipes = await (await fetch("recipes/index.json")).json();
      await cache.addAll(recipes.map((file) => `recipes/${file}`));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

// Answer from the copy, refresh it in the background; fall back to the network for anything new.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request, { ignoreSearch: true });
      const fresh = fetch(request)
        .then((response) => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached); // offline: keep using the copy
      if (cached) {
        event.waitUntil(fresh); // let the refresh finish after we answer
        return cached;
      }
      return fresh;
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((windows) => (windows[0] ? windows[0].focus() : self.clients.openWindow("./"))),
  );
});
