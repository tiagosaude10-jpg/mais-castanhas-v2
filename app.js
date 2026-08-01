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

  const flows = {
    pf: [
      { key: "pf-person", name: "Dados pessoais" },
      { key: "pf-access", name: "Acesso" },
      { key: "pf-review", name: "Revisão" }
    ],
    pj: [
      { key: "pj-company", name: "Empresa" },
      { key: "pj-responsible", name: "Responsável" },
      { key: "pj-access", name: "Acesso" },
      { key: "pj-review", name: "Revisão" }
    ]
  };

  let selectedType = null;
  let currentStep = 0;
  let toastTimer;

  const digits = (value) => value.replace(/\D/g, "");
  const value = (id) => $(id).value.trim();

  function showToast(message) {
    clearTimeout(toastTimer);
    ui.toast.textContent = message;
    ui.toast.classList.add("show");
    toastTimer = setTimeout(() => ui.toast.classList.remove("show"), 4200);
  }

  function setActiveTab(tab) {
    const login = tab === "login";
    ui.loginTab.classList.toggle("active", login);
    ui.registerTab.classList.toggle("active", !login);
    ui.loginPanel.classList.toggle("active", login);
    ui.registerPanel.classList.toggle("active", !login);
    ui.loginTab.setAttribute("aria-selected", String(login));
    ui.registerTab.setAttribute("aria-selected", String(!login));
    ui.loginPanel.hidden = !login;
    ui.registerPanel.hidden = login;
    ui.panelTitle.textContent = login ? "Entre na sua conta" : "Faça o primeiro cadastro";
    ui.panelDescription.textContent = login
      ? "Informe seus dados para continuar."
      : "Escolha entre pessoa física e pessoa jurídica para iniciar.";
    scrollTo({ top: 0, behavior: "smooth" });
  }

  function formatCPF(raw) {
    return digits(raw).slice(0, 11)
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function formatCNPJ(raw) {
    return digits(raw).slice(0, 14)
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  function formatPhone(raw) {
    const number = digits(raw).slice(0, 11);
    return number.length <= 10
      ? number.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2")
      : number.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
  }

  function validCPF(raw) {
    const cpf = digits(raw);
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    const check = (length) => {
      let sum = 0;
      for (let i = 0; i < length; i += 1) sum += Number(cpf[i]) * (length + 1 - i);
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };
    return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
  }

  function validCNPJ(raw) {
    const cnpj = digits(raw);
    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
    const check = (length) => {
      const factors = length === 12
        ? [5,4,3,2,9,8,7,6,5,4,3,2]
        : [6,5,4,3,2,9,8,7,6,5,4,3,2];
      const sum = factors.reduce((total, factor, i) => total + Number(cnpj[i]) * factor, 0);
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };
    return check(12) === Number(cnpj[12]) && check(13) === Number(cnpj[13]);
  }

  function setError(input, message) {
    input.closest(".input-wrap")?.classList.add("invalid");
    const error = document.querySelector(`[data-error-for="${input.id}"]`);
    if (error) error.textContent = message;
    input.setAttribute("aria-invalid", "true");
  }

  function clearError(input) {
    input.closest(".input-wrap")?.classList.remove("invalid");
    const error = document.querySelector(`[data-error-for="${input.id}"]`);
    if (error) error.textContent = "";
    input.removeAttribute("aria-invalid");
  }

  function required(id, message) {
    const input = $(id);
    if (!input.value.trim()) {
      setError(input, message);
      return false;
    }
    clearError(input);
    return true;
  }

  function validateName(id) {
    const input = $(id);
    if (!required(id, "Informe o nome completo.")) return false;
    if (input.value.trim().split(/\s+/).length < 2) {
      setError(input, "Digite nome e sobrenome.");
      return false;
    }
    return true;
  }

  function validateEmail(id) {
    const input = $(id);
    if (!required(id, "Informe o e-mail.")) return false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim())) {
      setError(input, "Digite um e-mail válido.");
      return false;
    }
    return true;
  }

  function validatePhone(id) {
    const input = $(id);
    if (!required(id, "Informe o telefone.")) return false;
    if (digits(input.value).length < 10) {
      setError(input, "Digite um telefone válido com DDD.");
      return false;
    }
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
    const password = $(passwordId);
    const confirmation = $(confirmId);
    let valid = true;
    if (!required(passwordId, "Crie uma senha.")) valid = false;
    else if (password.value.length < 8 || !/[A-Za-z]/.test(password.value) || !/\d/.test(password.value)) {
      setError(password, "Use pelo menos 8 caracteres, com letra e número.");
      valid = false;
    }
    if (!required(confirmId, "Confirme sua senha.")) valid = false;
    else if (confirmation.value !== password.value) {
      setError(confirmation, "As senhas não são iguais.");
      valid = false;
    }
    return valid;
  }

  function validateTerms(id) {
    const input = $(id);
    const error = document.querySelector(`[data-error-for="${id.slice(1)}"]`);
    if (!input.checked) {
      error.textContent = "Aceite os termos para continuar.";
      input.setAttribute("aria-invalid", "true");
      return false;
    }
    error.textContent = "";
    input.removeAttribute("aria-invalid");
    return true;
  }

  function validateCurrentStep() {
    const key = flows[selectedType][currentStep].key;

    if (key === "pf-person") {
      return [validateName("#pfFullName"), validateDocument("#pfCpf", "CPF"),
        validatePhone("#pfPhone"), validateEmail("#pfEmail"),
        required("#pfCity", "Informe a cidade."), required("#pfState", "Selecione o estado.")].every(Boolean);
    }
    if (key === "pf-access") {
      const password = validatePassword("#pfPassword", "#pfPasswordConfirm");
      const terms = validateTerms("#pfTerms");
      return password && terms;
    }
    if (key === "pj-company") {
      return [required("#pjLegalName", "Informe a razão social."),
        required("#pjTradeName", "Informe o nome fantasia."), validateDocument("#pjCnpj", "CNPJ"),
        validatePhone("#pjCompanyPhone"), validateEmail("#pjCompanyEmail"),
        required("#pjCity", "Informe a cidade."), required("#pjState", "Selecione o estado.")].every(Boolean);
    }
    if (key === "pj-responsible") {
      return [validateName("#pjResponsibleName"), validateDocument("#pjResponsibleCpf", "CPF"),
        required("#pjResponsibleRole", "Selecione a função."), validatePhone("#pjResponsiblePhone"),
        validateEmail("#pjResponsibleEmail")].every(Boolean);
    }
    if (key === "pj-access") {
      const password = validatePassword("#pjPassword", "#pjPasswordConfirm");
      const terms = validateTerms("#pjTerms");
      return password && terms;
    }
    return true;
  }

  function updateReview() {
    if (selectedType === "pf") {
      $("#pfReviewName").textContent = value("#pfFullName") || "—";
      $("#pfReviewDocument").textContent = value("#pfCpf") || "—";
      $("#pfReviewContact").textContent = [value("#pfEmail"), value("#pfPhone")].filter(Boolean).join(" • ") || "—";
      $("#pfReviewOperation").textContent = value("#pfOperationName") || "Operação em nome próprio";
      $("#pfReviewLocation").textContent = [value("#pfCity"), value("#pfState")].filter(Boolean).join(" / ") || "—";
      return;
    }
    $("#pjReviewCompany").textContent = value("#pjTradeName") || value("#pjLegalName") || "—";
    $("#pjReviewCnpj").textContent = value("#pjCnpj") || "—";
    $("#pjReviewCompanyContact").textContent = [value("#pjCompanyEmail"), value("#pjCompanyPhone")].filter(Boolean).join(" • ") || "—";
    $("#pjReviewLocation").textContent = [value("#pjCity"), value("#pjState")].filter(Boolean).join(" / ") || "—";
    $("#pjReviewResponsible").textContent = value("#pjResponsibleName") || "—";
    $("#pjReviewResponsibleDocument").textContent = value("#pjResponsibleCpf") || "—";
    $("#pjReviewRole").textContent = value("#pjResponsibleRole") || "—";
    $("#pjReviewResponsibleContact").textContent = [value("#pjResponsibleEmail"), value("#pjResponsiblePhone")].filter(Boolean).join(" • ") || "—";
  }

  function renderStep() {
    const flow = flows[selectedType];
    const current = flow[currentStep];
    $$(".form-step").forEach((section) => {
      section.hidden = !(section.dataset.flow === selectedType && section.dataset.stepKey === current.key);
    });
    ui.stepLabel.textContent = `Etapa ${currentStep + 1}`;
    ui.stepName.textContent = current.name;
    ui.stepCounter.textContent = `${currentStep + 1} de ${flow.length}`;
    ui.stepProgress.style.width = `${((currentStep + 1) / flow.length) * 100}%`;
    ui.stepDots.innerHTML = flow.map((_, i) =>
      `<span class="step-dot${i < currentStep ? " done" : ""}${i === currentStep ? " active" : ""}"></span>`
    ).join("");
    ui.previous.textContent = currentStep === 0 ? "Trocar tipo" : "Voltar";
    ui.next.hidden = currentStep === flow.length - 1;
    ui.finish.hidden = currentStep !== flow.length - 1;
    if (current.key.endsWith("review")) updateReview();
    scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetToTypeSelection() {
    ui.wizard.hidden = true;
    ui.success.hidden = true;
    ui.typeSelection.hidden = false;
    currentStep = 0;
    scrollTo({ top: 0, behavior: "smooth" });
  }

  $$('[data-registration-type]').forEach((card) => {
    card.addEventListener("click", () => {
      selectedType = card.dataset.registrationType;
      $$('[data-registration-type]').forEach((item) => {
        const selected = item === card;
        item.classList.toggle("selected", selected);
        item.setAttribute("aria-checked", String(selected));
      });
      ui.start.disabled = false;
    });
  });

  ui.start.addEventListener("click", () => {
    if (!selectedType) return;
    currentStep = 0;
    ui.typeSelection.hidden = true;
    ui.success.hidden = true;
    ui.wizard.hidden = false;
    ui.typeBadge.textContent = selectedType === "pf" ? "Pessoa Física" : "Pessoa Jurídica";
    renderStep();
  });

  $("#changeRegistrationType").addEventListener("click", resetToTypeSelection);
  ui.previous.addEventListener("click", () => {
    if (currentStep === 0) return resetToTypeSelection();
    currentStep -= 1;
    renderStep();
  });
  ui.next.addEventListener("click", () => {
    if (!validateCurrentStep()) {
      $(".form-step:not([hidden]) [aria-invalid='true']")?.focus();
      showToast("Revise os campos destacados antes de continuar.");
      return;
    }
    currentStep += 1;
    renderStep();
  });

  ui.form.addEventListener("submit", (event) => {
    event.preventDefault();
    updateReview();
    ui.wizard.hidden = true;
    ui.success.hidden = false;
    $("#successTitle").textContent = selectedType === "pf"
      ? "Cadastro de pessoa física validado"
      : "Empresa e responsável validados";
    $("#successMessage").textContent = selectedType === "pf"
      ? "O proprietário e administrador inicial estão preparados. O envio real será ativado com o banco de dados."
      : "A pessoa jurídica e o responsável administrador estão preparados. O envio real será ativado com o banco de dados.";
    ui.success.focus();
    scrollTo({ top: 0, behavior: "smooth" });
  });

  $("#newRegistration").addEventListener("click", () => {
    ui.form.reset();
    selectedType = null;
    ui.start.disabled = true;
    $$('[data-registration-type]').forEach((card) => {
      card.classList.remove("selected");
      card.setAttribute("aria-checked", "false");
    });
    $$(".input-wrap.invalid").forEach((wrap) => wrap.classList.remove("invalid"));
    $$(".field-error").forEach((error) => { error.textContent = ""; });
    $$(".password-strength").forEach((block) => {
      $(".strength-track span", block).style.width = "0%";
      $("small", block).textContent = "Use 8 caracteres, com letra e número.";
    });
    resetToTypeSelection();
  });

  [["pfCpf", formatCPF], ["pjResponsibleCpf", formatCPF], ["pjCnpj", formatCNPJ],
   ["pfPhone", formatPhone], ["pjCompanyPhone", formatPhone], ["pjResponsiblePhone", formatPhone]
  ].forEach(([id, formatter]) => {
    const input = document.getElementById(id);
    input.addEventListener("input", () => {
      input.value = formatter(input.value);
      clearError(input);
    });
  });

  $$("#loginForm input, #registerForm input, #registerForm select").forEach((input) => {
    input.addEventListener("input", () => clearError(input));
    input.addEventListener("change", () => clearError(input));
  });

  $$("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.togglePassword);
      const visible = input.type === "text";
      input.type = visible ? "password" : "text";
      button.textContent = visible ? "Mostrar" : "Ocultar";
      button.setAttribute("aria-label", visible ? "Mostrar senha" : "Ocultar senha");
    });
  });

  function passwordScore(password) {
    return Number(password.length >= 8)
      + Number(/[A-Za-z]/.test(password) && /\d/.test(password))
      + Number(/[A-Z]/.test(password) && /[a-z]/.test(password))
      + Number(/[^A-Za-z0-9]/.test(password));
  }

  $$(".password-strength").forEach((block) => {
    const input = document.getElementById(block.dataset.strengthFor);
    const bar = $(".strength-track span", block);
    const text = $("small", block);
    input.addEventListener("input", () => {
      const levels = [
        ["0%", "#a93e34", "Use 8 caracteres, com letra e número."],
        ["25%", "#a93e34", "Senha fraca."],
        ["50%", "#bd7a2d", "Senha razoável."],
        ["75%", "#4d7b3f", "Senha boa."],
        ["100%", "#2f6d37", "Senha forte."]
      ];
      const [width, color, label] = levels[passwordScore(input.value)];
      bar.style.width = width;
      bar.style.backgroundColor = color;
      text.textContent = label;
    });
  });

  $("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const userValid = required("#loginUser", "Informe seu e-mail ou CPF.");
    const password = $("#loginPassword");
    let passwordValid = required("#loginPassword", "Informe sua senha.");
    if (passwordValid && password.value.length < 8) {
      setError(password, "A senha deve ter pelo menos 8 caracteres.");
      passwordValid = false;
    }
    if (userValid && passwordValid) {
      showToast("A tela de entrada está pronta. A autenticação será conectada ao banco de dados.");
    }
  });

  const modalContent = {
    termsModal: {
      title: "Termos de uso",
      body: `<p>O usuário é responsável pela veracidade das informações registradas e pelo uso adequado de suas credenciais.</p><p>No cadastro de pessoa jurídica, o responsável declara possuir autorização para representar a empresa.</p><p>A versão definitiva terá controle de permissões, histórico de alterações e aprovação administrativa de novos usuários.</p>`
    },
    privacyModal: {
      title: "Política de privacidade",
      body: `<p>Os dados pessoais e empresariais serão utilizados para identificação, autenticação, segurança e controle de acesso ao Mais Castanhas.</p><p>Nesta versão visual, nenhum dado preenchido é enviado ou armazenado.</p>`
    }
  };

  $$("[data-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      const content = modalContent[button.dataset.modal];
      ui.modalTitle.textContent = content.title;
      ui.modalBody.innerHTML = content.body;
      typeof ui.infoModal.showModal === "function" ? ui.infoModal.showModal() : ui.infoModal.setAttribute("open", "");
    });
  });

  const closeModal = () => {
    if (typeof ui.infoModal.close === "function" && ui.infoModal.open) ui.infoModal.close();
    else ui.infoModal.removeAttribute("open");
  };
  $(".modal-close").addEventListener("click", closeModal);
  $(".modal-ok").addEventListener("click", closeModal);
  ui.infoModal.addEventListener("click", (event) => { if (event.target === ui.infoModal) closeModal(); });

  $("#forgotPassword").addEventListener("click", () => showToast("A recuperação de senha será ativada junto com a autenticação real."));
  ui.loginTab.addEventListener("click", () => setActiveTab("login"));
  ui.registerTab.addEventListener("click", () => setActiveTab("register"));
  $("#backToLogin").addEventListener("click", () => setActiveTab("login"));
  $("#successBackToLogin").addEventListener("click", () => setActiveTab("login"));

  [$("#pfState"), $("#pjState")].forEach((select) => {
    states.forEach(([code, name]) => select.add(new Option(`${code} — ${name}`, code)));
  });

  if ("serviceWorker" in navigator) {
    addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(console.error));
  }
})();
