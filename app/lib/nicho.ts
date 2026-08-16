import { supabaseAdmin } from '@/lib/supabase'
import { type SupabaseClient } from '@supabase/supabase-js'

/**
 * Classificacao de nicho — fonte unica da verdade.
 *
 * Antes desse modulo cada rota tinha sua propria copia de `detectarNicho` /
 * `inferirNicho`, com listas divergentes e — pior — com fallback `'eletronicos'`.
 * Isso jogava todo produto nao reconhecido (inclusive beleza) no balde de
 * eletronicos, e o casamento produto->grupo
 * (`grupo.nichos.includes(produto.nicho)`) nunca mais batia.
 *
 * Regras:
 *  - so devolvemos id que exista em NICHOS_VALIDOS;
 *  - na duvida devolvemos null (nunca chute);
 *  - a IA so e acionada quando a regex falha (o webhook e hot path).
 */

// ─── Lista canonica ───────────────────────────────────────────────────────────
// Extraida de app/admin/grupos/page.tsx — e a lista que o admin usa pra marcar
// os nichos de cada grupo. Qualquer id fora daqui nunca casa com grupo nenhum.

export const NICHOS_VALIDOS = [
  'eletronicos',
  'eletrodomesticos',
  'informatica',
  'audio_video',
  'cameras',
  'games',
  'moda',
  'calcados',
  'beleza',
  'casa_moveis',
  'ferramentas',
  'esportes',
  'bebes',
  'brinquedos',
  'veiculos_acess',
  'livros',
  'saude',
  'alimentos',
  'musica',
  'pet_shop',
] as const

export type Nicho = (typeof NICHOS_VALIDOS)[number]

const SET_NICHOS: ReadonlySet<string> = new Set(NICHOS_VALIDOS)

export function isNichoValido(v: unknown): v is Nicho {
  return typeof v === 'string' && SET_NICHOS.has(v)
}

/** Ids legados que rotas antigas gravavam e que NAO existem no cadastro de grupos. */
export const NICHOS_LEGADOS: Record<string, Nicho> = {
  casa: 'casa_moveis',
  pet: 'pet_shop',
  moda_masc: 'moda',
  moda_fem: 'moda',
  joias: 'moda',
  relogios: 'moda',
  acessorios: 'moda',
  bolsas: 'moda',
  lingerie: 'moda',
  beleza_saude: 'beleza',
  celulares: 'eletronicos',
  perfumaria: 'beleza',
  eletro: 'eletrodomesticos',
  eletroportateis: 'eletrodomesticos',
}

/** Normaliza um nicho ja gravado: traduz legado, descarta desconhecido. */
export function normalizarNicho(v: unknown): Nicho | null {
  if (typeof v !== 'string') return null
  const s = v.trim().toLowerCase()
  if (SET_NICHOS.has(s)) return s as Nicho
  return NICHOS_LEGADOS[s] ?? null
}

// ─── Regex ────────────────────────────────────────────────────────────────────

function normalizar(titulo: string): string {
  return (titulo || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // tira acento: "sérum" e "serum" viram o mesmo
    .replace(/\s+/g, ' ')
    .trim()
}

type Regra = { nicho: Nicho; re: RegExp }

/**
 * A ordem IMPORTA: a primeira regra que casa vence.
 * Termos ambiguos ("base", "creme", "escova", "prancha", "mascara", "sombra")
 * exigem contexto pra nao roubar produto de outro nicho.
 */
const REGRAS: Regra[] = [
  // ── beleza ────────────────────────────────────────────────────────────────
  // Vem primeiro: "escova de cabelo" nao pode virar casa, "prancha de cabelo"
  // nao pode virar esportes, "creme facial" nao pode virar alimentos.
  {
    nicho: 'beleza',
    re: new RegExp(
      [
        // perfumaria
        'perfume|perfumaria|eau de (parfum|toilette)|deo ?colonia|agua de colonia|body splash|desodorante|antitranspirante',
        // maquiagem
        'maquiagem|make ?up|batom|labial|gloss|lip ?(gloss|tint|balm|oil)|rimel|mascara (de |para )?cilios|cilios|delineador|lapis de olho|corretivo|base (liquida|facial|matte|em po|para rosto)|po compacto|po facial|blush|contorno facial|iluminador|paleta de (sombra|maquiagem)|sombra (para |de )?olho|sombras|primer facial|fixador de maquiagem|demaquilante|removedor de maquiagem',
        // pinceis / aplicadores
        'pincel (de |para )?(maquiagem|make|po|blush|sombra|base)|kit de pinceis|esponja (de |para )?(maquiagem|make)|beauty ?blender',
        // skincare
        'skin ?care|hidratante|\\bserum\\b|acido hialuronico|hialuronico|niacinamida|vitamina c facial|acido glicolico|acido salicilico|retinol|protetor solar|filtro solar|fps ?\\d|creme (facial|para o rosto|para rosto|anti-?idade|antissinais|hidratante|para as maos|corporal|para o corpo|para area dos olhos)|agua micelar|tonico facial|esfoliante|mascara facial|sabonete (facial|liquido facial)|argila (verde|branca|preta)',
        // unhas
        '\\besmalte\\b|\\besmaltes\\b|\\bunha\\b|\\bunhas\\b|cuticula|alicate de unha|lixa de unha|gel builder|acrigel|alongamento de unha|removedor de esmalte|\\bacetona\\b',
        // cabelo
        'shampoo|xampu|condicionador|mascara capilar|mascara de tratamento|ampola capilar|leave-?in|finalizador capilar|progressiva|botox capilar|matizador|tonalizante|tintura de cabelo|coloracao (capilar|permanente)|coloracao para cabelo|oleo capilar|oleo para cabelo|creme de pentear|para (o )?cabelo|cabelos|capilar',
        'escova (rotativa|secadora|alisadora|modeladora|de cabelo|progressiva)|secador de cabelo|secador profissional|chapinha|prancha (alisadora|de cabelo|modeladora)|baby ?liss|babyliss|modelador de cachos|difusor de ar',
        // depilacao / barba
        'depilador|depilacao|epilador|cera depilatoria|barbeador|\\bbarba\\b|aparador de pelos|lamina de barbear|balm para barba|gilete',
      ].join('|')
    ),
  },

  // ── bebes ─────────────────────────────────────────────────────────────────
  {
    nicho: 'bebes',
    re: /fralda|carrinho de bebe|bebe conforto|berco|mamadeira|chupeta|babador|body (de |para )?bebe|roupa (de |para )?bebe|papinha|lenco umedecido|bolsa maternidade|cadeirinha (para|de) (carro|auto)|trocador|banheira (de |para )?bebe|termometro (de |para )?banho|chocalho/,
  },

  // ── pet_shop ──────────────────────────────────────────────────────────────
  {
    nicho: 'pet_shop',
    re: /\bracao\b|\bracoes\b|coleira|guia (para|de) (cachorro|cao|gato)|petisco|areia (higienica|para gato)|aquario|arranhador|caixa de transporte|comedouro|bebedouro (pet|para (cachorro|gato))|antipulgas|anti-?pulgas|tapete higienico|casinha (de |para )?(cachorro|cao|gato)|brinquedo (para|de) (cachorro|cao|gato|pet)|cama (para|de) (cachorro|cao|gato|pet)|shampoo (para|de) (cachorro|cao|gato|pet)/,
  },

  // ── saude ─────────────────────────────────────────────────────────────────
  {
    nicho: 'saude',
    re: /vitamina [a-z]?\d|polivitaminico|termometro|aparelho de pressao|medidor de pressao|oximetro|glicosimetro|nebulizador|inalador|massageador|almofada ortopedica|palmilha ortopedica|cadeira de rodas|muleta|escova de dente|creme dental|fio dental|enxaguante bucal|irrigador oral|preservativo|colageno|omega ?3|magnesio|melatonina|probiotico/,
  },

  // ── calcados ──────────────────────────────────────────────────────────────
  {
    nicho: 'calcados',
    re: /\btenis\b|sapatenis|sapato|chinelo|sandalia|rasteira|scarpin|sapatilha|\bbota\b|botina|\bcoturno\b|\bmule\b|papete|crocs|havaianas|slide feminino|salto alto|mocassim|oxford masculino/,
  },

  // ── games ─────────────────────────────────────────────────────────────────
  {
    nicho: 'games',
    re: /playstation|\bps[45]\b|\bxbox\b|nintendo|\bswitch\b|controle (gamer|sem fio|dualsense|dualshock|joystick)|joystick|headset gamer|cadeira gamer|mousepad gamer|jogo (de |para )?(ps[45]|xbox|switch|pc)|console de video ?game|video ?game|steam deck/,
  },

  // ── cameras ───────────────────────────────────────────────────────────────
  {
    nicho: 'cameras',
    re: /camera (digital|fotografica|de acao|de seguranca|ip|wifi)|\bgopro\b|\bdrone\b|instax|polaroid|\bcanon\b|\bnikon\b|\bsony alpha\b|lente (objetiva|\d+mm)|tripe (para |de )?camera|dslr|mirrorless|filmadora/,
  },

  // ── audio_video ───────────────────────────────────────────────────────────
  {
    nicho: 'audio_video',
    re: /\btelevisao\b|smart ?tv|\btv \d{2}\b|fone de ouvido|fone bluetooth|headphone|earbud|airpod|caixa de som|soundbar|sound ?bar|home theater|projetor|chromecast|fire ?stick|receiver|amplificador de audio|microfone|radio portatil|toca-?discos/,
  },

  // ── informatica ───────────────────────────────────────────────────────────
  {
    nicho: 'informatica',
    re: /notebook|laptop|ultrabook|macbook|\bdesktop\b|computador|\bpc gamer\b|monitor\b|\bmouse\b|teclado (mecanico|sem fio|gamer|abnt|bluetooth)|\bssd\b|\bhd externo\b|hdd|pendrive|pen drive|cartao (de |)memoria|memoria ram|placa (de video|mae)|processador (intel|amd|ryzen|core i)|impressora|scanner|\bwebcam\b|roteador|repetidor de sinal|\bnobreak\b|estabilizador|\bhub usb\b|adaptador (hdmi|usb-?c)|cooler para (pc|notebook)|fonte atx|gabinete gamer/,
  },

  // ── eletrodomesticos ──────────────────────────────────────────────────────
  {
    nicho: 'eletrodomesticos',
    re: /fritadeira|air ?fryer|aspirador|robo aspirador|liquidificador|batedeira|mixer|processador de alimentos|\bventilador\b|circulador de ar|climatizador|cafeteira|\bcafeteira expresso\b|micro-?ondas|microondas|geladeira|refrigerador|\bfreezer\b|maquina de lavar|lava e seca|lava-?loucas|\bfogao\b|cooktop|\bforno eletrico\b|air ?condicionado|ar-?condicionado|\bpanela eletrica\b|panela de pressao eletrica|ferro de passar|\bgrill eletrico\b|sanduicheira|torradeira|purificador de agua|\bbebedouro\b|adega climatizada|coifa|depurador|lavadora de alta pressao|espremedor|\bomeleteira\b|\bpipoqueira\b/,
  },

  // ── eletronicos ───────────────────────────────────────────────────────────
  {
    nicho: 'eletronicos',
    re: /celular|smartphone|\biphone\b|samsung galaxy|\bxiaomi\b|\bredmi\b|\brealme\b|\bmotorola\b|\bmoto g\b|\bpoco x\b|\btablet\b|\bipad\b|smartwatch|smart ?band|relogio inteligente|pulseira inteligente|carregador (turbo|rapido|portatil|sem fio|tipo c|usb|veicular)|power ?bank|cabo (usb|hdmi|lightning|tipo c)|pelicula|capinha|\bcapa (para|de) (celular|iphone|tablet)|suporte (para |de )?celular|\bgps\b|rastreador|\bairtag\b|localizador bluetooth/,
  },

  // ── brinquedos ────────────────────────────────────────────────────────────
  {
    nicho: 'brinquedos',
    re: /\blego\b|blocos de montar|boneca|boneco|hot ?wheels|\bnerf\b|quebra-?cabeca|\bpelucia\b|jogo de tabuleiro|\bslime\b|massinha de modelar|carrinho de brinquedo|pista de carrinho|\bpiscina de bolinha\b|\bfunko\b|action figure|patinete infantil|triciclo|escorregador infantil/,
  },

  // ── musica ────────────────────────────────────────────────────────────────
  {
    nicho: 'musica',
    re: /guitarra|violao|\bbaixo eletrico\b|\bukulele\b|\bpiano\b|teclado musical|\bcavaquinho\b|bateria (eletronica|acustica)|pandeiro|\bviolino\b|\bflauta\b|\bpedal (de efeito|para guitarra)\b|\bmesa de som\b|\bcordas (para|de) (violao|guitarra)\b/,
  },

  // ── livros ────────────────────────────────────────────────────────────────
  {
    nicho: 'livros',
    re: /\blivro\b|\blivros\b|\bbox de livros\b|\bmanga\b volume|\bhq\b|gibi|\bbiblia\b|dicionario|\bebook\b|\bkindle\b|colecao literaria|box (da |de )?colecao|\bromance\b|\bapostila\b/,
  },

  // ── alimentos ─────────────────────────────────────────────────────────────
  {
    nicho: 'alimentos',
    re: /\bcafe (em po|em graos|torrado|soluvel)\b|\bchocolate\b|\bbiscoito\b|\bbolacha\b|\bsuco\b|\bcerveja\b|\bvinho\b|\bwhisky\b|\bazeite\b|\bleite condensado\b|\bachocolatado\b|\bcereal\b|\bbarra de cereal\b|\bamendoim\b|\bcastanha\b|\bmacarrao\b|\barroz \d|\bfeijao \d|\btempero\b|\bmolho de tomate\b|\bagua mineral\b|\benergetico\b/,
  },

  // ── ferramentas ───────────────────────────────────────────────────────────
  {
    nicho: 'ferramentas',
    re: /furadeira|parafusadeira|esmerilhadeira|\bserra (circular|tico-?tico|marmore)\b|\bmartelo\b|\balicate\b|chave de fenda|chave philips|jogo de chaves|chave inglesa|chave de impacto|\btrena\b|nivel a laser|\bmaquita\b|\bbosch\b (furadeira|parafusadeira)|soldador|\bmultimetro\b|\blixadeira\b|\bplaina\b|caixa de ferramentas|\bmorsa\b|\bcompressor de ar\b/,
  },

  // ── esportes ──────────────────────────────────────────────────────────────
  {
    nicho: 'esportes',
    re: /\bhalter\b|halteres|\banilha\b|\bkettlebell\b|barra (fixa|olimpica|de supino)|\besteira ergometrica\b|\bbicicleta\b|\bbike\b|\bspinning\b|eliptico|\bwhey\b|creatina|\bbcaa\b|suplemento|\bhipercalorico\b|\bchuteira\b|bola de (futebol|basquete|volei)|\bskate\b|\bpatins\b|\bcorda de pular\b|\btapete de yoga\b|\bcolchonete\b|luva de (treino|academia|boxe)|\bmochila esportiva\b|\bgarrafa termica\b|\bcaramanhola\b|prancha de (surf|stand up)|\bpesca\b|\bvara de pescar\b|\bcamping\b|\bbarraca\b/,
  },

  // ── veiculos_acess ────────────────────────────────────────────────────────
  {
    nicho: 'veiculos_acess',
    re: /\bpneu\b|\bcalota\b|\btapete (automotivo|para carro)\b|capa (de |para )?(banco|volante)|\bcera automotiva\b|\bpolidor automotivo\b|\bcompressor para pneu\b|\bmacaco hidraulico\b|\bcapacete\b|\bbateria automotiva\b|\bfarol (de milha|automotivo|led h\d)\b|\baspirador automotivo\b|\bsom automotivo\b|\bmultimidia automotivo\b|\bcadeirinha automotiva\b|\bengate\b|\bpalheta limpador\b/,
  },

  // ── casa_moveis ───────────────────────────────────────────────────────────
  {
    nicho: 'casa_moveis',
    re: /\bsofa\b|\bcolchao\b|\barmario\b|\bguarda-?roupa\b|\bracks?\b|\bestante\b|\bmesa (de jantar|de centro|lateral|dobravel|gamer)\b|\bcadeira (de escritorio|de jantar|giratoria)\b|\bpuff\b|\bcabeceira\b|\bcriado-?mudo\b|\bluminaria\b|\bcortina\b|\btapete\b|\borganizador\b|jogo de cama|\btravesseiro\b|\bedredom\b|\bcobertor\b|\blencol\b|\bmanta\b|\btoalha de (banho|rosto|mesa)\b|\bpanela\b|\bjogo de panelas\b|\bfaqueiro\b|\btalher\b|\bcopos?\b de vidro|\bpotes hermeticos\b|\bvaral\b|\bcesto de roupa\b|\bespelho decorativo\b|\bquadro decorativo\b|\bvaso decorativo\b|\bpapel de parede\b/,
  },

  // ── moda ──────────────────────────────────────────────────────────────────
  // Por ultimo: e a regra mais ampla (ex. "camisa", "bolsa") e roubaria de outros.
  {
    nicho: 'moda',
    re: /\bvestido\b|\bblusa\b|\bcamisa\b|\bcamiseta\b|\bcalca\b|\bjeans\b|\bbermuda\b|\bshorts\b|\bsaia\b|\bmoletom\b|\bjaqueta\b|\bcasaco\b|\bblazer\b|\bcolete\b|\bmacacao\b|\bcropped\b|\bregata\b|\bcardigan\b|\bpijama\b|\bconjunto (feminino|masculino)\b|\bbiquini\b|\bmaio\b|\blingerie\b|\bcalcinha\b|\bsutia\b|\bcueca\b|\bmeia\b|\bmeias\b|\blegging\b|\bbolsa\b|\bcarteira feminina\b|\bmochila\b|\bcinto\b|\bbone\b|\bchapeu\b|\boculos de sol\b|\bcachecol\b|\bluva de couro\b|\bbrinco\b|\bcolar\b|\bpulseira\b|\banel\b|\bpingente\b|\bjoia\b|\bbijuteria\b|\brelogio (masculino|feminino|analogico|de pulso)\b/,
  },
]

/**
 * Classificacao deterministica e barata.
 * Devolve null quando nao ha certeza — NUNCA chuta um nicho.
 */
export function detectarNichoRegex(titulo: string): Nicho | null {
  const t = normalizar(titulo)
  if (t.length < 3) return null
  for (const { nicho, re } of REGRAS) {
    if (re.test(t)) return nicho
  }
  return null
}

// ─── IA (Gemini) ──────────────────────────────────────────────────────────────

const IA_TIMEOUT_MS = 8000
const MODELO_IA = 'gemini-2.5-flash'

let cacheApiKey: { valor: string | null; em: number } | null = null
const TTL_API_KEY_MS = 5 * 60 * 1000

async function getGeminiKey(db: SupabaseClient): Promise<string | null> {
  if (cacheApiKey && Date.now() - cacheApiKey.em < TTL_API_KEY_MS) return cacheApiKey.valor
  try {
    const { data } = await db
      .from('config_plataformas')
      .select('credenciais, ativo')
      .eq('plataforma', 'gemini')
      .maybeSingle()
    const key = data?.ativo && data?.credenciais?.api_key ? String(data.credenciais.api_key) : null
    cacheApiKey = { valor: key, em: Date.now() }
    return key
  } catch {
    cacheApiKey = { valor: null, em: Date.now() }
    return null
  }
}

/**
 * Ultimo recurso: pergunta pro Gemini.
 * Resposta so e aceita se for exatamente um id de NICHOS_VALIDOS.
 * Qualquer falha (rede, timeout, chave ausente, resposta torta) devolve null —
 * classificar nunca pode derrubar o webhook.
 */
export async function classificarNichoIA(
  titulo: string,
  db: SupabaseClient = supabaseAdmin
): Promise<Nicho | null> {
  const t = (titulo || '').trim()
  if (t.length < 3) return null

  try {
    const apiKey = await getGeminiKey(db)
    if (!apiKey) return null

    const prompt = `Classifique o produto abaixo em UMA categoria de e-commerce.

Categorias permitidas (responda com o id exato, em minusculas):
${NICHOS_VALIDOS.join('\n')}

Produto: ${t.substring(0, 300)}

Regras da resposta:
- Responda APENAS com o id da categoria, sem aspas, sem pontuacao, sem explicacao.
- Se nao tiver certeza razoavel, responda exatamente: null
- Nunca invente uma categoria que nao esteja na lista.`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELO_IA}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 800 },
        }),
        signal: AbortSignal.timeout(IA_TIMEOUT_MS),
      }
    )

    if (!res.ok) return null
    const json = await res.json()
    const bruto = String(json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z_]/g, '')

    if (!bruto || bruto === 'null') return null
    return isNichoValido(bruto) ? bruto : null
  } catch {
    return null
  }
}

// ─── Resolucao (regex -> IA) com cache em memoria ─────────────────────────────

const CACHE_MAX = 2000
const cacheTitulos = new Map<string, Nicho | null>()

function lembrar(chave: string, valor: Nicho | null): Nicho | null {
  if (cacheTitulos.size >= CACHE_MAX) {
    const primeira = cacheTitulos.keys().next().value
    if (primeira !== undefined) cacheTitulos.delete(primeira)
  }
  cacheTitulos.set(chave, valor)
  return valor
}

/** Zera o cache em memoria (usado em script de reprocessamento/teste). */
export function limparCacheNicho(): void {
  cacheTitulos.clear()
}

/**
 * Caminho oficial de classificacao.
 * 1. regex (barata, deterministica, sincrona)
 * 2. so se a regex falhar, IA
 * Devolve null quando nem a regex nem a IA tem certeza.
 */
export async function resolverNicho(
  titulo: string,
  db: SupabaseClient = supabaseAdmin
): Promise<Nicho | null> {
  const chave = normalizar(titulo)
  if (chave.length < 3) return null

  const porRegex = detectarNichoRegex(titulo)
  if (porRegex) return porRegex

  if (cacheTitulos.has(chave)) return cacheTitulos.get(chave) ?? null

  const porIA = await classificarNichoIA(titulo, db)
  return lembrar(chave, porIA)
}

/** Igual a resolverNicho, mas diz quem decidiu — usado em analise/reprocessamento. */
export async function resolverNichoDetalhado(
  titulo: string,
  db: SupabaseClient = supabaseAdmin
): Promise<{ nicho: Nicho | null; origem: 'regex' | 'ia' | 'cache' | 'nenhum' }> {
  const chave = normalizar(titulo)
  if (chave.length < 3) return { nicho: null, origem: 'nenhum' }

  const porRegex = detectarNichoRegex(titulo)
  if (porRegex) return { nicho: porRegex, origem: 'regex' }

  if (cacheTitulos.has(chave)) {
    return { nicho: cacheTitulos.get(chave) ?? null, origem: 'cache' }
  }

  const porIA = await classificarNichoIA(titulo, db)
  lembrar(chave, porIA)
  return { nicho: porIA, origem: porIA ? 'ia' : 'nenhum' }
}
