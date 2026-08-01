(() => {
  "use strict";

  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];

  const loginTab = $("#loginTab");
  const registerTab = $("#registerTab");
  const loginPanel = $("#loginPanel");
  const registerPanel = $("#registerPanel");
  const panelTitle = $("#panelTitle");
  const panelDescription = $("#panelDescription");
  const toast = $("#toast");
  const infoModal = $("#infoModal");
  const modalTitle = $("#modalTitle");
  const modalBody = $("#modalBody");

  const registerForm = $("#registerForm");
  const registrationContent = $("#registrationContent");
  const registrationSuccess = $("#registrationSuccess");
  const formSteps = $$(".form-step");
  const stepDots = $$("[data-step-dot]");
  const stepLabel = $("#stepLabel");
  const stepName = $("#stepName");
  const stepProgress = $("#stepProgress");
  const backStepButton = $("#backStep");
  const nextStepButton = $("#nextStep");
  const submitRegistrationButton = $("#submitRegistration");

  const stepNames = {
    1: "Responsável",
    2: "Empresa",
    3: "Revisão"
  };

  let currentStep = 1;
  let toastTimer;

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = window.setTimeout(() => toast.classList.remove("show"), 4200);
  }

  function setActiveTab(tabName) {
    const isLogin = tabName === "login";

    loginTab.classList.toggle("active", isLogin);
    registerTab.classList.toggle("active", !isLogin);
    loginPanel.classList.toggle("active", isLogin);
    registerPanel.classList.toggle("active", !isLogin);

    loginTab.setAttribute("aria-selected", String(isLogin));
    registerTab.setAttribute("aria-selected", String(!isLogin));
    loginPanel.hidden = !isLogin;
    registerPanel.hidden = isLogin;

    panelTitle.textContent = isLogin ? "Entre na sua conta" : "Faça o primeiro cadastro";
    panelDescription.textContent = isLogin
      ? "Informe seus dados para continuar."
      : "Crie a empresa, o proprietário e o primeiro administrador.";

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  loginTab.addEventListener("click", () => setActiveTab("login"));
  registerTab.addEventListener("click", () => setActiveTab("register"));

  function onlyDigits(value) {
    return value.replace(/\D/g, "");
  }

  function formatCPF(value) {
    const digits = onlyDigits(value).slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }

  function formatPhone(value) {
    const digits = onlyDigits(value).slice(0, 11);

    if (digits.length <= 10) {
      return digits
        .replace(/(\d{2})(\d)/, "($1) $2")
        .replace(/(\d{4})(\d)/, "$1-$2");
    }

    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{5})(\d)/, "$1-$2");
  }

  function formatDocument(value) {
    const digits = onlyDigits(value).slice(0, 14);

    if (digits.length <= 11) {
      return formatCPF(digits);
    }

    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  function isValidCPF(value) {
    const cpf = onlyDigits(value);

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    const calculateDigit = (length) => {
      let sum = 0;
      for (let index = 0; index < length; index += 1) {
        sum += Number(cpf[index]) * (length + 1 - index);
      }
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };

    return calculateDigit(9) === Number(cpf[9])
      && calculateDigit(10) === Number(cpf[10]);
  }

  function isValidCNPJ(value) {
    const cnpj = onlyDigits(value);

    if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

    const calculate = (baseLength) => {
      const factors = baseLength === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

      const sum = factors.reduce(
        (total, factor, index) => total + Number(cnpj[index]) * factor,
        0
      );
      const remainder = sum % 11;
      return remainder < 2 ? 0 : 11 - remainder;
    };

    return calculate(12) === Number(cnpj[12])
      && calculate(13) === Number(cnpj[13]);
  }

  $("#cpf").addEventListener("input", (event) => {
    event.target.value = formatCPF(event.target.value);
    clearFieldError(event.target);
  });

  $("#phone").addEventListener("input", (event) => {
    event.target.value = formatPhone(event.target.value);
    clearFieldError(event.target);
  });

  $("#companyDocument").addEventListener("input", (event) => {
    event.target.value = formatDocument(event.target.value);
    clearFieldError(event.target);
  });

  $$("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.togglePassword);
      const isVisible = input.type === "text";
      input.type = isVisible ? "password" : "text";
      button.textContent = isVisible ? "Mostrar" : "Ocultar";
      button.setAttribute("aria-label", isVisible ? "Mostrar senha" : "Ocultar senha");
    });
  });

  function setFieldError(input, message) {
    const wrap = input.closest(".input-wrap");
    const error = document.querySelector(`[data-error-for="${input.id}"]`);

    if (wrap) wrap.classList.add("invalid");
    if (error) error.textContent = message;
    input.setAttribute("aria-invalid", "true");
  }

  function clearFieldError(input) {
    const wrap = input.closest(".input-wrap");
    const error = document.querySelector(`[data-error-for="${input.id}"]`);

    if (wrap) wrap.classList.remove("invalid");
    if (error) error.textContent = "";
    input.removeAttribute("aria-invalid");
  }

  function validateRequired(input, message) {
    if (!input.value.trim()) {
      setFieldError(input, message);
      return false;
    }

    clearFieldError(input);
    return true;
  }

  function validateEmail(input) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!validateRequired(input, "Informe seu e-mail.")) return false;

    if (!pattern.test(input.value.trim())) {
      setFieldError(input, "Digite um e-mail válido.");
      return false;
    }

    clearFieldError(input);
    return true;
  }

  function validateStepOne() {
    const fullName = $("#fullName");
    const cpf = $("#cpf");
    const phone = $("#phone");
    const email = $("#email");
    const password = $("#password");
    const passwordConfirm = $("#passwordConfirm");

    let valid = true;

    if (!validateRequired(fullName, "Informe seu nome completo.")) {
      valid = false;
    } else if (fullName.value.trim().split(/\s+/).length < 2) {
      setFieldError(fullName, "Digite nome e sobrenome.");
      valid = false;
    }

    if (!validateRequired(cpf, "Informe seu CPF.")) {
      valid = false;
    } else if (!isValidCPF(cpf.value)) {
      setFieldError(cpf, "Digite um CPF válido.");
      valid = false;
    }

    if (!validateRequired(phone, "Informe seu telefone.")) {
      valid = false;
    } else if (onlyDigits(phone.value).length < 10) {
      setFieldError(phone, "Digite um telefone válido com DDD.");
      valid = false;
    }

    if (!validateEmail(email)) valid = false;

    if (!validateRequired(password, "Crie uma senha.")) {
      valid = false;
    } else if (
      password.value.length < 8
      || !/[A-Za-z]/.test(password.value)
      || !/\d/.test(password.value)
    ) {
      setFieldError(password, "Use pelo menos 8 caracteres, com letra e número.");
      valid = false;
    }

    if (!validateRequired(passwordConfirm, "Confirme sua senha.")) {
      valid = false;
    } else if (passwordConfirm.value !== password.value) {
      setFieldError(passwordConfirm, "As senhas não são iguais.");
      valid = false;
    }

    return valid;
  }

  function validateStepTwo() {
    const companyName = $("#companyName");
    const companyDocument = $("#companyDocument");
    const city = $("#city");
    const state = $("#state");

    let valid = true;

    if (!validateRequired(companyName, "Informe o nome da empresa ou operação.")) {
      valid = false;
    }

    if (!validateRequired(city, "Informe a cidade.")) valid = false;
    if (!validateRequired(state, "Selecione o estado.")) valid = false;

    if (companyDocument.value.trim()) {
      const digits = onlyDigits(companyDocument.value);
      const documentValid = digits.length === 11
        ? isValidCPF(companyDocument.value)
        : digits.length === 14 && isValidCNPJ(companyDocument.value);

      if (!documentValid) {
        setFieldError(companyDocument, "Digite um CPF ou CNPJ válido.");
        valid = false;
      }
    }

    return valid;
  }

  function validateCurrentStep() {
    if (currentStep === 1) return validateStepOne();
    if (currentStep === 2) return validateStepTwo();
    return true;
  }

  function updateReview() {
    $("#reviewName").textContent = $("#fullName").value.trim() || "—";
    $("#reviewContact").textContent = [
      $("#email").value.trim(),
      $("#phone").value.trim()
    ].filter(Boolean).join(" • ") || "—";

    $("#reviewCompany").textContent = $("#companyName").value.trim() || "—";
    $("#reviewLocation").textContent = [
      $("#city").value.trim(),
      $("#state").value
    ].filter(Boolean).join(" / ") || "—";
  }

  function renderStep() {
    formSteps.forEach((section) => {
      const sectionStep = Number(section.dataset.step);
      const isCurrent = sectionStep === currentStep;
      section.classList.toggle("active", isCurrent);
      section.hidden = !isCurrent;
    });

    stepDots.forEach((dot) => {
      const dotStep = Number(dot.dataset.stepDot);
      dot.classList.toggle("active", dotStep === currentStep);
      dot.classList.toggle("done", dotStep < currentStep);
    });

    stepLabel.textContent = `Etapa ${currentStep} de 3`;
    stepName.textContent = stepNames[currentStep];
    stepProgress.style.width = `${(currentStep / 3) * 100}%`;

    backStepButton.hidden = currentStep === 1;
    nextStepButton.hidden = currentStep === 3;
    submitRegistrationButton.hidden = currentStep !== 3;

    if (currentStep === 3) updateReview();

    const firstInput = $(
      currentStep === 1
        ? "#fullName"
        : currentStep === 2
          ? "#companyName"
          : "#terms"
    );

    window.setTimeout(() => firstInput?.focus({ preventScroll: true }), 80);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  nextStepButton.addEventListener("click", () => {
    if (!validateCurrentStep()) {
      const firstInvalid = $(".input-wrap.invalid input, .input-wrap.invalid select");
      firstInvalid?.focus();
      return;
    }

    currentStep = Math.min(3, currentStep + 1);
    renderStep();
  });

  backStepButton.addEventListener("click", () => {
    currentStep = Math.max(1, currentStep - 1);
    renderStep();
  });

  $$("#loginForm input, #registerForm input, #registerForm select").forEach((input) => {
    input.addEventListener("input", () => clearFieldError(input));
    input.addEventListener("change", () => clearFieldError(input));
  });

  const passwordInput = $("#password");
  const strengthBar = $("#strengthBar");
  const strengthText = $("#strengthText");

  function passwordScore(value) {
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Za-z]/.test(value) && /\d/.test(value)) score += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return score;
  }

  passwordInput.addEventListener("input", () => {
    const states = [
      { width: "0%", color: "#a93e34", text: "Use 8 caracteres, com letra e número." },
      { width: "25%", color: "#a93e34", text: "Senha fraca." },
      { width: "50%", color: "#bd7a2d", text: "Senha razoável." },
      { width: "75%", color: "#4d7b3f", text: "Senha boa." },
      { width: "100%", color: "#2f6d37", text: "Senha forte." }
    ];
    const current = states[passwordScore(passwordInput.value)];

    strengthBar.style.width = current.width;
    strengthBar.style.backgroundColor = current.color;
    strengthText.textContent = current.text;
  });

  $("#loginForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const userInput = $("#loginUser");
    const password = $("#loginPassword");
    let valid = true;

    if (!validateRequired(userInput, "Informe seu e-mail ou CPF.")) valid = false;

    if (!validateRequired(password, "Informe sua senha.")) {
      valid = false;
    } else if (password.value.length < 8) {
      setFieldError(password, "A senha deve ter pelo menos 8 caracteres.");
      valid = false;
    }

    if (!valid) return;

    showToast("A tela está pronta. A autenticação será conectada na etapa do banco de dados.");
  });

  registerForm.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!validateStepOne() || !validateStepTwo()) {
      currentStep = 1;
      renderStep();
      showToast("Revise os campos obrigatórios antes de concluir.");
      return;
    }

    const terms = $("#terms");
    const termsError = document.querySelector('[data-error-for="terms"]');

    if (!terms.checked) {
      termsError.textContent = "Aceite os termos para concluir.";
      terms.focus();
      return;
    }

    termsError.textContent = "";
    registrationContent.hidden = true;
    registrationSuccess.hidden = false;
    registrationSuccess.focus?.();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("#terms").addEventListener("change", () => {
    document.querySelector('[data-error-for="terms"]').textContent = "";
  });

  $("#newRegistration").addEventListener("click", () => {
    registerForm.reset();
    currentStep = 1;
    registrationContent.hidden = false;
    registrationSuccess.hidden = true;
    strengthBar.style.width = "0%";
    strengthText.textContent = "Use 8 caracteres, com letra e número.";
    $$(".input-wrap.invalid").forEach((wrap) => wrap.classList.remove("invalid"));
    $$(".field-error").forEach((error) => { error.textContent = ""; });
    renderStep();
  });

  const modalContent = {
    termsModal: {
      title: "Termos de uso",
      body: `
        <p>
          O usuário é responsável pela veracidade das informações registradas
          e pelo uso adequado de suas credenciais de acesso.
        </p>
        <p>
          A versão definitiva terá controle de permissões, registro de alterações
          e aprovação administrativa de novos usuários.
        </p>
      `
    },
    privacyModal: {
      title: "Política de privacidade",
      body: `
        <p>
          Os dados pessoais serão utilizados para identificação, autenticação,
          segurança e controle de acesso ao Mais Castanhas.
        </p>
        <p>
          Nesta versão visual, nenhum dado preenchido é enviado ou armazenado.
        </p>
      `
    }
  };

  $$("[data-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      const content = modalContent[button.dataset.modal];
      modalTitle.textContent = content.title;
      modalBody.innerHTML = content.body;

      if (typeof infoModal.showModal === "function") {
        infoModal.showModal();
      } else {
        infoModal.setAttribute("open", "");
      }
    });
  });

  function closeModal() {
    if (typeof infoModal.close === "function" && infoModal.open) {
      infoModal.close();
    } else {
      infoModal.removeAttribute("open");
    }
  }

  $(".modal-close").addEventListener("click", closeModal);
  $(".modal-ok").addEventListener("click", closeModal);

  infoModal.addEventListener("click", (event) => {
    if (event.target === infoModal) closeModal();
  });

  $("#forgotPassword").addEventListener("click", () => {
    showToast("A recuperação de senha será ativada junto com a autenticação.");
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.error("Falha ao registrar o service worker:", error);
      });
    });
  }

  renderStep();
})();
