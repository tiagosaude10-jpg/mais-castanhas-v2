/* Mais Castanhas — modo de desenvolvimento sem cache.
   Mantém os arquivos sempre atualizados e aplica os ajustes visuais atuais. */

const VISUAL_ADJUSTMENTS = `
  html,
  body,
  .auth-layout,
  .auth-panel {
    background: #fde3c5 !important;
  }

  .auth-card {
    background: rgba(255, 250, 241, 0.96) !important;
  }

  .mobile-brand {
    background: transparent !important;
  }

  .field:has(#pfOperationName) {
    display: none !important;
  }

  @media (max-width: 640px) {
    body,
    .auth-panel {
      background: #fde3c5 !important;
    }
  }
`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);

  if (requestUrl.pathname.endsWith("/styles.css")) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then((response) => response.text())
        .then((css) => new Response(`${css}\n${VISUAL_ADJUSTMENTS}`, {
          headers: {
            "Content-Type": "text/css; charset=utf-8",
            "Cache-Control": "no-store"
          }
        }))
    );
    return;
  }

  event.respondWith(
    fetch(event.request, { cache: "no-store" }).catch(() =>
      caches.match(event.request)
    )
  );
});
