import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const nicho = searchParams.get('nicho')
  const plataforma = searchParams.get('plataforma')
  const limit = Math.min(parseInt(searchParams.get('limit') || '60'), 120)
  const offset = parseInt(searchParams.get('offset') || '0')

  const after = searchParams.get('after') // ISO — retorna só produtos criados depois deste timestamp

  let query = supabaseAdmin
    .from('produtos')
    .select('id, titulo, preco, preco_original, desconto_percent, plataforma, link_afiliado, link_original, thumbnail, nicho, frete_gratis, loja_nome, created_at')
    .eq('ativo', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (nicho) query = query.eq('nicho', nicho)
  if (plataforma) query = query.eq('plataforma', plataforma)
  if (after) query = query.gt('created_at', after)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ produtos: data || [], total: data?.length || 0 })
}
