'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const NICHOS = [
  { id: 'eletronicos', label: 'Eletrônicos' },
  { id: 'eletrodomesticos', label: 'Eletrodomésticos' },
  { id: 'informatica', label: 'Informática' },
  { id: 'audio_video', label: 'Áudio e Vídeo' },
  { id: 'cameras', label: 'Câmeras' },
  { id: 'games', label: 'Games' },
  { id: 'moda', label: 'Moda' },
  { id: 'calcados', label: 'Calçados' },
  { id: 'beleza', label: 'Beleza' },
  { id: 'casa_moveis', label: 'Casa e Móveis' },
  { id: 'ferramentas', label: 'Ferramentas' },
  { id: 'esportes', label: 'Esportes' },
  { id: 'bebes', label: 'Bebês' },
  { id: 'brinquedos', label: 'Brinquedos' },
  { id: 'veiculos_acess', label: 'Veículos' },
  { id: 'livros', label: 'Livros' },
  { id: 'saude', label: 'Saúde' },
  { id: 'alimentos', label: 'Alimentos' },
  { id: 'musica', label: 'Música' },
  { id: 'pet_shop', label: 'Pet Shop' },
]

interface Grupo {
  id: string
  nome: string
  canal: 'telegram' | 'whatsapp'
  grupo_id: string
  ativo: boolean
  nichos: string[] | null
}

interface CredTelegram { bot_token: string }
interface CredEvolution { url: string; api_key: string; instance: string }

const EMPTY_GRUPO = { nome: '', canal: 'telegram' as const, grupo_id: '', nichos: [] as string[] }

export default function GruposPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Formulário novo grupo
  const [form, setForm] = useState({ ...EMPTY_GRUPO })
  const [salvando, setSalvando] = useState(false)

  // Edição inline
  const [editando, setEditando] = useState<Grupo | null>(null)

  // Credenciais
  const [telegramToken, setTelegramToken] = useState('')
  const [evolutionUrl, setEvolutionUrl] = useState('')
  const [evolutionKey, setEvolutionKey] = useState('')
  const [evolutionInstance, setEvolutionInstance] = useState('')
  const [geminiKey, setGeminiKey] = useState('')
  const [salvandoCred, setSalvandoCred] = useState<'telegram' | 'evolution' | 'gemini' | null>(null)

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 4000)
  }

  const loadAll = async () => {
    setLoading(true)
    try {
      const [g, cTelegram, cEvolution, cGemini] = await Promise.all([
        fetch('/api/grupos').then(r => r.json()),
        fetch('/api/plataformas/telegram_bot').then(r => r.json()).catch(() => null),
        fetch('/api/plataformas/evolution_api').then(r => r.json()).catch(() => null),
        fetch('/api/plataformas/gemini').then(r => r.json()).catch(() => null),
      ])
      setGrupos(g.grupos || [])
      const tCred = cTelegram?.plataforma?.credenciais
      if (tCred?.bot_token) setTelegramToken(tCred.bot_token)

      const eCred = cEvolution?.plataforma?.credenciais
      if (eCred) {
        setEvolutionUrl(eCred.url || '')
        setEvolutionKey(eCred.api_key || '')
        setEvolutionInstance(eCred.instance || '')
      }

      const gCred = cGemini?.plataforma?.credenciais
      if (gCred?.api_key) setGeminiKey(gCred.api_key)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [])

  const toggleNicho = (id: string, arr: string[], set: (v: string[]) => void) => {
    set(arr.includes(id) ? arr.filter(n => n !== id) : [...arr, id])
  }

  const salvarGrupo = async () => {
    if (!form.nome || !form.grupo_id) return showMsg('error', 'Nome e ID do grupo são obrigatórios')
    setSalvando(true)
    try {
      const res = await fetch('/api/grupos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, nichos: form.nichos.length ? form.nichos : null }),
      })
      const data = await res.json()
      if (data.error) return showMsg('error', data.error)
      showMsg('success', 'Grupo adicionado!')
      setForm({ ...EMPTY_GRUPO })
      loadAll()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setSalvando(false)
    }
  }

  const toggleAtivo = async (grupo: Grupo) => {
    await fetch(`/api/grupos/${grupo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !grupo.ativo }),
    })
    setGrupos(prev => prev.map(g => g.id === grupo.id ? { ...g, ativo: !g.ativo } : g))
  }

  const deletarGrupo = async (id: string) => {
    await fetch(`/api/grupos/${id}`, { method: 'DELETE' })
    setGrupos(prev => prev.filter(g => g.id !== id))
    showMsg('success', 'Grupo removido')
  }

  const salvarEdicao = async () => {
    if (!editando) return
    setSalvando(true)
    try {
      const res = await fetch(`/api/grupos/${editando.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: editando.nome,
          canal: editando.canal,
          grupo_id: editando.grupo_id,
          nichos: editando.nichos?.length ? editando.nichos : null,
        }),
      })
      const data = await res.json()
      if (data.error) return showMsg('error', data.error)
      showMsg('success', 'Grupo atualizado!')
      setEditando(null)
      loadAll()
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setSalvando(false)
    }
  }

  const salvarCredTelegram = async () => {
    setSalvandoCred('telegram')
    try {
      const res = await fetch('/api/plataformas/telegram_bot', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !!telegramToken, credenciais: { bot_token: telegramToken } }),
      })
      const data = await res.json()
      if (data.error) return showMsg('error', data.error)
      showMsg('success', 'Token do Telegram salvo!')
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setSalvandoCred(null)
    }
  }

  const salvarCredEvolution = async () => {
    setSalvandoCred('evolution')
    try {
      const res = await fetch('/api/plataformas/evolution_api', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !!(evolutionUrl && evolutionKey && evolutionInstance), credenciais: { url: evolutionUrl, api_key: evolutionKey, instance: evolutionInstance } }),
      })
      const data = await res.json()
      if (data.error) return showMsg('error', data.error)
      showMsg('success', 'Evolution API salva!')
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setSalvandoCred(null)
    }
  }

  const salvarCredGemini = async () => {
    setSalvandoCred('gemini')
    try {
      const res = await fetch('/api/plataformas/gemini', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativo: !!geminiKey, credenciais: { api_key: geminiKey } }),
      })
      const data = await res.json()
      if (data.error) return showMsg('error', data.error)
      showMsg('success', 'Chave Gemini salva!')
    } catch (e: any) {
      showMsg('error', e.message)
    } finally {
      setSalvandoCred(null)
    }
  }

  const telegramGrupos = grupos.filter(g => g.canal === 'telegram')
  const whatsappGrupos = grupos.filter(g => g.canal === 'whatsapp')

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📡 Grupos de Disparo</h1>
        <p className="text-sm text-gray-500 mt-1">Configure os grupos do Telegram e WhatsApp que receberão as ofertas.</p>
      </div>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {msg.type === 'success' ? '✅' : '❌'} {msg.text}
        </div>
      )}

      {/* ── Credenciais ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {/* Telegram Bot */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-semibold text-gray-800">🤖 Bot do Telegram</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Bot Token</label>
              <input
                type="password"
                value={telegramToken}
                onChange={e => setTelegramToken(e.target.value)}
                placeholder="123456:ABCdef..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-rose-400"
              />
              <p className="text-xs text-gray-400 mt-1">Obtenha em @BotFather no Telegram</p>
            </div>
            <Button onClick={salvarCredTelegram} disabled={salvandoCred === 'telegram'} size="sm" className="w-full bg-blue-500 hover:bg-blue-600 text-white">
              {salvandoCred === 'telegram' ? '⏳ Salvando...' : '💾 Salvar token'}
            </Button>
          </CardContent>
        </Card>

        {/* Evolution API */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-semibold text-gray-800">💬 WhatsApp (Evolution API)</p>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-500 mb-1">URL da API</label>
                <input type="text" value={evolutionUrl} onChange={e => setEvolutionUrl(e.target.value)}
                  placeholder="https://evolution.seudominio.com" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-rose-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">API Key</label>
                <input type="password" value={evolutionKey} onChange={e => setEvolutionKey(e.target.value)}
                  placeholder="sua-api-key" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-rose-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nome da instância</label>
                <input type="text" value={evolutionInstance} onChange={e => setEvolutionInstance(e.target.value)}
                  placeholder="minha-instancia" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-rose-400" />
              </div>
            </div>
            <Button onClick={salvarCredEvolution} disabled={salvandoCred === 'evolution'} size="sm" className="w-full bg-green-500 hover:bg-green-600 text-white">
              {salvandoCred === 'evolution' ? '⏳ Salvando...' : '💾 Salvar Evolution API'}
            </Button>
          </CardContent>
        </Card>

        {/* Gemini AI */}
        <Card className="sm:col-span-2">
          <CardContent className="pt-4 space-y-3">
            <p className="text-sm font-semibold text-gray-800">🤖 Gemini AI (abertura criativa)</p>
            <p className="text-xs text-gray-400">Gera uma linha de abertura personalizada para cada produto. Obtenha a chave grátis em aistudio.google.com</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">API Key</label>
              <input
                type="password"
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-rose-400"
              />
            </div>
            <Button onClick={salvarCredGemini} disabled={salvandoCred === 'gemini'} size="sm" className="bg-purple-500 hover:bg-purple-600 text-white">
              {salvandoCred === 'gemini' ? '⏳ Salvando...' : '💾 Salvar chave Gemini'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Adicionar grupo ── */}
      <Card className="mb-6">
        <CardContent className="pt-4 space-y-3">
          <p className="text-sm font-semibold text-gray-800">➕ Adicionar grupo</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nome</label>
              <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex: Ofertas Gerais" className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-rose-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Canal</label>
              <select value={form.canal} onChange={e => setForm(f => ({ ...f, canal: e.target.value as any }))}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-rose-400 bg-white">
                <option value="telegram">🔵 Telegram</option>
                <option value="whatsapp">🟢 WhatsApp</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              {form.canal === 'telegram' ? 'Chat ID do grupo (ex: -1001234567890)' : 'Group JID (ex: 5531999990000-1234567890@g.us)'}
            </label>
            <input type="text" value={form.grupo_id} onChange={e => setForm(f => ({ ...f, grupo_id: e.target.value }))}
              placeholder={form.canal === 'telegram' ? '-1001234567890' : '5531999990000-1234567890@g.us'}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-rose-400" />
            {form.canal === 'telegram' && (
              <p className="text-xs text-gray-400 mt-1">Adicione @userinfobot ao grupo para descobrir o chat_id</p>
            )}
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Filtrar categorias (opcional — deixe vazio para receber todas)</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {NICHOS.map(n => (
                <button key={n.id} type="button"
                  onClick={() => toggleNicho(n.id, form.nichos, nichos => setForm(f => ({ ...f, nichos })))}
                  className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${form.nichos.includes(n.id) ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {n.label}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={salvarGrupo} disabled={salvando || !form.nome || !form.grupo_id}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white">
            {salvando ? '⏳ Salvando...' : '✅ Adicionar grupo'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Lista de grupos ── */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Carregando...</div>
      ) : grupos.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">Nenhum grupo cadastrado ainda.</div>
      ) : (
        <div className="space-y-6">
          {[{ canal: 'telegram', label: '🔵 Telegram', lista: telegramGrupos },
            { canal: 'whatsapp', label: '🟢 WhatsApp', lista: whatsappGrupos }]
            .filter(s => s.lista.length > 0)
            .map(secao => (
              <div key={secao.canal}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{secao.label} — {secao.lista.length} grupo{secao.lista.length !== 1 ? 's' : ''}</p>
                <div className="space-y-2">
                  {secao.lista.map(g => (
                    <Card key={g.id} className={`transition-opacity ${g.ativo ? '' : 'opacity-50'}`}>
                      <CardContent className="pt-3 pb-3">
                        {editando?.id === g.id ? (
                          /* Edição inline */
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                              <input type="text" value={editando.nome} onChange={e => setEditando(v => v && ({ ...v, nome: e.target.value }))}
                                className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-rose-400" />
                              <input type="text" value={editando.grupo_id} onChange={e => setEditando(v => v && ({ ...v, grupo_id: e.target.value }))}
                                className="px-2 py-1.5 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-rose-400" />
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {NICHOS.map(n => (
                                <button key={n.id} type="button"
                                  onClick={() => {
                                    const cur = editando.nichos || []
                                    setEditando(v => v && ({ ...v, nichos: cur.includes(n.id) ? cur.filter(x => x !== n.id) : [...cur, n.id] }))
                                  }}
                                  className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${(editando.nichos || []).includes(n.id) ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                                  {n.label}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={salvarEdicao} disabled={salvando} size="sm" className="bg-green-500 hover:bg-green-600 text-white">
                                {salvando ? '⏳' : '✅'} Salvar
                              </Button>
                              <Button onClick={() => setEditando(null)} size="sm" variant="outline">Cancelar</Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm text-gray-800">{g.nome}</span>
                                <Badge className={`text-xs ${g.ativo ? 'bg-green-100 text-green-700 hover:bg-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-100'}`}>
                                  {g.ativo ? '● Ativo' : '○ Inativo'}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-400 font-mono mt-0.5">{g.grupo_id}</p>
                              {g.nichos?.length ? (
                                <p className="text-xs text-rose-500 mt-0.5">
                                  Filtra: {g.nichos.map(n => NICHOS.find(x => x.id === n)?.label || n).join(', ')}
                                </p>
                              ) : (
                                <p className="text-xs text-gray-400 mt-0.5">Todas as categorias</p>
                              )}
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button onClick={() => toggleAtivo(g)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${g.ativo ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                                {g.ativo ? 'Pausar' : 'Ativar'}
                              </button>
                              <button onClick={() => setEditando({ ...g })}
                                className="px-2.5 py-1.5 rounded-lg text-xs border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors">
                                ✏️
                              </button>
                              <button onClick={() => deletarGrupo(g.id)}
                                className="px-2.5 py-1.5 rounded-lg text-xs border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                                🗑️
                              </button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}
