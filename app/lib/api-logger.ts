import { supabaseAdmin } from '@/lib/supabase'

interface LogParams {
  plataforma: string
  endpoint: string
  metodo?: string
  status: 'success' | 'error' | 'rate_limit'
  http_status?: number
  duracao_ms?: number
  nicho?: string
  total_encontrados?: number
  salvos?: number
  erro?: string
  detalhes?: Record<string, any>
  request_json?: Record<string, any>
  response_json?: Record<string, any>
}

export async function logApi(params: LogParams) {
  try {
    await supabaseAdmin.from('api_logs').insert({
      plataforma: params.plataforma,
      endpoint: params.endpoint,
      metodo: params.metodo || 'POST',
      status: params.status,
      http_status: params.http_status,
      duracao_ms: params.duracao_ms,
      nicho: params.nicho,
      total_encontrados: params.total_encontrados,
      salvos: params.salvos,
      erro: params.erro,
      detalhes: params.detalhes,
      request_json: params.request_json ?? null,
      response_json: params.response_json ?? null,
      criado_em: new Date().toISOString(),
    })

    // Cria notificação admin para erros e rate limits
    if (params.status === 'rate_limit') {
      await notificar({
        tipo: 'rate_limit',
        titulo: `⏱️ Rate limit — ${params.plataforma}`,
        mensagem: `Limite de chamadas atingido${params.nicho ? ` (${params.nicho})` : ''}. Aguarde ~1h.`,
        plataforma: params.plataforma,
      })
    } else if (params.status === 'error' && params.erro) {
      await notificar({
        tipo: 'error',
        titulo: `❌ Erro — ${params.plataforma}`,
        mensagem: params.erro,
        plataforma: params.plataforma,
      })
    }
  } catch {
    // silencioso
  }
}

interface NotifParams {
  tipo: 'error' | 'rate_limit' | 'warning' | 'info'
  titulo: string
  mensagem?: string
  plataforma?: string
}

export async function notificar(params: NotifParams) {
  try {
    // Evita duplicar rate_limit em menos de 30 min para a mesma plataforma
    if (params.tipo === 'rate_limit') {
      const corte = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      const { data } = await supabaseAdmin
        .from('admin_notificacoes')
        .select('id')
        .eq('tipo', 'rate_limit')
        .eq('plataforma', params.plataforma || '')
        .gte('criado_em', corte)
        .limit(1)
      if (data && data.length > 0) return // já notificou recentemente
    }

    await supabaseAdmin.from('admin_notificacoes').insert({
      tipo: params.tipo,
      titulo: params.titulo,
      mensagem: params.mensagem || '',
      plataforma: params.plataforma || '',
      lida: false,
      criado_em: new Date().toISOString(),
    })
  } catch {
    // silencioso
  }
}
