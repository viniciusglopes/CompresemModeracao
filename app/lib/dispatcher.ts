// Dispatcher: envia mensagens de oferta para Telegram e WhatsApp
import { supabaseAdmin } from '@/lib/supabase'

interface Produto {
  id: string
  titulo: string
  preco: number
  preco_original: number
  desconto_percent: number
  plataforma: string
  link_afiliado: string
  link_original: string
  thumbnail: string
  nicho: string
  frete_gratis: boolean
  loja_nome?: string
}

interface Grupo {
  id: string
  nome: string
  canal: 'telegram' | 'whatsapp'
  grupo_id: string
  ativo: boolean
  nichos: string[] | null
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

// ── Gemini: gera abertura criativa ────────────────────────────────────────────

export async function gerarAbertura(produto: Produto): Promise<string> {
  try {
    const { data } = await supabaseAdmin
      .from('config_plataformas')
      .select('credenciais, ativo')
      .eq('plataforma', 'gemini')
      .single()

    if (!data?.ativo || !data?.credenciais?.api_key) return ''

    const apiKey = data.credenciais.api_key
    const prompt = `Você é uma copywriter de ofertas para grupos femininos de WhatsApp e Telegram no Brasil.
Crie UMA linha de abertura criativa e empolgante para esse produto em promoção.
Regras:
- Máximo 6 palavras em maiúsculas + 1 emoji relacionado
- Formato: *TEXTO EM MAIÚSCULAS* emoji
- Sem ponto final, sem aspas
- Tom feminino, animado e direto (como se falasse com uma amiga)
- Use o contexto do produto (benefício, uso no dia-a-dia, beleza, praticidade)

Produto: ${produto.titulo}
Preço: ${fmt(produto.preco)} (${produto.desconto_percent}% OFF)

Responda APENAS com a linha de abertura, nada mais.`

    const modelos = ['gemini-2.5-flash', 'gemini-2.5-pro']
    const reqBody = { contents: [{ parts: [{ text: prompt }] }] }

    for (const modelo of modelos) {
      const inicio = Date.now()
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reqBody),
          signal: AbortSignal.timeout(20000),
        }
      )
      const duracao_ms = Date.now() - inicio
      const json = await res.json()

      // Se 503 (sobrecarga), tenta próximo modelo
      if (res.status === 503) {
        console.error(`[Gemini] ${modelo} com 503, tentando próximo...`)
        continue
      }

      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || ''
      const ok = res.ok && text.length > 0 && text.length < 80 && !text.includes('\n')

      await supabaseAdmin.from('api_logs').insert({
        plataforma: 'gemini',
        endpoint: modelo,
        metodo: 'POST',
        status: ok ? 'success' : 'error',
        http_status: res.status,
        duracao_ms,
        erro: ok ? null : (json?.error?.message || `texto inválido: ${JSON.stringify(text)}`),
        request_json: { produto_id: produto.id, produto_titulo: produto.titulo, prompt },
        response_json: ok ? { abertura: text } : json,
      }).then(({ error }) => { if (error) console.error('[api_logs] erro:', error.message) })

      if (ok) return text
      console.error(`[Gemini] ${modelo} falhou:`, json?.error?.message || JSON.stringify(text))
      break // erro que não é 503 → não adianta tentar outro modelo
    }

    console.error('[Gemini] todos os modelos falharam')
  } catch (e: any) {
    console.error('[Gemini] erro:', e?.message || e)
    await supabaseAdmin.from('api_logs').insert({
      plataforma: 'gemini', endpoint: 'generateContent', metodo: 'POST',
      status: 'error', erro: e?.message || String(e),
      request_json: { produto_id: produto.id },
    }).then(() => {})
  }
  return ''
}

async function encurtarLink(url: string): Promise<string> {
  try {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(url)}`, {
      signal: AbortSignal.timeout(5000),
    })
    if (res.ok) {
      const short = await res.text()
      if (short.startsWith('https://tinyurl.com/')) return short
    }
  } catch {}
  return url // fallback: retorna original se falhar
}

// Telegram usa HTML (suporta <b>, <s>, <a>)
// WhatsApp usa Markdown-like: *bold*, ~strike~
async function formatarMensagemTelegram(produto: Produto, abertura: string): Promise<string> {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const titulo = produto.titulo.length > 100 ? produto.titulo.slice(0, 100) + '...' : produto.titulo
  const link = produto.link_afiliado || produto.link_original

  // Converte *texto* → <b>texto</b> para Telegram HTML mode
  const aberturaHtml = abertura
    ? esc(abertura).replace(/\*([^*]+)\*/g, '<b>$1</b>')
    : ''
  let msg = aberturaHtml ? `${aberturaHtml}\n\n` : ''
  msg += `🔥 <b>${esc(titulo)}</b>\n\n`

  if (produto.desconto_percent > 0) {
    msg += `💸 De <s>${esc(fmt(produto.preco_original))}</s> por apenas <b>${esc(fmt(produto.preco))}</b>\n`
    msg += `🏷️ <b>${produto.desconto_percent}% OFF</b>`
    const economia = produto.preco_original - produto.preco
    if (economia > 0) msg += ` — economize ${esc(fmt(economia))}`
    msg += '\n'
  } else {
    msg += `💰 <b>${esc(fmt(produto.preco))}</b>\n`
  }

  if (produto.frete_gratis) msg += `🚚 Frete grátis\n`

  const plataformaEmoji: Record<string, string> = {
    mercadolivre: '🛒 Mercado Livre',
    shopee: '🧡 Shopee',
    amazon: '📦 Amazon',
    aliexpress: '🔴 AliExpress',
    lomadee: '🏬 Oferta Parceiro',
    awin: '🏪 ' + (produto.loja_nome || 'Loja Parceira'),
  }
  msg += `\n🏪 ${plataformaEmoji[produto.plataforma] || produto.plataforma}\n`
  msg += `\n👉 <a href="${link}">Comprar agora</a>`

  return msg
}

async function formatarMensagemWhatsApp(produto: Produto, abertura: string): Promise<string> {
  const titulo = produto.titulo.length > 100 ? produto.titulo.slice(0, 100) + '...' : produto.titulo
  const link = await encurtarLink(produto.link_afiliado || produto.link_original)

  let msg = abertura ? `${abertura}\n\n` : ''
  msg += `🔥 *${titulo}*\n\n`

  if (produto.desconto_percent > 0) {
    msg += `💸 De ~${fmt(produto.preco_original)}~ por apenas *${fmt(produto.preco)}*\n`
    msg += `🏷️ *${produto.desconto_percent}% OFF*`
    const economia = produto.preco_original - produto.preco
    if (economia > 0) msg += ` — economize ${fmt(economia)}`
    msg += '\n'
  } else {
    msg += `💰 *${fmt(produto.preco)}*\n`
  }

  if (produto.frete_gratis) msg += `🚚 Frete grátis\n`

  const plataformaEmoji: Record<string, string> = {
    mercadolivre: '🛒 Mercado Livre',
    shopee: '🧡 Shopee',
    amazon: '📦 Amazon',
    aliexpress: '🔴 AliExpress',
    lomadee: '🏬 Oferta Parceiro',
    awin: '🏪 ' + (produto.loja_nome || 'Loja Parceira'),
  }
  msg += `\n🏪 ${plataformaEmoji[produto.plataforma] || produto.plataforma}\n`
  msg += `\n👉 ${link}`

  return msg
}

// ── Telegram ──────────────────────────────────────────────────────────────────

export async function sendTelegram(botToken: string, chatId: string, produto: Produto, abertura = ''): Promise<{ ok: boolean; error?: string }> {
  const text = await formatarMensagemTelegram(produto, abertura)

  // Se tem thumbnail, envia como foto com caption
  if (produto.thumbnail) {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        photo: produto.thumbnail,
        caption: text,
        parse_mode: 'HTML',
      }),
    })
    const data = await res.json()
    if (!data.ok) {
      return sendTelegramTexto(botToken, chatId, text)
    }
    return { ok: true }
  }

  return sendTelegramTexto(botToken, chatId, text)
}

async function sendTelegramTexto(botToken: string, chatId: string, text: string): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: false }),
  })
  const data = await res.json()
  if (!data.ok) return { ok: false, error: data.description }
  return { ok: true }
}

// ── WhatsApp (Evolution API) ──────────────────────────────────────────────────

export async function sendWhatsApp(
  evolutionUrl: string,
  evolutionKey: string,
  instanceName: string,
  groupJid: string,
  produto: Produto,
  abertura = ''
): Promise<{ ok: boolean; error?: string }> {
  const text = await formatarMensagemWhatsApp(produto, abertura)

  try {
    // Se tem thumbnail, envia como foto com caption
    if (produto.thumbnail) {
      const imgRes = await fetch(`${evolutionUrl}/message/sendMedia/${instanceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
        body: JSON.stringify({
          number: groupJid,
          mediatype: 'image',
          media: produto.thumbnail,
          caption: text,
        }),
      })
      if (imgRes.ok) return { ok: true }
    }

    // Fallback: só texto
    const res = await fetch(`${evolutionUrl}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: evolutionKey },
      body: JSON.stringify({ number: groupJid, text }),
    })
    if (!res.ok) {
      const err = await res.text()
      return { ok: false, error: err }
    }
    return { ok: true }
  } catch (e: any) {
    return { ok: false, error: e.message }
  }
}
