(() => {
  'use strict';

  const SUPABASE_URL = 'https://otopgejrkngurroucmxd.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZkolpArGVOpzVY76dsIt7w_vA1Ym2R9';

  const $ = (selector) => document.querySelector(selector);
  const value = (selector) => $(selector)?.value?.trim() || '';
  const showToast = (message) => {
    const toast = $('#toast');
    if (!toast) return alert(message);
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 5000);
  };

  function getClient() {
    if (!window.supabase?.createClient) return null;
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
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
        type: 'pessoa_juridica',
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
      type: 'pessoa_fisica',
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
      options: {
        emailRedirectTo: redirectTo,
        data: payload.metadata
      }
    });
    if (error) throw error;

    if (data.session && data.user) {
      const request = {
        auth_user_id: data.user.id,
        registration_type: payload.metadata.registration_type,
        requested_profile: payload.metadata.requested_profile,
        status: 'pendente',
        full_name: payload.metadata.full_name || null,
        cpf: payload.metadata.cpf || null,
        personal_email: payload.metadata.personal_email || null,
        personal_phone: payload.metadata.personal_phone || null,
        company_legal_name: payload.metadata.company_legal_name || null,
        company_trade_name: payload.metadata.company_trade_name || null,
        cnpj: payload.metadata.cnpj || null,
        company_email: payload.metadata.company_email || null,
        company_phone: payload.metadata.company_phone || null,
        responsible_name: payload.metadata.responsible_name || null,
        responsible_cpf: payload.metadata.responsible_cpf || null,
        responsible_role: payload.metadata.responsible_role || null,
        responsible_email: payload.metadata.responsible_email || null,
        responsible_phone: payload.metadata.responsible_phone || null,
        city: payload.metadata.city || null,
        state: payload.metadata.state || null
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
    if (!identifier.includes('@')) {
      return showToast('Neste primeiro momento, entre usando o e-mail cadastrado.');
    }
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
      const message = error?.message?.toLowerCase().includes('invalid login')
        ? 'E-mail ou senha incorretos.'
        : `Não foi possível entrar: ${error.message || 'erro desconhecido'}`;
      showToast(message);
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
      const redirectTo = `${location.origin}${location.pathname}`;
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) throw error;
      showToast('Enviamos as instruções de recuperação para o e-mail informado.');
    } catch (error) {
      showToast(`Não foi possível solicitar a recuperação: ${error.message || 'erro desconhecido'}`);
    }
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
        const message = data.session
          ? 'Cadastro enviado e registrado para análise administrativa.'
          : 'Cadastro criado. Confirme o e-mail para concluir o envio para análise.';
        showToast(message);
      } catch (error) {
        showToast(`O cadastro não foi enviado ao servidor: ${error.message || 'erro desconhecido'}`);
      } finally {
        if (finish) { finish.disabled = false; finish.textContent = original; }
      }
    });
  }

  function init() {
    $('#loginForm')?.addEventListener('submit', handleLogin, true);
    $('#forgotPassword')?.addEventListener('click', handleRecovery, true);
    bindRegistration();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
