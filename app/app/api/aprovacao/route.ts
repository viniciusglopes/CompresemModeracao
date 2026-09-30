import { NextResponse } from 'next/server'
import { erroMsg } from '@/lib/utils'
import { exigirAdmin } from '@/lib/admin-session'
import { aplicarAcao, contarAprovadosNaFila, listarCandidatos, mudarNicho, type FiltroStatus } from '@/lib/aprovacao'
import { contasPublicas } from '@/lib/afiliado'

const STATUS_VALIDOS: FiltroStatus[] = ['fila', 'pendente', 'aprovado', 'disparado', 'rejeitado', 'todos']

// GET — lista de candidatos para aprovar (produtos + garimpados dos grupos)
export async function GET(request: Request) {
  const auth = exigirAdmin(request)
  if (!auth.ok) return auth.resposta

  const sp = new URL(request.url).searchParams
  const horas = Math.min(Math.max(parseInt(sp.get('horas') || '24') || 24, 1), 24 * 90)
  const status = (sp.get('status') || 'fila') as FiltroStatus
  const origem = sp.get('origem') || ''

  try {
    const r = await listarCandidatos({
      desde: new Date(Date.now() - horas * 3600 * 1000).toISOString(),
      nicho: sp.get('nicho') || '',
      status: STATUS_VALIDOS.includes(status) ? status : 'fila',
      origem: origem === 'grupo' || origem === 'busca' ? origem : '',
      limite: Math.min(parseInt(sp.get('limite') || '200') || 200, 500),
    })
    const aprovados_na_fila = await contarAprovadosNaFila()
    return NextResponse.json({ itens: r.itens, total: r.total, aprovados_na_fila, contas: contasPublicas(r.contas) })
  } catch (e: unknown) {
    return NextResponse.json({ error: erroMsg(e) }, { status: 500 })
  }
}

// POST — { acao: 'aprovar' | 'desmarcar' | 'rejeitar', chaves: ['p:<id>' | 'g:<id>'] }
export async function POST(request: Request) {
  const auth = exigirAdmin(request)
  if (!auth.ok) return auth.resposta

  try {
    const { acao, chaves } = await request.json()
    if (!['aprovar', 'desmarcar', 'rejeitar'].includes(acao)) {
      return NextResponse.json({ error: 'acao inválida' }, { status: 400 })
    }
    if (!Array.isArray(chaves) || !chaves.length || chaves.length > 500) {
      return NextResponse.json({ error: 'chaves obrigatórias (máx. 500)' }, { status: 400 })
    }
    const r = await aplicarAcao(acao, chaves, auth.quem)
    return NextResponse.json({ ok: r.ok, erros: r.erros })
  } catch (e: unknown) {
    return NextResponse.json({ error: erroMsg(e) }, { status: 500 })
  }
}

// PATCH — { chave, nicho } troca a categoria de um item (nicho '' = sem categoria)
export async function PATCH(request: Request) {
  const auth = exigirAdmin(request)
  if (!auth.ok) return auth.resposta

  try {
    const { chave, nicho } = await request.json()
    await mudarNicho(String(chave || ''), nicho ? String(nicho) : null)
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: erroMsg(e) }, { status: 400 })
  }
}
