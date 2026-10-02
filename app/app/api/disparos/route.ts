import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { gerarAbertura } from '@/lib/dispatcher'
import { MSG_SEM_GRUPO, escolhaExplicita, grupoGeral, resolverAlvos, type GrupoBase } from '@/lib/grupos-alvo'
import { carregarCredenciais, enviarParaGrupo, type ProdutoMsg, type ResultadoGrupo } from '@/lib/envio-grupo'

// GET — lista disparos com filtros opcionais
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const produto_id = searchParams.get('produto_id')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')
  const status = searchParams.get('status')
  const canal = searchParams.get('canal')
  const de = searchParams.get('de')
  const ate = searchParams.get('ate')

  let query = supabaseAdmin
    .from('disparos')
    .select('*', { count: 'exact' })
    .order('disparado_em', { ascending: false })
    .range(offset, offset + limit - 1)

  if (produto_id) query = query.eq('produto_id', produto_id)
  if (status) query = query.eq('status', status)
  if (canal) query = query.eq('canal', canal)
  if (de) query = query.gte('disparado_em', de + 'T00:00:00')
  if (ate) query = query.lte('disparado_em', ate + 'T23:59:59')

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ disparos: data || [], total: count || 0 })
}

// DELETE — remove disparos por período ou IDs
export async function DELETE(request: Request) {
  try {
    const body = await request.json()
    const { ids, de, ate } = body

    if (ids?.length) {
      const { error } = await supabaseAdmin.from('disparos').delete().in('id', ids)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true, removidos: ids.length })
    }

    if (de || ate) {
      let q = supabaseAdmin.from('disparos').delete()
      if (de) q = q.gte('disparado_em', de + 'T00:00:00')
      if (ate) q = q.lte('disparado_em', ate + 'T23:59:59')
      const { error } = await q
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Informe ids ou de/ate' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — disparo MANUAL de produto(s) para grupos.
//
// Corpo:
//   produto_ids: string[]                       (obrigatorio)
//   grupos_por_produto?: { [produto_id]: string[] }  escolha por produto (tela)
//   grupo_ids?: string[]                        escolha unica p/ todos
//   dry?: boolean                               so calcula os alvos, NAO envia
// Escolha explicita vence o filtro de categoria. Sem escolha: grupos compativeis
// com a categoria (grupo sem categoria = geral; produto sem categoria so vai p/ geral).
// 0 alvos => 400 com MSG_SEM_GRUPO. 0 enviados => 502. Nunca "sucesso" sem envio.
const CAMPOS_PRODUTO = 'id, titulo, preco, preco_original, desconto_percent, plataforma, link_afiliado, link_original, thumbnail, nicho, frete_gratis, loja_nome'

interface ProdutoDisparo {
  id: string
  titulo: string | null
  nicho: string | null
  fonte: 'produto' | 'garimpado'
  [k: string]: unknown
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const produto_ids: unknown = body?.produto_ids
    const dry = body?.dry === true

    if (!Array.isArray(produto_ids) || !produto_ids.length) {
      return NextResponse.json({ error: 'produto_ids é obrigatório' }, { status: 400 })
    }

    // Busca produtos de ambas as tabelas (produtos + garimpados)
    const { data: produtosApi, error: prodErr } = await supabaseAdmin
      .from('produtos')
      .select(CAMPOS_PRODUTO)
      .in('id', produto_ids)
    if (prodErr) return NextResponse.json({ error: prodErr.message }, { status: 500 })

    const idsEncontrados = new Set((produtosApi || []).map(p => p.id))
    const idsFaltantes = produto_ids.filter((id: string) => !idsEncontrados.has(id))

    let produtosGarimp: ProdutoDisparo[] = []
    if (idsFaltantes.length > 0) {
      const { data: garimps } = await supabaseAdmin
        .from('produtos_garimpados')
        .select('id, titulo, preco, preco_original, desconto_percent, plataforma, link_afiliado, link_original, thumbnail, cupom')
        .in('id', idsFaltantes)
      produtosGarimp = (garimps || []).map(g => ({
        ...g, nicho: null, frete_gratis: false, loja_nome: null, fonte: 'garimpado' as const,
      }))
    }

    const produtos: ProdutoDisparo[] = [
      ...(produtosApi || []).map(p => ({ ...p, fonte: 'produto' as const })),
      ...produtosGarimp,
    ]
    if (!produtos.length) return NextResponse.json({ error: 'Nenhum produto encontrado' }, { status: 404 })

    const { data: gruposData, error: grupoErr } = await supabaseAdmin
      .from('grupos')
      .select('id, nome, canal, grupo_id, nichos')
      .eq('ativo', true)
      .order('created_at', { ascending: true })
    if (grupoErr) return NextResponse.json({ error: grupoErr.message }, { status: 500 })
    const grupos = (gruposData || []) as GrupoBase[]
    const gruposResp = grupos.map(g => ({ id: g.id, nome: g.nome, canal: g.canal, nichos: g.nichos, geral: grupoGeral(g) }))

    const plano = produtos.map(p => ({
      produto: p,
      alvos: resolverAlvos(grupos, p.nicho, escolhaExplicita(p.id, body)),
    }))
    const totalAlvos = plano.reduce((s, x) => s + x.alvos.length, 0)
    const produtosResp = plano.map(({ produto, alvos }) => ({
      id: produto.id,
      titulo: produto.titulo,
      nicho: produto.nicho,
      fonte: produto.fonte,
      alvos: alvos.map(g => ({ grupo: g.id, grupo_nome: g.nome, canal: g.canal })),
      sem_grupo: alvos.length === 0,
    }))

    if (dry) {
      return NextResponse.json({ ok: true, dry: true, grupos: gruposResp, produtos: produtosResp, total_alvos: totalAlvos })
    }

    if (!grupos.length) return NextResponse.json({ error: 'Nenhum grupo ativo configurado', grupos: gruposResp }, { status: 400 })
    if (totalAlvos === 0) {
      return NextResponse.json({ error: MSG_SEM_GRUPO, grupos: gruposResp, produtos: produtosResp, enviados: 0, erros: 0, total: 0 }, { status: 400 })
    }

    const cred = await carregarCredenciais()
    const registros: Record<string, unknown>[] = []
    const resultadosPorProduto: Record<string, ResultadoGrupo[]> = {}
    const enviadosProdutos: string[] = []
    let totalEnviados = 0
    let totalErros = 0

    for (const { produto, alvos } of plano) {
      resultadosPorProduto[produto.id] = []
      if (!alvos.length) continue
      const msg = produto as unknown as ProdutoMsg
      // Chama Gemini UMA vez por produto — reutiliza para todos os grupos
      const abertura = await gerarAbertura(msg)

      for (const grupo of alvos) {
        const r = await enviarParaGrupo(grupo, msg, abertura, cred)
        resultadosPorProduto[produto.id].push(r)
        if (r.status === 'enviado') totalEnviados++
        else totalErros++
        registros.push({
          produto_id: produto.id,
          canal: grupo.canal,
          grupo_id: grupo.grupo_id,
          grupo_nome: grupo.nome,
          mensagem: abertura,
          status: r.status,
          erro: r.erro || null,
          disparado_em: new Date().toISOString(),
        })
        await new Promise(res => setTimeout(res, 300))
      }
      if (produto.fonte === 'produto' && resultadosPorProduto[produto.id].some(r => r.status === 'enviado')) {
        enviadosProdutos.push(produto.id)
      }
    }

    if (registros.length > 0) {
      const { error: insErr } = await supabaseAdmin.from('disparos').insert(registros)
      if (insErr) console.error('[Disparo manual] falha ao gravar disparos:', insErr.message)
    }
    // Alimenta o anti-repost de 48h do disparo dos aprovados.
    if (enviadosProdutos.length) {
      await supabaseAdmin.from('produtos').update({ ultimo_disparo_em: new Date().toISOString() }).in('id', enviadosProdutos)
    }

    const resposta = {
      ok: totalEnviados > 0,
      enviados: totalEnviados,
      erros: totalErros,
      total: registros.length,
      grupos: gruposResp,
      produtos: produtosResp.map(p => ({ ...p, resultados: resultadosPorProduto[p.id] || [] })),
    }
    if (totalEnviados === 0) {
      return NextResponse.json({ ...resposta, error: 'Nada foi enviado — todos os envios falharam (veja o erro de cada grupo)' }, { status: 502 })
    }
    return NextResponse.json(resposta)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 })
  }
}
