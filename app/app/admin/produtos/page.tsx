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

  useEffect(() => {
    fetch('/api/busca/nichos')
      .then(r => r.json())
      .then(d => setNichos(d.nichos || []))
      .catch(() => {})
  }, [])

  const loadProdutos = useCallback(async () => {
    setLoading(true)
    try {
      const plataforma = plataformaFiltro || 'mercadolivre'
      const params = new URLSearchParams({ plataforma, limit: '200' })
      if (nichoFiltro) params.set('nicho', nichoFiltro)
      // Se sem filtro de plataforma, busca ambas
      if (!plataformaFiltro) {
        const [r1, r2, r3, r4, r5, r6] = await Promise.all([
          fetch(`/api/busca/mercadolivre?plataforma=mercadolivre&limit=100`).then(r => r.json()),
          fetch(`/api/busca/mercadolivre?plataforma=shopee&limit=100`).then(r => r.json()),
          fetch(`/api/busca/mercadolivre?plataforma=aliexpress&limit=100`).then(r => r.json()),
          fetch(`/api/busca/mercadolivre?plataforma=amazon&limit=100`).then(r => r.json()),
          fetch(`/api/busca/mercadolivre?plataforma=lomadee&limit=100`).then(r => r.json()),
          fetch(`/api/busca/mercadolivre?plataforma=awin&limit=100`).then(r => r.json()),
        ])
        setProdutos([...(r1.produtos || []), ...(r2.produtos || []), ...(r3.produtos || []), ...(r4.produtos || []), ...(r5.produtos || []), ...(r6.produtos || [])])
      } else {
        const endpointMap: Record<string, string> = { shopee: '/api/busca/mercadolivre?plataforma=shopee', aliexpress: '/api/busca/mercadolivre?plataforma=aliexpress', amazon: '/api/busca/mercadolivre?plataforma=amazon', lomadee: '/api/busca/mercadolivre?plataforma=lomadee', awin: '/api/busca/mercadolivre?plataforma=awin', mercadolivre: '/api/busca/mercadolivre' }
        const endpoint = endpointMap[plataforma] || '/api/busca/mercadolivre'
        const res = await fetch(`${endpoint}?${params}`)
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

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const nichoAtual = nichos.find(n => n.id === nichoBusca)
  const nichosComProdutos = [...new Set(produtos.map(p => p.nicho))]

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
          {/* Seleção de plataforma */}
          <div className="flex gap-2 mb-3">
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

      {/* Filtros por nicho */}
      {/* Filtro por plataforma */}
      <div className="flex gap-2 mb-3">
        {[
          { id: '', label: '🔀 Todas as plataformas' },
          { id: 'mercadolivre', label: '🛒 Mercado Livre' },
          { id: 'shopee', label: '🧡 Shopee' },
          { id: 'aliexpress', label: '🔴 AliExpress' },
          { id: 'amazon', label: '📦 Amazon' },
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

      {/* Grid de produtos */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : produtos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-sm">Nenhum produto encontrado.</p>
          <p className="text-gray-400 text-xs mt-1">Selecione uma categoria e clique em "Buscar no ML".</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {produtos.map(p => {
            const nichoInfo = nichos.find(n => n.id === p.nicho)
            return (
              <Card key={p.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <div className="flex gap-3 p-4">
                  {p.thumbnail && (
                    <img src={p.thumbnail} alt={p.titulo}
                      className="w-20 h-20 object-contain rounded-lg bg-gray-50 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug">{p.titulo}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-lg font-bold text-green-700">{fmt(p.preco)}</span>
                      <span className="text-xs text-gray-400 line-through">{fmt(p.preco_original)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">
                        -{p.desconto_percent}%
                      </Badge>
                      {p.frete_gratis && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">
                          Frete grátis
                        </Badge>
                      )}
                      {nichoInfo && (
                        <Badge variant="secondary" className="text-xs">
                          {nichoInfo.emoji} {nichoInfo.label}
                        </Badge>
                      )}
                      <Badge variant="outline" className={`text-xs ${
                        ({ mercadolivre: 'border-yellow-300 text-yellow-700', shopee: 'border-rose-300 text-rose-600', lomadee: 'border-green-300 text-green-700', awin: 'border-purple-300 text-purple-700' } as Record<string, string>)[p.plataforma] || 'border-gray-300 text-gray-600'
                      }`}>
                        {({ mercadolivre: '🛒 ML', shopee: '🧡 Shopee', lomadee: '🏬 Lomadee', awin: '🌐 AWIN' } as Record<string, string>)[p.plataforma] || p.plataforma}
                      </Badge>
                    </div>
                    {p.qtd_vendida > 0 && (
                      <p className="text-xs text-gray-400 mt-1">{p.qtd_vendida} vendidos</p>
                    )}
                  </div>
                </div>
                <div className="px-4 pb-3 flex gap-2">
                  <a href={p.link_afiliado || p.link_original} target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-center text-xs py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors">
                    🔗 Link Afiliado
                  </a>
                  <a href={p.link_original} target="_blank" rel="noopener noreferrer"
                    className="px-3 text-xs py-1.5 border text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    Ver
                  </a>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
