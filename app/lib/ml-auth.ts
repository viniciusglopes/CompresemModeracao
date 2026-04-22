import { supabaseAdmin } from './supabase'

const ML_TOKEN_URL = 'https://api.mercadolibre.com/oauth/token'

// Retorna um access_token válido do ML, renovando automaticamente se necessário
export async function getMlAccessToken(): Promise<string | null> {
  const { data: cfg } = await supabaseAdmin
    .from('config_plataformas')
    .select('credenciais, ativo')
    .eq('plataforma', 'mercadolivre')
    .maybeSingle()

  if (!cfg?.ativo || !cfg?.credenciais) return null

  const cred = cfg.credenciais
  const accessToken: string = cred.access_token || ''
  const refreshToken: string = cred.refresh_token || ''
  const expiresAt: string = cred.token_expires_at || ''
  const clientId: string = process.env.ML_CLIENT_ID || cred.client_id || ''
  const clientSecret: string = process.env.ML_CLIENT_SECRET || cred.client_secret || ''

  if (!accessToken) return null

  // Verifica se expira nos próximos 30 minutos
  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : 0
  const needsRefresh = expiresAtMs > 0 && Date.now() > expiresAtMs - 30 * 60 * 1000

  if (!needsRefresh) return accessToken

  // Token expirado ou prestes a expirar — renova
  if (!refreshToken || !clientId || !clientSecret) {
    console.warn('[ml-auth] Token expirado mas sem refresh_token/credenciais para renovar')
    return accessToken // retorna o atual mesmo expirado (fallback)
  }

  try {
    const res = await fetch(ML_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      }),
    })

    const token = await res.json()

    if (!res.ok || token.error) {
      console.error('[ml-auth] Falha ao renovar token:', token.message || token.error)
      return accessToken // fallback
    }

    // Salva os novos tokens no banco
    await supabaseAdmin
      .from('config_plataformas')
      .update({
        credenciais: {
          ...cred,
          access_token: token.access_token,
          refresh_token: token.refresh_token,
          user_id: String(token.user_id || cred.user_id),
          token_expires_at: new Date(Date.now() + token.expires_in * 1000).toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('plataforma', 'mercadolivre')

    console.log('[ml-auth] Token renovado com sucesso. Expira em:', token.expires_in, 'segundos')
    return token.access_token as string
  } catch (e) {
    console.error('[ml-auth] Erro ao renovar token:', e)
    return accessToken // fallback
  }
}
