import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createShortLink } from '@/lib/short-link'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const search = searchParams.get('search') || ''
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('short_links')
    .select('*, produto:produto_id(id, titulo, thumbnail)', { count: 'exact' })
    .order('criado_em', { ascending: false })
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`slug.ilike.%${search}%,url_destino.ilike.%${search}%`)
  }

  const { data, count, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, total: count })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { url_destino, produto_id } = body

  if (!url_destino) {
    return NextResponse.json({ error: 'url_destino é obrigatório' }, { status: 400 })
  }

  const slug = await createShortLink(url_destino, produto_id)

  const { data, error } = await supabaseAdmin
    .from('short_links')
    .select('*')
    .eq('slug', slug)
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
