import { NextResponse } from 'next/server'
import { criarTokenAdmin, gravarCookieAdmin, apagarCookieAdmin } from '@/lib/admin-session'

export async function POST(request: Request) {
  const { email, password } = await request.json()
  if (email === 'admin@compresemmoderacao.com.br' && password === 'csm@2026') {
    const res = NextResponse.json({ success: true, user: { email, name: 'Admin CSM' } })
    // Cookie de sessao no servidor (exigido pelas rotas de aprovacao/disparo).
    const token = criarTokenAdmin(email)
    if (token) gravarCookieAdmin(res, token)
    return res
  }
  return NextResponse.json({ success: false, message: 'Email ou senha incorretos' }, { status: 401 })
}

// DELETE — logout: apaga o cookie de sessao
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  apagarCookieAdmin(res)
  return res
}
