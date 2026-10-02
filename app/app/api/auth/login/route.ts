import { NextResponse } from 'next/server'
import { scryptSync, timingSafeEqual } from 'crypto'
import {
  criarTokenAdmin,
  gravarCookieAdmin,
  apagarCookieAdmin,
  adminDaRequisicao,
} from '@/lib/admin-session'

// 01/10/2026: a senha deixou de ficar em texto no codigo. Aqui fica so o hash
// scrypt (formato scrypt$salt$hash). Pode ser sobrescrito pela env
// CSM_ADMIN_PASSWORD_HASH sem mexer no codigo.
const ADMIN_EMAIL = process.env.CSM_ADMIN_EMAIL || 'admin@compresemmoderacao.com.br'
const ADMIN_HASH = process.env.CSM_ADMIN_PASSWORD_HASH || 'scrypt$9711452a95183199a806f0a6e7902ec0$90c9603ea800f015853f01d1448761931acb721e7f7c86ce9867907d64ec692b422db8b2d6cb815f3b74967e34e7fef870763e1f00d1d3366b3eede9a0e70cd2'

function senhaConfere(senha: string): boolean {
  const [alg, salt, hash] = ADMIN_HASH.split('$')
  if (alg !== 'scrypt' || !salt || !hash) return false
  const esperado = Buffer.from(hash, 'hex')
  const calculado = scryptSync(senha, salt, esperado.length, { N: 16384, r: 8, p: 1 })
  return calculado.length === esperado.length && timingSafeEqual(calculado, esperado)
}

export async function POST(request: Request) {
  const { email, password } = await request.json().catch(() => ({}))
  if (
    typeof email === 'string' &&
    typeof password === 'string' &&
    email.trim().toLowerCase() === ADMIN_EMAIL &&
    senhaConfere(password)
  ) {
    const token = criarTokenAdmin(ADMIN_EMAIL)
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Servidor sem segredo de sessão configurado' },
        { status: 500 }
      )
    }
    const res = NextResponse.json({ success: true, user: { email: ADMIN_EMAIL, name: 'Admin CSM' } })
    gravarCookieAdmin(res, token)
    return res
  }
  return NextResponse.json({ success: false, message: 'Email ou senha incorretos' }, { status: 401 })
}

// GET — o painel pergunta se a sessao (cookie) ainda vale
export async function GET(request: Request) {
  const email = adminDaRequisicao(request)
  return email
    ? NextResponse.json({ ok: true, email })
    : NextResponse.json({ ok: false }, { status: 401 })
}

// DELETE — logout: apaga o cookie de sessao
export async function DELETE() {
  const res = NextResponse.json({ success: true })
  apagarCookieAdmin(res)
  return res
}
