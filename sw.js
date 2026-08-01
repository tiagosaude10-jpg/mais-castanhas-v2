const CACHE_NAME = 'mais-castanhas-v8';
const APP_FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './logo-mais-castanhas.webp',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png'
];

const VISUAL_ADJUSTMENTS = `
  html,
  body,
  .auth-layout,
  .auth-panel,
  .auth-card {
    background: #FDE3C5 !important;
  }

  .auth-card {
    border-color: rgba(107, 62, 36, 0.14) !important;
    backdrop-filter: none !important;
  }

  .mobile-brand {
    background: transparent !important;
  }

  .input-wrap,
  .type-card,
  .review-card,
  dialog {
    background: #ffffff !important;
  }

  .wizard-heading {
    display: block !important;
    margin-bottom: 18px !important;
  }

  .registration-type-select-wrap {
    width: 100%;
  }

  .registration-type-select-wrap label {
    display: block;
    margin-bottom: 7px;
    color: #344038;
    font-size: .83rem;
    font-weight: 760;
  }

  .registration-type-select-wrap select {
    width: 100%;
    min-height: 52px;
    padding: 0 14px;
    border: 1px solid #dfe7de;
    border-radius: 13px;
    color: #202820;
    background: #ffffff;
    font: inherit;
  }

  @media (max-width: 640px) {
    html,
    body,
    .auth-layout,
    .auth-panel,
    .auth-card {
      background: #FDE3C5 !important;
    }
  }
`;

const LOCATION_ENHANCEMENT = `
;(() => {
  const IBGE_BASE = 'https://servicodados.ibge.gov.br/api/v1/localidades/estados';

  function replaceCityInput(cityId) {
    const current = document.getElementById(cityId);
    if (!current || current.tagName === 'SELECT') return current;

    const select = document.createElement('select');
    select.id = current.id;
    select.name = current.name;
    select.required = true;
    select.autocomplete = 'address-level2';
    select.disabled = true;
    select.innerHTML = '<option value="">Selecione primeiro o estado</option>';
    current.replaceWith(select);
    return select;
  }

  function moveStateBeforeCity(stateId, cityId) {
    const state = document.getElementById(stateId);
    const city = document.getElementById(cityId);
    const stateField = state?.closest('.field');
    const cityField = city?.closest('.field');
    const grid = stateField?.parentElement;

    if (grid && cityField && stateField && grid === cityField.parentElement) {
      grid.insertBefore(stateField, cityField);
    }
  }

  async function loadCities(stateSelect, citySelect) {
    const uf = stateSelect.value;
    citySelect.disabled = true;
    citySelect.innerHTML = uf
      ? '<option value="">Carregando cidades...</option>'
      : '<option value="">Selecione primeiro o estado</option>';

    if (!uf) return;

    try {
      const response = await fetch(IBGE_BASE + '/' + encodeURIComponent(uf) + '/municipios?orderBy=nome');
      if (!response.ok) throw new Error('Falha ao carregar municípios');

      const cities = await response.json();
      citySelect.innerHTML = '<option value="">Selecione a cidade</option>';
      cities.forEach((city) => {
        const option = document.createElement('option');
        option.value = city.nome;
        option.textContent = city.nome;
        citySelect.appendChild(option);
      });
      citySelect.disabled = false;
    } catch (error) {
      citySelect.innerHTML = '<option value="">Não foi possível carregar as cidades</option>';
      citySelect.disabled = false;
      console.error(error);
    }
  }

  function configurePair(stateId, cityId) {
    const stateSelect = document.getElementById(stateId);
    const citySelect = replaceCityInput(cityId);
    if (!stateSelect || !citySelect) return;

    moveStateBeforeCity(stateId, cityId);

    stateSelect.addEventListener('change', () => loadCities(stateSelect, citySelect));
    citySelect.addEventListener('change', () => {
      citySelect.closest('.input-wrap')?.classList.remove('invalid');
      const error = document.querySelector('[data-error-for="' + citySelect.id + '"]');
      if (error) error.textContent = '';
    });

    if (stateSelect.value) loadCities(stateSelect, citySelect);
  }

  function initializeLocations() {
    configurePair('pfState', 'pfCity');
    configurePair('pjState', 'pjCity');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLocations, { once: true });
  } else {
    initializeLocations();
  }
})();
`;

const TYPE_SELECTOR_ENHANCEMENT = `
;(() => {
  function initializeTypeSelector() {
    const heading = document.querySelector('.wizard-heading');
    const wizard = document.getElementById('registrationWizard');
    if (!heading || !wizard || heading.querySelector('#registrationTypeSelect')) return;

    heading.innerHTML = ` + "`" + `
      <div class="registration-type-select-wrap">
        <label for="registrationTypeSelect">Tipo de cadastro</label>
        <select id="registrationTypeSelect" aria-label="Tipo de cadastro">
          <option value="pf">Pessoa Física</option>
          <option value="pj">Pessoa Jurídica</option>
        </select>
      </div>
    ` + "`" + `;

    const select = document.getElementById('registrationTypeSelect');

    function syncFromCards() {
      const selectedCard = document.querySelector('[data-registration-type].selected');
      if (selectedCard) select.value = selectedCard.dataset.registrationType;
    }

    select.addEventListener('change', () => {
      const card = document.querySelector('[data-registration-type="' + select.value + '"]');
      card?.click();
      document.getElementById('startRegistration')?.click();
    });

    const observer = new MutationObserver(() => {
      if (!wizard.hidden) syncFromCards();
    });
    observer.observe(wizard, { attributes: true, attributeFilter: ['hidden'] });
    syncFromCards();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTypeSelector, { once: true });
  } else {
    initializeTypeSelector();
  }
})();
`;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isPage = event.request.mode === 'navigate';

  if (isPage) {
    event.respondWith(
      fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
        return response;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  if (url.origin === self.location.origin && url.pathname.endsWith('/styles.css')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => response.text())
        .then((css) => {
          const enhanced = new Response(css + '\n' + VISUAL_ADJUSTMENTS, {
            headers: { 'Content-Type': 'text/css; charset=utf-8' }
          });
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, enhanced.clone()));
          return enhanced;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (url.origin === self.location.origin && url.pathname.endsWith('/app.js')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => response.text())
        .then((js) => {
          const enhanced = new Response(js + '\n' + LOCATION_ENHANCEMENT + '\n' + TYPE_SELECTOR_ENHANCEMENT, {
            headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
          });
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, enhanced.clone()));
          return enhanced;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      }))
    );
  }
});