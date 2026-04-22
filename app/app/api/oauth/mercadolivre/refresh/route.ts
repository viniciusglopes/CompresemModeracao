import { NextResponse } from 'next/server'
import { getMlAccessToken } from '@/lib/ml-auth'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/oauth/mercadolivre/refresh — força renovação do token
export async function POST() {
  try {
    const token = await getMlAccessToken()
    if (!token) {
      return NextResponse.json({ error: 'Sem credenciais configuradas ou plataforma desativada' }, { status: 400 })
    }

    // Lê o estado atual após possível renovação
    const { data: cfg } = await supabaseAdmin
      .from('config_plataformas')
      .select('credenciais')
      .eq('plataforma', 'mercadolivre')
      .maybeSingle()

    return NextResponse.json({
      success: true,
      user_id: cfg?.credenciais?.user_id,
      token_expires_at: cfg?.credenciais?.token_expires_at,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
