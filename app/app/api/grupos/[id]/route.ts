import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nome, canal, grupo_id, ativo, nichos } = body

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (nome !== undefined) updates.nome = nome
    if (canal !== undefined) updates.canal = canal
    if (grupo_id !== undefined) updates.grupo_id = grupo_id
    if (ativo !== undefined) updates.ativo = ativo
    if (nichos !== undefined) updates.nichos = nichos?.length ? nichos : null

    const { data, error } = await supabaseAdmin
      .from('grupos')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, grupo: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await supabaseAdmin.from('grupos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
