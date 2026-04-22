import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data, error } = await supabaseAdmin
    .from('config_plataformas')
    .select('*')
    .eq('plataforma', slug)
    .single()
  if (error) return NextResponse.json({ plataforma: null })
  return NextResponse.json({ plataforma: data })
}

export async function PUT(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const body = await request.json()
  const { data, error } = await supabaseAdmin
    .from('config_plataformas')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('plataforma', slug)
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, config: data })
}
