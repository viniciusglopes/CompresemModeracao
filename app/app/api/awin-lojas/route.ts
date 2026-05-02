import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('awin_lojas')
    .select('*')
    .order('nome')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: Request) {
  const body = await request.json()
  const { id, ...fields } = body

  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const allowed = ['ativo', 'desconto_minimo', 'score_minimo', 'preco_max', 'prioridade']
  const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const key of allowed) {
    if (fields[key] !== undefined) updateData[key] = fields[key]
  }

  const { error } = await supabaseAdmin
    .from('awin_lojas')
    .update(updateData)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(request: Request) {
  const body = await request.json()
  const { ids, ativo } = body

  if (!Array.isArray(ids)) return NextResponse.json({ error: 'ids deve ser array' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('awin_lojas')
    .update({ ativo, updated_at: new Date().toISOString() })
    .in('id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, updated: ids.length })
}
