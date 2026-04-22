import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  // Dentro do Docker, request.url tem localhost:3000 — usa headers do proxy
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const host = forwardedHost || request.headers.get('host') || ''
  const publicOrigin = `${forwardedProto}://${host}`

  const baseUrl = `${publicOrigin}/admin/plataformas/mercadolivre`
  const redirectUri = `${publicOrigin}/api/oauth/mercadolivre/callback`

  if (error) {
    return NextResponse.redirect(
      `${baseUrl}?oauth=error&msg=${encodeURIComponent(error)}`
    )
  }

  if (!code) {
    return NextResponse.redirect(`${baseUrl}?oauth=error&msg=code_missing`)
  }

  // Busca credenciais do banco
  const { data: cfg } = await supabaseAdmin
    .from('config_plataformas')
    .select('credenciais')
    .eq('plataforma', 'mercadolivre')
    .maybeSingle()

  const clientId = process.env.ML_CLIENT_ID || cfg?.credenciais?.client_id
  const clientSecret = process.env.ML_CLIENT_SECRET || cfg?.credenciais?.client_secret

  try {
    const res = await fetch('https://api.mercadolibre.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })

    const token = await res.json()

    if (!res.ok || token.error) {
      return NextResponse.redirect(
        `${baseUrl}?oauth=error&msg=${encodeURIComponent(token.message || token.error)}`
      )
    }

    // Salva tokens no banco
    await supabaseAdmin
      .from('config_plataformas')
      .update({
        credenciais: {
          ...cfg?.credenciais,
          access_token: token.access_token,
          refresh_token: token.refresh_token,
          user_id: String(token.user_id),
          token_expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
        },
        ativo: true,
        updated_at: new Date().toISOString(),
      })
      .eq('plataforma', 'mercadolivre')

    return NextResponse.redirect(`${baseUrl}?oauth=success`)
  } catch (e: any) {
    return NextResponse.redirect(
      `${baseUrl}?oauth=error&msg=${encodeURIComponent(e.message)}`
    )
  }
}
