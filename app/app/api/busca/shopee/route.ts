import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calcularScore } from '@/lib/score'
import { createHash } from 'crypto'

const SHOPEE_AFFILIATE_API = 'https://open-api.affiliate.shopee.com.br/graphql'

const CATEGORIAS_SHOPEE: Record<string, { label: string; keywords: string[]; emoji: string }> = {
  eletronicos:      { label: 'Eletrônicos',              keywords: ['celular', 'smartphone', 'fone bluetooth', 'smartwatch', 'carregador'], emoji: '📱' },
  informatica:      { label: 'Informática',              keywords: ['notebook', 'mouse gamer', 'teclado mecânico', 'monitor', 'ssd', 'pendrive', 'webcam'], emoji: '💻' },
  eletrodomesticos: { label: 'Eletrodomésticos',         keywords: ['fritadeira airfryer', 'aspirador', 'liquidificador', 'ventilador', 'cafeteira'], emoji: '🏠' },
  games:            { label: 'Games',                    keywords: ['controle ps5', 'headset gamer', 'console', 'jogo ps5', 'nintendo switch'], emoji: '🎮' },
  moda:             { label: 'Moda Feminina',            keywords: ['vestido feminino', 'blusa feminina', 'calça jeans feminina', 'saia', 'moda feminina'], emoji: '👗' },
  moda_masc:        { label: 'Moda Masculina',           keywords: ['camisa masculina', 'calça masculina', 'bermuda masculina', 'moletom masculino'], emoji: '👔' },
  beleza:           { label: 'Beleza e Cuidado Pessoal', keywords: ['perfume', 'maquiagem', 'hidratante facial', 'shampoo', 'protetor solar'], emoji: '💄' },
  casa:             { label: 'Casa e Decoração',         keywords: ['luminária', 'cortina', 'organizador', 'tapete', 'jogo de cama'], emoji: '🛋️' },
  esportes:         { label: 'Esportes e Lazer',         keywords: ['tênis corrida', 'halter', 'yoga', 'bicicleta', 'garrafa térmica'], emoji: '⚽' },
  bebes:            { label: 'Bebês e Crianças',         keywords: ['fralda', 'carrinho bebê', 'mamadeira', 'roupa bebê', 'brinquedo infantil'], emoji: '🍼' },
  pet:              { label: 'Pet Shop',                 keywords: ['ração cachorro', 'ração gato', 'coleira', 'brinquedo pet', 'cama pet'], emoji: '🐾' },
  ferramentas:      { label: 'Ferramentas',              keywords: ['furadeira', 'jogo chave', 'parafusadeira', 'trena', 'alicate'], emoji: '🔧' },
}

function nichoFromTitulo(titulo: string): string | null {
  const t = titulo.toLowerCase()
  if (/(celular|smartphone|iphone|samsung galaxy|xiaomi|redmi|fone (de ouvido|bluetooth)|smartwatch|carregador (turbo|rápido|tipo c|usb)|power ?bank|caixa de som|alto.?falante|cabo (usb|hdmi|lightning)|película|capinha|suporte celular)/.test(t)) return 'eletronicos'
  if (/(notebook|laptop|mouse (gamer|sem fio|pad)|teclado (mecânico|gamer)|monitor\b|ssd|pendrive|webcam|impressora|placa de vídeo|memória ram|hd externo|mesa.*(notebook|gamer)|suporte.*(notebook|monitor)|hub usb|adaptador (usb|hdmi))/.test(t)) return 'informatica'
  if (/(fritadeira|air ?fryer|aspirador|liquidificador|ventilador|cafeteira|micro.?ondas|geladeira|máquina de lavar|fogão|ar.condicionado|panela (elétrica|pressão)|ferro de passar|mixer|processador de alimentos|purificador)/.test(t)) return 'eletrodomesticos'
  if (/(playstation|ps[45]|xbox|nintendo|controle (gamer|ps|xbox)|headset gamer|jogo (ps|xbox|switch)|console|joystick)/.test(t)) return 'games'
  if (/(vestido|blusa feminina|saia|calça (jeans )?feminina|moda feminina|body feminino|cropped|biquíni|maiô|legging|regata feminina)/.test(t)) return 'moda'
  if (/(camisa masculina|calça masculina|bermuda|moletom masculino|camiseta masculina|polo masculin|cueca|short masculino)/.test(t)) return 'moda_masc'
  if (/(perfume|maquiagem|batom|base líquida|hidratante|shampoo|condicionador|protetor solar|sérum|esmalte|creme (facial|corporal)|desodorante|rímel|corretivo|pó compacto|paleta de sombra)/.test(t)) return 'beleza'
  if (/(luminária|cortina|tapete|organizador|jogo de cama|travesseiro|edredom|lençol|vaso|quadro decorativo|prateleira|toalha|porta.?(retrato|copos)|lixeira)/.test(t)) return 'casa'
  if (/(tênis|tenis|halter|anilha|bicicleta|esteira|garrafa térmica|yoga|chuteira|luva de boxe|whey|creatina|suplemento|corda de pular|elástico fitness|caneleira|mochila esportiva)/.test(t)) return 'esportes'
  if (/(fralda|carrinho (de )?bebê|mamadeira|chupeta|roupa (de )?bebê|brinquedo infantil|berço|babador|mordedor)/.test(t)) return 'bebes'
  if (/(ração|coleira|brinquedo (para )?(cão|gato|cachorro|pet)|cama (para )?(pet|cachorro|gato)|areia (para )?gato|aquário|comedouro|bebedouro.*(pet|gato|cachorro))/.test(t)) return 'pet'
  if (/(furadeira|parafusadeira|chave (de fenda|catraca|allen)|alicate|esmerilhadeira|trena|martelo|nível a laser|serra|lixadeira|jogo.*(chave|ferramenta|soquete))/.test(t)) return 'ferramentas'
  return null
}

function buildShopeeAuth(appId: string, secret: string, body: string): { authorization: string } {
  const timestamp = Math.floor(Date.now() / 1000)
  const factor = `${appId}${timestamp}${body}${secret}`
  const signature = createHash('sha256').update(factor).digest('hex')
  return {
    authorization: `SHA256 Credential=${appId}, Signature=${signature}, Timestamp=${timestamp}`,
  }
}

async function searchShopeeProducts(
  appId: string,
  secret: string,
  keyword: string,
  limit: number
): Promise<any[]> {
  const query = `{
    productOfferV2(
      sortType: 2
      keyword: "${keyword}"
      limit: ${limit}
      page: 1
    ) {
      nodes {
        itemId
        productName
        price
        priceMin
        priceMax
        priceDiscountRate
        imageUrl
        shopName
        sales
        commissionRate
        offerLink
        productLink
        ratingStar
      }
      pageInfo { page limit hasNextPage }
    }
  }`

  const body = JSON.stringify({ query })
  const { authorization } = buildShopeeAuth(appId, secret, body)

  const res = await fetch(SHOPEE_AFFILIATE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authorization,
    },
    body,
    cache: 'no-store',
  })

  if (!res.ok) return []
  const data = await res.json()
  if (data.errors) {
    const errCode = data.errors[0]?.extensions?.code
    if (errCode === 10020) throw new Error('credenciais_invalidas')
    throw new Error(data.errors[0]?.message || 'Erro na API Shopee')
  }
  return data.data?.productOfferV2?.nodes || []
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const nicho = body.nicho || 'eletronicos'
    const limite = Math.min(body.limite || 20, 50)

    const catConfig = CATEGORIAS_SHOPEE[nicho]
    if (!catConfig) {
      return NextResponse.json({ error: `Nicho inválido: ${nicho}` }, { status: 400 })
    }

    const { data: cfg } = await supabaseAdmin
      .from('config_plataformas')
      .select('credenciais, ativo')
      .eq('plataforma', 'shopee')
      .maybeSingle()

    if (!cfg?.ativo) {
      return NextResponse.json({ error: 'Shopee está desativado. Ative na página de Plataformas.' }, { status: 400 })
    }

    const appId: string = cfg.credenciais?.app_id || ''
    const secret: string = cfg.credenciais?.secret || ''

    if (!appId || !secret) {
      return NextResponse.json({ error: 'Credenciais Shopee não configuradas (App ID e Secret necessários).' }, { status: 400 })
    }

    const allProducts: any[] = []

    for (const keyword of catConfig.keywords) {
      try {
        const items = await searchShopeeProducts(appId, secret, keyword, Math.min(limite, 10))
        allProducts.push(...items)
      } catch (e: any) {
        if (e.message === 'credenciais_invalidas') {
          return NextResponse.json({ error: 'Credenciais Shopee inválidas. Verifique App ID e Secret.' }, { status: 400 })
        }
        throw e
      }
      await sleep(300)
    }

    const seen = new Set<number>()
    const uniqueProducts = allProducts.filter(p => {
      if (seen.has(p.itemId)) return false
      seen.add(p.itemId)
      return true
    })

    const comDesconto = uniqueProducts.filter((p: any) => {
      if (!p.priceDiscountRate || p.priceDiscountRate <= 0) return false
      const nichoDetectado = nichoFromTitulo(p.productName)
      if (!nichoDetectado) return false
      return true
    })

    if (comDesconto.length === 0) {
      return NextResponse.json({
        salvos: 0,
        total_encontrados: uniqueProducts.length,
        msg: 'Nenhum produto com desconto encontrado',
        nicho: catConfig.label,
      })
    }

    const produtos = comDesconto.slice(0, limite).map((item: any) => {
      const preco = parseFloat(item.priceMin || item.price)
      const precoOriginal = item.priceDiscountRate > 0
        ? preco / (1 - item.priceDiscountRate / 100)
        : preco
      const nichoReal = nichoFromTitulo(item.productName) || nicho
      const comissao = parseFloat(item.commissionRate || '0') * 100
      const { score, detalhes } = calcularScore({
        vendas: item.sales || 0,
        desconto_percent: item.priceDiscountRate || 0,
        rating: parseFloat(item.ratingStar || '0'),
        frete_gratis: false,
        loja_premium: false,
        comissao_percent: comissao,
      })
      return {
        titulo: item.productName,
        preco,
        preco_original: Math.round(precoOriginal * 100) / 100,
        desconto_percent: item.priceDiscountRate,
        plataforma: 'shopee',
        link_original: item.productLink || `https://shopee.com.br/product/${item.itemId}`,
        link_afiliado: item.offerLink || item.productLink || '',
        thumbnail: item.imageUrl || '',
        nicho: nichoReal,
        produto_id_externo: `shopee_${item.itemId}`,
        frete_gratis: false,
        qtd_vendida: item.sales || 0,
        ativo: true,
        score,
        score_detalhes: detalhes,
        updated_at: new Date().toISOString(),
      }
    })

    const { data: salvos, error } = await supabaseAdmin
      .from('produtos')
      .upsert(produtos, { onConflict: 'produto_id_externo', ignoreDuplicates: false })
      .select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      salvos: salvos?.length || produtos.length,
      total_encontrados: uniqueProducts.length,
      com_desconto: comDesconto.length,
      nicho: catConfig.label,
      keywords_usadas: catConfig.keywords,
    })
  } catch (e: any) {
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
    .eq('plataforma', 'shopee')
    .eq('ativo', true)
    .order('desconto_percent', { ascending: false })
    .limit(limit)

  if (nicho) query = query.eq('nicho', nicho)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ produtos: data, total: data?.length || 0 })
}
