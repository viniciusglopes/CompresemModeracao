import { NextResponse } from 'next/server'
import { detectarNichoRegex } from '@/lib/nicho'
import { supabaseAdmin } from '@/lib/supabase'
import { calcularScore } from '@/lib/score'
import { logApi } from '@/lib/api-logger'

const LOMADEE_API = 'https://api-beta.lomadee.com.br/affiliate'

const CATEGORIAS_LOMADEE: Record<string, { label: string; keywords: string[]; emoji: string }> = {
  moda:       { label: 'Moda Feminina',    keywords: ['vestido feminino', 'blusa feminina', 'calça jeans feminina', 'saia', 'cropped', 'body feminino', 'legging', 'casaco feminino', 'jaqueta feminina', 'pijama feminino'], emoji: '👗' },
  bolsas:     { label: 'Bolsas e Acessórios', keywords: ['bolsa feminina', 'mochila feminina', 'carteira feminina', 'nécessaire', 'mala viagem'], emoji: '👜' },
  lingerie:   { label: 'Lingerie e Meia',  keywords: ['lingerie', 'sutiã', 'calcinha', 'meia calça', 'pijama'], emoji: '🩱' },
  beleza:     { label: 'Beleza e Skincare', keywords: ['perfume feminino', 'creme corporal', 'hidratante facial', 'sérum', 'óleo corporal', 'sabonete líquido', 'loção'], emoji: '💄' },
  calcados:   { label: 'Calçados Femininos', keywords: ['sandália feminina', 'bota feminina', 'tênis feminino', 'sapatilha', 'scarpin', 'rasteirinha'], emoji: '👠' },
  casa:       { label: 'Casa e Decoração',  keywords: ['jogo de cama', 'toalha banho', 'cortina', 'tapete', 'organizador', 'luminária', 'edredom', 'travesseiro'], emoji: '🏠' },
  eletro:     { label: 'Eletro e Lifestyle', keywords: ['secador cabelo', 'chapinha', 'airfryer', 'cafeteira', 'aspirador robô', 'liquidificador', 'umidificador'], emoji: '✨' },
}

// Classificacao vem do modulo unico (@/lib/nicho). A copia local que existia
// aqui devolvia ids que NAO existem no cadastro de grupos, entao o produto
// nunca casava com grupo nenhum.
const nichoFromTitulo = detectarNichoRegex

async function fetchLomadeeProducts(apiKey: string, keyword: string, page: number = 1): Promise<any[]> {
  const params = new URLSearchParams({
    search: keyword,
    page: String(page),
    size: '50',
  })

  const res = await fetch(`${LOMADEE_API}/products?${params}`, {
    headers: { 'x-api-key': apiKey },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  })

  if (res.status === 429) throw new Error('rate_limit')
  if (!res.ok) return []

  const json = await res.json()
  const items = json.data || json.products || []
  return items.map((item: any) => {
    const pricing = item.options?.[0]?.pricing?.[0] || {}
    return {
      id: item.id,
      name: item.name,
      listPrice: pricing.listPrice || 0,
      price: pricing.price || 0,
      images: item.images || [],
      url: item.url || '',
      seller: item.options?.[0]?.seller || '',
      available: item.available,
      organizationId: item.organizationId || '',
    }
  })
}

async function generateDeeplink(apiKey: string, organizationId: string, url: string): Promise<string | null> {
  try {
    const res = await fetch(`${LOMADEE_API}/shortener/url`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId, type: 'Custom', url }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const shortUrl = data?.[0]?.shortUrls?.[0]
    return shortUrl || null
  } catch {
    return null
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function POST(request: Request) {
  const t0 = Date.now()
  try {
    const body = await request.json().catch(() => ({}))
    const nicho = body.nicho || 'eletronicos'
    const limite = Math.min(body.limite || 20, 50)

    const catConfig = CATEGORIAS_LOMADEE[nicho]
    if (!catConfig) {
      return NextResponse.json({ error: `Nicho inválido: ${nicho}` }, { status: 400 })
    }

    const { data: cfg } = await supabaseAdmin
      .from('config_plataformas')
      .select('credenciais, ativo')
      .eq('plataforma', 'lomadee')
      .maybeSingle()

    if (!cfg?.ativo) {
      return NextResponse.json({ error: 'Lomadee está desativado. Ative na página de Plataformas.' }, { status: 400 })
    }

    const apiKey: string = cfg.credenciais?.api_key || ''
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key Lomadee não configurada.' }, { status: 400 })
    }

    const allProducts: any[] = []

    for (const keyword of catConfig.keywords) {
      try {
        const items = await fetchLomadeeProducts(apiKey, keyword)
        allProducts.push(...items)
      } catch (e: any) {
        if (e.message === 'rate_limit') {
          await logApi({ plataforma: 'lomadee', endpoint: '/busca/lomadee', status: 'rate_limit', nicho, duracao_ms: Date.now() - t0, erro: 'Rate limit atingido', request_json: { nicho, limite }, response_json: { error: 'rate_limit' } })
          return NextResponse.json({ error: 'Limite de chamadas Lomadee atingido. Aguarde.' }, { status: 429 })
        }
        throw e
      }
      await sleep(7000)
    }

    const seen = new Set<string>()
    const uniqueProducts = allProducts.filter(p => {
      const key = p.id?.toString() || p.name
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const comDesconto = uniqueProducts.filter(p => {
      if (!p.listPrice || !p.price || p.listPrice <= p.price) return false
      const desconto = Math.round(((p.listPrice - p.price) / p.listPrice) * 100)
      if (desconto < 10) return false
      return true
    })

    if (comDesconto.length === 0) {
      const resp = { salvos: 0, total_encontrados: uniqueProducts.length, msg: 'Nenhum produto com desconto encontrado', nicho: catConfig.label }
      await logApi({ plataforma: 'lomadee', endpoint: '/busca/lomadee', status: 'success', nicho, duracao_ms: Date.now() - t0, total_encontrados: uniqueProducts.length, salvos: 0, request_json: { nicho, limite }, response_json: resp })
      return NextResponse.json(resp)
    }

    const selected = comDesconto.slice(0, limite)
    const produtos = []
    for (const item of selected) {
      const preco = item.price
      const precoOriginal = item.listPrice
      const descontoPercent = Math.round(((precoOriginal - preco) / precoOriginal) * 100)
      const nichoReal = nichoFromTitulo(item.name || '') ?? nicho
      const thumbnail = item.images?.[0]?.url || ''
      if (!thumbnail) continue
      const linkOriginal = item.url || ''
      const seller = item.seller || ''

      let linkAfiliado = linkOriginal
      if (item.organizationId && linkOriginal) {
        const deeplink = await generateDeeplink(apiKey, item.organizationId, linkOriginal)
        if (deeplink) linkAfiliado = deeplink
      }

      const { score, detalhes } = calcularScore({
        vendas: 0,
        desconto_percent: descontoPercent,
        rating: 0,
        frete_gratis: false,
        loja_premium: !!seller,
        comissao_percent: 0,
      })

      produtos.push({
        titulo: item.name,
        preco,
        preco_original: precoOriginal,
        desconto_percent: descontoPercent,
        plataforma: 'lomadee',
        link_original: linkOriginal,
        link_afiliado: linkAfiliado,
        thumbnail: thumbnail.replace('http://', 'https://'),
        nicho: nichoReal,
        produto_id_externo: `lomadee_${item.id}`,
        frete_gratis: false,
        qtd_vendida: 0,
        ativo: true,
        score,
        score_detalhes: detalhes,
        updated_at: new Date().toISOString(),
      })
    }

    const { data: salvos, error } = await supabaseAdmin
      .from('produtos')
      .upsert(produtos, { onConflict: 'produto_id_externo,plataforma', ignoreDuplicates: false })
      .select('id')

    if (error) {
      await logApi({ plataforma: 'lomadee', endpoint: '/busca/lomadee', status: 'error', nicho, duracao_ms: Date.now() - t0, erro: error.message, request_json: { nicho, limite }, response_json: { error: error.message } })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const qtdSalvos = salvos?.length || produtos.length
    const respData = {
      salvos: qtdSalvos,
      total_encontrados: uniqueProducts.length,
      com_desconto: comDesconto.length,
      nicho: catConfig.label,
      lojas: [...new Set(comDesconto.map(p => p.seller || 'N/A'))],
      produtos: produtos.map(p => ({
        titulo: p.titulo,
        preco: p.preco,
        preco_original: p.preco_original,
        desconto: `${p.desconto_percent}%`,
        loja: comDesconto.find(c => `lomadee_${c.id}` === p.produto_id_externo)?.seller || '',
      })),
    }
    await logApi({ plataforma: 'lomadee', endpoint: '/busca/lomadee', status: 'success', nicho, duracao_ms: Date.now() - t0, total_encontrados: uniqueProducts.length, salvos: qtdSalvos, request_json: { nicho, limite }, response_json: respData })

    return NextResponse.json(respData)
  } catch (e: any) {
    await logApi({ plataforma: 'lomadee', endpoint: '/busca/lomadee', status: 'error', duracao_ms: Date.now() - t0, erro: e.message, response_json: { error: e.message } })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const nicho = searchParams.get('nicho')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabaseAdmin
    .from('produtos')
    .select('*')
    .eq('plataforma', 'lomadee')
    .eq('ativo', true)
    .order('desconto_percent', { ascending: false })
    .limit(limit)

  if (nicho) query = query.eq('nicho', nicho)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ produtos: data, total: data?.length || 0 })
}
