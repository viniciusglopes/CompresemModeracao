import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  const { data, error } = await supabaseAdmin
    .from('short_links')
    .select('id, url_destino, cliques')
    .eq('slug', slug)
    .single()

  if (error || !data) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  supabaseAdmin
    .from('short_links')
    .update({ cliques: (data.cliques || 0) + 1, ultimo_clique: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})

  return NextResponse.redirect(data.url_destino, { status: 301 })
}
