'use client'

// Escolha de grupos antes de disparar + relatorio depois do disparo.
// Usado em /admin/central (disparo manual), /admin/ofertas e /admin/aprovar.

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { NICHO_LABEL, type Nicho } from '@/lib/nicho-lista'

export const MSG_SEM_GRUPO = 'Nenhum grupo selecionado/compatível — escolha um grupo'

export interface GrupoOpcao { id: string; nome: string; canal: string; nichos: unknown; geral: boolean }
export interface AlvoInfo { grupo: string; grupo_nome: string; canal: string }
export interface ResultadoInfo extends AlvoInfo { status: 'enviado' | 'erro'; erro?: string }
export interface ProdutoPlano {
  id: string
  titulo: string | null
  nicho: string | null
  alvos: AlvoInfo[]
  resultados?: ResultadoInfo[]
  erro?: string
}

const canalIcon = (c: string) => (c === 'whatsapp' ? '💬' : c === 'telegram' ? '✈️' : '📤')
const nichoLabel = (n: string | null) => (n ? NICHO_LABEL[n as Nicho] || n : null)

function descreverGrupo(g: GrupoOpcao): string {
  if (g.geral) return 'geral — recebe todas as categorias'
  const ns = Array.isArray(g.nichos) ? (g.nichos as string[]) : []
  return 'só ' + ns.map(n => nichoLabel(n)).join(', ')
}

export function EscolherGruposModal({
  grupos, produtos, titulo, enviando, onConfirmar, onCancelar,
}: {
  grupos: GrupoOpcao[]
  produtos: ProdutoPlano[]
  titulo?: string
  enviando: boolean
  onConfirmar: (gruposPorProduto: Record<string, string[]>) => void
  onCancelar: () => void
}) {
  const [sel, setSel] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(produtos.map(p => [p.id, p.alvos.map(a => a.grupo)])),
  )

  const toggle = (pid: string, gid: string) =>
    setSel(prev => {
      const atual = prev[pid] || []
      return { ...prev, [pid]: atual.includes(gid) ? atual.filter(x => x !== gid) : [...atual, gid] }
    })

  const todosTem = (gid: string) => produtos.every(p => (sel[p.id] || []).includes(gid))
  const toggleTodos = (gid: string) => {
    const marcar = !todosTem(gid)
    setSel(prev => Object.fromEntries(produtos.map(p => {
      const atual = (prev[p.id] || []).filter(x => x !== gid)
      return [p.id, marcar ? [...atual, gid] : atual]
    })))
  }

  const totalEnvios = useMemo(() => Object.values(sel).reduce((s, v) => s + v.length, 0), [sel])
  const semGrupo = produtos.filter(p => !(sel[p.id] || []).length)

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="bg-white w-full sm:max-w-2xl max-h-[92vh] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">{titulo || 'Para quais grupos enviar?'}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Já vêm marcados os grupos da categoria de cada produto (e os grupos gerais). Você pode mudar.
          </p>
        </div>

        {grupos.length === 0 ? (
          <p className="p-4 text-sm text-red-600">Nenhum grupo ativo cadastrado. Cadastre um grupo em Grupos.</p>
        ) : (
          <>
            {produtos.length > 1 && (
              <div className="px-4 pt-3 flex flex-wrap gap-2 items-center">
                <span className="text-xs font-semibold text-gray-500 uppercase">Marcar para todos:</span>
                {grupos.map(g => (
                  <button key={g.id} type="button" onClick={() => toggleTodos(g.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${todosTem(g.id) ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-gray-700 border-gray-300'}`}>
                    {canalIcon(g.canal)} {g.nome}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {produtos.map(p => {
                const marcados = sel[p.id] || []
                return (
                  <div key={p.id} className={`rounded-xl border p-3 ${marcados.length ? 'border-gray-200' : 'border-amber-300 bg-amber-50/50'}`}>
                    <p className="text-sm font-medium text-gray-800 line-clamp-2">{p.titulo || p.id}</p>
                    <p className="text-xs text-gray-500 mb-2">
                      Categoria: <b>{nichoLabel(p.nicho) || 'sem categoria'}</b>
                      {!p.alvos.length && ' · nenhum grupo compatível, escolha abaixo'}
                    </p>
                    <div className="space-y-1.5">
                      {grupos.map(g => (
                        <label key={g.id} className="flex items-start gap-2 text-sm cursor-pointer">
                          <input type="checkbox" className="mt-0.5 w-4 h-4 accent-rose-600"
                            checked={marcados.includes(g.id)} onChange={() => toggle(p.id, g.id)} />
                          <span>
                            {canalIcon(g.canal)} <b>{g.nome}</b>{' '}
                            <span className="text-xs text-gray-500">({descreverGrupo(g)})</span>
                          </span>
                        </label>
                      ))}
                    </div>
                    {!marcados.length && <p className="text-xs text-amber-700 mt-2">⚠ Sem grupo: este produto não será enviado.</p>}
                  </div>
                )
              })}
            </div>
          </>
        )}

        <div className="p-4 border-t space-y-2">
          {totalEnvios === 0 ? (
            <p className="text-sm font-medium text-red-600">❌ {MSG_SEM_GRUPO}</p>
          ) : (
            <p className="text-sm text-gray-600">
              <b>{totalEnvios}</b> envio(s) · {produtos.length - semGrupo.length} de {produtos.length} produto(s)
              {semGrupo.length > 0 && <span className="text-amber-700"> · {semGrupo.length} sem grupo (não sai)</span>}
            </p>
          )}
          <div className="flex gap-2">
            <Button onClick={() => onConfirmar(sel)} disabled={enviando || totalEnvios === 0}
              className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 text-white font-semibold">
              {enviando ? 'Enviando...' : `📤 Enviar agora (${totalEnvios})`}
            </Button>
            <Button onClick={onCancelar} disabled={enviando} variant="outline" className="h-11">Cancelar</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Relatorio do que aconteceu: por produto, para onde foi ou o erro de cada grupo. */
export function ResultadoDisparo({
  produtos, enviados, erros, erroGeral, onFechar,
}: {
  produtos: ProdutoPlano[]
  enviados: number
  erros: number
  erroGeral?: string
  onFechar: () => void
}) {
  const ok = enviados > 0 && !erroGeral
  return (
    <div className={`mb-4 rounded-xl border p-3 text-sm ${ok && !erros ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-semibold text-gray-900">
          {ok ? '✅' : '❌'} {enviados} mensagem(ns) enviada(s){erros ? ` · ${erros} erro(s)` : ''}
          {' · '}{produtos.filter(p => p.resultados?.some(r => r.status === 'enviado')).length} de {produtos.length} produto(s)
        </p>
        <button onClick={onFechar} className="text-xs text-gray-500 hover:underline shrink-0">fechar</button>
      </div>
      {erroGeral && <p className="mt-1 text-red-700 font-medium">{erroGeral}</p>}
      <ul className="mt-2 space-y-1.5">
        {produtos.map(p => {
          const res = p.resultados || []
          const okG = res.filter(r => r.status === 'enviado')
          const errG = res.filter(r => r.status === 'erro')
          return (
            <li key={p.id} className="border-t border-black/5 pt-1.5">
              <p className="text-gray-800 line-clamp-1">{p.titulo || p.id}</p>
              {okG.length > 0 && <p className="text-xs text-green-700">Enviado para: {okG.map(r => `${canalIcon(r.canal)} ${r.grupo_nome}`).join(', ')}</p>}
              {errG.map(r => <p key={r.grupo} className="text-xs text-red-700">Erro em {canalIcon(r.canal)} {r.grupo_nome}: {r.erro}</p>)}
              {!res.length && <p className="text-xs text-amber-700">Não enviado: {p.erro || MSG_SEM_GRUPO}</p>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

interface RespostaDisparo {
  error?: string
  motivo?: string
  grupos?: GrupoOpcao[]
  produtos?: ProdutoPlano[]
  enviados?: number
  erros?: number
}

export interface EstadoResultado { produtos: ProdutoPlano[]; enviados: number; erros: number; erroGeral?: string }

/**
 * Fluxo em 2 passos contra um endpoint que aceita `dry` e `grupos_por_produto`:
 *  1) preparar(corpo) -> POST {...corpo, dry:true} -> abre o modal com os grupos pre-marcados;
 *  2) confirmar(mapa) -> POST {...corpo, grupos_por_produto} -> mostra o resultado por grupo.
 */
export function useDisparoComEscolha(endpoint: string, aoTerminar?: (r: EstadoResultado) => void) {
  const [plano, setPlano] = useState<{ grupos: GrupoOpcao[]; produtos: ProdutoPlano[] } | null>(null)
  const [corpo, setCorpo] = useState<Record<string, unknown>>({})
  const [preparando, setPreparando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [resultado, setResultado] = useState<EstadoResultado | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const chamar = async (body: Record<string, unknown>): Promise<{ status: number; data: RespostaDisparo }> => {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.status === 401) return { status: 401, data: { error: 'Sessão expirada — entre de novo' } }
    let data: RespostaDisparo = {}
    try { data = await res.json() } catch { data = { error: `Erro ${res.status}` } }
    return { status: res.status, data }
  }

  const preparar = async (body: Record<string, unknown>) => {
    setErro(null); setResultado(null); setPreparando(true)
    try {
      const { status, data } = await chamar({ ...body, dry: true })
      if (status >= 400 || data.error) { setErro(data.error || `Erro ${status}`); return }
      if (!data.produtos?.length) { setErro(data.motivo || 'Nenhum produto para enviar'); window.scrollTo({ top: 0, behavior: 'smooth' }); return }
      setCorpo(body)
      setPlano({ grupos: data.grupos || [], produtos: data.produtos })
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setPreparando(false)
    }
  }

  const confirmar = async (mapa: Record<string, string[]>) => {
    if (!Object.values(mapa).some(v => v.length)) { setErro(MSG_SEM_GRUPO); return }
    setEnviando(true)
    try {
      const { status, data } = await chamar({ ...corpo, grupos_por_produto: mapa })
      const r: EstadoResultado = {
        produtos: data.produtos || [],
        enviados: data.enviados || 0,
        erros: data.erros || 0,
        erroGeral: status >= 400 || data.error ? data.error || `Erro ${status}` : undefined,
      }
      if (!r.produtos.length && r.erroGeral) setErro(r.erroGeral)
      else setResultado(r)
      setPlano(null)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      aoTerminar?.(r)
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setEnviando(false)
    }
  }

  const modal = plano ? (
    <EscolherGruposModal grupos={plano.grupos} produtos={plano.produtos} enviando={enviando}
      onConfirmar={confirmar} onCancelar={() => setPlano(null)} />
  ) : null

  const relatorio = (
    <>
      {erro && (
        <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 flex justify-between gap-3">
          <span>❌ {erro}</span>
          <button onClick={() => setErro(null)} className="text-xs text-gray-500 hover:underline">fechar</button>
        </div>
      )}
      {resultado && <ResultadoDisparo {...resultado} onFechar={() => setResultado(null)} />}
    </>
  )

  return { preparar, preparando, enviando, modal, relatorio }
}
