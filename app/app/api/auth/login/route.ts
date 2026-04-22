import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { email, password } = await request.json()
  if (email === 'admin@compresemmoderacao.com.br' && password === 'csm@2026') {
    return NextResponse.json({ success: true, user: { email, name: 'Admin CSM' } })
  }
  return NextResponse.json({ success: false, message: 'Email ou senha incorretos' }, { status: 401 })
}
