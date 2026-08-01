(() => {
  'use strict';

  const profiles = {
    extrativista: 'Fornecimento e origem da castanha.',
    vendedor: 'Vendas, clientes e operações comerciais.',
    compras: 'Compras, fornecedores e negociações.',
    estoque: 'Lotes, recebimentos e movimentações.',
    financeiro: 'Pagamentos, recebimentos e fluxo de caixa.',
    gestor: 'Acompanhamento gerencial e relatórios.',
    consulta: 'Visualização de informações autorizadas.',
    administrador: 'Acesso amplo, sujeito à aprovação especial.'
  };

  function installStyles() {
    const style = document.createElement('style');
    style.textContent = `
      html, body, .auth-layout, .auth-panel, .auth-card { background:#FDE3C5 !important; }
      .auth-card { border-color:rgba(107,62,36,.14) !important; backdrop-filter:none !important; }
      .mobile-brand { background:transparent !important; }
      .input-wrap, .type-card, .review-card, dialog { background:#fff !important; }
      .profile-options { display:none !important; }
      .profile-choice { padding:20px !important; text-align:center !important; }
      .profile-choice h4,
      .profile-choice > p,
      .profile-choice .analysis-notice,
      .profile-choice .analysis-notice strong,
      .profile-choice .analysis-notice p { text-align:center !important; }
      .profile-choice > p { margin-left:auto !important; margin-right:auto !important; max-width:560px; }
      .profile-select-wrap { margin-top:16px; text-align:center; }
      .profile-select-wrap label { display:block; margin-bottom:10px; color:#344038; font-size:.88rem; font-weight:760; text-align:center; }
      .profile-select-wrap select,
      #pfCity,
      #pjCity {
        width:100%;
        min-height:72px;
        height:72px;
        padding:0 20px;
        border:1.5px solid #d7dfd2;
        border-radius:22px;
        color:#202820;
        background:#fff;
        font:inherit;
        font-size:1rem;
        box-sizing:border-box;
      }
      .profile-select-wrap select { text-align:center; text-align-last:center; }
      .profile-select-description { display:block; min-height:18px; margin-top:10px; color:#69736b; font-size:.78rem; line-height:1.45; text-align:center; }
      .success-state.success-enhanced { text-align:center; }
      .success-visual-stack { display:grid; gap:16px; margin:6px 0 22px; }
      .success-info-card { position:relative; padding:20px 18px; border:2px solid transparent; border-radius:20px; text-align:center; box-shadow:0 10px 28px rgba(55,75,52,.08); }
      .success-info-card h3,.success-info-card h4,.success-info-card p { margin-left:auto; margin-right:auto; text-align:center; }
      .success-info-card h3 { margin-top:8px; margin-bottom:10px; color:#12391a; font-size:1.35rem; line-height:1.22; }
      .success-info-card h4 { margin-top:6px; margin-bottom:8px; color:#173b1e; font-size:1rem; }
      .success-info-card p { margin-top:0; margin-bottom:0; color:#58645c; line-height:1.55; }
      .success-card-status { border-color:#d49a42; background:#fff8e8; }
      .success-card-process { border-color:#77a57c; background:#f3f8f2; }
      .success-card-contact { border-color:#b07a55; background:#fff4eb; }
      .success-card-icon { display:grid; place-items:center; width:44px; height:44px; margin:0 auto 8px; border-radius:50%; font-size:1.2rem; font-weight:900; }
      .success-card-status .success-card-icon { color:#8b4d12; background:#f7dcae; }
      .success-card-process .success-card-icon { color:#245c2c; background:#dcebdc; }
      .success-card-contact .success-card-icon { color:#7a3f20; background:#f2d9c7; }
      .success-state.success-enhanced .pending-badge { margin:0 auto 8px; border:1px solid #c7802f; background:#f7dcae; color:#743d15; }
      .success-state.success-enhanced .eyebrow { margin:4px 0 0; color:#5f6c63; }
      .success-contact-channels { display:flex; justify-content:center; flex-wrap:wrap; gap:8px; margin-top:14px; }
      .success-channel { display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border:1px solid #d8b79e; border-radius:999px; color:#6b3e24; background:#fff; font-size:.78rem; font-weight:800; }
      .success-state.success-enhanced > .primary-button,
      .success-state.success-enhanced > .secondary-button { margin-top:12px; }
    `;
    document.head.appendChild(style);
  }

  function compactProfiles() {
    document.querySelectorAll('.profile-choice').forEach((choice) => {
      if (choice.querySelector('.profile-select-wrap')) return;
      const radios = [...choice.querySelectorAll('.profile-option input[type="radio"]')];
      if (!radios.length) return;
      const prefix = radios[0].name.startsWith('pf') ? 'pf' : 'pj';
      const wrap = document.createElement('div');
      wrap.className = 'profile-select-wrap';
      wrap.innerHTML = `
        <label for="${prefix}ProfileSelect">Perfil solicitado</label>
        <select id="${prefix}ProfileSelect" aria-label="Perfil solicitado">
          <option value="">Selecione o perfil</option>
          ${radios.map((radio) => `<option value="${radio.value}">${radio.dataset.label || radio.value}</option>`).join('')}
        </select>
        <small class="profile-select-description" id="${prefix}ProfileDescription"></small>`;
      choice.querySelector('.profile-options')?.insertAdjacentElement('beforebegin', wrap);
      const select = wrap.querySelector('select');
      const description = wrap.querySelector('small');
      select.addEventListener('change', () => {
        radios.forEach((radio) => {
          radio.checked = radio.value === select.value;
          if (radio.checked) radio.dispatchEvent(new Event('change', { bubbles:true }));
        });
        description.textContent = profiles[select.value] || '';
        const error = document.getElementById(`${prefix}ProfileError`);
        if (error) error.textContent = '';
      });
    });
  }

  function replaceCityInput(cityId) {
    const current = document.getElementById(cityId);
    if (!current) return null;
    if (current.tagName === 'SELECT') return current;
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

  async function loadCities(stateSelect, citySelect) {
    const uf = stateSelect.value;
    citySelect.disabled = true;
    citySelect.innerHTML = uf ? '<option value="">Carregando cidades...</option>' : '<option value="">Selecione primeiro o estado</option>';
    if (!uf) return;
    try {
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`, { cache:'no-store' });
      if (!response.ok) throw new Error('Falha ao carregar cidades');
      const cities = await response.json();
      citySelect.innerHTML = '<option value="">Selecione a cidade</option>';
      cities.forEach(({ nome }) => citySelect.add(new Option(nome, nome)));
      citySelect.disabled = false;
    } catch (error) {
      citySelect.innerHTML = '<option value="">Não foi possível carregar as cidades</option>';
      citySelect.disabled = false;
      console.error(error);
    }
  }

  function configureLocation(stateId, cityId) {
    const state = document.getElementById(stateId);
    const city = replaceCityInput(cityId);
    if (!state || !city) return;
    const stateField = state.closest('.field');
    const cityField = city.closest('.field');
    const parent = stateField?.parentElement;
    if (parent && cityField && stateField && cityField.parentElement === parent) parent.insertBefore(stateField, cityField);
    state.addEventListener('change', () => loadCities(state, city));
    city.addEventListener('change', () => {
      city.closest('.input-wrap')?.classList.remove('invalid');
      const error = document.querySelector(`[data-error-for="${city.id}"]`);
      if (error) error.textContent = '';
    });
    if (state.value) loadCities(state, city);
  }

  function enhanceSuccessScreen() {
    const success = document.getElementById('registrationSuccess');
    if (!success || success.dataset.visualEnhanced === 'true') return;
    const badge = success.querySelector('.pending-badge');
    const eyebrow = success.querySelector('.eyebrow');
    const title = success.querySelector('h3');
    const summary = title?.nextElementSibling?.tagName === 'P' ? title.nextElementSibling : null;
    const notice = success.querySelector('.analysis-notice');
    const primaryButton = success.querySelector('#newRegistration');
    if (!badge || !title || !summary || !notice || !primaryButton) return;
    const stack = document.createElement('div');
    stack.className = 'success-visual-stack';
    const statusCard = document.createElement('section');
    statusCard.className = 'success-info-card success-card-status';
    statusCard.setAttribute('aria-label', 'Status do cadastro');
    statusCard.append(badge, eyebrow || document.createTextNode(''), title);
    const processCard = document.createElement('section');
    processCard.className = 'success-info-card success-card-process';
    processCard.setAttribute('aria-label', 'Próxima etapa');
    processCard.innerHTML = '<span class="success-card-icon" aria-hidden="true">✓</span><h4>O que acontece agora</h4>';
    processCard.append(summary);
    const processDetail = document.createElement('p');
    processDetail.textContent = 'O acesso permanecerá bloqueado até que um administrador conclua a análise e autorize o perfil solicitado.';
    processDetail.style.marginTop = '10px';
    processCard.append(processDetail);
    const contactCard = document.createElement('section');
    contactCard.className = 'success-info-card success-card-contact';
    contactCard.setAttribute('aria-label', 'Forma de retorno');
    contactCard.innerHTML = '<span class="success-card-icon" aria-hidden="true">!</span>';
    while (notice.firstChild) contactCard.append(notice.firstChild);
    const channels = document.createElement('div');
    channels.className = 'success-contact-channels';
    channels.innerHTML = '<span class="success-channel">E-mail informado</span><span class="success-channel">WhatsApp informado</span>';
    contactCard.append(channels);
    notice.remove();
    stack.append(statusCard, processCard, contactCard);
    success.insertBefore(stack, primaryButton);
    success.classList.add('success-enhanced');
    success.dataset.visualEnhanced = 'true';
  }

  function watchSuccessScreen() {
    const success = document.getElementById('registrationSuccess');
    if (!success) return;
    const observer = new MutationObserver(() => enhanceSuccessScreen());
    observer.observe(success, { childList:true, subtree:false });
    enhanceSuccessScreen();
  }

  function loadSupabaseIntegration() {
    if (document.querySelector('script[data-supabase-library]')) return;
    const library = document.createElement('script');
    library.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    library.dataset.supabaseLibrary = 'true';
    library.onload = () => {
      const integration = document.createElement('script');
      integration.src = './supabase-v14.js?v=16';
      integration.dataset.supabaseIntegration = 'true';
      document.head.appendChild(integration);
    };
    library.onerror = () => console.error('Não foi possível carregar a biblioteca do Supabase.');
    document.head.appendChild(library);
  }

  function init() {
    installStyles();
    configureLocation('pfState', 'pfCity');
    configureLocation('pjState', 'pjCity');
    compactProfiles();
    watchSuccessScreen();
    loadSupabaseIntegration();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
