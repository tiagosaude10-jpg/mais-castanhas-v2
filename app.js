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

    panelTitle.textContent = isLogin
      ? "Entre na sua conta"
      : "Crie seu acesso";

    panelDescription.textContent = isLogin
      ? "Informe seus dados de acesso para continuar."
      : "Cadastre seus dados pessoais. O acesso ficará pendente até a aprovação administrativa.";

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

  function isValidCPF(value) {
    const cpf = onlyDigits(value);

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
      return false;
    }

    const calculateDigit = (length) => {
      let sum = 0;
      for (let i = 0; i < length; i += 1) {
        sum += Number(cpf[i]) * (length + 1 - i);
      }
      const remainder = (sum * 10) % 11;
      return remainder === 10 ? 0 : remainder;
    };

    return calculateDigit(9) === Number(cpf[9])
      && calculateDigit(10) === Number(cpf[10]);
  }

  const cpfInput = $("#cpf");
  const phoneInput = $("#phone");

  cpfInput.addEventListener("input", () => {
    cpfInput.value = formatCPF(cpfInput.value);
    clearFieldError(cpfInput);
  });

  phoneInput.addEventListener("input", () => {
    phoneInput.value = formatPhone(phoneInput.value);
    clearFieldError(phoneInput);
  });

  $$("[data-toggle-password]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.togglePassword);
      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      button.textContent = showing ? "Mostrar" : "Ocultar";
      button.setAttribute("aria-label", showing ? "Mostrar senha" : "Ocultar senha");
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
    const basicEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!validateRequired(input, "Informe seu e-mail.")) return false;

    if (!basicEmailPattern.test(input.value.trim())) {
      setFieldError(input, "Digite um e-mail válido.");
      return false;
    }

    clearFieldError(input);
    return true;
  }

  $$("#loginForm input, #registerForm input").forEach((input) => {
    input.addEventListener("input", () => clearFieldError(input));
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
    const score = passwordScore(passwordInput.value);
    const states = [
      { width: "0%", color: "#a93e34", text: "Use 8 caracteres, letra e número." },
      { width: "25%", color: "#a93e34", text: "Senha fraca." },
      { width: "50%", color: "#bd7a2d", text: "Senha razoável." },
      { width: "75%", color: "#4d7b3f", text: "Senha boa." },
      { width: "100%", color: "#2f6d37", text: "Senha forte." }
    ];
    const current = states[score];

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

    showToast(
      "Tela pronta. A autenticação real será ativada quando o banco de dados for conectado."
    );
  });

  $("#registerForm").addEventListener("submit", (event) => {
    event.preventDefault();

    const fullName = $("#fullName");
    const cpf = $("#cpf");
    const phone = $("#phone");
    const email = $("#email");
    const password = $("#password");
    const passwordConfirm = $("#passwordConfirm");
    const terms = $("#terms");

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
    } else if (password.value.length < 8 || !/[A-Za-z]/.test(password.value) || !/\d/.test(password.value)) {
      setFieldError(password, "Use pelo menos 8 caracteres, incluindo letra e número.");
      valid = false;
    }

    if (!validateRequired(passwordConfirm, "Confirme sua senha.")) {
      valid = false;
    } else if (passwordConfirm.value !== password.value) {
      setFieldError(passwordConfirm, "As senhas não são iguais.");
      valid = false;
    }

    const termsError = document.querySelector('[data-error-for="terms"]');
    if (!terms.checked) {
      termsError.textContent = "Aceite os termos para continuar.";
      valid = false;
    } else {
      termsError.textContent = "";
    }

    if (!valid) return;

    showToast(
      "Primeira etapa validada. Os dados ainda não foram enviados porque o banco de dados será conectado na próxima fase."
    );
  });

  $("#terms").addEventListener("change", () => {
    document.querySelector('[data-error-for="terms"]').textContent = "";
  });

  const modalContent = {
    termsModal: {
      title: "Termos de uso",
      body: `
        <p>
          Esta é a estrutura inicial da versão 2 do Mais Castanhas. O uso definitivo
          dependerá da conexão com autenticação, banco de dados e regras de permissão.
        </p>
        <p>
          Cada usuário será responsável pela veracidade das informações cadastradas e
          o acesso somente será liberado após aprovação administrativa.
        </p>
      `
    },
    privacyModal: {
      title: "Política de privacidade",
      body: `
        <p>
          Os dados pessoais deverão ser utilizados exclusivamente para identificação,
          autenticação, segurança e controle de acesso ao Mais Castanhas.
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
      infoModal.showModal();
    });
  });

  function closeModal() {
    if (infoModal.open) infoModal.close();
  }

  $(".modal-close").addEventListener("click", closeModal);
  $(".modal-ok").addEventListener("click", closeModal);

  infoModal.addEventListener("click", (event) => {
    if (event.target === infoModal) closeModal();
  });

  $("#forgotPassword").addEventListener("click", () => {
    showToast("A recuperação de senha será conectada ao serviço de autenticação.");
  });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((error) => {
        console.error("Falha ao registrar o service worker:", error);
      });
    });
  }
})();
