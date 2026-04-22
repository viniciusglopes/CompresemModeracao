import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const plataforma = searchParams.get('plataforma')
  const status = searchParams.get('status')
  const dataInicio = searchParams.get('data_inicio')
  const dataFim = searchParams.get('data_fim')
  const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500)

  let query = supabaseAdmin
    .from('api_logs')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(limit)

  if (plataforma) query = query.eq('plataforma', plataforma)
  if (status) query = query.eq('status', status)
  if (dataInicio) query = query.gte('criado_em', dataInicio + 'T00:00:00Z')
  if (dataFim) query = query.lte('criado_em', dataFim + 'T23:59:59Z')

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const total = data?.length || 0
  const erros = data?.filter(l => l.status === 'error' || l.status === 'rate_limit').length || 0
  const sucessos = data?.filter(l => l.status === 'success').length || 0

  // Calcula tamanho dos JSONs armazenados
  let jsonSize: { size_bytes: number; size_pretty: string; rows_with_json: number } | null = null
  try {
    const { data: sizeRow } = await supabaseAdmin.rpc('get_api_logs_json_size').maybeSingle()
    if (sizeRow) jsonSize = sizeRow as any
  } catch {}

  return NextResponse.json({ logs: data || [], total, erros, sucessos, json_size: jsonSize })
}

// Limpa apenas os campos JSON (mantém os logs)
export async function PATCH() {
  const { error } = await supabaseAdmin
    .from('api_logs')
    .update({ request_json: null, response_json: null })
    .not('id', 'is', null) // aplica a todos os rows

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url)
  const dias = parseInt(searchParams.get('dias') || '30')
  const corte = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()

  const { error, count } = await supabaseAdmin
    .from('api_logs')
    .delete({ count: 'exact' })
    .lt('criado_em', corte)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deletados: count })
}
