import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calcularScore } from '@/lib/score'
import { logApi } from '@/lib/api-logger'

const PUBLISHER_ID = '1778660'

const VTEX_STORES: Record<string, { searchTerms: string[] }> = {
  'cea.com.br':            { searchTerms: ['vestido feminino', 'blusa feminina', 'calca jeans feminina', 'tenis feminino', 'bolsa feminina', 'saia feminina'] },
  'animale.com.br':        { searchTerms: ['vestido', 'blusa', 'saia', 'calca'] },
  'asics.com.br':          { searchTerms: ['tenis feminino', 'tenis corrida'] },
  'underarmour.com.br':    { searchTerms: ['tenis feminino', 'legging feminina', 'camiseta feminina'] },
  'vivara.com.br':         { searchTerms: ['anel feminino', 'brinco', 'colar', 'pulseira', 'relogio feminino'] },
  'mizuno.com.br':         { searchTerms: ['tenis feminino', 'tenis corrida feminino', 'tenis wave'] },
  'calvinklein.com.br':    { searchTerms: ['camiseta feminina', 'vestido', 'bolsa feminina', 'calcinha', 'perfume feminino'] },
  'usereserva.com':        { searchTerms: ['camisa feminina', 'vestido', 'blusa feminina', 'saia'] },
  'kipling.com.br':        { searchTerms: ['mochila feminina', 'bolsa', 'necessaire', 'carteira'] },
  'intimissimi.com.br':    { searchTerms: ['lingerie', 'sutia', 'calcinha', 'pijama feminino', 'body'] },
  'lego.com.br':           { searchTerms: ['lego friends', 'lego disney', 'lego harry potter', 'lego botanica'] },
}

interface ProdutoExtraido {
  titulo: string
  preco: number
  precoOriginal: number
  url: string
  imagem: string
}

function nichoFromTitulo(titulo: string): string | null {
  const t = titulo.toLowerCase()
  if (/(celular|smartphone|iphone|samsung|xiaomi|fone|smartwatch|carregador|power.?bank|caixa de som)/.test(t)) return 'eletronicos'
  if (/(notebook|laptop|mouse|teclado|monitor|ssd|pendrive|webcam|impressora)/.test(t)) return 'informatica'
  if (/(fritadeira|air.?fryer|aspirador|liquidificador|cafeteira|ventilador|micro.?ondas|geladeira)/.test(t)) return 'eletrodomesticos'
  if (/(playstation|ps[45]|xbox|nintendo|headset gamer|console)/.test(t)) return 'games'
  if (/(vestido|blusa|calça|camisa|bermuda|moletom|jaqueta|saia|bolsa|óculos|relógio|anel|brinco|colar|pulseira|pingente|aliança|joia)/.test(t)) return 'moda'
  if (/(perfume|maquiagem|batom|hidratante|shampoo|protetor solar|sérum|esmalte|lingerie|suti[aã]|calcinha|pijama|body)/.test(t)) return 'beleza'
  if (/(luminária|cortina|tapete|organizador|jogo de cama|travesseiro|edredom)/.test(t)) return 'casa_moveis'
  if (/(tênis|tenis|halter|bicicleta|esteira|chuteira|whey|creatina|legging)/.test(t)) return 'calcados'
  if (/(fralda|carrinho.*bebê|mamadeira|chupeta|berço)/.test(t)) return 'bebes'
  if (/(ração|coleira|brinquedo.*(cão|gato|cachorro|pet)|areia.*gato)/.test(t)) return 'pet_shop'
  if (/(furadeira|parafusadeira|alicate|esmerilhadeira|serra)/.test(t)) return 'ferramentas'
  if (/(lego|boneca|hot wheels|nerf|quebra-cabeça|brinquedo)/.test(t)) return 'brinquedos'
  return null
}

function gerarDeeplink(merchantId: string, urlProduto: string): string {
  return `https://www.awin1.com/cread.php?awinmid=${merchantId}&awinaffid=${PUBLISHER_ID}&ued=${encodeURIComponent(urlProduto)}`
}

function hashId(s: string): string {
  let h1 = 0, h2 = 0
  for (let i = 0; i < s.length; i++) {
    h1 = ((h1 << 5) - h1 + s.charCodeAt(i)) | 0
    h2 = ((h2 << 7) + h2 + s.charCodeAt(i) * (i + 1)) | 0
  }
  return Math.abs(h1).toString(36) + Math.abs(h2).toString(36)
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return ''
  }
}

async function buscarViaVtex(storeUrl: string, searchTerms: string[], limite: number): Promise<ProdutoExtraido[]> {
  const domain = getDomain(storeUrl)
  const produtos: ProdutoExtraido[] = []
  const seen = new Set<string>()

  for (const term of searchTerms) {
    if (produtos.length >= limite) break
    try {
      const apiUrl = `https://www.${domain}/api/catalog_system/pub/products/search/?ft=${encodeURIComponent(term)}&_from=0&_to=14&O=OrderByPriceASC`
      const res = await fetch(apiUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) continue
      const data = await res.json()
      if (!Array.isArray(data)) continue

      for (const p of data) {
        if (produtos.length >= limite) break
        if (!p?.productName || !p?.items?.[0]) continue

        const productId = p.productId || p.productName
        if (seen.has(productId)) continue
        seen.add(productId)

        const item = p.items[0]
        const seller = item.sellers?.[0]?.commertialOffer
        if (!seller) continue

        const price = seller.Price || 0
        const listPrice = seller.ListPrice || price
        const available = seller.AvailableQuantity ?? seller.IsAvailable

        if (price <= 0 || available === 0 || available === false) continue
        if (listPrice > price && ((listPrice - price) / listPrice) < 0.10) continue

        const imageUrl = item.images?.[0]?.imageUrl || ''
        const link = p.link || `https://www.${domain}/${p.linkText}/p`

        produtos.push({
          titulo: p.productName,
          preco: price,
          precoOriginal: listPrice > price ? listPrice : price,
          url: link.startsWith('http') ? link : `https://www.${domain}${link}`,
          imagem: imageUrl.replace('http://', 'https://'),
        })
      }
    } catch {}
  }

  return produtos
}

async function buscarViaHtmlScraping(storeUrl: string): Promise<ProdutoExtraido[]> {
  const promoUrls = [
    `${storeUrl}/sale`,
    `${storeUrl}/outlet`,
    `${storeUrl}/promocoes`,
    `${storeUrl}/ofertas`,
    `${storeUrl}/promocao`,
  ]

  for (const promoUrl of promoUrls) {
    try {
      const res = await fetch(promoUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        redirect: 'follow',
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      })

      if (!res.ok) continue
      const html = await res.text()
      const prods = extrairProdutosHtml(html, storeUrl)
      if (prods.length > 0) return prods
    } catch {}
  }

  // Fallback: homepage
  try {
    const res = await fetch(storeUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok) {
      return extrairProdutosHtml(await res.text(), storeUrl)
    }
  } catch {}

  return []
}

function extrairProdutosHtml(html: string, baseUrl: string): ProdutoExtraido[] {
  const produtos: ProdutoExtraido[] = []

  const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1])
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (item['@type'] === 'Product' || item['@type'] === 'ItemList') {
          const prodList = item.itemListElement || [item]
          for (const p of prodList) {
            const prod = p.item || p
            if (prod.name && prod.offers) {
              const offers = Array.isArray(prod.offers) ? prod.offers[0] : prod.offers
              const preco = parseFloat(String(offers.price || offers.lowPrice || '0').replace(',', '.'))
              if (preco > 0) {
                produtos.push({
                  titulo: prod.name,
                  preco,
                  precoOriginal: parseFloat(String(offers.highPrice || offers.price || '0').replace(',', '.')) || preco,
                  url: prod.url || '',
                  imagem: prod.image?.[0] || prod.image || '',
                })
              }
            }
          }
        }
      }
    } catch {}
  }

  return produtos.slice(0, 30)
}

export async function POST(request: Request) {
  const t0 = Date.now()
  try {
    const body = await request.json().catch(() => ({}))
    const limite = Math.min(body.limite || 20, 50)

    const { data: cfg } = await supabaseAdmin
      .from('config_plataformas')
      .select('credenciais, ativo')
      .eq('plataforma', 'awin')
      .maybeSingle()

    if (!cfg?.ativo) {
      return NextResponse.json({ error: 'AWIN está desativada' }, { status: 400 })
    }

    const { data: lojas } = await supabaseAdmin
      .from('awin_lojas')
      .select('*')
      .eq('ativo', true)

    if (!lojas || lojas.length === 0) {
      const resp = { salvos: 0, total_encontrados: 0, mensagem: 'Nenhuma loja AWIN ativa' }
      await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'success', duracao_ms: Date.now() - t0, total_encontrados: 0, salvos: 0, request_json: body, response_json: resp })
      return NextResponse.json(resp)
    }

    const { data: cfgRow } = await supabaseAdmin
      .from('config_plataformas')
      .select('credenciais')
      .eq('plataforma', 'cron_state')
      .maybeSingle()

    const state = cfgRow?.credenciais || {}
    const lojaIdx = (state.awin_loja_idx || 0) % lojas.length
    const loja = lojas[lojaIdx]
    const domain = getDomain(loja.url)

    let produtosEncontrados: ProdutoExtraido[] = []
    let metodo = 'html'

    // Strategy 1: VTEX API (most reliable)
    if (VTEX_STORES[domain]) {
      metodo = 'vtex'
      produtosEncontrados = await buscarViaVtex(loja.url, VTEX_STORES[domain].searchTerms, limite)
    }

    // Strategy 2: HTML scraping fallback
    if (produtosEncontrados.length === 0) {
      metodo = produtosEncontrados.length === 0 && VTEX_STORES[domain] ? 'vtex+html' : 'html'
      produtosEncontrados = await buscarViaHtmlScraping(loja.url)
    }

    const produtosParaSalvar = produtosEncontrados.slice(0, limite).map(p => {
      const temDesconto = p.precoOriginal > p.preco && p.precoOriginal > 0
      const descontoPercent = temDesconto ? Math.round(((p.precoOriginal - p.preco) / p.precoOriginal) * 100) : 0
      const nichoReal = nichoFromTitulo(p.titulo) || (loja.categorias?.[0]) || 'moda'
      const urlProduto = p.url.startsWith('http') ? p.url : `${loja.url}${p.url}`

      const { score, detalhes } = calcularScore({
        vendas: 0,
        desconto_percent: descontoPercent,
        rating: 0,
        frete_gratis: false,
        loja_premium: true,
        comissao_percent: 0,
      })

      return {
        titulo: p.titulo,
        preco: p.preco,
        preco_original: temDesconto ? p.precoOriginal : p.preco,
        desconto_percent: descontoPercent,
        plataforma: 'awin',
        link_original: urlProduto,
        link_afiliado: gerarDeeplink(loja.merchant_id, urlProduto),
        thumbnail: (p.imagem || '').replace('http://', 'https://'),
        nicho: nichoReal,
        produto_id_externo: `awin_${loja.merchant_id}_${hashId(urlProduto)}`,
        frete_gratis: false,
        qtd_vendida: 0,
        ativo: true,
        score,
        score_detalhes: detalhes,
        loja_nome: loja.nome,
        updated_at: new Date().toISOString(),
      }
    }).filter(p => p.titulo && p.preco > 0)

    await supabaseAdmin
      .from('config_plataformas')
      .upsert({
        plataforma: 'cron_state',
        credenciais: {
          ...state,
          awin_loja_idx: (lojaIdx + 1) % lojas.length,
          awin_last_loja: loja.nome,
          awin_last_run: new Date().toISOString(),
          awin_last_metodo: metodo,
          awin_last_encontrados: produtosEncontrados.length,
        },
        ativo: false,
      }, { onConflict: 'plataforma' })

    if (produtosParaSalvar.length === 0) {
      const resp = {
        salvos: 0,
        total_encontrados: produtosEncontrados.length,
        loja: loja.nome,
        metodo,
        proxima_loja: lojas[(lojaIdx + 1) % lojas.length]?.nome,
      }
      await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'success', duracao_ms: Date.now() - t0, total_encontrados: 0, salvos: 0, request_json: { loja: loja.nome, metodo }, response_json: resp })
      return NextResponse.json(resp)
    }

    const { data: salvos, error } = await supabaseAdmin
      .from('produtos')
      .upsert(produtosParaSalvar, { onConflict: 'produto_id_externo,plataforma', ignoreDuplicates: false })
      .select('id')

    if (error) {
      await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'error', duracao_ms: Date.now() - t0, erro: error.message, request_json: { loja: loja.nome, metodo }, response_json: { error: error.message } })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const qtdSalvos = salvos?.length || produtosParaSalvar.length
    const respData = {
      salvos: qtdSalvos,
      total_encontrados: produtosEncontrados.length,
      loja: loja.nome,
      metodo,
      proxima_loja: lojas[(lojaIdx + 1) % lojas.length]?.nome,
      produtos: produtosParaSalvar.slice(0, 5).map(p => ({
        titulo: p.titulo,
        preco: p.preco,
        desconto: `${p.desconto_percent}%`,
      })),
    }

    await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'success', duracao_ms: Date.now() - t0, total_encontrados: produtosEncontrados.length, salvos: qtdSalvos, request_json: { loja: loja.nome, metodo }, response_json: respData })

    return NextResponse.json(respData)
  } catch (e: any) {
    await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'error', duracao_ms: Date.now() - t0, erro: e.message, response_json: { error: e.message } })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
