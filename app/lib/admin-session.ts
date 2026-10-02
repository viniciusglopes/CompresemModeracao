// Sessao do admin no SERVIDOR.
//
// Ate aqui o painel so tinha `localStorage.admin_authenticated` (checado no
// navegador) e as rotas /api/* nao exigiam nada. As rotas novas (aprovacao de
// ofertas e disparo dos aprovados) exigem este cookie assinado.
//
// Formato do cookie: base64url(email|expiraEmMs).hmacSha256
// Segredo: SESSION_SECRET, ou CRON_SECRET se o primeiro nao existir.
// Sem nenhum dos dois o acesso e NEGADO (fail closed).

import { createHmac, timingSafeEqual } from 'crypto'
import { NextResponse } from 'next/server'

export const COOKIE_ADMIN = 'csm_admin'
const DURACAO_MS = 30 * 24 * 60 * 60 * 1000 // 30 dias

function segredo(): string | null {
  return process.env.SESSION_SECRET || process.env.CRON_SECRET || null
}

function assinar(payload: string, chave: string): string {
  return createHmac('sha256', chave).update(payload).digest('base64url')
}

function iguais(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && timingSafeEqual(ba, bb)
}

export function criarTokenAdmin(email: string): string | null {
  const chave = segredo()
  if (!chave) return null
  const payload = Buffer.from(`${email}|${Date.now() + DURACAO_MS}`).toString('base64url')
  return `${payload}.${assinar(payload, chave)}`
}

/** Devolve o email do admin se o token for valido e nao tiver expirado. */
export function validarTokenAdmin(token: string | undefined | null): string | null {
  const chave = segredo()
  if (!chave || !token) return null
  const [payload, assinatura] = token.split('.')
  if (!payload || !assinatura) return null
  if (!iguais(assinatura, assinar(payload, chave))) return null
  const [email, exp] = Buffer.from(payload, 'base64url').toString().split('|')
  if (!email || !exp || Number(exp) < Date.now()) return null
  return email
}

function lerCookie(request: Request, nome: string): string | null {
  const header = request.headers.get('cookie') || ''
  for (const parte of header.split(';')) {
    const [k, ...v] = parte.trim().split('=')
    if (k === nome) return decodeURIComponent(v.join('='))
  }
  return null
}

export function adminDaRequisicao(request: Request): string | null {
  return validarTokenAdmin(lerCookie(request, COOKIE_ADMIN))
}

export function cronValido(request: Request): boolean {
  const esperado = process.env.CRON_SECRET
  const recebido = request.headers.get('x-cron-secret')
  return !!esperado && !!recebido && iguais(recebido, esperado)
}

type Autorizado = { ok: true; quem: string } | { ok: false; resposta: NextResponse }

const NEGADO = () =>
  NextResponse.json(
    { error: 'Sessão expirada. Entre de novo no painel.', codigo: 'sem_sessao' },
    { status: 401 }
  )

/** Exige o cookie de sessao do admin. */
export function exigirAdmin(request: Request): Autorizado {
  const email = adminDaRequisicao(request)
  return email ? { ok: true, quem: email } : { ok: false, resposta: NEGADO() }
}

/** Exige sessao do admin OU o header x-cron-secret (uso por automacao). */
export function exigirAdminOuCron(request: Request): Autorizado {
  if (cronValido(request)) return { ok: true, quem: 'cron' }
  return exigirAdmin(request)
}

export function gravarCookieAdmin(res: NextResponse, token: string) {
  res.cookies.set({
    name: COOKIE_ADMIN,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DURACAO_MS / 1000,
  })
}

export function apagarCookieAdmin(res: NextResponse) {
  res.cookies.set({ name: COOKIE_ADMIN, value: '', path: '/', maxAge: 0 })
}
