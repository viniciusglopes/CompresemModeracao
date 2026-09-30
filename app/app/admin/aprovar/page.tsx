'use client'

import { useState, useEffect, useCallback } from 'react'
import { erroMsg } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { NICHOS_VALIDOS, NICHO_LABEL } from '@/lib/nicho-lista'

type Situacao = 'pendente' | 'aprovado' | 'disparado' | 'rejeitado'

interface Item {
  chave: string
  fonte: 'produto' | 'garimpado'
  origem: 'grupo' | 'busca'
  id: string
  titulo: string
  preco: number | null
  preco_original: number | null
  desconto_percent: number | null
  plataforma: string
  loja_nome: string | null
  thumbnail: string | null
  link_afiliado: string | null
  link_original: string | null
  nicho: string | null
  nicho_detectado: boolean
  situacao: Situacao
  aprovado_em: string | null
  ultimo_disparo_em: string | null
  criado_em: string
  cupom: string | null
  link_conta_atual: boolean | null
}

const PLATAFORMA_LABEL: Record<string, string> = {
  mercadolivre: '🛒 Mercado Livre',
  shopee: '🧡 Shopee',
  amazon: '📦 Amazon',
  aliexpress: '🔴 AliExpress',
  awin: '🌐 AWIN',
  lomadee: '🏬 Lomadee',
}

const PERIODOS = [
  { horas: 24, label: '24h' },
  { horas: 72, label: '3 dias' },
  { horas: 168, label: '7 dias' },
  { horas: 720, label: '30 dias' },
]

const STATUS = [
  { id: 'fila', label: 'A decidir + marcados' },
  { id: 'pendente', label: 'Só a decidir' },
  { id: 'aprovado', label: 'Marcados (na fila)' },
  { id: 'disparado', label: 'Já disparados' },
  { id: 'rejeitado', label: 'Descartados' },
  { id: 'todos', label: 'Todos' },
]

const fmt = (v: number | null) =>
  v != null ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'

const fmtData = (d: string) =>
  new Date(d).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  })

export default function AprovarPage() {
  const [itens, setItens] = useState<Item[]>([])
  const [contas, setContas] = useState<Record<string, string> | null>(null)
  const [naFila, setNaFila] = useState(0)
  const [loading, setLoading] = useState(true)
  const [semSessao, setSemSessao] = useState(false)
  const [horas, setHoras] = useState(24)
  const [status, setStatus] = useState('fila')
  const [origem, setOrigem] = useState('')
  const [nicho, setNicho] = useState('')
  const [ocupado, setOcupado] = useState<Set<string>>(new Set())
  const [disparando, setDisparando] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const avisar = (type: 'success' | 'error', text: string, ms = 5000) => {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), ms)
  }

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ horas: String(horas), status })
      if (origem) params.set('origem', origem)
      if (nicho) params.set('nicho', nicho)
      const res = await fetch(`/api/aprovacao?${params}`, { cache: 'no-store' })
      if (res.status === 401) { setSemSessao(true); return }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setItens(data.itens || [])
      setContas(data.contas || null)
      setNaFila(data.aprovados_na_fila || 0)
    } catch (e: unknown) {
      avisar('error', erroMsg(e))
    } finally {
      setLoading(false)
    }
  }, [horas, status, origem, nicho])

  useEffect(() => { carregar() }, [carregar])

  const marcarOcupado = (chaves: string[], on: boolean) =>
    setOcupado(prev => {
      const n = new Set(prev)
      chaves.forEach(c => (on ? n.add(c) : n.delete(c)))
      return n
    })

  const acao = async (acao: 'aprovar' | 'desmarcar' | 'rejeitar', chaves: string[]) => {
    if (!chaves.length) return
    marcarOcupado(chaves, true)
    try {
      const res = await fetch('/api/aprovacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao, chaves }),
      })
      if (res.status === 401) { setSemSessao(true); return }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      if (data.erros?.length) {
        avisar('error', `${data.ok} ok, ${data.erros.length} com problema: ${(data.erros as { erro: string }[]).map(e => e.erro).slice(0, 3).join('; ')}`, 8000)
      }
      // Garimpado aprovado vira produto (chave nova) — recarrega a lista.
      if (acao === 'aprovar' && chaves.some(c => c.startsWith('g:'))) {
        await carregar()
      } else {
        const nova: Situacao = acao === 'aprovar' ? 'aprovado' : acao === 'rejeitar' ? 'rejeitado' : 'pendente'
        setItens(prev => prev.map(i => (chaves.includes(i.chave) ? { ...i, situacao: nova } : i)))
        const antes = itens.filter(i => chaves.includes(i.chave))
        const delta = antes.filter(i => i.situacao !== 'aprovado' && nova === 'aprovado').length
          - antes.filter(i => i.situacao === 'aprovado' && nova !== 'aprovado').length
        setNaFila(n => Math.max(0, n + delta))
      }
    } catch (e: unknown) {
      avisar('error', erroMsg(e))
    } finally {
      marcarOcupado(chaves, false)
    }
  }

  const trocarNicho = async (item: Item, novo: string) => {
    marcarOcupado([item.chave], true)
    try {
      const res = await fetch('/api/aprovacao', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chave: item.chave, nicho: novo || null }),
      })
      if (res.status === 401) { setSemSessao(true); return }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setItens(prev => prev.map(i => (i.chave === item.chave ? { ...i, nicho: novo || null, nicho_detectado: false } : i)))
    } catch (e: unknown) {
      avisar('error', erroMsg(e))
    } finally {
      marcarOcupado([item.chave], false)
    }
  }

  const aprovadosNaFila = itens.filter(i => i.situacao === 'aprovado').length
  const decidiveis = itens.filter(i => i.situacao === 'pendente' || i.situacao === 'aprovado')

  const dispararAgora = async () => {
    if (!confirm('Enviar agora para os grupos os produtos MARCADOS (até 20 por vez)?\n\nSó sai o que está marcado, cada um para o grupo da categoria dele.')) return
    setDisparando(true)
    try {
      const res = await fetch('/api/aprovacao/disparar', { method: 'POST' })
      if (res.status === 401) { setSemSessao(true); return }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      const produtos = (data.produtos || []) as { grupos_ok: number; erro?: string }[]
      const saiu = produtos.filter(p => p.grupos_ok > 0).length
      const falhou = produtos.filter(p => p.grupos_ok === 0)
      const pul = data.pulados || {}
      const partes = [
        `${saiu} produto(s) enviado(s) (${data.enviados} mensagens)`,
        falhou.length ? `${falhou.length} falharam e continuam na fila${falhou[0]?.erro ? ` — ${falhou[0].erro}` : ''}` : '',
        pul.sem_grupo ? `${pul.sem_grupo} sem grupo da categoria` : '',
        pul.anti_repost_48h ? `${pul.anti_repost_48h} já saíram nas últimas 48h` : '',
        pul.similar_48h ? `${pul.similar_48h} parecidos com algo recente` : '',
        !saiu && data.motivo ? data.motivo : '',
      ].filter(Boolean)
      avisar(falhou.length || !saiu ? 'error' : 'success', partes.join(' · '), 10000)
      await carregar()
    } catch (e: unknown) {
      avisar('error', erroMsg(e))
    } finally {
      setDisparando(false)
    }
  }

  if (semSessao) {
    return (
      <div className="max-w-md mx-auto text-center py-16">
        <p className="text-4xl mb-3">🔒</p>
        <p className="font-semibold text-gray-800">Sua sessão expirou</p>
        <p className="text-sm text-gray-500 mt-1">Entre de novo para ver e aprovar as ofertas.</p>
        <Button className="mt-5 bg-rose-500 hover:bg-rose-600"
          onClick={() => { localStorage.removeItem('admin_authenticated'); window.location.href = '/login' }}>
          Entrar
        </Button>
      </div>
    )
  }

  const chip = (ativo: boolean) =>
    `px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
      ativo ? 'bg-rose-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
    }`

  return (
    <div className="max-w-3xl mx-auto pb-28">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">✅ Aprovar ofertas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Marque o que vai para os grupos. <b>Só sai o que estiver marcado.</b>
          </p>
        </div>
        <Button onClick={carregar} variant="outline" size="sm" disabled={loading} className="shrink-0">
          {loading ? '⏳' : '🔄'}
        </Button>
      </div>

      {/* Filtros */}
      <div className="space-y-2 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PERIODOS.map(p => (
            <button key={p.horas} onClick={() => setHoras(p.horas)} className={chip(horas === p.horas)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { id: '', label: 'Todas as origens' },
            { id: 'grupo', label: '📲 Dos grupos' },
            { id: 'busca', label: '🔎 Busca automática' },
          ].map(o => (
            <button key={o.id} onClick={() => setOrigem(o.id)} className={chip(origem === o.id)}>
              {o.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select value={nicho} onChange={e => setNicho(e.target.value)}
            className="h-10 rounded-lg border bg-white px-2 text-sm">
            <option value="">Todas as categorias</option>
            <option value="sem">⚠ Sem categoria</option>
            {NICHOS_VALIDOS.map(n => <option key={n} value={n}>{NICHO_LABEL[n]}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="h-10 rounded-lg border bg-white px-2 text-sm">
            {STATUS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {msg && (
        <p className={`mb-3 text-sm p-3 rounded-lg ${
          msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>{msg.text}</p>
      )}

      {/* Acoes em massa */}
      <div className="flex items-center gap-3 mb-3 text-sm flex-wrap">
        <span className="text-gray-500">{itens.length} item(ns)</span>
        <button className="text-rose-600 font-medium py-1 disabled:opacity-40"
          disabled={!decidiveis.some(i => i.situacao === 'pendente')}
          onClick={() => acao('aprovar', decidiveis.filter(i => i.situacao === 'pendente').map(i => i.chave))}>
          Marcar todos
        </button>
        <button className="text-gray-600 font-medium py-1 disabled:opacity-40"
          disabled={!aprovadosNaFila}
          onClick={() => acao('desmarcar', itens.filter(i => i.situacao === 'aprovado').map(i => i.chave))}>
          Desmarcar todos
        </button>
      </div>

      {loading && !itens.length ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : itens.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">Nada por aqui neste filtro.</p>
          <p className="text-gray-400 text-xs mt-1">Tente um período maior (3 ou 7 dias).</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {itens.map(item => {
            const marcado = item.situacao === 'aprovado'
            const busy = ocupado.has(item.chave)
            const link = item.link_afiliado || item.link_original
            return (
              <li key={item.chave}
                className={`rounded-xl border-2 bg-white p-3 transition-colors ${
                  marcado ? 'border-rose-400 bg-rose-50/40' : 'border-gray-200'
                } ${item.situacao === 'rejeitado' ? 'opacity-60' : ''}`}>
                <div className="flex gap-3">
                  {item.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.thumbnail} alt="" loading="lazy"
                      className="w-24 h-24 md:w-28 md:h-28 rounded-lg object-cover bg-gray-100 shrink-0" />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center text-2xl">🛍️</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-3 leading-snug">{item.titulo}</p>
                    <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                      <span className="text-base font-bold text-green-700">{fmt(item.preco)}</span>
                      {item.preco_original != null && item.preco != null && item.preco_original > item.preco && (
                        <span className="text-xs text-gray-400 line-through">{fmt(item.preco_original)}</span>
                      )}
                      {!!item.desconto_percent && item.desconto_percent > 0 && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">-{item.desconto_percent}%</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {PLATAFORMA_LABEL[item.plataforma] || item.plataforma}
                      {item.loja_nome ? ` · ${item.loja_nome}` : ''}
                      {' · '}{item.origem === 'grupo' ? '📲 grupo' : '🔎 busca'}
                      {' · '}{fmtData(item.criado_em)}
                    </p>
                    {item.cupom && <p className="text-xs text-purple-700 mt-0.5">Cupom: {item.cupom}</p>}
                  </div>
                </div>

                {/* Link de afiliado */}
                {link && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    <a href={link} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 underline truncate flex-1 min-w-0 py-1">
                      {link}
                    </a>
                    {item.link_conta_atual === true && <span title="Link da conta de afiliado atual" className="text-green-700 shrink-0">✓ sua conta</span>}
                    {item.link_conta_atual === false && <span title="Link de outra conta ou quebrado: ao marcar, é refeito com a conta atual" className="text-amber-700 shrink-0">⚠ refazer link</span>}
                  </div>
                )}

                {/* Categoria + Disparar */}
                <div className="mt-2 flex items-center gap-2">
                  <select value={item.nicho || ''} disabled={busy}
                    onChange={e => trocarNicho(item, e.target.value)}
                    className={`h-10 flex-1 min-w-0 rounded-lg border px-2 text-sm ${
                      item.nicho ? 'bg-white' : 'bg-amber-50 border-amber-300'
                    }`}>
                    <option value="">⚠ Sem categoria</option>
                    {NICHOS_VALIDOS.map(n => (
                      <option key={n} value={n}>{NICHO_LABEL[n]}{item.nicho_detectado && item.nicho === n ? ' (sugerida)' : ''}</option>
                    ))}
                    {item.nicho && !(NICHOS_VALIDOS as readonly string[]).includes(item.nicho) && (
                      <option value={item.nicho}>{item.nicho} (antigo)</option>
                    )}
                  </select>

                  {item.situacao === 'disparado' ? (
                    <span className="h-10 px-3 rounded-lg bg-green-100 text-green-800 text-sm font-medium flex items-center shrink-0">
                      📤 Enviado {item.ultimo_disparo_em ? fmtData(item.ultimo_disparo_em) : ''}
                    </span>
                  ) : (
                    <button disabled={busy}
                      onClick={() => acao(marcado ? 'desmarcar' : 'aprovar', [item.chave])}
                      aria-pressed={marcado}
                      className={`h-10 px-4 rounded-lg text-sm font-semibold shrink-0 transition-colors disabled:opacity-50 ${
                        marcado ? 'bg-rose-600 text-white' : 'bg-white border-2 border-rose-300 text-rose-700'
                      }`}>
                      {busy ? '⏳' : marcado ? '✓ Disparar' : 'Disparar'}
                    </button>
                  )}
                </div>

                <div className="mt-1.5 flex items-center justify-between text-xs text-gray-400">
                  <span>
                    {!item.nicho && 'Sem categoria não vai para grupo com categoria.'}
                    {item.situacao !== 'disparado' && item.ultimo_disparo_em && ` Já foi para grupo em ${fmtData(item.ultimo_disparo_em)}.`}
                  </span>
                  {item.situacao === 'rejeitado' ? (
                    <button className="py-1 text-gray-500" onClick={() => acao('desmarcar', [item.chave])}>Restaurar</button>
                  ) : item.situacao !== 'disparado' && (
                    <button className="py-1 text-gray-400 hover:text-gray-600" onClick={() => acao('rejeitar', [item.chave])}>Descartar</button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {contas && (
        <details className="mt-6 text-xs text-gray-500 bg-white border rounded-lg p-3">
          <summary className="cursor-pointer font-medium text-gray-700">Contas de afiliado em uso</summary>
          <ul className="mt-2 space-y-1">
            {Object.entries(contas).map(([k, v]) => (
              <li key={k}><b>{PLATAFORMA_LABEL[k] || k}:</b> {v}</li>
            ))}
          </ul>
          <p className="mt-2">Para trocar a conta, edite a plataforma em Plataformas (sem mexer no código).</p>
        </details>
      )}

      {/* Barra fixa: disparar os marcados */}
      <div className="fixed bottom-0 inset-x-0 md:left-64 z-30 bg-white/95 backdrop-blur border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <span className="text-sm text-gray-600 flex-1">
            <b className="text-rose-700">{naFila}</b> marcado(s) esperando envio
          </span>
          <Button onClick={dispararAgora} disabled={disparando || !naFila}
            className="h-11 px-5 bg-rose-600 hover:bg-rose-700 text-white font-semibold">
            {disparando ? 'Enviando...' : '📤 Disparar agora os marcados'}
          </Button>
        </div>
      </div>
    </div>
  )
}
