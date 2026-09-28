/* ==========================================================================
   admin.js — PAINEL ADMINISTRATIVO (login, estoque e interessados)
   Depende de: api.js e comum.js
   ========================================================================== */

/* ---------- Estado do painel ---------- */
const painel = {
  filhotes: [],
  interessados: [],
  filtroInteressados: 'pendentes', // pendentes | atendidos | todos
};

const TITULOS = {
  dashboard: 'Visão geral',
  inventory: 'Filhotes / Estoque',
  inquiries: 'Interessados',
};

/* ==========================================================================
   LOGIN
   ========================================================================== */
function mostrarLogin(mensagemErro = '') {
  fecharModal('dogFormModal');
  $('#adminShell').hidden = true;
  $('#loginScreen').hidden = false;
  $('#loginError').textContent = mensagemErro;
  $('#loginPassword').value = '';

  // Dica com usuário e senha só aparece no modo demonstração
  if (Api.LOGIN_DEMO) {
    $('#demoHint').hidden = false;
    $('#demoEmail').textContent = Api.LOGIN_DEMO.email;
    $('#demoPassword').textContent = Api.LOGIN_DEMO.senha;
  }
  $('#loginEmail').focus();
}

async function entrar(evento) {
  evento.preventDefault();
  const email = $('#loginEmail').value.trim();
  const senha = $('#loginPassword').value;

  if (!email || !senha) {
    $('#loginError').textContent = 'Preencha e-mail e senha.';
    return;
  }

  const botao = $('#loginSubmit');
  botao.disabled = true;
  botao.textContent = 'Entrando…';
  $('#loginError').textContent = '';

  try {
    await Api.entrar(email, senha);
    mostrarPainel();
  } catch (erro) {
    $('#loginError').textContent = erro.message || 'Não foi possível entrar.';
    $('#loginPassword').select();
  } finally {
    botao.disabled = false;
    botao.textContent = 'Entrar';
  }
}

function sair() {
  Api.sair();
  mostrarLogin();
  avisar('Você saiu do painel', 'Até a próxima!');
}

/* ==========================================================================
   PAINEL: carregar dados e trocar de tela
   ========================================================================== */
async function mostrarPainel() {
  const sessao = Api.sessaoAtual();
  $('#loginScreen').hidden = true;
  $('#adminShell').hidden = false;
  $('#userName').textContent = sessao?.nome || 'Administrador';
  $('#userInitials').textContent = iniciais(sessao?.nome || 'Administrador');
  $('#modeText').textContent = Api.MODO_DEMO ? 'Modo demonstração · dados neste navegador' : 'Conectado ao servidor';
  $('#modePill').classList.toggle('online', !Api.MODO_DEMO);
  $('#resetDemoBtn').hidden = !Api.MODO_DEMO;
  await carregarDados();
}

async function carregarDados() {
  mostrarCarregando();
  try {
    const [filhotes, interessados] = await Promise.all([Api.listarFilhotes(), Api.listarInteressados()]);
    painel.filhotes = filhotes;
    painel.interessados = interessados;
    renderizarTudo();
  } catch (erro) {
    tratarErro(erro, 'Não foi possível carregar os dados');
  }
}

function mostrarCarregando() {
  const texto = '<p class="loading-text">Carregando…</p>';
  ['#adminStats', '#stockBars', '#recentInquiries', '#dashboardTable', '#inquiryList'].forEach((sel) => {
    $(sel).innerHTML = texto;
  });
  $('#inventoryBody').innerHTML = `<tr><td colspan="6">${texto}</td></tr>`;
}

// Erro 401 = sessão expirou → volta para o login. Outros erros → aviso.
function tratarErro(erro, titulo = 'Algo deu errado') {
  if (erro && erro.status === 401) {
    Api.sair();
    mostrarLogin(erro.message);
    return;
  }
  avisar(titulo, (erro && erro.message) || 'Tente novamente.', 'erro');
}

function trocarTela(tela) {
  $$('.admin-view').forEach((v) => v.classList.toggle('active', v.id === `view-${tela}`));
  $$('.admin-nav').forEach((botao) => {
    const ativo = botao.dataset.view === tela;
    botao.classList.toggle('active', ativo);
    if (ativo) botao.setAttribute('aria-current', 'page');
    else botao.removeAttribute('aria-current');
  });
  $('#adminTitle').textContent = TITULOS[tela];
  $('#adminBreadcrumb').textContent = `Painel / ${TITULOS[tela]}`;
  $('.admin-main').scrollTop = 0;
}

function renderizarTudo() {
  renderizarEstatisticas();
  renderizarInteressadosRecentes();
  renderizarTabelaResumo();
  renderizarEstoque();
  renderizarInteressados();
  atualizarListaDeRacas();
}

/* ==========================================================================
   VISÃO GERAL
   ========================================================================== */
function contarPorStatus() {
  const contagem = { 'Disponível': 0, 'Reservado': 0, 'Vendido': 0 };
  painel.filhotes.forEach((f) => {
    if (f.status in contagem) contagem[f.status] += 1;
  });
  return contagem;
}

function renderizarEstatisticas() {
  const c = contarPorStatus();
  const pendentes = painel.interessados.filter((i) => !i.atendido).length;
  const cards = [
    { rotulo: 'Total cadastrados', valor: painel.filhotes.length, legenda: 'registros no catálogo', icone: '□' },
    { rotulo: 'Disponíveis', valor: c['Disponível'], legenda: 'visíveis para interesse', icone: '✓' },
    { rotulo: 'Reservados', valor: c['Reservado'], legenda: 'aguardando conclusão', icone: '◌' },
    { rotulo: 'Vendidos', valor: c['Vendido'], legenda: 'histórico do estoque', icone: '↗' },
  ];

  $('#adminStats').innerHTML = cards
    .map((card) => `
      <div class="admin-stat">
        <div class="admin-stat-top"><span>${card.rotulo}</span><i class="stat-icon" aria-hidden="true">${card.icone}</i></div>
        <b>${card.valor}</b>
        <small>${card.legenda}</small>
      </div>`)
    .join('');

  const maior = Math.max(painel.filhotes.length, 1);
  $('#stockBars').innerHTML = STATUS.map((status) => `
      <div class="stock-row">
        <div class="stock-row-head"><span>${status}</span><b>${c[status]}</b></div>
        <div class="stock-track"><i style="width:${(c[status] / maior) * 100}%"></i></div>
      </div>`)
    .join('');

  // Contador de pendentes no menu lateral
  const selo = $('#navBadge');
  selo.hidden = pendentes === 0;
  selo.textContent = pendentes;
  selo.setAttribute('aria-label', `${pendentes} pendentes`);
}

function renderizarInteressadosRecentes() {
  const recentes = [...painel.interessados]
    .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm))
    .slice(0, 4);

  $('#recentInquiries').innerHTML = recentes.length
    ? recentes.map((i) => `
        <div class="activity ${i.atendido ? 'is-done' : ''}">
          <div class="activity-icon" aria-hidden="true">${escapar(iniciais(i.nome))}</div>
          <div>
            <b>${escapar(i.nome)} · ${i.filhoteNome ? `interesse em ${escapar(i.filhoteNome)}` : 'contato geral'}</b>
            <small>${escapar(tempoRelativo(i.criadoEm))}${i.atendido ? ' · atendido' : ''}</small>
          </div>
        </div>`).join('')
    : '<p class="loading-text">Nenhum contato ainda.</p>';
}

function renderizarTabelaResumo() {
  $('#dashboardTable').innerHTML = painel.filhotes.length
    ? painel.filhotes.slice(0, 5).map((f) => `
        <div class="mini-row">
          <div class="mini-dog">
            <img data-foto src="${escapar(f.foto || FOTO_PADRAO)}" alt="">
            <div><b>${escapar(f.nome)}</b><small>${escapar(f.raca)}</small></div>
          </div>
          <span>${escapar(calcularIdade(f.nascimento))}</span>
          <span>${formatarPreco(f.preco)}</span>
          <span class="status-badge ${classeStatus(f.status)}">${escapar(f.status)}</span>
        </div>`).join('')
    : '<p class="loading-text">Nenhum filhote cadastrado.</p>';
}

/* ==========================================================================
   ESTOQUE
   ========================================================================== */
function renderizarEstoque() {
  const busca = $('#adminSearch').value.trim().toLowerCase();
  const status = $('#adminStatusFilter').value;
  const lista = painel.filhotes.filter(
    (f) => (status === 'Todos' || f.status === status) && `${f.nome} ${f.raca}`.toLowerCase().includes(busca)
  );

  if (!lista.length) {
    $('#inventoryBody').innerHTML = '<tr><td colspan="6"><p class="loading-text">Nenhum filhote encontrado.</p></td></tr>';
    return;
  }

  $('#inventoryBody').innerHTML = lista
    .map((f) => `
      <tr>
        <td>
          <div class="inventory-animal">
            <img data-foto src="${escapar(f.foto || FOTO_PADRAO)}" alt="">
            <div><b>${escapar(f.nome)}</b><small>ID #${f.id}</small></div>
          </div>
        </td>
        <td>${escapar(f.raca)}</td>
        <td>${escapar(f.sexo)} · ${escapar(calcularIdade(f.nascimento))}</td>
        <td><b>${formatarPreco(f.preco)}</b></td>
        <td>
          <select class="inline-status ${classeStatus(f.status)}" data-status-id="${f.id}" aria-label="Status de ${escapar(f.nome)}">
            ${STATUS.map((s) => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-acao="editar" data-id="${f.id}" aria-label="Editar ${escapar(f.nome)}" title="Editar">✎</button>
            <button class="icon-btn danger" data-acao="excluir" data-id="${f.id}" aria-label="Excluir ${escapar(f.nome)}" title="Excluir">×</button>
          </div>
        </td>
      </tr>`)
    .join('');
}

async function mudarStatus(select) {
  const id = Number(select.dataset.statusId);
  const filhote = painel.filhotes.find((f) => f.id === id);
  if (!filhote) return;
  const novoStatus = select.value;
  select.disabled = true;

  try {
    const salvo = await Api.salvarFilhote({ ...filhote, status: novoStatus });
    painel.filhotes = painel.filhotes.map((f) => (f.id === id ? salvo : f));
    renderizarTudo();
    avisar('Status atualizado', `${salvo.nome}: ${novoStatus}`);
  } catch (erro) {
    select.value = filhote.status; // volta ao valor anterior
    select.disabled = false;
    tratarErro(erro, 'Não foi possível mudar o status');
  }
}

async function excluirFilhote(id) {
  const filhote = painel.filhotes.find((f) => f.id === id);
  if (!filhote) return;
  if (!confirm(`Excluir ${filhote.nome} do estoque? Essa ação não pode ser desfeita.`)) return;

  try {
    await Api.excluirFilhote(id);
    painel.filhotes = painel.filhotes.filter((f) => f.id !== id);
    renderizarTudo();
    avisar('Registro excluído', `${filhote.nome} foi removido.`);
  } catch (erro) {
    tratarErro(erro, 'Não foi possível excluir');
  }
}

function atualizarListaDeRacas() {
  const racas = [...new Set(painel.filhotes.map((f) => f.raca))].sort();
  $('#breedList').innerHTML = racas.map((r) => `<option value="${escapar(r)}"></option>`).join('');
}

/* ==========================================================================
   FORMULÁRIO DE CADASTRO / EDIÇÃO
   ========================================================================== */
function montarCheckboxesDeVacina() {
  $('#vaccineChecks').innerHTML =
    '<span class="check-title">Vacinas</span>' +
    VACINAS.map((v) => `<label class="check"><input type="checkbox" name="vacina" value="${escapar(v)}"> ${escapar(v)}</label>`).join('');
}

function atualizarPreviaFoto() {
  const url = $('#dogImage').value.trim();
  $('#dogImagePreview').src = url || FOTO_PADRAO;
}

function abrirFormulario(filhote = null) {
  const form = $('#dogForm');
  form.reset();
  $('#dogPrice').setCustomValidity('');
  // Data de hoje no fuso local (não dá para nascer no futuro)
  const agora = new Date();
  $('#dogBirth').max = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

  if (filhote) {
    const saude = filhote.saude || {};
    $('#formTitle').textContent = `Editar ${filhote.nome}`;
    $('#dogId').value = filhote.id;
    $('#dogName').value = filhote.nome;
    $('#dogBreed').value = filhote.raca;
    $('#dogSex').value = filhote.sexo;
    $('#dogBirth').value = filhote.nascimento || '';
    $('#dogPrice').value = formatarValorCampo(filhote.preco);
    $('#dogStatus').value = filhote.status;
    $('#dogSize').value = filhote.porte || 'Médio';
    $('#dogCoat').value = filhote.pelagem || '';
    $('#dogImage').value = filhote.foto || '';
    $('#dogDesc').value = filhote.descricao || '';
    $$('#vaccineChecks input').forEach((c) => (c.checked = (saude.vacinas || []).includes(c.value)));
    $('#dogDewormed').checked = !!saude.vermifugado;
    $('#dogChip').checked = !!saude.microchip;
    $('#dogPedigree').checked = !!saude.pedigree;
  } else {
    $('#formTitle').textContent = 'Cadastrar filhote';
    $('#dogId').value = '';
    $('#dogStatus').value = 'Disponível';
    $('#dogSize').value = 'Médio';
  }

  atualizarPreviaFoto();
  abrirModal('dogFormModal');
}

// Aceita qualquer valor: 3500, 3.500, 3.499,90, R$ 3.500... (ou vazio = "Consultar")
function validarPreco() {
  const campo = $('#dogPrice');
  const valor = lerValorEmReais(campo.value);
  campo.setCustomValidity(Number.isNaN(valor) ? 'Digite só o valor, por exemplo 3500 ou 3.499,90.' : '');
  return valor;
}

// Ao sair do campo, mostra o valor já formatado (3500 → 3.500)
function formatarCampoPreco() {
  const valor = validarPreco();
  if (valor !== null && !Number.isNaN(valor)) $('#dogPrice').value = formatarValorCampo(valor);
}

function lerFormulario() {
  const id = Number($('#dogId').value) || null;
  const filhote = {
    nome: $('#dogName').value.trim(),
    raca: $('#dogBreed').value.trim(),
    sexo: $('#dogSex').value,
    nascimento: $('#dogBirth').value,
    preco: lerValorEmReais($('#dogPrice').value), // número ou null
    status: $('#dogStatus').value,
    porte: $('#dogSize').value,
    pelagem: $('#dogCoat').value.trim(),
    foto: $('#dogImage').value.trim(),
    descricao: $('#dogDesc').value.trim(),
    saude: {
      vacinas: $$('#vaccineChecks input:checked').map((c) => c.value),
      vermifugado: $('#dogDewormed').checked,
      microchip: $('#dogChip').checked,
      pedigree: $('#dogPedigree').checked,
    },
  };
  if (id) filhote.id = id;
  return filhote;
}

async function salvarFormulario(evento) {
  evento.preventDefault();
  const form = $('#dogForm');
  validarPreco();
  // Usa a validação do próprio navegador (required, type="url"...)
  if (!form.reportValidity()) return;

  const filhote = lerFormulario();
  const botao = $('#dogSubmit');
  botao.disabled = true;
  botao.textContent = 'Salvando…';

  try {
    const salvo = await Api.salvarFilhote(filhote);
    if (filhote.id) {
      painel.filhotes = painel.filhotes.map((f) => (f.id === salvo.id ? salvo : f));
    } else {
      painel.filhotes = [salvo, ...painel.filhotes];
    }
    renderizarTudo();
    fecharModal('dogFormModal');
    avisar('Cadastro salvo', `${salvo.nome} foi ${filhote.id ? 'atualizado' : 'cadastrado'} no catálogo.`);
  } catch (erro) {
    tratarErro(erro, 'Não foi possível salvar');
  } finally {
    botao.disabled = false;
    botao.textContent = 'Salvar filhote';
  }
}

/* ==========================================================================
   INTERESSADOS
   ========================================================================== */
function linkResposta(interessado) {
  let numero = somenteDigitos(interessado.telefone);
  if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
  const primeiroNome = interessado.nome.split(' ')[0];
  const sobre = interessado.filhoteNome ? ` em ${interessado.filhoteNome}` : '';
  return linkWhatsApp(`Olá, ${primeiroNome}! Aqui é da Só Filhotes. Recebemos pelo site seu interesse${sobre}. Podemos conversar?`, numero);
}

function renderizarInteressados() {
  const filtro = painel.filtroInteressados;
  const lista = [...painel.interessados]
    .filter((i) => filtro === 'todos' || (filtro === 'pendentes' ? !i.atendido : i.atendido))
    .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

  $$('.tab').forEach((aba) => {
    const ativa = aba.dataset.filtro === filtro;
    aba.classList.toggle('active', ativa);
    aba.setAttribute('aria-pressed', ativa);
  });

  if (!lista.length) {
    const mensagens = {
      pendentes: 'Nenhum contato pendente. Tudo em dia! 🎉',
      atendidos: 'Nenhum contato marcado como atendido ainda.',
      todos: 'Nenhum contato recebido ainda.',
    };
    $('#inquiryList').innerHTML = `<p class="loading-text">${mensagens[filtro]}</p>`;
    return;
  }

  $('#inquiryList').innerHTML = lista
    .map((i) => `
      <article class="inquiry ${i.atendido ? 'is-done' : ''}">
        <div class="inquiry-avatar" aria-hidden="true">${escapar(iniciais(i.nome))}</div>
        <div class="inquiry-body">
          <h3>${escapar(i.nome)} · ${i.filhoteNome ? `interesse em ${escapar(i.filhoteNome)}` : 'contato geral'}</h3>
          <p class="inquiry-phone">${escapar(i.telefone)}</p>
          ${i.mensagem ? `<p class="inquiry-msg">“${escapar(i.mensagem)}”</p>` : ''}
          <small>${escapar(tempoRelativo(i.criadoEm))}${i.atendido ? ' · atendido' : ''}</small>
          <div class="inquiry-actions">
            <a class="whatsapp-btn small" href="${linkResposta(i)}" target="_blank" rel="noopener">Responder no WhatsApp ↗</a>
            <button class="secondary-btn small" data-atender="${i.id}" data-valor="${!i.atendido}">
              ${i.atendido ? 'Reabrir' : 'Marcar como atendido'}
            </button>
          </div>
        </div>
      </article>`)
    .join('');
}

async function alternarAtendido(botao) {
  const id = Number(botao.dataset.atender);
  const atendido = botao.dataset.valor === 'true';
  botao.disabled = true;
  try {
    const salvo = await Api.marcarAtendido(id, atendido);
    painel.interessados = painel.interessados.map((i) => (i.id === id ? salvo : i));
    renderizarTudo();
    avisar(atendido ? 'Marcado como atendido' : 'Contato reaberto', salvo.nome);
  } catch (erro) {
    botao.disabled = false;
    tratarErro(erro, 'Não foi possível atualizar');
  }
}

/* ==========================================================================
   EVENTOS
   ========================================================================== */
$('#loginForm').addEventListener('submit', entrar);
$('#fillDemo').addEventListener('click', () => {
  $('#loginEmail').value = Api.LOGIN_DEMO.email;
  $('#loginPassword').value = Api.LOGIN_DEMO.senha;
  $('#loginSubmit').focus();
});
$('#logoutBtn').addEventListener('click', sair);

$$('.admin-nav').forEach((botao) => botao.addEventListener('click', () => trocarTela(botao.dataset.view)));
$$('[data-go]').forEach((botao) => botao.addEventListener('click', () => trocarTela(botao.dataset.go)));

$('#newDogBtn').addEventListener('click', () => abrirFormulario());
$('#dogForm').addEventListener('submit', salvarFormulario);
$('#dogImage').addEventListener('input', atualizarPreviaFoto);
$('#dogPrice').addEventListener('input', validarPreco);
$('#dogPrice').addEventListener('blur', formatarCampoPreco);

$('#adminSearch').addEventListener('input', renderizarEstoque);
$('#adminStatusFilter').addEventListener('change', renderizarEstoque);

$('#inventoryBody').addEventListener('click', (evento) => {
  const botao = evento.target.closest('[data-acao]');
  if (!botao) return;
  const id = Number(botao.dataset.id);
  if (botao.dataset.acao === 'editar') abrirFormulario(painel.filhotes.find((f) => f.id === id));
  if (botao.dataset.acao === 'excluir') excluirFilhote(id);
});
$('#inventoryBody').addEventListener('change', (evento) => {
  if (evento.target.matches('[data-status-id]')) mudarStatus(evento.target);
});

$$('.tab').forEach((aba) =>
  aba.addEventListener('click', () => {
    painel.filtroInteressados = aba.dataset.filtro;
    renderizarInteressados();
  })
);
$('#inquiryList').addEventListener('click', (evento) => {
  const botao = evento.target.closest('[data-atender]');
  if (botao) alternarAtendido(botao);
});

$('#resetDemoBtn').addEventListener('click', async () => {
  if (!confirm('Restaurar os filhotes e interessados de exemplo? As alterações feitas serão perdidas.')) return;
  Api.restaurarDemonstracao();
  await carregarDados();
  avisar('Dados de exemplo restaurados', 'O estoque voltou ao estado original.');
});

/* ---------- Início ---------- */
montarCheckboxesDeVacina();
if (Api.sessaoAtual()) mostrarPainel();
else mostrarLogin();
