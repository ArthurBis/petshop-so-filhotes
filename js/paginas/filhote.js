/* ==========================================================================
   paginas/filhote.js — PÁGINA DE UM FILHOTE (filhote.html?id=3)
   O número depois de "id=" diz qual filhote mostrar.
   ========================================================================== */

const idFilhote = Number(new URLSearchParams(location.search).get('id'));

function simNao(valor) {
  return valor ? '<b class="sim">Sim</b>' : '<b class="nao">Não</b>';
}

function renderizarDetalhe(f) {
  const saude = f.saude || {};
  const vendido = f.status === 'Vendido';
  const favorito = favoritos.has(f.id);
  const vacinas = saude.vacinas && saude.vacinas.length ? saude.vacinas.map(escapar).join(', ') : 'Não informadas';
  const nascimento = f.nascimento ? new Date(`${f.nascimento}T12:00:00`).toLocaleDateString('pt-BR') : '—';

  document.title = `${f.nome} — ${f.raca} | Só Filhotes`;
  $('#migalhaNome').textContent = f.nome;

  $('#detalhe').innerHTML = `
    <div class="detail-page">
      <div class="detail-photo">
        <img data-foto src="${escapar(f.foto || FOTO_PADRAO)}" alt="Foto de ${escapar(f.nome)}, ${escapar(f.raca)}">
      </div>

      <div class="detail-info">
        <span class="status-badge ${classeStatus(f.status)}">${escapar(f.status)}</span>
        <h1>${escapar(f.nome)}</h1>
        <div class="dog-breed">${escapar(f.raca)}</div>
        <div class="detail-price">${formatarPreco(f.preco)}</div>
        <p class="detail-description">${escapar(f.descricao)}</p>

        <div class="detail-actions">
          <button class="primary-btn" data-acao="interesse" data-id="${f.id}" ${vendido ? 'disabled' : ''}>
            ${vendido ? 'Já tem um lar' : 'Tenho interesse <span aria-hidden="true">↗</span>'}
          </button>
          <button class="secondary-btn ${favorito ? 'active' : ''}" data-acao="favoritar" data-estilo="texto" data-id="${f.id}" aria-pressed="${favorito}">
            ${favorito ? '♥ Favorito' : '♡ Favoritar'}
          </button>
        </div>

        <div class="detail-facts">
          <div><small>Sexo</small><b>${escapar(f.sexo)}</b></div>
          <div><small>Idade</small><b>${escapar(calcularIdade(f.nascimento))}</b></div>
          <div><small>Nascimento</small><b>${nascimento}</b></div>
          <div><small>Porte</small><b>${escapar(f.porte)}</b></div>
          <div class="span-2"><small>Pelagem</small><b>${escapar(f.pelagem || 'Não informada')}</b></div>
        </div>

        <h2 class="detail-subtitle">Saúde e documentação</h2>
        <ul class="health-list">
          <li><span>Vacinas</span><b>${vacinas}</b></li>
          <li><span>Vermifugado</span>${simNao(saude.vermifugado)}</li>
          <li><span>Microchip</span>${simNao(saude.microchip)}</li>
          <li><span>Pedigree</span>${simNao(saude.pedigree)}</li>
        </ul>

        <div class="health-note">
          <b>Importante:</b> a carteira de vacinação e os documentos são apresentados no atendimento,
          junto com as orientações de adaptação e as condições de entrega.
        </div>
      </div>
    </div>`;
}

// Até 3 outros filhotes (primeiro os da mesma raça), sem os vendidos
function renderizarOutros(atual, filhotes) {
  const outros = ordenarPorStatus(filhotes)
    .filter((f) => f.id !== atual.id && f.status !== 'Vendido')
    .sort((a, b) => (b.raca === atual.raca) - (a.raca === atual.raca))
    .slice(0, 3);

  if (!outros.length) {
    $('#outrosSecao').classList.add('hidden');
    return;
  }
  $('#outros').innerHTML = outros.map(cardFilhote).join('');
}

function mostrarAviso(titulo, texto) {
  document.title = 'Filhote não encontrado | Só Filhotes';
  $('#migalhaNome').textContent = 'Não encontrado';
  $('#outrosSecao').classList.add('hidden');
  $('#detalhe').innerHTML = `
    <div class="empty-state">
      <div aria-hidden="true">🐾</div>
      <h1 class="empty-title">${titulo}</h1>
      <p>${texto}</p>
      <a class="primary-btn" href="filhotes.html">Ver todos os filhotes</a>
    </div>`;
}

async function iniciarPaginaFilhote() {
  $('#detalhe').innerHTML = '<p class="loading-text">Carregando…</p>';
  try {
    const filhotes = await carregarCatalogo();
    const filhote = filhotes.find((f) => f.id === idFilhote);
    if (!filhote) {
      mostrarAviso('Filhote não encontrado', 'Talvez ele já tenha ido para um novo lar ou o link esteja incompleto.');
      return;
    }
    renderizarDetalhe(filhote);
    renderizarOutros(filhote, filhotes);
  } catch (erro) {
    mostrarAviso('Não foi possível carregar', erro.message || 'Verifique sua conexão e tente novamente.');
  }
}

iniciarPaginaFilhote();
