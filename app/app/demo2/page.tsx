'use client'

const PRODUTOS_FAKE = [
  { id: '1', titulo: 'Kit Skincare Completo Vitamina C + Ácido Hialurônico', preco: 49.90, preco_original: 129.90, desconto_percent: 62, plataforma: 'shopee', thumbnail: 'https://down-br.img.susercontent.com/file/sg-11134201-7rdwy-m0bmpovq3jv5c1', frete_gratis: true, nicho: 'beleza', created_at: new Date().toISOString() },
  { id: '2', titulo: 'Vestido Midi Floral Manga Longa Elegante', preco: 79.90, preco_original: 189.90, desconto_percent: 58, plataforma: 'mercadolivre', thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_693812-MLU78233577438_082024-F.webp', frete_gratis: true, nicho: 'moda', created_at: new Date().toISOString() },
  { id: '3', titulo: 'Air Fryer Digital 5L Philco com Painel Touch', preco: 299.90, preco_original: 549.90, desconto_percent: 45, plataforma: 'mercadolivre', thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_878094-MLU75434920498_042024-F.webp', frete_gratis: true, nicho: 'eletrodomesticos', created_at: new Date().toISOString() },
  { id: '4', titulo: 'Tênis Feminino Plataforma Chunky Branco', preco: 89.90, preco_original: 199.90, desconto_percent: 55, plataforma: 'shopee', thumbnail: 'https://down-br.img.susercontent.com/file/br-11134207-7r98o-lz6tmj0uvj2ge8', frete_gratis: false, nicho: 'calcados', created_at: new Date().toISOString() },
  { id: '5', titulo: 'Jogo de Lençol Queen 400 Fios Cetim Rosa', preco: 69.90, preco_original: 159.90, desconto_percent: 56, plataforma: 'shopee', thumbnail: 'https://down-br.img.susercontent.com/file/sg-11134201-7rdxt-m0r4x5v51u2y98', frete_gratis: true, nicho: 'casa_moveis', created_at: new Date().toISOString() },
  { id: '6', titulo: 'Bolsa Feminina Transversal Couro Ecológico', preco: 59.90, preco_original: 139.90, desconto_percent: 57, plataforma: 'mercadolivre', thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_795155-MLU75908024076_042024-F.webp', frete_gratis: true, nicho: 'moda', created_at: new Date().toISOString() },
]

const NICHOS = [
  { id: 'beleza', label: 'Beleza', emoji: '💄', gradient: 'from-pink-200 to-rose-300' },
  { id: 'moda', label: 'Moda', emoji: '👗', gradient: 'from-purple-200 to-violet-300' },
  { id: 'calcados', label: 'Calçados', emoji: '👠', gradient: 'from-amber-200 to-orange-300' },
  { id: 'casa_moveis', label: 'Casa & Decor', emoji: '🏡', gradient: 'from-emerald-200 to-teal-300' },
  { id: 'saude', label: 'Bem-estar', emoji: '🧘', gradient: 'from-cyan-200 to-sky-300' },
  { id: 'bebes', label: 'Bebês & Kids', emoji: '🍼', gradient: 'from-yellow-200 to-amber-300' },
  { id: 'pet_shop', label: 'Pet Shop', emoji: '🐾', gradient: 'from-orange-200 to-red-300' },
  { id: 'eletrodomesticos', label: 'Eletro', emoji: '🏠', gradient: 'from-blue-200 to-indigo-300' },
]

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Demo2() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-pink-50 to-white">
      {/* Header glassmorphism */}
      <header className="bg-white/70 backdrop-blur-lg sticky top-0 z-40 shadow-sm border-b border-pink-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/demo2" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">👜</span>
            <div className="hidden sm:block">
              <p className="font-bold bg-gradient-to-r from-pink-500 to-fuchsia-500 bg-clip-text text-transparent text-base leading-none">Compre sem Moderação</p>
              <p className="text-pink-300 text-xs">As melhores ofertas pra você</p>
            </div>
          </a>

          <div className="flex-1 max-w-xl mx-auto">
            <input type="text" placeholder="🔍  O que você procura?"
              className="w-full px-5 py-2.5 rounded-2xl text-sm bg-pink-50 text-gray-700 placeholder-pink-300 border border-pink-200 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:bg-white transition-all" />
          </div>

          <div className="flex gap-1 shrink-0">
            {['Todos', '🛒 ML', '🧡 Shopee'].map(p => (
              <button key={p} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-pink-500 hover:bg-pink-50 transition-colors">
                {p}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* LAYOUT 2: Cards coloridos estilo Shein/Shopee */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Categorias</p>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {NICHOS.map(n => (
            <button key={n.id} className="group">
              <div className={`bg-gradient-to-br ${n.gradient} rounded-2xl p-3 flex flex-col items-center gap-1.5 hover:shadow-lg hover:scale-105 transition-all duration-200`}>
                <span className="text-3xl drop-shadow-sm">{n.emoji}</span>
                <span className="text-xs font-semibold text-gray-700 text-center leading-tight">{n.label}</span>
              </div>
            </button>
          ))}
        </div>
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

      {/* Grid de produtos */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-400">
            <span className="font-semibold text-gray-600">{PRODUTOS_FAKE.length}</span> ofertas
          </p>
          <span className="text-xs text-pink-400">🔄 atualiza a cada 60s</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {PRODUTOS_FAKE.map(p => (
            <div key={p.id} className="bg-white rounded-3xl hover:shadow-2xl transition-all group flex flex-col overflow-hidden shadow-sm border border-gray-100">
              <div className="relative bg-gray-50 h-40 sm:h-48 flex items-center justify-center overflow-hidden">
                {p.thumbnail && (
                  <img src={p.thumbnail} alt={p.titulo} className="w-full h-full object-contain p-3 group-hover:scale-110 transition-transform duration-500" />
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
      </main>

      <footer className="border-t bg-white py-6 text-center text-xs text-gray-400">
        <p>👜 <strong>Compre sem Moderação</strong> — Ofertas atualizadas automaticamente</p>
        <p className="mt-1 text-pink-300">Layout 2: Cards Coloridos (estilo Shein)</p>
      </footer>
    </div>
  )
}
