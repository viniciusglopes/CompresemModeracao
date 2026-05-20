'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Nicho {
  id: string
  label: string
  emoji: string
  category: string
}

interface Produto {
  id: string
  titulo: string
  preco: number
  preco_original: number
  desconto_percent: number
  plataforma: string
  link_original: string
  link_afiliado: string
  thumbnail: string
  nicho: string
  frete_gratis: boolean
  qtd_vendida: number
  created_at: string
}

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [nichos, setNichos] = useState<Nicho[]>([])
  const [loading, setLoading] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [nichoFiltro, setNichoFiltro] = useState('')
  const [plataformaFiltro, setPlataformaFiltro] = useState('')
  const [nichoBusca, setNichoBusca] = useState('eletronicos')
  const [plataformaBusca, setPlataformaBusca] = useState<'mercadolivre' | 'shopee' | 'aliexpress' | 'amazon' | 'lomadee' | 'awin'>('mercadolivre')
  const [msg, setMsg] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [stats, setStats] = useState<{ total: number; salvos?: number } | null>(null)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [excluindo, setExcluindo] = useState(false)

  useEffect(() => {
    fetch('/api/busca/nichos')
      .then(r => r.json())
      .then(d => setNichos(d.nichos || []))
      .catch(() => {})
  }, [])

  const loadProdutos = useCallback(async () => {
    setLoading(true)
    try {
      const nichoParam = nichoFiltro ? `&nicho=${nichoFiltro}` : ''
      if (!plataformaFiltro) {
        const [r1, r2, r3, r4, r5, r6] = await Promise.all([
          fetch(`/api/busca/mercadolivre?plataforma=mercadolivre&limit=100${nichoParam}`).then(r => r.json()),
          fetch(`/api/busca/mercadolivre?plataforma=shopee&limit=100${nichoParam}`).then(r => r.json()),
          fetch(`/api/busca/mercadolivre?plataforma=aliexpress&limit=100${nichoParam}`).then(r => r.json()),
          fetch(`/api/busca/mercadolivre?plataforma=amazon&limit=100${nichoParam}`).then(r => r.json()),
          fetch(`/api/busca/mercadolivre?plataforma=lomadee&limit=100${nichoParam}`).then(r => r.json()),
          fetch(`/api/busca/mercadolivre?plataforma=awin&limit=100${nichoParam}`).then(r => r.json()),
        ])
        setProdutos([...(r1.produtos || []), ...(r2.produtos || []), ...(r3.produtos || []), ...(r4.produtos || []), ...(r5.produtos || []), ...(r6.produtos || [])])
      } else {
        const endpointMap: Record<string, string> = { shopee: '/api/busca/mercadolivre?plataforma=shopee', aliexpress: '/api/busca/mercadolivre?plataforma=aliexpress', amazon: '/api/busca/mercadolivre?plataforma=amazon', lomadee: '/api/busca/mercadolivre?plataforma=lomadee', awin: '/api/busca/mercadolivre?plataforma=awin', mercadolivre: '/api/busca/mercadolivre' }
        const endpoint = endpointMap[plataformaFiltro] || '/api/busca/mercadolivre'
        const res = await fetch(`${endpoint}?limit=200${nichoParam}`)
        const data = await res.json()
        setProdutos(data.produtos || [])
      }
    } finally {
      setLoading(false)
    }
  }, [nichoFiltro, plataformaFiltro])

  useEffect(() => {
    loadProdutos()
  }, [loadProdutos])

  const handleBuscar = async () => {
    setBuscando(true)
    const nichoLabel = nichos.find(n => n.id === nichoBusca)?.label || nichoBusca
    const plataformaLabels: Record<string, string> = { shopee: 'Shopee', aliexpress: 'AliExpress', amazon: 'Amazon', lomadee: 'Lomadee', awin: 'AWIN', mercadolivre: 'Mercado Livre' }
    const plataformaLabel = plataformaLabels[plataformaBusca] || 'Mercado Livre'
    setMsg({ type: 'info', text: `Buscando "${nichoLabel}" no ${plataformaLabel}...` })
    try {
      const buscarEndpointMap: Record<string, string> = { shopee: '/api/busca/shopee', aliexpress: '/api/busca/aliexpress', amazon: '/api/busca/amazon', lomadee: '/api/busca/lomadee', awin: '/api/busca/awin', mercadolivre: '/api/busca/mercadolivre' }
      const endpoint = buscarEndpointMap[plataformaBusca] || '/api/busca/mercadolivre'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicho: nichoBusca, limite: 30 }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setStats({ total: data.total_encontrados, salvos: data.salvos })
      setMsg({ type: 'success', text: `${data.salvos} produtos salvos em "${data.nicho}" (${plataformaLabel})` })
      loadProdutos()
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setBuscando(false)
      setTimeout(() => setMsg(null), 8000)
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
    if (selecionados.size === produtosFiltrados.length && produtosFiltrados.length > 0) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(produtosFiltrados.map(p => p.id)))
    }
  }

  const handleExcluir = async (id: string, titulo: string) => {
    if (!confirm(`Excluir "${titulo.slice(0, 60)}..."?`)) return
    try {
      const res = await fetch(`/api/produtos/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProdutos(prev => prev.filter(p => p.id !== id))
      setSelecionados(prev => { const n = new Set(prev); n.delete(id); return n })
      setMsg({ type: 'success', text: 'Produto excluido!' })
      setTimeout(() => setMsg(null), 3000)
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message })
    }
  }

  const handleExcluirMassa = async () => {
    if (selecionados.size === 0) return
    if (!confirm(`Excluir ${selecionados.size} produto(s)?`)) return
    setExcluindo(true)
    try {
      const res = await fetch('/api/produtos/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selecionados) }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProdutos(prev => prev.filter(p => !selecionados.has(p.id)))
      setMsg({ type: 'success', text: `${data.excluidos} produtos excluidos!` })
      setSelecionados(new Set())
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setExcluindo(false)
      setTimeout(() => setMsg(null), 4000)
    }
  }

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const nichoAtual = nichos.find(n => n.id === nichoBusca)
  const nichosComProdutos = [...new Set(produtos.map(p => p.nicho))]
  const produtosFiltrados = nichoFiltro ? produtos.filter(p => p.nicho === nichoFiltro) : produtos

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏷️ Produtos</h1>
          <p className="text-sm text-gray-500 mt-1">{produtos.length} produtos no banco · {nichosComProdutos.length} categorias</p>
        </div>
      </div>

      {/* Painel de busca */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-gray-700">🔍 Buscar novos produtos</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Selecao de plataforma */}
          <div className="flex gap-2 mb-3 flex-wrap">
            {[
              { id: 'mercadolivre', label: '🛒 Mercado Livre' },
              { id: 'shopee', label: '🧡 Shopee' },
              { id: 'aliexpress', label: '🔴 AliExpress' },
              { id: 'amazon', label: '📦 Amazon' },
              { id: 'lomadee', label: '🏬 Lomadee' },
              { id: 'awin', label: '🌐 AWIN' },
            ].map(p => (
              <button key={p.id} onClick={() => setPlataformaBusca(p.id as any)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  plataformaBusca === p.id ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Grid de todas as categorias */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 mb-3">
            {nichos.map(n => (
              <button key={n.id} onClick={() => setNichoBusca(n.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left flex items-center gap-1.5 ${
                  nichoBusca === n.id ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                <span>{n.emoji}</span>
                <span className="truncate">{n.label}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {nichoAtual && (
              <span className="text-sm text-gray-600">
                Categoria selecionada: <b>{nichoAtual.emoji} {nichoAtual.label}</b>
              </span>
            )}
            <Button onClick={handleBuscar} disabled={buscando || !nichoBusca} className="bg-rose-500 hover:bg-rose-600">
              {buscando ? '⏳ Buscando...' : `🔍 Buscar`}
            </Button>
          </div>

          {msg && (
            <p className={`mt-3 text-sm p-2 rounded-lg ${
              msg.type === 'success' ? 'bg-green-50 text-green-700' :
              msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
            }`}>{msg.text}</p>
          )}

          {stats && (
            <div className="mt-2 flex gap-4 text-xs text-gray-500">
              <span>Highlights encontrados: <b>{stats.total}</b></span>
              <span>Com desconto salvos: <b>{stats.salvos}</b></span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filtro por plataforma */}
      <div className="flex gap-2 mb-3 flex-wrap">
        {[
          { id: '', label: '🔀 Todas' },
          { id: 'mercadolivre', label: '🛒 Mercado Livre' },
          { id: 'shopee', label: '🧡 Shopee' },
          { id: 'amazon', label: '📦 Amazon' },
          { id: 'aliexpress', label: '🔴 AliExpress' },
          { id: 'lomadee', label: '🏬 Lomadee' },
          { id: 'awin', label: '🌐 AWIN' },
        ].map(p => (
          <button key={p.id} onClick={() => setPlataformaFiltro(p.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              plataformaFiltro === p.id ? 'bg-gray-800 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => setNichoFiltro('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            !nichoFiltro ? 'bg-gray-800 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
          }`}>
          Todos ({produtos.length})
        </button>
        {nichos.filter(n => nichosComProdutos.includes(n.id)).map(n => {
          const count = produtos.filter(p => p.nicho === n.id).length
          return (
            <button key={n.id} onClick={() => setNichoFiltro(n.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                nichoFiltro === n.id ? 'bg-gray-800 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
              }`}>
              {n.emoji} {n.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Acoes de selecao */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={selectAll} className="text-xs text-rose-600 hover:underline">
          {selecionados.size === produtosFiltrados.length && produtosFiltrados.length > 0 ? 'Desmarcar todos' : `Selecionar todos (${produtosFiltrados.length})`}
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
      ) : produtosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">Nenhum produto encontrado.</p>
          <p className="text-gray-400 text-xs mt-1">Selecione uma categoria e clique em "Buscar".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {produtosFiltrados.map(p => {
            const nichoInfo = nichos.find(n => n.id === p.nicho)
            const selecionado = selecionados.has(p.id)
            const platColors: Record<string, string> = { mercadolivre: 'border-yellow-300 text-yellow-700', shopee: 'border-rose-300 text-rose-600', aliexpress: 'border-red-300 text-red-700', amazon: 'border-orange-300 text-orange-700', lomadee: 'border-green-300 text-green-700', awin: 'border-purple-300 text-purple-700' }
            const platIcons: Record<string, string> = { mercadolivre: '🛒 ML', shopee: '🧡 Shopee', aliexpress: '🔴 AliExpress', amazon: '📦 Amazon', lomadee: '🏬 Lomadee', awin: '🌐 AWIN' }
            return (
              <div key={p.id} onClick={() => toggleSelect(p.id)}
                className={`cursor-pointer rounded-xl border-2 transition-all overflow-hidden ${
                  selecionado ? 'border-rose-400 bg-rose-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }`}>
                <div className="flex gap-3 p-3">
                  <div className="flex items-start pt-0.5 shrink-0">
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                      selecionado ? 'bg-rose-500 border-rose-500' : 'border-gray-300'
                    }`}>
                      {selecionado && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                  </div>
                  {p.thumbnail && (
                    <img src={p.thumbnail} alt={p.titulo}
                      className="w-16 h-16 object-contain rounded-lg bg-gray-50 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-snug">{p.titulo}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-base font-bold text-green-700">{fmt(p.preco)}</span>
                      <span className="text-xs text-gray-400 line-through">{fmt(p.preco_original)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs px-1.5 py-0">
                        -{p.desconto_percent}%
                      </Badge>
                      {p.frete_gratis && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs px-1.5 py-0">
                          Frete gratis
                        </Badge>
                      )}
                      {nichoInfo && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0">
                          {nichoInfo.emoji} {nichoInfo.label}
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-xs px-1.5 py-0 ${platColors[p.plataforma] || 'border-gray-300 text-gray-600'}`}>
                        {platIcons[p.plataforma] || p.plataforma}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="px-3 pb-2.5 flex gap-2" onClick={e => e.stopPropagation()}>
                  <a href={p.link_afiliado || p.link_original} target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-center text-xs py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors">
                    🔗 Afiliado
                  </a>
                  <a href={p.link_original} target="_blank" rel="noopener noreferrer"
                    className="px-3 text-xs py-1.5 border text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    Ver
                  </a>
                  <button onClick={() => handleExcluir(p.id, p.titulo)}
                    className="px-3 text-xs py-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Barra flutuante de selecao */}
      {selecionados.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-50">
          <span className="text-sm font-medium">{selecionados.size} produto{selecionados.size > 1 ? 's' : ''}</span>
          <Button onClick={handleExcluirMassa} disabled={excluindo}
            className="bg-red-500 hover:bg-red-400 text-white text-sm h-8 px-4">
            {excluindo ? '⏳' : '🗑️'} Excluir selecionados
          </Button>
          <button onClick={() => setSelecionados(new Set())} className="text-gray-400 hover:text-white text-sm">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
