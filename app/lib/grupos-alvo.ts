// Escolha dos grupos que recebem cada produto — fonte unica, sem banco (testavel).
//
// Regras (01/10, depois do disparo manual que "foi" sem sair nada):
//  - grupo com `nichos` vazio/nulo e GERAL: recebe qualquer produto;
//  - grupo com `nichos` preenchido so recebe produto daquela categoria;
//  - produto sem categoria (nicho nulo/vazio/desconhecido) so casa com grupo GERAL;
//  - quando quem dispara ESCOLHE os grupos (ids explicitos), a escolha vence:
//    o filtro de categoria NAO e aplicado. Lista explicita vazia = nenhum grupo.

import { normalizarNicho } from './nicho-lista'

export interface GrupoBase {
  id: string
  nome: string
  canal: string
  grupo_id: string
  nichos: unknown // JSONB: [] / null = geral; ["beleza"] = so beleza
}

export const MSG_SEM_GRUPO = 'Nenhum grupo selecionado/compatível — escolha um grupo'

/** Nichos do grupo como lista normalizada ([] = geral). */
export function nichosDoGrupo(g: Pick<GrupoBase, 'nichos'>): string[] {
  if (!Array.isArray(g.nichos)) return []
  return g.nichos
    .filter((n): n is string => typeof n === 'string' && n.trim() !== '')
    .map(n => normalizarNicho(n) ?? n.trim().toLowerCase())
}

export function grupoGeral(g: Pick<GrupoBase, 'nichos'>): boolean {
  return nichosDoGrupo(g).length === 0
}

/** Grupos que aceitam um produto desta categoria (sem escolha explicita). */
export function gruposCompativeis<G extends GrupoBase>(grupos: G[], nicho: unknown): G[] {
  const n = normalizarNicho(nicho)
  return grupos.filter(g => {
    const ns = nichosDoGrupo(g)
    if (ns.length === 0) return true
    return n !== null && ns.includes(n)
  })
}

/**
 * Grupos que vao receber o produto.
 * `explicitos` definido (mesmo vazio) => so esses ids, sem filtro de categoria.
 * Ids que nao estao em `grupos` (inativos/inexistentes) sao ignorados.
 */
export function resolverAlvos<G extends GrupoBase>(
  grupos: G[],
  nicho: unknown,
  explicitos?: readonly string[] | null,
): G[] {
  if (explicitos == null) return gruposCompativeis(grupos, nicho)
  const set = new Set(explicitos)
  return grupos.filter(g => set.has(g.id))
}

/**
 * Le a escolha explicita do corpo da requisicao para um produto.
 * Prioridade: grupos_por_produto[produtoId] > grupo_ids (vale para todos).
 * Devolve undefined quando nao ha escolha explicita.
 */
export function escolhaExplicita(
  produtoId: string,
  body: { grupo_ids?: unknown; grupos_por_produto?: unknown },
): string[] | undefined {
  const mapa = body.grupos_por_produto
  if (mapa && typeof mapa === 'object' && !Array.isArray(mapa)) {
    const v = (mapa as Record<string, unknown>)[produtoId]
    if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string')
    // Mapa veio mas sem este produto: o usuario nao escolheu grupo p/ ele.
    if (body.grupo_ids === undefined) return []
  }
  if (Array.isArray(body.grupo_ids)) return body.grupo_ids.filter((x): x is string => typeof x === 'string')
  return undefined
}
