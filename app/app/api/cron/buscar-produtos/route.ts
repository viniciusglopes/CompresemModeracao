import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Todos os nichos do ML em ordem de rotação
const NICHOS_ML = [
  'eletronicos', 'eletrodomesticos', 'informatica', 'games',
  'audio_video', 'cameras', 'moda', 'calcados', 'beleza',
  'casa_moveis', 'ferramentas', 'esportes', 'bebes', 'brinquedos',
  'veiculos_acess', 'livros', 'saude', 'alimentos', 'musica', 'pet_shop',
]

const NICHOS_SHOPEE = [
  'eletronicos', 'informatica', 'eletrodomesticos', 'games',
  'moda', 'moda_masc', 'beleza', 'casa', 'esportes', 'bebes', 'pet', 'ferramentas',
]

const NICHOS_LOMADEE = [
  'eletronicos', 'informatica', 'eletrodomesticos', 'games',
  'moda', 'moda_masc', 'beleza', 'casa', 'esportes', 'bebes', 'pet', 'ferramentas',
  'calcados', 'casa_moveis', 'brinquedos',
]

const NICHOS_AWIN = [
  'eletronicos', 'informatica', 'eletrodomesticos', 'games',
  'moda', 'beleza', 'casa', 'esportes', 'bebes', 'pet', 'ferramentas', 'brinquedos',
]

// Rota de cron — busca 1 nicho por plataforma por execução (rotaciona)
// Chamado a cada 30min: POST /api/cron/buscar-produtos
// Protegido por CRON_SECRET env var
export async function POST(request: Request) {
  const secret = request.headers.get('x-cron-secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Lê o índice atual do nicho no banco
  const { data: cfgRow } = await supabaseAdmin
    .from('config_plataformas')
    .select('credenciais')
    .eq('plataforma', 'cron_state')
    .maybeSingle()

  const state = cfgRow?.credenciais || {}
  const mlIdx = (state.ml_idx || 0) % NICHOS_ML.length
  const shopeeIdx = (state.shopee_idx || 0) % NICHOS_SHOPEE.length
  const lomadeeIdx = (state.lomadee_idx || 0) % NICHOS_LOMADEE.length
  const awinIdx = (state.awin_idx || 0) % NICHOS_AWIN.length

  // Busca plataformas ativas
  const { data: plataformas } = await supabaseAdmin
    .from('config_plataformas')
    .select('plataforma')
    .eq('ativo', true)
    .in('plataforma', ['mercadolivre', 'shopee', 'lomadee', 'awin'])

  const ativas = (plataformas || []).map(p => p.plataforma)
  const resultados: Record<string, any> = {}

  const nichosMap: Record<string, string[]> = { mercadolivre: NICHOS_ML, shopee: NICHOS_SHOPEE, lomadee: NICHOS_LOMADEE, awin: NICHOS_AWIN }
  const idxMap: Record<string, number> = { mercadolivre: mlIdx, shopee: shopeeIdx, lomadee: lomadeeIdx, awin: awinIdx }

  const NICHOS_POR_CICLO = 3

  for (const plataforma of ativas) {
    const nichos = nichosMap[plataforma] || NICHOS_ML
    const baseIdx = idxMap[plataforma] ?? 0
    const resultadosPlat: any[] = []

    for (let i = 0; i < NICHOS_POR_CICLO; i++) {
      const idx = (baseIdx + i) % nichos.length
      const nicho = nichos[idx]

      try {
        const res = await fetch(`${BASE_URL}/api/busca/${plataforma}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nicho, limite: 15 }),
        })
        const data = await res.json()
        if (data.error) {
          resultadosPlat.push({ nicho, erro: data.error })
        } else {
          resultadosPlat.push({ nicho, salvos: data.salvos, total: data.total_encontrados })
        }
      } catch (e: any) {
        resultadosPlat.push({ nicho, erro: (e as any).message })
      }
    }

    resultados[plataforma] = resultadosPlat
  }

  await supabaseAdmin
    .from('config_plataformas')
    .upsert({
      plataforma: 'cron_state',
      credenciais: {
        ml_idx: (mlIdx + NICHOS_POR_CICLO) % NICHOS_ML.length,
        shopee_idx: (shopeeIdx + NICHOS_POR_CICLO) % NICHOS_SHOPEE.length,
        lomadee_idx: (lomadeeIdx + NICHOS_POR_CICLO) % NICHOS_LOMADEE.length,
        awin_idx: (awinIdx + NICHOS_POR_CICLO) % NICHOS_AWIN.length,
        last_run: new Date().toISOString(),
      },
      ativo: false,
    }, { onConflict: 'plataforma' })

  return NextResponse.json({
    executado_em: new Date().toISOString(),
    ml_nicho: NICHOS_ML[mlIdx],
    ml_proximo: NICHOS_ML[(mlIdx + 1) % NICHOS_ML.length],
    resultados,
  })
}
