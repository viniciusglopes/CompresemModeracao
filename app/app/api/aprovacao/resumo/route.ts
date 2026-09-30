import { NextResponse } from 'next/server'
import { erroMsg } from '@/lib/utils'
import { exigirAdminOuCron } from '@/lib/admin-session'
import { contarAprovadosNaFila, listarCandidatos } from '@/lib/aprovacao'
import { NICHO_LABEL } from '@/lib/nicho'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://compresemmoderacao.com.br'

const fmt = (v: number | null) =>
  v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'

// GET — resumo do dia para avisar a Camilla (quem envia a mensagem e o assistente).
// Auth: sessao do admin OU header x-cron-secret.
// ?horas=24 (padrao) · ?top=5
export async function GET(request: Request) {
  const auth = exigirAdminOuCron(request)
  if (!auth.ok) return auth.resposta

  const sp = new URL(request.url).searchParams
  const horas = Math.min(Math.max(parseInt(sp.get('horas') || '24') || 24, 1), 24 * 30)
  const top = Math.min(Math.max(parseInt(sp.get('top') || '5') || 5, 1), 20)
  const desde = new Date(Date.now() - horas * 3600 * 1000).toISOString()

  try {
    const [pend, naFila] = await Promise.all([
      listarCandidatos({ desde, nicho: '', status: 'pendente', origem: '', limite: 500 }),
      contarAprovadosNaFila(),
    ])

    const porNicho: Record<string, number> = {}
    for (const i of pend.itens) {
      const k = i.nicho || 'sem_categoria'
      porNicho[k] = (porNicho[k] || 0) + 1
    }
    const destaques = [...pend.itens]
      .sort((a, b) => (b.desconto_percent || 0) - (a.desconto_percent || 0))
      .slice(0, top)
      .map(i => ({
        titulo: (i.titulo || '').slice(0, 90),
        preco: i.preco,
        desconto_percent: i.desconto_percent,
        plataforma: i.plataforma,
        nicho: i.nicho,
        origem: i.origem,
      }))

    const link = `${SITE_URL}/admin/aprovar`
    const linhas = [
      `Bom dia, Camilla! Tem ${pend.itens.length} oferta(s) nova(s) para você escolher (últimas ${horas}h).`,
      naFila ? `${naFila} já marcada(s) esperando o disparo.` : '',
      destaques.length ? 'Algumas que chegaram:' : '',
      ...destaques.map(d =>
        `- ${d.titulo} — ${fmt(d.preco)}${d.desconto_percent ? ` (-${d.desconto_percent}%)` : ''}${d.nicho ? ` · ${NICHO_LABEL[d.nicho as keyof typeof NICHO_LABEL] || d.nicho}` : ''}`),
      `Marque as que vão para os grupos: ${link}`,
    ].filter(Boolean)

    return NextResponse.json({
      data_ref: new Date().toISOString(),
      horas,
      pendentes: pend.itens.length,
      aprovados_na_fila: naFila,
      por_nicho: porNicho,
      destaques,
      link,
      texto: linhas.join('\n'),
    })
  } catch (e: unknown) {
    return NextResponse.json({ error: erroMsg(e) }, { status: 500 })
  }
}
