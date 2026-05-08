import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const plataforma = searchParams.get('plataforma')
  const nicho = searchParams.get('nicho')
  const loja = searchParams.get('loja')
  const search = searchParams.get('search')
  const sort = searchParams.get('sort') || 'updated_at'
  const order = searchParams.get('order') === 'asc' ? true : false
  const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500)
  const offset = parseInt(searchParams.get('offset') || '0')
  const descontoMin = parseInt(searchParams.get('desconto_min') || '0')
  const ativo = searchParams.get('ativo')

  let query = supabaseAdmin
    .from('produtos')
    .select('*', { count: 'exact' })
    .order(sort, { ascending: order })
    .range(offset, offset + limit - 1)

  if (plataforma) query = query.eq('plataforma', plataforma)
  if (nicho) query = query.eq('nicho', nicho)
  if (loja) query = query.eq('loja_nome', loja)
  if (ativo === 'true') query = query.eq('ativo', true)
  if (ativo === 'false') query = query.eq('ativo', false)
  if (descontoMin > 0) query = query.gte('desconto_percent', descontoMin)
  if (search) query = query.ilike('titulo', `%${search}%`)

  const { data, error, count } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const lojas = [...new Set((data || []).map(p => p.loja_nome).filter(Boolean))].sort()
  const nichos = [...new Set((data || []).map(p => p.nicho).filter(Boolean))].sort()
  const plataformas = [...new Set((data || []).map(p => p.plataforma).filter(Boolean))].sort()

  return NextResponse.json({
    produtos: data || [],
    total: count || 0,
    filtros: { lojas, nichos, plataformas },
  })
}
