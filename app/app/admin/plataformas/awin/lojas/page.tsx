'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface AwinLoja {
  id: number
  merchant_id: string
  nome: string
  url: string
  categorias: string[]
  ativo: boolean
}

const CATEGORIA_LABELS: Record<string, string> = {
  eletronicos: 'Eletrônicos',
  eletrodomesticos: 'Eletrodomésticos',
  informatica: 'Informática',
  moda: 'Moda',
  moda_masc: 'Moda Masc.',
  beleza: 'Beleza',
  calcados: 'Calçados',
  esportes: 'Esportes',
  casa: 'Casa',
  saude: 'Saúde',
  brinquedos: 'Brinquedos',
  alimentos: 'Alimentos',
}

const CATEGORIA_COLORS: Record<string, string> = {
  eletronicos: 'bg-blue-100 text-blue-800',
  eletrodomesticos: 'bg-purple-100 text-purple-800',
  informatica: 'bg-indigo-100 text-indigo-800',
  moda: 'bg-pink-100 text-pink-800',
  moda_masc: 'bg-slate-100 text-slate-800',
  beleza: 'bg-rose-100 text-rose-800',
  calcados: 'bg-amber-100 text-amber-800',
  esportes: 'bg-green-100 text-green-800',
  casa: 'bg-orange-100 text-orange-800',
  saude: 'bg-emerald-100 text-emerald-800',
  brinquedos: 'bg-yellow-100 text-yellow-800',
  alimentos: 'bg-lime-100 text-lime-800',
}

export default function AwinLojasPage() {
  const [lojas, setLojas] = useState<AwinLoja[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<number | null>(null)
  const [busca, setBusca] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todas' | 'ativas' | 'inativas'>('todas')

  useEffect(() => {
    fetchLojas()
  }, [])

  async function fetchLojas() {
    setLoading(true)
    const res = await fetch('/api/awin-lojas')
    const data = await res.json()
    setLojas(data)
    setLoading(false)
  }

  async function toggleLoja(id: number, ativo: boolean) {
    setSaving(id)
    await fetch('/api/awin-lojas', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ativo }),
    })
    setLojas(prev => prev.map(l => l.id === id ? { ...l, ativo } : l))
    setSaving(null)
  }

  async function toggleTodas(ativo: boolean) {
    setSaving(-1)
    const ids = lojasFiltradas.map(l => l.id)
    await fetch('/api/awin-lojas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, ativo }),
    })
    setLojas(prev => prev.map(l => ids.includes(l.id) ? { ...l, ativo } : l))
    setSaving(null)
  }

  const categorias = [...new Set(lojas.flatMap(l => l.categorias))].sort()

  const lojasFiltradas = lojas.filter(l => {
    if (busca && !l.nome.toLowerCase().includes(busca.toLowerCase())) return false
    if (filtroCategoria && !l.categorias.includes(filtroCategoria)) return false
    if (filtroStatus === 'ativas' && !l.ativo) return false
    if (filtroStatus === 'inativas' && l.ativo) return false
    return true
  })

  const totalAtivas = lojas.filter(l => l.ativo).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">🌐 Lojas AWIN</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie quais lojas o scraper deve buscar ofertas automaticamente
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-base px-3 py-1">
            {totalAtivas} / {lojas.length} ativas
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3 items-center">
            <Input
              placeholder="Buscar loja..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="w-64"
            />

            <select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="">Todas as categorias</option>
              {categorias.map(c => (
                <option key={c} value={c}>{CATEGORIA_LABELS[c] || c}</option>
              ))}
            </select>

            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value as any)}
              className="border rounded-md px-3 py-2 text-sm bg-background"
            >
              <option value="todas">Todas</option>
              <option value="ativas">Ativas</option>
              <option value="inativas">Inativas</option>
            </select>

            <div className="ml-auto flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleTodas(true)}
                disabled={saving !== null}
              >
                Ativar filtradas ({lojasFiltradas.length})
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => toggleTodas(false)}
                disabled={saving !== null}
              >
                Desativar filtradas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando lojas...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lojasFiltradas.map(loja => (
            <Card
              key={loja.id}
              className={`transition-all ${loja.ativo ? 'ring-2 ring-green-400 bg-green-50/30' : 'opacity-70'}`}
            >
              <CardContent className="pt-5 pb-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base truncate">{loja.nome}</h3>
                    <a
                      href={loja.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:text-foreground truncate block"
                    >
                      {loja.url.replace('https://', '')}
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">
                      Merchant ID: {loja.merchant_id}
                    </p>
                  </div>
                  <Switch
                    checked={loja.ativo}
                    onCheckedChange={v => toggleLoja(loja.id, v)}
                    disabled={saving !== null}
                  />
                </div>
                <div className="flex flex-wrap gap-1 mt-3">
                  {loja.categorias.map(cat => (
                    <span
                      key={cat}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORIA_COLORS[cat] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {CATEGORIA_LABELS[cat] || cat}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && lojasFiltradas.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Nenhuma loja encontrada com os filtros selecionados.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>1.</strong> Ative as lojas que deseja monitorar usando o toggle.
          </p>
          <p>
            <strong>2.</strong> O cron automático (a cada 30 min) visita apenas as lojas ativas.
          </p>
          <p>
            <strong>3.</strong> Para cada produto em promoção encontrado, um link de afiliado AWIN é gerado automaticamente.
          </p>
          <p>
            <strong>4.</strong> Os produtos aparecem na vitrine do site e podem ser disparados para grupos.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
