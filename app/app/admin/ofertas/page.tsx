'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Produto {
  id: string
  titulo: string
  preco: number
  preco_original: number
  desconto_percent: number
  plataforma: string
  link_afiliado: string
  link_original: string
  thumbnail: string
  nicho: string
  frete_gratis: boolean
  qtd_vendida: number
  score: number
  score_detalhes: Record<string, number>
  created_at: string
}

interface Nicho { id: string; label: string; emoji: string }

const PLATAFORMAS = [
  { id: '', label: 'Todas' },
  { id: 'mercadolivre', label: '🛒 ML' },
  { id: 'shopee', label: '🧡 Shopee' },
  { id: 'aliexpress', label: '🔴 AliExpress' },
  { id: 'amazon', label: '📦 Amazon' },
  { id: 'lomadee', label: '🏬 Lomadee' },
  { id: 'awin', label: '🌐 AWIN' },
]

const platIcons: Record<string, string> = { mercadolivre: '🛒 ML', shopee: '🧡 Shopee', aliexpress: '🔴 AliExpress', amazon: '📦 Amazon', lomadee: '🏬 Lomadee', awin: '🌐 AWIN' }
const platColors: Record<string, string> = { mercadolivre: 'border-yellow-300 text-yellow-700', shopee: 'border-rose-300 text-rose-600', aliexpress: 'border-red-300 text-red-700', amazon: 'border-orange-300 text-orange-700', lomadee: 'border-green-300 text-green-700', awin: 'border-purple-300 text-purple-700' }

export default function OfertasPage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [produtosEnviados, setProdutosEnviados] = useState<Set<string>>(new Set())
  const [nichos, setNichos] = useState<Nicho[]>([])
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Modal de edição de categoria
  const [editando, setEditando] = useState<Produto | null>(null)
  const [nichoEdit, setNichoEdit] = useState('')
  const [salvandoEdit, setSalvandoEdit] = useState(false)

  // Filtros
  const hoje = new Date().toISOString().slice(0, 10)
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState(hoje)
  const [nichoFiltro, setNichoFiltro] = useState('')
  const [plataformaFiltro, setPlataformaFiltro] = useState('')
  const [descontoMin, setDescontoMin] = useState(0)
  const [descontoMax, setDescontoMax] = useState(100)
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'pendentes' | 'enviados'>('todos')
  const [sortBy, setSortBy] = useState<'desconto' | 'data' | 'preco' | 'score'>('score')

  useEffect(() => {
    fetch('/api/busca/nichos').then(r => r.json()).then(d => setNichos(d.nichos || []))
  }, [])

  const loadDados = useCallback(async () => {
    setLoading(true)
    try {
      // Carrega produtos e disparos em paralelo
      const [r1, r2, r3, r4, r5, r6, r7] = await Promise.all([
        fetch('/api/busca/mercadolivre?plataforma=mercadolivre&limit=200').then(r => r.json()),
        fetch('/api/busca/mercadolivre?plataforma=shopee&limit=200').then(r => r.json()),
        fetch('/api/disparos?limit=500').then(r => r.json()),
        fetch('/api/busca/mercadolivre?plataforma=lomadee&limit=200').then(r => r.json()),
        fetch('/api/busca/mercadolivre?plataforma=awin&limit=200').then(r => r.json()),
        fetch('/api/busca/mercadolivre?plataforma=aliexpress&limit=200').then(r => r.json()),
        fetch('/api/busca/mercadolivre?plataforma=amazon&limit=200').then(r => r.json()),
      ])

      let todos: Produto[] = [...(r1.produtos || []), ...(r2.produtos || []), ...(r4.produtos || []), ...(r5.produtos || []), ...(r6.produtos || []), ...(r7.produtos || [])]

      // Filtra por data De/Até
      if (dataInicio) {
        const inicio = new Date(dataInicio + 'T00:00:00')
        todos = todos.filter(p => new Date(p.created_at) >= inicio)
      }
      if (dataFim) {
        const fim = new Date(dataFim + 'T23:59:59')
        todos = todos.filter(p => new Date(p.created_at) <= fim)
      }

      // Filtra por nicho
      if (nichoFiltro) todos = todos.filter(p => p.nicho === nichoFiltro)

      // Filtra por plataforma
      if (plataformaFiltro) todos = todos.filter(p => p.plataforma === plataformaFiltro)

      // Filtra por desconto min/max
      todos = todos.filter(p => p.desconto_percent >= descontoMin && p.desconto_percent <= descontoMax)

      // Ordena
      if (sortBy === 'score') todos.sort((a, b) => (b.score || 0) - (a.score || 0))
      else if (sortBy === 'desconto') todos.sort((a, b) => b.desconto_percent - a.desconto_percent)
      else if (sortBy === 'data') todos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      else if (sortBy === 'preco') todos.sort((a, b) => a.preco - b.preco)

      // IDs já enviados
      const enviados = new Set<string>((r3.disparos || []).map((d: any) => d.produto_id as string))
      setProdutosEnviados(enviados)

      // Filtra por status (enviado/pendente)
      if (statusFiltro === 'pendentes') todos = todos.filter(p => !enviados.has(p.id))
      if (statusFiltro === 'enviados') todos = todos.filter(p => enviados.has(p.id))

      setProdutos(todos)
    } finally {
      setLoading(false)
    }
  }, [dataInicio, dataFim, nichoFiltro, plataformaFiltro, descontoMin, descontoMax, statusFiltro, sortBy])

  useEffect(() => { loadDados() }, [loadDados])

  const toggleSelect = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selecionados.size === produtos.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(produtos.map(p => p.id)))
    }
  }

  const selectPendentes = () => {
    setSelecionados(new Set(produtos.filter(p => !produtosEnviados.has(p.id)).map(p => p.id)))
  }

  const handleEnviar = async () => {
    if (selecionados.size === 0) return
    setEnviando(true)
    try {
      const res = await fetch('/api/disparos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produto_ids: Array.from(selecionados),
          canal: 'telegram',
          grupo_nome: 'Manual',
        }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMsg({ type: 'success', text: `${data.enviados} produtos marcados como enviados!` })
      setSelecionados(new Set())
      loadDados()
    } catch (e: any) {
      setMsg({ type: 'error', text: e.message })
    } finally {
      setEnviando(false)
      setTimeout(() => setMsg(null), 5000)
    }
  }

  const abrirEditar = (e: React.MouseEvent, produto: Produto) => {
    e.stopPropagation()
    setEditando(produto)
    setNichoEdit(produto.nicho)
  }

  const salvarNicho = async () => {
    if (!editando) return
    setSalvandoEdit(true)
    try {
      const res = await fetch(`/api/produtos/${editando.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nicho: nichoEdit }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
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

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const nichosComProdutos = nichos // mostra todas as categorias

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📤 Gerenciar Ofertas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {produtos.length} produtos · {produtosEnviados.size} já enviados · {produtos.filter(p => !produtosEnviados.has(p.id)).length} pendentes
          </p>
        </div>
        {selecionados.size > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-rose-600">{selecionados.size} selecionados</span>
            <Button onClick={handleEnviar} disabled={enviando} className="bg-green-600 hover:bg-green-700">
              {enviando ? '⏳ Enviando...' : `📤 Marcar ${selecionados.size} como enviado`}
            </Button>
          </div>
        )}
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* Filtros */}
      <Card className="mb-4">
        <CardContent className="pt-4 pb-3">
          {/* Linha 1: Período · Desconto · Ordenação */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            {/* Período */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Período</p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <span className="text-xs text-gray-400 block mb-1">De</span>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:border-rose-400 focus:bg-white" />
                </div>
                <div className="flex-1">
                  <span className="text-xs text-gray-400 block mb-1">Até</span>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:border-rose-400 focus:bg-white" />
                </div>
              </div>
            </div>

            {/* Desconto */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Desconto %</p>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <span className="text-xs text-gray-400 block mb-1">Mínimo</span>
                  <input type="number" min={0} max={99} value={descontoMin}
                    onChange={e => { const v = Math.max(0, Math.min(+e.target.value, descontoMax - 1)); setDescontoMin(isNaN(v) ? 0 : v) }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:border-red-400 focus:bg-white" />
                </div>
                <span className="text-gray-300 mt-4 text-sm">—</span>
                <div className="flex-1">
                  <span className="text-xs text-gray-400 block mb-1">Máximo</span>
                  <input type="number" min={1} max={100} value={descontoMax}
                    onChange={e => { const v = Math.min(100, Math.max(+e.target.value, descontoMin + 1)); setDescontoMax(isNaN(v) ? 100 : v) }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 bg-gray-50 text-gray-700 focus:outline-none focus:border-red-400 focus:bg-white" />
                </div>
              </div>
            </div>

            {/* Ordenação */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ordenar por</p>
              <div className="flex flex-col gap-1.5">
                {[
                  { id: 'score', label: '⭐ Maior score' },
                  { id: 'desconto', label: '🔻 Maior desconto' },
                  { id: 'data', label: '📅 Mais recente' },
                  { id: 'preco', label: '💰 Menor preço' },
                ].map(s => (
                  <button key={s.id} onClick={() => setSortBy(s.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${sortBy === s.id ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Linha 2: Status · Plataforma */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 border-b">
            {/* Status */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</p>
              <div className="flex gap-1.5">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'pendentes', label: '⏳ Pendentes' },
                  { id: 'enviados', label: '✅ Enviados' },
                ].map(s => (
                  <button key={s.id} onClick={() => setStatusFiltro(s.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFiltro === s.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Plataforma */}
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Plataforma</p>
              <div className="flex gap-1.5">
                {PLATAFORMAS.map(p => (
                  <button key={p.id} onClick={() => setPlataformaFiltro(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${plataformaFiltro === p.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
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
              {nichosComProdutos.map(n => (
                <button key={n.id} onClick={() => setNichoFiltro(n.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${nichoFiltro === n.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {n.emoji} {n.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações de seleção */}
      <div className="flex items-center gap-3 mb-3">
        <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">
          {selecionados.size === produtos.length && produtos.length > 0 ? 'Desmarcar todos' : `Selecionar todos (${produtos.length})`}
        </button>
        <span className="text-gray-300">|</span>
        <button onClick={selectPendentes} className="text-xs text-blue-600 hover:underline">
          Selecionar pendentes ({produtos.filter(p => !produtosEnviados.has(p.id)).length})
        </button>
        {selecionados.size > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <button onClick={() => setSelecionados(new Set())} className="text-xs text-gray-500 hover:underline">
              Limpar seleção
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
            const jaEnviado = produtosEnviados.has(p.id)
            const selecionado = selecionados.has(p.id)
            const nichoInfo = nichos.find(n => n.id === p.nicho)
            const dataFormatada = new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

            return (
              <div
                key={p.id}
                onClick={() => toggleSelect(p.id)}
                className={`cursor-pointer rounded-xl border-2 transition-all ${
                  selecionado ? 'border-rose-400 bg-rose-50 shadow-md' :
                  jaEnviado ? 'border-green-200 bg-green-50/30 opacity-75' :
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
                      <span className="text-base font-bold text-green-700">{fmt(p.preco)}</span>
                      <span className="text-xs text-gray-400 line-through">{fmt(p.preco_original)}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs px-1.5 py-0">
                        -{p.desconto_percent}%
                      </Badge>
                      {p.frete_gratis && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs px-1.5 py-0">
                          Frete grátis
                        </Badge>
                      )}
                      {jaEnviado ? (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs px-1.5 py-0">
                          ✅ Enviado
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-xs px-1.5 py-0">
                          ⏳ Pendente
                        </Badge>
                      )}
                      <Badge className={`text-xs px-1.5 py-0 ${
                        (p.score || 0) >= 60 ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' :
                        (p.score || 0) >= 40 ? 'bg-blue-100 text-blue-700 hover:bg-blue-100' :
                        'bg-gray-100 text-gray-500 hover:bg-gray-100'
                      }`} title={p.score_detalhes ? Object.entries(p.score_detalhes).map(([k,v]) => `${k}:${v}`).join(' ') : ''}>
                        {(p.score || 0) >= 60 ? '🏆' : (p.score || 0) >= 40 ? '👍' : '📊'} {p.score || 0}pts
                      </Badge>
                      <Badge variant="outline" className={`text-xs px-1.5 py-0 ${platColors[p.plataforma] || 'text-gray-500'}`}>
                        {platIcons[p.plataforma] || p.plataforma} {nichoInfo?.emoji} {nichoInfo?.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">🕐 {dataFormatada}</p>
                  </div>
                </div>

                {/* Botões (clique sem propagar seleção) */}
                <div className="px-3 pb-2.5 flex gap-2" onClick={e => e.stopPropagation()}>
                  <a href={p.link_afiliado || p.link_original} target="_blank" rel="noopener noreferrer"
                    className="flex-1 text-center text-xs py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors">
                    🔗 Afiliado
                  </a>
                  <a href={p.link_original} target="_blank" rel="noopener noreferrer"
                    className="px-3 text-xs py-1.5 border text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                    Ver
                  </a>
                  <button onClick={e => abrirEditar(e, p)}
                    className="px-3 text-xs py-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar categoria">
                    ✏️
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
                  {platIcons[editando.plataforma] || editando.plataforma} ·{' '}
                  Categoria atual: <span className="text-rose-600 font-medium">
                    {nichos.find(n => n.id === editando.nicho)?.emoji} {nichos.find(n => n.id === editando.nicho)?.label || editando.nicho}
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
                <Button onClick={salvarNicho} disabled={salvandoEdit || nichoEdit === editando.nicho}
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

      {/* Barra flutuante de seleção */}
      {selecionados.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 z-50">
          <span className="text-sm font-medium">{selecionados.size} produto{selecionados.size > 1 ? 's' : ''} selecionado{selecionados.size > 1 ? 's' : ''}</span>
          <Button onClick={handleEnviar} disabled={enviando}
            className="bg-green-500 hover:bg-green-400 text-white text-sm h-8 px-4">
            {enviando ? '⏳' : '📤'} Marcar como enviado
          </Button>
          <button onClick={() => setSelecionados(new Set())} className="text-gray-400 hover:text-white text-sm">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
