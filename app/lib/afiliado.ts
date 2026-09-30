// Links de afiliado — conferencia e (re)geracao a partir de config_plataformas.
//
// A conta de afiliado de cada plataforma vem SO de config_plataformas (nada de
// codigo): trocar a conta = editar a linha da plataforma em /admin/plataformas.
//   mercadolivre.credenciais.affiliate_tag  -> matt_tool / mt_campaign
//   amazon.credenciais.affiliate_tag        -> tag=
//   shopee.credenciais.app_id + secret      -> generateShortLink (an_<app_id>)
//   awin.credenciais.publisher_id           -> awinaffid=
//   lomadee.credenciais.api_key             -> lmdee.link (conta da chave)
//
// Usado na aprovacao: quando a Camilla aprova um produto, o link e conferido e,
// se nao for da conta atual, e refeito antes de ir para a fila de disparo.

import { createHash } from 'crypto'
import { supabaseAdmin } from '@/lib/supabase'

export interface ContasAfiliado {
  ml_tag: string | null
  amazon_tag: string | null
  shopee_app_id: string | null
  shopee_secret: string | null
  awin_publisher_id: string | null
  lomadee_ativo: boolean
}

export async function carregarContasAfiliado(): Promise<ContasAfiliado> {
  const { data } = await supabaseAdmin
    .from('config_plataformas')
    .select('plataforma, credenciais, ativo')
    .in('plataforma', ['mercadolivre', 'amazon', 'shopee', 'awin', 'lomadee'])

  const c: ContasAfiliado = {
    ml_tag: null, amazon_tag: null, shopee_app_id: null, shopee_secret: null,
    awin_publisher_id: null, lomadee_ativo: false,
  }
  for (const r of data || []) {
    const cr = (r.credenciais || {}) as Record<string, string | undefined>
    if (r.plataforma === 'mercadolivre') c.ml_tag = cr.affiliate_tag || null
    if (r.plataforma === 'amazon') c.amazon_tag = cr.affiliate_tag || null
    if (r.plataforma === 'shopee') { c.shopee_app_id = cr.app_id ? String(cr.app_id) : null; c.shopee_secret = cr.secret || null }
    if (r.plataforma === 'awin') c.awin_publisher_id = cr.publisher_id ? String(cr.publisher_id) : null
    if (r.plataforma === 'lomadee') c.lomadee_ativo = !!(r.ativo && cr.api_key)
  }
  return c
}

/** Somente IDs publicos (nada de secret/token) — para exibir na tela. */
export function contasPublicas(c: ContasAfiliado) {
  return {
    mercadolivre: c.ml_tag ? `matt_tool / mt_campaign = ${c.ml_tag}` : 'não configurado',
    amazon: c.amazon_tag ? `tag = ${c.amazon_tag}` : 'não configurado',
    shopee: c.shopee_app_id ? `app_id (afiliado) = ${c.shopee_app_id}` : 'não configurado',
    awin: c.awin_publisher_id ? `publisher (awinaffid) = ${c.awin_publisher_id}` : 'não configurado',
    lomadee: c.lomadee_ativo ? 'conta da api_key cadastrada (sem ID público)' : 'não configurado',
  }
}

/**
 * O link ja e da conta atual?
 *  true  = confere; false = e de outra conta ou sem afiliado;
 *  null  = nao da pra saber sem abrir o link (short link Shopee/Lomadee).
 */
export function linkEhDaContaAtual(plataforma: string, link: string | null, c: ContasAfiliado): boolean | null {
  if (!link) return false
  let u: URL
  try { u = new URL(link) } catch { return false }
  const q = u.searchParams
  switch (plataforma) {
    case 'mercadolivre':
      if (!c.ml_tag) return null
      // Link quebrado (ex. /2sLSLBW vindo de meli.la) nao conta como valido.
      if (!ehProdutoML(link)) return false
      return q.get('matt_tool') === c.ml_tag || q.get('mt_campaign') === c.ml_tag
    case 'amazon':
      if (!c.amazon_tag) return null
      return q.get('tag') === c.amazon_tag
    case 'awin':
      if (!c.awin_publisher_id) return null
      if (!u.hostname.includes('awin1.com')) return null // tidd.ly etc.
      return q.get('awinaffid') === c.awin_publisher_id
    case 'shopee':
      if (!c.shopee_app_id) return null
      if (link.includes(`an_${c.shopee_app_id}`)) return true
      return null // s.shopee.com.br/xxx: so resolvendo
    default:
      return null
  }
}

/** Link de produto do ML (e nao pagina /social/ de outro afiliado, busca, etc.). */
function ehProdutoML(url: string): boolean {
  return /mercadolivre\.com\.br\/.*(\/p\/MLB|MLB-?\d{6,}|\/up\/MLBU)|produto\.mercadolivre\.com\.br/i.test(url)
}

async function resolverUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(8000),
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    })
    return res.url || url
  } catch {
    return url
  }
}

async function shopeeShortLink(url: string, appId: string, secret: string): Promise<string | null> {
  try {
    const body = JSON.stringify({
      query: `mutation { generateShortLink(input: { originUrl: ${JSON.stringify(url)}, subIds: ["csm"] }) { shortLink } }`,
    })
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = createHash('sha256').update(`${appId}${timestamp}${body}${secret}`).digest('hex')
    const res = await fetch('https://open-api.affiliate.shopee.com.br/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `SHA256 Credential=${appId}, Signature=${signature}, Timestamp=${timestamp}`,
      },
      body,
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.data?.generateShortLink?.shortLink || null
  } catch {
    return null
  }
}

/**
 * Refaz o link de afiliado a partir do link ORIGINAL com a conta atual.
 * Devolve null se nao conseguir (quem chama mantem o link que ja tinha).
 */
export async function gerarLinkContaAtual(
  plataforma: string,
  linkOriginal: string,
  c: ContasAfiliado
): Promise<string | null> {
  try {
    if (plataforma === 'mercadolivre' && c.ml_tag) {
      let url = linkOriginal
      // meli.la e /sec/ sao encurtadores: precisa do destino pra colocar a tag
      if (!ehProdutoML(url)) url = await resolverUrl(url)
      // meli.la de outro afiliado costuma cair em /social/<perfil>: nao e produto.
      if (!ehProdutoML(url)) return null
      const u = new URL(url)
      for (const k of ['matt_tool', 'matt_word', 'matt_source', 'matt_campaign', 'mt_source', 'mt_medium', 'mt_campaign']) u.searchParams.delete(k)
      u.searchParams.set('matt_tool', c.ml_tag)
      return u.toString()
    }
    if (plataforma === 'amazon' && c.amazon_tag) {
      let url = linkOriginal
      if (/amzn\.(to|com)/i.test(url)) url = await resolverUrl(url)
      const u = new URL(url)
      u.searchParams.set('tag', c.amazon_tag)
      return u.toString()
    }
    if (plataforma === 'awin' && c.awin_publisher_id) {
      const u = new URL(linkOriginal)
      if (u.hostname.includes('awin1.com')) {
        u.searchParams.set('awinaffid', c.awin_publisher_id)
        return u.toString()
      }
      return null
    }
    if (plataforma === 'shopee' && c.shopee_app_id && c.shopee_secret) {
      const url = linkOriginal.includes('s.shopee.com.br') ? await resolverUrl(linkOriginal) : linkOriginal
      return await shopeeShortLink(url, c.shopee_app_id, c.shopee_secret)
    }
  } catch {}
  return null
}
