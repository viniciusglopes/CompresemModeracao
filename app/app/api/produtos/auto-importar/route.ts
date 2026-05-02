import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const AWIN_STORES: Record<string, { merchantId: string; tipo: 'vtex' | 'scrape'; dominio: string; categorias: string[] }> = {
  cea: {
    merchantId: '17648',
    tipo: 'vtex',
    dominio: 'www.cea.com.br',
    categorias: ['vestido feminino', 'blusa feminina', 'calça feminina', 'saia', 'tenis feminino', 'bolsa feminina', 'sandalia feminina', 'jaqueta feminina', 'shorts feminino', 'macacão feminino'],
  },
  vivara: {
    merchantId: '17662',
    tipo: 'vtex',
    dominio: 'www.vivara.com.br',
    categorias: ['brinco', 'anel', 'colar', 'pulseira', 'pingente', 'relogio feminino', 'argola', 'berloques'],
  },
  schutz: {
    merchantId: '80302',
    tipo: 'vtex',
    dominio: 'www.schutz.com.br',
    categorias: ['sandalia', 'tenis', 'scarpin', 'sapatilha', 'bota', 'rasteira', 'mule'],
  },
}

const MIN_DISCOUNT = 15
const MAX_PRODUCTS_PER_STORE = 10

interface DiscoveredProduct {
  titulo: string
  preco: number
  preco_original: number
  desconto: number
  link: string
  thumbnail: string
  loja: string
  merchantId: string
}

async function buscarProdutosVtex(dominio: string, categorias: string[], loja: string, merchantId: string): Promise<DiscoveredProduct[]> {
  const produtos: DiscoveredProduct[] = []
  const seen = new Set<string>()

  for (const cat of categorias) {
    if (produtos.length >= MAX_PRODUCTS_PER_STORE) break

    try {
      const res = await fetch(
        `https://${dominio}/api/catalog_system/pub/products/search/?ft=${encodeURIComponent(cat)}&_from=0&_to=49`,
        {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', Accept: 'application/json' },
          cache: 'no-store',
          signal: AbortSignal.timeout(15000),
        },
      )
      if (!res.ok) continue

      const data = await res.json()
      if (!Array.isArray(data)) continue

      for (const p of data) {
        if (produtos.length >= MAX_PRODUCTS_PER_STORE) break

        try {
          const item = p.items?.[0]
          const offer = item?.sellers?.[0]?.commertialOffer
          if (!offer) continue

          const price = offer.Price || 0
          const listPrice = offer.ListPrice || 0
          if (price <= 0 || listPrice <= price) continue

          const disc = Math.round((1 - price / listPrice) * 100)
          if (disc < MIN_DISCOUNT) continue

          const link = p.link || `https://${dominio}/${p.linkText}/p`
          if (seen.has(link)) continue
          seen.add(link)

          const img = item.images?.[0]?.imageUrl || ''

          produtos.push({
            titulo: p.productName || '',
            preco: price,
            preco_original: listPrice,
            desconto: disc,
            link,
            thumbnail: img.replace('http://', 'https://'),
            loja,
            merchantId,
          })
        } catch {}
      }
    } catch {}
  }

  produtos.sort((a, b) => b.desconto - a.desconto)
  return produtos.slice(0, MAX_PRODUCTS_PER_STORE)
}

async function gerarLinkAwin(merchantId: string, destUrl: string, token: string, publisherId: string) {
  try {
    const res = await fetch(`https://api.awin.com/publishers/${publisherId}/linkbuilder/generate?accessToken=${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ advertiserId: parseInt(merchantId), destinationUrl: destUrl, shorten: true }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return { url: data.url || '', shortUrl: data.shortUrl || '' }
  } catch {
    return null
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { loja, min_desconto, max_por_loja, apenas_preview } = body as {
      loja?: string
      min_desconto?: number
      max_por_loja?: number
      apenas_preview?: boolean
    }

    const { data: cfg } = await supabaseAdmin
      .from('config_plataformas')
      .select('credenciais')
      .eq('plataforma', 'awin')
      .maybeSingle()

    const awinToken = cfg?.credenciais?.api_token
    const publisherId = cfg?.credenciais?.publisher_id || '1778660'

    if (!awinToken) {
      return NextResponse.json({ error: 'Token AWIN não configurado' }, { status: 400 })
    }

    const lojas = loja
      ? { [loja]: AWIN_STORES[loja] }
      : AWIN_STORES

    const resultados: Record<string, { encontrados: number; salvos: number; produtos: any[] }> = {}
    let totalSalvos = 0

    for (const [nome, config] of Object.entries(lojas)) {
      if (!config) continue

      let produtos: DiscoveredProduct[] = []

      if (config.tipo === 'vtex') {
        produtos = await buscarProdutosVtex(config.dominio, config.categorias, nome, config.merchantId)
      }

      if (min_desconto) {
        produtos = produtos.filter(p => p.desconto >= min_desconto)
      }
      if (max_por_loja) {
        produtos = produtos.slice(0, max_por_loja)
      }

      const salvos: any[] = []

      for (const prod of produtos) {
        const awinLink = await gerarLinkAwin(prod.merchantId, prod.link, awinToken, publisherId)
        const linkAfiliado = awinLink?.shortUrl || awinLink?.url || prod.link

        const produtoId = `awin_${prod.merchantId}_${Buffer.from(prod.link).toString('base64url').slice(0, 30)}`

        const registro = {
          titulo: prod.titulo,
          preco: prod.preco,
          preco_original: prod.preco_original,
          desconto_percent: prod.desconto,
          plataforma: 'awin',
          link_original: prod.link,
          link_afiliado: linkAfiliado,
          thumbnail: prod.thumbnail,
          nicho: inferirNicho(prod.titulo),
          produto_id_externo: produtoId,
          frete_gratis: false,
          qtd_vendida: 0,
          ativo: true,
          loja_nome: nome.charAt(0).toUpperCase() + nome.slice(1),
          updated_at: new Date().toISOString(),
        }

        if (!apenas_preview) {
          const { error } = await supabaseAdmin
            .from('produtos')
            .upsert(registro, { onConflict: 'produto_id_externo,plataforma', ignoreDuplicates: false })

          if (!error) {
            totalSalvos++
            salvos.push({ titulo: prod.titulo, desconto: prod.desconto, link_afiliado: linkAfiliado })
          }
        } else {
          salvos.push(registro)
        }
      }

      resultados[nome] = {
        encontrados: produtos.length,
        salvos: salvos.length,
        produtos: salvos,
      }
    }

    return NextResponse.json({
      ok: true,
      total_salvos: totalSalvos,
      resultados,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function inferirNicho(titulo: string): string {
  const t = titulo.toLowerCase()
  if (/(tênis|tenis|sapato|chinelo|bota|sandália|sandalia|scarpin|sapatilha|rasteira|mule)/.test(t)) return 'calcados'
  if (/(vestido|blusa|calça|camisa|bermuda|moletom|jaqueta|bolsa|saia|shorts|macacão)/.test(t)) return 'moda'
  if (/(brinco|anel|colar|pulseira|pingente|berloques|argola|joia)/.test(t)) return 'joias'
  if (/(relógio|relogio)/.test(t)) return 'relogios'
  if (/(perfume|maquiagem|hidratante|shampoo|creme)/.test(t)) return 'beleza'
  return 'moda'
}
