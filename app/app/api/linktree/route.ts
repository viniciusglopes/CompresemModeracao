import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

function hash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  const h2 = [...s].reduce((a, c, i) => a + c.charCodeAt(0) * (i + 7), 0)
  return 'bh_' + Math.abs(h).toString(36) + '_' + Math.abs(h2).toString(36)
}

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('linktree_config')
    .select('dados')
    .eq('id', 1)
    .single()

  if (error || !data) {
    return NextResponse.json({ grupos: [], produtos: [] })
  }

  return NextResponse.json(data.dados)
}

export async function POST(request: Request) {
  const body = await request.json()
  const action = body.action

  if (action === 'login') {
    const { senha_hash } = body
    const { data } = await supabaseAdmin
      .from('linktree_config')
      .select('senha_hash')
      .eq('id', 1)
      .single()

    if (!data || data.senha_hash !== senha_hash) {
      return NextResponse.json({ ok: false, error: 'Senha incorreta' }, { status: 401 })
    }
    return NextResponse.json({ ok: true })
  }

  if (action === 'change_password') {
    const { senha_atual_hash, nova_senha_hash } = body
    const { data } = await supabaseAdmin
      .from('linktree_config')
      .select('senha_hash')
      .eq('id', 1)
      .single()

    if (!data || data.senha_hash !== senha_atual_hash) {
      return NextResponse.json({ ok: false, error: 'Senha atual incorreta' }, { status: 401 })
    }

    await supabaseAdmin
      .from('linktree_config')
      .update({ senha_hash: nova_senha_hash, updated_at: new Date().toISOString() })
      .eq('id', 1)

    return NextResponse.json({ ok: true })
  }

  if (action === 'reset_password') {
    const defaultHash = hash('csm2026')
    await supabaseAdmin
      .from('linktree_config')
      .update({ senha_hash: defaultHash, updated_at: new Date().toISOString() })
      .eq('id', 1)

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acao invalida' }, { status: 400 })
}

export async function PUT(request: Request) {
  const body = await request.json()
  const { dados, senha_hash, admin } = body

  if (!admin) {
    const { data } = await supabaseAdmin
      .from('linktree_config')
      .select('senha_hash')
      .eq('id', 1)
      .single()

    if (!data || data.senha_hash !== senha_hash) {
      return NextResponse.json({ ok: false, error: 'Nao autorizado' }, { status: 401 })
    }
  }

  const { error } = await supabaseAdmin
    .from('linktree_config')
    .update({ dados, updated_at: new Date().toISOString() })
    .eq('id', 1)

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
