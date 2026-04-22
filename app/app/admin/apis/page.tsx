'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type ApiStatus = 'public' | 'auth' | 'affiliate' | 'deprecated'

interface Endpoint {
  method?: string
  path: string
  desc: string
  status: ApiStatus
  obs?: string
}

interface ApiSection {
  title: string
  endpoints: Endpoint[]
}

interface Platform {
  nome: string
  icon: string
  cor: string
  descricao: string
  base_url: string
  docs_url: string
  auth_tipo: string
  credenciais: string[]
  secoes: ApiSection[]
  observacoes: string[]
}

const PLATAFORMAS: Record<string, Platform> = {
  mercadolivre: {
    nome: 'Mercado Livre',
    icon: '🛒',
    cor: 'yellow',
    descricao: 'API REST pública com autenticação OAuth 2.0. Afiliados via programa separado (sem API oficial).',
    base_url: 'https://api.mercadolibre.com',
    docs_url: 'https://developers.mercadolivre.com.br/pt_br/api-docs-pt-br',
    auth_tipo: 'OAuth 2.0 (Bearer Token)',
    credenciais: ['Client ID', 'Client Secret', 'Access Token (OAuth)', 'Refresh Token', 'User ID', 'Tag de Afiliado'],
    secoes: [
      {
        title: 'Busca e Produtos',
        endpoints: [
          { method: 'GET', path: '/sites/MLB/search?q={query}', desc: 'Busca produtos por palavra-chave', status: 'public' },
          { method: 'GET', path: '/sites/MLB/search?category={id}', desc: 'Busca por categoria', status: 'public' },
          { method: 'GET', path: '/items/{item_id}', desc: 'Detalhe de um produto', status: 'public' },
          { method: 'GET', path: '/items?ids={ids}', desc: 'Múltiplos produtos (até 20)', status: 'public' },
          { method: 'GET', path: '/items/{id}/description', desc: 'Descrição do produto', status: 'public' },
          { method: 'GET', path: '/items/{id}/pictures/{pic_id}', desc: 'Imagens do produto', status: 'public' },
        ]
      },
      {
        title: 'Promoções e Deals',
        endpoints: [
          { method: 'GET', path: '/sites/MLB/search?sort=price_asc', desc: 'Ordenar por menor preço', status: 'public' },
          { method: 'GET', path: '/sites/MLB/search?deals=MLB', desc: 'Produtos em promoção', status: 'public', obs: 'Parâmetro deals pode variar' },
          { method: 'GET', path: '/highlights/MLB', desc: 'Produtos em destaque', status: 'auth' },
          { method: 'GET', path: '/seller-promotions/{user_id}/items', desc: 'Promoções do vendedor', status: 'auth' },
        ]
      },
      {
        title: 'Categorias',
        endpoints: [
          { method: 'GET', path: '/sites/MLB/categories', desc: 'Todas as categorias', status: 'public' },
          { method: 'GET', path: '/categories/{category_id}', desc: 'Detalhe de categoria', status: 'public' },
          { method: 'GET', path: '/categories/{id}/attributes', desc: 'Atributos da categoria', status: 'public' },
        ]
      },
      {
        title: 'Preços e Ofertas',
        endpoints: [
          { method: 'GET', path: '/items/{id}/prices', desc: 'Preços e histórico', status: 'auth' },
          { method: 'GET', path: '/prices/items?ids={ids}', desc: 'Preços de múltiplos itens', status: 'auth' },
        ]
      },
      {
        title: 'Afiliados',
        endpoints: [
          { method: '—', path: 'Link manual com ?mt_source=', desc: 'Rastreio via parâmetro UTM', status: 'affiliate', obs: 'Não há API REST oficial de afiliados. Links gerados manualmente no painel.' },
          { method: '—', path: 'afiliados.mercadolive.com.br', desc: 'Portal do programa de afiliados', status: 'affiliate' },
        ]
      },
      {
        title: 'Autenticação OAuth',
        endpoints: [
          { method: 'POST', path: '/oauth/token', desc: 'Obter/renovar access token', status: 'auth' },
          { method: 'GET', path: '/users/me', desc: 'Dados do usuário autenticado', status: 'auth' },
        ]
      },
    ],
    observacoes: [
      'O programa de afiliados ML NÃO tem API REST — links são gerados manualmente no painel de afiliados',
      'Busca pública não exige autenticação (ideal para monitorar preços)',
      'Rate limit: 180 requisições/minuto em apps autenticados',
      'Cadastro: developers.mercadolivre.com.br | Afiliados: afiliados.mercadolive.com.br',
    ]
  },

  shopee: {
    nome: 'Shopee',
    icon: '🧡',
    cor: 'rose',
    descricao: 'Open Platform para sellers + API de Afiliados separada. Autenticação via HMAC-SHA256.',
    base_url: 'https://partner.shopeemobile.com/api/v2',
    docs_url: 'https://open.shopee.com/documents',
    auth_tipo: 'HMAC-SHA256 (Partner ID + Partner Key)',
    credenciais: ['Partner ID', 'Partner Key', 'Affiliate ID (Criadores)', 'App ID', 'Secret Key'],
    secoes: [
      {
        title: 'Afiliados (Criadores)',
        endpoints: [
          { method: 'GET', path: '/open_api/v1/product/get_products', desc: 'Listar produtos disponíveis para afiliado', status: 'affiliate' },
          { method: 'POST', path: '/open_api/v1/link/generate', desc: 'Gerar link de afiliado', status: 'affiliate' },
          { method: 'GET', path: '/open_api/v1/commission/get_commission_rates', desc: 'Taxas de comissão por categoria', status: 'affiliate' },
          { method: 'GET', path: '/open_api/v1/report/get_performance_summary', desc: 'Resumo de performance', status: 'affiliate' },
          { method: 'GET', path: '/open_api/v1/order/get_order_list', desc: 'Pedidos via link afiliado', status: 'affiliate' },
          { method: 'GET', path: '/open_api/v1/offer/get_offer_list', desc: 'Ofertas especiais disponíveis', status: 'affiliate' },
        ]
      },
      {
        title: 'Produtos (Open Platform)',
        endpoints: [
          { method: 'GET', path: '/product/search_item', desc: 'Busca produtos na loja', status: 'auth' },
          { method: 'GET', path: '/product/get_item_base_info', desc: 'Informações básicas do produto', status: 'auth' },
          { method: 'GET', path: '/product/get_item_extra_info', desc: 'Informações extras (rating, vendas)', status: 'auth' },
          { method: 'GET', path: '/product/get_category', desc: 'Lista de categorias', status: 'auth' },
        ]
      },
      {
        title: 'Promoções',
        endpoints: [
          { method: 'GET', path: '/discount/get_discount_list', desc: 'Lista de descontos ativos', status: 'auth' },
          { method: 'GET', path: '/discount/get_discount', desc: 'Detalhe de um desconto', status: 'auth' },
          { method: 'GET', path: '/voucher/get_voucher_list', desc: 'Vouchers disponíveis', status: 'auth' },
        ]
      },
      {
        title: 'Loja e Métricas',
        endpoints: [
          { method: 'GET', path: '/shop/get_profile', desc: 'Perfil da loja', status: 'auth' },
          { method: 'GET', path: '/analytics/get_traffic_source', desc: 'Fontes de tráfego', status: 'auth' },
        ]
      },
    ],
    observacoes: [
      'Dois programas distintos: Open Platform (sellers) vs Afiliados/Criadores (affiliate.shopee.com.br)',
      'Para gerar links de afiliado use a API de Criadores em affiliate.shopee.com.br/open_api',
      'Assinatura: cada request usa HMAC-SHA256 com timestamp + partner_id + path',
      'Cadastro seller: open.shopee.com | Afiliados: affiliate.shopee.com.br',
    ]
  },

  aliexpress: {
    nome: 'AliExpress',
    icon: '🔴',
    cor: 'red',
    descricao: 'Open Platform via Alibaba TOP. Métodos no formato "aliexpress.xxx.xxx". Ótima API de afiliados.',
    base_url: 'https://api-sg.aliexpress.com/sync',
    docs_url: 'https://openservice.aliexpress.com/doc/api.htm',
    auth_tipo: 'App Key + App Secret (MD5 assinatura)',
    credenciais: ['App Key', 'App Secret', 'Tracking ID', 'Access Token (para alguns endpoints)'],
    secoes: [
      {
        title: 'Afiliados — Produtos',
        endpoints: [
          { method: 'POST', path: 'aliexpress.affiliate.product.query', desc: 'Busca produtos com comissão', status: 'affiliate' },
          { method: 'POST', path: 'aliexpress.affiliate.product.detail.get', desc: 'Detalhe + comissão de um produto', status: 'affiliate' },
          { method: 'POST', path: 'aliexpress.affiliate.hotproduct.query', desc: 'Produtos mais vendidos / em alta', status: 'affiliate' },
          { method: 'POST', path: 'aliexpress.affiliate.hotproduct.download', desc: 'Download de produtos em alta (bulk)', status: 'affiliate' },
          { method: 'POST', path: 'aliexpress.affiliate.productdetail.get', desc: 'Detalhe produto por IDs', status: 'affiliate' },
          { method: 'POST', path: 'aliexpress.affiliate.featuredpromo.products.get', desc: 'Produtos de promoções em destaque', status: 'affiliate' },
          { method: 'POST', path: 'aliexpress.affiliate.featuredpromo.get', desc: 'Lista promoções em destaque', status: 'affiliate' },
        ]
      },
      {
        title: 'Afiliados — Links e Rastreio',
        endpoints: [
          { method: 'POST', path: 'aliexpress.affiliate.link.generate', desc: 'Gerar link de afiliado', status: 'affiliate' },
          { method: 'POST', path: 'aliexpress.affiliate.order.list.by.index', desc: 'Pedidos por índice/data', status: 'affiliate' },
          { method: 'POST', path: 'aliexpress.affiliate.order.get', desc: 'Detalhe de pedido afiliado', status: 'affiliate' },
          { method: 'POST', path: 'aliexpress.affiliate.order.list', desc: 'Lista pedidos com comissão', status: 'affiliate' },
        ]
      },
      {
        title: 'Categorias e Shipping',
        endpoints: [
          { method: 'POST', path: 'aliexpress.affiliate.category.get', desc: 'Lista categorias disponíveis', status: 'affiliate' },
          { method: 'POST', path: 'aliexpress.logistics.buyer.freight.get', desc: 'Frete para o Brasil', status: 'auth' },
        ]
      },
      {
        title: 'DS (Dropshipping)',
        endpoints: [
          { method: 'POST', path: 'aliexpress.ds.product.get', desc: 'Produto completo (DS)', status: 'auth' },
          { method: 'POST', path: 'aliexpress.ds.recommend.feed.get', desc: 'Feed de produtos recomendados', status: 'auth' },
          { method: 'POST', path: 'aliexpress.ds.image.search', desc: 'Busca produto por imagem', status: 'auth' },
        ]
      },
    ],
    observacoes: [
      'Melhor API de afiliados entre as 4 plataformas — completa e bem documentada',
      'Endpoint base: https://api-sg.aliexpress.com/sync (método no body como "method")',
      'Tracking ID é o seu ID de publisher no portal portals.aliexpress.com',
      'Assinatura: MD5(app_secret + params_sorted + app_secret)',
      'Cadastro: portals.aliexpress.com | Docs: openservice.aliexpress.com',
    ]
  },

  amazon: {
    nome: 'Amazon',
    icon: '📦',
    cor: 'yellow',
    descricao: 'PA-API 5.0 sendo descontinuada em Abril/2026. Migrar para Creators API (OAuth 2.0).',
    base_url: 'https://webservices.amazon.com.br/paapi5',
    docs_url: 'https://webservices.amazon.com/paapi5/documentation/',
    auth_tipo: 'AWS Signature V4 (PA-API) / OAuth 2.0 (Creators API)',
    credenciais: ['Access Key (PA-API)', 'Secret Key (PA-API)', 'Associate Tag', 'Client ID (Creators API)', 'Client Secret (Creators API)'],
    secoes: [
      {
        title: 'PA-API 5.0 — Produtos (DEPRECANDO Abr/2026)',
        endpoints: [
          { method: 'POST', path: '/searchitems', desc: 'Busca produtos por palavra-chave', status: 'auth' },
          { method: 'POST', path: '/getitems', desc: 'Detalhe de produtos por ASIN', status: 'auth' },
          { method: 'POST', path: '/getvariations', desc: 'Variações de um produto', status: 'auth' },
          { method: 'POST', path: '/getbrowsenodes', desc: 'Nós de categorias (browse nodes)', status: 'auth' },
          { method: 'POST', path: '/getitems (OffersV2)', desc: 'Preços e ofertas atualizados', status: 'auth', obs: 'Substituiu Offers (deprecated)' },
        ]
      },
      {
        title: 'Creators API (Nova — substituindo PA-API)',
        endpoints: [
          { method: 'GET', path: '/v1/products/search', desc: 'Busca produtos (novo)', status: 'affiliate' },
          { method: 'GET', path: '/v1/products/{asin}', desc: 'Detalhe produto por ASIN', status: 'affiliate' },
          { method: 'POST', path: '/v1/links/shorten', desc: 'Gerar link curto de afiliado', status: 'affiliate' },
          { method: 'GET', path: '/v1/earnings/summary', desc: 'Resumo de ganhos', status: 'affiliate' },
          { method: 'GET', path: '/v1/reports/clicks', desc: 'Relatório de cliques', status: 'affiliate' },
        ]
      },
      {
        title: 'Resources (PA-API) — Campos disponíveis',
        endpoints: [
          { method: '—', path: 'ItemInfo.Title, ItemInfo.ByLineInfo', desc: 'Título e marca', status: 'auth' },
          { method: '—', path: 'Offers.Listings.Price', desc: 'Preço atual', status: 'auth' },
          { method: '—', path: 'Images.Primary.Large', desc: 'Imagem do produto', status: 'auth' },
          { method: '—', path: 'ItemInfo.ProductInfo', desc: 'Dimensões e peso', status: 'auth' },
          { method: '—', path: 'CustomerReviews.StarRating', desc: 'Avaliações', status: 'auth' },
          { method: '—', path: 'BrowseNodeInfo.BrowseNodes', desc: 'Categorias do produto', status: 'auth' },
        ]
      },
    ],
    observacoes: [
      '⚠️ PA-API 5.0 será DESCONTINUADA em 30/Abril/2026 — migrar para Creators API urgente',
      'Creators API usa OAuth 2.0 (mais simples que AWS Signature V4)',
      'Associate Tag é obrigatório em TODOS os requests para rastrear comissões',
      'Para BR: use marketplace "www.amazon.com.br" e endpoint regional',
      'Cadastro: affiliate-program.amazon.com.br | Creators API: affiliate-program.amazon.com/creatorsapi',
    ]
  },

  lomadee: {
    nome: 'Lomadee',
    icon: '🏬',
    cor: 'green',
    descricao: 'Rede de afiliados multi-loja BR: Americanas, Casas Bahia, Renner, C&A, Nike, Centauro e +100 lojas.',
    base_url: 'https://api-beta.lomadee.com.br/affiliate',
    docs_url: 'https://docs.lomadee.com.br/api-reference/introduction',
    auth_tipo: 'x-api-key (header)',
    credenciais: ['API Key (gerada no painel Lomadee)'],
    secoes: [
      {
        title: 'Produtos',
        endpoints: [
          { method: 'GET', path: '/affiliate/products', desc: 'Busca produtos por keyword', status: 'auth' as ApiStatus },
          { method: 'GET', path: '/affiliate/products/{id}', desc: 'Detalhe de um produto', status: 'auth' as ApiStatus },
        ]
      },
      {
        title: 'Lojas e Categorias',
        endpoints: [
          { method: 'GET', path: '/affiliate/stores', desc: 'Lista lojas parceiras', status: 'auth' as ApiStatus },
          { method: 'GET', path: '/affiliate/categories', desc: 'Lista categorias', status: 'auth' as ApiStatus },
        ]
      },
    ],
    observacoes: [
      'Rate limit: 10 req/min — usar sleep de 7s entre chamadas',
      'Produtos já vêm com link de afiliado (campo link)',
      'Desconto: calcular (listPrice - price) / listPrice * 100',
      'Multi-loja: campo seller.name indica a loja (Americanas, Casas Bahia, etc.)',
      'Cadastro: lomadee.com | Docs: docs.lomadee.com.br',
    ]
  }
}

const statusColor: Record<ApiStatus, string> = {
  public: 'bg-green-100 text-green-700',
  auth: 'bg-yellow-100 text-yellow-700',
  affiliate: 'bg-blue-100 text-blue-700',
  deprecated: 'bg-red-100 text-red-700',
}
const statusLabel: Record<ApiStatus, string> = {
  public: 'Público',
  auth: 'Auth',
  affiliate: 'Afiliado',
  deprecated: 'Deprecated',
}

export default function ApisPage() {
  const [ativa, setAtiva] = useState('mercadolivre')
  const plat = PLATAFORMAS[ativa]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">📚 Referência de APIs</h1>
        <p className="text-sm text-gray-500 mt-1">Todos os endpoints disponíveis por plataforma — o que pedir ao se cadastrar</p>
      </div>

      {/* Tabs plataformas */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {Object.entries(PLATAFORMAS).map(([key, p]) => (
          <button key={key} onClick={() => setAtiva(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              ativa === key ? 'bg-rose-500 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}>
            <span>{p.icon}</span>
            <span>{p.nome}</span>
          </button>
        ))}
      </div>

      {/* Header da plataforma */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-4xl">{plat.icon}</span>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{plat.nome}</h2>
                <p className="text-sm text-gray-500">{plat.descricao}</p>
              </div>
            </div>
            <div className="flex flex-col gap-1 text-sm text-right">
              <span className="text-gray-500">Base URL:</span>
              <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{plat.base_url}</code>
              <a href={plat.docs_url} target="_blank" rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs mt-1">📖 Documentação oficial →</a>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">TIPO DE AUTH</p>
              <p className="text-sm text-gray-700">{plat.auth_tipo}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">CREDENCIAIS NECESSÁRIAS</p>
              <div className="flex flex-wrap gap-1">
                {plat.credenciais.map((c, i) => (
                  <span key={i} className="text-xs bg-white border px-2 py-0.5 rounded-full text-gray-600">{c}</span>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legenda */}
      <div className="flex gap-3 mb-4 flex-wrap">
        <span className="text-xs font-semibold text-gray-500">Legenda:</span>
        {(Object.keys(statusColor) as ApiStatus[]).map(s => (
          <span key={s} className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[s]}`}>
            {statusLabel[s]}
          </span>
        ))}
      </div>

      {/* Seções de endpoints */}
      <div className="space-y-4">
        {plat.secoes.map((secao, si) => (
          <Card key={si}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">{secao.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {secao.endpoints.map((ep, ei) => (
                <div key={ei} className="flex items-start justify-between gap-3 p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-start gap-2 min-w-0">
                    {ep.method && ep.method !== '—' && (
                      <span className="text-xs font-bold text-gray-400 w-10 shrink-0 pt-0.5">{ep.method}</span>
                    )}
                    <div className="min-w-0">
                      <code className="font-mono text-xs text-gray-800 break-all">{ep.path}</code>
                      <p className="text-xs text-gray-500 mt-0.5">{ep.desc}</p>
                      {ep.obs && <p className="text-xs text-rose-600 mt-0.5">⚠️ {ep.obs}</p>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusColor[ep.status]}`}>
                    {statusLabel[ep.status]}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Observações */}
      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">💡 Observações e Links</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {plat.observacoes.map((obs, i) => (
              <li key={i} className="text-sm text-gray-600 flex gap-2">
                <span className="shrink-0">•</span>
                <span>{obs}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
