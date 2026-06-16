import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const status = url.searchParams.get('status') || ''
  const plataforma = url.searchParams.get('plataforma') || ''
  const limit = parseInt(url.searchParams.get('limit') || '100')
  const offset = parseInt(url.searchParams.get('offset') || '0')

  let query = supabaseAdmin
    .from('produtos_garimpados')
    .select('*', { count: 'exact' })
    .order('criado_em', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status) query = query.eq('status', status)
  if (plataforma) query = query.eq('plataforma', plataforma)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: stats } = await supabaseAdmin.rpc('garimpados_stats').single()

  return NextResponse.json({
    produtos: data || [],
    total: count || 0,
    stats: stats || null,
  })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { ids, status } = body

  if (!ids?.length || !status) {
    return NextResponse.json({ error: 'ids e status obrigatórios' }, { status: 400 })
  }

  const updates: Record<string, any> = { status }
  if (status === 'processado') updates.processado_em = new Date().toISOString()
  if (status === 'enviado') updates.enviado_em = new Date().toISOString()

  const { error, count } = await supabaseAdmin
    .from('produtos_garimpados')
    .update(updates)
    .in('id', ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, atualizados: count })
}

export async function DELETE(request: NextRequest) {
  const body = await request.json()
  const { ids } = body

  if (!ids?.length) {
    return NextResponse.json({ error: 'ids obrigatórios' }, { status: 400 })
  }

  const { error, count } = await supabaseAdmin
    .from('produtos_garimpados')
    .delete()
    .in('id', ids)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, excluidos: count })
}
