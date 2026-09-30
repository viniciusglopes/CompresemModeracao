import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { dispararAprovados } from '@/lib/disparo-aprovados'

// 30/09/2026 — a pedido da Camilla o disparo deixou de ser automatico:
// este cron so envia produtos APROVADOS na tela /admin/aprovar (ver
// lib/disparo-aprovados.ts). Nao existe modo "automatico" — sem aprovacao,
// nada sai. score_minimo/desconto_minimo/ultimo_nicho_idx ficam na config
// por compatibilidade com a tela /admin/disparos, mas nao filtram mais nada.

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
  palavras_bloqueadas: string[]
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
  palavras_bloqueadas: [],
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

  const qtdProdutos = randomInt(config.min_produtos, config.max_produtos)
  const resultado = await dispararAprovados({
    limite: qtdProdutos,
    palavrasBloqueadas: config.palavras_bloqueadas,
  })

  await saveConfig({ ultimo_disparo: new Date().toISOString() })

  return NextResponse.json({
    ok: true,
    modo: 'somente_aprovados',
    qtd_sorteada: qtdProdutos,
    qtd_disparada: resultado.produtos.filter(p => p.grupos_ok > 0).length,
    hora_brt: `${hora}h`,
    ...resultado,
  })
}
