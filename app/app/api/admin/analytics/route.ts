import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const [
      { count: totalProdutos },
      { count: totalDisparos },
      { count: totalClicks },
      { data: disparosRecentes },
      { data: apiLogs },
      { data: disparosPorDia },
    ] = await Promise.all([
      supabaseAdmin.from('produtos').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('disparos').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('clicks').select('*', { count: 'exact', head: true }),

      supabaseAdmin.from('disparos')
        .select('id, produto_id, canal, grupo_nome, status, erro, disparado_em')
        .order('disparado_em', { ascending: false })
        .limit(50),

      supabaseAdmin.from('api_logs')
        .select('id, plataforma, endpoint, status, duracao_ms, nicho, total_encontrados, salvos, erro, criado_em')
        .order('criado_em', { ascending: false })
        .limit(100),

      supabaseAdmin.from('disparos')
        .select('disparado_em, status')
        .order('disparado_em', { ascending: false })
        .limit(2000),
    ])

    const prodsByPlat: Record<string, number> = {}
    const { data: allProds } = await supabaseAdmin.from('produtos').select('plataforma')
    if (allProds) {
      for (const p of allProds) {
        prodsByPlat[p.plataforma] = (prodsByPlat[p.plataforma] || 0) + 1
      }
    }

    const dispByStatus: Record<string, number> = {}
    const dispByCanal: Record<string, number> = {}
    const dispByGrupo: Record<string, number> = {}
    if (disparosPorDia) {
      for (const d of disparosPorDia) {
        dispByStatus[d.status] = (dispByStatus[d.status] || 0) + 1
      }
    }
    if (disparosRecentes) {
      for (const d of disparosRecentes) {
        dispByCanal[d.canal] = (dispByCanal[d.canal] || 0) + 1
        dispByGrupo[d.grupo_nome || 'N/A'] = (dispByGrupo[d.grupo_nome || 'N/A'] || 0) + 1
      }
    }

    const apiByPlat: Record<string, { success: number; error: number; rate_limit: number; total: number; avg_ms: number }> = {}
    if (apiLogs) {
      for (const log of apiLogs) {
        if (!apiByPlat[log.plataforma]) {
          apiByPlat[log.plataforma] = { success: 0, error: 0, rate_limit: 0, total: 0, avg_ms: 0 }
        }
        const entry = apiByPlat[log.plataforma]
        entry.total++
        if (log.status === 'success') entry.success++
        else if (log.status === 'rate_limit') entry.rate_limit++
        else entry.error++
        entry.avg_ms += log.duracao_ms || 0
      }
      for (const plat of Object.keys(apiByPlat)) {
        if (apiByPlat[plat].total > 0) {
          apiByPlat[plat].avg_ms = Math.round(apiByPlat[plat].avg_ms / apiByPlat[plat].total)
        }
      }
    }

    const dispDiario: Record<string, { enviado: number; erro: number }> = {}
    if (disparosPorDia) {
      for (const d of disparosPorDia) {
        const dia = d.disparado_em?.slice(0, 10) || 'unknown'
        if (!dispDiario[dia]) dispDiario[dia] = { enviado: 0, erro: 0 }
        if (d.status === 'enviado') dispDiario[dia].enviado++
        else dispDiario[dia].erro++
      }
    }

    return NextResponse.json({
      resumo: {
        total_produtos: totalProdutos || 0,
        total_disparos: totalDisparos || 0,
        total_clicks: totalClicks || 0,
      },
      produtos_por_plataforma: prodsByPlat,
      disparos: {
        por_status: dispByStatus,
        por_canal: dispByCanal,
        por_grupo: dispByGrupo,
        diario: dispDiario,
        recentes: disparosRecentes || [],
      },
      api_logs: {
        por_plataforma: apiByPlat,
        recentes: apiLogs || [],
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
