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
  { id: '', label: 'Tudo', emoji: '💕' },
  { id: 'beleza', label: 'Beleza', emoji: '💄' },
  { id: 'moda', label: 'Moda', emoji: '👗' },
  { id: 'calcados', label: 'Calçados', emoji: '👠' },
  { id: 'casa_moveis', label: 'Casa & Decor', emoji: '🏡' },
  { id: 'saude', label: 'Bem-estar', emoji: '🧘' },
  { id: 'bebes', label: 'Bebês & Kids', emoji: '🍼' },
  { id: 'pet_shop', label: 'Pet Shop', emoji: '🐾' },
  { id: 'eletrodomesticos', label: 'Eletro', emoji: '🏠' },
  { id: 'eletronicos', label: 'Eletrônicos', emoji: '📱' },
]

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Demo1() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header com gradiente */}
      <header className="bg-gradient-to-r from-pink-400 via-rose-400 to-fuchsia-400 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <a href="/demo1" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">👜</span>
            <div className="hidden sm:block">
              <p className="font-bold text-white text-base leading-none tracking-wide">Compre sem Moderação</p>
              <p className="text-pink-100 text-xs">As melhores ofertas pra você</p>
            </div>
          </a>

          <div className="flex-1 max-w-xl mx-auto">
            <input type="text" placeholder="🔍  O que você procura?"
              className="w-full px-5 py-2.5 rounded-full text-sm bg-white/20 text-white placeholder-pink-100 border border-white/30 focus:outline-none focus:bg-white focus:text-gray-800 focus:placeholder-gray-400 transition-all shadow-inner" />
          </div>

          <div className="flex gap-1 shrink-0">
            {['Todos', '🛒 ML', '🧡 Shopee'].map(p => (
              <button key={p} className="px-3 py-1.5 rounded-full text-xs font-semibold text-white/80 hover:bg-white/20 transition-colors">
                {p}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* LAYOUT 1: Círculos estilo Instagram Stories */}
      <div className="bg-white/80 backdrop-blur border-b sticky top-[57px] z-30">
        <div className="max-w-7xl mx-auto px-4 overflow-x-auto">
          <div className="flex gap-5 py-4 min-w-max">
            {NICHOS.map(n => (
              <button key={n.id} className="flex flex-col items-center gap-1.5 group">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all shadow-md
                  ${n.id === ''
                    ? 'bg-gradient-to-br from-pink-400 to-fuchsia-400 ring-2 ring-pink-300 ring-offset-2'
                    : 'bg-gradient-to-br from-pink-50 to-rose-100 group-hover:from-pink-100 group-hover:to-rose-200 group-hover:shadow-lg'}`}>
                  {n.emoji}
                </div>
                <span className={`text-xs font-medium ${n.id === '' ? 'text-pink-600' : 'text-gray-500 group-hover:text-pink-500'}`}>
                  {n.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Banner */}
      <div className="max-w-7xl mx-auto px-4 py-5">
        <div className="bg-gradient-to-r from-pink-100 via-rose-50 to-fuchsia-100 rounded-3xl p-6 text-center shadow-sm">
          <p className="text-pink-600 font-bold text-lg">✨ Ofertas selecionadas especialmente pra você</p>
          <p className="text-pink-400 text-sm mt-1">Atualizado automaticamente · Melhores preços do Brasil</p>
        </div>
      </div>

      {/* Grid de produtos */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        <p className="text-sm text-gray-400 mb-4">
          <span className="font-semibold text-gray-600">{PRODUTOS_FAKE.length}</span> ofertas encontradas
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {PRODUTOS_FAKE.map(p => (
            <div key={p.id} className="bg-white rounded-3xl border border-pink-100 hover:border-pink-300 hover:shadow-xl transition-all group flex flex-col overflow-hidden">
              <div className="relative bg-gradient-to-b from-pink-50 to-white h-40 sm:h-48 flex items-center justify-center overflow-hidden">
                {p.thumbnail && (
                  <img src={p.thumbnail} alt={p.titulo} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-300" />
                )}
                <span className="absolute top-2 left-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                  -{p.desconto_percent}%
                </span>
                {p.frete_gratis && (
                  <span className="absolute top-2 right-2 bg-emerald-400 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    Frete grátis
                  </span>
                )}
              </div>
              <div className="flex flex-col flex-1 p-3.5">
                <p className="text-xs text-gray-700 font-medium line-clamp-2 leading-snug mb-3">{p.titulo}</p>
                <div className="mt-auto">
                  <p className="text-lg font-extrabold text-pink-600">{fmt(p.preco)}</p>
                  <p className="text-xs text-gray-400 line-through">{fmt(p.preco_original)}</p>
                </div>
              </div>
              <div className="px-3.5 pb-3.5">
                <div className="w-full py-2.5 bg-gradient-to-r from-pink-500 to-fuchsia-500 group-hover:from-pink-600 group-hover:to-fuchsia-600 text-white text-xs font-bold rounded-2xl text-center transition-all shadow-md">
                  Ver oferta ✨
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t bg-white/80 py-6 text-center text-xs text-gray-400">
        <p>👜 <strong>Compre sem Moderação</strong> — Ofertas atualizadas automaticamente</p>
        <p className="mt-1 text-pink-300">Layout 1: Círculos (estilo Stories)</p>
      </footer>
    </div>
  )
}
