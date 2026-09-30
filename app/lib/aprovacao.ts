// Aprovacao de ofertas (tela /admin/aprovar).
//
// O "pool" de candidatos tem duas fontes:
//  - `produtos`            : busca automatica (ML/Shopee/AWIN/Lomadee), itens
//                            manuais e garimpados ja aprovados (produto_id_externo
//                            'garimpo_<id>');
//  - `produtos_garimpados` : capturados dos grupos de WhatsApp pelo webhook e
//                            ainda nao aprovados. Ao aprovar, o garimpado vira
//                            uma linha de `produtos` (so `produtos` e disparado).
//
// Chave de item na tela: 'p:<uuid>' (produtos) ou 'g:<uuid>' (garimpados).

import { supabaseAdmin } from '@/lib/supabase'
import { NICHOS_LEGADOS, detectarNichoRegex, isNichoValido, normalizarNicho, type Nicho } from '@/lib/nicho'
import {
  carregarContasAfiliado, gerarLinkContaAtual, linkEhDaContaAtual, type ContasAfiliado,
} from '@/lib/afiliado'

export type Situacao = 'pendente' | 'aprovado' | 'disparado' | 'rejeitado'
export type FiltroStatus = 'fila' | Situacao | 'todos'

export interface Candidato {
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

const COLS_PRODUTO =
  'id, titulo, preco, preco_original, desconto_percent, plataforma, loja_nome, thumbnail, link_afiliado, link_original, nicho, produto_id_externo, aprovacao_status, aprovado_em, ultimo_disparo_em, created_at'
const COLS_GARIMPADO =
  'id, titulo, preco, preco_original, desconto_percent, plataforma, thumbnail, link_afiliado, link_original, nicho, cupom, aprovacao_status, produto_id, criado_em'

function agoraISO() { return new Date().toISOString() }

/** Data de disparo "de verdade" (ignora a trava 2099 dos itens manuais da Camilla). */
function disparoReal(ultimo: string | null): string | null {
  if (!ultimo) return null
  return new Date(ultimo).getTime() <= Date.now() ? ultimo : null
}

export function situacaoProduto(p: { aprovacao_status: string; aprovado_em: string | null; ultimo_disparo_em: string | null }): Situacao {
  if (p.aprovacao_status === 'rejeitado') return 'rejeitado'
  if (p.aprovacao_status === 'aprovado') {
    const ult = disparoReal(p.ultimo_disparo_em)
    if (ult && p.aprovado_em && new Date(ult) >= new Date(p.aprovado_em)) return 'disparado'
    return 'aprovado'
  }
  return 'pendente'
}

export interface FiltrosLista {
  desde: string
  nicho: string // '' = todos, 'sem' = sem categoria, ou id
  status: FiltroStatus
  origem: '' | 'grupo' | 'busca'
  limite: number
}

/** 'casa_moveis' -> ['casa_moveis', 'casa'] (ids antigos ainda gravados na base). */
function nichoComLegados(n: string): string[] {
  return [n, ...Object.entries(NICHOS_LEGADOS).filter(([, v]) => v === n).map(([k]) => k)]
}

function passaStatus(s: Situacao, f: FiltroStatus) {
  if (f === 'todos') return true
  if (f === 'fila') return s === 'pendente' || s === 'aprovado'
  return s === f
}

function passaNicho(n: string | null, f: string) {
  if (!f) return true
  if (f === 'sem') return !n
  return n === f
}

export async function listarCandidatos(f: FiltrosLista) {
  const contas = await carregarContasAfiliado()
  const itens: Candidato[] = []

  // ── produtos ──
  {
    let q = supabaseAdmin
      .from('produtos')
      .select(COLS_PRODUTO)
      .eq('ativo', true)
      .gte('created_at', f.desde)
      .order('created_at', { ascending: false })
      .limit(Math.min(f.limite * 3, 1500))
    if (f.status === 'pendente' || f.status === 'rejeitado') q = q.eq('aprovacao_status', f.status)
    else if (f.status === 'aprovado' || f.status === 'disparado') q = q.eq('aprovacao_status', 'aprovado')
    else if (f.status === 'fila') q = q.in('aprovacao_status', ['pendente', 'aprovado'])
    if (f.nicho === 'sem') q = q.is('nicho', null)
    else if (f.nicho) q = q.in('nicho', nichoComLegados(f.nicho))
    if (f.origem === 'grupo') q = q.like('produto_id_externo', 'garimpo_%')
    else if (f.origem === 'busca') q = q.or('produto_id_externo.is.null,produto_id_externo.not.like.garimpo_*')

    const { data, error } = await q
    if (error) throw new Error(error.message)
    for (const p of data || []) {
      const situacao = situacaoProduto(p)
      if (!passaStatus(situacao, f.status)) continue
      itens.push({
        chave: `p:${p.id}`,
        fonte: 'produto',
        origem: String(p.produto_id_externo || '').startsWith('garimpo_') ? 'grupo' : 'busca',
        id: p.id,
        titulo: p.titulo,
        preco: p.preco,
        preco_original: p.preco_original,
        desconto_percent: p.desconto_percent,
        plataforma: p.plataforma,
        loja_nome: p.loja_nome,
        thumbnail: p.thumbnail,
        link_afiliado: p.link_afiliado,
        link_original: p.link_original,
        nicho: normalizarNicho(p.nicho) ?? p.nicho,
        nicho_detectado: false,
        situacao,
        aprovado_em: p.aprovado_em,
        ultimo_disparo_em: disparoReal(p.ultimo_disparo_em),
        criado_em: p.created_at,
        cupom: null,
        link_conta_atual: linkEhDaContaAtual(p.plataforma, p.link_afiliado, contas),
      })
    }
  }

  // ── garimpados ainda nao promovidos ──
  const statusGarimpado = f.status === 'fila' || f.status === 'pendente' || f.status === 'todos' || f.status === 'rejeitado'
  if (f.origem !== 'busca' && statusGarimpado) {
    let q = supabaseAdmin
      .from('produtos_garimpados')
      .select(COLS_GARIMPADO)
      .is('produto_id', null)
      .gte('criado_em', f.desde)
      .order('criado_em', { ascending: false })
      .limit(Math.min(f.limite * 3, 1500))
    if (f.status === 'rejeitado') q = q.eq('aprovacao_status', 'rejeitado')
    else if (f.status !== 'todos') q = q.eq('aprovacao_status', 'pendente')

    const { data, error } = await q
    if (error) throw new Error(error.message)
    for (const g of data || []) {
      const salvo = normalizarNicho(g.nicho)
      const nicho: Nicho | null = salvo ?? detectarNichoRegex(g.titulo || '')
      if (!passaNicho(nicho, f.nicho)) continue
      itens.push({
        chave: `g:${g.id}`,
        fonte: 'garimpado',
        origem: 'grupo',
        id: g.id,
        titulo: g.titulo,
        preco: g.preco,
        preco_original: g.preco_original,
        desconto_percent: g.desconto_percent,
        plataforma: g.plataforma,
        loja_nome: null,
        thumbnail: g.thumbnail,
        link_afiliado: g.link_afiliado,
        link_original: g.link_original,
        nicho,
        nicho_detectado: !salvo && !!nicho,
        situacao: g.aprovacao_status === 'rejeitado' ? 'rejeitado' : 'pendente',
        aprovado_em: null,
        ultimo_disparo_em: null,
        criado_em: g.criado_em,
        cupom: g.cupom,
        link_conta_atual: linkEhDaContaAtual(g.plataforma, g.link_afiliado, contas),
      })
    }
  }

  itens.sort((a, b) => b.criado_em.localeCompare(a.criado_em))
  return { itens: itens.slice(0, f.limite), total: itens.length, contas }
}

// ─── Acoes ────────────────────────────────────────────────────────────────────

function separar(chaves: string[]) {
  const p: string[] = []
  const g: string[] = []
  for (const c of chaves) {
    const [tipo, id] = String(c).split(':')
    if (!id || !/^[0-9a-f-]{36}$/i.test(id)) continue
    if (tipo === 'p') p.push(id)
    else if (tipo === 'g') g.push(id)
  }
  return { p, g }
}

export interface ResultadoAcao { ok: number; erros: { chave: string; erro: string }[] }

async function aprovarProdutos(ids: string[], quem: string, contas: ContasAfiliado, r: ResultadoAcao) {
  if (!ids.length) return
  const { data, error } = await supabaseAdmin
    .from('produtos')
    .select('id, plataforma, link_afiliado, link_original, ultimo_disparo_em')
    .in('id', ids)
  if (error) throw new Error(error.message)
  const agora = agoraISO()
  for (const p of data || []) {
    const upd: Record<string, string | null> = { aprovacao_status: 'aprovado', aprovado_em: agora, aprovado_por: quem }
    // Trava 2099 dos itens manuais: aprovar libera.
    if (p.ultimo_disparo_em && new Date(p.ultimo_disparo_em).getTime() > Date.now()) upd.ultimo_disparo_em = null
    // Link de outra conta (ou sem afiliado): refaz com a conta atual.
    if (linkEhDaContaAtual(p.plataforma, p.link_afiliado, contas) === false && p.link_original) {
      const novo = await gerarLinkContaAtual(p.plataforma, p.link_original, contas)
      if (novo) upd.link_afiliado = novo
    }
    const { error: e } = await supabaseAdmin.from('produtos').update(upd).eq('id', p.id)
    if (e) r.erros.push({ chave: `p:${p.id}`, erro: e.message })
    else r.ok++
  }
}

async function aprovarGarimpados(ids: string[], quem: string, contas: ContasAfiliado, r: ResultadoAcao) {
  if (!ids.length) return
  const { data, error } = await supabaseAdmin
    .from('produtos_garimpados')
    .select('id, titulo, preco, preco_original, desconto_percent, plataforma, thumbnail, link_afiliado, link_original, nicho, produto_id')
    .in('id', ids)
  if (error) throw new Error(error.message)
  const agora = agoraISO()
  for (const g of data || []) {
    const chave = `g:${g.id}`
    if (g.produto_id) { r.ok++; continue }
    if (!g.thumbnail) { r.erros.push({ chave, erro: 'sem foto' }); continue }

    // Garimpados antigos tem link de ML quebrado (meli.la virou /2sLSLBW):
    // sempre refaz a partir do link original com a conta atual.
    const novo = g.link_original ? await gerarLinkContaAtual(g.plataforma, g.link_original, contas) : null
    const link = novo || (linkEhDaContaAtual(g.plataforma, g.link_afiliado, contas) !== false ? g.link_afiliado : null)
    if (!link) { r.erros.push({ chave, erro: 'não consegui gerar o link de afiliado' }); continue }

    const nicho = normalizarNicho(g.nicho) ?? detectarNichoRegex(g.titulo || '')
    const desconto = g.desconto_percent || 0
    const { data: prod, error: e1 } = await supabaseAdmin
      .from('produtos')
      .upsert({
        produto_id_externo: `garimpo_${g.id}`,
        plataforma: g.plataforma,
        titulo: g.titulo,
        preco: g.preco ?? 0,
        preco_original: g.preco_original || g.preco || 0,
        desconto_percent: desconto,
        link_original: g.link_original,
        link_afiliado: link,
        thumbnail: g.thumbnail,
        nicho,
        ativo: true,
        score: desconto ? Math.min(desconto + 30, 100) : 50,
        aprovacao_status: 'aprovado',
        aprovado_em: agora,
        aprovado_por: quem,
      }, { onConflict: 'produto_id_externo,plataforma' })
      .select('id')
      .single()
    if (e1 || !prod) { r.erros.push({ chave, erro: e1?.message || 'falha ao criar produto' }); continue }

    await supabaseAdmin
      .from('produtos_garimpados')
      .update({ aprovacao_status: 'aprovado', produto_id: prod.id, nicho })
      .eq('id', g.id)
    r.ok++
  }
}

export async function aplicarAcao(
  acao: 'aprovar' | 'desmarcar' | 'rejeitar',
  chaves: string[],
  quem: string
): Promise<ResultadoAcao> {
  const { p, g } = separar(chaves)
  const r: ResultadoAcao = { ok: 0, erros: [] }

  if (acao === 'aprovar') {
    const contas = await carregarContasAfiliado()
    await aprovarProdutos(p, quem, contas, r)
    await aprovarGarimpados(g, quem, contas, r)
    return r
  }

  const status = acao === 'rejeitar' ? 'rejeitado' : 'pendente'
  if (p.length) {
    const { error, count } = await supabaseAdmin
      .from('produtos')
      .update({ aprovacao_status: status, aprovado_em: null, aprovado_por: null }, { count: 'exact' })
      .in('id', p)
    if (error) r.erros.push({ chave: 'produtos', erro: error.message })
    else r.ok += count || 0
  }
  if (g.length) {
    const { error, count } = await supabaseAdmin
      .from('produtos_garimpados')
      .update({ aprovacao_status: status }, { count: 'exact' })
      .in('id', g)
      .is('produto_id', null)
    if (error) r.erros.push({ chave: 'garimpados', erro: error.message })
    else r.ok += count || 0
  }
  return r
}

export async function mudarNicho(chave: string, nicho: string | null) {
  if (nicho !== null && !isNichoValido(nicho)) throw new Error('Categoria inválida')
  const { p, g } = separar([chave])
  if (p.length) {
    const { error } = await supabaseAdmin.from('produtos').update({ nicho }).eq('id', p[0])
    if (error) throw new Error(error.message)
    return
  }
  if (g.length) {
    const { error } = await supabaseAdmin.from('produtos_garimpados').update({ nicho }).eq('id', g[0])
    if (error) throw new Error(error.message)
    return
  }
  throw new Error('Item inválido')
}

/** Quantos aprovados ainda nao sairam (a fila do botao "Disparar agora"). */
export async function contarAprovadosNaFila(): Promise<number> {
  const { data } = await supabaseAdmin
    .from('produtos')
    .select('aprovado_em, ultimo_disparo_em')
    .eq('ativo', true)
    .eq('aprovacao_status', 'aprovado')
    .limit(1000)
  return (data || []).filter(p => situacaoProduto({ aprovacao_status: 'aprovado', ...p }) === 'aprovado').length
}
