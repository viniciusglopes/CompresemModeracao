// Envio de UM produto para UM grupo (Telegram ou WhatsApp/Evolution).
// Usado pelo disparo manual (/api/disparos) e pelo disparo dos aprovados.

import { supabaseAdmin } from '@/lib/supabase'
import { sendTelegram, sendWhatsApp, gerarAbertura } from '@/lib/dispatcher'
import type { GrupoBase } from '@/lib/grupos-alvo'

export type ProdutoMsg = Parameters<typeof gerarAbertura>[0]

export interface Credenciais {
  telegram?: { bot_token?: string } | null
  evolution?: { url?: string; api_key?: string; instance?: string } | null
}

/** Resultado de um envio, como volta para a tela. */
export interface ResultadoGrupo {
  grupo: string // id da linha em `grupos`
  grupo_nome: string
  canal: string
  status: 'enviado' | 'erro'
  erro?: string
}

export async function carregarCredenciais(): Promise<Credenciais> {
  const { data: configs } = await supabaseAdmin
    .from('config_plataformas')
    .select('plataforma, credenciais')
    .in('plataforma', ['telegram_bot', 'evolution_api'])
  return {
    telegram: configs?.find(c => c.plataforma === 'telegram_bot')?.credenciais as Credenciais['telegram'],
    evolution: configs?.find(c => c.plataforma === 'evolution_api')?.credenciais as Credenciais['evolution'],
  }
}

export async function enviarParaGrupo(
  grupo: GrupoBase,
  produto: ProdutoMsg,
  abertura: string,
  cred: Credenciais,
): Promise<ResultadoGrupo> {
  const base = { grupo: grupo.id, grupo_nome: grupo.nome, canal: grupo.canal }
  try {
    if (grupo.canal === 'telegram') {
      if (!cred.telegram?.bot_token) return { ...base, status: 'erro', erro: 'Bot token do Telegram não configurado' }
      const r = await sendTelegram(cred.telegram.bot_token, grupo.grupo_id, produto, abertura)
      return r.ok ? { ...base, status: 'enviado' } : { ...base, status: 'erro', erro: r.error || 'Erro desconhecido' }
    }
    if (grupo.canal === 'whatsapp') {
      const ev = cred.evolution
      if (!ev?.url || !ev?.api_key || !ev?.instance) return { ...base, status: 'erro', erro: 'Evolution API não configurada' }
      const r = await sendWhatsApp(ev.url, ev.api_key, ev.instance, grupo.grupo_id, produto, abertura)
      return r.ok ? { ...base, status: 'enviado' } : { ...base, status: 'erro', erro: r.error || 'Erro desconhecido' }
    }
    return { ...base, status: 'erro', erro: `Canal desconhecido: ${grupo.canal}` }
  } catch (e: unknown) {
    return { ...base, status: 'erro', erro: e instanceof Error ? e.message : String(e) }
  }
}
