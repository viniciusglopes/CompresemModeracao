import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('grupos')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ grupos: data || [] })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { nome, canal, grupo_id, nichos } = body

    if (!nome || !canal || !grupo_id) {
      return NextResponse.json({ error: 'nome, canal e grupo_id são obrigatórios' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('grupos')
      .insert({ nome, canal, grupo_id, nichos: nichos?.length ? nichos : null, ativo: true })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, grupo: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
