/* ==========================================================================
   site.js — PARTES DO SITE PÚBLICO USADAS EM TODAS AS PÁGINAS
   - carregar a lista de filhotes (uma vez por página)
   - favoritos
   - card de filhote
   - formulário de interesse (janela ou dentro da página de Contato)
   - menu do celular
   Depende de: api.js e comum.js
   Cada página tem, além deste, o seu próprio arquivo em js/paginas/.
   ========================================================================== */

/* ==========================================================================
   LISTA DE FILHOTES
   ========================================================================== */
let promessaCatalogo = null;

// Busca os filhotes na Api só uma vez; as próximas chamadas reaproveitam.
function carregarCatalogo(forcar = false) {
  if (!promessaCatalogo || forcar) {
    promessaCatalogo = Api.listarFilhotes().catch((erro) => {
      promessaCatalogo = null; // permite tentar de novo
      throw erro;
    });
  }
  return promessaCatalogo;
}

// Disponíveis primeiro, depois reservados, vendidos por último
const ORDEM_STATUS = { 'Disponível': 0, 'Reservado': 1, 'Vendido': 2 };
function ordenarPorStatus(lista) {
  return [...lista].sort((a, b) => (ORDEM_STATUS[a.status] ?? 9) - (ORDEM_STATUS[b.status] ?? 9));
}

function linkFilhote(id) {
  return `filhote.html?id=${id}`;
}

/* ==========================================================================
   FAVORITOS (ficam só no navegador do visitante — não precisam de back-end)
   ========================================================================== */
const CHAVE_FAVORITOS = 'soFilhotes:favoritos';
const favoritos = new Set(lerFavoritos());

function lerFavoritos() {
  try {
    const salvos = JSON.parse(localStorage.getItem(CHAVE_FAVORITOS));
    return Array.isArray(salvos) ? salvos : [];
  } catch {
    return [];
  }
}

function salvarFavoritos() {
  try {
    localStorage.setItem(CHAVE_FAVORITOS, JSON.stringify([...favoritos]));
  } catch {
    /* navegador sem armazenamento: favoritos valem só nesta visita */
  }
}

function alternarFavorito(id) {
  if (favoritos.has(id)) favoritos.delete(id);
  else favoritos.add(id);
  salvarFavoritos();
  atualizarBotoesFavorito();
  // Avisa a página (o catálogo usa isso para o filtro "Favoritos")
  document.dispatchEvent(new CustomEvent('favoritos-mudaram'));
}

// Atualiza todos os botões ♡ e contadores da página
function atualizarBotoesFavorito() {
  $$('[data-acao="favoritar"]').forEach((botao) => {
    const favorito = favoritos.has(Number(botao.dataset.id));
    botao.classList.toggle('active', favorito);
    botao.setAttribute('aria-pressed', favorito);
    if (botao.dataset.estilo === 'texto') {
      botao.textContent = favorito ? '♥ Favorito' : '♡ Favoritar';
    } else {
      botao.textContent = favorito ? '♥' : '♡';
      botao.setAttribute('aria-label', `${favorito ? 'Remover' : 'Adicionar'} ${botao.dataset.nome} ${favorito ? 'dos' : 'aos'} favoritos`);
    }
  });
  $$('[data-fav-count]').forEach((el) => (el.textContent = favoritos.size));
}

/* ==========================================================================
   CARD DE FILHOTE (usado no Início, em Filhotes e em "Outros filhotes")
   ========================================================================== */
function etiquetasSaude(saude = {}) {
  const itens = [];
  if (saude.vacinas && saude.vacinas.length) itens.push('Vacinado');
  if (saude.vermifugado) itens.push('Vermifugado');
  if (saude.microchip) itens.push('Microchip');
  if (saude.pedigree) itens.push('Pedigree');
  return itens;
}

function cardFilhote(f) {
  const favorito = favoritos.has(f.id);
  const vendido = f.status === 'Vendido';
  const saude = etiquetasSaude(f.saude);
  const link = linkFilhote(f.id);

  return `
    <article class="dog-card ${vendido ? 'is-sold' : ''}">
      <div class="dog-photo">
        <a href="${link}" tabindex="-1" aria-hidden="true">
          <img data-foto src="${escapar(f.foto || FOTO_PADRAO)}" alt="" loading="lazy">
        </a>
        <span class="dog-status ${classeStatus(f.status)}">${escapar(f.status)}</span>
        <button class="favorite-btn ${favorito ? 'active' : ''}" data-acao="favoritar" data-id="${f.id}" data-nome="${escapar(f.nome)}"
                aria-pressed="${favorito}" aria-label="${favorito ? 'Remover' : 'Adicionar'} ${escapar(f.nome)} ${favorito ? 'dos' : 'aos'} favoritos">
          ${favorito ? '♥' : '♡'}
        </button>
      </div>
      <div class="dog-content">
        <div class="dog-head">
          <div>
            <h3><a href="${link}">${escapar(f.nome)}</a></h3>
            <div class="dog-breed">${escapar(f.raca)}</div>
          </div>
          <b class="dog-price">${formatarPreco(f.preco)}</b>
        </div>
        <div class="dog-meta">
          <span>${escapar(f.sexo)}</span>
          <span>${escapar(calcularIdade(f.nascimento))}</span>
          <span>${escapar(f.porte)}</span>
        </div>
        ${saude.length ? `<div class="dog-health">${saude.map((s) => `<span>✓ ${s}</span>`).join('')}</div>` : ''}
        <p class="dog-desc">${escapar(f.descricao)}</p>
        <div class="dog-card-actions">
          <a class="detail-btn" href="${link}">Ver detalhes<span class="sr-only"> de ${escapar(f.nome)}</span></a>
          <button class="whatsapp-btn" data-acao="interesse" data-id="${f.id}" ${vendido ? 'disabled' : ''}>
            ${vendido ? 'Já tem um lar' : 'Tenho interesse'}
          </button>
        </div>
      </div>
    </article>`;
}

// Cards "fantasma" enquanto a lista carrega
function cardsCarregando(quantidade = 3) {
  return Array.from({ length: quantidade }, () => `
    <div class="dog-card skeleton" aria-hidden="true">
      <div class="dog-photo"></div>
      <div class="dog-content"><i></i><i></i><i class="curto"></i></div>
    </div>`).join('');
}

/* ==========================================================================
   FORMULÁRIO DE INTERESSE
   O mesmo formulário aparece:
   • numa janela (modal) quando a pessoa clica em "Tenho interesse";
   • dentro da página de Contato.
   `p` é um prefixo para os ids não se repetirem.
   ========================================================================== */
function htmlFormularioInteresse(p, { modal = false } = {}) {
  return `
    <div class="interest-step-form">
      ${modal ? `
        <div class="form-header">
          <span class="soft-label">Atendimento pelo WhatsApp</span>
          <h2 id="${p}Titulo">Fale com a equipe</h2>
          <p>Deixe seu contato e o WhatsApp abre com a mensagem pronta.</p>
        </div>` : ''}
      <form class="interest-form" novalidate>
        <div class="form-grid">
          <label class="span-2">
            <span>Seu nome</span>
            <input id="${p}Nome" name="nome" autocomplete="name" required maxlength="80" placeholder="Ex.: Mariana Alves" aria-describedby="${p}NomeErro" />
            <small class="field-error" id="${p}NomeErro"></small>
          </label>
          <label>
            <span>WhatsApp / telefone</span>
            <input id="${p}Telefone" name="telefone" type="tel" inputmode="tel" autocomplete="tel" required placeholder="(16) 99999-9999" aria-describedby="${p}TelefoneErro" />
            <small class="field-error" id="${p}TelefoneErro"></small>
          </label>
          <label>
            <span>Filhote</span>
            <select id="${p}Filhote" name="filhote"><option value="">Ainda não escolhi</option></select>
          </label>
          <label class="span-2">
            <span>Mensagem <em>(opcional)</em></span>
            <textarea id="${p}Mensagem" name="mensagem" rows="3" maxlength="500" placeholder="Conte um pouco sobre sua rotina, casa, crianças, outros pets..."></textarea>
          </label>
        </div>
        <div class="form-actions">
          ${modal ? '<button type="button" class="secondary-btn" data-close="interestModal">Cancelar</button>' : ''}
          <button class="primary-btn" type="submit">Enviar e abrir WhatsApp <span aria-hidden="true">↗</span></button>
        </div>
      </form>
    </div>

    <div class="interest-done hidden" tabindex="-1">
      <div class="done-icon" aria-hidden="true">✓</div>
      <h2 class="done-title">Recebemos seu interesse!</h2>
      <p class="done-text">Nossa equipe vai falar com você em breve.</p>
      <div class="form-actions centered">
        ${modal
          ? '<button type="button" class="secondary-btn" data-close="interestModal">Voltar ao site</button>'
          : '<button type="button" class="secondary-btn" data-acao="novo-interesse">Enviar outra mensagem</button>'}
        <a class="primary-btn whatsapp-link" href="#" target="_blank" rel="noopener">Abrir WhatsApp <span aria-hidden="true">↗</span></a>
      </div>
    </div>`;
}

// Cria a janela de interesse na primeira vez que for usada
function garantirModalInteresse() {
  if ($('#interestModal')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-backdrop" id="interestModal" aria-hidden="true">
      <div class="modal form-modal interest-modal" role="dialog" aria-modal="true" aria-labelledby="miTitulo" data-interesse>
        <button class="modal-close" data-close="interestModal" aria-label="Fechar">×</button>
        ${htmlFormularioInteresse('mi', { modal: true })}
      </div>
    </div>`);
}

// Deixa o formulário limpo, com a lista de filhotes e o escolhido marcado
function prepararFormularioInteresse(raiz, filhotes, filhoteId = null) {
  const form = $('.interest-form', raiz);
  form.reset();
  limparErros(raiz);

  const opcoes = ordenarPorStatus(filhotes).filter((f) => f.status !== 'Vendido');
  $('select[name="filhote"]', raiz).innerHTML =
    '<option value="">Ainda não escolhi</option>' +
    opcoes.map((f) => `<option value="${f.id}">${escapar(f.nome)} — ${escapar(f.raca)}</option>`).join('');
  $('select[name="filhote"]', raiz).value = opcoes.some((f) => f.id === filhoteId) ? String(filhoteId) : '';

  $('.interest-step-form', raiz).classList.remove('hidden');
  $('.interest-done', raiz).classList.add('hidden');
}

async function abrirInteresse(filhoteId = null) {
  garantirModalInteresse();
  const raiz = $('#interestModal [data-interesse]');
  let filhotes = [];
  try {
    filhotes = await carregarCatalogo();
  } catch {
    /* sem a lista, o formulário funciona só com "Ainda não escolhi" */
  }
  const filhote = filhotes.find((f) => f.id === filhoteId);
  $('#miTitulo').textContent = filhote ? `Interesse em ${filhote.nome}` : 'Fale com a equipe';
  prepararFormularioInteresse(raiz, filhotes, filhoteId);
  abrirModal('interestModal');
}

function limparErros(raiz) {
  $$('.field-error', raiz).forEach((el) => (el.textContent = ''));
  $$('[aria-invalid]', raiz).forEach((el) => el.removeAttribute('aria-invalid'));
}

function marcarErro(campo, mensagem) {
  campo.setAttribute('aria-invalid', 'true');
  $(`#${campo.id}Erro`).textContent = mensagem;
}

function montarMensagemWhatsApp(nome, filhote, mensagem) {
  let texto = filhote
    ? `Olá! Meu nome é ${nome}. Vi ${filhote.nome}, da raça ${filhote.raca}, no site da Só Filhotes e gostaria de saber mais informações.`
    : `Olá! Meu nome é ${nome}. Encontrei a Só Filhotes pelo site e gostaria de conhecer os filhotes disponíveis.`;
  if (mensagem) texto += `\n\n${mensagem}`;
  return texto;
}

async function enviarInteresse(form) {
  const raiz = form.closest('[data-interesse]');
  limparErros(raiz);

  const campoNome = form.elements.nome;
  const campoTelefone = form.elements.telefone;
  const nome = campoNome.value.trim();
  const telefone = campoTelefone.value.trim();
  const mensagem = form.elements.mensagem.value.trim();
  const filhoteId = Number(form.elements.filhote.value) || null;

  // Validação
  let valido = true;
  if (nome.length < 2) {
    marcarErro(campoNome, 'Informe seu nome.');
    valido = false;
  }
  if (!telefoneValido(telefone)) {
    marcarErro(campoTelefone, 'Informe um telefone com DDD, ex.: (16) 99999-9999.');
    valido = false;
  }
  if (!valido) {
    $('[aria-invalid="true"]', form).focus();
    return;
  }

  const botao = $('button[type="submit"]', form);
  botao.disabled = true;
  botao.textContent = 'Enviando…';

  const filhotes = await carregarCatalogo().catch(() => []);
  const filhote = filhotes.find((f) => f.id === filhoteId) || null;
  const link = linkWhatsApp(montarMensagemWhatsApp(nome, filhote, mensagem));
  $('.whatsapp-link', raiz).href = link;

  try {
    await Api.registrarInteresse({ nome, telefone: mascararTelefone(telefone), filhoteId, mensagem });

    // Tenta abrir o WhatsApp numa nova aba. Se o navegador bloquear,
    // a pessoa ainda tem o botão "Abrir WhatsApp" na confirmação.
    const janela = window.open(link, '_blank');
    if (janela) janela.opener = null;

    $('.done-title', raiz).textContent = 'Recebemos seu interesse!';
    $('.done-text', raiz).textContent = janela
      ? 'O WhatsApp foi aberto em outra aba com a mensagem pronta. Se não abriu, use o botão abaixo.'
      : 'Toque no botão abaixo para continuar a conversa no WhatsApp.';
  } catch {
    $('.done-title', raiz).textContent = 'Não conseguimos registrar agora';
    $('.done-text', raiz).textContent = 'Mas você pode falar direto com a nossa equipe pelo WhatsApp.';
  } finally {
    botao.disabled = false;
    botao.innerHTML = 'Enviar e abrir WhatsApp <span aria-hidden="true">↗</span>';
  }

  $('.interest-step-form', raiz).classList.add('hidden');
  $('.interest-done', raiz).classList.remove('hidden');
  $('.interest-done', raiz).focus();
}

/* ==========================================================================
   MENU DO CELULAR
   ========================================================================== */
function alternarMenu(abrir) {
  const botao = $('#menuBtn');
  const menu = $('#mobileNav');
  if (!botao || !menu) return;
  menu.classList.toggle('open', abrir);
  botao.setAttribute('aria-expanded', abrir);
  botao.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
  botao.textContent = abrir ? '✕' : '☰';
}

/* ==========================================================================
   EVENTOS (valem para todas as páginas)
   ========================================================================== */
document.addEventListener('click', (evento) => {
  if (evento.target.closest('#menuBtn')) {
    alternarMenu(!$('#mobileNav').classList.contains('open'));
    return;
  }

  if (evento.target.closest('[data-contato-geral]')) {
    abrirInteresse(null);
    return;
  }

  const alvo = evento.target.closest('[data-acao]');
  if (!alvo) return;
  const id = Number(alvo.dataset.id);

  if (alvo.dataset.acao === 'favoritar') alternarFavorito(id);
  if (alvo.dataset.acao === 'interesse') abrirInteresse(id);
  if (alvo.dataset.acao === 'novo-interesse') {
    const raiz = alvo.closest('[data-interesse]');
    carregarCatalogo()
      .catch(() => [])
      .then((filhotes) => {
        prepararFormularioInteresse(raiz, filhotes);
        $('input[name="nome"]', raiz).focus();
      });
  }
});

document.addEventListener('submit', (evento) => {
  if (!evento.target.matches('.interest-form')) return;
  evento.preventDefault();
  enviarInteresse(evento.target);
});

// Máscara do telefone enquanto digita
document.addEventListener('input', (evento) => {
  if (evento.target.matches('.interest-form input[name="telefone"]')) {
    evento.target.value = mascararTelefone(evento.target.value);
  }
});

// Fecha o menu do celular ao escolher um link
$$('#mobileNav a').forEach((link) => link.addEventListener('click', () => alternarMenu(false)));

atualizarBotoesFavorito();
