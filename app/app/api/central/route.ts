import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const origem = url.searchParams.get('origem') || ''
  const status = url.searchParams.get('status') || ''
  const plataforma = url.searchParams.get('plataforma') || ''
  const nicho = url.searchParams.get('nicho') || ''
  const de = url.searchParams.get('de') || ''
  const ate = url.searchParams.get('ate') || ''
  const limit = parseInt(url.searchParams.get('limit') || '300')

  const fetchProdutos = async () => {
    if (origem === 'garimpado') return { data: [], error: null }

    let query = supabaseAdmin
      .from('produtos')
      .select('id, titulo, preco, preco_original, desconto_percent, plataforma, link_afiliado, link_original, thumbnail, nicho, frete_gratis, qtd_vendida, score, score_detalhes, created_at, loja_nome')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (plataforma) query = query.eq('plataforma', plataforma)
    if (nicho) query = query.eq('nicho', nicho)
    if (de) query = query.gte('created_at', de + 'T00:00:00')
    if (ate) query = query.lte('created_at', ate + 'T23:59:59')

    return query
  }

  const fetchGarimpados = async () => {
    if (origem === 'api') return { data: [], error: null }

    let query = supabaseAdmin
      .from('produtos_garimpados')
      .select('id, titulo, preco, preco_original, desconto_percent, plataforma, link_afiliado, link_original, thumbnail, cupom, fonte_grupo, texto_original, status, criado_em, processado_em, enviado_em')
      .order('criado_em', { ascending: false })
      .limit(limit)

    if (plataforma) query = query.eq('plataforma', plataforma)
    if (de) query = query.gte('criado_em', de + 'T00:00:00')
    if (ate) query = query.lte('criado_em', ate + 'T23:59:59')

    if (status === 'pendente' || status === 'processado' || status === 'descartado') {
      query = query.eq('status', status)
    }

    return query
  }

  const fetchDisparos = async () => {
    const { data } = await supabaseAdmin
      .from('disparos')
      .select('produto_id')
      .limit(2000)
    return new Set((data || []).map((d: any) => d.produto_id as string))
  }

  const [prodRes, garimRes, enviados] = await Promise.all([
    fetchProdutos(),
    fetchGarimpados(),
    fetchDisparos(),
  ])

  if (prodRes.error) return NextResponse.json({ error: prodRes.error.message }, { status: 500 })
  if (garimRes.error) return NextResponse.json({ error: garimRes.error.message }, { status: 500 })

  const produtos = (prodRes.data || []).map((p: any) => ({
    ...p,
    origem: 'api' as const,
    data_ref: p.created_at,
    status_disparo: enviados.has(p.id) ? 'enviado' : 'pendente',
  }))

  const garimpados = (garimRes.data || []).map((g: any) => ({
    id: g.id,
    titulo: g.titulo,
    preco: g.preco,
    preco_original: g.preco_original,
    desconto_percent: g.desconto_percent,
    plataforma: g.plataforma,
    link_afiliado: g.link_afiliado,
    link_original: g.link_original,
    thumbnail: g.thumbnail,
    nicho: null,
    frete_gratis: false,
    qtd_vendida: 0,
    score: null,
    score_detalhes: null,
    loja_nome: null,
    cupom: g.cupom,
    fonte_grupo: g.fonte_grupo,
    texto_original: g.texto_original,
    status_garimpo: g.status,
    origem: 'garimpado' as const,
    data_ref: g.criado_em,
    created_at: g.criado_em,
    status_disparo: g.status === 'enviado' ? 'enviado' : enviados.has(g.id) ? 'enviado' : 'pendente',
  }))

  let todos = [...produtos, ...garimpados]

  if (status === 'enviado') {
    todos = todos.filter(p => p.status_disparo === 'enviado')
  } else if (status === 'pendente_disparo') {
    todos = todos.filter(p => p.status_disparo === 'pendente')
  }

  todos.sort((a, b) => new Date(b.data_ref).getTime() - new Date(a.data_ref).getTime())

  const stats = {
    total: todos.length,
    api: produtos.length,
    garimpados: garimpados.length,
    enviados: todos.filter(p => p.status_disparo === 'enviado').length,
    pendentes: todos.filter(p => p.status_disparo === 'pendente').length,
  }

  return NextResponse.json({ produtos: todos, stats })
}
