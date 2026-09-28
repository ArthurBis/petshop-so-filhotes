/* ==========================================================================
   paginas/inicio.js — PÁGINA INICIAL (index.html)
   Mostra 3 filhotes em destaque e quantos estão disponíveis.
   ========================================================================== */

async function iniciarPaginaInicial() {
  const grade = $('#destaques');
  grade.innerHTML = cardsCarregando(3);
  grade.setAttribute('aria-busy', 'true');

  try {
    const filhotes = await carregarCatalogo();
    const disponiveis = filhotes.filter((f) => f.status === 'Disponível').length;
    $('#heroDisponiveis').textContent = disponiveis === 1 ? '1 disponível agora' : `${disponiveis} disponíveis agora`;

    // Destaques: até 3 filhotes que ainda não foram vendidos
    const destaques = ordenarPorStatus(filhotes)
      .filter((f) => f.status !== 'Vendido')
      .slice(0, 3);

    grade.innerHTML = destaques.length
      ? destaques.map(cardFilhote).join('')
      : '<p class="empty-inline">Novos filhotes em breve. Fale com a equipe para entrar na lista de espera.</p>';
  } catch {
    grade.innerHTML = '<p class="empty-inline">Não foi possível carregar os filhotes agora. <a href="filhotes.html">Tentar de novo</a></p>';
  } finally {
    grade.setAttribute('aria-busy', 'false');
  }
}

iniciarPaginaInicial();
