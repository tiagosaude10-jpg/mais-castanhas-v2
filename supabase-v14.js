(() => {
  'use strict';

  const SUPABASE_URL = 'https://otopgejrkngurroucmxd.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZkolpArGVOpzVY76dsIt7w_vA1Ym2R9';
  const DASHBOARD_URL = './dashboard.html';
  const $ = (selector) => document.querySelector(selector);
  const value = (selector) => $(selector)?.value?.trim() || '';

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return alert(message);
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 5000);
  }

  if (!window.supabase?.createClient) {
    console.error('Biblioteca do Supabase não carregada.');
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.maisCastanhasSupabase = client;

  function selectedProfile(prefix) {
    return document.querySelector(`input[name="${prefix}RequestedProfile"]:checked`)?.value || '';
  }

  function recoveryParameters() {
    const query = new URLSearchParams(location.search);
    const hash = new URLSearchParams(location.hash.replace(/^#/, ''));
    const code = query.get('code');
    const accessToken = hash.get('access_token');
    const refreshToken = hash.get('refresh_token');
    const active = query.get('recovery') === '1'
      || query.get('type') === 'recovery'
      || hash.get('type') === 'recovery'
      || Boolean(code)
      || Boolean(accessToken && refreshToken);
    return { active, code, accessToken, refreshToken };
  }

  async function getApprovedProfile(userId) {
    const { data, error } = await client
      .from('profiles')
      .select('full_name, approved_profile, approval_status, is_platform_admin')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    return data?.approval_status === 'aprovado' ? data : null;
  }

  function openDashboard(profile) {
    localStorage.setItem('maisCastanhas.currentProfile', JSON.stringify(profile));
    location.replace(DASHBOARD_URL);
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
    const payload = registrationData();
    if (!payload.email || !payload.password || !payload.metadata.requested_profile) {
      throw new Error('Preencha e revise os dados do cadastro antes de concluir.');
    }
    const { data, error } = await client.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        emailRedirectTo: `${location.origin}${location.pathname}`,
        data: payload.metadata
      }
    });
    if (error) throw error;
    return data;
  }

  async function handleLogin(event) {
    event.preventDefault();
    event.stopImmediatePropagation();

    const email = value('#loginUser');
    const password = value('#loginPassword');
    if (!email.includes('@')) return showToast('Entre usando o e-mail cadastrado.');
    if (!password) return showToast('Informe sua senha.');

    const button = $('#loginForm button[type="submit"]');
    const original = button?.textContent || 'Entrar no aplicativo';
    if (button) {
      button.disabled = true;
      button.textContent = 'Entrando...';
    }

    try {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const profile = await getApprovedProfile(data.user.id);
      if (!profile) {
        await client.auth.signOut();
        showToast('Seu cadastro ainda não foi aprovado pelo administrador.');
        return;
      }

      document.dispatchEvent(new CustomEvent('maiscastanhas:login-success', { detail: profile }));
      openDashboard(profile);
    } catch (error) {
      const invalid = String(error?.message || '').toLowerCase().includes('invalid login');
      showToast(invalid ? 'E-mail ou senha incorretos.' : `Não foi possível entrar: ${error.message || 'erro desconhecido'}`);
    } finally {
      if (button && document.contains(button)) {
        button.disabled = false;
        button.textContent = original;
      }
    }
  }

  async function restoreApprovedSession() {
    if (recoveryParameters().active) return;
    try {
      const { data, error } = await client.auth.getSession();
      if (error || !data.session?.user) return;
      const profile = await getApprovedProfile(data.session.user.id);
      if (!profile) {
        await client.auth.signOut();
        localStorage.removeItem('maisCastanhas.currentProfile');
        return;
      }
      openDashboard(profile);
    } catch (error) {
      console.error('Não foi possível restaurar a sessão:', error);
    }
  }

  async function handleRecovery(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    const current = value('#loginUser');
    const email = current.includes('@') ? current : prompt('Digite o e-mail cadastrado:');
    if (!email) return;
    try {
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${location.origin}${location.pathname}?recovery=1`
      });
      if (error) throw error;
      showToast('Enviamos as instruções de recuperação para o e-mail informado.');
    } catch (error) {
      showToast(`Não foi possível solicitar a recuperação: ${error.message || 'erro desconhecido'}`);
    }
  }

  function showPasswordResetScreen(statusText = '') {
    if ($('#maisCastanhasPasswordReset')) return;
    const overlay = document.createElement('div');
    overlay.id = 'maisCastanhasPasswordReset';
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;z-index:2147483647;background:#FDE3C5;display:grid;place-items:center;padding:24px;box-sizing:border-box;">
        <form id="maisCastanhasPasswordResetForm" style="width:min(100%,430px);background:#fff;padding:26px;border-radius:24px;box-sizing:border-box;box-shadow:0 18px 55px rgba(45,70,43,.18);">
          <h2 style="margin:0 0 8px;color:#2f6535;text-align:center;">Criar nova senha</h2>
          <p style="margin:0 0 22px;color:#687169;text-align:center;line-height:1.45;">Digite e confirme a nova senha da sua conta.</p>
          <label style="display:block;margin-bottom:8px;font-weight:800;color:#344038;">Nova senha</label>
          <input id="newPassword" type="password" minlength="8" autocomplete="new-password" required style="width:100%;height:56px;padding:0 16px;border:1.5px solid #cfd8cc;border-radius:16px;box-sizing:border-box;font-size:16px;">
          <label style="display:block;margin:16px 0 8px;font-weight:800;color:#344038;">Confirmar nova senha</label>
          <input id="confirmNewPassword" type="password" minlength="8" autocomplete="new-password" required style="width:100%;height:56px;padding:0 16px;border:1.5px solid #cfd8cc;border-radius:16px;box-sizing:border-box;font-size:16px;">
          <button type="submit" style="width:100%;height:58px;margin-top:22px;border:0;border-radius:18px;background:#376f3d;color:#fff;font-size:17px;font-weight:850;">Salvar nova senha</button>
          <p id="passwordResetMessage" style="min-height:22px;margin:14px 0 0;text-align:center;color:#7a3f20;">${statusText}</p>
        </form>
      </div>`;
    document.body.appendChild(overlay);

    $('#maisCastanhasPasswordResetForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const password = value('#newPassword');
      const confirmation = value('#confirmNewPassword');
      const message = $('#passwordResetMessage');
      const button = event.currentTarget.querySelector('button[type="submit"]');
      if (password.length < 8) return void (message.textContent = 'A senha precisa ter pelo menos 8 caracteres.');
      if (password !== confirmation) return void (message.textContent = 'As duas senhas não são iguais.');

      button.disabled = true;
      button.textContent = 'Salvando...';
      message.textContent = '';
      const { error } = await client.auth.updateUser({ password });
      if (error) {
        message.textContent = `Não foi possível salvar: ${error.message}`;
        button.disabled = false;
        button.textContent = 'Salvar nova senha';
        return;
      }

      message.style.color = '#2f6535';
      message.textContent = 'Senha alterada com sucesso.';
      setTimeout(async () => {
        await client.auth.signOut();
        history.replaceState({}, document.title, location.pathname);
        overlay.remove();
        showToast('Senha criada. Entre com seu e-mail e a nova senha.');
      }, 1200);
    });
  }

  async function processRecoveryReturn() {
    const recovery = recoveryParameters();
    if (!recovery.active) return;
    showPasswordResetScreen('Validando o link de recuperação...');

    try {
      if (recovery.code) {
        const { error } = await client.auth.exchangeCodeForSession(recovery.code);
        if (error) throw error;
      } else if (recovery.accessToken && recovery.refreshToken) {
        const { error } = await client.auth.setSession({
          access_token: recovery.accessToken,
          refresh_token: recovery.refreshToken
        });
        if (error) throw error;
      }

      const { data } = await client.auth.getSession();
      const message = $('#passwordResetMessage');
      if (data.session) {
        if (message) message.textContent = '';
      } else if (message) {
        message.textContent = 'O link não criou uma sessão válida. Solicite um novo e-mail de recuperação.';
      }
    } catch (error) {
      const message = $('#passwordResetMessage');
      if (message) message.textContent = `Link inválido ou expirado: ${error.message || 'tente novamente'}`;
    }
  }

  function bindRegistration() {
    const form = $('#registerForm');
    if (!form) return;
    form.addEventListener('submit', async () => {
      const finish = $('#finishRegistration');
      const original = finish?.textContent || 'Concluir cadastro';
      if (finish) {
        finish.disabled = true;
        finish.textContent = 'Enviando...';
      }
      try {
        const data = await createRegistration();
        showToast(data.session ? 'Cadastro enviado para análise administrativa.' : 'Cadastro criado. Confirme o e-mail.');
      } catch (error) {
        showToast(`O cadastro não foi enviado: ${error.message || 'erro desconhecido'}`);
      } finally {
        if (finish && document.contains(finish)) {
          finish.disabled = false;
          finish.textContent = original;
        }
      }
    });
  }

  async function init() {
    await processRecoveryReturn();
    client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') showPasswordResetScreen();
    });
    $('#loginForm')?.addEventListener('submit', handleLogin, true);
    $('#forgotPassword')?.addEventListener('click', handleRecovery, true);
    bindRegistration();
    await restoreApprovedSession();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
