import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getMlAccessToken } from '@/lib/ml-auth'

const ML_API = 'https://api.mercadolibre.com'

async function resolverUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8000) })
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

async function fetchThumbnailShopee(url: string): Promise<string | null> {
  try {
    const resolved = await resolverUrl(url)
    const idMatch = resolved.match(/\/(\d{8,})\/(\d{8,})/)
    if (!idMatch) return null
    const [, shopId, itemId] = idMatch
    const { data: cfg } = await supabaseAdmin
      .from('config_plataformas').select('credenciais').eq('plataforma', 'shopee').maybeSingle()
    const appId = cfg?.credenciais?.app_id
    const secret = cfg?.credenciais?.secret
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const batchSize = Math.min(parseInt(searchParams.get('batch') || '30'), 50)

  const { data: garimpados, error } = await supabaseAdmin
    .from('produtos_garimpados')
    .select('id, link_original, plataforma, titulo')
    .is('thumbnail', null)
    .order('criado_em', { ascending: false })
    .limit(batchSize)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!garimpados?.length) return NextResponse.json({ ok: true, enriched: 0, message: 'Nenhum garimpado sem thumbnail' })

  let mlToken: string | null = null
  try { mlToken = await getMlAccessToken() } catch {}

  let enriched = 0
  let failed = 0
  const results: { id: string; status: string; thumbnail?: string }[] = []

  for (const g of garimpados) {
    let thumbnail: string | null = null

    try {
      if (g.plataforma === 'mercadolivre') {
        const resolved = await resolverUrl(g.link_original)
        const mlbId = extrairMlbId(resolved)
        if (mlbId && mlToken) {
          thumbnail = await fetchMlThumbnail(mlbId, mlToken)
        }
        if (!thumbnail) {
          thumbnail = await fetchThumbnailByOg(resolved)
        }
      } else if (g.plataforma === 'shopee') {
        thumbnail = await fetchThumbnailShopee(g.link_original)
      } else if (g.plataforma === 'amazon') {
        const resolved = await resolverUrl(g.link_original)
        const asinMatch = resolved.match(/\/dp\/([A-Z0-9]{10})/i)
        if (asinMatch) {
          thumbnail = `https://images-na.ssl-images-amazon.com/images/P/${asinMatch[1]}.01._SCLZZZZZZZ_.jpg`
        }
        if (!thumbnail) {
          thumbnail = await fetchThumbnailByOg(resolved)
        }
      } else {
        const resolved = await resolverUrl(g.link_original)
        thumbnail = await fetchThumbnailByOg(resolved)
      }
    } catch {}

    if (thumbnail) {
      const { error: updateError } = await supabaseAdmin
        .from('produtos_garimpados')
        .update({ thumbnail })
        .eq('id', g.id)

      if (!updateError) {
        enriched++
        results.push({ id: g.id, status: 'ok', thumbnail })
      } else {
        failed++
        results.push({ id: g.id, status: 'update_error' })
      }
    } else {
      failed++
      results.push({ id: g.id, status: 'no_thumbnail_found' })
    }
  }

  return NextResponse.json({ ok: true, enriched, failed, total: garimpados.length, results })
}
