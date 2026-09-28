/* ==========================================================================
   paginas/contato.js — CONTATO (contato.html)
   Coloca o formulário de interesse direto na página.
   Aceita contato.html?filhote=3 para já deixar um filhote escolhido.
   ========================================================================== */

async function iniciarPaginaContato() {
  const raiz = $('#formContato');
  raiz.innerHTML = htmlFormularioInteresse('ct');

  const filhoteId = Number(new URLSearchParams(location.search).get('filhote')) || null;
  let filhotes = [];
  try {
    filhotes = await carregarCatalogo();
  } catch {
    /* sem a lista, o formulário funciona só com "Ainda não escolhi" */
  }
  prepararFormularioInteresse(raiz, filhotes, filhoteId);
}

iniciarPaginaContato();
