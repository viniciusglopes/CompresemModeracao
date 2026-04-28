'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

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
  created_at: string
}

const NICHOS_GRID = [
  { id: 'beleza', label: 'Beleza', emoji: '💄', gradient: 'from-pink-200 to-rose-300' },
  { id: 'moda', label: 'Moda', emoji: '👗', gradient: 'from-purple-200 to-violet-300' },
  { id: 'calcados', label: 'Calçados', emoji: '👠', gradient: 'from-amber-200 to-orange-300' },
  { id: 'casa_moveis', label: 'Casa & Decor', emoji: '🏡', gradient: 'from-emerald-200 to-teal-300' },
  { id: 'saude', label: 'Bem-estar', emoji: '🧘', gradient: 'from-cyan-200 to-sky-300' },
  { id: 'bebes', label: 'Bebês & Kids', emoji: '🍼', gradient: 'from-yellow-200 to-amber-300' },
  { id: 'pet_shop', label: 'Pet Shop', emoji: '🐾', gradient: 'from-orange-200 to-red-300' },
  { id: 'eletrodomesticos', label: 'Eletro', emoji: '🏠', gradient: 'from-blue-200 to-indigo-300' },
]

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const LIMIT = 60
const MAX_FEED = 120
const REFRESH_MS = 60000

function setFaviconBadge(count: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Desenha emoji 👜 como base
  ctx.font = '22px serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('👜', 16, 16)

  // Badge vermelho no canto superior direito
  const label = count > 99 ? '99+' : String(count)
  const r = label.length > 1 ? 10 : 8
  const bx = 32 - r
  const by = r

  ctx.beginPath()
  ctx.arc(bx, by, r, 0, 2 * Math.PI)
  ctx.fillStyle = '#ef4444'
  ctx.fill()

  ctx.font = `bold ${label.length > 1 ? 9 : 11}px sans-serif`
  ctx.fillStyle = 'white'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, bx, by)

  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.href = canvas.toDataURL('image/png')
}

function clearFaviconBadge() {
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']")
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  // Volta ao favicon original
  link.href = '/favicon.ico'
}

export default function HomePage() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nichoAtivo, setNichoAtivo] = useState('')
  const [plataforma, setPlataforma] = useState('')
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [busca, setBusca] = useState('')
  const [novasOfertas, setNovasOfertas] = useState(0)
  const [produtoModal, setProdutoModal] = useState<Produto | null>(null)
  const [copiado, setCopiado] = useState(false)
  const latestCreatedAt = useRef<string | null>(null)
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchProdutos = async (nicho: string, plat: string, off: number, after?: string) => {
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) })
    if (nicho) params.set('nicho', nicho)
    if (plat) params.set('plataforma', plat)
    if (after) params.set('after', after)
    const res = await fetch(`/api/public/produtos?${params}`)
    const data = await res.json()
    return (data.produtos || []) as Produto[]
  }

  const load = useCallback(async () => {
    setLoading(true)
    const novos = await fetchProdutos(nichoAtivo, plataforma, 0)
    setProdutos(novos)
    setOffset(novos.length)
    setHasMore(novos.length === LIMIT)
    latestCreatedAt.current = novos[0]?.created_at ?? null
    setNovasOfertas(0)
    setLoading(false)
  }, [nichoAtivo, plataforma])

  useEffect(() => { load() }, [load])

  // Auto-refresh: busca apenas produtos mais novos que o mais recente no feed
  useEffect(() => {
    if (refreshRef.current) clearInterval(refreshRef.current)
    refreshRef.current = setInterval(async () => {
      if (!latestCreatedAt.current) return
      const recentes = await fetchProdutos(nichoAtivo, plataforma, 0, latestCreatedAt.current)
      if (recentes.length === 0) return
      setProdutos(prev => {
        const idsExistentes = new Set(prev.map(p => p.id))
        const reais = recentes.filter(p => !idsExistentes.has(p.id))
        if (reais.length === 0) return prev
        setNovasOfertas(n => n + reais.length)
        const merged = [...reais, ...prev].slice(0, MAX_FEED)
        latestCreatedAt.current = merged[0]?.created_at ?? latestCreatedAt.current
        return merged
      })
    }, REFRESH_MS)
    return () => { if (refreshRef.current) clearInterval(refreshRef.current) }
  }, [nichoAtivo, plataforma])

  const loadMore = async () => {
    setLoadingMore(true)
    const novos = await fetchProdutos(nichoAtivo, plataforma, offset)
    setProdutos(prev => [...prev, ...novos])
    setOffset(prev => prev + novos.length)
    setHasMore(novos.length === LIMIT)
    setLoadingMore(false)
  }

  // Atualiza título e favicon com badge de novas ofertas
  useEffect(() => {
    const base = 'Compre sem Moderação'
    if (novasOfertas > 0) {
      document.title = `(${novasOfertas}) ${base}`
      setFaviconBadge(novasOfertas)
    } else {
      document.title = base
      clearFaviconBadge()
    }
  }, [novasOfertas])

  const copiarLink = (link: string) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    })
  }

  const produtosFiltrados = busca
    ? produtos.filter(p => p.titulo.toLowerCase().includes(busca.toLowerCase()))
    : produtos

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-white">
      {/* Header glassmorphism */}
      <header className="bg-white/70 backdrop-blur-lg sticky top-0 z-40 shadow-sm border-b border-pink-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">👜</span>
            <div className="hidden sm:block">
              <p className="font-bold bg-gradient-to-r from-pink-500 to-fuchsia-500 bg-clip-text text-transparent text-base leading-none">Compre sem Moderação</p>
              <p className="text-pink-300 text-xs">As melhores ofertas pra você</p>
            </div>
          </a>

          <div className="flex-1 max-w-xl mx-auto">
            <input
              type="text"
              placeholder="🔍  O que você procura?"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-full px-5 py-2.5 rounded-2xl text-sm bg-pink-50 text-gray-700 placeholder-pink-300 border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:bg-white transition-all"
            />
          </div>

          <div className="flex gap-1 shrink-0">
            {[
              { id: '', label: 'Todos' },
              { id: 'mercadolivre', label: '🛒 ML' },
              { id: 'shopee', label: '🧡 Shopee' },
            ].map(p => (
              <button key={p.id} onClick={() => setPlataforma(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${plataforma === p.id ? 'bg-pink-500 text-white' : 'text-pink-500 hover:bg-pink-50'}`}>
                {p.label}
              </button>
            ))}
          </div>

          <a href="/admin" className="text-pink-300 hover:text-pink-500 text-xs shrink-0 transition-colors">
            Admin
          </a>
        </div>
      </header>

      {/* Categorias em grid colorido */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Categorias</p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {NICHOS_GRID.map(n => (
            <button key={n.id} onClick={() => setNichoAtivo(nichoAtivo === n.id ? '' : n.id)} className="group">
              <div className={`bg-gradient-to-br ${n.gradient} rounded-2xl p-3 flex flex-col items-center gap-1.5 hover:shadow-lg hover:scale-105 transition-all duration-200 ${nichoAtivo === n.id ? 'ring-2 ring-pink-500 ring-offset-2 shadow-lg scale-105' : ''}`}>
                <span className="text-3xl drop-shadow-sm">{n.emoji}</span>
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{n.label}</span>
              </div>
            </button>
          ))}
        </div>
        {nichoAtivo && (
          <button onClick={() => setNichoAtivo('')} className="mt-3 text-xs text-pink-500 hover:text-pink-600 font-medium">
            ✕ Limpar filtro: {NICHOS_GRID.find(n => n.id === nichoAtivo)?.emoji} {NICHOS_GRID.find(n => n.id === nichoAtivo)?.label}
          </button>
        )}
      </div>

      {/* Banner destaque */}
      <div className="max-w-7xl mx-auto px-4 pb-4">
        <div className="bg-gradient-to-r from-pink-400 via-rose-400 to-fuchsia-400 rounded-3xl p-6 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-white font-extrabold text-xl">Até 70% OFF 🔥</p>
            <p className="text-pink-100 text-sm mt-1">Ofertas selecionadas especialmente pra você</p>
          </div>
          <span className="text-5xl">🛍️</span>
        </div>
      </div>

      {/* Toast de novas ofertas */}
      {novasOfertas > 0 && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setNovasOfertas(0) }}
            className="bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-full shadow-xl text-sm font-bold flex items-center gap-2 transition-colors">
            ⬆ {novasOfertas} nova{novasOfertas > 1 ? 's oferta chegou!' : ' oferta chegou!'}
          </button>
        </div>
      )}

      {/* Grid de produtos */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-400">
            <span className="font-semibold text-gray-600">{produtosFiltrados.length}</span> ofertas
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs text-pink-400">🔄 atualiza a cada 60s</span>
            <button onClick={() => { load(); setNovasOfertas(0) }} className="text-xs text-pink-500 hover:text-pink-600 font-medium">
              Atualizar agora
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border animate-pulse h-72" />
            ))}
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-3">😕</p>
            <p className="text-gray-500 font-medium">Nenhuma oferta encontrada</p>
            <p className="text-gray-400 text-sm mt-1">Tente outra categoria ou aguarde as próximas buscas automáticas.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {produtosFiltrados.map(p => (
                <div key={p.id} onClick={() => setProdutoModal(p)}
                  className="cursor-pointer bg-white rounded-3xl hover:shadow-2xl transition-all group flex flex-col overflow-hidden shadow-sm border border-gray-100">
                  <div className="relative bg-gray-50 h-40 sm:h-48 flex items-center justify-center overflow-hidden">
                    {p.thumbnail ? (
                      <img src={p.thumbnail} alt={p.titulo}
                        className="w-full h-full object-contain p-3 group-hover:scale-110 transition-transform duration-500" />
                    ) : (
                      <span className="text-4xl opacity-20">👜</span>
                    )}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg shadow">
                        -{p.desconto_percent}%
                      </span>
                    </div>
                    {p.frete_gratis && (
                      <span className="absolute bottom-2 left-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg">
                        FRETE GRÁTIS
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col flex-1 p-3.5">
                    <p className="text-xs text-gray-600 line-clamp-2 leading-snug mb-3">{p.titulo}</p>
                    <div className="mt-auto">
                      <p className="text-xs text-gray-400 line-through">{fmt(p.preco_original)}</p>
                      <p className="text-xl font-black text-gray-900">{fmt(p.preco)}</p>
                      <p className="text-xs text-emerald-500 font-semibold mt-0.5">
                        Economize {fmt(p.preco_original - p.preco)}
                      </p>
                    </div>
                  </div>
                  <div className="px-3.5 pb-3.5">
                    <div className="w-full py-2.5 bg-gray-900 group-hover:bg-pink-500 text-white text-xs font-bold rounded-xl text-center transition-colors">
                      COMPRAR →
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && !busca && (
              <div className="text-center mt-8">
                <button onClick={loadMore} disabled={loadingMore}
                  className="px-8 py-3 bg-white border-2 border-pink-400 text-pink-500 font-semibold rounded-xl hover:bg-pink-50 transition-colors text-sm disabled:opacity-50">
                  {loadingMore ? '⏳ Carregando...' : 'Carregar mais ofertas'}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal de produto */}
      {produtoModal && (() => {
        const p = produtoModal
        const link = p.link_afiliado || p.link_original
        const economia = p.preco_original - p.preco
        const msgTelegram = encodeURIComponent(`🔥 ${p.titulo}\n💰 ${fmt(p.preco)} (era ${fmt(p.preco_original)}) — ${p.desconto_percent}% OFF\n🔗 ${link}`)
        const msgWhatsapp = encodeURIComponent(`🔥 *${p.titulo}*\n💰 ${fmt(p.preco)} (era ${fmt(p.preco_original)}) — *${p.desconto_percent}% OFF*\n🔗 ${link}`)
        const plataformaLabel = p.plataforma === 'shopee' ? '🧡 Shopee' : p.plataforma === 'amazon' ? '📦 Amazon' : p.plataforma === 'aliexpress' ? '🔴 AliExpress' : '🛒 Mercado Livre'
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setProdutoModal(null)}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b px-5 py-3">
                <div className="flex gap-1">
                  <button onClick={() => copiarLink(link)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                    {copiado ? '✅ Copiado!' : '🔗 Copiar link'}
                  </button>
                  <a href={`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${msgTelegram}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-500 hover:bg-blue-50 transition-colors">
                    ✈️ Telegram
                  </a>
                  <a href={`https://wa.me/?text=${msgWhatsapp}`} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-green-600 hover:bg-green-50 transition-colors">
                    💬 WhatsApp
                  </a>
                </div>
                <button onClick={() => setProdutoModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold transition-colors">
                  ✕
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-6 p-6">
                <div className="sm:w-56 shrink-0 bg-gray-50 rounded-2xl flex items-center justify-center h-52 overflow-hidden">
                  {p.thumbnail ? (
                    <img src={p.thumbnail} alt={p.titulo} className="w-full h-full object-contain p-4" />
                  ) : (
                    <span className="text-5xl opacity-20">👜</span>
                  )}
                </div>

                <div className="flex-1">
                  <p className="text-xs font-semibold text-pink-500 mb-1">{plataformaLabel}</p>
                  <h2 className="text-base font-bold text-gray-900 leading-snug mb-4">{p.titulo}</h2>

                  <div className="flex items-end gap-3 mb-1">
                    <span className="text-3xl font-extrabold text-gray-900">{fmt(p.preco)}</span>
                    <span className="text-sm text-gray-400 line-through mb-1">{fmt(p.preco_original)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <span className="bg-red-500 text-white text-sm font-bold px-2.5 py-0.5 rounded-full">-{p.desconto_percent}%</span>
                    <span className="text-sm text-emerald-600 font-medium">Economize {fmt(economia)}</span>
                    {p.frete_gratis && <span className="text-sm text-emerald-600 font-medium">🚚 Frete grátis</span>}
                  </div>

                  <a href={link} target="_blank" rel="noopener noreferrer"
                    className="block w-full py-3.5 bg-gray-900 hover:bg-pink-500 text-white font-extrabold text-base rounded-2xl text-center transition-colors shadow-md mb-3">
                    COMPRAR AGORA →
                  </a>

                  <p className="text-xs text-gray-400 text-center">
                    Publicado {timeAgo(p.created_at)} · Preços e disponibilidade sujeitos a alteração
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      <footer className="border-t bg-white py-6 text-center text-xs text-gray-400">
        <p>👜 <strong>Compre sem Moderação</strong> — Ofertas atualizadas automaticamente</p>
        <p className="mt-1">Os links desta página são de programas de afiliados.</p>
      </footer>
    </div>
  )
}
