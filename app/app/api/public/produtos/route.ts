import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

async function resolverUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(5000) })
    return res.url || url
  } catch {
    return url
  }
}

async function fetchThumbnailRapido(url: string, plataforma: string): Promise<string | null> {
  try {
    const resolved = await resolverUrl(url)
    const res = await fetch(resolved, {
      headers: { 'User-Agent': 'facebookexternalhit/1.1' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const ogMatch = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
    return ogMatch?.[1] || null
  } catch {
    return null
  }
}

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
    .select('id, titulo, preco, preco_original, desconto_percent, plataforma, link_afiliado, link_original, thumbnail, cupom, fonte_grupo, criado_em')
    .order('criado_em', { ascending: false })
    .range(offset, offset + limit - 1)

  if (plataforma) queryG = queryG.eq('plataforma', plataforma)
  if (after) queryG = queryG.gt('criado_em', after)

  const { data: garimpados } = await queryG

  const garimpNorm = (garimpados || []).map(g => ({
    id: g.id,
    titulo: g.titulo,
    preco: g.preco,
    preco_original: g.preco_original,
    desconto_percent: g.desconto_percent,
    plataforma: g.plataforma,
    link_afiliado: g.link_afiliado,
    link_original: g.link_original,
    thumbnail: g.thumbnail || null,
    nicho: null,
    frete_gratis: false,
    loja_nome: g.fonte_grupo,
    created_at: g.criado_em,
    origem: 'garimpado' as const,
    cupom: g.cupom,
  }))

  const prodNorm = (produtos || []).map(p => ({ ...p, origem: 'api' as const }))

  const merged = [...prodNorm, ...garimpNorm]
    .filter(p => p.preco != null && p.preco > 0)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit)

  // Enriquecer inline: resolve thumbnails de garimpados sem imagem (max 5 por request)
  const semThumb = merged.filter(p => !p.thumbnail && p.origem === 'garimpado' && p.link_original)
  if (semThumb.length > 0) {
    const batch = semThumb.slice(0, 5)
    const promises = batch.map(async (p) => {
      const thumb = await fetchThumbnailRapido(p.link_original, p.plataforma)
      if (thumb) {
        p.thumbnail = thumb
        supabaseAdmin
          .from('produtos_garimpados')
          .update({ thumbnail: thumb })
          .eq('id', p.id)
          .then(() => {})
      }
    })
    await Promise.allSettled(promises)
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ produtos: merged, total: merged.length })
}
