import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// --------------- helpers ---------------

async function resolverUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    })
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

// --------------- inline affiliate link builders ---------------

interface AffiliateConfigs {
  ml_tag: string | null
  amazon_tag: string | null
}

let _affiliateConfigsCache: { configs: AffiliateConfigs; ts: number } | null = null

async function getAffiliateConfigs(): Promise<AffiliateConfigs> {
  // Cache for 5 minutes to avoid hitting DB on every request
  if (_affiliateConfigsCache && Date.now() - _affiliateConfigsCache.ts < 5 * 60 * 1000) {
    return _affiliateConfigsCache.configs
  }
  const { data: rows } = await supabaseAdmin
    .from('config_plataformas')
    .select('plataforma, credenciais')
    .in('plataforma', ['mercadolivre', 'amazon'])

  const configs: AffiliateConfigs = { ml_tag: null, amazon_tag: null }
  for (const r of rows || []) {
    if (r.plataforma === 'mercadolivre') configs.ml_tag = r.credenciais?.affiliate_tag || null
    if (r.plataforma === 'amazon') configs.amazon_tag = r.credenciais?.affiliate_tag || null
  }
  _affiliateConfigsCache = { configs, ts: Date.now() }
  return configs
}

function buildMlAffiliateLinkInline(resolvedUrl: string, affiliateTag: string): string {
  try {
    const parsed = new URL(resolvedUrl)
    parsed.searchParams.delete('matt_tool')
    parsed.searchParams.delete('matt_word')
    parsed.searchParams.delete('matt_source')
    parsed.searchParams.delete('matt_campaign')
    parsed.searchParams.set('matt_tool', affiliateTag)
    return parsed.toString()
  } catch {
    const sep = resolvedUrl.includes('?') ? '&' : '?'
    return `${resolvedUrl}${sep}matt_tool=${affiliateTag}`
  }
}

function buildAmazonAffiliateLinkInline(resolvedUrl: string, amazonTag: string): string {
  try {
    const parsed = new URL(resolvedUrl)
    parsed.searchParams.set('tag', amazonTag)
    return parsed.toString()
  } catch {
    if (resolvedUrl.includes('tag=')) {
      return resolvedUrl.replace(/tag=[^&]+/, `tag=${amazonTag}`)
    }
    const sep = resolvedUrl.includes('?') ? '&' : '?'
    return `${resolvedUrl}${sep}tag=${amazonTag}`
  }
}

async function fixAffiliateLinkInline(
  linkOriginal: string,
  plataforma: string,
  configs: AffiliateConfigs,
): Promise<string | null> {
  try {
    if (plataforma === 'mercadolivre' && configs.ml_tag) {
      const resolved = await resolverUrl(linkOriginal)
      if (resolved.includes('mercadolivre.com') && !resolved.includes('/p/')) return null
      return buildMlAffiliateLinkInline(resolved, configs.ml_tag)
    }
    if (plataforma === 'amazon' && configs.amazon_tag) {
      // Amazon links don't need resolving to swap tag
      const resolved = linkOriginal.includes('amzn.to') ? await resolverUrl(linkOriginal) : linkOriginal
      return buildAmazonAffiliateLinkInline(resolved, configs.amazon_tag)
    }
  } catch {}
  return null
}

// --------------- main handler ---------------

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

  const affiliateConfigs = await getAffiliateConfigs()

  const garimpNorm = await Promise.all((garimpados || []).map(async g => {
    let linkAfiliado = g.link_afiliado
    if (g.plataforma === 'mercadolivre') {
      let needsFix = false
      if (linkAfiliado) {
        try {
          const u = new URL(linkAfiliado)
          if (u.hostname.includes('mercadolivre.com') && !u.pathname.includes('/p/')) needsFix = true
          if (u.hostname.includes('meli.la')) needsFix = true
        } catch { needsFix = true }
      } else {
        needsFix = true
      }
      if (needsFix && affiliateConfigs.ml_tag) {
        const resolved = await resolverUrl(g.link_original)
        try {
          const u = new URL(resolved)
          if (u.pathname.includes('/p/')) {
            u.searchParams.set('matt_tool', affiliateConfigs.ml_tag)
            linkAfiliado = u.toString()
          } else if (u.hostname.includes('mercadolivre.com')) {
            u.searchParams.set('matt_tool', affiliateConfigs.ml_tag)
            linkAfiliado = u.toString()
          } else {
            linkAfiliado = g.link_original
          }
        } catch {
          linkAfiliado = g.link_original
        }
      } else if (needsFix) {
        linkAfiliado = g.link_original
      }
    }
    return {
      id: g.id,
      titulo: g.titulo,
      preco: g.preco,
      preco_original: g.preco_original,
      desconto_percent: g.desconto_percent,
      plataforma: g.plataforma,
      link_afiliado: linkAfiliado,
      link_original: g.link_original,
      thumbnail: g.thumbnail || null,
      nicho: null,
      frete_gratis: false,
      loja_nome: g.fonte_grupo,
      created_at: g.criado_em,
      origem: 'garimpado' as const,
      cupom: g.cupom,
    }
  }))

  const prodNorm = (produtos || []).map(p => ({ ...p, origem: 'api' as const }))

  const merged = [...prodNorm, ...garimpNorm]
    .filter(p => p.preco != null && p.preco > 0 && p.thumbnail)
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

  // Enriquecer inline: fix affiliate links de garimpados sem link_afiliado ou com link de terceiros (max 5 por request)
  const semAfiliado = merged.filter(p =>
    p.origem === 'garimpado' &&
    p.link_original &&
    (!p.link_afiliado || p.link_afiliado === p.link_original) &&
    (p.plataforma === 'mercadolivre' || p.plataforma === 'amazon')
  )
  if (semAfiliado.length > 0) {
    const batch = semAfiliado.slice(0, 5)
    const promises = batch.map(async (p) => {
      const newLink = await fixAffiliateLinkInline(p.link_original, p.plataforma, affiliateConfigs)
      if (newLink) {
        p.link_afiliado = newLink
        // Fire-and-forget: persist to DB so next request doesn't need to fix again
        supabaseAdmin
          .from('produtos_garimpados')
          .update({ link_afiliado: newLink })
          .eq('id', p.id)
          .then(() => {})
      }
    })
    await Promise.allSettled(promises)
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ produtos: merged, total: merged.length })
}
