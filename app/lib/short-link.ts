import { supabaseAdmin } from '@/lib/supabase'

const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function generateSlug(length = 6): string {
  let slug = ''
  for (let i = 0; i < length; i++) {
    slug += CHARS[Math.floor(Math.random() * CHARS.length)]
  }
  return slug
}

export async function createShortLink(urlDestino: string, produtoId?: string): Promise<string> {
  let slug: string
  let attempts = 0

  do {
    slug = generateSlug()
    const { data } = await supabaseAdmin
      .from('short_links')
      .select('id')
      .eq('slug', slug)
      .single()
    if (!data) break
    attempts++
  } while (attempts < 10)

  const insert: Record<string, unknown> = { slug, url_destino: urlDestino }
  if (produtoId) insert.produto_id = produtoId

  await supabaseAdmin.from('short_links').insert(insert)

  return slug
}

export async function getOrCreateShortLink(urlDestino: string, produtoId?: string): Promise<string> {
  if (produtoId) {
    const { data } = await supabaseAdmin
      .from('short_links')
      .select('slug')
      .eq('produto_id', produtoId)
      .single()
    if (data) return data.slug
  }

  return createShortLink(urlDestino, produtoId)
}
