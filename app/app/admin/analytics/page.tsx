'use client'

import { useState, useEffect, useCallback } from 'react'

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
  produto_id_externo: string
  frete_gratis: boolean
  qtd_vendida: number
  ativo: boolean
  score: number
  score_detalhes: any
  loja_nome: string | null
  created_at: string
  updated_at: string
}

const PLAT_LABELS: Record<string, string> = {
  mercadolivre: 'ML',
  shopee: 'Shopee',
  lomadee: 'Lomadee',
  awin: 'AWIN',
}

const PLAT_COLORS: Record<string, string> = {
  mercadolivre: 'bg-yellow-100 text-yellow-800',
  shopee: 'bg-orange-100 text-orange-800',
  lomadee: 'bg-green-100 text-green-800',
  awin: 'bg-purple-100 text-purple-800',
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function formatDate(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function formatDateShort(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function AnalyticsPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [filtros, setFiltros] = useState<{ lojas: string[]; nichos: string[]; plataformas: string[] }>({ lojas: [], nichos: [], plataformas: [] })

  const [plataforma, setPlataforma] = useState('')
  const [nicho, setNicho] = useState('')
  const [loja, setLoja] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [descontoMin, setDescontoMin] = useState(0)
  const [ativo, setAtivo] = useState('')
  const [sort, setSort] = useState('updated_at')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)

  const PAGE_SIZE = 100

  const loadData = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(page * PAGE_SIZE),
      sort,
      order,
    })
    if (plataforma) params.set('plataforma', plataforma)
    if (nicho) params.set('nicho', nicho)
    if (loja) params.set('loja', loja)
    if (search) params.set('search', search)
    if (descontoMin > 0) params.set('desconto_min', String(descontoMin))
    if (ativo) params.set('ativo', ativo)

    try {
      const res = await fetch(`/api/admin/produtos?${params}`)
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setProdutos(data.produtos || [])
      setTotal(data.total || 0)
      if (data.filtros) setFiltros(data.filtros)
    } catch {
      setProdutos([])
    } finally {
      setLoading(false)
    }
  }, [plataforma, nicho, loja, search, descontoMin, ativo, sort, order, page])

  useEffect(() => { loadData() }, [loadData])

  const toggleSort = (col: string) => {
    if (sort === col) {
      setOrder(order === 'desc' ? 'asc' : 'desc')
    } else {
      setSort(col)
      setOrder('desc')
    }
    setPage(0)
  }

  const SortIcon = ({ col }: { col: string }) => {
    if (sort !== col) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="text-rose-500 ml-1">{order === 'desc' ? '↓' : '↑'}</span>
  }

  const handleExportCSV = () => {
    const headers = ['Data Importacao', 'Ultima Atualizacao', 'Plataforma', 'Loja', 'Titulo', 'Preco', 'Preco Original', 'Desconto %', 'Categoria', 'Score', 'Frete Gratis', 'Vendidos', 'Ativo', 'Link Afiliado', 'Link Original', 'ID Externo']
    const rows = produtos.map(p => [
      formatDate(p.created_at),
      formatDate(p.updated_at),
      p.plataforma,
      p.loja_nome || '',
      `"${(p.titulo || '').replace(/"/g, '""')}"`,
      p.preco,
      p.preco_original,
      p.desconto_percent,
      p.nicho,
      p.score,
      p.frete_gratis ? 'Sim' : 'Nao',
      p.qtd_vendida,
      p.ativo ? 'Sim' : 'Nao',
      p.link_afiliado,
      p.link_original,
      p.produto_id_externo,
    ])
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `csm-produtos-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const stats = {
    total,
    avgDesconto: produtos.length ? Math.round(produtos.reduce((s, p) => s + (p.desconto_percent || 0), 0) / produtos.length) : 0,
    avgScore: produtos.length ? Math.round(produtos.reduce((s, p) => s + (p.score || 0), 0) / produtos.length) : 0,
    avgPreco: produtos.length ? produtos.reduce((s, p) => s + (p.preco || 0), 0) / produtos.length : 0,
    freteGratis: produtos.filter(p => p.frete_gratis).length,
    ativos: produtos.filter(p => p.ativo).length,
  }

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📈 Analytics de Produtos</h1>
          <p className="text-sm text-gray-500 mt-1">{total} produtos no banco</p>
        </div>
        <button onClick={handleExportCSV} disabled={produtos.length === 0}
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors">
          📥 Exportar CSV
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-gray-500">Desconto Medio</p>
          <p className="text-xl font-bold text-red-600">{stats.avgDesconto}%</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-gray-500">Score Medio</p>
          <p className="text-xl font-bold text-blue-600">{stats.avgScore}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-gray-500">Preco Medio</p>
          <p className="text-xl font-bold text-green-700">{fmt(stats.avgPreco)}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-gray-500">Frete Gratis</p>
          <p className="text-xl font-bold text-emerald-600">{stats.freteGratis}</p>
        </div>
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs text-gray-500">Ativos</p>
          <p className="text-xl font-bold text-gray-900">{stats.ativos}/{produtos.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar titulo</label>
            <div className="flex gap-2">
              <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { setSearch(searchInput); setPage(0) } }}
                placeholder="Digite e pressione Enter..."
                className="flex-1 px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-rose-300 focus:border-rose-400 outline-none" />
              {search && <button onClick={() => { setSearch(''); setSearchInput(''); setPage(0) }} className="px-2 text-gray-400 hover:text-gray-600">✕</button>}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Plataforma</label>
            <select value={plataforma} onChange={e => { setPlataforma(e.target.value); setPage(0) }}
              className="px-3 py-1.5 border rounded-lg text-sm bg-white">
              <option value="">Todas</option>
              <option value="mercadolivre">Mercado Livre</option>
              <option value="awin">AWIN</option>
              <option value="shopee">Shopee</option>
              <option value="lomadee">Lomadee</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
            <select value={nicho} onChange={e => { setNicho(e.target.value); setPage(0) }}
              className="px-3 py-1.5 border rounded-lg text-sm bg-white">
              <option value="">Todas</option>
              {filtros.nichos.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Loja</label>
            <select value={loja} onChange={e => { setLoja(e.target.value); setPage(0) }}
              className="px-3 py-1.5 border rounded-lg text-sm bg-white">
              <option value="">Todas</option>
              {filtros.lojas.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Desconto min</label>
            <select value={descontoMin} onChange={e => { setDescontoMin(Number(e.target.value)); setPage(0) }}
              className="px-3 py-1.5 border rounded-lg text-sm bg-white">
              <option value={0}>Todos</option>
              <option value={10}>≥ 10%</option>
              <option value={20}>≥ 20%</option>
              <option value={30}>≥ 30%</option>
              <option value={50}>≥ 50%</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            <select value={ativo} onChange={e => { setAtivo(e.target.value); setPage(0) }}
              className="px-3 py-1.5 border rounded-lg text-sm bg-white">
              <option value="">Todos</option>
              <option value="true">Ativos</option>
              <option value="false">Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left">
                <th className="px-3 py-2.5 font-medium text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap" onClick={() => toggleSort('updated_at')}>
                  Atualizado <SortIcon col="updated_at" />
                </th>
                <th className="px-3 py-2.5 font-medium text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap" onClick={() => toggleSort('plataforma')}>
                  Plataforma <SortIcon col="plataforma" />
                </th>
                <th className="px-3 py-2.5 font-medium text-gray-600 whitespace-nowrap">Loja</th>
                <th className="px-3 py-2.5 font-medium text-gray-600 whitespace-nowrap min-w-[250px]">Produto</th>
                <th className="px-3 py-2.5 font-medium text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap text-right" onClick={() => toggleSort('preco')}>
                  Preco <SortIcon col="preco" />
                </th>
                <th className="px-3 py-2.5 font-medium text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap text-right" onClick={() => toggleSort('preco_original')}>
                  De <SortIcon col="preco_original" />
                </th>
                <th className="px-3 py-2.5 font-medium text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap text-right" onClick={() => toggleSort('desconto_percent')}>
                  Desc% <SortIcon col="desconto_percent" />
                </th>
                <th className="px-3 py-2.5 font-medium text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap" onClick={() => toggleSort('nicho')}>
                  Categoria <SortIcon col="nicho" />
                </th>
                <th className="px-3 py-2.5 font-medium text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap text-right" onClick={() => toggleSort('score')}>
                  Score <SortIcon col="score" />
                </th>
                <th className="px-3 py-2.5 font-medium text-gray-600 whitespace-nowrap text-center">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={10} className="px-3 py-12 text-center text-gray-400">Carregando...</td></tr>
              ) : produtos.length === 0 ? (
                <tr><td colSpan={10} className="px-3 py-12 text-center text-gray-400">Nenhum produto encontrado</td></tr>
              ) : produtos.map(p => (
                <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${!p.ativo ? 'opacity-50' : ''}`}>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                    {formatDateShort(p.updated_at)}
                    {p.created_at !== p.updated_at && (
                      <div className="text-gray-400">criado {formatDateShort(p.created_at)}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${PLAT_COLORS[p.plataforma] || 'bg-gray-100 text-gray-700'}`}>
                      {PLAT_LABELS[p.plataforma] || p.plataforma}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600 max-w-[120px] truncate">
                    {p.loja_nome || '-'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {p.thumbnail && (
                        <img src={p.thumbnail} alt="" className="w-10 h-10 object-contain rounded bg-gray-50 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <button onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                          className="text-left text-xs font-medium text-gray-800 hover:text-rose-600 line-clamp-2 leading-tight">
                          {p.titulo}
                        </button>
                        {!p.ativo && <span className="text-[10px] text-red-500 font-medium ml-1">INATIVO</span>}
                      </div>
                    </div>
                    {expanded === p.id && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-[11px] text-gray-600 space-y-1">
                        <div><b>ID Externo:</b> {p.produto_id_externo}</div>
                        <div><b>Vendidos:</b> {p.qtd_vendida}</div>
                        <div><b>Frete Gratis:</b> {p.frete_gratis ? 'Sim' : 'Nao'}</div>
                        <div><b>Score Detalhes:</b> {JSON.stringify(p.score_detalhes)}</div>
                        <div><b>Link Original:</b> <a href={p.link_original} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{p.link_original?.slice(0, 80)}...</a></div>
                        <div><b>Link Afiliado:</b> <a href={p.link_afiliado} target="_blank" rel="noopener noreferrer" className="text-rose-600 underline break-all">{p.link_afiliado?.slice(0, 80)}...</a></div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap font-semibold text-green-700 text-xs">
                    {fmt(p.preco)}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap text-xs text-gray-400 line-through">
                    {p.preco_original > p.preco ? fmt(p.preco_original) : '-'}
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    {p.desconto_percent > 0 ? (
                      <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${
                        p.desconto_percent >= 50 ? 'bg-red-100 text-red-700' :
                        p.desconto_percent >= 30 ? 'bg-orange-100 text-orange-700' :
                        p.desconto_percent >= 15 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        -{p.desconto_percent}%
                      </span>
                    ) : <span className="text-xs text-gray-300">-</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{p.nicho}</td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold ${
                      p.score >= 60 ? 'bg-green-100 text-green-700' :
                      p.score >= 30 ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {p.score}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center whitespace-nowrap">
                    <div className="flex gap-1 justify-center">
                      {p.link_afiliado && (
                        <a href={p.link_afiliado} target="_blank" rel="noopener noreferrer"
                          className="px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-[10px] font-medium transition-colors">
                          Afiliado
                        </a>
                      )}
                      <a href={p.link_original} target="_blank" rel="noopener noreferrer"
                        className="px-2 py-1 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded text-[10px] font-medium transition-colors">
                        Original
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <p className="text-xs text-gray-500">
              Mostrando {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, total)} de {total}
            </p>
            <div className="flex gap-1">
              <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}
                className="px-3 py-1 border rounded text-sm disabled:opacity-30 hover:bg-white transition-colors">
                ← Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const p = totalPages <= 7 ? i : page <= 3 ? i : page >= totalPages - 4 ? totalPages - 7 + i : page - 3 + i
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-3 py-1 border rounded text-sm transition-colors ${page === p ? 'bg-rose-500 text-white border-rose-500' : 'hover:bg-white'}`}>
                    {p + 1}
                  </button>
                )
              })}
              <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-30 hover:bg-white transition-colors">
                Proximo →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
