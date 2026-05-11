import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calcularScore } from '@/lib/score'
import { logApi } from '@/lib/api-logger'

const LOMADEE_API = 'https://api-beta.lomadee.com.br/affiliate'

const CATEGORIAS_LOMADEE: Record<string, { label: string; keywords: string[]; emoji: string }> = {
  eletronicos:      { label: 'Eletrônicos',              keywords: ['celular', 'smartphone', 'fone bluetooth', 'smartwatch', 'carregador'], emoji: '📱' },
  informatica:      { label: 'Informática',              keywords: ['notebook', 'mouse gamer', 'teclado', 'monitor', 'ssd', 'webcam'], emoji: '💻' },
  eletrodomesticos: { label: 'Eletrodomésticos',         keywords: ['fritadeira airfryer', 'aspirador', 'liquidificador', 'ventilador', 'cafeteira'], emoji: '🏠' },
  games:            { label: 'Games',                    keywords: ['controle ps5', 'headset gamer', 'console', 'nintendo switch'], emoji: '🎮' },
  moda:             { label: 'Moda Feminina',            keywords: ['vestido feminino', 'blusa feminina', 'calça jeans feminina', 'saia'], emoji: '👗' },
  moda_masc:        { label: 'Moda Masculina',           keywords: ['camisa masculina', 'calça masculina', 'bermuda masculina', 'moletom'], emoji: '👔' },
  beleza:           { label: 'Beleza e Cuidado Pessoal', keywords: ['perfume', 'maquiagem', 'hidratante', 'shampoo', 'protetor solar'], emoji: '💄' },
  casa:             { label: 'Casa e Decoração',         keywords: ['luminária', 'cortina', 'organizador', 'tapete', 'jogo de cama'], emoji: '🛋️' },
  esportes:         { label: 'Esportes e Lazer',         keywords: ['tênis corrida', 'halter', 'bicicleta', 'garrafa térmica'], emoji: '⚽' },
  bebes:            { label: 'Bebês e Crianças',         keywords: ['fralda', 'carrinho bebê', 'mamadeira', 'roupa bebê'], emoji: '🍼' },
  pet:              { label: 'Pet Shop',                 keywords: ['ração cachorro', 'ração gato', 'coleira', 'cama pet'], emoji: '🐾' },
  ferramentas:      { label: 'Ferramentas',              keywords: ['furadeira', 'parafusadeira', 'alicate', 'trena'], emoji: '🔧' },
  calcados:         { label: 'Calçados',                 keywords: ['tênis masculino', 'tênis feminino', 'sandália', 'bota'], emoji: '👟' },
  casa_moveis:      { label: 'Casa e Móveis',            keywords: ['sofá', 'colchão', 'armário', 'mesa escritório'], emoji: '🛋️' },
  brinquedos:       { label: 'Brinquedos',               keywords: ['lego', 'boneca', 'carrinho', 'quebra-cabeça'], emoji: '🧸' },
}

function nichoFromTitulo(titulo: string): string | null {
  const t = titulo.toLowerCase()
  if (/(celular|smartphone|iphone|samsung galaxy|xiaomi|redmi|fone (de ouvido|bluetooth)|smartwatch|carregador (turbo|rápido|tipo c|usb)|power ?bank|caixa de som|cabo (usb|hdmi|lightning))/.test(t)) return 'eletronicos'
  if (/(notebook|laptop|mouse (gamer|sem fio)|teclado (mecânico|gamer)|monitor\b|ssd|pendrive|webcam|impressora|placa de vídeo|memória ram|hd externo)/.test(t)) return 'informatica'
  if (/(fritadeira|air ?fryer|aspirador|liquidificador|ventilador|cafeteira|micro.?ondas|geladeira|máquina de lavar|fogão|ar.condicionado|panela|ferro de passar)/.test(t)) return 'eletrodomesticos'
  if (/(playstation|ps[45]|xbox|nintendo|controle (gamer|ps|xbox)|headset gamer|jogo (ps|xbox|switch)|console)/.test(t)) return 'games'
  if (/(vestido|blusa feminina|saia|calça (jeans )?feminina|moda feminina|body feminino|cropped|biquíni|legging)/.test(t)) return 'moda'
  if (/(camisa masculina|calça masculina|bermuda|moletom masculino|camiseta masculina|polo masculin|cueca)/.test(t)) return 'moda_masc'
  if (/(perfume|maquiagem|batom|hidratante|shampoo|condicionador|protetor solar|sérum|esmalte|creme (facial|corporal)|desodorante)/.test(t)) return 'beleza'
  if (/(luminária|cortina|tapete|organizador|jogo de cama|travesseiro|edredom|lençol|vaso|quadro decorativo|toalha)/.test(t)) return 'casa'
  if (/(sofá|colchão|armário|mesa|cadeira (gamer|escritório)|guarda-roupa|estante|rack)/.test(t)) return 'casa_moveis'
  if (/(tênis|tenis|halter|anilha|bicicleta|esteira|garrafa térmica|chuteira|whey|creatina|suplemento)/.test(t)) return 'esportes'
  if (/(fralda|carrinho (de )?bebê|mamadeira|chupeta|roupa (de )?bebê|berço|babador)/.test(t)) return 'bebes'
  if (/(ração|coleira|brinquedo (para )?(cão|gato|cachorro|pet)|cama (para )?(pet|cachorro|gato)|areia (para )?gato)/.test(t)) return 'pet'
  if (/(furadeira|parafusadeira|chave (de fenda|catraca)|alicate|esmerilhadeira|trena|martelo|serra)/.test(t)) return 'ferramentas'
  if (/(tênis |sandália |bota |chinelo |sapato |sapatilha )/.test(t)) return 'calcados'
  if (/(lego|boneca|hot wheels|nerf|quebra-cabeça|brinquedo)/.test(t)) return 'brinquedos'
  return null
}

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
    }
  })
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

    const produtos = comDesconto.slice(0, limite).map(item => {
      const preco = item.price
      const precoOriginal = item.listPrice
      const descontoPercent = Math.round(((precoOriginal - preco) / precoOriginal) * 100)
      const nichoReal = nichoFromTitulo(item.name || '') ?? nicho
      const thumbnail = item.images?.[0]?.url || ''
      const linkAfiliado = item.url || ''
      const linkOriginal = item.url || ''
      const seller = item.seller || ''

      const { score, detalhes } = calcularScore({
        vendas: 0,
        desconto_percent: descontoPercent,
        rating: 0,
        frete_gratis: false,
        loja_premium: !!seller,
        comissao_percent: 0,
      })

      return {
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
      }
    })

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
