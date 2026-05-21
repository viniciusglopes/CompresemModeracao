'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ShortLink {
  id: string
  slug: string
  url_destino: string
  cliques: number
  ultimo_clique: string | null
  criado_em: string
  produto: { id: string; titulo: string; thumbnail: string } | null
}

const PAGE_SIZE = 50

export default function LinksPage() {
  const [links, setLinks] = useState<ShortLink[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [newUrl, setNewUrl] = useState('')
  const [creating, setCreating] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const fetchLinks = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
    if (search) params.set('search', search)
    const res = await fetch(`/api/links?${params}`)
    const json = await res.json()
    setLinks(json.data || [])
    setTotal(json.total || 0)
    setLoading(false)
  }, [page, search])

  useEffect(() => { fetchLinks() }, [fetchLinks])

  const handleCreate = async () => {
    if (!newUrl.trim()) return
    setCreating(true)
    await fetch('/api/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url_destino: newUrl.trim() }),
    })
    setNewUrl('')
    setCreating(false)
    fetchLinks()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/links/${id}`, { method: 'DELETE' })
    fetchLinks()
  }

  const copyLink = (slug: string) => {
    navigator.clipboard.writeText(`${baseUrl}/link/${slug}`)
  }

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Links Curtos</h1>
        <span className="text-sm text-gray-500">{total} links</span>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Cole a URL de afiliado aqui..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="flex-1 px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-900"
            />
            <Button onClick={handleCreate} disabled={creating || !newUrl.trim()}>
              {creating ? 'Criando...' : 'Criar Link'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar por slug ou URL..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="px-3 py-2 border rounded-md text-sm bg-white dark:bg-gray-900 w-64"
        />
      </div>

      {loading ? (
        <p className="text-center text-gray-500 py-8">Carregando...</p>
      ) : links.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Nenhum link encontrado</p>
      ) : (
        <div className="space-y-2">
          {links.map((link) => (
            <Card key={link.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-sm font-bold text-blue-600 dark:text-blue-400">
                        /link/{link.slug}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => copyLink(link.slug)}
                      >
                        Copiar
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{link.url_destino}</p>
                    {link.produto && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        Produto: {link.produto.titulo}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-center">
                      <p className="text-lg font-bold">{link.cliques}</p>
                      <p className="text-xs text-gray-500">cliques</p>
                    </div>
                    <div className="text-center text-xs text-gray-400">
                      {link.ultimo_clique
                        ? new Date(link.ultimo_clique).toLocaleDateString('pt-BR')
                        : '-'}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(link.id)}
                    >
                      Excluir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            Anterior
          </Button>
          <span className="text-sm py-2">{page} / {totalPages}</span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Próximo
          </Button>
        </div>
      )}
    </div>
  )
}
