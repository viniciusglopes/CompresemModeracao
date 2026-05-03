import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getMlAccessToken } from '@/lib/ml-auth'
import { logApi } from '@/lib/api-logger'
import { calcularScore } from '@/lib/score'

const ML_API = 'https://api.mercadolibre.com'

// Todas as categorias principais do ML Brasil
export const TODOS_NICHOS: Record<string, { label: string; category: string; emoji: string }> = {
  eletronicos:      { label: 'Eletrônicos',           category: 'MLB1051', emoji: '📱' },
  eletrodomesticos: { label: 'Eletrodomésticos',       category: 'MLB1574', emoji: '🏠' },
  informatica:      { label: 'Informática',             category: 'MLB1648', emoji: '💻' },
  audio_video:      { label: 'Áudio e Vídeo',           category: 'MLB1499', emoji: '🎧' },
  cameras:          { label: 'Câmeras e Acessórios',    category: 'MLB1430', emoji: '📷' },
  games:            { label: 'Games',                   category: 'MLB1540', emoji: '🎮' },
  moda:             { label: 'Moda e Acessórios',       category: 'MLB1744', emoji: '👗' },
  calcados:         { label: 'Calçados e Bolsas',       category: 'MLB1132', emoji: '👟' },
  beleza:           { label: 'Beleza e Cuidado Pessoal',category: 'MLB1459', emoji: '💄' },
  casa_moveis:      { label: 'Casa, Móveis e Decoração',category: 'MLB1039', emoji: '🛋️' },
  ferramentas:      { label: 'Ferramentas',              category: 'MLB1234', emoji: '🔧' },
  esportes:         { label: 'Esportes e Fitness',       category: 'MLB1196', emoji: '⚽' },
  bebes:            { label: 'Bebês',                   category: 'MLB1168', emoji: '🍼' },
  brinquedos:       { label: 'Brinquedos e Hobbies',    category: 'MLB1384', emoji: '🧸' },
  veiculos_acess:   { label: 'Acessórios para Veículos',category: 'MLB1276', emoji: '🚗' },
  livros:           { label: 'Livros e Revistas',        category: 'MLB1367', emoji: '📚' },
  saude:            { label: 'Saúde',                   category: 'MLB1246', emoji: '💊' },
  alimentos:        { label: 'Alimentos e Bebidas',     category: 'MLB3937', emoji: '🍎' },
  musica:           { label: 'Instrumentos Musicais',   category: 'MLB1212', emoji: '🎸' },
  pet_shop:         { label: 'Pet Shop',                category: 'MLB1500', emoji: '🐾' },
}

const NICHOS = TODOS_NICHOS

// Classifica o nicho pelo domain_id retornado pelo ML (ex: "MLB-SMARTPHONES")
function nichoFromDomainId(domainId: string): string | null {
  if (!domainId) return null
  const d = domainId.toUpperCase()
  if (/(SMARTPHONE|CELLPHONE|SMARTWATCH|WEARABLE)/.test(d)) return 'eletronicos'
  if (/(WASHING|REFRIGERATOR|AIR_CONDITION|HOME_APPLIANCE|MICROWAVE|DISHWASHER|OVEN|BLENDER|VACUUM|COFFEE_MAKER|IRON)/.test(d)) return 'eletrodomesticos'
  if (/(NOTEBOOK|LAPTOP|COMPUTER|TABLET|PRINTER|NETWORK|MONITOR|HARD_DRIVE|MEMORY|KEYBOARD|MOUSE_DEVICE|STORAGE|SERVER|3D_PRINT)/.test(d)) return 'informatica'
  if (/(TELEVISION|AUDIO|HEADPHONE|SPEAKER|SOUNDBAR|HOME_THEATER|RECEIVER|PROJECTOR|STREAMING)/.test(d)) return 'audio_video'
  if (/(CAMERA|PHOTO|LENS|TRIPOD|DRONE|INSTAX|ACTION_CAMERA)/.test(d)) return 'cameras'
  if (/(VIDEO_GAME|CONSOLE|GAMING_HEADSET|JOYSTICK)/.test(d)) return 'games'
  if (/(WOMEN_SHOE|MEN_SHOE|KIDS_SHOE|SNEAKER|BOOT|SANDAL|SLIPPER|ESPADRILLE)/.test(d)) return 'calcados'
  if (/(CLOTHING|FASHION|HANDBAG|WALLET|SUNGLASSES|WATCH|JEWELRY|ACCESSORY|BELT|HAT|SCARF|LUGGAGE|BACKPACK)/.test(d)) return 'moda'
  if (/(MAKEUP|PERFUME|HAIR_CARE|BEAUTY|SKINCARE|COSMETIC|NAIL|SHAVING|DEODORANT|SOAP)/.test(d)) return 'beleza'
  if (/(FURNITURE|HOME_DECOR|BED|BATH|KITCHEN|CURTAIN|CARPET|PILLOW|SHEET|LAMP|STORAGE_FURNITURE|TOWEL)/.test(d)) return 'casa_moveis'
  if (/(TOOL|POWER_TOOL|CONSTRUCTION|DRILL|SAW|PAINT|LADDER|GARDEN|HARDWARE)/.test(d)) return 'ferramentas'
  if (/(SPORT|FITNESS|BIKE|BICYCLE|OUTDOOR|EXERCISE|YOGA|MARTIAL|SWIM|TENNIS|FOOTBALL|SKATEBOARD)/.test(d)) return 'esportes'
  if (/(BABY|INFANT|STROLLER|DIAPER|CRIB|BABY_CARRIER|BABY_MONITOR)/.test(d)) return 'bebes'
  if (/(TOY|GAME_BOARD|PUZZLE|DOLL|ACTION_FIGURE|EDUCATIONAL_TOY|PLUSH|SCOOTER_TOY|REMOTE_CONTROL_TOY)/.test(d)) return 'brinquedos'
  if (/(VEHICLE|CAR_AUDIO|AUTO|MOTORCYCLE|TRUCK|TIRE|RIM|CAR_COVER)/.test(d)) return 'veiculos_acess'
  if (/(BOOK|MAGAZINE|COMIC|EBOOK)/.test(d)) return 'livros'
  if (/(HEALTH|VITAMIN|SUPPLEMENT|MEDICAL|PHARMACY|FIRST_AID|ORTHO)/.test(d)) return 'saude'
  if (/(FOOD|BEVERAGE|DRINK|GROCERY|COFFEE|CANDY|SNACK)/.test(d)) return 'alimentos'
  if (/(MUSICAL|GUITAR|PIANO|DRUM|VIOLIN|BASS|FLUTE|MICROPHONE_MUSIC)/.test(d)) return 'musica'
  if (/(PET|DOG|CAT|AQUARIUM|BIRD|FISH_TANK)/.test(d)) return 'pet_shop'
  return null
}

// Fallback: classifica pelo título do produto
function nichoFromTitulo(titulo: string): string | null {
  const t = titulo.toLowerCase()
  if (/(celular|smartphone|iphone|samsung galaxy|motorola moto|xiaomi|redmi|realme|poco x)/.test(t)) return 'eletronicos'
  if (/(liquidificador|geladeira|fogão|máquina de lavar|micro-ondas|aspirador|ar-condicionado|fritadeira|tanquinho|ventilador|purificador)/.test(t)) return 'eletrodomesticos'
  if (/(notebook|laptop|computador|monitor|teclado|mouse sem fio|impressora|hd externo|pendrive|memória ram|ssd|placa de vídeo|filamento (pla|petg|abs)|impressora 3d)/.test(t)) return 'informatica'
  if (/(televisão|tv \d|smart tv|headphone|fone de ouvido|caixa de som|soundbar|home theater|amplificador|receiver)/.test(t)) return 'audio_video'
  if (/(câmera|camera (digital|mirrorless|slr)|lente para|gopro|instax|canon eos|nikon d|drone dji)/.test(t)) return 'cameras'
  if (/(playstation|ps[45]|xbox|nintendo switch|controle (sem fio|ps|xbox)|jogo (ps|xbox|switch))/.test(t)) return 'games'
  if (/(tênis |tenis |sapato |chinelo |bota |sandália |mocassim |sapatilha |rasteirinha )/.test(t)) return 'calcados'
  if (/(vestido|blusa feminina|calça jeans|camisa masculina|bermuda|moletom|jaqueta|casaco|saia |bolsa feminina|mochila (feminina|masculina)|óculos de sol|relógio (masculino|feminino))/.test(t)) return 'moda'
  if (/(shampoo|condicionador|creme (facial|corporal|hidratante)|maquiagem|batom|perfume |desodorante|hidratante|sérum|filtro solar|esmalte|base liquida)/.test(t)) return 'beleza'
  if (/(sofá|colchão|armário|mesa (de jantar|escritório)|cadeira (gamer|escritório|sala)|guarda-roupa|cortina|tapete|luminária|lençol|travesseiro|edredom|capa de colchão|papel higiênico|jogo de cama)/.test(t)) return 'casa_moveis'
  if (/(furadeira|parafusadeira|martelo|chave de fenda|alicate|esmerilhadeira|nível a laser|fita métrica|berbequim)/.test(t)) return 'ferramentas'
  if (/(bicicleta |bike |esteira |halter|anilha|suplemento esportivo|whey protein|creatina|chuteira|luva de boxe|patins|skate)/.test(t)) return 'esportes'
  if (/(fralda|carrinho de bebê|berço|mamadeira|chupeta|brinquedo de bebê|roupa de bebê)/.test(t)) return 'bebes'
  if (/(lego|boneca|hot wheels|nerf |quebra-cabeça|patinete infantil|bicicleta infantil|triciclo infantil|blocos (magnéticos|imã)|brinquedo (educativo|infantil))/.test(t)) return 'brinquedos'
  if (/(capa para carro|tapete automotivo|som automotivo|suporte veicular|óleo (motor|lubrificante))/.test(t)) return 'veiculos_acess'
  if (/(livro |romance |literatura |mangá|hq |quadrinhos|bíblia|dicionário)/.test(t)) return 'livros'
  if (/(suplemento vitamina|termômetro|aparelho de pressão|vitamina [a-z]|ômega|probiótico|remédio|barbeador|cortador de cabelo)/.test(t)) return 'saude'
  if (/(café |chocolate |biscoito |suco |cerveja |vinho |azeite |tempero |proteína em pó)/.test(t)) return 'alimentos'
  if (/(guitarra|violão|piano digital|teclado musical|bateria acústica|baixo elétrico|ukulele)/.test(t)) return 'musica'
  if (/(ração para|coleira|petisco para|brinquedo para (cão|gato|cachorro)|areia para gato|aquário)/.test(t)) return 'pet_shop'
  return null
}

function resolverNicho(domainId: string, titulo: string, nichoFallback: string): string {
  return nichoFromDomainId(domainId) || nichoFromTitulo(titulo) || nichoFallback
}

function buildAffiliateLink(url: string, tag: string, word?: string): string {
  if (!tag) return url
  try {
    const u = new URL(url)
    u.searchParams.set('matt_tool', tag)
    if (word) u.searchParams.set('matt_word', word)
    return u.toString()
  } catch {
    return url
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Estratégia 1: busca na API de search com filtro de promoção (requer token; pode estar bloqueada de VPS)
async function searchComPromocao(categoryId: string, token: string, limit: number): Promise<any[]> {
  const params = new URLSearchParams({
    category: categoryId,
    promotions: 'PERCENT_DISCOUNT',
    limit: String(limit),
    sort: 'relevance',
  })
  const res = await fetch(`${ML_API}/sites/MLB/search?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (res.status === 429) throw new Error('rate_limit')
  if (!res.ok) return [] // 403 = bloqueado de VPS, retorna vazio silenciosamente
  const data = await res.json()
  return (data.results || []).filter((item: any) => item.original_price && item.original_price > item.price)
}

// Estratégia 2: highlights → items preços → detalhes do catalog product
// Calls: 1 highlights + 5 items_prices + N product_details (N = catalogs com desconto)
async function highlightsComDesconto(categoryId: string, token: string): Promise<any[]> {
  // Passo A: highlights
  const hRes = await fetch(`${ML_API}/highlights/MLB/category/${categoryId}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (hRes.status === 429) throw new Error('rate_limit')
  if (!hRes.ok) return []
  const hText = await hRes.text()
  if (!hText) return []
  const hData = JSON.parse(hText)

  const catalogIds = (hData.content || [])
    .filter((c: any) => c.type === 'PRODUCT')
    .map((c: any) => c.id as string)
    .slice(0, 7)

  // Passo B: pega preços dos items de cada catalog, filtra desconto
  // Estrutura: { catalogId → melhor item com desconto }
  const catalogsComDesconto: { catalogId: string; price: number; originalPrice: number }[] = []

  for (const catalogId of catalogIds) {
    await sleep(400)
    const res = await fetch(`${ML_API}/products/${catalogId}/items?limit=10`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (res.status === 429) throw new Error('rate_limit')
    if (!res.ok) continue
    const text = await res.text()
    if (!text) continue
    const d = JSON.parse(text)
    const items: any[] = Array.isArray(d) ? d : d.results || []
    // Pega o melhor desconto deste catalog
    let melhor: any = null
    for (const item of items) {
      if (item.original_price && item.original_price > item.price) {
        if (!melhor || item.price < melhor.price) melhor = item
      }
    }
    if (melhor) {
      catalogsComDesconto.push({ catalogId, price: melhor.price, originalPrice: melhor.original_price })
    }
  }

  if (catalogsComDesconto.length === 0) return []

  // Passo C: para cada catalog com desconto, busca detalhes do produto (nome, thumbnail, permalink)
  const resultados: any[] = []
  for (const { catalogId, price, originalPrice } of catalogsComDesconto) {
    await sleep(300)
    const res = await fetch(`${ML_API}/products/${catalogId}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (res.status === 429) throw new Error('rate_limit')
    if (!res.ok) continue
    const text = await res.text()
    if (!text) continue
    const prod = JSON.parse(text)
    if (prod.error) continue

    resultados.push({
      id: catalogId,
      title: prod.name || prod.family_name || catalogId,
      price,
      original_price: originalPrice,
      thumbnail: (prod.pictures?.[0]?.url || '').replace('http://', 'https://'),
      permalink: prod.permalink || `https://www.mercadolivre.com.br/p/${catalogId}`,
      shipping: { free_shipping: false },
      sold_quantity: 0,
      domain_id: prod.domain_id || '',
    })
  }

  return resultados
}

// Estratégia 3: busca por termos de oferta na categoria
const TERMOS_OFERTA = ['oferta', 'promoção', 'desconto', 'promoção relâmpago']
async function buscaTermoOferta(categoryId: string, token: string, limit: number): Promise<any[]> {
  const termo = TERMOS_OFERTA[Math.floor(Math.random() * TERMOS_OFERTA.length)]
  const params = new URLSearchParams({ q: termo, category: categoryId, limit: String(limit), sort: 'relevance' })
  const res = await fetch(`${ML_API}/sites/MLB/search?${params}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  if (res.status === 429) throw new Error('rate_limit')
  if (!res.ok) return []
  const data = await res.json()
  return (data.results || []).filter((item: any) => item.original_price && item.original_price > item.price)
}

export async function POST(request: Request) {
  const t0 = Date.now()
  try {
    const body = await request.json().catch(() => ({}))
    const limite = Math.min(body.limite || 20, 50)

    // Suporte a múltiplos nichos: nicho (string) ou nichos (array)
    const nichosReq: string[] = Array.isArray(body.nichos)
      ? body.nichos
      : [body.nicho || 'eletronicos']

    // Se múltiplos nichos, processa cada um e retorna consolidado
    if (nichosReq.length > 1) {
      const resultados: any[] = []
      for (const nicho of nichosReq) {
        const res = await fetch(new URL('/api/busca/mercadolivre', 'http://localhost:3000').toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nicho, limite }),
        })
        const data = await res.json()
        resultados.push({ nicho, ...data })
        await sleep(2000) // pausa entre nichos
      }
      const totalSalvos = resultados.reduce((s, r) => s + (r.salvos || 0), 0)
      return NextResponse.json({ salvos: totalSalvos, nichos: resultados })
    }

    const nicho = nichosReq[0]

    const nichoConfig = NICHOS[nicho]
    if (!nichoConfig) {
      return NextResponse.json({ error: `Nicho inválido: ${nicho}` }, { status: 400 })
    }

    const { data: cfg } = await supabaseAdmin
      .from('config_plataformas')
      .select('credenciais, ativo')
      .eq('plataforma', 'mercadolivre')
      .maybeSingle()

    if (!cfg?.ativo) {
      return NextResponse.json({ error: 'Mercado Livre está desativado' }, { status: 400 })
    }

    const token = await getMlAccessToken()
    if (!token) {
      return NextResponse.json({ error: 'Token ML não disponível. Faça OAuth primeiro.' }, { status: 400 })
    }

    const affiliateTag = cfg?.credenciais?.affiliate_tag || ''
    const affiliateWord = cfg?.credenciais?.affiliate_word || ''

    // Tenta as estratégias em sequência até encontrar produtos com desconto
    let todosItens: any[] = []
    let estrategiaUsada = ''

    try {
      // Estratégia 1: search com filtro PERCENT_DISCOUNT
      todosItens = await searchComPromocao(nichoConfig.category, token, limite)
      estrategiaUsada = 'search_promo'

      // Se search bloqueado de VPS (403/empty), tenta highlights
      if (todosItens.length === 0) {
        await sleep(500)
        todosItens = await highlightsComDesconto(nichoConfig.category, token)
        estrategiaUsada = 'highlights_items'
      }

      // Se highlights sem desconto, tenta busca por termos de oferta
      if (todosItens.length === 0) {
        await sleep(500)
        todosItens = await buscaTermoOferta(nichoConfig.category, token, Math.min(limite, 20))
        estrategiaUsada = 'busca_termo'
      }
    } catch (e: any) {
      if (e.message === 'rate_limit') {
        await logApi({ plataforma: 'mercadolivre', endpoint: '/busca/mercadolivre', status: 'rate_limit', nicho, duracao_ms: Date.now() - t0, erro: 'Rate limit atingido', request_json: { nicho, limite }, response_json: { error: 'rate_limit' } })
        return NextResponse.json({
          error: 'Limite de chamadas da API do ML atingido. Aguarde alguns minutos.',
        }, { status: 429 })
      }
      throw e
    }

    if (todosItens.length === 0) {
      const resp = { salvos: 0, total_encontrados: 0, msg: 'Nenhum produto com desconto encontrado (todas as estratégias tentadas)', nicho: nichoConfig.label, estrategia: estrategiaUsada }
      await logApi({ plataforma: 'mercadolivre', endpoint: '/busca/mercadolivre', status: 'success', nicho, duracao_ms: Date.now() - t0, total_encontrados: 0, salvos: 0, detalhes: { estrategia: estrategiaUsada }, request_json: { nicho, limite }, response_json: resp })
      return NextResponse.json(resp)
    }

    const produtos = todosItens.slice(0, limite).map((item: any) => {
      const descPercent = Math.round(((item.original_price - item.price) / item.original_price) * 100)
      const linkOriginal = item.permalink || `https://www.mercadolivre.com.br/p/${item.id}`
      const nichoReal = resolverNicho(item.domain_id || '', item.title || '', nicho)
      const freteGratis = item.shipping?.free_shipping || false
      const lojaPremium = !!(item.official_store_id || item.listing_type_id === 'gold_pro')
      const { score, detalhes } = calcularScore({
        vendas: item.sold_quantity || 0,
        desconto_percent: descPercent,
        rating: 0,
        frete_gratis: freteGratis,
        loja_premium: lojaPremium,
        comissao_percent: 0,
      })
      return {
        titulo: item.title,
        preco: item.price,
        preco_original: item.original_price,
        desconto_percent: descPercent,
        plataforma: 'mercadolivre',
        link_original: linkOriginal,
        link_afiliado: buildAffiliateLink(linkOriginal, affiliateTag, affiliateWord),
        thumbnail: (item.thumbnail || '').replace('http://', 'https://'),
        nicho: nichoReal,
        produto_id_externo: item.id,
        frete_gratis: freteGratis,
        qtd_vendida: item.sold_quantity || 0,
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
      await logApi({ plataforma: 'mercadolivre', endpoint: '/busca/mercadolivre', status: 'error', nicho, duracao_ms: Date.now() - t0, erro: error.message, request_json: { nicho, limite }, response_json: { error: error.message } })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const qtdSalvos = salvos?.length || produtos.length
    const respData = {
      salvos: qtdSalvos,
      total_encontrados: todosItens.length,
      com_desconto: todosItens.length,
      nicho: nichoConfig.label,
      estrategia: estrategiaUsada,
      produtos: produtos.map(p => ({
        titulo: p.titulo,
        preco: p.preco,
        preco_original: p.preco_original,
        desconto: `${p.desconto_percent}%`,
        frete_gratis: p.frete_gratis,
      })),
    }
    await logApi({ plataforma: 'mercadolivre', endpoint: '/busca/mercadolivre', status: 'success', nicho, duracao_ms: Date.now() - t0, total_encontrados: todosItens.length, salvos: qtdSalvos, detalhes: { estrategia: estrategiaUsada }, request_json: { nicho, limite }, response_json: respData })

    return NextResponse.json(respData)
  } catch (e: any) {
    await logApi({ plataforma: 'mercadolivre', endpoint: '/busca/mercadolivre', status: 'error', duracao_ms: Date.now() - t0, erro: e.message, response_json: { error: e.message } })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const nicho = searchParams.get('nicho')
  const plataforma = searchParams.get('plataforma') || 'mercadolivre'
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabaseAdmin
    .from('produtos')
    .select('*')
    .eq('plataforma', plataforma)
    .eq('ativo', true)
    .order('desconto_percent', { ascending: false })
    .limit(limit)

  if (nicho) query = query.eq('nicho', nicho)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ produtos: data, total: data?.length || 0 })
}
