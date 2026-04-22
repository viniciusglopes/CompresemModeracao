'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Disparo {
  id: string
  produto_id: string
  canal: string
  grupo_id: string
  grupo_nome: string
  status: string
  erro: string | null
  disparado_em: string
}

interface Produto {
  id: string
  titulo: string
  thumbnail: string
  preco: number
  desconto_percent: number
  plataforma: string
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const PAGE_SIZE = 30

interface DisparoConfig {
  score_minimo: number
  desconto_minimo_ml: number
  score_minimo_shopee: number
  hora_inicio: number
  hora_fim: number
  intervalo_minutos: number
  min_produtos: number
  max_produtos: number
  ultimo_nicho_idx: number
  ultimo_disparo: string | null
  ativo: boolean
}

export default function DisparosPage() {
  const [disparos, setDisparos] = useState<Disparo[]>([])
  const [produtos, setProdutos] = useState<Record<string, Produto>>({})
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Config disparo automático
  const [config, setConfig] = useState<DisparoConfig | null>(null)
  const [salvandoConfig, setSalvandoConfig] = useState(false)
  const [disparandoManual, setDisparandoManual] = useState(false)

  // Filtros
  const hoje = new Date().toISOString().slice(0, 10)
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'enviado' | 'erro'>('todos')
  const [filtroCanal, setFiltroCanal] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState(hoje)
  const [pagina, setPagina] = useState(0)

  // Seleção para deletar
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [deletando, setDeletando] = useState(false)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const loadProdutos = useCallback(async () => {
    const [pr1, pr2] = await Promise.all([
      fetch('/api/busca/mercadolivre?limit=500').then(r => r.json()),
      fetch('/api/busca/shopee?limit=500').then(r => r.json()),
    ])
    const map: Record<string, Produto> = {}
    for (const p of [...(pr1.produtos || []), ...(pr2.produtos || [])]) map[p.id] = p
    setProdutos(map)
  }, [])

  const loadDisparos = useCallback(async (pg = 0) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(pg * PAGE_SIZE),
      })
      if (filtroStatus !== 'todos') params.set('status', filtroStatus)
      if (filtroCanal) params.set('canal', filtroCanal)
      if (dataInicio) params.set('de', dataInicio)
      if (dataFim) params.set('ate', dataFim)

      const dr = await fetch(`/api/disparos?${params}`).then(r => r.json())
      setDisparos(dr.disparos || [])
      setTotal(dr.total || 0)
      setSelecionados(new Set())
    } finally {
      setLoading(false)
    }
  }, [filtroStatus, filtroCanal, dataInicio, dataFim])

  const loadConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/cron/disparar')
      const data = await res.json()
      setConfig(data)
    } catch {}
  }, [])

  const salvarConfig = async (updates: Partial<DisparoConfig>) => {
    setSalvandoConfig(true)
    try {
      const res = await fetch('/api/cron/disparar', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json()
      if (data.error) return showMsg('error', data.error)
      setConfig(data.config)
      showMsg('success', 'Configuração salva!')
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setSalvandoConfig(false)
    }
  }

  const dispararManual = async () => {
    setDisparandoManual(true)
    try {
      const res = await fetch('/api/cron/disparar', { method: 'POST' })
      const data = await res.json()
      if (data.skip) return showMsg('error', `Pulou: ${data.motivo}`)
      if (data.error) return showMsg('error', data.error)
      showMsg('success', `Disparou ${data.qtd_disparada} produtos! (${data.enviados} enviados, ${data.erros} erros)`)
      loadDisparos(pagina)
      loadConfig()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setDisparandoManual(false)
    }
  }

  useEffect(() => {
    loadProdutos()
    loadConfig()
  }, [loadProdutos, loadConfig])

  useEffect(() => {
    setPagina(0)
    loadDisparos(0)
  }, [filtroStatus, filtroCanal, dataInicio, dataFim, loadDisparos])

  const irPagina = (pg: number) => {
    setPagina(pg)
    loadDisparos(pg)
  }

  const toggleSelect = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selecionados.size === disparos.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(disparos.map(d => d.id)))
    }
  }

  const deletarSelecionados = async () => {
    if (selecionados.size === 0) return
    setDeletando(true)
    try {
      const res = await fetch('/api/disparos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selecionados) }),
      })
      const data = await res.json()
      if (data.error) return showMsg('error', data.error)
      showMsg('success', `${selecionados.size} disparo(s) removido(s)`)
      loadDisparos(pagina)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setDeletando(false)
    }
  }

  const deletarPorPeriodo = async () => {
    if (!dataInicio && !dataFim) return
    if (!confirm(`Deletar todos os disparos de ${dataInicio || 'início'} até ${dataFim || 'hoje'}?`)) return
    setDeletando(true)
    try {
      const res = await fetch('/api/disparos', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ de: dataInicio || undefined, ate: dataFim || undefined }),
      })
      const data = await res.json()
      if (data.error) return showMsg('error', data.error)
      showMsg('success', 'Disparos do período removidos!')
      loadDisparos(0)
      setPagina(0)
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setDeletando(false)
    }
  }

  const totalPaginas = Math.ceil(total / PAGE_SIZE)
  const canalIcon = (canal: string) => canal === 'whatsapp' ? '💬' : canal === 'telegram' ? '✈️' : '📤'

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📤 Histórico de Disparos</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} registros encontrados</p>
        </div>
        <button onClick={() => loadDisparos(pagina)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-100 text-rose-700 hover:bg-rose-200 transition-colors">
          🔄 Atualizar
        </button>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* Config Disparo Automático */}
      {config && (
        <Card className="mb-4 border-rose-200">
          <CardContent className="pt-4 pb-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <h2 className="text-sm font-bold text-gray-800">Disparo Automático</h2>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={dispararManual} disabled={disparandoManual || !config.ativo}
                  size="sm" className="bg-rose-500 hover:bg-rose-600 text-white text-xs h-7 px-3">
                  {disparandoManual ? '⏳ Disparando...' : '🚀 Disparar agora'}
                </Button>
                <button
                  onClick={() => salvarConfig({ ativo: !config.ativo })}
                  disabled={salvandoConfig}
                  className={`relative w-11 h-6 rounded-full transition-colors ${config.ativo ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${config.ativo ? 'left-5.5 translate-x-0' : 'left-0.5'}`}
                    style={{ left: config.ativo ? '22px' : '2px' }} />
                </button>
              </div>
            </div>

            {config.ativo && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Intervalo (min)</label>
                    <input type="number" value={config.intervalo_minutos} min={1} max={120}
                      onChange={e => setConfig({ ...config, intervalo_minutos: parseInt(e.target.value) || 15 })}
                      className="w-full px-2.5 py-1.5 rounded-lg text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:border-rose-400 focus:bg-white" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Desconto ML (%)</label>
                    <input type="number" value={config.desconto_minimo_ml} min={0} max={100}
                      onChange={e => setConfig({ ...config, desconto_minimo_ml: parseInt(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-lg text-sm border border-gray-200 bg-yellow-50 focus:outline-none focus:border-yellow-400 focus:bg-white" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Score Shopee (%)</label>
                    <input type="number" value={config.score_minimo_shopee} min={0} max={100}
                      onChange={e => setConfig({ ...config, score_minimo_shopee: parseInt(e.target.value) || 0 })}
                      className="w-full px-2.5 py-1.5 rounded-lg text-sm border border-gray-200 bg-rose-50 focus:outline-none focus:border-rose-400 focus:bg-white" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Horário (início-fim)</label>
                    <div className="flex items-center gap-1">
                      <input type="number" value={config.hora_inicio} min={0} max={23}
                        onChange={e => setConfig({ ...config, hora_inicio: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 rounded-lg text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:border-rose-400 text-center" />
                      <span className="text-gray-400 text-xs">às</span>
                      <input type="number" value={config.hora_fim} min={0} max={23}
                        onChange={e => setConfig({ ...config, hora_fim: parseInt(e.target.value) || 0 })}
                        className="w-full px-2 py-1.5 rounded-lg text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:border-rose-400 text-center" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Min produtos</label>
                    <input type="number" value={config.min_produtos} min={1} max={20}
                      onChange={e => setConfig({ ...config, min_produtos: parseInt(e.target.value) || 1 })}
                      className="w-full px-2.5 py-1.5 rounded-lg text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:border-rose-400 focus:bg-white" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">Max produtos</label>
                    <input type="number" value={config.max_produtos} min={1} max={50}
                      onChange={e => setConfig({ ...config, max_produtos: parseInt(e.target.value) || 1 })}
                      className="w-full px-2.5 py-1.5 rounded-lg text-sm border border-gray-200 bg-gray-50 focus:outline-none focus:border-rose-400 focus:bg-white" />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-xs text-gray-500">
                    {config.ultimo_disparo
                      ? `Último disparo: ${new Date(config.ultimo_disparo).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`
                      : 'Nenhum disparo realizado ainda'}
                    {' · '}A cada {config.intervalo_minutos} min, {config.min_produtos}-{config.max_produtos} produtos (ML desconto≥{config.desconto_minimo_ml}% · Shopee score≥{config.score_minimo_shopee})
                  </div>
                  <Button onClick={() => salvarConfig(config)} disabled={salvandoConfig}
                    size="sm" variant="outline" className="text-xs h-7 px-3 border-rose-300 text-rose-600 hover:bg-rose-50">
                    {salvandoConfig ? '⏳' : '💾'} Salvar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <Card className="mb-4">
        <CardContent className="pt-3 pb-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Período */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Período</p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <span className="text-xs text-gray-400 block mb-1">De</span>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 bg-gray-50 focus:outline-none focus:border-rose-400 focus:bg-white" />
                </div>
                <div className="flex-1">
                  <span className="text-xs text-gray-400 block mb-1">Até</span>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 bg-gray-50 focus:outline-none focus:border-rose-400 focus:bg-white" />
                </div>
              </div>
            </div>

            {/* Status + Canal */}
            <div className="space-y-2">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Status</p>
                <div className="flex gap-1.5">
                  {[{ id: 'todos', label: 'Todos' }, { id: 'enviado', label: '✅ Enviados' }, { id: 'erro', label: '❌ Erros' }].map(s => (
                    <button key={s.id} onClick={() => setFiltroStatus(s.id as any)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroStatus === s.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1.5">Canal</p>
                <div className="flex gap-1.5">
                  {[{ id: '', label: 'Todos' }, { id: 'whatsapp', label: '💬 WhatsApp' }, { id: 'telegram', label: '✈️ Telegram' }].map(c => (
                    <button key={c.id} onClick={() => setFiltroCanal(c.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${filtroCanal === c.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ação deletar por período */}
          <div className="pt-2 border-t flex items-center gap-2">
            <Button onClick={deletarPorPeriodo} disabled={deletando || (!dataInicio && !dataFim)}
              variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50 text-xs">
              🗑️ Deletar todos do período
            </Button>
            <span className="text-xs text-gray-400">({dataInicio || '...'} até {dataFim || '...'})</span>
          </div>
        </CardContent>
      </Card>

      {/* Barra de seleção */}
      {disparos.length > 0 && (
        <div className="flex items-center gap-3 mb-3">
          <button onClick={toggleAll} className="text-xs text-blue-600 hover:underline">
            {selecionados.size === disparos.length ? 'Desmarcar todos' : `Selecionar todos (${disparos.length})`}
          </button>
          {selecionados.size > 0 && (
            <>
              <span className="text-gray-300">|</span>
              <button onClick={() => setSelecionados(new Set())} className="text-xs text-gray-500 hover:underline">
                Limpar seleção
              </button>
              <span className="text-gray-300">|</span>
              <Button onClick={deletarSelecionados} disabled={deletando} size="sm"
                className="bg-red-500 hover:bg-red-600 text-white text-xs h-7 px-3">
                {deletando ? '⏳' : '🗑️'} Deletar {selecionados.size} selecionados
              </Button>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : disparos.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Nenhum disparo encontrado.</div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {disparos.map(d => {
              const produto = produtos[d.produto_id]
              const dataFmt = new Date(d.disparado_em).toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: '2-digit',
                hour: '2-digit', minute: '2-digit'
              })
              const sel = selecionados.has(d.id)

              return (
                <div key={d.id}
                  onClick={() => toggleSelect(d.id)}
                  className={`cursor-pointer rounded-xl border bg-white p-3 flex items-center gap-3 transition-all ${
                    sel ? 'border-rose-400 bg-rose-50' :
                    d.status === 'erro' ? 'border-red-200 bg-red-50/30' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  {/* Checkbox */}
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${sel ? 'bg-rose-500 border-rose-500' : 'border-gray-300'}`}>
                    {sel && <span className="text-white text-xs font-bold">✓</span>}
                  </div>

                  {/* Thumbnail */}
                  {produto?.thumbnail ? (
                    <img src={produto.thumbnail} alt="" className="w-12 h-12 object-contain rounded-lg bg-gray-50 shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-xl">🛍️</div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">
                      {produto?.titulo || d.produto_id}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{canalIcon(d.canal)} {d.grupo_nome || d.grupo_id}</span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">🕐 {dataFmt}</span>
                      {produto && (
                        <>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs font-medium text-green-700">{fmt(produto.preco)}</span>
                          {produto.desconto_percent > 0 && (
                            <Badge className="bg-red-100 text-red-600 hover:bg-red-100 text-xs px-1.5 py-0">-{produto.desconto_percent}%</Badge>
                          )}
                        </>
                      )}
                    </div>
                    {d.status === 'erro' && d.erro && (
                      <p className="text-xs text-red-500 mt-0.5 truncate">⚠️ {d.erro}</p>
                    )}
                  </div>

                  {/* Status badge */}
                  <div className="shrink-0">
                    <Badge className={`text-xs ${d.status === 'enviado' ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-red-100 text-red-600 hover:bg-red-100'}`}>
                      {d.status === 'enviado' ? '✅ Enviado' : '❌ Erro'}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Paginação */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => irPagina(pagina - 1)} disabled={pagina === 0}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed">
                ← Anterior
              </button>
              <span className="text-xs text-gray-500">
                Página {pagina + 1} de {totalPaginas} · {total} registros
              </span>
              <button onClick={() => irPagina(pagina + 1)} disabled={pagina >= totalPaginas - 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed">
                Próxima →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
