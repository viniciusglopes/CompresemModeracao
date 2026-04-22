import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('admin_notificacoes')
    .select('*')
    .order('criado_em', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const naoLidas = (data || []).filter(n => !n.lida).length
  return NextResponse.json({ notificacoes: data || [], nao_lidas: naoLidas })
}

// Marca todas como lidas
export async function PATCH() {
  const { error } = await supabaseAdmin
    .from('admin_notificacoes')
    .update({ lida: true })
    .eq('lida', false)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Limpa notificações lidas
export async function DELETE() {
  const { error } = await supabaseAdmin
    .from('admin_notificacoes')
    .delete()
    .eq('lida', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
