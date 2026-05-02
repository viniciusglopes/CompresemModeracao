import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendTelegram, sendWhatsApp, gerarAbertura } from '@/lib/dispatcher'

const TODOS_NICHOS = [
  'eletronicos', 'informatica', 'eletrodomesticos', 'games',
  'moda', 'moda_masc', 'beleza', 'casa', 'esportes', 'bebes', 'pet', 'ferramentas',
  'audio_video', 'cameras', 'calcados', 'casa_moveis', 'brinquedos',
  'veiculos_acess', 'livros', 'saude', 'alimentos', 'musica', 'pet_shop',
  'joias', 'relogios',
]

interface DisparoConfig {
  score_minimo: number
  desconto_minimo_ml: number
  score_minimo_shopee: number
  hora_inicio: number
  hora_fim: number
  intervalo_minutos: number
  min_produtos: number
  max_produtos: number
  ultimo_nicho_idx: number
  ultimo_disparo: string | null
  ativo: boolean
}

const CONFIG_PADRAO: DisparoConfig = {
  score_minimo: 60,
  desconto_minimo_ml: 40,
  score_minimo_shopee: 60,
  hora_inicio: 8,
  hora_fim: 22,
  intervalo_minutos: 15,
  min_produtos: 3,
  max_produtos: 10,
  ultimo_nicho_idx: 0,
  ultimo_disparo: null,
  ativo: true,
}

async function getConfig(): Promise<DisparoConfig> {
  const { data } = await supabaseAdmin
    .from('config_plataformas')
    .select('credenciais')
    .eq('plataforma', 'disparo_auto')
    .maybeSingle()

  return { ...CONFIG_PADRAO, ...(data?.credenciais || {}) }
}

async function saveConfig(config: Partial<DisparoConfig>) {
  const current = await getConfig()
  await supabaseAdmin
    .from('config_plataformas')
    .upsert({
      plataforma: 'disparo_auto',
      credenciais: { ...current, ...config },
      ativo: config.ativo ?? current.ativo,
    }, { onConflict: 'plataforma' })
}

async function getJaDisparados(): Promise<{ ids: Set<string>; titulos: Set<string> }> {
  const limite = new Date()
  limite.setHours(limite.getHours() - 48)

  const { data } = await supabaseAdmin
    .from('disparos')
    .select('produto_id, produtos!inner(titulo)')
    .gte('disparado_em', limite.toISOString())
    .eq('status', 'enviado')

  if (!data?.length) return { ids: new Set(), titulos: new Set() }

  const ids = new Set(data.map(d => d.produto_id))
  const titulos = new Set(
    data.map((d: any) => (d.produtos?.titulo || '').toLowerCase().trim()).filter(Boolean)
  )
  return { ids, titulos }
}

async function buscarProdutos(
  nichoIdx: number,
  config: DisparoConfig,
  quantidade: number,
  idsJaDisparados: Set<string>,
  titulosJaDisparados: Set<string>
): Promise<{ produtos: any[]; nichosUsados: string[]; ultimoNichoIdx: number }> {
  // Busca todos os produtos elegíveis de uma vez (todas plataformas e nichos)
  const { data: todosML } = await supabaseAdmin
    .from('produtos')
    .select('*')
    .eq('ativo', true)
    .in('plataforma', ['mercadolivre', 'lomadee', 'awin'])
    .gte('desconto_percent', config.desconto_minimo_ml)
    .order('desconto_percent', { ascending: false })
    .limit(100)

  const { data: todosShopee } = await supabaseAdmin
    .from('produtos')
    .select('*')
    .eq('ativo', true)
    .eq('plataforma', 'shopee')
    .gte('score', config.score_minimo_shopee)
    .order('score', { ascending: false })
    .limit(50)

  const todosCandidatos = [...(todosML || []), ...(todosShopee || [])]

  // Filtra já disparados
  const disponiveis = todosCandidatos.filter(p =>
    !idsJaDisparados.has(p.id) &&
    !titulosJaDisparados.has((p.titulo || '').toLowerCase().trim())
  )

  // Fase 1: pega 1 por nicho (variedade) — começa pelo nichoIdx
  const produtos: any[] = []
  const nichosUsados: string[] = []
  const usados = new Set<string>()

  const nichoOrder = [...TODOS_NICHOS.slice(nichoIdx), ...TODOS_NICHOS.slice(0, nichoIdx)]

  for (const nicho of nichoOrder) {
    if (produtos.length >= quantidade) break
    const doNicho = disponiveis.find(p => p.nicho === nicho && !usados.has(p.id))
    if (doNicho) {
      produtos.push(doNicho)
      usados.add(doNicho.id)
      if (!nichosUsados.includes(nicho)) nichosUsados.push(nicho)
    }
  }

  // Fase 2: preenche o resto com os melhores descontos disponíveis
  for (const p of disponiveis) {
    if (produtos.length >= quantidade) break
    if (usados.has(p.id)) continue
    produtos.push(p)
    usados.add(p.id)
    if (!nichosUsados.includes(p.nicho)) nichosUsados.push(p.nicho)
  }

  // Embaralha pra não mandar sempre na mesma ordem
  for (let i = produtos.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [produtos[i], produtos[j]] = [produtos[j], produtos[i]]
  }

  const ultimoNichoIdx = (nichoIdx + nichosUsados.length) % TODOS_NICHOS.length
  return { produtos, nichosUsados, ultimoNichoIdx }
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// GET — retorna config atual do disparo automático
export async function GET() {
  const config = await getConfig()
  return NextResponse.json(config)
}

// PUT — atualiza config do disparo automático
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    await saveConfig(body)
    const updated = await getConfig()
    return NextResponse.json({ ok: true, config: updated })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — executa um ciclo de disparo (chamado pelo cron externo a cada 15min)
export async function POST(request: Request) {
  const secret = request.headers.get('x-cron-secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const config = await getConfig()

  if (!config.ativo) {
    return NextResponse.json({ skip: true, motivo: 'Disparo automático desativado' })
  }

  const agoraBRT = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const hora = agoraBRT.getHours()

  if (hora < config.hora_inicio || hora >= config.hora_fim) {
    return NextResponse.json({ skip: true, motivo: `Fora do horário (${hora}h, permitido ${config.hora_inicio}h-${config.hora_fim}h)` })
  }

  const agora = Date.now()
  if (config.ultimo_disparo) {
    const ultimo = new Date(config.ultimo_disparo).getTime()
    const diffMin = (agora - ultimo) / 60000
    if (diffMin < config.intervalo_minutos) {
      return NextResponse.json({
        skip: true,
        motivo: `Aguardando intervalo (${Math.round(diffMin)}/${config.intervalo_minutos} min)`,
        proximo_em: `${Math.ceil(config.intervalo_minutos - diffMin)} min`,
      })
    }
  }

  // Lock otimista: marca ultimo_disparo ANTES de processar pra evitar race condition
  await saveConfig({ ultimo_disparo: new Date().toISOString() })

  const { data: grupos } = await supabaseAdmin
    .from('grupos')
    .select('*')
    .eq('ativo', true)

  if (!grupos?.length) {
    return NextResponse.json({ skip: true, motivo: 'Nenhum grupo ativo cadastrado' })
  }

  const { ids: idsJaDisparados, titulos: titulosJaDisparados } = await getJaDisparados()
  const nichoIdx = config.ultimo_nicho_idx % TODOS_NICHOS.length
  const qtdProdutos = randomInt(config.min_produtos, config.max_produtos)

  const resultado = await buscarProdutos(nichoIdx, config, qtdProdutos, idsJaDisparados, titulosJaDisparados)

  if (resultado.produtos.length === 0) {
    await saveConfig({ ultimo_nicho_idx: (nichoIdx + 1) % TODOS_NICHOS.length })
    return NextResponse.json({
      skip: true,
      motivo: `Nenhum produto disponível (ML desconto >= ${config.desconto_minimo_ml}%, Shopee score >= ${config.score_minimo_shopee})`,
      ja_disparados_48h: idsJaDisparados.size,
      titulos_bloqueados: titulosJaDisparados.size,
    })
  }

  const { data: configs } = await supabaseAdmin
    .from('config_plataformas')
    .select('plataforma, credenciais')
    .in('plataforma', ['telegram_bot', 'evolution_api'])

  const telegramConfig = configs?.find(c => c.plataforma === 'telegram_bot')?.credenciais as any
  const evolutionConfig = configs?.find(c => c.plataforma === 'evolution_api')?.credenciais as any

  let totalEnviados = 0
  let totalErros = 0
  const registros: any[] = []
  const produtosDisparados: { id: string; titulo: string; score: number; nicho: string }[] = []

  for (const produtoFinal of resultado.produtos) {
    const abertura = await gerarAbertura(produtoFinal)

    for (const grupo of grupos) {
      if (grupo.nichos?.length && !grupo.nichos.includes(produtoFinal.nicho)) continue

      let status = 'enviado'
      let erro = ''

      if (grupo.canal === 'telegram') {
        if (!telegramConfig?.bot_token) {
          status = 'erro'
          erro = 'Bot token não configurado'
        } else {
          const result = await sendTelegram(telegramConfig.bot_token, grupo.grupo_id, produtoFinal, abertura)
          if (!result.ok) { status = 'erro'; erro = result.error || 'Erro desconhecido' }
        }
      } else if (grupo.canal === 'whatsapp') {
        if (!evolutionConfig?.url || !evolutionConfig?.api_key || !evolutionConfig?.instance) {
          status = 'erro'
          erro = 'Evolution API não configurada'
        } else {
          const result = await sendWhatsApp(
            evolutionConfig.url, evolutionConfig.api_key, evolutionConfig.instance,
            grupo.grupo_id, produtoFinal, abertura
          )
          if (!result.ok) { status = 'erro'; erro = result.error || 'Erro desconhecido' }
        }
      }

      if (status === 'enviado') totalEnviados++
      else totalErros++

      registros.push({
        produto_id: produtoFinal.id,
        canal: grupo.canal,
        grupo_id: grupo.grupo_id,
        grupo_nome: grupo.nome,
        mensagem: abertura,
        status,
        erro: erro || null,
        disparado_em: new Date().toISOString(),
      })

      await new Promise(r => setTimeout(r, 500))
    }

    produtosDisparados.push({
      id: produtoFinal.id,
      titulo: produtoFinal.titulo,
      score: produtoFinal.score,
      nicho: produtoFinal.nicho,
    })

    await new Promise(r => setTimeout(r, 1000))
  }

  if (registros.length > 0) {
    await supabaseAdmin.from('disparos').insert(registros)
  }

  await saveConfig({
    ultimo_nicho_idx: resultado.ultimoNichoIdx,
    ultimo_disparo: new Date().toISOString(),
  })

  return NextResponse.json({
    ok: true,
    qtd_sorteada: qtdProdutos,
    qtd_disparada: resultado.produtos.length,
    produtos: produtosDisparados,
    nichos_usados: resultado.nichosUsados,
    enviados: totalEnviados,
    erros: totalErros,
    total_registros: registros.length,
    proximo_nicho: TODOS_NICHOS[resultado.ultimoNichoIdx],
    hora_brt: `${hora}h`,
  })
}
