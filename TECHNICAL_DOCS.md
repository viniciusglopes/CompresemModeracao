# Compre sem Moderação (CSM) - Documentação Técnica

## Visão Geral

Sistema automatizado de curadoria e disparo de ofertas com links de afiliado. Monitora produtos em promoção em múltiplas plataformas (ML, Shopee, AWIN, Lomadee), calcula um score de relevância, e dispara automaticamente para grupos WhatsApp/Telegram com mensagens criativas geradas por IA (Gemini).

---

## Stack Tecnológica

| Camada      | Tecnologia                                          |
|-------------|-----------------------------------------------------|
| Framework   | Next.js 16.2.3 (App Router)                        |
| Runtime     | Node.js 20 (Docker: `node:20-slim`)                |
| Linguagem   | TypeScript 5                                        |
| UI          | React 19 + Tailwind CSS 4 + shadcn/ui 4            |
| Gráficos    | Recharts 3                                          |
| Banco       | Supabase (PostgreSQL)                               |
| Deploy      | Docker + Coolify                                    |
| Mensageria  | Telegram Bot API + Evolution API (WhatsApp)         |
| IA          | Google Gemini 2.5 (flash + pro fallback)            |
| Encurtador  | Próprio (tabela `short_links` + rota `/link/[slug]`)|

---

## Estrutura de Diretórios

```
CompresemModeracao/
├── app/                          # Projeto Next.js principal
│   ├── app/                      # App Router (rotas e páginas)
│   │   ├── layout.tsx            # Layout raiz (Inter font, metadata)
│   │   ├── page.tsx              # Landing page pública
│   │   ├── login/page.tsx        # Tela de login admin
│   │   ├── link/[slug]/route.ts  # Encurtador de links (redirect 301 + contagem)
│   │   ├── admin/                # Painel administrativo
│   │   │   ├── layout.tsx        # Layout admin (sidebar + notificações)
│   │   │   ├── page.tsx          # Dashboard principal
│   │   │   ├── ofertas/          # Gerenciar ofertas
│   │   │   ├── produtos/         # Grid de produtos
│   │   │   ├── disparos/         # Histórico + config disparo automático
│   │   │   ├── grupos/           # CRUD de grupos Telegram/WhatsApp
│   │   │   ├── importar/         # Importar produto por URL
│   │   │   ├── plataformas/[slug]/ # Config por plataforma
│   │   │   ├── analytics/        # Métricas e gráficos
│   │   │   ├── logs/             # Logs de API
│   │   │   ├── links/            # Gerenciar short links
│   │   │   ├── linktree/         # Página linktree
│   │   │   └── apis/             # Referência de endpoints
│   │   └── api/                  # API Routes (backend)
│   │       ├── auth/login/       # Autenticação simples
│   │       ├── busca/            # Busca de produtos por plataforma
│   │       │   ├── mercadolivre/ # 3 estratégias: search_promo, highlights, busca_termo
│   │       │   ├── shopee/       # Shopee Affiliate GraphQL API
│   │       │   ├── lomadee/      # Lomadee API + deeplinks
│   │       │   ├── awin/         # Scraping VTEX + AWIN link builder
│   │       │   └── nichos/       # Lista de categorias/nichos
│   │       ├── cron/
│   │       │   ├── buscar-produtos/ # Cron: busca 3 nichos por plataforma
│   │       │   └── disparar/     # Cron: disparo automático inteligente
│   │       ├── oauth/mercadolivre/
│   │       │   ├── callback/     # OAuth callback ML
│   │       │   └── refresh/      # Força renovação do token
│   │       ├── produtos/
│   │       │   ├── [id]/         # CRUD individual
│   │       │   ├── importar/     # Importa por URL (scraping)
│   │       │   └── auto-importar/ # Auto-import AWIN (VTEX scraping)
│   │       ├── disparos/         # Histórico + disparo manual + delete
│   │       ├── grupos/           # CRUD grupos
│   │       ├── plataformas/[slug]/ # Get/Put credenciais
│   │       ├── links/            # CRUD short links
│   │       ├── logs/             # API logs
│   │       └── notificacoes/     # Admin notificações
│   ├── lib/                      # Módulos compartilhados
│   │   ├── supabase.ts           # Clientes Supabase (anon + admin via Proxy)
│   │   ├── ml-auth.ts            # Token ML com auto-refresh (6h TTL)
│   │   ├── dispatcher.ts         # Formatação + envio Telegram/WhatsApp + Gemini
│   │   ├── score.ts              # Cálculo de score de relevância (0-100)
│   │   ├── short-link.ts         # Geração de slugs únicos para encurtador
│   │   ├── api-logger.ts         # Logging + notificações admin
│   │   └── utils.ts              # Utilitários (cn do shadcn)
│   ├── components/
│   │   ├── AdminSidebar.tsx      # Sidebar responsiva
│   │   ├── AdminNotificacoes.tsx # Bell icon + dropdown
│   │   └── ui/                   # shadcn components
│   ├── Dockerfile
│   ├── package.json
│   └── next.config.ts            # Rewrite /linktree → linktree.html
├── supabase_migration.sql        # Schema completo do banco
├── docker-compose.yml
├── Dockerfile (raiz)
└── scripts/
```

---

## Banco de Dados (Supabase/PostgreSQL)

### Tabelas

#### `produtos`
Tabela central. Armazena todos os produtos encontrados nas plataformas.

| Coluna              | Tipo        | Descrição                                    |
|---------------------|-------------|----------------------------------------------|
| id                  | UUID (PK)   | Auto-gerado                                  |
| titulo              | TEXT        | Nome do produto                              |
| preco               | NUMERIC     | Preço atual                                  |
| preco_original      | NUMERIC     | Preço sem desconto                           |
| desconto_percent    | INTEGER     | % de desconto calculado                      |
| plataforma          | VARCHAR     | mercadolivre, shopee, lomadee, aliexpress, amazon |
| link_original       | TEXT        | URL do produto na loja                       |
| link_afiliado       | TEXT        | URL com tag de afiliado                      |
| thumbnail           | TEXT        | URL da imagem                                |
| nicho               | VARCHAR     | Categoria normalizada (ex: "eletronicos")    |
| frete_gratis        | BOOLEAN     | Frete grátis?                                |
| qtd_vendida         | INTEGER     | Quantidade vendida na plataforma             |
| score               | INTEGER     | Score calculado (0-100)                      |
| score_detalhes      | JSONB       | Breakdown do score por critério              |
| produto_id_externo  | VARCHAR     | ID único na plataforma de origem             |
| ativo               | BOOLEAN     | Visível no sistema?                          |
| ultimo_disparo_em   | TIMESTAMPTZ | Quando foi disparado pela última vez         |
| loja_nome           | VARCHAR     | Nome da loja (AWIN/Lomadee)                  |
| created_at          | TIMESTAMPTZ | Data de criação                              |
| updated_at          | TIMESTAMPTZ | Última atualização                           |

**Constraint:** `UNIQUE(produto_id_externo, plataforma)` — permite upsert.

#### `disparos`
Registro de cada envio para grupo.

| Coluna       | Tipo        | Descrição                              |
|--------------|-------------|----------------------------------------|
| id           | UUID (PK)   |                                        |
| produto_id   | UUID (FK)   | → produtos.id (ON DELETE SET NULL)     |
| canal        | VARCHAR     | telegram \| whatsapp                   |
| grupo_id     | VARCHAR     | Chat ID do grupo                       |
| grupo_nome   | VARCHAR     | Nome do grupo                          |
| mensagem     | TEXT        | Abertura gerada pelo Gemini            |
| status       | VARCHAR     | pendente \| enviado \| erro            |
| erro         | TEXT        | Mensagem de erro se falhou             |
| disparado_em | TIMESTAMPTZ |                                        |

#### `grupos`
Grupos de destino para disparos.

| Coluna     | Tipo    | Descrição                                   |
|------------|---------|---------------------------------------------|
| id         | UUID    |                                             |
| nome       | VARCHAR | Nome de exibição                            |
| canal      | VARCHAR | telegram \| whatsapp                        |
| grupo_id   | VARCHAR | Chat ID (Telegram) ou JID (WhatsApp)        |
| nichos     | JSONB   | Array de nichos aceitos (null = todos)       |
| ativo      | BOOLEAN |                                             |

#### `config_plataformas`
Configuração centralizada. Cada plataforma/serviço é uma linha.

| Coluna      | Tipo    | Descrição                              |
|-------------|---------|----------------------------------------|
| plataforma  | VARCHAR (PK) | Identificador único               |
| credenciais | JSONB   | Credenciais e configurações            |
| ativo       | BOOLEAN | Plataforma habilitada?                 |
| updated_at  | TIMESTAMPTZ |                                    |

**Registros padrão:**
- `mercadolivre` — client_id, client_secret, access_token, refresh_token, token_expires_at
- `shopee` — app_id, secret
- `lomadee` — api_key
- `awin` — publisher_id, api_token
- `telegram_bot` — bot_token
- `evolution_api` — url, api_key, instance
- `gemini` — api_key
- `cron_state` — ml_idx, shopee_idx, lomadee_idx, awin_idx (rotação de nichos)
- `disparo_auto` — config completa do disparo automático (score_minimo, horários, etc.)

#### `short_links`
Encurtador de URLs próprio.

| Coluna       | Tipo    | Descrição                  |
|--------------|---------|----------------------------|
| id           | UUID    |                            |
| slug         | VARCHAR | Código curto (6 chars)     |
| url_destino  | TEXT    | URL final                  |
| produto_id   | UUID    | Produto associado (opt)    |
| cliques      | INTEGER | Contador de acessos        |
| ultimo_clique| TIMESTAMPTZ |                        |

#### Outras tabelas
- `admin_notificacoes` — alertas no painel (rate_limit, erros)
- `api_logs` — log detalhado de cada chamada API (plataforma, duração, status, request/response JSON)
- `clicks` — tracking de cliques por produto
- `vendas` — registro de vendas e comissões
- `awin_lojas` — catálogo de lojas AWIN

---

## Módulos Core (lib/)

### `supabase.ts` — Clientes Supabase
Dois clientes via Proxy (lazy init):
- **`supabase`** — usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` (cliente público)
- **`supabaseAdmin`** — usa `SUPABASE_SERVICE_ROLE_KEY` (bypassa RLS)

### `ml-auth.ts` — OAuth Mercado Livre
- `getMlAccessToken()` — retorna token válido
- Auto-renova se expira em < 30 min
- Usa `refresh_token` + `client_id` + `client_secret`
- Tokens expiram a cada 6 horas
- Salva novo token no banco após refresh
- Fallback: retorna token expirado se refresh falhar

### `dispatcher.ts` — Envio de Ofertas
- `gerarAbertura(produto)` — prompt para Gemini gerar 1 linha criativa (max 6 palavras maiúsculas + 1 emoji)
  - Modelos: gemini-2.5-flash → fallback gemini-2.5-pro (se 503)
  - Timeout: 20s por chamada
  - Log em `api_logs`
- `sendTelegram(botToken, chatId, produto, abertura)` — foto + caption (HTML mode) ou texto fallback
- `sendWhatsApp(evoUrl, evoKey, instance, jid, produto, abertura)` — foto + caption via Evolution API

**Formato da mensagem:**
```
*ABERTURA CRIATIVA* emoji

🔥 Título do Produto

💸 De R$ X por apenas R$ Y
🏷️ XX% OFF — economize R$ Z
🚚 Frete grátis

🏪 Plataforma

👉 Link encurtado
```

### `score.ts` — Score de Relevância
Pontuação de 0 a 100 baseada em:

| Critério       | Pontuação máxima |
|----------------|-----------------|
| Vendas         | 30 (5000+)      |
| Desconto %     | 25 (50%+)       |
| Rating         | 20 (4.5+)       |
| Frete grátis   | 10              |
| Loja premium   | 10              |
| Comissão ≥10%  | 5               |

### `short-link.ts` — Encurtador
- `getOrCreateShortLink(url, produtoId)` — reutiliza slug se já existe para o produto
- Slug: 6 chars aleatórios (a-z, A-Z, 0-9)
- Rota `/link/[slug]` → redirect 301 + incrementa contador

### `api-logger.ts` — Logging + Notificações
- `logApi(params)` — salva em `api_logs` com request/response JSON
- `notificar(params)` — cria notificação no painel admin
- Dedup: rate_limit notifications max 1 a cada 30 min por plataforma

---

## API Routes

### Busca de Produtos

#### `POST /api/busca/mercadolivre`
Busca produtos com desconto no ML usando 3 estratégias em cascata:
1. **search_promo** — `/sites/MLB/search?promotions=PERCENT_DISCOUNT` (mais rápido, pode estar bloqueado de VPS)
2. **highlights_items** — `/highlights/MLB/category/{id}` → pega catalog IDs → `/products/{id}/items` → filtra descontos
3. **busca_termo** — search com keywords "oferta", "promoção" etc

Body: `{ nicho: "eletronicos", limite: 20 }`
Requer: Token ML ativo

**19 nichos disponíveis:** eletronicos, eletrodomesticos, informatica, audio_video, cameras, games, moda, calcados, beleza, casa_moveis, ferramentas, esportes, bebes, brinquedos, veiculos_acess, saude, alimentos, musica, pet_shop

Classificação de nicho: `domain_id` do ML → regex → fallback por título.

#### `POST /api/busca/shopee`
Busca via Shopee Affiliate GraphQL API (`productOfferV2`).
- Autenticação: SHA256(appId + timestamp + body + secret)
- Busca por keywords de cada nicho (ex: "celular", "smartphone" para eletrônicos)
- 12 nichos com keywords específicas

#### `POST /api/busca/lomadee`
Busca via Lomadee API (`/affiliate/products`).
- Gera deeplinks via `POST /affiliate/shortener/url`
- 7 nichos femininos: moda, bolsas, lingerie, beleza, calçados, casa, eletro

#### `POST /api/busca/awin`
Scraping de lojas VTEX parceiras da AWIN.
- Lojas: C&A, Vivara, Under Armour, Mizuno, ASICS, Calvin Klein
- Busca via VTEX Search API: `https://{dominio}/api/catalog_system/pub/products/search/{keyword}`
- Gera link AWIN via `POST /publishers/{id}/linkbuilder/generate`

### Cron

#### `POST /api/cron/buscar-produtos`
Chamado a cada 30 min. Busca 3 nichos por plataforma por ciclo, rotaciona.
- Protegido por `x-cron-secret` header
- Estado salvo em `config_plataformas` (plataforma = `cron_state`)

#### `POST /api/cron/disparar` (GET = config, PUT = atualizar)
Disparo automático inteligente:
- Sorteia quantidade aleatória (min_produtos..max_produtos)
- Rotaciona nichos para variedade
- **Filtro de duplicatas:** não repete produto nas últimas 48h
- **Similaridade de títulos:** extrai palavras-chave, calcula overlap ≥ 60% → considera similar
- **Palavras bloqueadas:** filtra títulos com termos indesejados
- **Lock otimista:** marca `ultimo_disparo` ANTES de processar
- Gera abertura Gemini 1x por produto (reusada em todos os canais)
- Delay: 500ms entre grupos, 1s entre produtos
- Horário BRT: configável (padrão 8h-22h)

### OAuth

#### `GET /api/oauth/mercadolivre/callback`
Callback do fluxo OAuth. Troca authorization code por tokens.

#### `POST /api/oauth/mercadolivre/refresh`
Força renovação do token via `getMlAccessToken()`.

### CRUD

- `GET/POST /api/plataformas/[slug]` — ler/salvar credenciais
- `POST /api/plataformas/[slug]/test` — testar conexão
- `GET/POST/DELETE /api/disparos` — histórico + disparo manual + delete
- `GET/POST /api/grupos` + `PATCH/DELETE /api/grupos/[id]`
- `PATCH/DELETE /api/produtos/[id]`
- `POST /api/produtos/importar` — importa por URL (scraping)
- `POST /api/produtos/auto-importar` — auto-import AWIN/VTEX
- `GET/PATCH/DELETE /api/logs`
- `GET/POST/DELETE /api/links` — short links CRUD
- `GET /api/admin/analytics` — métricas agregadas
- `GET /api/public/produtos` — feed público

---

## Autenticação

Login simples via credenciais hardcoded:
- Email + senha verificados no server → retorna `{ success: true }`
- Client salva flag em `localStorage('admin_authenticated')`
- `admin/layout.tsx` checa o flag e redireciona para `/login` se ausente
- **Não usa JWT/sessão server-side** — apenas client-side guard

---

## Deploy & Infraestrutura

### Docker
```dockerfile
FROM node:20-slim
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Variáveis de Ambiente Necessárias

| Variável                      | Descrição                              |
|-------------------------------|----------------------------------------|
| NEXT_PUBLIC_SUPABASE_URL      | URL do projeto Supabase                |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Anon key do Supabase                   |
| SUPABASE_SERVICE_ROLE_KEY     | Service role key (bypassa RLS)         |
| NEXT_PUBLIC_APP_URL           | URL pública da aplicação               |
| CRON_SECRET                   | Secret para proteger rotas de cron     |
| ML_CLIENT_ID (opcional)       | Override do client_id ML (env > banco) |
| ML_CLIENT_SECRET (opcional)   | Override do client_secret ML           |

As credenciais das plataformas ficam no banco (`config_plataformas`), não em env vars.

### Cron Jobs (VPS)

```cron
# Buscar produtos a cada 30 min
*/30 * * * * curl -s -X POST https://DOMINIO/api/cron/buscar-produtos -H "x-cron-secret: CRON_SECRET"

# Disparar ofertas a cada 15 min (horário controlado pela API)
*/15 * * * * curl -s -X POST https://DOMINIO/api/cron/disparar -H "x-cron-secret: CRON_SECRET"
```

---

## Fluxo Principal

```
1. CRON buscar-produtos (*/30 min)
   ├── Para cada plataforma ativa (ML, Shopee, Lomadee, AWIN):
   │   ├── Rotaciona 3 nichos por ciclo
   │   ├── Busca produtos com desconto
   │   ├── Calcula score de relevância
   │   └── Upsert no banco (dedup por produto_id_externo + plataforma)
   └── Salva próximo índice de nicho no cron_state

2. CRON disparar (*/15 min)
   ├── Verifica: ativo? horário BRT? intervalo mínimo?
   ├── Sorteia quantidade (min..max)
   ├── Busca produtos elegíveis (score/desconto mínimo)
   ├── Filtra: já disparado 48h? título similar? palavra bloqueada?
   ├── Para cada produto:
   │   ├── Gemini gera abertura criativa
   │   ├── Para cada grupo ativo:
   │   │   ├── Telegram: foto + caption HTML
   │   │   └── WhatsApp: foto + caption Markdown (Evolution API)
   │   └── Registra em disparos + marca ultimo_disparo_em
   └── Atualiza config (último nicho, último disparo)

3. Usuário clica no link
   └── /link/[slug] → incrementa cliques → redirect 301 para URL de afiliado
```

---

## Painel Admin (Páginas)

| Página                    | Função                                            |
|---------------------------|---------------------------------------------------|
| `/admin`                  | Dashboard com stats gerais                        |
| `/admin/ofertas`          | Grid de ofertas + editar nicho + filtros           |
| `/admin/produtos`         | Todos os produtos do banco                        |
| `/admin/disparos`         | Histórico + toggle disparo auto + config          |
| `/admin/grupos`           | CRUD de grupos Telegram/WhatsApp                  |
| `/admin/importar`         | Importar produto por URL (scraping automático)    |
| `/admin/plataformas/[slug]` | Config de credenciais por plataforma            |
| `/admin/plataformas/awin/lojas` | Catálogo de lojas AWIN                     |
| `/admin/analytics`        | Gráficos e métricas                               |
| `/admin/logs`             | Logs de API com JSON expandível                   |
| `/admin/links`            | Gerenciar short links + cliques                   |
| `/admin/linktree`         | Página de links (bio)                             |
| `/admin/apis`             | Documentação dos endpoints                        |

---

## Pontos de Extensão (para novo projeto)

1. **Adicionar nova plataforma de busca:** criar `api/busca/[nova]/route.ts`, adicionar categorias, registrar em `config_plataformas`
2. **Novo canal de disparo:** estender `dispatcher.ts` com nova função `sendNovoCanal()`, adicionar canal no CHECK constraint da tabela `disparos` e `grupos`
3. **Mudar público-alvo:** ajustar keywords de busca e prompt do Gemini no `dispatcher.ts`
4. **Novo método de autenticação:** substituir o login hardcoded por Supabase Auth ou NextAuth
5. **Novas métricas:** estender tabelas `clicks`/`vendas` e `/api/admin/analytics`

---

## Notas Importantes para Next.js 16

- **Params de rotas dinâmicas são Promise:** sempre usar `const { slug } = await params`
- App Router: tudo em `app/` com convenção de `page.tsx` (páginas) e `route.ts` (API)
- Server Components por padrão, `'use client'` apenas onde necessário
- `cache: 'no-store'` nas chamadas fetch para APIs externas (dados em tempo real)
