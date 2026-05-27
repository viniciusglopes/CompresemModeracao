'use client'

import { useState } from 'react'

const PLATAFORMA_INFO: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
  mercadolivre: { label: 'Mercado Livre', emoji: '🛒', bg: 'bg-yellow-50', text: 'text-yellow-800' },
  shopee: { label: 'Shopee', emoji: '🧡', bg: 'bg-orange-50', text: 'text-orange-800' },
  amazon: { label: 'Amazon', emoji: '📦', bg: 'bg-amber-50', text: 'text-amber-800' },
  aliexpress: { label: 'AliExpress', emoji: '🔴', bg: 'bg-red-50', text: 'text-red-800' },
  awin: { label: 'Loja Parceira', emoji: '🏪', bg: 'bg-blue-50', text: 'text-blue-800' },
  lomadee: { label: 'Loja Parceira', emoji: '🏬', bg: 'bg-purple-50', text: 'text-purple-800' },
  outro: { label: 'Outro', emoji: '🔗', bg: 'bg-gray-50', text: 'text-gray-700' },
}

const fmt = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function GerarLinkPage() {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultado, setResultado] = useState<any>(null)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)

  const gerar = async () => {
    if (!url.trim()) return
    setLoading(true)
    setErro('')
    setResultado(null)
    setCopiado(false)
    try {
      const res = await fetch('/api/produtos/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), apenas_preview: true }),
      })
      const data = await res.json()
      if (data.error) {
        setErro(data.error)
        return
      }
      setResultado(data)
    } catch (e: any) {
      setErro(e.message || 'Erro ao gerar link')
    } finally {
      setLoading(false)
    }
  }

  const copiar = async (texto: string) => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      const input = document.createElement('textarea')
      input.value = texto
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  const preview = resultado?.preview
  const plat = preview ? (PLATAFORMA_INFO[preview.plataforma] || PLATAFORMA_INFO.outro) : null
  const linkFinal = preview?.link_afiliado || resultado?.awin_info?.link_curto || resultado?.awin_info?.link_afiliado || resultado?.shopee_info?.link_afiliado || ''
  const desconto = preview?.desconto_percent || 0
  const lojaNome = resultado?.awin_info?.loja || preview?.loja_nome || ''

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-pink-50 flex items-start justify-center px-4 py-8 md:py-16">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Gerar Link de Afiliado</h1>
          <p className="text-gray-500 text-sm">Cole a URL de qualquer produto e receba seu link de afiliado</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">URL do produto</label>
          <textarea
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); gerar() } }}
            placeholder="Ex: https://www.mercadolivre.com.br/produto... ou https://nike.com.br/..."
            rows={3}
            className="w-full px-4 py-3 rounded-xl text-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 bg-gray-50 resize-none transition"
          />
          <button
            onClick={gerar}
            disabled={loading || !url.trim()}
            className="w-full mt-3 h-12 rounded-xl text-sm font-semibold text-white bg-rose-500 hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Gerando...
              </>
            ) : 'Gerar Link'}
          </button>
        </div>

        {erro && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {erro}
          </div>
        )}

        {preview && linkFinal && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-6">
            <div className="p-6">
              {plat && (
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${plat.bg} ${plat.text}`}>
                    {plat.emoji} {lojaNome || plat.label}
                  </span>
                  {desconto > 0 && (
                    <span className="text-xs px-3 py-1 rounded-full font-medium bg-red-100 text-red-700">
                      -{desconto}% OFF
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-4 mb-5">
                {preview.thumbnail && (
                  <img
                    src={preview.thumbnail}
                    alt=""
                    className="w-24 h-24 object-contain rounded-xl border bg-gray-50 shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-3 mb-2">
                    {preview.titulo || 'Produto'}
                  </p>
                  {preview.preco > 0 && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-bold text-rose-600">{fmt(preview.preco)}</span>
                      {preview.preco_original > preview.preco && (
                        <span className="text-sm text-gray-400 line-through">{fmt(preview.preco_original)}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Seu link de afiliado
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={linkFinal}
                    className="flex-1 px-3 py-2.5 rounded-lg text-sm border border-gray-200 bg-gray-50 text-gray-700 font-mono truncate"
                  />
                  <button
                    onClick={() => copiar(linkFinal)}
                    className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition shrink-0 ${
                      copiado
                        ? 'bg-green-500 text-white'
                        : 'bg-rose-500 hover:bg-rose-600 text-white'
                    }`}
                  >
                    {copiado ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {preview && !linkFinal && (
          <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800">
            Produto encontrado, mas nao foi possivel gerar o link de afiliado para esta plataforma.
            Verifique se as credenciais estao configuradas.
          </div>
        )}

        <div className="bg-white/60 rounded-2xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Plataformas suportadas</p>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
            <div className="flex items-center gap-2">🛒 Mercado Livre</div>
            <div className="flex items-center gap-2">🧡 Shopee</div>
            <div className="flex items-center gap-2">📦 Amazon</div>
            <div className="flex items-center gap-2">👟 Nike</div>
            <div className="flex items-center gap-2">👗 C&A</div>
            <div className="flex items-center gap-2">💎 Vivara</div>
            <div className="flex items-center gap-2">🏃 Adidas</div>
            <div className="flex items-center gap-2">🏪 Renner</div>
            <div className="flex items-center gap-2">💄 Natura</div>
            <div className="flex items-center gap-2">🌸 O Boticario</div>
            <div className="flex items-center gap-2">👔 Calvin Klein</div>
            <div className="flex items-center gap-2">🐊 Lacoste</div>
          </div>
          <p className="text-xs text-gray-400 mt-3">E mais lojas parceiras AWIN e Lomadee</p>
        </div>
      </div>
    </div>
  )
}
