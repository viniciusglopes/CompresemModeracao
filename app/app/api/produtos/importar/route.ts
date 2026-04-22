import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getMlAccessToken } from '@/lib/ml-auth'

const ML_API = 'https://api.mercadolibre.com'

// ─── Detecta plataforma e extrai ID da URL ───────────────────────────────────

function detectarPlataforma(url: string): { plataforma: string; produtoId: string | null } {
  try {
    const u = new URL(url)
    const host = u.hostname.toLowerCase()
    const path = u.pathname

    if (host.includes('mercadolivre') || host.includes('mercadopago') || host.includes('meli')) {
      // Catalog: /p/MLBxxxxx
      const catalogMatch = path.match(/\/p\/(MLB\d+)/i)
      if (catalogMatch) return { plataforma: 'mercadolivre', produtoId: catalogMatch[1] }
      // Item: MLB-XXXXXX-xx ou MLBxxxxxxxx
      const itemMatch = path.match(/MLB[- _]?(\d+)/i) || url.match(/MLB[- _]?(\d+)/i)
      if (itemMatch) return { plataforma: 'mercadolivre', produtoId: `MLB${itemMatch[1]}` }
      return { plataforma: 'mercadolivre', produtoId: null }
    }

    if (host.includes('shopee')) {
      // /product/{shopId}/{itemId} ou i.{shopId}.{itemId}
      const m = path.match(/\/product\/(\d+)\/(\d+)/) || url.match(/i\.(\d+)\.(\d+)/)
      if (m) return { plataforma: 'shopee', produtoId: `${m[1]}_${m[2]}` }
      return { plataforma: 'shopee', produtoId: null }
    }

    if (host.includes('amazon') || host.includes('amzn')) {
      const asin = path.match(/\/dp\/([A-Z0-9]{10})/i) || path.match(/\/gp\/product\/([A-Z0-9]{10})/i)
      if (asin) return { plataforma: 'amazon', produtoId: asin[1] }
      return { plataforma: 'amazon', produtoId: null }
    }

    if (host.includes('aliexpress') || host.includes('ali')) {
      const m = path.match(/\/item\/(\d+)/) || url.match(/item\/(\d+)/)
      if (m) return { plataforma: 'aliexpress', produtoId: m[1] }
      return { plataforma: 'aliexpress', produtoId: null }
    }

    return { plataforma: 'outro', produtoId: null }
  } catch {
    return { plataforma: 'outro', produtoId: null }
  }
}

// ─── Busca dados via ML API ───────────────────────────────────────────────────

async function fetchMlProduto(produtoId: string, token: string) {
  // Tenta como catalog product primeiro
  if (produtoId.match(/^MLB\d+$/) && !produtoId.match(/^MLB\d{6,}$/)) {
    // IDs curtos (MLB1234567) são items
  }

  // Tenta item direto
  const itemRes = await fetch(`${ML_API}/items/${produtoId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (itemRes.ok) {
    const item = await itemRes.json()
    if (!item.error) {
      return {
        titulo: item.title,
        preco: item.price,
        preco_original: item.original_price || item.price,
        thumbnail: (item.thumbnail || '').replace('http://', 'https://'),
        permalink: item.permalink || `https://www.mercadolivre.com.br/p/${produtoId}`,
        domain_id: item.domain_id || '',
        produto_id_externo: item.id,
      }
    }
  }

  // Tenta como catalog
  const prodRes = await fetch(`${ML_API}/products/${produtoId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  if (prodRes.ok) {
    const prod = await prodRes.json()
    if (!prod.error) {
      // Busca itens do catalog para pegar preço
      const itemsRes = await fetch(`${ML_API}/products/${produtoId}/items?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      })
      let preco = 0
      let precoOriginal = 0
      if (itemsRes.ok) {
        const itemsData = await itemsRes.json()
        const items: any[] = Array.isArray(itemsData) ? itemsData : itemsData.results || []
        const melhor = items.reduce((best: any, it: any) => {
          if (!best || it.price < best.price) return it
          return best
        }, null)
        if (melhor) {
          preco = melhor.price
          precoOriginal = melhor.original_price || melhor.price
        }
      }
      return {
        titulo: prod.name || prod.family_name || produtoId,
        preco,
        preco_original: precoOriginal,
        thumbnail: (prod.pictures?.[0]?.url || '').replace('http://', 'https://'),
        permalink: prod.permalink || `https://www.mercadolivre.com.br/p/${produtoId}`,
        domain_id: prod.domain_id || '',
        produto_id_externo: produtoId,
      }
    }
  }

  return null
}

// ─── Scraping genérico via Open Graph / JSON-LD ───────────────────────────────

async function fetchHtml(url: string, ua: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': ua, 'Accept': 'text/html,application/xhtml+xml', 'Accept-Language': 'pt-BR,pt;q=0.9' },
    cache: 'no-store',
    signal: AbortSignal.timeout(12000),
    redirect: 'follow',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

async function scrapeUrl(url: string) {
  // Tenta com UA do Facebook primeiro (força SSR/OG em SPAs), depois Chrome
  let html = ''
  try {
    html = await fetchHtml(url, 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)')
  } catch {
    html = await fetchHtml(url, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
  }

  const meta = (name: string) => {
    const m = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, 'i'))
      || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["']${name}["']`, 'i'))
    return m?.[1] || null
  }

  // JSON-LD — tenta todos os blocos no HTML
  let jsonLd: any = null
  const ldMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
  for (const match of ldMatches) {
    try {
      const parsed = JSON.parse(match[1])
      const arr = Array.isArray(parsed) ? parsed : [parsed]
      const prod = arr.find((o: any) => o['@type'] === 'Product')
      if (prod) { jsonLd = prod; break }
    } catch {}
  }

  const titulo = (jsonLd?.name || meta('og:title') || meta('twitter:title') || '')
    .replace(/\s*\|\s*.+$/, '').trim() // remove " | Shopee Brasil", "| Amazon"

  const thumbnail = (Array.isArray(jsonLd?.image) ? jsonLd.image[0] : jsonLd?.image)
    || meta('og:image') || meta('twitter:image') || ''

  let preco = 0
  let precoOriginal = 0

  // 1. JSON-LD offers
  if (jsonLd?.offers) {
    const offers = Array.isArray(jsonLd.offers) ? jsonLd.offers : [jsonLd.offers]
    const offer = offers[0]
    preco = parseFloat(String(offer?.price || offer?.lowPrice || '0').replace(',', '.')) || 0
    precoOriginal = parseFloat(String(offer?.highPrice || offer?.price || '0').replace(',', '.')) || preco
  }

  // 2. Meta tags de produto
  if (!preco) {
    const priceStr = meta('product:price:amount') || meta('og:price:amount') || meta('twitter:data1')
    if (priceStr) {
      preco = parseFloat(priceStr.replace(/[^\d,.]/g, '').replace(',', '.')) || 0
      precoOriginal = preco
    }
  }

  // 3. Padrões comuns no HTML (Magalu, Americanas, Casas Bahia, etc.)
  if (!preco) {
    const m1 = html.match(/"price"\s*:\s*([\d]+\.[\d]{1,2})(?!\d)/)
    if (m1) { preco = parseFloat(m1[1]); precoOriginal = preco }
  }
  if (!preco) {
    const m2 = html.match(/R\$\s*([\d]{1,4}[,.][\d]{2})/)
    if (m2) { preco = parseFloat(m2[1].replace(',', '.')); precoOriginal = preco }
  }

  return { titulo, thumbnail: typeof thumbnail === 'string' ? thumbnail : '', preco, precoOriginal }
}

// ─── Determina nicho pelo título e plataforma ─────────────────────────────────

function inferirNicho(titulo: string): string {
  const t = titulo.toLowerCase()
  if (/(celular|smartphone|iphone|samsung galaxy|motorola|xiaomi|redmi)/.test(t)) return 'eletronicos'
  if (/(liquidificador|geladeira|fogão|máquina de lavar|micro-ondas|aspirador|ar-condicionado|fritadeira)/.test(t)) return 'eletrodomesticos'
  if (/(notebook|laptop|computador|monitor|teclado|mouse|impressora|hd externo|ssd|placa)/.test(t)) return 'informatica'
  if (/(televisão|tv \d|smart tv|headphone|fone de ouvido|caixa de som|soundbar)/.test(t)) return 'audio_video'
  if (/(câmera|gopro|drone|instax|canon|nikon)/.test(t)) return 'cameras'
  if (/(playstation|ps[45]|xbox|nintendo switch|controle sem fio)/.test(t)) return 'games'
  if (/(tênis |tenis |sapato |chinelo |bota |sandália )/.test(t)) return 'calcados'
  if (/(vestido|blusa|calça jeans|camisa|bermuda|moletom|jaqueta|bolsa)/.test(t)) return 'moda'
  if (/(shampoo|perfume|maquiagem|hidratante|filtro solar|creme)/.test(t)) return 'beleza'
  if (/(sofá|colchão|armário|mesa|cadeira|guarda-roupa|tapete|lençol)/.test(t)) return 'casa_moveis'
  if (/(furadeira|parafusadeira|esmerilhadeira|chave de fenda|alicate)/.test(t)) return 'ferramentas'
  if (/(bicicleta|esteira|halter|suplemento esportivo|whey|chuteira|skate)/.test(t)) return 'esportes'
  if (/(fralda|carrinho de bebê|berço|mamadeira)/.test(t)) return 'bebes'
  if (/(lego|boneca|hot wheels|nerf|quebra-cabeça)/.test(t)) return 'brinquedos'
  if (/(ração|coleira|petisco|areia para gato|aquário)/.test(t)) return 'pet_shop'
  if (/(vitamina|termômetro|aparelho de pressão|suplemento)/.test(t)) return 'saude'
  if (/(guitarra|violão|piano|bateria|teclado musical)/.test(t)) return 'musica'
  if (/(café|chocolate|biscoito|suco|cerveja|vinho|azeite)/.test(t)) return 'alimentos'
  if (/(livro|romance|mangá|hq|bíblia|dicionário)/.test(t)) return 'livros'
  return 'eletronicos'
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      url,
      nicho: nichoOverride,
      link_afiliado,
      apenas_preview,
      // Permite passar preço diretamente (para automação via Coowork/N8N ou preenchimento manual)
      preco: precoBody,
      preco_original: precoOriginalBody,
      preco_override,          // alias legado
      preco_original_override, // alias legado
    } = body

    const precoManual = Number(precoBody || preco_override) || 0
    const precoOrigManual = Number(precoOriginalBody || preco_original_override) || 0

    if (!url) return NextResponse.json({ error: 'url é obrigatório' }, { status: 400 })

    const { plataforma, produtoId } = detectarPlataforma(url)

    let dados: any = null

    // ── Mercado Livre: usa API oficial ──
    if (plataforma === 'mercadolivre' && produtoId) {
      const token = await getMlAccessToken()
      if (!token) return NextResponse.json({ error: 'Token ML não disponível' }, { status: 400 })
      dados = await fetchMlProduto(produtoId, token)
    }

    // ── Outros ou fallback: scraping ──
    if (!dados) {
      const scraped = await scrapeUrl(url)
      dados = {
        titulo: scraped.titulo,
        preco: scraped.preco,
        preco_original: scraped.precoOriginal,
        thumbnail: scraped.thumbnail,
        permalink: url,
        domain_id: '',
        produto_id_externo: produtoId || `manual_${Date.now()}`,
      }
    }

    // Título vazio = falha total; preço 0 é aceitável (usuário preenche manualmente)
    if (!dados?.titulo) {
      return NextResponse.json({ error: 'Não foi possível obter informações do produto nesta URL. Tente com o link direto da plataforma (ex: shopee.com.br/produto/...).' }, { status: 422 })
    }

    // Aplica preços manuais/automação se fornecidos (têm prioridade sobre scraping)
    if (precoManual > 0) dados.preco = precoManual
    if (precoOrigManual > 0) dados.preco_original = precoOrigManual

    const desconto = dados.preco_original > dados.preco && dados.preco > 0
      ? Math.round(((dados.preco_original - dados.preco) / dados.preco_original) * 100)
      : 0

    const nicho = nichoOverride || inferirNicho(dados.titulo)

    const produto = {
      titulo: dados.titulo,
      preco: dados.preco,
      preco_original: dados.preco_original || dados.preco,
      desconto_percent: desconto,
      plataforma,
      link_original: dados.permalink || url,
      link_afiliado: link_afiliado || dados.permalink || url,
      thumbnail: dados.thumbnail || '',
      nicho,
      produto_id_externo: dados.produto_id_externo,
      frete_gratis: false,
      qtd_vendida: 0,
      ativo: true,
      updated_at: new Date().toISOString(),
    }

    // Se for apenas preview, retorna sem salvar
    if (apenas_preview) {
      return NextResponse.json({ preview: produto })
    }

    // Salva no banco
    const { data: salvo, error } = await supabaseAdmin
      .from('produtos')
      .upsert(produto, { onConflict: 'produto_id_externo', ignoreDuplicates: false })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, produto: { ...produto, id: salvo?.id } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
