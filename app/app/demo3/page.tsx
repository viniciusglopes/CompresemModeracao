'use client'

import { useState } from 'react'

const PRODUTOS_FAKE = [
  { id: '1', titulo: 'Kit Skincare Completo Vitamina C + Ácido Hialurônico', preco: 49.90, preco_original: 129.90, desconto_percent: 62, plataforma: 'shopee', thumbnail: 'https://down-br.img.susercontent.com/file/sg-11134201-7rdwy-m0bmpovq3jv5c1', frete_gratis: true, nicho: 'beleza', created_at: new Date().toISOString() },
  { id: '2', titulo: 'Vestido Midi Floral Manga Longa Elegante', preco: 79.90, preco_original: 189.90, desconto_percent: 58, plataforma: 'mercadolivre', thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_693812-MLU78233577438_082024-F.webp', frete_gratis: true, nicho: 'moda', created_at: new Date().toISOString() },
  { id: '3', titulo: 'Air Fryer Digital 5L Philco com Painel Touch', preco: 299.90, preco_original: 549.90, desconto_percent: 45, plataforma: 'mercadolivre', thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_878094-MLU75434920498_042024-F.webp', frete_gratis: true, nicho: 'eletrodomesticos', created_at: new Date().toISOString() },
  { id: '4', titulo: 'Tênis Feminino Plataforma Chunky Branco', preco: 89.90, preco_original: 199.90, desconto_percent: 55, plataforma: 'shopee', thumbnail: 'https://down-br.img.susercontent.com/file/br-11134207-7r98o-lz6tmj0uvj2ge8', frete_gratis: false, nicho: 'calcados', created_at: new Date().toISOString() },
  { id: '5', titulo: 'Jogo de Lençol Queen 400 Fios Cetim Rosa', preco: 69.90, preco_original: 159.90, desconto_percent: 56, plataforma: 'shopee', thumbnail: 'https://down-br.img.susercontent.com/file/sg-11134201-7rdxt-m0r4x5v51u2y98', frete_gratis: true, nicho: 'casa_moveis', created_at: new Date().toISOString() },
  { id: '6', titulo: 'Bolsa Feminina Transversal Couro Ecológico', preco: 59.90, preco_original: 139.90, desconto_percent: 57, plataforma: 'mercadolivre', thumbnail: 'https://http2.mlstatic.com/D_NQ_NP_2X_795155-MLU75908024076_042024-F.webp', frete_gratis: true, nicho: 'moda', created_at: new Date().toISOString() },
]

const NICHOS = [
  { id: '', label: '✨ Tudo' },
  { id: 'beleza', label: '💄 Beleza' },
  { id: 'moda', label: '👗 Moda' },
  { id: 'calcados', label: '👠 Calçados' },
  { id: 'casa_moveis', label: '🏡 Casa & Decor' },
  { id: 'saude', label: '🧘 Bem-estar' },
  { id: 'bebes', label: '🍼 Bebês' },
  { id: 'pet_shop', label: '🐾 Pet' },
  { id: 'eletrodomesticos', label: '🏠 Eletro' },
  { id: 'eletronicos', label: '📱 Tech' },
]

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function Demo3() {
  const [ativo, setAtivo] = useState('')

  return (
    <div className="min-h-screen bg-[#fdf2f8]">
      {/* Header minimalista */}
      <header className="bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-4">
          <a href="/demo3" className="flex items-center gap-2 shrink-0">
            <span className="text-2xl">👜</span>
            <div className="hidden sm:block">
              <p className="text-lg font-black tracking-tight bg-gradient-to-r from-pink-500 via-rose-500 to-violet-500 bg-clip-text text-transparent">
                compre sem moderação
              </p>
            </div>
          </a>

          <div className="flex-1 max-w-xl mx-auto">
            <input type="text" placeholder="Buscar ofertas..."
              className="w-full px-5 py-2.5 rounded-full text-sm bg-pink-50/80 text-gray-700 placeholder-pink-300 border-0 focus:outline-none focus:ring-2 focus:ring-pink-200 transition-all" />
          </div>

          <div className="flex gap-2 shrink-0">
            {['🛒', '🧡'].map(p => (
              <button key={p} className="w-9 h-9 rounded-full bg-pink-50 hover:bg-pink-100 flex items-center justify-center text-sm transition-colors">
                {p}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* LAYOUT 3: Pills flutuantes estilo Pinterest */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-wrap gap-2">
          {NICHOS.map(n => (
            <button key={n.id} onClick={() => setAtivo(n.id)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md
                ${ativo === n.id
                  ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-pink-200 shadow-md scale-105'
                  : 'bg-white text-gray-600 hover:text-pink-500 hover:bg-pink-50 border border-pink-100'}`}>
              {n.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de produtos - layout Pinterest/masonry feel */}
      <main className="max-w-7xl mx-auto px-4 pb-8">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-gray-800">Destaques de hoje</h2>
            <p className="text-xs text-pink-400 mt-0.5">Selecionadas com carinho pra você 💕</p>
          </div>
          <span className="text-xs text-gray-400">🔄 a cada 60s</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {PRODUTOS_FAKE.map((p, i) => (
            <div key={p.id} className={`bg-white rounded-[20px] hover:shadow-xl transition-all duration-300 group flex flex-col overflow-hidden
              ${i === 0 ? 'sm:row-span-1' : ''}`}>
              <div className="relative h-44 sm:h-52 flex items-center justify-center overflow-hidden bg-gradient-to-b from-gray-50 to-white">
                {p.thumbnail && (
                  <img src={p.thumbnail} alt={p.titulo} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500" />
                )}
                <div className="absolute top-0 left-0 right-0 p-2.5 flex justify-between items-start">
                  <span className="bg-black/80 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                    -{p.desconto_percent}%
                  </span>
                  {p.frete_gratis && (
                    <span className="bg-white/90 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded-full backdrop-blur-sm border border-emerald-200">
                      🚚 Grátis
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3.5 flex flex-col flex-1">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${p.plataforma === 'shopee' ? 'bg-orange-400' : 'bg-yellow-400'}`} />
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">
                    {p.plataforma === 'shopee' ? 'Shopee' : 'Mercado Livre'}
                  </span>
                </div>

                <p className="text-sm text-gray-800 font-medium line-clamp-2 leading-snug mb-3">{p.titulo}</p>

                <div className="mt-auto space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-pink-600">{fmt(p.preco)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 line-through">{fmt(p.preco_original)}</span>
                    <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">
                      -{fmt(p.preco_original - p.preco)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-3.5 pb-3.5">
                <div className="w-full py-2.5 bg-gradient-to-r from-pink-500 via-rose-500 to-violet-500 text-white text-xs font-bold rounded-2xl text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  Ver oferta →
                </div>
                <div className="w-full py-2.5 text-pink-500 text-xs font-semibold text-center group-hover:hidden">
                  Toque para ver →
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-pink-100 bg-white/80 py-6 text-center text-xs text-gray-400">
        <p>👜 <strong className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">compre sem moderação</strong> — ofertas atualizadas automaticamente</p>
        <p className="mt-1 text-pink-300">Layout 3: Pills Flutuantes (estilo Pinterest)</p>
      </footer>
    </div>
  )
}
