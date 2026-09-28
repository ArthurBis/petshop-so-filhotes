/* ==========================================================================
   api.js — CAMADA DE DADOS (agora ligada ao Supabase)
   --------------------------------------------------------------------------
   TODO acesso a dados do site passa por este arquivo. O resto do código
   (site.js e admin.js) só chama as funções do objeto `Api` e não sabe de
   onde os dados vêm — por isso é só este arquivo que muda.

   Depende de duas coisas carregadas ANTES deste script em todas as páginas:
   1) js/config.js         → define SUPABASE_URL e SUPABASE_ANON_KEY
   2) SDK do Supabase (CDN) → define window.supabase

   O formato dos objetos (Filhote, Interessado) é o mesmo descrito no
   README, na seção "Contrato com o back-end".
   ========================================================================== */

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storageKey: 'sf-auth', // nome fixo da chave no localStorage (usado por sessaoAtual)
    persistSession: true,
    autoRefreshToken: true,
  },
});

const Api = (() => {
  /* ------------------------------------------------------------------------
     Erros
     ------------------------------------------------------------------------ */
  class ErroApi extends Error {
    constructor(mensagem, status) {
      super(mensagem);
      this.status = status;
    }
  }

  // Traduz um erro do Supabase/Postgrest para o formato que admin.js espera.
  // status 401 faz o painel voltar para a tela de login (ver admin.js → tratarErro).
  function tratarErroSupabase(error, contexto = '') {
    const msg = (error && error.message ? error.message : '').toLowerCase();

    if (msg.includes('invalid login credentials')) {
      return new ErroApi('E-mail ou senha incorretos.', 401);
    }
    if (
      (error && (error.code === '42501' || error.code === 'PGRST301')) ||
      msg.includes('row-level security') ||
      msg.includes('jwt')
    ) {
      return new ErroApi('Sua sessão expirou. Entre novamente.', 401);
    }
    return new ErroApi((error && error.message) || `Erro ao comunicar com o servidor (${contexto}).`, 400);
  }

  // Executa uma chamada do Supabase e já trata erro + falha de rede.
  async function chamar(promessa, contexto) {
    let resultado;
    try {
      resultado = await promessa;
    } catch {
      throw new ErroApi('Não foi possível conectar ao servidor.', 0);
    }
    if (resultado.error) throw tratarErroSupabase(resultado.error, contexto);
    return resultado.data;
  }

  /* ------------------------------------------------------------------------
     Sessão (login)
     ------------------------------------------------------------------------
     sessaoAtual() precisa responder na hora (sem esperar Promise), porque
     admin.js chama ela assim que a página carrega. Por isso guardamos uma
     cópia em memória (sessaoCache), atualizada pelo Supabase sempre que o
     login muda (onAuthStateChange).
     ------------------------------------------------------------------------ */
  function nomeAmigavel(user) {
    if (!user) return 'Administrador';
    if (user.user_metadata && user.user_metadata.nome) return user.user_metadata.nome;
    const local = (user.email || '').split('@')[0] || 'Administrador';
    return local.charAt(0).toUpperCase() + local.slice(1);
  }

  function mapearSessao(sessaoSupabase) {
    if (!sessaoSupabase) return null;
    return { token: sessaoSupabase.access_token, nome: nomeAmigavel(sessaoSupabase.user) };
  }

  // Lê a sessão já salva pelo Supabase no localStorage, de forma síncrona,
  // para a tela de login/painel decidir corretamente já na primeira renderização.
  function lerSessaoInicial() {
    try {
      const bruto = localStorage.getItem('sf-auth');
      if (!bruto) return null;
      const sessao = JSON.parse(bruto);
      if (!sessao || !sessao.access_token || !sessao.user) return null;
      return mapearSessao(sessao);
    } catch {
      return null;
    }
  }

  let sessaoCache = lerSessaoInicial();
  supabaseClient.auth.onAuthStateChange((_evento, sessaoSupabase) => {
    sessaoCache = mapearSessao(sessaoSupabase);
  });

  // POST /login  →  { token, nome }
  async function entrar(email, senha) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password: senha });
    if (error) throw tratarErroSupabase(error, 'login');
    sessaoCache = mapearSessao(data.session);
    return sessaoCache;
  }

  function sair() {
    sessaoCache = null;
    supabaseClient.auth.signOut().catch(() => {});
  }

  function sessaoAtual() {
    return sessaoCache;
  }

  /* ------------------------------------------------------------------------
     Filhotes
     ------------------------------------------------------------------------ */

  // GET /filhotes — público
  async function listarFilhotes() {
    return chamar(supabaseClient.from('filhotes').select('*').order('id', { ascending: false }), 'listar filhotes');
  }

  // POST /filhotes (novo) ou PUT /filhotes/:id (edição) — exige login
  // filhote.preco é um número (ex.: 3499.9) ou null quando for "Consultar"
  async function salvarFilhote(filhote) {
    const linha = {
      nome: filhote.nome,
      raca: filhote.raca,
      sexo: filhote.sexo,
      nascimento: filhote.nascimento || null,
      preco: filhote.preco,
      status: filhote.status,
      porte: filhote.porte,
      pelagem: filhote.pelagem || '',
      foto: filhote.foto || '',
      descricao: filhote.descricao || '',
      saude: filhote.saude || { vacinas: [], vermifugado: false, microchip: false, pedigree: false },
    };

    if (filhote.id) {
      return chamar(
        supabaseClient.from('filhotes').update(linha).eq('id', filhote.id).select().single(),
        'salvar filhote'
      );
    }
    return chamar(supabaseClient.from('filhotes').insert(linha).select().single(), 'salvar filhote');
  }

  // DELETE /filhotes/:id — exige login
  async function excluirFilhote(id) {
    await chamar(supabaseClient.from('filhotes').delete().eq('id', id), 'excluir filhote');
    return null;
  }

  /* ------------------------------------------------------------------------
     Interessados
     ------------------------------------------------------------------------
     A tabela usa nomes de coluna em snake_case (filhote_id, filhote_nome,
     criado_em); aqui convertemos para o formato camelCase que o resto do
     site espera (filhoteId, filhoteNome, criadoEm).
     ------------------------------------------------------------------------ */
  function linhaParaInteressado(linha) {
    return {
      id: linha.id,
      nome: linha.nome,
      telefone: linha.telefone,
      filhoteId: linha.filhote_id,
      filhoteNome: linha.filhote_nome,
      mensagem: linha.mensagem || '',
      criadoEm: linha.criado_em,
      atendido: linha.atendido,
    };
  }

  // POST /interessados — público (o cliente preenche no site)
  async function registrarInteresse({ nome, telefone, filhoteId, mensagem }) {
    let filhoteNome = null;
    if (filhoteId) {
      try {
        const filhote = await chamar(
          supabaseClient.from('filhotes').select('nome').eq('id', filhoteId).maybeSingle(),
          'buscar filhote'
        );
        filhoteNome = filhote ? filhote.nome : null;
      } catch {
        filhoteNome = null; // não é crítico: segue sem o nome
      }
    }

    const linha = await chamar(
      supabaseClient
        .from('interessados')
        .insert({ nome, telefone, filhote_id: filhoteId, filhote_nome: filhoteNome, mensagem: mensagem || '' })
        .select()
        .single(),
      'registrar interesse'
    );
    return linhaParaInteressado(linha);
  }

  // GET /interessados — exige login
  async function listarInteressados() {
    const linhas = await chamar(
      supabaseClient.from('interessados').select('*').order('criado_em', { ascending: false }),
      'listar interessados'
    );
    return linhas.map(linhaParaInteressado);
  }

  // PATCH /interessados/:id — exige login
  async function marcarAtendido(id, atendido) {
    const linha = await chamar(
      supabaseClient.from('interessados').update({ atendido }).eq('id', id).select().single(),
      'marcar atendido'
    );
    return linhaParaInteressado(linha);
  }

  // ---------- Só existia no modo demonstração; mantido para não quebrar admin.js ----------
  function restaurarDemonstracao() {
    /* não se aplica: os dados agora vêm do Supabase */
  }

  return {
    MODO_DEMO: false,
    LOGIN_DEMO: null,
    listarFilhotes,
    salvarFilhote,
    excluirFilhote,
    registrarInteresse,
    listarInteressados,
    marcarAtendido,
    entrar,
    sair,
    sessaoAtual,
    restaurarDemonstracao,
  };
})();
