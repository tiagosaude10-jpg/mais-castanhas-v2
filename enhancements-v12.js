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
        <small class="profile-select-description" id="${prefix}ProfileDescription"></small>
      `;

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
    citySelect.innerHTML = uf
      ? '<option value="">Carregando cidades...</option>'
      : '<option value="">Selecione primeiro o estado</option>';
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
    if (parent && cityField && stateField && cityField.parentElement === parent) {
      parent.insertBefore(stateField, cityField);
    }

    state.addEventListener('change', () => loadCities(state, city));
    city.addEventListener('change', () => {
      city.closest('.input-wrap')?.classList.remove('invalid');
      const error = document.querySelector(`[data-error-for="${city.id}"]`);
      if (error) error.textContent = '';
    });
    if (state.value) loadCities(state, city);
  }

  function init() {
    installStyles();
    configureLocation('pfState', 'pfCity');
    configureLocation('pjState', 'pjCity');
    compactProfiles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once:true });
  } else {
    init();
  }
})();
