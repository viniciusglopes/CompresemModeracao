import { NextResponse } from 'next/server'
import { erroMsg } from '@/lib/utils'
import { exigirAdmin } from '@/lib/admin-session'
import { supabaseAdmin } from '@/lib/supabase'
import { dispararAprovados } from '@/lib/disparo-aprovados'

const MAX_POR_CLIQUE = 20

// POST — botao "Disparar agora os aprovados" da tela /admin/aprovar.
// So envia o que ja esta aprovado; respeita anti-repost e categoria dos grupos.
// Nao olha horario nem intervalo do cron: e uma acao manual e explicita.
export async function POST(request: Request) {
  const auth = exigirAdmin(request)
  if (!auth.ok) return auth.resposta

  const { data } = await supabaseAdmin
    .from('config_plataformas')
    .select('credenciais')
    .eq('plataforma', 'disparo_auto')
    .maybeSingle()
  const palavras = (data?.credenciais?.palavras_bloqueadas || []) as string[]

  try {
    const r = await dispararAprovados({ limite: MAX_POR_CLIQUE, palavrasBloqueadas: palavras })
    return NextResponse.json({ ok: true, max_por_clique: MAX_POR_CLIQUE, ...r })
  } catch (e: unknown) {
    return NextResponse.json({ error: erroMsg(e) }, { status: 500 })
  }
}
