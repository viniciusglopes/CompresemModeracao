import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calcularScore } from '@/lib/score'
import { logApi } from '@/lib/api-logger'

const AWIN_API = 'https://api.awin.com'

const CATEGORIAS_AWIN: Record<string, { label: string; keywords: string[]; emoji: string }> = {
  eletronicos:      { label: 'Eletrônicos',              keywords: ['smartphone', 'celular', 'fone bluetooth', 'smartwatch', 'carregador'], emoji: '📱' },
  informatica:      { label: 'Informática',              keywords: ['notebook', 'mouse gamer', 'teclado', 'monitor', 'ssd'], emoji: '💻' },
  eletrodomesticos: { label: 'Eletrodomésticos',         keywords: ['fritadeira', 'aspirador', 'liquidificador', 'cafeteira', 'ventilador'], emoji: '🏠' },
  games:            { label: 'Games',                    keywords: ['playstation', 'xbox', 'nintendo switch', 'headset gamer'], emoji: '🎮' },
  moda:             { label: 'Moda',                     keywords: ['vestido', 'blusa feminina', 'calça jeans', 'tênis'], emoji: '👗' },
  beleza:           { label: 'Beleza',                   keywords: ['perfume', 'maquiagem', 'hidratante', 'shampoo'], emoji: '💄' },
  casa:             { label: 'Casa e Decoração',         keywords: ['luminária', 'cortina', 'tapete', 'organizador'], emoji: '🛋️' },
  esportes:         { label: 'Esportes',                 keywords: ['tênis corrida', 'halter', 'bicicleta', 'whey protein'], emoji: '⚽' },
  bebes:            { label: 'Bebês',                    keywords: ['fralda', 'carrinho bebê', 'mamadeira'], emoji: '🍼' },
  pet:              { label: 'Pet Shop',                 keywords: ['ração cachorro', 'ração gato', 'coleira'], emoji: '🐾' },
  ferramentas:      { label: 'Ferramentas',              keywords: ['furadeira', 'parafusadeira', 'alicate'], emoji: '🔧' },
  brinquedos:       { label: 'Brinquedos',               keywords: ['lego', 'boneca', 'quebra-cabeça'], emoji: '🧸' },
}

function nichoFromTitulo(titulo: string): string | null {
  const t = titulo.toLowerCase()
  if (/(celular|smartphone|iphone|samsung|xiaomi|fone|smartwatch|carregador|power.?bank|caixa de som)/.test(t)) return 'eletronicos'
  if (/(notebook|laptop|mouse|teclado|monitor|ssd|pendrive|webcam|impressora)/.test(t)) return 'informatica'
  if (/(fritadeira|air.?fryer|aspirador|liquidificador|cafeteira|ventilador|micro.?ondas|geladeira)/.test(t)) return 'eletrodomesticos'
  if (/(playstation|ps[45]|xbox|nintendo|headset gamer|console)/.test(t)) return 'games'
  if (/(vestido|blusa|calça|camisa|bermuda|moletom|jaqueta|saia|bolsa|óculos|relógio)/.test(t)) return 'moda'
  if (/(perfume|maquiagem|batom|hidratante|shampoo|protetor solar|sérum|esmalte)/.test(t)) return 'beleza'
  if (/(luminária|cortina|tapete|organizador|jogo de cama|travesseiro|edredom)/.test(t)) return 'casa'
  if (/(tênis|tenis|halter|bicicleta|esteira|chuteira|whey|creatina)/.test(t)) return 'esportes'
  if (/(fralda|carrinho.*bebê|mamadeira|chupeta|berço)/.test(t)) return 'bebes'
  if (/(ração|coleira|brinquedo.*(cão|gato|cachorro|pet)|areia.*gato)/.test(t)) return 'pet'
  if (/(furadeira|parafusadeira|alicate|esmerilhadeira|serra)/.test(t)) return 'ferramentas'
  if (/(lego|boneca|hot wheels|nerf|quebra-cabeça|brinquedo)/.test(t)) return 'brinquedos'
  return null
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function POST(request: Request) {
  const t0 = Date.now()
  try {
    const body = await request.json().catch(() => ({}))
    const limite = Math.min(body.limite || 20, 50)
    const nicho = body.nicho || 'eletronicos'

    const nichoConfig = CATEGORIAS_AWIN[nicho]
    if (!nichoConfig) {
      return NextResponse.json({ error: `Nicho inválido: ${nicho}` }, { status: 400 })
    }

    const { data: cfg } = await supabaseAdmin
      .from('config_plataformas')
      .select('credenciais, ativo')
      .eq('plataforma', 'awin')
      .maybeSingle()

    if (!cfg?.ativo) {
      return NextResponse.json({ error: 'AWIN está desativada' }, { status: 400 })
    }

    const token = cfg.credenciais?.api_token
    const publisherId = cfg.credenciais?.publisher_id
    if (!token || !publisherId) {
      return NextResponse.json({ error: 'Token ou Publisher ID não configurados' }, { status: 400 })
    }

    const keyword = nichoConfig.keywords[Math.floor(Math.random() * nichoConfig.keywords.length)]
    const url = `${AWIN_API}/publishers/${publisherId}/product-search?keyword=${encodeURIComponent(keyword)}&region=BR&language=pt&minPrice=10&maxPrice=5000`

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    })

    if (res.status === 429) {
      await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'rate_limit', nicho, duracao_ms: Date.now() - t0, erro: 'Rate limit', request_json: { nicho, keyword }, response_json: { error: 'rate_limit' } })
      return NextResponse.json({ error: 'Rate limit AWIN. Aguarde.' }, { status: 429 })
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText)
      await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'error', nicho, duracao_ms: Date.now() - t0, erro: `HTTP ${res.status}: ${errText}`, request_json: { nicho, keyword }, response_json: { error: errText } })
      return NextResponse.json({ error: `AWIN API error: ${res.status}` }, { status: 500 })
    }

    const data = await res.json()
    const products = Array.isArray(data) ? data : data.products || data.productList || []

    if (products.length === 0) {
      const resp = { salvos: 0, total_encontrados: 0, nicho: nichoConfig.label, keyword }
      await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'success', nicho, duracao_ms: Date.now() - t0, total_encontrados: 0, salvos: 0, request_json: { nicho, keyword }, response_json: resp })
      return NextResponse.json(resp)
    }

    const produtosParaSalvar = products.slice(0, limite).map((p: any) => {
      const preco = parseFloat(p.search_price || p.price || p.aw_price || '0')
      const precoOriginal = parseFloat(p.rrp_price || p.store_price || '0')
      const temDesconto = precoOriginal > 0 && precoOriginal > preco
      const descontoPercent = temDesconto ? Math.round(((precoOriginal - preco) / precoOriginal) * 100) : 0
      const titulo = p.product_name || p.productName || ''
      const nichoReal = nichoFromTitulo(titulo) || nicho

      const { score, detalhes } = calcularScore({
        vendas: 0,
        desconto_percent: descontoPercent,
        rating: 0,
        frete_gratis: false,
        loja_premium: false,
        comissao_percent: 0,
      })

      return {
        titulo,
        preco,
        preco_original: temDesconto ? precoOriginal : preco,
        desconto_percent: descontoPercent,
        plataforma: 'awin',
        link_original: p.merchant_deep_link || p.merchantDeepLink || p.aw_deep_link || p.awDeepLink || '',
        link_afiliado: p.aw_deep_link || p.awDeepLink || p.merchant_deep_link || '',
        thumbnail: (p.merchant_image_url || p.aw_image_url || p.merchantImageUrl || p.awImageUrl || '').replace('http://', 'https://'),
        nicho: nichoReal,
        produto_id_externo: `awin_${p.aw_product_id || p.product_id || p.productId || Math.random().toString(36).slice(2)}`,
        frete_gratis: false,
        qtd_vendida: 0,
        ativo: true,
        score,
        score_detalhes: detalhes,
        updated_at: new Date().toISOString(),
      }
    }).filter((p: any) => p.titulo && p.preco > 0)

    if (produtosParaSalvar.length === 0) {
      const resp = { salvos: 0, total_encontrados: products.length, nicho: nichoConfig.label, keyword }
      await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'success', nicho, duracao_ms: Date.now() - t0, total_encontrados: products.length, salvos: 0, request_json: { nicho, keyword }, response_json: resp })
      return NextResponse.json(resp)
    }

    const { data: salvos, error } = await supabaseAdmin
      .from('produtos')
      .upsert(produtosParaSalvar, { onConflict: 'produto_id_externo', ignoreDuplicates: false })
      .select('id')

    if (error) {
      await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'error', nicho, duracao_ms: Date.now() - t0, erro: error.message, request_json: { nicho, keyword }, response_json: { error: error.message } })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const qtdSalvos = salvos?.length || produtosParaSalvar.length
    const respData = {
      salvos: qtdSalvos,
      total_encontrados: products.length,
      nicho: nichoConfig.label,
      keyword,
      produtos: produtosParaSalvar.slice(0, 5).map((p: any) => ({
        titulo: p.titulo,
        preco: p.preco,
        desconto: `${p.desconto_percent}%`,
      })),
    }

    await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'success', nicho, duracao_ms: Date.now() - t0, total_encontrados: products.length, salvos: qtdSalvos, request_json: { nicho, keyword }, response_json: respData })

    return NextResponse.json(respData)
  } catch (e: any) {
    await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'error', duracao_ms: Date.now() - t0, erro: e.message, response_json: { error: e.message } })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
