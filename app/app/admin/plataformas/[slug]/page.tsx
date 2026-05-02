'use client'

import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

const CONFIG: Record<string, {
  nome: string, icon: string, cor: string,
  campos: { id: string, label: string, key: string, type?: string }[],
  endpoints: { path: string, desc: string, status: 'public' | 'auth' | 'affiliate' }[],
  dica: string,
  hasOAuth?: boolean
}> = {
  mercadolivre: {
    nome: 'Mercado Livre', icon: '🛒', cor: 'yellow',
    hasOAuth: true,
    campos: [
      { id: 'client_id', label: 'Client ID (App ID)', key: 'client_id' },
      { id: 'client_secret', label: 'Client Secret (Chave Secreta)', key: 'client_secret', type: 'password' },
      { id: 'access_token', label: 'Access Token (gerado via OAuth)', key: 'access_token', type: 'password' },
      { id: 'refresh_token', label: 'Refresh Token', key: 'refresh_token', type: 'password' },
      { id: 'user_id', label: 'User ID (preenchido automaticamente)', key: 'user_id' },
      { id: 'affiliate_tag', label: 'Tag de Afiliado', key: 'affiliate_tag' },
    ],
    endpoints: [
      { path: 'GET /sites/MLB/search', desc: 'Busca pública de produtos', status: 'public' },
      { path: 'GET /items/{id}', desc: 'Detalhe produto', status: 'public' },
      { path: 'GET /highlights/MLB', desc: 'Produtos em destaque', status: 'auth' },
      { path: 'POST /oauth/token', desc: 'Renovar access token', status: 'auth' },
      { path: 'Link com ?mt_source=', desc: 'Rastreio afiliado (manual)', status: 'affiliate' },
    ],
    dica: 'Clique em "Autorizar com ML" para gerar o Access Token via OAuth automaticamente.'
  },
  shopee: {
    nome: 'Shopee', icon: '🧡', cor: 'rose',
    campos: [
      { id: 'partner_id', label: 'Partner ID', key: 'partner_id' },
      { id: 'partner_key', label: 'Partner Key', key: 'partner_key', type: 'password' },
      { id: 'affiliate_id', label: 'Affiliate ID', key: 'affiliate_id' },
    ],
    endpoints: [
      { path: 'GET /v2/product/search_item', desc: 'Busca produtos', status: 'auth' },
      { path: 'GET /v2/product/get_item_base_info', desc: 'Detalhe produto', status: 'auth' },
      { path: 'POST /open_api/v1/link/generate', desc: 'Gerar link afiliado', status: 'affiliate' },
    ],
    dica: 'Cadastre-se em open.shopee.com para API. Para afiliados: affiliate.shopee.com.br'
  },
  aliexpress: {
    nome: 'AliExpress', icon: '🔴', cor: 'red',
    campos: [
      { id: 'app_key', label: 'App Key', key: 'app_key' },
      { id: 'app_secret', label: 'App Secret', key: 'app_secret', type: 'password' },
      { id: 'tracking_id', label: 'Tracking ID', key: 'tracking_id' },
    ],
    endpoints: [
      { path: 'aliexpress.affiliate.product.query', desc: 'Busca produtos', status: 'auth' },
      { path: 'aliexpress.affiliate.link.generate', desc: 'Gerar link afiliado', status: 'affiliate' },
      { path: 'aliexpress.affiliate.hotproduct.query', desc: 'Produtos em alta', status: 'auth' },
    ],
    dica: 'Cadastre-se em portals.aliexpress.com para obter App Key e Secret.'
  },
  amazon: {
    nome: 'Amazon', icon: '📦', cor: 'yellow',
    campos: [
      { id: 'access_key', label: 'Access Key (PA-API)', key: 'access_key' },
      { id: 'secret_key', label: 'Secret Key (PA-API)', key: 'secret_key', type: 'password' },
      { id: 'associate_tag', label: 'Associate Tag', key: 'associate_tag' },
      { id: 'marketplace', label: 'Marketplace (ex: www.amazon.com.br)', key: 'marketplace' },
    ],
    endpoints: [
      { path: 'SearchItems', desc: 'Busca produtos', status: 'auth' },
      { path: 'GetItems', desc: 'Detalhe produto', status: 'auth' },
      { path: 'GetVariations', desc: 'Variações', status: 'auth' },
    ],
    dica: '⚠️ PA-API sendo descontinuada em Abr/2026. Migrar para Creators API.'
  },
  lomadee: {
    nome: 'Lomadee', icon: '🏬', cor: 'green',
    campos: [
      { id: 'api_key', label: 'API Key', key: 'api_key', type: 'password' },
    ],
    endpoints: [
      { path: 'GET /affiliate/products', desc: 'Busca produtos multi-loja', status: 'auth' },
      { path: 'GET /affiliate/stores', desc: 'Lista lojas parceiras', status: 'auth' },
    ],
    dica: 'Rede de afiliados com Americanas, Casas Bahia, Renner, C&A e +100 lojas. Crie token em lomadee.com/painel.'
  },
  awin: {
    nome: 'AWIN', icon: '🌐', cor: 'purple',
    campos: [
      { id: 'api_token', label: 'OAuth2 Bearer Token', key: 'api_token', type: 'password' },
      { id: 'publisher_id', label: 'Publisher ID (Affiliate ID)', key: 'publisher_id' },
    ],
    endpoints: [
      { path: 'GET /publishers/{id}/programmes', desc: 'Programas de afiliados ativos', status: 'auth' },
      { path: 'GET /publishers/{id}/transactions', desc: 'Transações/comissões', status: 'auth' },
      { path: 'POST /publishers/{id}/product-search', desc: 'Busca produtos do feed', status: 'auth' },
      { path: 'GET /publishers/{id}/commissiongroups', desc: 'Grupos de comissão', status: 'auth' },
    ],
    dica: 'Rede global com +25.000 anunciantes. Gere o OAuth2 Token em ui.awin.com > Account > API Credentials.'
  }
}

const statusColor = { public: 'bg-green-100 text-green-700', auth: 'bg-yellow-100 text-yellow-700', affiliate: 'bg-blue-100 text-blue-700' }
const statusLabel = { public: 'Público', auth: 'Requer auth', affiliate: 'Afiliado' }

export default function PlataformaPage() {
  const { slug } = useParams() as { slug: string }
  const searchParams = useSearchParams()
  const cfg = CONFIG[slug]
  const [campos, setCampos] = useState<Record<string, string>>({})
  const [ativo, setAtivo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)

  useEffect(() => {
    if (!cfg) return
    loadConfig()

    // Verifica resultado do OAuth callback
    const oauth = searchParams.get('oauth')
    const oauthMsg = searchParams.get('msg')
    if (oauth === 'success') {
      setMsg({ type: 'success', text: '✅ Autorização OAuth concluída! Access Token salvo automaticamente.' })
      setTimeout(() => setMsg(null), 6000)
      loadConfig() // recarrega para mostrar token
    } else if (oauth === 'error') {
      setMsg({ type: 'error', text: `Erro OAuth: ${oauthMsg || 'desconhecido'}` })
    }
  }, [slug])

  const loadConfig = async () => {
    const { data } = await supabase.from('config_plataformas')
      .select('credenciais, ativo').eq('plataforma', slug).maybeSingle()
    if (data) {
      setAtivo(data.ativo || false)
      setCampos(data.credenciais || {})
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    try {
      const res = await fetch(`/api/plataformas/${slug}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credenciais: campos, ativo })
      })
      const data = await res.json()
      if (data.success) setMsg({ type: 'success', text: 'Credenciais salvas!' })
      else throw new Error(data.error)
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setSaving(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  const handleToggle = async (val: boolean) => {
    setAtivo(val)
    await fetch(`/api/plataformas/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: val })
    })
  }

  const handleTest = async () => {
    setTesting(true)
    setMsg({ type: 'info', text: 'Testando conexão...' })
    try {
      const res = await fetch(`/api/plataformas/${slug}/test`, { method: 'POST' })
      const data = await res.json()
      setMsg({ type: data.success ? 'success' : 'error', text: data.message })
    } catch {
      setMsg({ type: 'error', text: 'Erro ao testar' })
    } finally {
      setTesting(false)
      setTimeout(() => setMsg(null), 5000)
    }
  }

  const handleMlOAuth = () => {
    const clientId = campos.client_id
    if (!clientId) {
      setMsg({ type: 'error', text: 'Salve o Client ID antes de autorizar.' })
      return
    }
    // Sempre usar HTTPS pois o ML exige
    const origin = window.location.origin.replace('http://', 'https://')
    const redirectUri = `${origin}/api/oauth/mercadolivre/callback`
    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`
    window.location.href = authUrl
  }

  const tokenExpiresAt = campos.token_expires_at
    ? new Date(campos.token_expires_at).toLocaleString('pt-BR')
    : null

  const tokenExpiringSoon = campos.token_expires_at
    ? new Date(campos.token_expires_at).getTime() - Date.now() < 2 * 60 * 60 * 1000 // < 2h
    : false

  const handleRefreshToken = async () => {
    setRefreshing(true)
    setMsg({ type: 'info', text: 'Renovando token...' })
    try {
      const res = await fetch('/api/oauth/mercadolivre/refresh', { method: 'POST' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMsg({ type: 'success', text: `Token renovado! Expira: ${new Date(data.token_expires_at).toLocaleString('pt-BR')}` })
      loadConfig()
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setRefreshing(false)
      setTimeout(() => setMsg(null), 5000)
    }
  }

  if (!cfg) return <div className="p-8 text-gray-500">Plataforma não encontrada.</div>

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{cfg.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{cfg.nome}</h1>
            <p className="text-sm text-gray-500">Credenciais e configuração de afiliado</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={ativo ? 'default' : 'secondary'} className={ativo ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''}>
            {ativo ? 'Ativo ✓' : 'Inativo'}
          </Badge>
          <div className="flex items-center gap-2">
            <Switch checked={ativo} onCheckedChange={handleToggle} />
            <span className="text-sm text-gray-600">{ativo ? 'Ligado' : 'Desligado'}</span>
          </div>
        </div>
      </div>

      {/* OAuth ML — banner de conexão */}
      {cfg.hasOAuth && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-yellow-900 text-sm">🔐 Autenticação OAuth 2.0</p>
                {campos.access_token ? (
                  <div className="mt-0.5 space-y-0.5">
                    <p className="text-xs text-green-700">
                      ✅ Conectado — User ID: {campos.user_id || '—'}
                    </p>
                    {tokenExpiresAt && (
                      <p className={`text-xs ${tokenExpiringSoon ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        {tokenExpiringSoon ? '⚠️' : '🕐'} Expira: {tokenExpiresAt}
                        {tokenExpiringSoon && ' — renovação necessária!'}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">🔄 Token é renovado automaticamente a cada busca</p>
                  </div>
                ) : (
                  <p className="text-xs text-yellow-700 mt-0.5">
                    Salve o Client ID e clique em "Autorizar" para gerar o Access Token automaticamente.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {campos.access_token && (
                  <Button
                    onClick={handleRefreshToken}
                    disabled={refreshing}
                    variant="outline"
                    className="text-sm border-yellow-400 text-yellow-700 hover:bg-yellow-100"
                  >
                    {refreshing ? '⏳' : '🔄'} Renovar Token
                  </Button>
                )}
                <Button
                  onClick={handleMlOAuth}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white text-sm"
                  disabled={!campos.client_id}
                >
                  {campos.access_token ? '🔗 Reconectar' : '🔗 Autorizar com ML'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🔑 Credenciais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {cfg.campos.map(campo => (
              <div key={campo.id} className="space-y-1.5">
                <Label htmlFor={campo.id}>{campo.label}</Label>
                <Input
                  id={campo.id}
                  type={campo.type || 'text'}
                  value={campos[campo.key] ?? ''}
                  onChange={e => setCampos(prev => ({ ...prev, [campo.key]: e.target.value }))}
                  placeholder={campo.label}
                />
              </div>
            ))}

            {msg && (
              <p className={`text-sm p-3 rounded-lg ${
                msg.type === 'success' ? 'bg-green-50 text-green-700' :
                msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
              }`}>{msg.text}</p>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1 bg-rose-500 hover:bg-rose-600">
                {saving ? 'Salvando...' : '💾 Salvar'}
              </Button>
              <Button onClick={handleTest} disabled={testing} variant="outline" className="flex-1">
                {testing ? 'Testando...' : '🔍 Testar'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">⚙️ Regras de Busca</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Desconto mínimo (%)</Label>
              <Input
                type="number"
                value={campos['desconto_minimo'] ?? '10'}
                onChange={e => setCampos(prev => ({ ...prev, desconto_minimo: e.target.value }))}
                min={0} max={100}
                placeholder="10"
              />
              <p className="text-[10px] text-gray-400">Só envia produtos com desconto igual ou maior que este valor</p>
            </div>
            <div className="space-y-1.5">
              <Label>Score mínimo</Label>
              <Input
                type="number"
                value={campos['score_minimo'] ?? '30'}
                onChange={e => setCampos(prev => ({ ...prev, score_minimo: e.target.value }))}
                min={0} max={100}
                placeholder="30"
              />
              <p className="text-[10px] text-gray-400">Score de relevância mínimo para o produto ser considerado</p>
            </div>
            <div className="space-y-1.5">
              <Label>Preço máximo (R$)</Label>
              <Input
                type="number"
                value={campos['preco_max'] ?? '0'}
                onChange={e => setCampos(prev => ({ ...prev, preco_max: e.target.value }))}
                min={0}
                placeholder="0 = sem limite"
              />
              <p className="text-[10px] text-gray-400">0 = sem limite de preço</p>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-rose-500 hover:bg-rose-600" size="sm">
              {saving ? 'Salvando...' : '💾 Salvar regras'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">📋 Endpoints Disponíveis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cfg.endpoints.map((ep, i) => (
              <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="font-mono text-xs text-gray-700">{ep.path}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[ep.status]}`}>
                  {statusLabel[ep.status]}
                </span>
              </div>
            ))}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg text-xs text-blue-700">
              💡 {cfg.dica}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
