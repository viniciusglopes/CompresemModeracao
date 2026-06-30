import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getMlAccessToken } from '@/lib/ml-auth'

const ML_API = 'https://api.mercadolibre.com'

// --------------- helpers ---------------

async function resolverUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    })
    return res.url || url
  } catch {
    return url
  }
}

function extrairMlbId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const m = parsed.pathname.match(/(MLB-?\d{8,14})/)
    if (m) return m[1].replace('-', '')
    const itemMatch = url.match(/MLB[- _]?(\d+)/i)
    if (itemMatch) return `MLB${itemMatch[1]}`
  } catch {}
  return null
}

async function fetchMlThumbnail(itemId: string, token: string): Promise<string | null> {
  try {
    const res = await fetch(`${ML_API}/items/${itemId}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return null
    const item = await res.json()
    if (item.error) return null
    const thumb = item.thumbnail || item.pictures?.[0]?.url || ''
    return thumb ? thumb.replace('http://', 'https://') : null
  } catch {
    return null
  }
}

async function resolverMlProductUrl(url: string, titulo?: string, token?: string | null): Promise<string | null> {
  try {
    const u = new URL(url)
    if (u.hostname.includes('mercadolivre.com') && u.pathname.includes('/p/')) return url
    if (!u.hostname.includes('mercadolivre.com') && !u.hostname.includes('meli.la')) return url

    const resolved = await resolverUrl(url)
    try {
      const ru = new URL(resolved)
      if (ru.pathname.includes('/p/')) return resolved
    } catch {}

    if (titulo && token) {
      const cleanTitle = titulo.replace(/[_~\-]+/g, ' ').replace(/\s{2,}/g, ' ').split(' ').slice(0, 6).join(' ')
      const searchRes = await fetch(
        `${ML_API}/sites/MLB/search?q=${encodeURIComponent(cleanTitle)}&limit=1`,
        { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(8000) }
      )
      if (searchRes.ok) {
        const data = await searchRes.json()
        const item = data?.results?.[0]
        if (item?.permalink) return item.permalink
      }
    }

    return null
  } catch {
    return null
  }
}

async function fetchThumbnailByOg(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)' },
      signal: AbortSignal.timeout(8000),
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

async function fetchThumbnailShopee(url: string, shopeeCfg?: { app_id: string; secret: string }): Promise<string | null> {
  try {
    const resolved = await resolverUrl(url)
    const idMatch = resolved.match(/\/(\d{8,})\/(\d{8,})/)
    if (!idMatch) return null
    const [, shopId, itemId] = idMatch
    let appId = shopeeCfg?.app_id
    let secret = shopeeCfg?.secret
    if (!appId || !secret) {
      const { data: cfg } = await supabaseAdmin
        .from('config_plataformas').select('credenciais').eq('plataforma', 'shopee').maybeSingle()
      appId = cfg?.credenciais?.app_id
      secret = cfg?.credenciais?.secret
    }
    if (!appId || !secret) return null
    const { createHash } = await import('crypto')
    const body = JSON.stringify({ query: `{ productOfferV2(itemId: ${itemId}, shopId: ${shopId}) { nodes { imageUrl } } }` })
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = createHash('sha256').update(`${appId}${timestamp}${body}${secret}`).digest('hex')
    const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `SHA256 Credential=${appId}, Signature=${signature}, Timestamp=${timestamp}` },
      body,
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.data?.productOfferV2?.nodes?.[0]?.imageUrl || null
  } catch {}
  return null
}

// --------------- affiliate link builders ---------------

interface PlatformConfigs {
  ml_tag: string | null
  amazon_tag: string | null
  shopee_app_id: string | null
  shopee_secret: string | null
}

async function loadPlatformConfigs(): Promise<PlatformConfigs> {
  const { data: rows } = await supabaseAdmin
    .from('config_plataformas')
    .select('plataforma, credenciais')
    .in('plataforma', ['mercadolivre', 'amazon', 'shopee'])

  const cfg: PlatformConfigs = { ml_tag: null, amazon_tag: null, shopee_app_id: null, shopee_secret: null }
  for (const r of rows || []) {
    if (r.plataforma === 'mercadolivre') cfg.ml_tag = r.credenciais?.affiliate_tag || null
    if (r.plataforma === 'amazon') cfg.amazon_tag = r.credenciais?.affiliate_tag || null
    if (r.plataforma === 'shopee') {
      cfg.shopee_app_id = r.credenciais?.app_id || null
      cfg.shopee_secret = r.credenciais?.secret || null
    }
  }
  return cfg
}

function detectPlatform(url: string): string | null {
  const lower = url.toLowerCase()
  if (lower.includes('mercadolivre.com') || lower.includes('mercadolibre.com') || lower.includes('meli.la') || lower.includes('produto.mercadolivre'))
    return 'mercadolivre'
  if (lower.includes('amazon.com') || lower.includes('amzn.to') || lower.includes('amzn.com'))
    return 'amazon'
  if (lower.includes('shopee.com'))
    return 'shopee'
  return null
}

function buildMlAffiliateLink(resolvedUrl: string, affiliateTag: string): string {
  try {
    const parsed = new URL(resolvedUrl)
    // Strip existing affiliate params
    parsed.searchParams.delete('matt_tool')
    parsed.searchParams.delete('matt_word')
    parsed.searchParams.delete('matt_source')
    parsed.searchParams.delete('matt_campaign')
    // Add our affiliate tag
    parsed.searchParams.set('matt_tool', affiliateTag)
    return parsed.toString()
  } catch {
    // Fallback: append param manually
    const sep = resolvedUrl.includes('?') ? '&' : '?'
    return `${resolvedUrl}${sep}matt_tool=${affiliateTag}`
  }
}

function buildAmazonAffiliateLink(resolvedUrl: string, amazonTag: string): string {
  try {
    const parsed = new URL(resolvedUrl)
    parsed.searchParams.set('tag', amazonTag)
    return parsed.toString()
  } catch {
    // Fallback: replace or append tag param
    if (resolvedUrl.includes('tag=')) {
      return resolvedUrl.replace(/tag=[^&]+/, `tag=${amazonTag}`)
    }
    const sep = resolvedUrl.includes('?') ? '&' : '?'
    return `${resolvedUrl}${sep}tag=${amazonTag}`
  }
}

async function buildShopeeAffiliateLink(url: string, appId: string, secret: string): Promise<string | null> {
  try {
    const { createHash } = await import('crypto')
    const body = JSON.stringify({
      generateShortLink: { originUrl: url, subIds: ['csm'] },
    })
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = createHash('sha256').update(`${appId}${timestamp}${body}${secret}`).digest('hex')
    const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `SHA256 Credential=${appId}, Signature=${signature}, Timestamp=${timestamp}`,
      },
      body,
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.data?.generateShortLink?.shortLink || null
  } catch {
    return null
  }
}

async function buildAffiliateLink(
  linkOriginal: string,
  plataforma: string | null,
  resolvedUrl: string | null,
  configs: PlatformConfigs
): Promise<string | null> {
  const resolved = resolvedUrl || await resolverUrl(linkOriginal)
  const platform = plataforma || detectPlatform(resolved)

  if (platform === 'mercadolivre' && configs.ml_tag) {
    if (resolved.includes('mercadolivre.com')) {
      return buildMlAffiliateLink(resolved, configs.ml_tag)
    }
    return null
  }
  if (platform === 'amazon' && configs.amazon_tag) {
    return buildAmazonAffiliateLink(resolved, configs.amazon_tag)
  }
  if (platform === 'shopee' && configs.shopee_app_id && configs.shopee_secret) {
    return buildShopeeAffiliateLink(resolved, configs.shopee_app_id, configs.shopee_secret)
  }
  // Unknown platform: try to detect from resolved URL
  if (!platform) {
    const detected = detectPlatform(resolved)
    if (detected) return buildAffiliateLink(linkOriginal, detected, resolved, configs)
  }
  return null
}

// --------------- main handler ---------------

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const batchSize = Math.min(parseInt(searchParams.get('batch') || '30'), 50)

  // --- Phase 1: Thumbnail enrichment (existing) ---
  const { data: semThumb, error: errThumb } = await supabaseAdmin
    .from('produtos_garimpados')
    .select('id, link_original, plataforma, titulo')
    .is('thumbnail', null)
    .order('criado_em', { ascending: false })
    .limit(batchSize)

  // --- Phase 2: Affiliate link enrichment ---
  // PostgREST can't do column-to-column comparison, so we fetch IS NULL from DB
  // and also fetch recent garimpados to check link_afiliado === link_original in code
  const { data: semAfiliadoNull, error: errAfiliado } = await supabaseAdmin
    .from('produtos_garimpados')
    .select('id, link_original, link_afiliado, plataforma, titulo, thumbnail')
    .is('link_afiliado', null)
    .order('criado_em', { ascending: false })
    .limit(batchSize)

  // Also fetch recent garimpados that HAVE link_afiliado to check if it equals link_original
  const { data: recentWithLink } = await supabaseAdmin
    .from('produtos_garimpados')
    .select('id, link_original, link_afiliado, plataforma, titulo, thumbnail')
    .not('link_afiliado', 'is', null)
    .order('criado_em', { ascending: false })
    .limit(batchSize)

  const isBrokenMlLink = (link: string) => {
    try {
      const u = new URL(link)
      return u.hostname.includes('mercadolivre.com') && !u.pathname.includes('/p/')
    } catch { return false }
  }

  const semAfiliado = [
    ...(semAfiliadoNull || []),
    ...(recentWithLink || []).filter(g =>
      g.link_afiliado === g.link_original ||
      (g.link_afiliado && isBrokenMlLink(g.link_afiliado))
    ),
  ].slice(0, batchSize)

  if (errThumb || errAfiliado) {
    return NextResponse.json({ error: (errThumb || errAfiliado)!.message }, { status: 500 })
  }

  // Combine IDs so we process each garimpado once, doing both if needed
  const allIds = new Set<string>()
  const garimpMap = new Map<string, { id: string; link_original: string; link_afiliado?: string | null; plataforma: string; titulo: string; needsThumb: boolean; needsAffiliate: boolean }>()

  for (const g of semThumb || []) {
    allIds.add(g.id)
    garimpMap.set(g.id, { ...g, needsThumb: true, needsAffiliate: false })
  }
  for (const g of semAfiliado || []) {
    if (garimpMap.has(g.id)) {
      garimpMap.get(g.id)!.needsAffiliate = true
    } else {
      allIds.add(g.id)
      garimpMap.set(g.id, { ...g, needsThumb: false, needsAffiliate: true })
    }
  }

  const garimpados = Array.from(garimpMap.values())

  if (!garimpados.length) {
    return NextResponse.json({ ok: true, enriched: 0, message: 'Nenhum garimpado para enriquecer' })
  }

  let mlToken: string | null = null
  try { mlToken = await getMlAccessToken() } catch {}

  const configs = await loadPlatformConfigs()

  let enrichedThumb = 0
  let enrichedLink = 0
  let failed = 0
  const results: { id: string; status: string; thumbnail?: string; link_afiliado?: string }[] = []

  for (const g of garimpados) {
    let thumbnail: string | null = null
    let linkAfiliado: string | null = null
    let resolvedUrl: string | null = null

    try {
      // Resolve URL once (shared between thumbnail and affiliate logic)
      if (g.plataforma === 'mercadolivre' || !g.plataforma) {
        resolvedUrl = await resolverMlProductUrl(g.link_original, g.titulo, mlToken)
        if (!resolvedUrl) resolvedUrl = await resolverUrl(g.link_original)
      } else if (g.plataforma === 'amazon') {
        resolvedUrl = await resolverUrl(g.link_original)
      }

      // --- Thumbnail ---
      if (g.needsThumb) {
        if (g.plataforma === 'mercadolivre') {
          const mlbId = extrairMlbId(resolvedUrl!)
          if (mlbId && mlToken) {
            thumbnail = await fetchMlThumbnail(mlbId, mlToken)
          }
          if (!thumbnail) {
            thumbnail = await fetchThumbnailByOg(resolvedUrl!)
          }
        } else if (g.plataforma === 'shopee') {
          thumbnail = await fetchThumbnailShopee(
            g.link_original,
            configs.shopee_app_id && configs.shopee_secret
              ? { app_id: configs.shopee_app_id, secret: configs.shopee_secret }
              : undefined,
          )
        } else if (g.plataforma === 'amazon') {
          const asinMatch = resolvedUrl!.match(/\/dp\/([A-Z0-9]{10})/i)
          if (asinMatch) {
            thumbnail = `https://images-na.ssl-images-amazon.com/images/P/${asinMatch[1]}.01._SCLZZZZZZZ_.jpg`
          }
          if (!thumbnail) {
            thumbnail = await fetchThumbnailByOg(resolvedUrl!)
          }
        } else {
          if (!resolvedUrl) resolvedUrl = await resolverUrl(g.link_original)
          thumbnail = await fetchThumbnailByOg(resolvedUrl)
        }
      }

      // --- Affiliate Link ---
      if (g.needsAffiliate) {
        linkAfiliado = await buildAffiliateLink(g.link_original, g.plataforma, resolvedUrl, configs)
      }
    } catch {}

    // Build update payload
    const updatePayload: Record<string, string> = {}
    if (thumbnail) updatePayload.thumbnail = thumbnail
    if (linkAfiliado) updatePayload.link_afiliado = linkAfiliado

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await supabaseAdmin
        .from('produtos_garimpados')
        .update(updatePayload)
        .eq('id', g.id)

      if (!updateError) {
        if (thumbnail) enrichedThumb++
        if (linkAfiliado) enrichedLink++
        results.push({ id: g.id, status: 'ok', thumbnail: thumbnail || undefined, link_afiliado: linkAfiliado || undefined })
      } else {
        failed++
        results.push({ id: g.id, status: 'update_error' })
      }
    } else {
      failed++
      results.push({ id: g.id, status: 'no_enrichment_found' })
    }
  }

  return NextResponse.json({
    ok: true,
    enriched_thumbnails: enrichedThumb,
    enriched_links: enrichedLink,
    failed,
    total: garimpados.length,
    results,
  })
}
