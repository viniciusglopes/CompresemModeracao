import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { calcularScore } from '@/lib/score'
import { logApi } from '@/lib/api-logger'

const PUBLISHER_ID = '1778660'

function nichoFromTitulo(titulo: string): string | null {
  const t = titulo.toLowerCase()
  if (/(celular|smartphone|iphone|samsung|xiaomi|fone|smartwatch|carregador|power.?bank|caixa de som)/.test(t)) return 'eletronicos'
  if (/(notebook|laptop|mouse|teclado|monitor|ssd|pendrive|webcam|impressora)/.test(t)) return 'informatica'
  if (/(fritadeira|air.?fryer|aspirador|liquidificador|cafeteira|ventilador|micro.?ondas|geladeira)/.test(t)) return 'eletrodomesticos'
  if (/(playstation|ps[45]|xbox|nintendo|headset gamer|console)/.test(t)) return 'games'
  if (/(vestido|blusa|calça|camisa|bermuda|moletom|jaqueta|saia|bolsa|óculos|relógio)/.test(t)) return 'moda'
  if (/(perfume|maquiagem|batom|hidratante|shampoo|protetor solar|sérum|esmalte)/.test(t)) return 'beleza'
  if (/(luminária|cortina|tapete|organizador|jogo de cama|travesseiro|edredom)/.test(t)) return 'casa'
  if (/(tênis|tenis|halter|bicicleta|esteira|chuteira|whey|creatina)/.test(t)) return 'esportes'
  if (/(fralda|carrinho.*bebê|mamadeira|chupeta|berço)/.test(t)) return 'bebes'
  if (/(ração|coleira|brinquedo.*(cão|gato|cachorro|pet)|areia.*gato)/.test(t)) return 'pet'
  if (/(furadeira|parafusadeira|alicate|esmerilhadeira|serra)/.test(t)) return 'ferramentas'
  if (/(lego|boneca|hot wheels|nerf|quebra-cabeça|brinquedo)/.test(t)) return 'brinquedos'
  return null
}

function gerarDeeplink(merchantId: string, urlProduto: string): string {
  return `https://www.awin1.com/cread.php?awinmid=${merchantId}&awinaffid=${PUBLISHER_ID}&ued=${encodeURIComponent(urlProduto)}`
}

function extrairProdutosHtml(html: string, baseUrl: string): Array<{titulo: string, preco: number, precoOriginal: number, url: string, imagem: string}> {
  const produtos: Array<{titulo: string, preco: number, precoOriginal: number, url: string, imagem: string}> = []

  const productPatterns = [
    // JSON-LD structured data
    /"@type"\s*:\s*"Product"[\s\S]*?"name"\s*:\s*"([^"]+)"[\s\S]*?"price"\s*:\s*"?([\d.,]+)"?/g,
    // Open Graph product tags
    /<meta\s+property="product:price:amount"\s+content="([\d.,]+)"/g,
  ]

  // Try JSON-LD first
  const jsonLdMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)
  for (const match of jsonLdMatches) {
    try {
      const data = JSON.parse(match[1])
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (item['@type'] === 'Product' || item['@type'] === 'ItemList') {
          const prodList = item.itemListElement || [item]
          for (const p of prodList) {
            const prod = p.item || p
            if (prod.name && prod.offers) {
              const offers = Array.isArray(prod.offers) ? prod.offers[0] : prod.offers
              const preco = parseFloat(String(offers.price || offers.lowPrice || '0').replace(',', '.'))
              if (preco > 0) {
                produtos.push({
                  titulo: prod.name,
                  preco,
                  precoOriginal: parseFloat(String(offers.highPrice || offers.price || '0').replace(',', '.')) || preco,
                  url: prod.url || '',
                  imagem: prod.image?.[0] || prod.image || '',
                })
              }
            }
          }
        }
      }
    } catch {}
  }

  return produtos.slice(0, 30)
}

export async function POST(request: Request) {
  const t0 = Date.now()
  try {
    const body = await request.json().catch(() => ({}))
    const limite = Math.min(body.limite || 20, 50)

    const { data: cfg } = await supabaseAdmin
      .from('config_plataformas')
      .select('credenciais, ativo')
      .eq('plataforma', 'awin')
      .maybeSingle()

    if (!cfg?.ativo) {
      return NextResponse.json({ error: 'AWIN está desativada' }, { status: 400 })
    }

    const token = cfg.credenciais?.api_token
    if (!token) {
      return NextResponse.json({ error: 'Token AWIN não configurado' }, { status: 400 })
    }

    // Busca lojas ativas da tabela awin_lojas
    const { data: lojas } = await supabaseAdmin
      .from('awin_lojas')
      .select('*')
      .eq('ativo', true)

    if (!lojas || lojas.length === 0) {
      const resp = { salvos: 0, total_encontrados: 0, mensagem: 'Nenhuma loja AWIN ativa' }
      await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'success', duracao_ms: Date.now() - t0, total_encontrados: 0, salvos: 0, request_json: body, response_json: resp })
      return NextResponse.json(resp)
    }

    // Lê estado do cron para saber qual loja processar nesta execução
    const { data: cfgRow } = await supabaseAdmin
      .from('config_plataformas')
      .select('credenciais')
      .eq('plataforma', 'cron_state')
      .maybeSingle()

    const state = cfgRow?.credenciais || {}
    const lojaIdx = (state.awin_loja_idx || 0) % lojas.length
    const loja = lojas[lojaIdx]

    // URLs de promoção comuns
    const promoUrls = [
      `${loja.url}/sale`,
      `${loja.url}/outlet`,
      `${loja.url}/promocoes`,
      `${loja.url}/ofertas`,
      `${loja.url}/promocao`,
    ]

    let produtosEncontrados: Array<{titulo: string, preco: number, precoOriginal: number, url: string, imagem: string}> = []

    for (const promoUrl of promoUrls) {
      try {
        const res = await fetch(promoUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
          },
          redirect: 'follow',
          cache: 'no-store',
        })

        if (res.ok) {
          const html = await res.text()
          const prods = extrairProdutosHtml(html, loja.url)
          if (prods.length > 0) {
            produtosEncontrados = prods
            break
          }
        }
      } catch {}
    }

    // Se não encontrou via promoções, tenta a página principal
    if (produtosEncontrados.length === 0) {
      try {
        const res = await fetch(loja.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
          cache: 'no-store',
        })
        if (res.ok) {
          const html = await res.text()
          produtosEncontrados = extrairProdutosHtml(html, loja.url)
        }
      } catch {}
    }

    const produtosParaSalvar = produtosEncontrados.slice(0, limite).map(p => {
      const temDesconto = p.precoOriginal > p.preco && p.precoOriginal > 0
      const descontoPercent = temDesconto ? Math.round(((p.precoOriginal - p.preco) / p.precoOriginal) * 100) : 0
      const nichoReal = nichoFromTitulo(p.titulo) || (loja.categorias?.[0]) || 'moda'
      const urlProduto = p.url.startsWith('http') ? p.url : `${loja.url}${p.url}`

      const { score, detalhes } = calcularScore({
        vendas: 0,
        desconto_percent: descontoPercent,
        rating: 0,
        frete_gratis: false,
        loja_premium: true,
        comissao_percent: 0,
      })

      return {
        titulo: p.titulo,
        preco: p.preco,
        preco_original: temDesconto ? p.precoOriginal : p.preco,
        desconto_percent: descontoPercent,
        plataforma: 'awin',
        link_original: urlProduto,
        link_afiliado: gerarDeeplink(loja.merchant_id, urlProduto),
        thumbnail: (p.imagem || '').replace('http://', 'https://'),
        nicho: nichoReal,
        produto_id_externo: `awin_${loja.merchant_id}_${Buffer.from(p.titulo).toString('base64').slice(0, 20)}`,
        frete_gratis: false,
        qtd_vendida: 0,
        ativo: true,
        score,
        score_detalhes: detalhes,
        loja_nome: loja.nome,
        updated_at: new Date().toISOString(),
      }
    }).filter(p => p.titulo && p.preco > 0)

    // Atualiza índice da loja para próxima execução
    await supabaseAdmin
      .from('config_plataformas')
      .upsert({
        plataforma: 'cron_state',
        credenciais: {
          ...state,
          awin_loja_idx: (lojaIdx + 1) % lojas.length,
          awin_last_loja: loja.nome,
          awin_last_run: new Date().toISOString(),
        },
        ativo: false,
      }, { onConflict: 'plataforma' })

    if (produtosParaSalvar.length === 0) {
      const resp = {
        salvos: 0,
        total_encontrados: produtosEncontrados.length,
        loja: loja.nome,
        proxima_loja: lojas[(lojaIdx + 1) % lojas.length]?.nome,
      }
      await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'success', duracao_ms: Date.now() - t0, total_encontrados: 0, salvos: 0, request_json: { loja: loja.nome }, response_json: resp })
      return NextResponse.json(resp)
    }

    const { data: salvos, error } = await supabaseAdmin
      .from('produtos')
      .upsert(produtosParaSalvar, { onConflict: 'produto_id_externo', ignoreDuplicates: false })
      .select('id')

    if (error) {
      await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'error', duracao_ms: Date.now() - t0, erro: error.message, request_json: { loja: loja.nome }, response_json: { error: error.message } })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const qtdSalvos = salvos?.length || produtosParaSalvar.length
    const respData = {
      salvos: qtdSalvos,
      total_encontrados: produtosEncontrados.length,
      loja: loja.nome,
      proxima_loja: lojas[(lojaIdx + 1) % lojas.length]?.nome,
      produtos: produtosParaSalvar.slice(0, 5).map(p => ({
        titulo: p.titulo,
        preco: p.preco,
        desconto: `${p.desconto_percent}%`,
      })),
    }

    await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'success', duracao_ms: Date.now() - t0, total_encontrados: produtosEncontrados.length, salvos: qtdSalvos, request_json: { loja: loja.nome }, response_json: respData })

    return NextResponse.json(respData)
  } catch (e: any) {
    await logApi({ plataforma: 'awin', endpoint: '/busca/awin', status: 'error', duracao_ms: Date.now() - t0, erro: e.message, response_json: { error: e.message } })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
