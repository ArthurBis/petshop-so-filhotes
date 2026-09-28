# Só Filhotes 🐾

Site e painel administrativo da **Só Filhotes**, loja de filhotes há 29 anos no Shopping Santa Úrsula, em Ribeirão Preto. O projeto foi feito como trabalho do semestre.

---

## ⚡ Resumo rápido (leia primeiro)

**O que o site faz**

- Mostra os filhotes da loja, com foto, raça, idade, preço, vacinas e documentação.
- O cliente pode filtrar, buscar e marcar favoritos.
- Quando o cliente se interessa, ele deixa **nome e telefone**. O contato fica salvo para a equipe e o **WhatsApp da loja abre com a mensagem pronta**.
- A equipe entra no **painel** (com login) para cadastrar filhotes, mudar o status (Disponível / Reservado / Vendido) e responder os interessados.

**As páginas**

| Página | Para que serve | Código da página |
|---|---|---|
| `index.html` | Início: apresentação da loja e 3 filhotes em destaque | `js/paginas/inicio.js` |
| `filhotes.html` | Catálogo completo com busca, filtros e favoritos | `js/paginas/filhotes.js` |
| `filhote.html?id=3` | Página de um filhote (o número muda para cada filhote) | `js/paginas/filhote.js` |
| `sobre.html` | Sobre a loja: diferenciais e como funciona | — |
| `contato.html` | WhatsApp, horário e formulário de contato | `js/paginas/contato.js` |
| `admin.html` | Painel da equipe (login, estoque e interessados) | `js/admin.js` |

**Como os dados andam**

```
páginas (site e painel)  →  js/api.js  →  hoje: salva no próprio navegador (modo demonstração)
                                        →  depois: chama o servidor do back-end
```

Todas as páginas pedem os dados ao arquivo `js/api.js`. Quando o back-end ficar pronto, **só esse arquivo muda** (e só uma linha dele).

---

## ✅ Próximos passos do back-end

1. **Escolher a tecnologia** que a turma usa (ex.: Node + Express com MySQL ou SQLite).
2. **Criar as tabelas**:
   - `filhotes`: os campos do objeto **Filhote** (lá embaixo)
   - `interessados`: os campos do objeto **Interessado**
   - `usuarios`: e-mail e senha da equipe (guardar a senha com hash, nunca em texto puro)
3. **Colocar os dados iniciais**. Os 6 filhotes de exemplo estão em `js/api.js`, na lista `FILHOTES_EXEMPLO`.
4. **Fazer as 8 rotas** da tabela [Rotas esperadas](#rotas-esperadas), respondendo em JSON no mesmo formato dos exemplos.
5. **Login**: `POST /login` confere a senha e devolve um `token`. As rotas marcadas com "sim" precisam recusar pedidos sem token válido, respondendo **401**.
6. **Liberar CORS**, porque o site e o servidor rodam em endereços diferentes.
7. **Ligar o front**: preencher `API_URL` no começo de `js/api.js` com o endereço do servidor (ex.: `http://localhost:3000`) e testar o site e o painel. Tudo deve funcionar igual ao modo demonstração.
8. **Publicar** o servidor (ex.: Render ou Railway) e trocar o `API_URL` pelo endereço público.

> Hoje o painel recebe **o link** da foto. Se quiserem enviar o arquivo da foto, vai precisar de uma rota nova de upload. Combinem juntos o formato.

---

## Como rodar

Não precisa instalar nada.

1. Baixe ou clone o repositório.
2. Abra o arquivo **`index.html`** no navegador (dá dois cliques nele).
   - Se preferir, use a extensão **Live Server** do VS Code.
3. Para entrar no painel, clique em **"Acesso administrativo"** no rodapé ou abra **`admin.html`**.

**Login de demonstração**

| E-mail | Senha |
|---|---|
| `admin@sofilhotes.com` | `admin123` |

> Enquanto o back-end não estiver ligado, os dados ficam salvos **no próprio navegador**. Para voltar aos dados originais, use o botão **"Restaurar dados de exemplo"** na tela de estoque do painel.

---

## Funcionalidades

### Site
- Menu com a página atual marcada; em celular vira um menu que abre e fecha
- Catálogo com busca, filtro por raça e sexo, e favoritos (guardados no navegador de cada visitante)
- Página própria para cada filhote, com "Outros filhotes" no final
- Idade calculada pela data de nascimento; preço em reais (ou "Consultar", se não tiver preço)
- Formulário de interesse que registra o contato e abre o WhatsApp da loja: **(16) 99166-7491**
- Acessibilidade: contraste adequado, navegação por teclado, janelas fecham com `Esc`

### Painel
- Login e botão Sair
- Visão geral com totais, gráfico do estoque e interessados recentes
- Estoque: cadastrar, editar, excluir e mudar status
- Campo de preço aceita `3500`, `3.500` ou `3.499,90`; em branco, aparece "Consultar"
- Interessados: **Responder no WhatsApp** e **Marcar como atendido**

---

## Estrutura de pastas

```
├── index.html          → início
├── filhotes.html       → catálogo
├── filhote.html        → página de um filhote (filhote.html?id=1)
├── sobre.html          → sobre a loja
├── contato.html        → contato
├── admin.html          → painel da equipe
├── css/
│   ├── base.css        → cores, fontes, botões, formulários (todas as páginas)
│   ├── site.css        → estilos do site
│   └── admin.css       → estilos do painel
├── js/
│   ├── api.js          → TODA a comunicação com os dados (demonstração ou servidor)
│   ├── comum.js        → funções usadas no site e no painel (preço, idade, WhatsApp, janelas…)
│   ├── site.js         → partes do site usadas em todas as páginas (card, favoritos, formulário, menu)
│   ├── admin.js        → painel
│   └── paginas/        → o código específico de cada página do site
└── assets/
    ├── logo.png, favicon.png
    ├── sem-foto.svg            → imagem de "Foto em breve"
    └── logo-so-filhotes.png    → logo original em alta resolução
```

> O cabeçalho e o rodapé se repetem em todas as páginas `.html`. Se mudar um link do menu, mude em todas.

---

## Divisão do trabalho

| Parte | Responsável |
|---|---|
| Front-end (este repositório) | Lorenzo ([@loorenzofe](https://github.com/loorenzofe)) |
| Back-end (API e banco de dados) | _nome do colega_ |

---

## Contrato com o back-end

O front nunca acessa os dados diretamente: tudo passa por **`js/api.js`**.

```js
// js/api.js — deixe vazio para o modo demonstração
const API_URL = 'http://localhost:3000';
```

### Rotas esperadas

| Método | Rota | Precisa de login? | Corpo enviado | Resposta |
|---|---|---|---|---|
| `GET` | `/filhotes` | não | — | lista de **Filhote** |
| `POST` | `/filhotes` | sim | **Filhote** sem `id` | **Filhote** criado (com `id`) |
| `PUT` | `/filhotes/:id` | sim | **Filhote** completo | **Filhote** atualizado |
| `DELETE` | `/filhotes/:id` | sim | — | `204` (sem corpo) |
| `POST` | `/interessados` | não | `{ nome, telefone, filhoteId, mensagem }` | **Interessado** criado |
| `GET` | `/interessados` | sim | — | lista de **Interessado** |
| `PATCH` | `/interessados/:id` | sim | `{ atendido: true }` | **Interessado** atualizado |
| `POST` | `/login` | não | `{ email, senha }` | `{ token, nome }` |

### Filhote

```json
{
  "id": 1,
  "nome": "Thor",
  "raca": "Spitz Alemão",
  "sexo": "Macho",
  "nascimento": "2026-01-20",
  "preco": 3500,
  "status": "Disponível",
  "porte": "Pequeno",
  "pelagem": "Laranja",
  "foto": "https://exemplo.com/thor.jpg",
  "descricao": "Carinhoso, equilibrado e muito sociável.",
  "saude": {
    "vacinas": ["V8/V10", "Antirrábica"],
    "vermifugado": true,
    "microchip": true,
    "pedigree": true
  }
}
```

| Campo | Tipo | Observação |
|---|---|---|
| `id` | número | gerado pelo back-end |
| `sexo` | texto | `"Macho"` ou `"Fêmea"` |
| `nascimento` | texto | data `AAAA-MM-DD` (a idade é calculada no front) |
| `preco` | número ou `null` | em reais, pode ter centavos (`3499.9`); `null` = "Consultar" |
| `status` | texto | `"Disponível"`, `"Reservado"` ou `"Vendido"` |
| `porte` | texto | `"Pequeno"`, `"Médio"` ou `"Grande"` |
| `foto` | texto | link da imagem; pode ser vazio |
| `saude.vacinas` | lista de texto | opções do front: `V8/V10`, `Antirrábica`, `Gripe canina`, `Giárdia` |

### Interessado

```json
{
  "id": 7,
  "nome": "Mariana Alves",
  "telefone": "(16) 98811-2233",
  "filhoteId": 1,
  "filhoteNome": "Thor",
  "mensagem": "Gostaria de saber mais sobre disponibilidade.",
  "criadoEm": "2026-09-28T14:32:00.000Z",
  "atendido": false
}
```

- `filhoteId` e `filhoteNome` podem ser `null` (contato geral, sem filhote escolhido).
- `filhoteNome` e `criadoEm` são preenchidos pelo back-end.

### Login e erros

- Depois do `POST /login`, o front envia o token em toda rota que precisa de login:
  `Authorization: Bearer <token>`
- Token inválido ou vencido → responda **401**: o painel volta para a tela de login.
- Senha errada no `/login` → responda **401** com `{ "mensagem": "E-mail ou senha incorretos." }`.
- Em qualquer erro, se possível responda `{ "mensagem": "texto do erro" }`: o front mostra esse texto na tela.

---

## Publicar no GitHub Pages

1. No repositório, vá em **Settings → Pages**.
2. Em **Branch**, escolha `main` e a pasta `/ (root)` e clique em **Save**.
3. Em alguns minutos o site fica em `https://loorenzofe.github.io/petshopAlfa2.0/`

---

## Pendências

- [ ] As fotos vêm do Unsplash (uso gratuito) e precisam de internet. Para a apresentação, vale baixar as fotos para `assets/fotos/` e trocar os links em `js/api.js` e nas páginas.
- [ ] Ligar o `API_URL` quando o back-end estiver pronto.
