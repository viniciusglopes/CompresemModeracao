import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { data: cfg } = await supabaseAdmin
    .from('config_plataformas').select('credenciais').eq('plataforma', slug).maybeSingle()
  const creds = cfg?.credenciais || {}

  if (slug === 'mercadolivre') {
    try {
      const res = await fetch('https://api.mercadolibre.com/sites/MLB')
      return NextResponse.json({ success: res.ok, message: res.ok ? 'API Mercado Livre acessível!' : `HTTP ${res.status}` })
    } catch (e: any) {
      return NextResponse.json({ success: false, message: e.message })
    }
  }

  if (!creds.partner_id && !creds.app_key && !creds.access_key) {
    return NextResponse.json({ success: false, message: 'Credenciais não configuradas ainda' })
  }
  return NextResponse.json({ success: true, message: 'Credenciais salvas. Teste completo disponível após integração.' })
}
