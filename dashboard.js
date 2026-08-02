(() => {
  'use strict';

  const SUPABASE_URL = 'https://otopgejrkngurroucmxd.supabase.co';
  const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ZkolpArGVOpzVY76dsIt7w_vA1Ym2R9';

  const MODULES = [
    { id:1, title:'Compras e Fornecedores', description:'Cadastro de fornecedores, propostas, compras e acompanhamento das aquisições.' },
    { id:2, title:'Capital, Investidores e Participações', description:'Controle do capital aplicado, investidores, aportes e participações.' },
    { id:3, title:'Operações e Negociações', description:'Organização das negociações entre vendedores, compradores e participantes.' },
    { id:4, title:'Estoque, Lotes e Rastreabilidade', description:'Recebimentos, lotes, estoque, movimentações e rastreabilidade da castanha.' },
    { id:5, title:'Vendas e Clientes Compradores', description:'Pedidos de venda, clientes, reservas, entregas e histórico comercial.' },
    { id:6, title:'Financeiro e Fluxo de Caixa', description:'Entradas, saídas, pagamentos, recebimentos, contas e conciliação.' },
    { id:7, title:'Resultados, Participações e Distribuições', description:'Resultados econômicos, lucros, rentabilidade e distribuição entre participantes.' },
    { id:8, title:'Transporte e Logística', description:'Fretes, coletas, veículos, motoristas, rotas, viagens e entregas.' },
    { id:9, title:'Relatórios e Inteligência Gerencial', description:'Indicadores, dashboards, comparativos, tendências e análises gerenciais.' },
    { id:10, title:'Documentos, Contratos e Conformidade', description:'Contratos, notas, recibos, certificados, laudos e histórico documental.' },
    { id:11, title:'Usuários, Perfis e Permissões', description:'Usuários, acessos, perfis, permissões, auditoria e segurança.' },
    { id:12, title:'Administração da Plataforma e Taxas', description:'Administração geral e futura taxa de 0,5% sobre operações efetivadas.', inactive:true }
  ];

  const PROFILE_MODULES = {
    extrativista:[1,3,4,8,10],
    vendedor:[3,5,8,10],
    compras:[1,2,3,4,8,10],
    estoque:[4,8,10],
    financeiro:[2,6,7,9,10],
    gestor:[1,2,3,4,5,6,7,8,9,10],
    consulta:[1,2,3,4,5,6,7,8,9,10],
    administrador:[1,2,3,4,5,6,7,8,9,10,11,12]
  };

  const PROFILE_LABELS = {
    extrativista:'Extrativista', vendedor:'Vendedor', compras:'Compras', estoque:'Estoque',
    financeiro:'Financeiro', gestor:'Gestor', consulta:'Consulta', administrador:'Administrador'
  };

  const $ = (selector) => document.querySelector(selector);
  let client;
  let profile;
  let toastTimer;

  function showToast(message) {
    const toast = $('#toast');
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
  }

  function firstName(name) {
    return String(name || 'Usuário').trim().split(/\s+/)[0] || 'Usuário';
  }

  function profileLabel(current) {
    if (current?.is_platform_admin) return 'Administrador principal';
    return PROFILE_LABELS[current?.approved_profile] || 'Perfil autorizado';
  }

  function allowedModules(current) {
    if (current?.is_platform_admin) return MODULES.map(({ id }) => id);
    return PROFILE_MODULES[current?.approved_profile] || [];
  }

  function openDialog(eyebrow, title, body) {
    $('#dialogEyebrow').textContent = eyebrow;
    $('#dialogTitle').textContent = title;
    $('#dialogBody').innerHTML = body;
    const dialog = $('#infoDialog');
    if (typeof dialog.showModal === 'function') dialog.showModal();
  }

  function renderModules() {
    const grid = $('#modulesGrid');
    const allowed = new Set(allowedModules(profile));
    grid.innerHTML = '';

    MODULES.forEach((module) => {
      const permitted = allowed.has(module.id);
      const card = document.createElement('button');
      card.type = 'button';
      card.className = `module-card${module.inactive ? ' is-inactive' : ''}${!permitted ? ' is-locked' : ''}`;
      card.dataset.moduleId = String(module.id);
      card.setAttribute('aria-label', `Núcleo ${module.id}: ${module.title}`);

      const status = module.inactive
        ? '<span class="status-badge inactive">Inativo</span>'
        : permitted
          ? '<span class="status-badge">Autorizado</span>'
          : '<span class="status-badge locked">Sem acesso</span>';

      card.innerHTML = `
        <div class="module-top"><span class="module-number">${module.id}</span>${status}</div>
        <div><h3>Núcleo ${module.id} — ${module.title}</h3><p>${module.description}</p></div>
        <div class="module-footer"><span>${module.inactive ? 'Em breve' : permitted ? 'Abrir módulo' : 'Acesso restrito'}</span><span aria-hidden="true">→</span></div>`;

      card.addEventListener('click', () => {
        if (module.inactive) {
          showToast('O Núcleo 12 está visível, mas permanece inativo. Nenhuma taxa está sendo cobrada.');
          return;
        }
        if (!permitted) {
          showToast('Este núcleo não está liberado para o seu perfil.');
          return;
        }
        openDialog('Módulo autorizado', `Núcleo ${module.id}`, `<p><strong>${module.title}</strong></p><p>A estrutura desta área será conectada na próxima etapa. O botão está funcional e o acesso foi validado para o perfil atual.</p>`);
      });
      grid.appendChild(card);
    });

    $('#moduleCount').textContent = `${allowed.size} autorizados`;
  }

  function renderProfile() {
    const name = profile.full_name || profile.name || profile.email || 'Usuário';
    $('#greeting').textContent = 'Olá,';
    $('#userName').textContent = firstName(name);
    $('#userName').title = name;
    $('#userRole').textContent = profileLabel(profile);
    $('#accessBadge').textContent = profile.is_platform_admin ? 'Acesso total' : 'Acesso por perfil';
    renderModules();
  }

  async function loadAuthorizedProfile(session) {
    const { data, error } = await client
      .from('profiles')
      .select('id, full_name, approved_profile, approval_status, is_platform_admin')
      .eq('id', session.user.id)
      .maybeSingle();

    if (error) throw error;
    if (!data || data.approval_status !== 'aprovado') {
      await client.auth.signOut();
      throw new Error('Cadastro não aprovado.');
    }
    return data;
  }

  function bindNavigation() {
    document.querySelectorAll('.nav-item').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach((item) => {
          item.classList.toggle('active', item === button);
          item.removeAttribute('aria-current');
        });
        button.setAttribute('aria-current', 'page');

        const destination = button.dataset.nav;
        if (destination === 'inicio') window.scrollTo({ top:0, behavior:'smooth' });
        if (destination === 'negociacoes') {
          document.querySelector('[data-module-id="3"]')?.scrollIntoView({ behavior:'smooth', block:'center' });
          showToast('Núcleo 3 — Operações e Negociações.');
        }
        if (destination === 'notificacoes') showToast('Você não possui novas notificações.');
        if (destination === 'perfil') {
          openDialog('Dados do acesso', 'Seu perfil', `<div class="profile-list"><div class="profile-row"><span>Nome</span><strong>${profile.full_name || 'Não informado'}</strong></div><div class="profile-row"><span>Perfil</span><strong>${profileLabel(profile)}</strong></div><div class="profile-row"><span>Situação</span><strong>Aprovado</strong></div></div>`);
        }
        if (destination === 'mais') {
          const admin = profile.is_platform_admin || profile.approved_profile === 'administrador';
          showToast(admin ? 'Painel administrativo será conectado ao botão Mais.' : 'O painel Mais é restrito a usuários autorizados.');
        }
      });
    });

    $('#notificationsButton').addEventListener('click', () => showToast('Você não possui novas notificações.'));
    $('#closeDialog').addEventListener('click', () => $('#infoDialog').close());
    $('#dialogOk').addEventListener('click', () => $('#infoDialog').close());
    $('#infoDialog').addEventListener('click', (event) => {
      if (event.target === $('#infoDialog')) $('#infoDialog').close();
    });

    $('#logoutButton').addEventListener('click', async () => {
      const button = $('#logoutButton');
      button.disabled = true;
      button.textContent = 'Saindo...';
      await client.auth.signOut();
      localStorage.removeItem('maisCastanhas.currentProfile');
      sessionStorage.removeItem('maisCastanhas.currentProfile');
      location.replace('./index.html');
    });
  }

  async function init() {
    try {
      if (!window.supabase?.createClient) throw new Error('Biblioteca do Supabase indisponível.');
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:false }
      });

      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (!data.session) {
        location.replace('./index.html');
        return;
      }

      profile = await loadAuthorizedProfile(data.session);
      localStorage.setItem('maisCastanhas.currentProfile', JSON.stringify(profile));
      renderProfile();
      bindNavigation();
      $('#appShell').hidden = false;
      $('#loadingScreen').remove();

      client.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') location.replace('./index.html');
      });
    } catch (error) {
      console.error(error);
      const loading = $('#loadingScreen');
      if (loading) loading.innerHTML = '<p>Não foi possível validar seu acesso.</p><a href="./index.html">Voltar para a entrada</a>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true });
  else init();
})();
