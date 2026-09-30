// Disparo SOMENTE dos produtos aprovados na tela /admin/aprovar.
//
// Usado pelo cron (/api/cron/disparar) e pelo botao "Disparar agora os aprovados".
// Regras:
//  - so produtos com aprovacao_status='aprovado' que ainda nao sairam depois da
//    aprovacao (ultimo_disparo_em nulo ou anterior a aprovado_em);
//  - anti-repost mantido: nada que saiu nas ultimas 48h, nem titulo >=60%
//    parecido com algo que saiu nas ultimas 48h, nem palavra bloqueada;
//  - produto vai so para os grupos da categoria dele (grupo sem categoria
//    recebe tudo). Sem grupo da categoria -> fica na fila, nao e marcado;
//  - cada produto e "reservado" no banco antes de enviar (UPDATE condicional),
//    entao dois disparos ao mesmo tempo nao mandam o mesmo produto duas vezes;
//  - se TODOS os envios de um produto falharem, a reserva e desfeita e ele
//    continua na fila.

import { supabaseAdmin } from '@/lib/supabase'
import { sendTelegram, sendWhatsApp, gerarAbertura } from '@/lib/dispatcher'
import { normalizarNicho } from '@/lib/nicho'

const JANELA_ANTI_REPOST_H = 48

function normalizarTitulo(titulo: string): string {
  return titulo
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

const STOP = new Set(['de', 'do', 'da', 'dos', 'das', 'com', 'para', 'por', 'em', 'e', 'a', 'o', 'um', 'uma', 'no', 'na', 'ao', 'os', 'as'])

function palavrasChave(titulo: string): Set<string> {
  return new Set(normalizarTitulo(titulo).split(' ').filter(w => w.length > 2 && !STOP.has(w)))
}

export function titulosSimilares(t1: string, t2: string): boolean {
  const a = palavrasChave(t1)
  const b = palavrasChave(t2)
  if (a.size === 0 || b.size === 0) return false
  let inter = 0
  for (const w of a) if (b.has(w)) inter++
  return inter / Math.min(a.size, b.size) >= 0.6
}

type ProdutoMsg = Parameters<typeof gerarAbertura>[0]

interface Grupo { id: string; nome: string; canal: string; grupo_id: string; nichos: string[] | null; ativo: boolean }

function gruposDoProduto(grupos: Grupo[], nicho: string | null): Grupo[] {
  const n = normalizarNicho(nicho)
  return grupos.filter(g => !g.nichos?.length || (n !== null && g.nichos.includes(n)))
}

export interface ResumoDisparo {
  enviados: number
  erros: number
  produtos: { id: string; titulo: string; nicho: string | null; grupos_ok: number; grupos_erro: number; erro?: string }[]
  na_fila: number
  pulados: { anti_repost_48h: number; similar_48h: number; palavra_bloqueada: number; sem_grupo: number }
  motivo?: string
}

export async function dispararAprovados(opts: {
  limite: number
  palavrasBloqueadas?: string[]
}): Promise<ResumoDisparo> {
  const resumo: ResumoDisparo = {
    enviados: 0, erros: 0, produtos: [], na_fila: 0,
    pulados: { anti_repost_48h: 0, similar_48h: 0, palavra_bloqueada: 0, sem_grupo: 0 },
  }

  const { data: gruposData } = await supabaseAdmin.from('grupos').select('*').eq('ativo', true)
  const grupos = (gruposData || []) as Grupo[]
  if (!grupos.length) return { ...resumo, motivo: 'Nenhum grupo ativo cadastrado' }

  const { data: aprovados, error } = await supabaseAdmin
    .from('produtos')
    .select('id, titulo, preco, preco_original, desconto_percent, plataforma, link_afiliado, link_original, thumbnail, nicho, frete_gratis, loja_nome, aprovado_em, ultimo_disparo_em')
    .eq('ativo', true)
    .eq('aprovacao_status', 'aprovado')
    .order('aprovado_em', { ascending: true })
    .limit(500)
  if (error) return { ...resumo, motivo: error.message }

  const agora = Date.now()
  const limite48 = agora - JANELA_ANTI_REPOST_H * 3600 * 1000
  const naFila = (aprovados || []).filter(p =>
    !p.ultimo_disparo_em || !p.aprovado_em || new Date(p.ultimo_disparo_em) < new Date(p.aprovado_em)
  )
  resumo.na_fila = naFila.length
  if (!naFila.length) return { ...resumo, motivo: 'Nenhum produto aprovado na fila' }

  // Tudo que saiu nas ultimas 48h (qualquer origem) — base do anti-repost por titulo
  const { data: recentes } = await supabaseAdmin
    .from('produtos')
    .select('id, titulo')
    .gte('ultimo_disparo_em', new Date(limite48).toISOString())
    .lte('ultimo_disparo_em', new Date(agora).toISOString())
  const titulosRecentes = (recentes || []).map(r => r.titulo || '')

  const bloqueadas = (opts.palavrasBloqueadas || []).map(w => w.toLowerCase()).filter(Boolean)
  const escolhidos: typeof naFila = []
  for (const p of naFila) {
    if (escolhidos.length >= opts.limite) break
    const titulo = (p.titulo || '').toLowerCase()
    if (p.ultimo_disparo_em && new Date(p.ultimo_disparo_em).getTime() > limite48) { resumo.pulados.anti_repost_48h++; continue }
    if (bloqueadas.some(w => titulo.includes(w))) { resumo.pulados.palavra_bloqueada++; continue }
    if (!gruposDoProduto(grupos, p.nicho).length) { resumo.pulados.sem_grupo++; continue }
    if (titulosRecentes.some(t => titulosSimilares(p.titulo || '', t)) ||
        escolhidos.some(e => titulosSimilares(p.titulo || '', e.titulo || ''))) { resumo.pulados.similar_48h++; continue }
    escolhidos.push(p)
  }
  if (!escolhidos.length) return { ...resumo, motivo: 'Aprovados na fila, mas todos barrados pelas regras (ver "pulados")' }

  const { data: configs } = await supabaseAdmin
    .from('config_plataformas')
    .select('plataforma, credenciais')
    .in('plataforma', ['telegram_bot', 'evolution_api'])
  const telegramConfig = configs?.find(c => c.plataforma === 'telegram_bot')?.credenciais as
    { bot_token?: string } | null | undefined
  const evolutionConfig = configs?.find(c => c.plataforma === 'evolution_api')?.credenciais as
    { url?: string; api_key?: string; instance?: string } | null | undefined

  const registros: {
    produto_id: string; canal: string; grupo_id: string; grupo_nome: string
    mensagem: string; status: string; erro: string | null; disparado_em: string
  }[] = []

  for (const p of escolhidos) {
    // Reserva atomica: so segue se ninguem disparou este produto desde a leitura.
    const reservaEm = new Date().toISOString()
    let reserva = supabaseAdmin
      .from('produtos')
      .update({ ultimo_disparo_em: reservaEm })
      .eq('id', p.id)
      .eq('aprovacao_status', 'aprovado')
      .eq('aprovado_em', p.aprovado_em)
    reserva = p.ultimo_disparo_em
      ? reserva.eq('ultimo_disparo_em', p.ultimo_disparo_em)
      : reserva.is('ultimo_disparo_em', null)
    const { data: reservado } = await reserva.select('id')
    if (!reservado?.length) continue

    const alvo = gruposDoProduto(grupos, p.nicho)
    const produto = p as unknown as ProdutoMsg
    const abertura = await gerarAbertura(produto)
    let ok = 0
    let falhas = 0
    let ultimoErro = ''

    for (const grupo of alvo) {
      let status = 'enviado'
      let erro = ''
      if (grupo.canal === 'telegram') {
        if (!telegramConfig?.bot_token) { status = 'erro'; erro = 'Bot token não configurado' }
        else {
          const r = await sendTelegram(telegramConfig.bot_token, grupo.grupo_id, produto, abertura)
          if (!r.ok) { status = 'erro'; erro = r.error || 'Erro desconhecido' }
        }
      } else if (grupo.canal === 'whatsapp') {
        if (!evolutionConfig?.url || !evolutionConfig?.api_key || !evolutionConfig?.instance) {
          status = 'erro'; erro = 'Evolution API não configurada'
        } else {
          const r = await sendWhatsApp(evolutionConfig.url, evolutionConfig.api_key, evolutionConfig.instance, grupo.grupo_id, produto, abertura)
          if (!r.ok) { status = 'erro'; erro = r.error || 'Erro desconhecido' }
        }
      }
      if (status === 'enviado') { ok++; resumo.enviados++ } else { falhas++; resumo.erros++; ultimoErro = erro }
      registros.push({
        produto_id: p.id,
        canal: grupo.canal,
        grupo_id: grupo.grupo_id,
        grupo_nome: grupo.nome,
        mensagem: abertura,
        status,
        erro: erro || null,
        disparado_em: new Date().toISOString(),
      })
      await new Promise(r => setTimeout(r, 500))
    }

    if (ok === 0) {
      // Nada saiu: devolve o produto para a fila.
      await supabaseAdmin
        .from('produtos')
        .update({ ultimo_disparo_em: p.ultimo_disparo_em })
        .eq('id', p.id)
        .eq('ultimo_disparo_em', reservaEm)
    }

    resumo.produtos.push({
      id: p.id, titulo: p.titulo, nicho: p.nicho, grupos_ok: ok, grupos_erro: falhas,
      ...(ok === 0 && ultimoErro ? { erro: ultimoErro.slice(0, 200) } : {}),
    })
    await new Promise(r => setTimeout(r, 1000))
  }

  if (registros.length) await supabaseAdmin.from('disparos').insert(registros)
  return resumo
}
