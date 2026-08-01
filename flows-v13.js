(() => {
  'use strict';

  const STORAGE_KEY = 'maisCastanhas.pendingRegistrations.v1';
  const RECOVERY_KEY = 'maisCastanhas.passwordRecovery.v1';

  const $ = (selector, context = document) => context.querySelector(selector);
  const value = (selector) => $(selector)?.value?.trim() || '';

  function readList(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeList(key, list) {
    localStorage.setItem(key, JSON.stringify(list));
  }

  function selectedProfile(prefix) {
    const radio = document.querySelector(`input[name="${prefix}RequestedProfile"]:checked`);
    return radio ? {
      code: radio.value,
      label: radio.dataset.label || radio.value
    } : { code: '', label: '' };
  }

  function registrationPayload() {
    const isPJ = Boolean(value('#pjCnpj'));
    const prefix = isPJ ? 'pj' : 'pf';
    const profile = selectedProfile(prefix);

    if (isPJ) {
      return {
        id: `MC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
        type: 'pessoa_juridica',
        status: 'pending',
        requestedProfile: profile,
        company: {
          legalName: value('#pjLegalName'),
          tradeName: value('#pjTradeName'),
          cnpj: value('#pjCnpj'),
          email: value('#pjCompanyEmail'),
          phone: value('#pjCompanyPhone'),
          state: value('#pjState'),
          city: value('#pjCity')
        },
        responsible: {
          name: value('#pjResponsibleName'),
          cpf: value('#pjResponsibleCpf'),
          role: value('#pjResponsibleRole'),
          email: value('#pjResponsibleEmail'),
          phone: value('#pjResponsiblePhone')
        },
        approval: {
          reviewedBy: null,
          reviewedAt: null,
          decision: null,
          notes: ''
        },
        notifications: {
          email: { address: value('#pjResponsibleEmail'), status: 'waiting_backend' },
          whatsapp: { number: value('#pjResponsiblePhone'), status: 'waiting_backend' }
        },
        createdAt: new Date().toISOString()
      };
    }

    return {
      id: `MC-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      type: 'pessoa_fisica',
      status: 'pending',
      requestedProfile: profile,
      person: {
        name: value('#pfFullName'),
        cpf: value('#pfCpf'),
        email: value('#pfEmail'),
        phone: value('#pfPhone'),
        state: value('#pfState'),
        city: value('#pfCity')
      },
      approval: {
        reviewedBy: null,
        reviewedAt: null,
        decision: null,
        notes: ''
      },
      notifications: {
        email: { address: value('#pfEmail'), status: 'waiting_backend' },
        whatsapp: { number: value('#pfPhone'), status: 'waiting_backend' }
      },
      createdAt: new Date().toISOString()
    };
  }

  function savePendingRegistration() {
    const payload = registrationPayload();
    const contact = payload.type === 'pessoa_juridica' ? payload.responsible : payload.person;
    if (!contact?.email || !payload.requestedProfile.code) return;

    const list = readList(STORAGE_KEY);
    const duplicate = list.some((item) => {
      const currentContact = item.type === 'pessoa_juridica' ? item.responsible : item.person;
      return currentContact?.email === contact.email && item.status === 'pending';
    });
    if (!duplicate) {
      list.push(payload);
      writeList(STORAGE_KEY, list);
    }
  }

  function updateApproval(id, decision, administrator, notes = '') {
    const allowed = ['approved', 'rejected', 'needs_adjustment'];
    if (!allowed.includes(decision)) throw new Error('Decisão de aprovação inválida.');
    const list = readList(STORAGE_KEY);
    const item = list.find((entry) => entry.id === id);
    if (!item) throw new Error('Solicitação não encontrada.');

    item.status = decision;
    item.approval = {
      reviewedBy: administrator,
      reviewedAt: new Date().toISOString(),
      decision,
      notes
    };
    item.notifications.email.status = 'ready_for_backend';
    item.notifications.whatsapp.status = 'ready_for_backend';
    writeList(STORAGE_KEY, list);
    return item;
  }

  window.MaisCastanhasApprovalFlow = Object.freeze({
    list: () => readList(STORAGE_KEY),
    approve: (id, administrator, notes) => updateApproval(id, 'approved', administrator, notes),
    reject: (id, administrator, notes) => updateApproval(id, 'rejected', administrator, notes),
    requestAdjustment: (id, administrator, notes) => updateApproval(id, 'needs_adjustment', administrator, notes)
  });

  function installRecoveryStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .recovery-overlay{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;background:rgba(11,42,18,.58)}
      .recovery-overlay[hidden]{display:none}
      .recovery-card{width:min(460px,100%);padding:26px;border:1px solid #d9c2a6;border-radius:24px;background:#fff8ee;box-shadow:0 24px 70px rgba(20,48,25,.28);text-align:center}
      .recovery-card h3{margin:0 0 10px;color:#173b1e;font-size:1.35rem}
      .recovery-card p{margin:0 0 18px;color:#657068;line-height:1.55}
      .recovery-card label{display:block;margin-bottom:8px;color:#344038;font-weight:800;text-align:left}
      .recovery-card input{width:100%;min-height:62px;padding:0 17px;border:1.5px solid #d7dfd2;border-radius:18px;font:inherit;box-sizing:border-box}
      .recovery-actions{display:grid;gap:10px;margin-top:18px}
      .recovery-message{margin-top:14px;padding:13px;border-radius:14px;background:#f2e2cd;color:#6b3e24;font-size:.82rem;line-height:1.5}
      .recovery-error{display:block;min-height:18px;margin-top:7px;color:#a43b32;font-size:.76rem;text-align:left}
    `;
    document.head.appendChild(style);
  }

  function createRecoveryModal() {
    const overlay = document.createElement('div');
    overlay.className = 'recovery-overlay';
    overlay.id = 'passwordRecoveryOverlay';
    overlay.hidden = true;
    overlay.innerHTML = `
      <section class="recovery-card" role="dialog" aria-modal="true" aria-labelledby="recoveryTitle">
        <h3 id="recoveryTitle">Recuperar acesso</h3>
        <p>Informe o e-mail usado no cadastro. Quando o backend estiver conectado, enviaremos um link seguro e temporário para redefinir a senha.</p>
        <label for="recoveryEmail">E-mail cadastrado</label>
        <input id="recoveryEmail" type="email" autocomplete="email" placeholder="seuemail@exemplo.com">
        <small id="recoveryError" class="recovery-error"></small>
        <div id="recoveryResult" class="recovery-message" hidden></div>
        <div class="recovery-actions">
          <button id="requestRecovery" class="primary-button" type="button">Solicitar recuperação</button>
          <button id="closeRecovery" class="secondary-button" type="button">Voltar</button>
        </div>
      </section>`;
    document.body.appendChild(overlay);

    const email = $('#recoveryEmail', overlay);
    const error = $('#recoveryError', overlay);
    const result = $('#recoveryResult', overlay);

    $('#requestRecovery', overlay).addEventListener('click', () => {
      const address = email.value.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(address)) {
        error.textContent = 'Digite um e-mail válido.';
        result.hidden = true;
        return;
      }

      error.textContent = '';
      const requests = readList(RECOVERY_KEY);
      requests.push({
        id: `REC-${Date.now()}`,
        email: address,
        status: 'waiting_backend',
        requestedAt: new Date().toISOString(),
        token: null,
        expiresAt: null
      });
      writeList(RECOVERY_KEY, requests);
      result.innerHTML = '<strong>Solicitação registrada.</strong><br>O envio real do link será ativado quando conectarmos o serviço de autenticação e e-mail.';
      result.hidden = false;
    });

    function close() {
      overlay.hidden = true;
      email.value = '';
      error.textContent = '';
      result.hidden = true;
    }
    $('#closeRecovery', overlay).addEventListener('click', close);
    overlay.addEventListener('click', (event) => { if (event.target === overlay) close(); });
    return { overlay, email };
  }

  function initRecovery() {
    installRecoveryStyles();
    const modal = createRecoveryModal();
    const trigger = $('#forgotPassword');
    trigger?.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      modal.overlay.hidden = false;
      modal.email.focus();
    }, true);
  }

  function watchCompletedRegistration() {
    const success = $('#registrationSuccess');
    if (!success) return;
    let savedForCurrentDisplay = false;
    const check = () => {
      if (!success.hidden && !savedForCurrentDisplay) {
        savePendingRegistration();
        savedForCurrentDisplay = true;
      }
      if (success.hidden) savedForCurrentDisplay = false;
    };
    new MutationObserver(check).observe(success, { attributes: true, attributeFilter: ['hidden'] });
    check();
  }

  function improveFinalCommunication() {
    const success = $('#registrationSuccess');
    if (!success) return;
    const observer = new MutationObserver(() => {
      const processCard = $('.success-card-process', success);
      const contactCard = $('.success-card-contact', success);
      if (processCard && !processCard.dataset.copyReviewed) {
        const title = $('h4', processCard);
        if (title) title.textContent = 'Análise administrativa';
        processCard.dataset.copyReviewed = 'true';
      }
      if (contactCard && !contactCard.dataset.copyReviewed) {
        const heading = $('strong', contactCard);
        if (heading) heading.textContent = 'Retorno da análise';
        contactCard.dataset.copyReviewed = 'true';
      }
    });
    observer.observe(success, { childList: true, subtree: true });
  }

  function init() {
    initRecovery();
    watchCompletedRegistration();
    improveFinalCommunication();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();