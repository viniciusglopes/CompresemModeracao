import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { sendTelegram, sendWhatsApp, gerarAbertura } from '@/lib/dispatcher'

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

// POST — dispara produto(s) para grupos
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { produto_ids, grupo_ids } = body
    // grupo_ids opcional: se não passado, envia para todos os grupos ativos

    if (!produto_ids?.length) {
      return NextResponse.json({ error: 'produto_ids é obrigatório' }, { status: 400 })
    }

    // Busca produtos
    const { data: produtos, error: prodErr } = await supabaseAdmin
      .from('produtos')
      .select('id, titulo, preco, preco_original, desconto_percent, plataforma, link_afiliado, link_original, thumbnail, nicho, frete_gratis, loja_nome')
      .in('id', produto_ids)

    if (prodErr) return NextResponse.json({ error: prodErr.message }, { status: 500 })
    if (!produtos?.length) return NextResponse.json({ error: 'Nenhum produto encontrado' }, { status: 404 })

    // Busca grupos ativos
    let gruposQuery = supabaseAdmin.from('grupos').select('*').eq('ativo', true)
    if (grupo_ids?.length) gruposQuery = gruposQuery.in('id', grupo_ids)
    const { data: grupos, error: grupoErr } = await gruposQuery
    if (grupoErr) return NextResponse.json({ error: grupoErr.message }, { status: 500 })
    if (!grupos?.length) return NextResponse.json({ error: 'Nenhum grupo ativo configurado' }, { status: 400 })

    // Busca config de credenciais
    const { data: configs } = await supabaseAdmin
      .from('config_plataformas')
      .select('plataforma, credenciais')
      .in('plataforma', ['telegram_bot', 'evolution_api'])

    const telegramConfig = configs?.find(c => c.plataforma === 'telegram_bot')?.credenciais as any
    const evolutionConfig = configs?.find(c => c.plataforma === 'evolution_api')?.credenciais as any

    const registros: any[] = []
    let totalEnviados = 0
    let totalErros = 0

    for (const produto of produtos) {
      // Chama Gemini UMA vez por produto — reutiliza para todas as plataformas
      const abertura = await gerarAbertura(produto)
      console.log(`[Disparo] produto=${produto.id} abertura="${abertura}"`)

      for (const grupo of grupos) {
        // Verifica filtro de nicho do grupo
        if (grupo.nichos?.length && !grupo.nichos.includes(produto.nicho)) continue

        let status = 'enviado'
        let erro = ''

        if (grupo.canal === 'telegram') {
          if (!telegramConfig?.bot_token) {
            status = 'erro'
            erro = 'Bot token do Telegram não configurado'
          } else {
            const result = await sendTelegram(telegramConfig.bot_token, grupo.grupo_id, produto, abertura)
            if (!result.ok) { status = 'erro'; erro = result.error || 'Erro desconhecido' }
          }
        } else if (grupo.canal === 'whatsapp') {
          if (!evolutionConfig?.url || !evolutionConfig?.api_key || !evolutionConfig?.instance) {
            status = 'erro'
            erro = 'Evolution API não configurada'
          } else {
            const result = await sendWhatsApp(
              evolutionConfig.url,
              evolutionConfig.api_key,
              evolutionConfig.instance,
              grupo.grupo_id,
              produto,
              abertura
            )
            if (!result.ok) { status = 'erro'; erro = result.error || 'Erro desconhecido' }
          }
        }

        if (status === 'enviado') totalEnviados++
        else totalErros++

        registros.push({
          produto_id: produto.id,
          canal: grupo.canal,
          grupo_id: grupo.grupo_id,
          grupo_nome: grupo.nome,
          mensagem: '',
          status,
          erro: erro || null,
          disparado_em: new Date().toISOString(),
        })

        // Pequena pausa entre envios para evitar rate limit
        await new Promise(r => setTimeout(r, 300))
      }
    }

    if (registros.length > 0) {
      await supabaseAdmin.from('disparos').insert(registros)
    }

    return NextResponse.json({ ok: true, enviados: totalEnviados, erros: totalErros, total: registros.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
