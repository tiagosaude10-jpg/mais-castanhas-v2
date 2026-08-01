(() => {
  'use strict';

  const SUPABASE_URL = 'https://otopgejrkngurroucmxd.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZkolpArGVOpzVY76dsIt7w_vA1Ym2R9';
  const $ = (selector) => document.querySelector(selector);
  const value = (selector) => $(selector)?.value?.trim() || '';

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return alert(message);
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 5000);
  }

  function getClient() {
    if (!window.supabase?.createClient) return null;
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce'
      }
    });
  }

  const client = getClient();
  window.maisCastanhasSupabase = client;

  function selectedProfile(prefix) {
    const radio = document.querySelector(`input[name="${prefix}RequestedProfile"]:checked`);
    return radio?.value || '';
  }

  function registrationData() {
    const isPJ = Boolean(value('#pjCnpj'));
    if (isPJ) {
      return {
        email: value('#pjResponsibleEmail'),
        password: value('#pjPassword'),
        metadata: {
          registration_type: 'pessoa_juridica',
          requested_profile: selectedProfile('pj'),
          company_legal_name: value('#pjLegalName'),
          company_trade_name: value('#pjTradeName'),
          cnpj: value('#pjCnpj'),
          company_email: value('#pjCompanyEmail'),
          company_phone: value('#pjCompanyPhone'),
          responsible_name: value('#pjResponsibleName'),
          responsible_cpf: value('#pjResponsibleCpf'),
          responsible_role: value('#pjResponsibleRole'),
          responsible_email: value('#pjResponsibleEmail'),
          responsible_phone: value('#pjResponsiblePhone'),
          city: value('#pjCity'),
          state: value('#pjState')
        }
      };
    }

    return {
      email: value('#pfEmail'),
      password: value('#pfPassword'),
      metadata: {
        registration_type: 'pessoa_fisica',
        requested_profile: selectedProfile('pf'),
        full_name: value('#pfFullName'),
        cpf: value('#pfCpf'),
        personal_email: value('#pfEmail'),
        personal_phone: value('#pfPhone'),
        city: value('#pfCity'),
        state: value('#pfState')
      }
    };
  }

  async function createRegistration() {
    if (!client) throw new Error('Serviço de autenticação indisponível.');
    const payload = registrationData();
    if (!payload.email || !payload.password || !payload.metadata.requested_profile) {
      throw new Error('Preencha e revise os dados do cadastro antes de concluir.');
    }

    const redirectTo = `${location.origin}${location.pathname}`;
    const { data, error } = await client.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: { emailRedirectTo: redirectTo, data: payload.metadata }
    });
    if (error) throw error;

    if (data.session && data.user) {
      const m = payload.metadata;
      const request = {
        auth_user_id: data.user.id,
        registration_type: m.registration_type,
        requested_profile: m.requested_profile,
        status: 'pendente',
        full_name: m.full_name || null,
        cpf: m.cpf || null,
        personal_email: m.personal_email || null,
        personal_phone: m.personal_phone || null,
        company_legal_name: m.company_legal_name || null,
        company_trade_name: m.company_trade_name || null,
        cnpj: m.cnpj || null,
        company_email: m.company_email || null,
        company_phone: m.company_phone || null,
        responsible_name: m.responsible_name || null,
        responsible_cpf: m.responsible_cpf || null,
        responsible_role: m.responsible_role || null,
        responsible_email: m.responsible_email || null,
        responsible_phone: m.responsible_phone || null,
        city: m.city || null,
        state: m.state || null
      };
      const { error: requestError } = await client.from('registration_requests').insert(request);
      if (requestError) throw requestError;
    }

    return data;
  }

  async function handleLogin(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!client) return showToast('Não foi possível conectar ao serviço de acesso.');

    const identifier = value('#loginUser');
    const password = value('#loginPassword');
    if (!identifier.includes('@')) return showToast('Entre usando o e-mail cadastrado.');
    if (!password) return showToast('Informe sua senha.');

    const button = $('#loginForm button[type="submit"]');
    const original = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'Entrando...'; }

    try {
      const { data, error } = await client.auth.signInWithPassword({ email: identifier, password });
      if (error) throw error;

      const { data: profile, error: profileError } = await client
        .from('profiles')
        .select('full_name, approved_profile, approval_status, is_platform_admin')
        .eq('id', data.user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      if (!profile || profile.approval_status !== 'aprovado') {
        await client.auth.signOut();
        return showToast('Seu cadastro ainda não foi aprovado pelo administrador.');
      }

      localStorage.setItem('maisCastanhas.currentProfile', JSON.stringify(profile));
      showToast(`Acesso autorizado. Bem-vindo, ${profile.full_name || 'usuário'}.`);
      document.dispatchEvent(new CustomEvent('maiscastanhas:login-success', { detail: profile }));
    } catch (error) {
      const invalid = error?.message?.toLowerCase().includes('invalid login');
      showToast(invalid ? 'E-mail ou senha incorretos.' : `Não foi possível entrar: ${error.message || 'erro desconhecido'}`);
    } finally {
      if (button) { button.disabled = false; button.textContent = original; }
    }
  }

  async function handleRecovery(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    if (!client) return showToast('Serviço de recuperação indisponível.');

    const current = value('#loginUser');
    const email = current.includes('@') ? current : prompt('Digite o e-mail cadastrado:');
    if (!email) return;

    try {
      localStorage.setItem('maisCastanhas.passwordRecoveryPending', 'true');
      const redirectTo = `${location.origin}${location.pathname}`;
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      showToast('Enviamos as instruções de recuperação para o e-mail informado.');
    } catch (error) {
      localStorage.removeItem('maisCastanhas.passwordRecoveryPending');
      showToast(`Não foi possível solicitar a recuperação: ${error.message || 'erro desconhecido'}`);
    }
  }

  function showPasswordResetScreen() {
    if ($('#maisCastanhasPasswordReset')) return;

    const overlay = document.createElement('div');
    overlay.id = 'maisCastanhasPasswordReset';
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;z-index:99999;background:#FDE3C5;display:grid;place-items:center;padding:24px;box-sizing:border-box;">
        <form id="maisCastanhasPasswordResetForm" style="width:min(100%,430px);background:#fff;padding:26px;border-radius:24px;box-sizing:border-box;box-shadow:0 18px 55px rgba(45,70,43,.18);">
          <h2 style="margin:0 0 8px;color:#2f6535;text-align:center;">Criar nova senha</h2>
          <p style="margin:0 0 22px;color:#687169;text-align:center;line-height:1.45;">Digite uma nova senha para sua conta do Mais Castanhas.</p>
          <label style="display:block;margin-bottom:8px;font-weight:800;color:#344038;">Nova senha</label>
          <input id="newPassword" type="password" minlength="8" autocomplete="new-password" required style="width:100%;height:56px;padding:0 16px;border:1.5px solid #cfd8cc;border-radius:16px;box-sizing:border-box;font-size:16px;">
          <label style="display:block;margin:16px 0 8px;font-weight:800;color:#344038;">Confirmar nova senha</label>
          <input id="confirmNewPassword" type="password" minlength="8" autocomplete="new-password" required style="width:100%;height:56px;padding:0 16px;border:1.5px solid #cfd8cc;border-radius:16px;box-sizing:border-box;font-size:16px;">
          <button type="submit" style="width:100%;height:58px;margin-top:22px;border:0;border-radius:18px;background:#376f3d;color:#fff;font-size:17px;font-weight:850;">Salvar nova senha</button>
          <p id="passwordResetMessage" style="min-height:22px;margin:14px 0 0;text-align:center;color:#7a3f20;"></p>
        </form>
      </div>`;
    document.body.appendChild(overlay);

    $('#maisCastanhasPasswordResetForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const newPassword = value('#newPassword');
      const confirmation = value('#confirmNewPassword');
      const message = $('#passwordResetMessage');
      const button = event.currentTarget.querySelector('button[type="submit"]');

      if (newPassword.length < 8) {
        message.textContent = 'A senha precisa ter pelo menos 8 caracteres.';
        return;
      }
      if (newPassword !== confirmation) {
        message.textContent = 'As duas senhas não são iguais.';
        return;
      }

      button.disabled = true;
      button.textContent = 'Salvando...';
      message.textContent = '';

      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) {
        message.textContent = `Não foi possível salvar: ${error.message}`;
        button.disabled = false;
        button.textContent = 'Salvar nova senha';
        return;
      }

      localStorage.removeItem('maisCastanhas.passwordRecoveryPending');
      message.style.color = '#2f6535';
      message.textContent = 'Senha alterada com sucesso. Você já pode entrar.';
      setTimeout(async () => {
        await client.auth.signOut();
        history.replaceState({}, document.title, location.pathname);
        overlay.remove();
        $('#loginUser')?.focus();
        showToast('Senha criada. Entre com seu e-mail e a nova senha.');
      }, 1600);
    });
  }

  async function bindRecoveryDetection() {
    if (!client) return;

    const params = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const code = params.get('code');
    const type = params.get('type') || hash.get('type');
    const pending = localStorage.getItem('maisCastanhas.passwordRecoveryPending') === 'true';

    client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') showPasswordResetScreen();
    });

    if (type === 'recovery') {
      setTimeout(showPasswordResetScreen, 150);
      return;
    }

    if (code) {
      try {
        const { error } = await client.auth.exchangeCodeForSession(code);
        if (error) throw error;
        history.replaceState({}, document.title, location.pathname);
        showPasswordResetScreen();
        return;
      } catch (error) {
        console.error('Falha ao validar o link de recuperação:', error);
      }
    }

    const { data } = await client.auth.getSession();
    if (pending && data?.session) showPasswordResetScreen();
  }

  function bindRegistration() {
    const form = $('#registerForm');
    if (!form) return;
    form.addEventListener('submit', async () => {
      const finish = $('#finishRegistration');
      const original = finish?.textContent;
      if (finish) { finish.disabled = true; finish.textContent = 'Enviando...'; }
      try {
        const data = await createRegistration();
        showToast(data.session
          ? 'Cadastro enviado e registrado para análise administrativa.'
          : 'Cadastro criado. Confirme o e-mail para concluir o envio para análise.');
      } catch (error) {
        showToast(`O cadastro não foi enviado ao servidor: ${error.message || 'erro desconhecido'}`);
      } finally {
        if (finish) { finish.disabled = false; finish.textContent = original; }
      }
    });
  }

  function init() {
    bindRecoveryDetection();
    $('#loginForm')?.addEventListener('submit', handleLogin, true);
    $('#forgotPassword')?.addEventListener('click', handleRecovery, true);
    bindRegistration();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
