'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const ICONS = ["👜","🔥","⭐","💎","🎁","🛒","💰","🏷️","📱","💻","🎧","👕","👗","👔","👟","🏠","🔧","🪛","🔌","🧹","🍳","🛋️","🚗","⚽","🎮","📚","💄","🧴","👠","⌚","💡","🎯","🤑","✅","❤️","🩷","💜","🧡","🩵","💚"]

interface LinkItem {
  id: string
  nome: string
  icone: string
  link: string
  foto: string
}

interface LinktreeData {
  grupos: LinkItem[]
  produtos: LinkItem[]
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

export default function LinktreePage() {
  const [data, setData] = useState<LinktreeData>({ grupos: [], produtos: [] })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editItem, setEditItem] = useState<{ section: 'grupos' | 'produtos'; item: LinkItem; isNew: boolean } | null>(null)
  const [showIcons, setShowIcons] = useState(false)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/linktree')
      if (res.ok) {
        const d = await res.json()
        setData(d)
      }
    } catch {
      showMsg('error', 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const saveData = async (newData: LinktreeData) => {
    setSaving(true)
    try {
      const res = await fetch('/api/linktree', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dados: newData, admin: true }),
      })
      if (res.ok) {
        setData(newData)
        showMsg('success', 'Salvo!')
      } else {
        const err = await res.json()
        showMsg('error', err.error || 'Erro ao salvar')
      }
    } catch {
      showMsg('error', 'Erro de conexao')
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => { loadData() }, [])

  const addItem = (section: 'grupos' | 'produtos') => {
    const nome = section === 'produtos'
      ? `Produto #${String(data.produtos.length + 1).padStart(3, '0')}`
      : 'Grupo VIP - Novo'
    setEditItem({
      section,
      item: { id: uid(), nome, icone: section === 'produtos' ? '👜' : '🏷️', link: '', foto: '' },
      isNew: true,
    })
    setShowIcons(false)
  }

  const startEdit = (section: 'grupos' | 'produtos', item: LinkItem) => {
    setEditItem({ section, item: { ...item }, isNew: false })
    setShowIcons(false)
  }

  const saveItem = async () => {
    if (!editItem) return
    const { section, item, isNew } = editItem
    const newData = { ...data }
    if (isNew) {
      newData[section] = [...newData[section], item]
    } else {
      newData[section] = newData[section].map(i => i.id === item.id ? item : i)
    }
    await saveData(newData)
    setEditItem(null)
  }

  const deleteItem = async (section: 'grupos' | 'produtos', id: string) => {
    const newData = { ...data, [section]: data[section].filter(i => i.id !== id) }
    await saveData(newData)
  }

  const moveItem = async (section: 'grupos' | 'produtos', id: string, dir: -1 | 1) => {
    const list = [...data[section]]
    const idx = list.findIndex(i => i.id === id)
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === list.length - 1)) return
    ;[list[idx], list[idx + dir]] = [list[idx + dir], list[idx]]
    const newData = { ...data, [section]: list }
    await saveData(newData)
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">🌳 Linktree</h1>
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      </div>
    )
  }

  if (editItem) {
    const { item } = editItem
    return (
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => setEditItem(null)} className="text-sm text-red-500 font-medium hover:underline">
            ← Cancelar
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {editItem.isNew ? 'Novo Item' : 'Editar Item'}
          </h1>
        </div>

        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 border">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold">Preview</p>
              <div className="flex items-center gap-3 bg-white rounded-xl p-3 border">
                <div className="w-11 h-11 rounded-xl bg-gray-100 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                  {item.foto ? <img src={item.foto} alt="" className="w-11 h-11 object-cover rounded-xl" /> : item.icone}
                </div>
                <span className="font-semibold text-sm text-gray-800 flex-1">{item.nome || 'Nome do link'}</span>
                {item.link && <span className="text-gray-400">→</span>}
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Nome do Link</label>
              <input
                type="text"
                value={item.nome}
                onChange={e => setEditItem(prev => prev && ({ ...prev, item: { ...prev.item, nome: e.target.value } }))}
                placeholder="Ex: Grupo VIP - Ofertas"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-pink-400"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Link (URL)</label>
              <input
                type="text"
                value={item.link}
                onChange={e => setEditItem(prev => prev && ({ ...prev, item: { ...prev.item, link: e.target.value } }))}
                placeholder="https://..."
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-pink-400"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">URL da Foto (opcional)</label>
              <input
                type="text"
                value={item.foto}
                onChange={e => setEditItem(prev => prev && ({ ...prev, item: { ...prev.item, foto: e.target.value } }))}
                placeholder="https://imagem.com/foto.jpg"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-pink-400"
              />
              <p className="text-xs text-gray-400 mt-1">Se preencher, a foto substitui o icone</p>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1 font-medium">Icone</label>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gray-100 border flex items-center justify-center text-xl">
                  {item.icone}
                </div>
                <button
                  onClick={() => setShowIcons(!showIcons)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-pink-600 font-medium hover:bg-pink-50"
                >
                  {showIcons ? 'Fechar' : 'Escolher icone'}
                </button>
              </div>
              {showIcons && (
                <div className="grid grid-cols-8 gap-1.5 mt-3 p-3 bg-gray-50 rounded-xl border">
                  {ICONS.map(ic => (
                    <button
                      key={ic}
                      onClick={() => {
                        setEditItem(prev => prev && ({ ...prev, item: { ...prev.item, icone: ic } }))
                        setShowIcons(false)
                      }}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-colors ${
                        ic === item.icone ? 'bg-pink-100 ring-2 ring-pink-400' : 'bg-white hover:bg-gray-100'
                      }`}
                    >
                      {ic}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button onClick={() => setEditItem(null)} variant="outline" className="flex-1">
                Cancelar
              </Button>
              <Button onClick={saveItem} disabled={saving} className="flex-1 bg-pink-500 hover:bg-pink-600 text-white">
                {saving ? '⏳ Salvando...' : '✅ Salvar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderSection = (title: string, section: 'grupos' | 'produtos', items: LinkItem[]) => (
    <Card className="mb-6">
      <CardContent className="pt-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold text-gray-800">{title} ({items.length})</p>
          <Button onClick={() => addItem(section)} size="sm" className="bg-pink-500 hover:bg-pink-600 text-white text-xs">
            + Adicionar
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-center py-6 text-gray-400 text-sm">Nenhum item cadastrado</p>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border">
                <div className="w-10 h-10 rounded-xl bg-white border flex items-center justify-center text-lg shrink-0 overflow-hidden">
                  {item.foto ? <img src={item.foto} alt="" className="w-10 h-10 object-cover rounded-xl" /> : item.icone}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{item.nome}</p>
                  <p className="text-xs text-gray-400 truncate">{item.link || 'Sem link'}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moveItem(section, item.id, -1)}
                    disabled={i === 0}
                    className="w-7 h-7 rounded border border-gray-200 text-gray-400 text-xs flex items-center justify-center hover:bg-gray-100 disabled:opacity-25"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveItem(section, item.id, 1)}
                    disabled={i === items.length - 1}
                    className="w-7 h-7 rounded border border-gray-200 text-gray-400 text-xs flex items-center justify-center hover:bg-gray-100 disabled:opacity-25"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => startEdit(section, item)}
                    className="px-2.5 py-1.5 rounded-lg text-xs border border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => { if (confirm('Remover este item?')) deleteItem(section, item.id) }}
                    className="px-2.5 py-1.5 rounded-lg text-xs border border-red-200 text-red-500 hover:bg-red-50"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🌳 Linktree</h1>
        <p className="text-sm text-gray-500 mt-1">
          Gerencie os links que aparecem na bio do Instagram.
          <a href="/linktree" target="_blank" className="text-pink-500 hover:underline ml-2">
            Ver pagina publica →
          </a>
        </p>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {renderSection('🏷️ Grupos VIP', 'grupos', data.grupos)}
      {renderSection('👜 Produtos em Destaque', 'produtos', data.produtos)}
    </div>
  )
}
