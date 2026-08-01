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

const PROFILE_SELECT_PATCH = `
(() => {
  const profiles = [
    ["extrativista", "Extrativista", "Fornecimento e origem da castanha."],
    ["vendedor", "Vendedor / Comercial", "Vendas, clientes e operações comerciais."],
    ["compras", "Compras", "Compras, fornecedores e negociações."],
    ["estoque", "Estoque", "Lotes, recebimentos e movimentações."],
    ["financeiro", "Financeiro", "Pagamentos, recebimentos e fluxo de caixa."],
    ["gestor", "Gestor", "Acompanhamento gerencial e relatórios."],
    ["consulta", "Consulta", "Visualização de informações autorizadas."],
    ["administrador", "Administrador", "Acesso amplo, sujeito à aprovação especial."]
  ];

  const style = document.createElement("style");
  style.textContent = ".profile-options{display:block!important}.profile-option{display:none!important}.compact-profile-select{width:100%;min-height:54px;padding:0 14px;border:1px solid #d8e2d7;border-radius:13px;background:#fff;color:#173b1e;font-weight:750;font-size:1rem}.compact-profile-description{display:block;min-height:18px;margin-top:8px;color:#69736b;font-size:.72rem;line-height:1.4}.profile-choice{padding:16px!important}.profile-choice>p{margin-bottom:12px!important}";
  document.head.appendChild(style);

  ["pf", "pj"].forEach((prefix) => {
    const container = document.querySelector('[data-step-key="' + prefix + '-access"] .profile-options');
    if (!container || container.querySelector(".compact-profile-select")) return;

    const select = document.createElement("select");
    select.className = "compact-profile-select";
    select.setAttribute("aria-label", "Perfil solicitado");
    select.innerHTML = '<option value="">Selecione um perfil</option>' + profiles.map((p) => '<option value="' + p[0] + '">' + p[1] + '</option>').join("");

    const description = document.createElement("small");
    description.className = "compact-profile-description";
    description.textContent = "Toque no campo e escolha o perfil que deseja solicitar.";

    container.prepend(description);
    container.prepend(select);

    select.addEventListener("change", () => {
      const radio = container.querySelector('input[value="' + select.value + '"]');
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event("change", { bubbles: true }));
      }
      const selected = profiles.find((p) => p[0] === select.value);
      description.textContent = selected ? selected[2] : "Toque no campo e escolha o perfil que deseja solicitar.";
      const error = document.getElementById(prefix + "ProfileError");
      if (error) error.textContent = "";
    });
  });
})();
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

  if (requestUrl.pathname.endsWith("/app.js")) {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then((response) => response.text())
        .then((source) => new Response(`${source}\n${PROFILE_SELECT_PATCH}`, {
          headers: {
            "Content-Type": "application/javascript; charset=utf-8",
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
