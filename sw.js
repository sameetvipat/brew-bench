/*
 * Service worker:
 * 1. Offline: keeps a copy of the app (code, styles, recipes) so it opens with no connection.
 *    Online, every request goes to the network first and refreshes the copy, so you always get
 *    the latest version, with no mix of old and new files. Offline, the copy answers.
 * Your brews and beans are not here: they live in the page's own storage.
 */
const CACHE = "brew-bench-v5"; // bump to drop old copies (v2: network first, replaces v1's cache first)

const APP_FILES = [
  "./",
  "index.html",
  "style.css",
  "manifest.webmanifest",
  "fonts/fraunces.woff2",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/apple-touch-icon.png",
  "js/main.js",
  "js/router.js",
  "js/setup.js",
  "js/home.js",
  "js/brew.js",
  "js/timer.js",
  "js/journal.js",
  "js/shelf.js",
  "js/log.js",
  "js/backup.js",
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

// Network first (keeping the copy fresh); the copy only when the network fails.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request, { cache: "no-cache" }); // revalidate, never a stale HTTP cache
        if (response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(request, { ignoreSearch: true });
        if (cached) return cached;
        throw new Error(`offline and not saved: ${request.url}`);
      }
    })(),
  );
});
