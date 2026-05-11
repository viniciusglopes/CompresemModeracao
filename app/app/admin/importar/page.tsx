'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const NICHOS = [
  { id: 'eletronicos', label: 'Eletronicos' },
  { id: 'eletrodomesticos', label: 'Eletrodomesticos' },
  { id: 'informatica', label: 'Informatica' },
  { id: 'audio_video', label: 'Audio e Video' },
  { id: 'cameras', label: 'Cameras' },
  { id: 'games', label: 'Games' },
  { id: 'moda', label: 'Moda' },
  { id: 'calcados', label: 'Calcados' },
  { id: 'beleza', label: 'Beleza' },
  { id: 'casa_moveis', label: 'Casa e Moveis' },
  { id: 'ferramentas', label: 'Ferramentas' },
  { id: 'esportes', label: 'Esportes' },
  { id: 'bebes', label: 'Bebes' },
  { id: 'brinquedos', label: 'Brinquedos' },
  { id: 'veiculos_acess', label: 'Veiculos' },
  { id: 'livros', label: 'Livros' },
  { id: 'saude', label: 'Saude' },
  { id: 'alimentos', label: 'Alimentos' },
  { id: 'musica', label: 'Musica' },
  { id: 'pet_shop', label: 'Pet Shop' },
]

const PLATAFORMA_BADGE: Record<string, { label: string; color: string }> = {
  mercadolivre: { label: 'Mercado Livre', color: 'bg-yellow-100 text-yellow-800' },
  shopee: { label: 'Shopee', color: 'bg-rose-100 text-rose-800' },
  amazon: { label: 'Amazon', color: 'bg-yellow-100 text-yellow-900' },
  aliexpress: { label: 'AliExpress', color: 'bg-red-100 text-red-800' },
  awin: { label: 'AWIN', color: 'bg-blue-100 text-blue-800' },
  outro: { label: 'Outro', color: 'bg-gray-100 text-gray-700' },
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
  loja_nome?: string
}

interface AwinInfo {
  detectado: boolean
  loja?: string
  link_afiliado?: string
  link_curto?: string
}

interface ShopeeInfo {
  detectado: boolean
  link_afiliado?: string
}

export default function ImportarPage() {
  const [urlProduto, setUrlProduto] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [preview, setPreview] = useState<Produto | null>(null)
  const [awinInfo, setAwinInfo] = useState<AwinInfo | null>(null)
  const [shopeeInfo, setShopeeInfo] = useState<ShopeeInfo | null>(null)
  const [nicho, setNicho] = useState('')
  const [preco, setPreco] = useState('')
  const [precoOriginal, setPrecoOriginal] = useState('')
  const [thumbnailUrl, setThumbnailUrl] = useState('')
  const [tituloManual, setTituloManual] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [historico, setHistorico] = useState<{ titulo: string; plataforma: string; nicho: string }[]>([])

  const buscar = async () => {
    if (!urlProduto.trim()) return
    setBuscando(true)
    setErro('')
    setSucesso('')
    setPreview(null)
    setAwinInfo(null)
    setShopeeInfo(null)
    setThumbnailUrl('')
    setTituloManual('')
    try {
      const res = await fetch('/api/produtos/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlProduto.trim(), apenas_preview: true }),
      })
      const data = await res.json()
      if (data.error) { setErro(data.error); return }
      setPreview(data.preview)
      setAwinInfo(data.awin_info || null)
      setShopeeInfo(data.shopee_info || null)
      setNicho(data.preview.nicho)
      setPreco(data.preview.preco > 0 ? String(data.preview.preco) : '')
      setPrecoOriginal(data.preview.preco_original > 0 ? String(data.preview.preco_original) : '')
      if (data.preview.titulo) setTituloManual(data.preview.titulo)
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
      const titulo = tituloManual.trim() || preview.titulo
      const thumb = thumbnailUrl.trim() || undefined

      const res = await fetch('/api/produtos/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: urlProduto.trim(),
          nicho,
          preco: precoNum,
          preco_original: precoOrigNum,
          thumbnail: thumb,
          titulo: titulo !== preview.titulo ? titulo : undefined,
          apenas_preview: false,
        }),
      })
      const data = await res.json()
      if (data.error) { setErro(data.error); return }
      const tituloFinal = titulo || 'Produto'
      setSucesso(`"${tituloFinal.slice(0, 60)}..." publicado!`)
      setHistorico(h => [{ titulo: tituloFinal, plataforma: preview.plataforma, nicho }, ...h.slice(0, 9)])
      setPreview(null)
      setAwinInfo(null)
      setUrlProduto('')
      setNicho('')
      setPreco('')
      setPrecoOriginal('')
      setThumbnailUrl('')
      setTituloManual('')
    } catch (e: any) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  const badge = preview ? (PLATAFORMA_BADGE[preview.plataforma] || PLATAFORMA_BADGE.outro) : null
  const imagemFinal = thumbnailUrl.trim() || preview?.thumbnail || ''
  const tituloFinal = tituloManual.trim() || preview?.titulo || ''
  const precoNum = parseFloat(preco.replace(',', '.')) || 0
  const precoOrigNum = parseFloat(precoOriginal.replace(',', '.')) || precoNum
  const descontoCalc = precoOrigNum > precoNum && precoNum > 0
    ? Math.round(((precoOrigNum - precoNum) / precoOrigNum) * 100) : 0

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Importar Produto</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cole a URL do produto — lojas AWIN geram link de afiliado automaticamente.
        </p>
      </div>

      <Card className="mb-5">
        <CardContent className="pt-5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">URL do Produto</label>
            <textarea
              value={urlProduto}
              onChange={e => setUrlProduto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); buscar() } }}
              placeholder="Cole aqui a URL do produto (Nike, Adidas, C&A, Natura, ML, Shopee...)"
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-rose-400 bg-white resize-none"
            />
          </div>
          <Button
            onClick={buscar}
            disabled={buscando || !urlProduto.trim()}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white h-11 text-sm font-semibold">
            {buscando ? 'Buscando produto...' : 'Buscar Produto'}
          </Button>
        </CardContent>
      </Card>

      {erro && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {erro}
        </div>
      )}

      {sucesso && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-sm text-green-700">
          <p className="font-medium">Produto publicado!</p>
          <p className="text-xs mt-0.5 text-green-600">{sucesso}</p>
        </div>
      )}

      {preview && (
        <Card className="mb-5 border-2 border-rose-300">
          <CardContent className="pt-5">
            {/* AWIN detection banner */}
            {awinInfo?.detectado && (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-blue-500 text-white hover:bg-blue-500 text-xs">AWIN</Badge>
                  <span className="text-sm font-semibold text-blue-800">{awinInfo.loja}</span>
                </div>
                {awinInfo.link_curto && (
                  <p className="text-xs text-blue-600 truncate">
                    Link afiliado: <span className="font-mono">{awinInfo.link_curto}</span>
                  </p>
                )}
              </div>
            )}

            {/* Shopee detection banner */}
            {shopeeInfo?.detectado && (
              <div className="mb-4 p-3 rounded-lg bg-orange-50 border border-orange-200">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-orange-500 text-white hover:bg-orange-500 text-xs">SHOPEE</Badge>
                  <span className="text-sm font-semibold text-orange-800">Link de afiliado gerado</span>
                </div>
                {shopeeInfo.link_afiliado && (
                  <p className="text-xs text-orange-600 truncate">
                    Link afiliado: <span className="font-mono">{shopeeInfo.link_afiliado}</span>
                  </p>
                )}
              </div>
            )}

            <p className="text-xs font-semibold text-rose-600 uppercase mb-3">Pre-visualizacao</p>

            <div className="flex gap-4 mb-4">
              {imagemFinal ? (
                <img
                  src={imagemFinal}
                  alt=""
                  className="w-28 h-28 object-contain rounded-xl border bg-gray-50 shrink-0"
                />
              ) : (
                <div className="w-28 h-28 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 shrink-0 flex items-center justify-center text-xs text-gray-400 text-center px-2">
                  Sem imagem{'\n'}Cole abaixo
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                      {badge.label}
                    </span>
                  )}
                  {descontoCalc > 0 && (
                    <Badge className="bg-red-500 text-white hover:bg-red-500 text-xs">
                      -{descontoCalc}%
                    </Badge>
                  )}
                </div>
                {tituloFinal ? (
                  <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-3 mb-2">
                    {tituloFinal}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic mb-2">Titulo nao detectado — preencha abaixo</p>
                )}
                <div className="flex items-baseline gap-2">
                  {precoNum > 0 ? (
                    <>
                      <span className="text-lg font-bold text-rose-600">{fmt(precoNum)}</span>
                      {precoOrigNum > precoNum && (
                        <span className="text-sm text-gray-400 line-through">{fmt(precoOrigNum)}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-gray-400 italic">Preco nao detectado</span>
                  )}
                </div>
              </div>
            </div>

            {/* Campos de edicao */}
            <div className="border-t pt-3 mb-4 space-y-3">
              {/* Titulo — aparece editavel sempre */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Titulo {!tituloFinal && <span className="text-red-500">*obrigatorio</span>}
                </label>
                <input
                  type="text"
                  value={tituloManual}
                  onChange={e => setTituloManual(e.target.value)}
                  placeholder="Ex: Tenis Nike Court Legacy Lift Feminino - Branco"
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-rose-400 bg-white ${!tituloFinal ? 'border-red-300' : 'border-gray-200'}`}
                />
              </div>

              {/* Imagem URL */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  URL da Imagem {!imagemFinal && <span className="text-red-500">*cole a URL</span>}
                </label>
                <input
                  type="text"
                  value={thumbnailUrl}
                  onChange={e => setThumbnailUrl(e.target.value)}
                  placeholder="Clique com botao direito na foto do produto > Copiar endereco da imagem"
                  className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-rose-400 bg-white ${!imagemFinal ? 'border-red-300' : 'border-gray-200'}`}
                />
                {!imagemFinal && (
                  <p className="text-xs text-gray-400 mt-1">
                    Abra o produto no navegador, clique com o botao direito na foto e selecione "Copiar endereco da imagem"
                  </p>
                )}
              </div>

              {/* Precos e Categoria */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Preco atual (R$) {!preco && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={preco}
                    onChange={e => setPreco(e.target.value)}
                    placeholder="Ex: 408.49"
                    className={`w-full px-3 py-2 rounded-lg text-sm border focus:outline-none focus:border-rose-400 bg-white ${!preco ? 'border-red-300' : 'border-gray-200'}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Preco original (R$)</label>
                  <input
                    type="text"
                    value={precoOriginal}
                    onChange={e => setPrecoOriginal(e.target.value)}
                    placeholder="Ex: 649.99"
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
                disabled={salvando || !tituloFinal}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white h-11 font-semibold">
                {salvando ? 'Publicando...' : 'Publicar'}
              </Button>
              <Button onClick={() => { setPreview(null); setErro(''); setAwinInfo(null); setShopeeInfo(null) }} variant="outline" className="text-gray-500">
                X
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {historico.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Publicados nesta sessao</p>
          <div className="space-y-1.5">
            {historico.map((h, i) => (
              <div key={i} className="bg-white rounded-lg border px-3 py-2.5 flex items-center gap-3 text-sm">
                <span className="flex-1 truncate text-gray-700">{h.titulo}</span>
                <span className="text-xs text-gray-400 shrink-0">{NICHOS.find(n => n.id === h.nicho)?.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Card className="mt-8 bg-gray-50 border-dashed">
        <CardContent className="pt-4 pb-4">
          <p className="text-xs font-semibold text-gray-500 mb-2">API para automacao (N8N)</p>
          <div className="bg-gray-900 rounded-lg p-3 text-xs text-gray-300 font-mono whitespace-pre">{`POST /api/produtos/importar

{
  "url": "https://nike.com.br/produto...",
  "titulo": "Tenis Nike...",      // opcional
  "thumbnail": "https://img...",   // opcional
  "preco": 408.49,                 // opcional
  "preco_original": 649.99,        // opcional
  "nicho": "calcados",             // opcional
  "apenas_preview": false
}`}</div>
        </CardContent>
      </Card>
    </div>
  )
}
