import { NextResponse } from 'next/server'
import { erroMsg } from '@/lib/utils'
import { exigirAdmin } from '@/lib/admin-session'
import { supabaseAdmin } from '@/lib/supabase'
import { dispararAprovados } from '@/lib/disparo-aprovados'
import { MSG_SEM_GRUPO } from '@/lib/grupos-alvo'

const MAX_POR_CLIQUE = 20

// POST — botao "Disparar agora os aprovados" da tela /admin/aprovar.
// So envia o que ja esta aprovado; respeita anti-repost e categoria dos grupos.
// Nao olha horario nem intervalo do cron: e uma acao manual e explicita.
// Corpo (opcional):
//   dry: true                        -> so devolve quem sairia e os grupos pre-marcados
//   grupos_por_produto: {id: [ids]}  -> escolha da tela; vence a categoria; so esses saem
// Nenhum envio feito => resposta de ERRO (nunca "sucesso" sem mensagem saindo).
export async function POST(request: Request) {
  const auth = exigirAdmin(request)
  if (!auth.ok) return auth.resposta

  const { data } = await supabaseAdmin
    .from('config_plataformas')
    .select('credenciais')
    .eq('plataforma', 'disparo_auto')
    .maybeSingle()
  const palavras = (data?.credenciais?.palavras_bloqueadas || []) as string[]

  let body: { dry?: unknown; grupos_por_produto?: unknown } = {}
  try { body = await request.json() } catch { /* sem corpo */ }
  const dry = body.dry === true
  const mapa = body.grupos_por_produto
  let gruposPorProduto: Record<string, string[]> | undefined
  if (mapa !== undefined) {
    if (!mapa || typeof mapa !== 'object' || Array.isArray(mapa)) {
      return NextResponse.json({ error: 'grupos_por_produto inválido' }, { status: 400 })
    }
    gruposPorProduto = Object.fromEntries(
      Object.entries(mapa as Record<string, unknown>).map(([k, v]) =>
        [k, Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []]),
    )
    if (!dry && Object.values(gruposPorProduto).every(v => v.length === 0)) {
      return NextResponse.json({ error: MSG_SEM_GRUPO }, { status: 400 })
    }
  }

  try {
    const r = await dispararAprovados({ limite: MAX_POR_CLIQUE, palavrasBloqueadas: palavras, dry, gruposPorProduto })
    if (!dry && r.enviados === 0) {
      const semGrupo = r.motivo === MSG_SEM_GRUPO || r.produtos.some(p => p.erro === MSG_SEM_GRUPO)
      return NextResponse.json(
        { ok: false, max_por_clique: MAX_POR_CLIQUE, ...r, error: r.motivo || (r.produtos.length ? 'Nada foi enviado — todos os envios falharam (veja o erro de cada grupo)' : 'Nada foi enviado') },
        { status: semGrupo || !r.produtos.length ? 400 : 502 },
      )
    }
    return NextResponse.json({ ok: true, max_por_clique: MAX_POR_CLIQUE, ...r })
  } catch (e: unknown) {
    return NextResponse.json({ error: erroMsg(e) }, { status: 500 })
  }
}
