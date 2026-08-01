(() => {
  "use strict";

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

  const ui = {
    loginTab: $("#loginTab"), registerTab: $("#registerTab"),
    loginPanel: $("#loginPanel"), registerPanel: $("#registerPanel"),
    panelTitle: $("#panelTitle"), panelDescription: $("#panelDescription"),
    toast: $("#toast"), infoModal: $("#infoModal"),
    modalTitle: $("#modalTitle"), modalBody: $("#modalBody"),
    typeSelection: $("#typeSelection"), wizard: $("#registrationWizard"),
    success: $("#registrationSuccess"), form: $("#registerForm"),
    start: $("#startRegistration"), previous: $("#previousStep"),
    next: $("#nextStep"), finish: $("#finishRegistration"),
    typeBadge: $("#selectedTypeBadge"), stepLabel: $("#stepLabel"),
    stepName: $("#stepName"), stepCounter: $("#stepCounter"),
    stepProgress: $("#stepProgress"), stepDots: $("#stepDots")
  };

  const states = [
    ["AC","Acre"],["AL","Alagoas"],["AP","Amapá"],["AM","Amazonas"],
    ["BA","Bahia"],["CE","Ceará"],["DF","Distrito Federal"],["ES","Espírito Santo"],
    ["GO","Goiás"],["MA","Maranhão"],["MT","Mato Grosso"],["MS","Mato Grosso do Sul"],
    ["MG","Minas Gerais"],["PA","Pará"],["PB","Paraíba"],["PR","Paraná"],
    ["PE","Pernambuco"],["PI","Piauí"],["RJ","Rio de Janeiro"],["RN","Rio Grande do Norte"],
    ["RS","Rio Grande do Sul"],["RO","Rondônia"],["RR","Roraima"],["SC","Santa Catarina"],
    ["SP","São Paulo"],["SE","Sergipe"],["TO","Tocantins"]
  ];

  const profiles = [
    ["extrativista", "Extrativista", "Fornecimento e origem da castanha."],
    ["vendedor", "Vendedor / Comercial", "Vendas, clientes e operações comerciais."],
    ["compras", "Compras", "Compras, fornecedores e negociações."],
    ["estoque", "Estoque", "Lotes, recebimentos e movimentações."],
    ["financeiro", "Financeiro", "Pagamentos, recebimentos e fluxo de caixa."],
    ["gestor", "Gestor", "Acompanhamento gerencial e relatórios."],
    ["consulta", "Consulta", "Visualização de informações autorizadas."],
    ["administrador", "Administrador", "Acesso amplo, sujeito à aprovação especial dos administradores proprietários."]
  ];

  const flows = {
    pf: [
      { key: "pf-person", name: "Dados pessoais" },
      { key: "pf-access", name: "Perfil e acesso" },
      { key: "pf-review", name: "Revisão" }
    ],
    pj: [
      { key: "pj-company", name: "Empresa" },
      { key: "pj-responsible", name: "Responsável" },
      { key: "pj-access", name: "Perfil e acesso" },
      { key: "pj-review", name: "Revisão" }
    ]
  };

  let selectedType = null;
  let currentStep = 0;
  let toastTimer;

  const digits = (value) => String(value || "").replace(/\D/g, "");
  const fieldValue = (id) => document.querySelector(id)?.value?.trim() || "";

  function installProfileUI() {
    $("#pfOperationName")?.closest(".field")?.remove();

    const style = document.createElement("style");
    style.textContent = `
      .profile-choice{margin:0 0 20px;padding:18px;border:1px solid #dfc7aa;border-radius:16px;background:#fff8ee}
      .profile-choice h4{margin:0 0 6px;color:#173b1e;font-size:1rem}
      .profile-choice>p{margin:0 0 14px;color:#69736b;font-size:.8rem;line-height:1.5}
      .profile-options{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .profile-option{position:relative;display:block}
      .profile-option input{position:absolute;opacity:0;pointer-events:none}
      .profile-option span{min-height:82px;display:flex;flex-direction:column;justify-content:center;padding:12px 13px;border:1px solid #dfe7de;border-radius:13px;background:#fff;transition:.16s ease}
      .profile-option strong{color:#173b1e;font-size:.82rem}
      .profile-option small{margin-top:5px;color:#69736b;font-size:.68rem;line-height:1.35}
      .profile-option input:checked+span{border:2px solid #34713c;background:#f3f8f2;box-shadow:0 8px 22px rgba(52,113,60,.13)}
      .profile-error{min-height:17px;display:block;margin-top:6px;color:#a93e34;font-size:.72rem}
      .analysis-notice{margin:18px 0 0;padding:15px;border-radius:14px;background:#f1dfc7;color:#6b3e24;line-height:1.5;font-size:.8rem}
      .analysis-notice strong{display:block;margin-bottom:4px}
      .pending-badge{display:inline-flex;align-items:center;gap:7px;margin:0 auto 14px;padding:8px 12px;border-radius:999px;background:#f1dfc7;color:#6b3e24;font-weight:800;font-size:.76rem}
      @media(max-width:640px){.profile-options{grid-template-columns:1fr}.profile-option span{min-height:72px}}
    `;
    document.head.appendChild(style);

    const build = (prefix) => {
      const access = document.querySelector(`[data-step-key="${prefix}-access"]`);
      if (!access || access.querySelector(".profile-choice")) return;
      const block = document.createElement("div");
      block.className = "profile-choice";
      block.innerHTML = `
        <h4>Escolha o perfil solicitado</h4>
        <p>O perfil define quais áreas você pretende utilizar. A escolha será analisada e poderá ser ajustada pelos administradores antes da liberação.</p>
        <div class="profile-options" role="radiogroup" aria-label="Perfil solicitado">
          ${profiles.map(([value, label, description]) => `
            <label class="profile-option">
              <input type="radio" name="${prefix}RequestedProfile" value="${value}" data-label="${label}">
              <span><strong>${label}</strong><small>${description}</small></span>
            </label>`).join("")}
        </div>
        <small class="profile-error" id="${prefix}ProfileError"></small>
        <div class="analysis-notice"><strong>Acesso sujeito à aprovação</strong>Após concluir, a solicitação ficará aguardando análise. Nenhum perfil será liberado automaticamente.</div>`;
      const heading = access.querySelector(".section-heading");
      heading?.insertAdjacentElement("afterend", block);
    };

    build("pf");
    build("pj");

    const pfNotice = document.querySelector('[data-step-key="pf-review"] .profile-notice');
    if (pfNotice) pfNotice.innerHTML = '<strong>Perfil solicitado</strong><p id="pfReviewProfile">—</p><p>Acesso aguardando aprovação administrativa.</p>';
    const pjNotice = document.querySelector('[data-step-key="pj-review"] .profile-notice');
    if (pjNotice) pjNotice.innerHTML = '<strong>Perfil solicitado para o responsável</strong><p id="pjReviewProfile">—</p><p>Acesso aguardando aprovação administrativa.</p>';

    $("#successTitle") && ($("#successTitle").textContent = "Solicitação enviada para análise");
  }

  function showToast(message) {
    if (!ui.toast) return;
    clearTimeout(toastTimer);
    ui.toast.textContent = message;
    ui.toast.classList.add("show");
    toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 4200);
  }

  function setActiveTab(tab) {
    const login = tab === "login";
    ui.loginTab?.classList.toggle("active", login);
    ui.registerTab?.classList.toggle("active", !login);
    ui.loginPanel?.classList.toggle("active", login);
    ui.registerPanel?.classList.toggle("active", !login);
    ui.loginTab?.setAttribute("aria-selected", String(login));
    ui.registerTab?.setAttribute("aria-selected", String(!login));
    if (ui.loginPanel) ui.loginPanel.hidden = !login;
    if (ui.registerPanel) ui.registerPanel.hidden = login;
    if (ui.panelTitle) ui.panelTitle.textContent = login ? "Entre na sua conta" : "Faça o primeiro cadastro";
    if (ui.panelDescription) ui.panelDescription.textContent = login ? "Informe seus dados para continuar." : "Escolha entre pessoa física e pessoa jurídica para iniciar.";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function formatCPF(raw) {
    return digits(raw).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  function formatCNPJ(raw) {
    return digits(raw).slice(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
  }
  function formatPhone(raw) {
    const n = digits(raw).slice(0, 11);
    return n.length <= 10 ? n.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2") : n.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  }

  function validCPF(raw) {
    const cpf = digits(raw);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    const check = (length) => {
      let sum = 0;
      for (let i = 0; i < length; i += 1) sum += Number(cpf[i]) * (length + 1 - i);
      const r = (sum * 10) % 11;
      return r === 10 ? 0 : r;
    };
    return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
  }
  function validCNPJ(raw) {
    const cnpj = digits(raw);
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    const check = (length) => {
      const factors = length === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
      const sum = factors.reduce((total, factor, i) => total + Number(cnpj[i]) * factor, 0);
      const r = sum % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return check(12) === Number(cnpj[12]) && check(13) === Number(cnpj[13]);
  }

  function setError(input, message) {
    input?.closest(".input-wrap")?.classList.add("invalid");
    const error = input && document.querySelector(`[data-error-for="${input.id}"]`);
    if (error) error.textContent = message;
    input?.setAttribute("aria-invalid", "true");
  }
  function clearError(input) {
    input?.closest(".input-wrap")?.classList.remove("invalid");
    const error = input && document.querySelector(`[data-error-for="${input.id}"]`);
    if (error) error.textContent = "";
    input?.removeAttribute("aria-invalid");
  }
  function required(id, message) {
    const input = $(id);
    if (!input?.value.trim()) { setError(input, message); return false; }
    clearError(input); return true;
  }
  function validateName(id) {
    const input = $(id);
    if (!required(id, "Informe o nome completo.")) return false;
    if (input.value.trim().split(/\s+/).length < 2) { setError(input, "Digite nome e sobrenome."); return false; }
    return true;
  }
  function validateEmail(id) {
    const input = $(id);
    if (!required(id, "Informe o e-mail.")) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim())) { setError(input, "Digite um e-mail válido."); return false; }
    return true;
  }
  function validatePhone(id) {
    const input = $(id);
    if (!required(id, "Informe o telefone.")) return false;
    if (digits(input.value).length < 10) { setError(input, "Digite um telefone válido com DDD."); return false; }
    return true;
  }
  function validateDocument(id, type) {
    const input = $(id);
    if (!required(id, `Informe o ${type}.`)) return false;
    const valid = type === "CPF" ? validCPF(input.value) : validCNPJ(input.value);
    if (!valid) setError(input, `Digite um ${type} válido.`);
    return valid;
  }
  function validatePassword(passwordId, confirmId) {
    const password = $(passwordId), confirmation = $(confirmId);
    let valid = true;
    if (!required(passwordId, "Crie uma senha.")) valid = false;
    else if (password.value.length < 8 || !/[A-Za-z]/.test(password.value) || !/\d/.test(password.value)) { setError(password, "Use pelo menos 8 caracteres, com letra e número."); valid = false; }
    if (!required(confirmId, "Confirme sua senha.")) valid = false;
    else if (confirmation.value !== password.value) { setError(confirmation, "As senhas não são iguais."); valid = false; }
    return valid;
  }
  function validateTerms(id) {
    const input = $(id), error = document.querySelector(`[data-error-for="${id.slice(1)}"]`);
    if (!input?.checked) { if (error) error.textContent = "Aceite os termos para continuar."; return false; }
    if (error) error.textContent = "";
    return true;
  }
  function validateProfile(prefix) {
    const selected = document.querySelector(`input[name="${prefix}RequestedProfile"]:checked`);
    const error = $(`#${prefix}ProfileError`);
    if (!selected) { if (error) error.textContent = "Escolha o perfil que deseja solicitar."; return false; }
    if (error) error.textContent = "";
    return true;
  }

  function validateCurrentStep() {
    const key = flows[selectedType][currentStep].key;
    if (key === "pf-person") return [validateName("#pfFullName"), validateDocument("#pfCpf", "CPF"), validatePhone("#pfPhone"), validateEmail("#pfEmail"), required("#pfCity", "Informe a cidade."), required("#pfState", "Selecione o estado.")].every(Boolean);
    if (key === "pf-access") return validateProfile("pf") && validatePassword("#pfPassword", "#pfPasswordConfirm") && validateTerms("#pfTerms");
    if (key === "pj-company") return [required("#pjLegalName", "Informe a razão social."), required("#pjTradeName", "Informe o nome fantasia."), validateDocument("#pjCnpj", "CNPJ"), validatePhone("#pjCompanyPhone"), validateEmail("#pjCompanyEmail"), required("#pjCity", "Informe a cidade."), required("#pjState", "Selecione o estado.")].every(Boolean);
    if (key === "pj-responsible") return [validateName("#pjResponsibleName"), validateDocument("#pjResponsibleCpf", "CPF"), required("#pjResponsibleRole", "Selecione a função."), validatePhone("#pjResponsiblePhone"), validateEmail("#pjResponsibleEmail")].every(Boolean);
    if (key === "pj-access") return validateProfile("pj") && validatePassword("#pjPassword", "#pjPasswordConfirm") && validateTerms("#pjTerms");
    return true;
  }

  function selectedProfileLabel(prefix) {
    return document.querySelector(`input[name="${prefix}RequestedProfile"]:checked`)?.dataset.label || "—";
  }

  function updateReview() {
    if (selectedType === "pf") {
      $("#pfReviewName") && ($("#pfReviewName").textContent = fieldValue("#pfFullName") || "—");
      $("#pfReviewDocument") && ($("#pfReviewDocument").textContent = fieldValue("#pfCpf") || "—");
      $("#pfReviewContact") && ($("#pfReviewContact").textContent = [fieldValue("#pfEmail"), fieldValue("#pfPhone")].filter(Boolean).join(" • ") || "—");
      $("#pfReviewOperation") && ($("#pfReviewOperation").textContent = "Cadastro em nome próprio");
      $("#pfReviewLocation") && ($("#pfReviewLocation").textContent = [fieldValue("#pfCity"), fieldValue("#pfState")].filter(Boolean).join(" / ") || "—");
      $("#pfReviewProfile") && ($("#pfReviewProfile").textContent = selectedProfileLabel("pf"));
      return;
    }
    $("#pjReviewCompany") && ($("#pjReviewCompany").textContent = fieldValue("#pjTradeName") || fieldValue("#pjLegalName") || "—");
    $("#pjReviewCnpj") && ($("#pjReviewCnpj").textContent = fieldValue("#pjCnpj") || "—");
    $("#pjReviewCompanyContact") && ($("#pjReviewCompanyContact").textContent = [fieldValue("#pjCompanyEmail"), fieldValue("#pjCompanyPhone")].filter(Boolean).join(" • ") || "—");
    $("#pjReviewLocation") && ($("#pjReviewLocation").textContent = [fieldValue("#pjCity"), fieldValue("#pjState")].filter(Boolean).join(" / ") || "—");
    $("#pjReviewResponsible") && ($("#pjReviewResponsible").textContent = fieldValue("#pjResponsibleName") || "—");
    $("#pjReviewResponsibleDocument") && ($("#pjReviewResponsibleDocument").textContent = fieldValue("#pjResponsibleCpf") || "—");
    $("#pjReviewRole") && ($("#pjReviewRole").textContent = fieldValue("#pjResponsibleRole") || "—");
    $("#pjReviewResponsibleContact") && ($("#pjReviewResponsibleContact").textContent = [fieldValue("#pjResponsibleEmail"), fieldValue("#pjResponsiblePhone")].filter(Boolean).join(" • ") || "—");
    $("#pjReviewProfile") && ($("#pjReviewProfile").textContent = selectedProfileLabel("pj"));
  }

  function renderStep() {
    const flow = flows[selectedType], current = flow[currentStep];
    $$(".form-step").forEach((section) => { section.hidden = !(section.dataset.flow === selectedType && section.dataset.stepKey === current.key); });
    if (ui.stepLabel) ui.stepLabel.textContent = `Etapa ${currentStep + 1}`;
    if (ui.stepName) ui.stepName.textContent = current.name;
    if (ui.stepCounter) ui.stepCounter.textContent = `${currentStep + 1} de ${flow.length}`;
    if (ui.stepProgress) ui.stepProgress.style.width = `${((currentStep + 1) / flow.length) * 100}%`;
    if (ui.stepDots) ui.stepDots.innerHTML = flow.map((_, i) => `<span class="step-dot${i < currentStep ? " done" : ""}${i === currentStep ? " active" : ""}"></span>`).join("");
    if (ui.previous) ui.previous.textContent = currentStep === 0 ? "Trocar tipo" : "Voltar";
    if (ui.next) ui.next.hidden = currentStep === flow.length - 1;
    if (ui.finish) ui.finish.hidden = currentStep !== flow.length - 1;
    if (current.key.endsWith("review")) updateReview();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetToTypeSelection() {
    if (ui.wizard) ui.wizard.hidden = true;
    if (ui.success) ui.success.hidden = true;
    if (ui.typeSelection) ui.typeSelection.hidden = false;
    currentStep = 0;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  installProfileUI();

  $$('[data-registration-type]').forEach((card) => card.addEventListener("click", () => {
    selectedType = card.dataset.registrationType;
    $$('[data-registration-type]').forEach((item) => { const selected = item === card; item.classList.toggle("selected", selected); item.setAttribute("aria-checked", String(selected)); });
    if (ui.start) ui.start.disabled = false;
  }));

  ui.start?.addEventListener("click", () => {
    if (!selectedType) return;
    currentStep = 0;
    if (ui.typeSelection) ui.typeSelection.hidden = true;
    if (ui.success) ui.success.hidden = true;
    if (ui.wizard) ui.wizard.hidden = false;
    if (ui.typeBadge) ui.typeBadge.textContent = selectedType === "pf" ? "Pessoa Física" : "Pessoa Jurídica";
    renderStep();
  });

  $("#changeRegistrationType")?.addEventListener("click", resetToTypeSelection);
  ui.previous?.addEventListener("click", () => { if (currentStep === 0) return resetToTypeSelection(); currentStep -= 1; renderStep(); });
  ui.next?.addEventListener("click", () => {
    if (!validateCurrentStep()) { $(".form-step:not([hidden]) [aria-invalid='true']")?.focus(); showToast("Revise os campos destacados antes de continuar."); return; }
    currentStep += 1; renderStep();
  });

  ui.form?.addEventListener("submit", (event) => {
    event.preventDefault();
    updateReview();
    if (ui.wizard) ui.wizard.hidden = true;
    if (ui.success) {
      ui.success.hidden = false;
      ui.success.innerHTML = `
        <span class="pending-badge">● Aguardando análise</span>
        <p class="eyebrow">Solicitação recebida</p>
        <h3>Cadastro enviado para aprovação</h3>
        <p>Seus dados e o perfil solicitado serão analisados pelos administradores do Mais Castanhas.</p>
        <div class="analysis-notice"><strong>Como você receberá a resposta</strong>Quando o cadastro for aprovado ou precisar de ajustes, o retorno será enviado para o e-mail e o WhatsApp informados.</div>
        <button id="newRegistration" class="primary-button" type="button">Fazer outro cadastro</button>
        <button id="successBackToLogin" class="secondary-button" type="button">Voltar para entrar</button>`;
      $("#newRegistration")?.addEventListener("click", () => { ui.form.reset(); selectedType = null; if (ui.start) ui.start.disabled = true; $$('[data-registration-type]').forEach((c) => { c.classList.remove("selected"); c.setAttribute("aria-checked", "false"); }); resetToTypeSelection(); });
      $("#successBackToLogin")?.addEventListener("click", () => setActiveTab("login"));
      ui.success.focus();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  [["pfCpf", formatCPF], ["pjResponsibleCpf", formatCPF], ["pjCnpj", formatCNPJ], ["pfPhone", formatPhone], ["pjCompanyPhone", formatPhone], ["pjResponsiblePhone", formatPhone]].forEach(([id, formatter]) => {
    const input = document.getElementById(id);
    input?.addEventListener("input", () => { input.value = formatter(input.value); clearError(input); });
  });

  $$("#loginForm input, #registerForm input, #registerForm select").forEach((input) => { input.addEventListener("input", () => clearError(input)); input.addEventListener("change", () => clearError(input)); });
  $$("[data-toggle-password]").forEach((button) => button.addEventListener("click", () => { const input = document.getElementById(button.dataset.togglePassword); if (!input) return; const visible = input.type === "text"; input.type = visible ? "password" : "text"; button.textContent = visible ? "Mostrar" : "Ocultar"; }));

  $$(".password-strength").forEach((block) => {
    const input = document.getElementById(block.dataset.strengthFor), bar = $(".strength-track span", block), text = $("small", block);
    input?.addEventListener("input", () => {
      const p = input.value;
      const score = Number(p.length >= 8) + Number(/[A-Za-z]/.test(p) && /\d/.test(p)) + Number(/[A-Z]/.test(p) && /[a-z]/.test(p)) + Number(/[^A-Za-z0-9]/.test(p));
      const levels = [["0%","Use 8 caracteres, com letra e número."],["25%","Senha fraca."],["50%","Senha razoável."],["75%","Senha boa."],["100%","Senha forte."]];
      if (bar) bar.style.width = levels[score][0];
      if (text) text.textContent = levels[score][1];
    });
  });

  $("#loginForm")?.addEventListener("submit", (event) => { event.preventDefault(); showToast("A autenticação real será conectada ao banco de dados."); });
  $("#forgotPassword")?.addEventListener("click", () => showToast("A recuperação de senha será ativada junto com a autenticação real."));
  ui.loginTab?.addEventListener("click", () => setActiveTab("login"));
  ui.registerTab?.addEventListener("click", () => setActiveTab("register"));
  $("#backToLogin")?.addEventListener("click", () => setActiveTab("login"));
  $("#successBackToLogin")?.addEventListener("click", () => setActiveTab("login"));

  [$("#pfState"), $("#pjState")].forEach((select) => { if (!select || select.options.length > 1) return; states.forEach(([code, name]) => select.add(new Option(`${code} — ${name}`, code))); });

  if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));
})();