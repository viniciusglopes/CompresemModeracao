'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ProdutoGarimpado {
  id: string
  link_original: string
  link_afiliado: string | null
  plataforma: string
  titulo: string
  preco: number | null
  preco_original: number | null
  desconto_percent: number | null
  cupom: string | null
  fonte_grupo: string
  texto_original: string
  status: string
  criado_em: string
  processado_em: string | null
  enviado_em: string | null
}

interface Stats {
  total: number
  pendentes: number
  processados: number
  enviados: number
  descartados: number
  hoje: number
  plataformas: { plataforma: string; qtd: number }[] | null
}

const STATUS_COLORS: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  processado: 'bg-blue-100 text-blue-800',
  enviado: 'bg-green-100 text-green-800',
  descartado: 'bg-gray-100 text-gray-600',
}

const PLATAFORMA_ICONS: Record<string, string> = {
  mercadolivre: '🛒',
  shopee: '🧡',
  amazon: '📦',
  magalu: '🟦',
  aliexpress: '🔴',
  casasbahia: '🏠',
  americanas: '🔵',
  kabum: '🟠',
  nike: '👟',
  centauro: '⚽',
  renner: '👗',
  natura: '🌿',
  boticario: '💜',
  pichau: '💻',
  terabyte: '🖥️',
  netshoes: '👟',
  link_encurtado: '🔗',
}

const GRUPO_NOMES: Record<string, string> = {
  '120363425639175424@g.us': 'Promos Hellen - Enxoval',
  '120363350975913389@g.us': 'Desconto do Dia',
  '120363214015579498@g.us': 'Promoções BR',
  '120363298276579339@g.us': 'Ofertas Flash',
}

export default function GarimpPage() {
  const [produtos, setProdutos] = useState<ProdutoGarimpado[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFiltro, setStatusFiltro] = useState('pendente')
  const [plataformaFiltro, setPlataformaFiltro] = useState('')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [atualizando, setAtualizando] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [total, setTotal] = useState(0)

  const loadProdutos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFiltro) params.set('status', statusFiltro)
      if (plataformaFiltro) params.set('plataforma', plataformaFiltro)
      params.set('limit', '200')
      const res = await fetch(`/api/garimpados?${params}`)
      const data = await res.json()
      setProdutos(data.produtos || [])
      setStats(data.stats || null)
      setTotal(data.total || 0)
    } finally {
      setLoading(false)
    }
  }, [statusFiltro, plataformaFiltro])

  useEffect(() => {
    loadProdutos()
  }, [loadProdutos])

  useEffect(() => {
    const interval = setInterval(loadProdutos, 30000)
    return () => clearInterval(interval)
  }, [loadProdutos])

  const handleUpdateStatus = async (ids: string[], newStatus: string) => {
    setAtualizando(true)
    try {
      const res = await fetch('/api/garimpados', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status: newStatus }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMsg({ type: 'success', text: `${ids.length} produto(s) marcado(s) como ${newStatus}` })
      setSelecionados(new Set())
      loadProdutos()
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setAtualizando(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  const handleDelete = async (ids: string[]) => {
    if (!confirm(`Excluir ${ids.length} produto(s) permanentemente?`)) return
    setAtualizando(true)
    try {
      const res = await fetch('/api/garimpados', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMsg({ type: 'success', text: `${ids.length} produto(s) excluido(s)` })
      setSelecionados(new Set())
      loadProdutos()
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setAtualizando(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  const toggleSelect = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selecionados.size === produtos.length && produtos.length > 0) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(produtos.map(p => p.id)))
    }
  }

  const fmt = (v: number | null) => v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'
  const fmtDate = (d: string) => new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  const grupoNome = (jid: string) => GRUPO_NOMES[jid] || jid.replace('@g.us', '').slice(-8)

  const plataformasDisponiveis = stats?.plataformas || []

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🕵️ Garimpados</h1>
          <p className="text-sm text-gray-500 mt-1">Produtos capturados dos grupos via webhook</p>
        </div>
        <Button onClick={loadProdutos} variant="outline" size="sm" disabled={loading}>
          {loading ? '⏳' : '🔄'} Atualizar
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900' },
            { label: 'Pendentes', value: stats.pendentes, color: 'text-yellow-600' },
            { label: 'Processados', value: stats.processados, color: 'text-blue-600' },
            { label: 'Enviados', value: stats.enviados, color: 'text-green-600' },
            { label: 'Descartados', value: stats.descartados, color: 'text-gray-500' },
            { label: 'Hoje', value: stats.hoje, color: 'text-rose-600' },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-3 flex-wrap">
        {[
          { id: '', label: 'Todos' },
          { id: 'pendente', label: '🟡 Pendentes' },
          { id: 'processado', label: '🔵 Processados' },
          { id: 'enviado', label: '🟢 Enviados' },
          { id: 'descartado', label: '⚫ Descartados' },
        ].map(s => (
          <button key={s.id} onClick={() => { setStatusFiltro(s.id); setSelecionados(new Set()) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFiltro === s.id ? 'bg-rose-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => { setPlataformaFiltro(''); setSelecionados(new Set()) }}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !plataformaFiltro ? 'bg-rose-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}>
          🔀 Todas
        </button>
        {plataformasDisponiveis.map(p => (
          <button key={p.plataforma} onClick={() => { setPlataformaFiltro(p.plataforma); setSelecionados(new Set()) }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              plataformaFiltro === p.plataforma ? 'bg-rose-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}>
            {PLATAFORMA_ICONS[p.plataforma] || '🔗'} {p.plataforma} ({p.qtd})
          </button>
        ))}
      </div>

      {msg && (
        <p className={`mb-4 text-sm p-2 rounded-lg ${
          msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>{msg.text}</p>
      )}

      <div className="flex items-center gap-3 mb-3">
        <button onClick={selectAll} className="text-xs text-rose-600 hover:underline">
          {selecionados.size === produtos.length && produtos.length > 0 ? 'Desmarcar todos' : `Selecionar todos (${produtos.length})`}
        </button>
        <span className="text-xs text-gray-400">{total} total</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : produtos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">Nenhum produto garimpado encontrado.</p>
          <p className="text-gray-400 text-xs mt-1">Os produtos aparecerao aqui conforme forem capturados dos grupos.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {produtos.map(p => {
            const selecionado = selecionados.has(p.id)
            return (
              <div key={p.id} onClick={() => toggleSelect(p.id)}
                className={`cursor-pointer rounded-xl border-2 transition-all p-4 ${
                  selecionado ? 'border-rose-400 bg-rose-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}>
                <div className="flex gap-3">
                  <div className="flex items-start pt-0.5 shrink-0">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      selecionado ? 'bg-rose-500 border-rose-500' : 'border-gray-300'
                    }`}>
                      {selecionado && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-800 line-clamp-2">{p.titulo}</p>
                      <Badge className={`shrink-0 text-xs ${STATUS_COLORS[p.status]}`}>
                        {p.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      {p.preco != null && (
                        <span className="text-base font-bold text-green-700">{fmt(p.preco)}</span>
                      )}
                      {p.preco_original != null && p.preco_original !== p.preco && (
                        <span className="text-xs text-gray-400 line-through">{fmt(p.preco_original)}</span>
                      )}
                      {p.desconto_percent != null && p.desconto_percent > 0 && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
                          -{p.desconto_percent}%
                        </Badge>
                      )}
                      {p.cupom && (
                        <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 text-xs">
                          Cupom: {p.cupom}
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {PLATAFORMA_ICONS[p.plataforma] || '🔗'} {p.plataforma}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        Grupo: {grupoNome(p.fonte_grupo)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {fmtDate(p.criado_em)}
                      </span>
                    </div>
                    {p.texto_original && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{p.texto_original}</p>
                    )}
                  </div>
                </div>
                <div className="mt-2 flex gap-2 pl-8" onClick={e => e.stopPropagation()}>
                  <a href={p.link_original} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
                    🔗 Ver produto
                  </a>
                  {p.status === 'pendente' && (
                    <>
                      <button onClick={() => handleUpdateStatus([p.id], 'processado')}
                        className="text-xs px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg transition-colors">
                        ✅ Aprovar
                      </button>
                      <button onClick={() => handleUpdateStatus([p.id], 'descartado')}
                        className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg transition-colors">
                        ❌ Descartar
                      </button>
                    </>
                  )}
                  <button onClick={() => handleDelete([p.id])}
                    className="text-xs px-3 py-1 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {selecionados.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-50 flex-wrap">
          <span className="text-sm font-medium">{selecionados.size} selecionado(s)</span>
          <Button onClick={() => handleUpdateStatus(Array.from(selecionados), 'processado')}
            disabled={atualizando} size="sm"
            className="bg-blue-500 hover:bg-blue-400 text-white text-xs h-7">
            ✅ Aprovar
          </Button>
          <Button onClick={() => handleUpdateStatus(Array.from(selecionados), 'descartado')}
            disabled={atualizando} size="sm"
            className="bg-gray-600 hover:bg-gray-500 text-white text-xs h-7">
            ❌ Descartar
          </Button>
          <Button onClick={() => handleDelete(Array.from(selecionados))}
            disabled={atualizando} size="sm"
            className="bg-red-500 hover:bg-red-400 text-white text-xs h-7">
            🗑️ Excluir
          </Button>
          <button onClick={() => setSelecionados(new Set())} className="text-gray-400 hover:text-white text-sm ml-2">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
