/* ==========================================================================
   paginas/filhotes.js — CATÁLOGO (filhotes.html)
   Busca, filtro por raça, por sexo e botão "Favoritos".
   ========================================================================== */

const catalogo = {
  filhotes: [],
  raca: 'Todos',
  soFavoritos: false,
};

async function carregarPaginaFilhotes(forcar = false) {
  $('#dogGrid').innerHTML = cardsCarregando(6);
  $('#dogGrid').setAttribute('aria-busy', 'true');
  $('#errorState').classList.add('hidden');
  $('#emptyState').classList.add('hidden');

  try {
    catalogo.filhotes = await carregarCatalogo(forcar);
    renderizarFiltros();
    renderizarCatalogo();
  } catch (erro) {
    $('#dogGrid').innerHTML = '';
    $('#errorText').textContent = erro.message || 'Verifique sua conexão e tente novamente.';
    $('#errorState').classList.remove('hidden');
  } finally {
    $('#dogGrid').setAttribute('aria-busy', 'false');
  }
}

function renderizarFiltros() {
  const racas = ['Todos', ...new Set(catalogo.filhotes.map((f) => f.raca))];
  if (!racas.includes(catalogo.raca)) catalogo.raca = 'Todos';

  $('#breedFilters').innerHTML = racas
    .map((raca) => `
      <button class="filter-chip ${catalogo.raca === raca ? 'active' : ''}"
              data-raca="${escapar(raca)}" aria-pressed="${catalogo.raca === raca}">
        ${escapar(raca)}
      </button>`)
    .join('');
}

function filhotesFiltrados() {
  const busca = $('#searchInput').value.trim().toLowerCase();
  const sexo = $('#sexFilter').value;

  return ordenarPorStatus(catalogo.filhotes)
    .filter((f) => catalogo.raca === 'Todos' || f.raca === catalogo.raca)
    .filter((f) => sexo === 'Todos' || f.sexo === sexo)
    .filter((f) => !catalogo.soFavoritos || favoritos.has(f.id))
    .filter((f) => `${f.nome} ${f.raca}`.toLowerCase().includes(busca));
}

function renderizarCatalogo() {
  const lista = filhotesFiltrados();
  $('#availableCountPublic').textContent = catalogo.filhotes.filter((f) => f.status === 'Disponível').length;
  $('#favToggle').classList.toggle('active', catalogo.soFavoritos);
  $('#favToggle').setAttribute('aria-pressed', catalogo.soFavoritos);
  $('#dogGrid').innerHTML = lista.map(cardFilhote).join('');

  const vazio = lista.length === 0;
  $('#emptyState').classList.toggle('hidden', !vazio);
  if (vazio && catalogo.soFavoritos && favoritos.size === 0) {
    $('#emptyTitle').textContent = 'Você ainda não tem favoritos';
    $('#emptyText').textContent = 'Toque no ♡ da foto de um filhote para guardá-lo aqui.';
  } else {
    $('#emptyTitle').textContent = 'Nenhum filhote encontrado';
    $('#emptyText').textContent = 'Tente alterar os filtros da busca.';
  }
}

function limparFiltros() {
  catalogo.raca = 'Todos';
  catalogo.soFavoritos = false;
  $('#searchInput').value = '';
  $('#sexFilter').value = 'Todos';
  renderizarFiltros();
  renderizarCatalogo();
}

/* ---------- Eventos ---------- */
$('#breedFilters').addEventListener('click', (evento) => {
  const chip = evento.target.closest('[data-raca]');
  if (!chip) return;
  catalogo.raca = chip.dataset.raca;
  renderizarFiltros();
  renderizarCatalogo();
});

$('#favToggle').addEventListener('click', () => {
  catalogo.soFavoritos = !catalogo.soFavoritos;
  renderizarCatalogo();
});

// Quando um favorito muda e o filtro "Favoritos" está ligado, a lista precisa mudar
document.addEventListener('favoritos-mudaram', () => {
  if (catalogo.soFavoritos) renderizarCatalogo();
});

$('#searchInput').addEventListener('input', renderizarCatalogo);
$('#sexFilter').addEventListener('change', renderizarCatalogo);
$('#clearFilters').addEventListener('click', limparFiltros);
$('#retryLoad').addEventListener('click', () => carregarPaginaFilhotes(true));

carregarPaginaFilhotes();
