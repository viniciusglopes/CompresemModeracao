'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const NICHOS = [
  { id: 'eletronicos', label: '📱 Eletrônicos' },
  { id: 'eletrodomesticos', label: '🏠 Eletrodomésticos' },
  { id: 'informatica', label: '💻 Informática' },
  { id: 'audio_video', label: '🎧 Áudio e Vídeo' },
  { id: 'cameras', label: '📷 Câmeras' },
  { id: 'games', label: '🎮 Games' },
  { id: 'moda', label: '👗 Moda' },
  { id: 'calcados', label: '👟 Calçados' },
  { id: 'beleza', label: '💄 Beleza' },
  { id: 'casa_moveis', label: '🛋️ Casa e Móveis' },
  { id: 'ferramentas', label: '🔧 Ferramentas' },
  { id: 'esportes', label: '⚽ Esportes' },
  { id: 'bebes', label: '🍼 Bebês' },
  { id: 'brinquedos', label: '🧸 Brinquedos' },
  { id: 'veiculos_acess', label: '🚗 Veículos' },
  { id: 'livros', label: '📚 Livros' },
  { id: 'saude', label: '💊 Saúde' },
  { id: 'alimentos', label: '🍎 Alimentos' },
  { id: 'musica', label: '🎸 Música' },
  { id: 'pet_shop', label: '🐾 Pet Shop' },
]

const PLATAFORMA_BADGE: Record<string, { label: string; color: string }> = {
  mercadolivre: { label: '🛒 Mercado Livre', color: 'bg-yellow-100 text-yellow-800' },
  shopee: { label: '🧡 Shopee', color: 'bg-rose-100 text-rose-800' },
  amazon: { label: '📦 Amazon', color: 'bg-yellow-100 text-yellow-900' },
  aliexpress: { label: '🔴 AliExpress', color: 'bg-red-100 text-red-800' },
  outro: { label: '🔗 Outro', color: 'bg-gray-100 text-gray-700' },
}

const fmt = (v: number) => v?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface Produto {
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
}

export default function ImportarPage() {
  const [linkAfiliado, setLinkAfiliado] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [preview, setPreview] = useState<Produto | null>(null)
  const [nicho, setNicho] = useState('')
  const [preco, setPreco] = useState('')
  const [precoOriginal, setPrecoOriginal] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [historico, setHistorico] = useState<{ titulo: string; plataforma: string; nicho: string }[]>([])

  const buscar = async () => {
    if (!linkAfiliado.trim()) return
    setBuscando(true)
    setErro('')
    setSucesso('')
    setPreview(null)
    try {
      const res = await fetch('/api/produtos/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // link_afiliado = url aqui: o mesmo link serve para buscar e para salvar como afiliado
        body: JSON.stringify({ url: linkAfiliado.trim(), link_afiliado: linkAfiliado.trim(), apenas_preview: true }),
      })
      const data = await res.json()
      if (data.error) { setErro(data.error); return }
      setPreview(data.preview)
      setNicho(data.preview.nicho)
      setPreco(data.preview.preco > 0 ? String(data.preview.preco) : '')
      setPrecoOriginal(data.preview.preco_original > 0 ? String(data.preview.preco_original) : '')
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setBuscando(false)
    }
  }

  const salvar = async () => {
    if (!preview) return
    setSalvando(true)
    setErro('')
    try {
      const precoNum = parseFloat(preco.replace(',', '.')) || 0
      const precoOrigNum = parseFloat(precoOriginal.replace(',', '.')) || precoNum
      const res = await fetch('/api/produtos/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkAfiliado.trim(), link_afiliado: linkAfiliado.trim(), nicho, preco: precoNum, preco_original: precoOrigNum, apenas_preview: false }),
      })
      const data = await res.json()
      if (data.error) { setErro(data.error); return }
      setSucesso(`"${preview.titulo.slice(0, 60)}..." publicado na página principal!`)
      setHistorico(h => [{ titulo: preview.titulo, plataforma: preview.plataforma, nicho }, ...h.slice(0, 9)])
      setPreview(null)
      setLinkAfiliado('')
      setNicho('')
      setPreco('')
      setPrecoOriginal('')
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const badge = preview ? (PLATAFORMA_BADGE[preview.plataforma] || PLATAFORMA_BADGE.outro) : null

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🔗 Cadastrar Oferta por Link</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cole o link de afiliado — o sistema busca a foto, título e preço e publica na página principal.
        </p>
      </div>

      {/* Campo único: link de afiliado */}
      <Card className="mb-5">
        <CardContent className="pt-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Link de Afiliado</label>
            <textarea
              value={linkAfiliado}
              onChange={e => setLinkAfiliado(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); buscar() } }}
              placeholder="Cole aqui o link de afiliado (Shopee, Amazon, AliExpress, ML...)"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-rose-400 bg-white resize-none"
            />
          </div>
          <Button
            onClick={buscar}
            disabled={buscando || !linkAfiliado.trim()}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white h-11 text-sm font-semibold">
            {buscando ? '⏳ Buscando produto...' : '🔍 Buscar e Pré-visualizar'}
          </Button>
        </CardContent>
      </Card>

      {/* Erro */}
      {erro && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          ❌ {erro}
        </div>
      )}

      {/* Sucesso */}
      {sucesso && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700 flex items-start gap-2">
          <span className="text-lg">✅</span>
          <div>
            <p className="font-medium">Produto publicado!</p>
            <p className="text-xs mt-0.5 text-green-600">{sucesso}</p>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <Card className="mb-5 border-2 border-rose-300">
          <CardContent className="pt-5">
            <p className="text-xs font-semibold text-rose-600 uppercase mb-3">Pré-visualização</p>

            <div className="flex gap-4 mb-4">
              {preview.thumbnail ? (
                <img
                  src={preview.thumbnail}
                  alt=""
                  className="w-28 h-28 object-contain rounded-xl border bg-gray-50 shrink-0"
                />
              ) : (
                <div className="w-28 h-28 rounded-xl border bg-gray-100 shrink-0 flex items-center justify-center text-3xl">
                  🖼️
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  )}
                  {preview.desconto_percent > 0 && (
                    <Badge className="bg-red-500 text-white hover:bg-red-500 text-xs">
                      -{preview.desconto_percent}%
                    </Badge>
                  )}
                </div>
                <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-3 mb-2">
                  {preview.titulo}
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-lg font-bold text-rose-600">{fmt(preview.preco)}</span>
                  {preview.preco_original > preview.preco && (
                    <span className="text-sm text-gray-400 line-through">{fmt(preview.preco_original)}</span>
                  )}
                </div>
                {preview.preco_original > preview.preco && (
                  <p className="text-xs text-green-600 mt-0.5">
                    Economia: {fmt(preview.preco_original - preview.preco)}
                  </p>
                )}
              </div>
            </div>

            {/* Preços + Categoria */}
            <div className="border-t pt-3 mb-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Preço atual (R$) {preco === '' && <span className="text-red-500">*preencha</span>}
                  </label>
                  <input
                    type="text"
                    value={preco}
                    onChange={e => setPreco(e.target.value)}
                    placeholder="Ex: 49.90"
                    className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-rose-400 bg-white ${preco === '' ? 'border-red-300' : 'border-gray-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Preço original (R$)</label>
                  <input
                    type="text"
                    value={precoOriginal}
                    onChange={e => setPrecoOriginal(e.target.value)}
                    placeholder="Ex: 89.90"
                    className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-rose-400 bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Categoria</label>
                <select
                  value={nicho}
                  onChange={e => setNicho(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-rose-400 bg-white">
                  {NICHOS.map(n => (
                    <option key={n.id} value={n.id}>{n.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={salvar}
                disabled={salvando}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white h-11 font-semibold">
                {salvando ? '⏳ Publicando...' : '🚀 Publicar na Página Principal'}
              </Button>
              <Button onClick={() => { setPreview(null); setErro('') }} variant="outline" className="text-gray-500">
                ✕
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico da sessão */}
      {historico.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Publicados nesta sessão</p>
          <div className="space-y-1.5">
            {historico.map((h, i) => (
              <div key={i} className="bg-white rounded-lg border px-3 py-2.5 flex items-center gap-3 text-sm">
                <span>{PLATAFORMA_BADGE[h.plataforma]?.label?.split(' ')[0] || '🔗'}</span>
                <span className="flex-1 truncate text-gray-700">{h.titulo}</span>
                <span className="text-xs text-gray-400 shrink-0">{NICHOS.find(n => n.id === h.nicho)?.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referência da API */}
      <Card className="mt-8 bg-gray-50 border-dashed">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">📡 API para automação (Coowork/N8N)</p>
          <div className="bg-gray-900 rounded-lg p-3 text-xs text-gray-300 font-mono whitespace-pre">{`POST /api/produtos/importar

{
  "url": "https://link-afiliado...",
  "preco": 49.90,           // opcional
  "preco_original": 89.90,  // opcional
  "nicho": "eletronicos",   // opcional
  "apenas_preview": false   // true = só preview, não salva
}`}</div>
        </CardContent>
      </Card>
    </div>
  )
}
