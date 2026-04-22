import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await request.json()
    const { nicho, titulo, preco, preco_original, ativo } = body

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (nicho !== undefined) updates.nicho = nicho
    if (titulo !== undefined) updates.titulo = titulo
    if (preco !== undefined) updates.preco = preco
    if (preco_original !== undefined) updates.preco_original = preco_original
    if (ativo !== undefined) updates.ativo = ativo

    // Recalcula desconto se preço mudou
    if (updates.preco !== undefined || updates.preco_original !== undefined) {
      const { data: atual } = await supabaseAdmin
        .from('produtos').select('preco, preco_original').eq('id', id).single()
      const p = updates.preco ?? atual?.preco ?? 0
      const po = updates.preco_original ?? atual?.preco_original ?? p
      if (po > p && p > 0) {
        updates.desconto_percent = Math.round(((po - p) / po) * 100)
      }
    }

    const { data, error } = await supabaseAdmin
      .from('produtos')
      .update(updates)
      .eq('id', id)
      .select('id, nicho, titulo, preco, preco_original, desconto_percent, ativo')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, produto: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await supabaseAdmin.from('produtos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
