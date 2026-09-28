/* ==========================================================================
   comum.js — FUNÇÕES USADAS PELO SITE E PELO PAINEL
   ========================================================================== */

// WhatsApp da loja: 55 (Brasil) + DDD + número, só dígitos.
const WHATSAPP_LOJA = '5516991667491';
const WHATSAPP_LOJA_FORMATADO = '(16) 99166-7491';

// Imagem usada quando o filhote não tem foto ou a foto não carrega.
const FOTO_PADRAO = 'assets/sem-foto.svg';

// Opções fixas usadas nos formulários e filtros
const STATUS = ['Disponível', 'Reservado', 'Vendido'];
const VACINAS = ['V8/V10', 'Antirrábica', 'Gripe canina', 'Giárdia'];

/* ---------- Atalhos para selecionar elementos ---------- */
const $ = (seletor, raiz = document) => raiz.querySelector(seletor);
const $$ = (seletor, raiz = document) => [...raiz.querySelectorAll(seletor)];

/* ---------- Segurança: escapa texto antes de colocar no HTML ---------- */
function escapar(valor = '') {
  const trocas = { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' };
  return String(valor ?? '').replace(/[&<>'"]/g, (c) => trocas[c]);
}

/* ---------- Formatação ---------- */
// 3500 → "R$ 3.500" · 3499.9 → "R$ 3.499,90" · null → "Consultar"
function formatarPreco(valor) {
  if (valor === null || valor === undefined || valor === '') return 'Consultar';
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return 'Consultar';
  const temCentavos = !Number.isInteger(numero);
  return numero.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: temCentavos ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

// Lê o valor digitado no campo de preço do jeito que a pessoa escrever:
// "3500", "3.500", "3500,90", "3.499,90", "R$ 3.500" ou "3500.90".
// Retorna um número, null se o campo estiver vazio, ou NaN se for inválido.
function lerValorEmReais(texto) {
  let t = String(texto ?? '').replace(/[^\d.,]/g, '');
  if (!t) return null;
  if (t.includes(',')) {
    // padrão brasileiro: ponto separa milhar, vírgula separa centavos
    t = t.replace(/\./g, '');
    if ((t.match(/,/g) || []).length > 1) return NaN;
    t = t.replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(t)) {
    // só pontos em grupos de 3 dígitos ("3.500", "12.000"): são de milhar
    t = t.replace(/\./g, '');
  }
  const numero = Number(t);
  return Number.isFinite(numero) ? Math.round(numero * 100) / 100 : NaN;
}

// Número → texto para o campo de edição: 3500 → "3.500" · 3499.9 → "3.499,90"
function formatarValorCampo(valor) {
  if (valor === null || valor === undefined || valor === '') return '';
  const numero = Number(valor);
  return numero.toLocaleString('pt-BR', {
    minimumFractionDigits: Number.isInteger(numero) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

// "2026-01-20" → "8 meses", "1 ano e 2 meses"...
function calcularIdade(nascimento) {
  if (!nascimento) return 'Idade não informada';
  const [ano, mes, dia] = nascimento.split('-').map(Number);
  const hoje = new Date();
  let meses = (hoje.getFullYear() - ano) * 12 + (hoje.getMonth() + 1 - mes);
  if (hoje.getDate() < dia) meses -= 1;

  if (meses < 1) {
    const dias = Math.max(0, Math.floor((hoje - new Date(ano, mes - 1, dia)) / 86400000));
    const semanas = Math.floor(dias / 7);
    return semanas <= 1 ? 'Recém-nascido' : `${semanas} semanas`;
  }
  if (meses < 12) return meses === 1 ? '1 mês' : `${meses} meses`;

  const anos = Math.floor(meses / 12);
  const resto = meses % 12;
  const textoAnos = anos === 1 ? '1 ano' : `${anos} anos`;
  if (!resto) return textoAnos;
  return `${textoAnos} e ${resto === 1 ? '1 mês' : `${resto} meses`}`;
}

// Data ISO → "há 5 min", "há 2 h", "ontem às 18:47", "12/09 às 10:15"
function tempoRelativo(dataIso) {
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return '';
  const minutos = Math.floor((Date.now() - data.getTime()) / 60000);
  const hora = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (minutos < 1) return 'agora há pouco';
  if (minutos < 60) return `há ${minutos} min`;

  const hoje = new Date();
  const ontem = new Date();
  ontem.setDate(hoje.getDate() - 1);
  if (data.toDateString() === hoje.toDateString()) return `hoje às ${hora}`;
  if (data.toDateString() === ontem.toDateString()) return `ontem às ${hora}`;
  return `${data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${hora}`;
}

// "Disponível" → "disponivel" (usado como classe CSS)
function classeStatus(status = '') {
  return status.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function iniciais(nome = '') {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (!partes.length) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase(); // "Administrador" → "AD"
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase(); // "Mariana Alves" → "MA"
}

/* ---------- Telefone ---------- */
function somenteDigitos(texto = '') {
  return String(texto).replace(/\D/g, '');
}

// Formata enquanto a pessoa digita: (16) 99166-7491
function mascararTelefone(texto) {
  const d = somenteDigitos(texto).slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : '';
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function telefoneValido(texto) {
  const d = somenteDigitos(texto);
  return d.length === 10 || d.length === 11;
}

/* ---------- WhatsApp ---------- */
// numero: só dígitos, com 55 na frente
function linkWhatsApp(mensagem, numero = WHATSAPP_LOJA) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

/* ---------- Foto padrão quando a imagem falha ---------- */
// Vale para qualquer <img data-foto>. O evento "error" não sobe na árvore,
// por isso é escutado na fase de captura (terceiro argumento = true).
document.addEventListener(
  'error',
  (evento) => {
    const img = evento.target;
    if (img.tagName === 'IMG' && img.hasAttribute('data-foto') && !img.src.endsWith(FOTO_PADRAO)) {
      img.src = FOTO_PADRAO;
    }
  },
  true
);

/* ---------- Aviso rápido (toast) ---------- */
let temporizadorAviso;
function avisar(titulo, texto = '', tipo = 'sucesso') {
  const aviso = $('#toast');
  if (!aviso) return;
  $('#toastTitle').textContent = titulo;
  $('#toastText').textContent = texto;
  $('#toastIcon').textContent = tipo === 'erro' ? '!' : '✓';
  aviso.classList.toggle('erro', tipo === 'erro');
  aviso.classList.add('show');
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => aviso.classList.remove('show'), 3200);
}

/* ---------- Modais ---------- */
// Guarda qual elemento tinha o foco antes de abrir, para devolver depois.
let focoAntesDoModal = null;

function abrirModal(id) {
  const fundo = document.getElementById(id);
  if (!fundo) return;
  focoAntesDoModal = document.activeElement;
  fundo.classList.add('open');
  fundo.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-aberto');
  // Coloca o foco no primeiro campo (ou no botão fechar)
  const primeiro = $('input:not([type=hidden]), select, textarea, button:not(.modal-close)', fundo) || $('.modal-close', fundo);
  setTimeout(() => primeiro && primeiro.focus(), 60);
}

function fecharModal(id) {
  const fundo = document.getElementById(id);
  if (!fundo || !fundo.classList.contains('open')) return;
  fundo.classList.remove('open');
  fundo.setAttribute('aria-hidden', 'true');
  if (!$('.modal-backdrop.open')) document.body.classList.remove('modal-aberto');
  if (focoAntesDoModal && document.contains(focoAntesDoModal)) focoAntesDoModal.focus();
}

// Botões com data-close="idDoModal", clique fora do modal e tecla Esc
document.addEventListener('click', (evento) => {
  const botaoFechar = evento.target.closest('[data-close]');
  if (botaoFechar) fecharModal(botaoFechar.dataset.close);
  if (evento.target.classList.contains('modal-backdrop')) fecharModal(evento.target.id);
});

document.addEventListener('keydown', (evento) => {
  const aberto = $$('.modal-backdrop.open').pop();
  if (!aberto) return;

  if (evento.key === 'Escape') {
    fecharModal(aberto.id);
    return;
  }

  // Mantém o Tab dentro do modal aberto
  if (evento.key === 'Tab') {
    const focaveis = $$('a[href], button:not([disabled]), input:not([type=hidden]), select, textarea', aberto).filter(
      (el) => el.offsetParent !== null
    );
    if (!focaveis.length) return;
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (evento.shiftKey && document.activeElement === primeiro) {
      ultimo.focus();
      evento.preventDefault();
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      primeiro.focus();
      evento.preventDefault();
    }
  }
});
