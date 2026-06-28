import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const nicho = searchParams.get('nicho')
  const plataforma = searchParams.get('plataforma')
  const limit = Math.min(parseInt(searchParams.get('limit') || '60'), 120)
  const offset = parseInt(searchParams.get('offset') || '0')
  const after = searchParams.get('after')

  let query = supabaseAdmin
    .from('produtos')
    .select('id, titulo, preco, preco_original, desconto_percent, plataforma, link_afiliado, link_original, thumbnail, nicho, frete_gratis, loja_nome, created_at')
    .eq('ativo', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (nicho) query = query.eq('nicho', nicho)
  if (plataforma) query = query.eq('plataforma', plataforma)
  if (after) query = query.gt('created_at', after)

  const { data: produtos, error } = await query

  let queryG = supabaseAdmin
    .from('produtos_garimpados')
    .select('id, titulo, preco, preco_original, desconto_percent, plataforma, link_afiliado, link_original, cupom, fonte_grupo, criado_em')
    .order('criado_em', { ascending: false })
    .range(offset, offset + limit - 1)

  if (plataforma) queryG = queryG.eq('plataforma', plataforma)
  if (after) queryG = queryG.gt('criado_em', after)

  const { data: garimpados } = await queryG

  // Fetch thumbnails from produtos table for garimpados that were promoted
  const garimpLinks = (garimpados || []).map(g => g.link_original).filter(Boolean)
  let thumbMap: Record<string, string> = {}
  if (garimpLinks.length > 0) {
    const { data: promoted } = await supabaseAdmin
      .from('produtos')
      .select('link_original, thumbnail')
      .in('link_original', garimpLinks)
    if (promoted) {
      for (const p of promoted) {
        if (p.thumbnail) thumbMap[p.link_original] = p.thumbnail
      }
    }
  }

  const garimpNorm = (garimpados || []).map(g => ({
    id: g.id,
    titulo: g.titulo,
    preco: g.preco,
    preco_original: g.preco_original,
    desconto_percent: g.desconto_percent,
    plataforma: g.plataforma,
    link_afiliado: g.link_afiliado,
    link_original: g.link_original,
    thumbnail: thumbMap[g.link_original] || null,
    nicho: null,
    frete_gratis: false,
    loja_nome: g.fonte_grupo,
    created_at: g.criado_em,
    origem: 'garimpado',
    cupom: g.cupom,
  }))

  const prodNorm = (produtos || []).map(p => ({ ...p, origem: 'api' }))

  const merged = [...prodNorm, ...garimpNorm]
    .filter(p => p.preco != null && p.preco > 0)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ produtos: merged, total: merged.length })
}
