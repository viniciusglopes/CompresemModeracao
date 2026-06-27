'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ProdutoUnificado {
  id: string
  titulo: string
  preco: number | null
  preco_original: number | null
  desconto_percent: number | null
  plataforma: string
  link_afiliado: string | null
  link_original: string
  thumbnail: string | null
  nicho: string | null
  frete_gratis: boolean
  score: number | null
  score_detalhes: Record<string, number> | null
  loja_nome: string | null
  cupom: string | null
  fonte_grupo: string | null
  texto_original: string | null
  status_garimpo: string | undefined
  origem: 'api' | 'garimpado'
  data_ref: string
  created_at: string
  status_disparo: 'enviado' | 'pendente'
}

interface Stats {
  total: number
  api: number
  garimpados: number
  enviados: number
  pendentes: number
}

interface Nicho { id: string; label: string; emoji: string }

const PLATAFORMAS = [
  { id: '', label: 'Todas' },
  { id: 'mercadolivre', label: '🛒 ML' },
  { id: 'shopee', label: '🧡 Shopee' },
  { id: 'amazon', label: '📦 Amazon' },
  { id: 'aliexpress', label: '🔴 AliExpress' },
  { id: 'lomadee', label: '🏬 Lomadee' },
  { id: 'awin', label: '🌐 AWIN' },
  { id: 'magalu', label: '🟦 Magalu' },
  { id: 'kabum', label: '🟠 KaBuM!' },
  { id: 'nike', label: '👟 Nike' },
  { id: 'centauro', label: '⚽ Centauro' },
]

const PLAT_ICON: Record<string, string> = {
  mercadolivre: '🛒', shopee: '🧡', amazon: '📦', aliexpress: '🔴',
  lomadee: '🏬', awin: '🌐', magalu: '🟦', kabum: '🟠',
  nike: '👟', centauro: '⚽', casasbahia: '🏠', americanas: '🔵',
  renner: '👗', natura: '🌿', boticario: '💜', pichau: '💻', terabyte: '🖥️',
}

export default function CentralPage() {
  const [produtos, setProdutos] = useState<ProdutoUnificado[]>([])
  const [nichos, setNichos] = useState<Nicho[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Filtros
  const hoje = new Date().toISOString().slice(0, 10)
  const [origemFiltro, setOrigemFiltro] = useState('')
  const [plataformaFiltro, setPlataformaFiltro] = useState('')
  const [nichoFiltro, setNichoFiltro] = useState('')
  const [statusFiltro, setStatusFiltro] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState(hoje)
  const [descontoMin, setDescontoMin] = useState(0)
  const [sortBy, setSortBy] = useState<'data' | 'desconto' | 'preco' | 'score'>('data')

  // Modal editar nicho
  const [editando, setEditando] = useState<ProdutoUnificado | null>(null)
  const [nichoEdit, setNichoEdit] = useState('')
  const [salvandoEdit, setSalvandoEdit] = useState(false)

  useEffect(() => {
    fetch('/api/busca/nichos').then(r => r.json()).then(d => setNichos(d.nichos || [])).catch(() => {})
  }, [])

  const loadDados = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (origemFiltro) params.set('origem', origemFiltro)
      if (plataformaFiltro) params.set('plataforma', plataformaFiltro)
      if (nichoFiltro) params.set('nicho', nichoFiltro)
      if (statusFiltro) params.set('status', statusFiltro)
      if (dataInicio) params.set('de', dataInicio)
      if (dataFim) params.set('ate', dataFim)

      const res = await fetch(`/api/central?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      let lista: ProdutoUnificado[] = data.produtos || []

      if (descontoMin > 0) {
        lista = lista.filter(p => (p.desconto_percent || 0) >= descontoMin)
      }

      if (sortBy === 'desconto') lista.sort((a, b) => (b.desconto_percent || 0) - (a.desconto_percent || 0))
      else if (sortBy === 'preco') lista.sort((a, b) => (a.preco || 999999) - (b.preco || 999999))
      else if (sortBy === 'score') lista.sort((a, b) => (b.score || 0) - (a.score || 0))

      setProdutos(lista)
      setStats(data.stats || null)
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setLoading(false)
    }
  }, [origemFiltro, plataformaFiltro, nichoFiltro, statusFiltro, dataInicio, dataFim, descontoMin, sortBy])

  useEffect(() => { loadDados() }, [loadDados])

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

  const selectPendentes = () => {
    setSelecionados(new Set(produtos.filter(p => p.status_disparo === 'pendente').map(p => p.id)))
  }

  const handleDisparar = async () => {
    if (selecionados.size === 0) return
    setEnviando(true)
    try {
      const selected = produtos.filter(p => selecionados.has(p.id))
      const apiIds = selected.filter(p => p.origem === 'api').map(p => p.id)
      const garimpIds = selected.filter(p => p.origem === 'garimpado').map(p => p.id)

      let totalEnviados = 0
      let totalErros = 0

      if (garimpIds.length > 0) {
        await fetch('/api/garimpados', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: garimpIds, status: 'processado' }),
        })
      }

      const allIds = [...apiIds, ...garimpIds]
      if (allIds.length > 0) {
        const res = await fetch('/api/disparos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ produto_ids: allIds }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
        totalEnviados = data.enviados || 0
        totalErros = data.erros || 0
      }

      setMsg({ type: 'success', text: `${totalEnviados} enviado(s)${totalErros > 0 ? `, ${totalErros} erro(s)` : ''}` })
      setSelecionados(new Set())
      loadDados()
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setEnviando(false)
      setTimeout(() => setMsg(null), 5000)
    }
  }

  const handleAprovarGarimpados = async () => {
    const garimpIds = produtos.filter(p => selecionados.has(p.id) && p.origem === 'garimpado').map(p => p.id)
    if (garimpIds.length === 0) return
    try {
      await fetch('/api/garimpados', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: garimpIds, status: 'processado' }),
      })
      setMsg({ type: 'success', text: `${garimpIds.length} garimpado(s) aprovado(s)` })
      setSelecionados(new Set())
      loadDados()
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message })
    }
    setTimeout(() => setMsg(null), 4000)
  }

  const handleDescartarGarimpados = async () => {
    const garimpIds = produtos.filter(p => selecionados.has(p.id) && p.origem === 'garimpado').map(p => p.id)
    if (garimpIds.length === 0) return
    try {
      await fetch('/api/garimpados', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: garimpIds, status: 'descartado' }),
      })
      setMsg({ type: 'success', text: `${garimpIds.length} garimpado(s) descartado(s)` })
      setSelecionados(new Set())
      loadDados()
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message })
    }
    setTimeout(() => setMsg(null), 4000)
  }

  const handleExcluirMassa = async () => {
    if (selecionados.size === 0) return
    if (!confirm(`Excluir ${selecionados.size} produto(s)?`)) return
    setExcluindo(true)
    try {
      const selected = produtos.filter(p => selecionados.has(p.id))
      const apiIds = selected.filter(p => p.origem === 'api').map(p => p.id)
      const garimpIds = selected.filter(p => p.origem === 'garimpado').map(p => p.id)

      if (apiIds.length > 0) {
        await fetch('/api/produtos/batch', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: apiIds }),
        })
      }
      if (garimpIds.length > 0) {
        await fetch('/api/garimpados', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: garimpIds }),
        })
      }

      setMsg({ type: 'success', text: `${selecionados.size} produto(s) excluido(s)` })
      setSelecionados(new Set())
      loadDados()
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setExcluindo(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  const handleExcluirUm = async (e: React.MouseEvent, p: ProdutoUnificado) => {
    e.stopPropagation()
    if (!confirm(`Excluir "${p.titulo.slice(0, 60)}..."?`)) return
    try {
      if (p.origem === 'api') {
        await fetch(`/api/produtos/${p.id}`, { method: 'DELETE' })
      } else {
        await fetch('/api/garimpados', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: [p.id] }),
        })
      }
      setProdutos(prev => prev.filter(x => x.id !== p.id))
      setMsg({ type: 'success', text: 'Excluido!' })
      setTimeout(() => setMsg(null), 3000)
    } catch (e: any) {
      setMsg({ type: 'error', text: (e as Error).message })
    }
  }

  const abrirEditar = (e: React.MouseEvent, produto: ProdutoUnificado) => {
    e.stopPropagation()
    setEditando(produto)
    setNichoEdit(produto.nicho || '')
  }

  const salvarNicho = async () => {
    if (!editando) return
    setSalvandoEdit(true)
    try {
      if (editando.origem === 'api') {
        const res = await fetch(`/api/produtos/${editando.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nicho: nichoEdit }),
        })
        const data = await res.json()
        if (data.error) throw new Error(data.error)
      }
      setProdutos(prev => prev.map(p => p.id === editando.id ? { ...p, nicho: nichoEdit } : p))
      setMsg({ type: 'success', text: 'Categoria atualizada!' })
      setEditando(null)
      setTimeout(() => setMsg(null), 3000)
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setSalvandoEdit(false)
    }
  }

  const fmt = (v: number | null) => v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  const temGarimpSelecionado = produtos.some(p => selecionados.has(p.id) && p.origem === 'garimpado')

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎯 Central de Ofertas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Todas as ofertas em um unico lugar — APIs + Garimpados
          </p>
        </div>
        <Button onClick={loadDados} variant="outline" size="sm" disabled={loading}>
          {loading ? '...' : '🔄'} Atualizar
        </Button>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-gray-900', bg: 'bg-white' },
            { label: 'Via API', value: stats.api, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Garimpados', value: stats.garimpados, color: 'text-purple-600', bg: 'bg-purple-50' },
            { label: 'Enviados', value: stats.enviados, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Pendentes', value: stats.pendentes, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          ].map(s => (
            <Card key={s.label} className={s.bg}>
              <CardContent className="p-3 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* Filtros */}
      <Card className="mb-4">
        <CardContent className="pt-4 pb-3">
          {/* Linha 1: Origem · Status · Ordenacao */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {/* Origem */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Origem</p>
              <div className="flex gap-1.5">
                {[
                  { id: '', label: 'Todas' },
                  { id: 'api', label: '🔌 APIs' },
                  { id: 'garimpado', label: '🕵️ Garimpados' },
                ].map(o => (
                  <button key={o.id} onClick={() => setOrigemFiltro(o.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${origemFiltro === o.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status de disparo */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</p>
              <div className="flex gap-1.5">
                {[
                  { id: '', label: 'Todos' },
                  { id: 'pendente_disparo', label: '⏳ Pendentes' },
                  { id: 'enviado', label: '✅ Enviados' },
                  { id: 'pendente', label: '🟡 Garimpo Pendente' },
                  { id: 'processado', label: '🔵 Garimpo Aprovado' },
                  { id: 'descartado', label: '⚫ Descartados' },
                ].map(s => (
                  <button key={s.id} onClick={() => setStatusFiltro(s.id)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFiltro === s.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ordenacao */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ordenar por</p>
              <div className="flex flex-col gap-1">
                {[
                  { id: 'data', label: '📅 Mais recente' },
                  { id: 'desconto', label: '🔻 Maior desconto' },
                  { id: 'score', label: '⭐ Maior score' },
                  { id: 'preco', label: '💰 Menor preco' },
                ].map(s => (
                  <button key={s.id} onClick={() => setSortBy(s.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${sortBy === s.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Linha 2: Periodo · Desconto min · Plataforma */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-3 border-b">
            {/* Periodo */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Periodo</p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <span className="text-xs text-gray-400 block mb-1">De</span>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:border-rose-400 focus:bg-white" />
                </div>
                <div className="flex-1">
                  <span className="text-xs text-gray-400 block mb-1">Ate</span>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:border-rose-400 focus:bg-white" />
                </div>
              </div>
            </div>

            {/* Desconto min */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Desconto minimo %</p>
              <input type="number" min={0} max={99} value={descontoMin}
                onChange={e => setDescontoMin(Math.max(0, +e.target.value || 0))}
                className="w-24 px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:border-rose-400 focus:bg-white" />
            </div>

            {/* Plataforma */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Plataforma</p>
              <div className="flex flex-wrap gap-1.5">
                {PLATAFORMAS.map(p => (
                  <button key={p.id} onClick={() => setPlataformaFiltro(p.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${plataformaFiltro === p.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Categoria */}
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Categoria</p>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => setNichoFiltro('')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${!nichoFiltro ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                Todas
              </button>
              {nichos.map(n => (
                <button key={n.id} onClick={() => setNichoFiltro(n.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${nichoFiltro === n.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {n.emoji} {n.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acoes de selecao */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">
          {selecionados.size === produtos.length && produtos.length > 0 ? 'Desmarcar todos' : `Selecionar todos (${produtos.length})`}
        </button>
        <span className="text-gray-300">|</span>
        <button onClick={selectPendentes} className="text-xs text-blue-600 hover:underline">
          Selecionar pendentes ({produtos.filter(p => p.status_disparo === 'pendente').length})
        </button>
        {selecionados.size > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <button onClick={() => setSelecionados(new Set())} className="text-xs text-gray-500 hover:underline">
              Limpar selecao ({selecionados.size})
            </button>
          </>
        )}
      </div>

      {/* Grid de produtos */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : produtos.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Nenhum produto encontrado com esses filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {produtos.map(p => {
            const selecionado = selecionados.has(p.id)
            const nichoInfo = nichos.find(n => n.id === p.nicho)
            const isGarimpado = p.origem === 'garimpado'
            const jaEnviado = p.status_disparo === 'enviado'

            return (
              <div
                key={p.id}
                onClick={() => toggleSelect(p.id)}
                className={`cursor-pointer rounded-xl border-2 transition-all ${
                  selecionado ? 'border-rose-400 bg-rose-50 shadow-md' :
                  jaEnviado ? 'border-green-200 bg-green-50/30 opacity-75' :
                  isGarimpado ? 'border-purple-200 bg-purple-50/20 hover:border-purple-300 hover:shadow-sm' :
                  'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}
              >
                <div className="flex gap-3 p-3">
                  {/* Checkbox */}
                  <div className="flex items-start pt-0.5 shrink-0">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      selecionado ? 'bg-rose-500 border-rose-500' : 'border-gray-300'
                    }`}>
                      {selecionado && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                  </div>

                  {/* Thumbnail */}
                  {p.thumbnail && (
                    <img src={p.thumbnail} alt={p.titulo}
                      className="w-16 h-16 object-contain rounded-lg bg-gray-50 shrink-0" />
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug">{p.titulo}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {p.preco != null && <span className="text-base font-bold text-green-700">{fmt(p.preco)}</span>}
                      {p.preco_original != null && p.preco_original !== p.preco && (
                        <span className="text-xs text-gray-400 line-through">{fmt(p.preco_original)}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {/* Origem */}
                      <Badge className={`text-xs px-1.5 py-0 ${isGarimpado ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' : 'bg-blue-100 text-blue-700 hover:bg-blue-100'}`}>
                        {isGarimpado ? '🕵️ Garimpado' : '🔌 API'}
                      </Badge>

                      {/* Desconto */}
                      {p.desconto_percent != null && p.desconto_percent > 0 && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs px-1.5 py-0">
                          -{p.desconto_percent}%
                        </Badge>
                      )}

                      {/* Frete gratis */}
                      {p.frete_gratis && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs px-1.5 py-0">
                          Frete gratis
                        </Badge>
                      )}

                      {/* Cupom */}
                      {p.cupom && (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-xs px-1.5 py-0">
                          🏷️ {p.cupom}
                        </Badge>
                      )}

                      {/* Status disparo */}
                      {jaEnviado ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs px-1.5 py-0">
                          ✅ Enviado
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-xs px-1.5 py-0">
                          ⏳ Pendente
                        </Badge>
                      )}

                      {/* Status garimpo */}
                      {isGarimpado && p.status_garimpo && p.status_garimpo !== 'enviado' && (
                        <Badge className={`text-xs px-1.5 py-0 ${
                          p.status_garimpo === 'processado' ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                          p.status_garimpo === 'descartado' ? 'bg-gray-100 text-gray-500 hover:bg-gray-100' :
                          'bg-yellow-100 text-yellow-700 hover:bg-yellow-100'
                        }`}>
                          {p.status_garimpo === 'processado' ? '✅ Aprovado' : p.status_garimpo === 'descartado' ? '❌ Descartado' : '🟡 Garimpo'}
                        </Badge>
                      )}

                      {/* Score */}
                      {p.score != null && (
                        <Badge className={`text-xs px-1.5 py-0 ${
                          p.score >= 60 ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' :
                          p.score >= 40 ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                          'bg-gray-100 text-gray-500 hover:bg-gray-100'
                        }`} title={p.score_detalhes ? Object.entries(p.score_detalhes).map(([k,v]) => `${k}:${v}`).join(' ') : ''}>
                          {p.score >= 60 ? '🏆' : p.score >= 40 ? '👍' : '📊'} {p.score}pts
                        </Badge>
                      )}

                      {/* Plataforma + Nicho */}
                      <Badge variant="outline" className="text-xs px-1.5 py-0 text-gray-500">
                        {PLAT_ICON[p.plataforma] || '🔗'} {p.loja_nome || p.plataforma}
                        {nichoInfo ? ` · ${nichoInfo.emoji} ${nichoInfo.label}` : ''}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">🕐 {fmtDate(p.data_ref)}</p>
                  </div>
                </div>

                {/* Botoes */}
                <div className="px-3 pb-2.5 flex gap-2" onClick={e => e.stopPropagation()}>
                  <a href={p.link_afiliado || p.link_original} target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-center text-xs py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors">
                    🔗 Afiliado
                  </a>
                  <a href={p.link_original} target="_blank" rel="noopener noreferrer"
                    className="px-3 text-xs py-1.5 border text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    Ver
                  </a>
                  {p.origem === 'api' && (
                    <button onClick={e => abrirEditar(e, p)}
                      className="px-3 text-xs py-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar categoria">
                      ✏️
                    </button>
                  )}
                  <button onClick={e => handleExcluirUm(e, p)}
                    className="px-3 text-xs py-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir">
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal editar categoria */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditando(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-start gap-3">
              {editando.thumbnail && (
                <img src={editando.thumbnail} alt="" className="w-14 h-14 object-contain rounded-lg bg-gray-50 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">{editando.titulo}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {PLAT_ICON[editando.plataforma] || '🔗'} {editando.plataforma} · Categoria atual:{' '}
                  <span className="text-rose-600 font-medium">
                    {nichos.find(n => n.id === editando.nicho)?.emoji} {nichos.find(n => n.id === editando.nicho)?.label || editando.nicho || 'Nenhuma'}
                  </span>
                </p>
              </div>
              <button onClick={() => setEditando(null)} className="text-gray-400 hover:text-gray-600 text-lg shrink-0">✕</button>
            </div>
            <div className="p-5">
              <label className="block text-sm font-medium text-gray-700 mb-3">Nova categoria</label>
              <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
                {nichos.map(n => (
                  <button key={n.id} onClick={() => setNichoEdit(n.id)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors ${nichoEdit === n.id ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {n.emoji} {n.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={salvarNicho} disabled={salvandoEdit || nichoEdit === (editando.nicho || '')}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white">
                  {salvandoEdit ? '⏳ Salvando...' : '✅ Salvar categoria'}
                </Button>
                <Button onClick={() => setEditando(null)} variant="outline" className="text-gray-500">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Barra flutuante de selecao */}
      {selecionados.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 z-50 flex-wrap max-w-[95vw]">
          <span className="text-sm font-medium">{selecionados.size} selecionado(s)</span>

          <Button onClick={handleDisparar} disabled={enviando}
            className="bg-green-500 hover:bg-green-400 text-white text-xs h-8 px-3">
            {enviando ? '⏳' : '📤'} Disparar
          </Button>

          {temGarimpSelecionado && (
            <>
              <Button onClick={handleAprovarGarimpados}
                className="bg-blue-500 hover:bg-blue-400 text-white text-xs h-8 px-3">
                ✅ Aprovar
              </Button>
              <Button onClick={handleDescartarGarimpados}
                className="bg-gray-600 hover:bg-gray-500 text-white text-xs h-8 px-3">
                ❌ Descartar
              </Button>
            </>
          )}

          <Button onClick={handleExcluirMassa} disabled={excluindo}
            className="bg-red-500 hover:bg-red-400 text-white text-xs h-8 px-3">
            {excluindo ? '⏳' : '🗑️'} Excluir
          </Button>

          <button onClick={() => setSelecionados(new Set())} className="text-gray-400 hover:text-white text-sm ml-1">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
