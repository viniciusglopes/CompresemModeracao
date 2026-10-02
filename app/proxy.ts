// Portao unico das rotas /api/* (01/10/2026).
//
// Ate aqui so as paginas /admin tinham uma checagem (no navegador, via
// localStorage) e TODAS as rotas /api/* respondiam sem credencial nenhuma —
// dava pra ler credenciais em /api/plataformas/[slug], mexer em grupos e
// disparar mensagens com um curl.
//
// Regra: tudo em /api/* e FECHADO por padrao. Passa quem tiver:
//   - o cookie de sessao do admin (`csm_admin`, ver lib/admin-session.ts), ou
//   - o header `x-cron-secret` igual ao CRON_SECRET (crontab do host e
//     chamadas internas entre rotas).
// Excecoes publicas ficam na lista abaixo, so com o metodo que o site usa.

import { NextResponse, type NextRequest } from 'next/server'
import { adminDaRequisicao, cronValido } from '@/lib/admin-session'

const PUBLICAS: { caminho: RegExp; metodos: string[] }[] = [
  // vitrine da home (app/page.tsx)
  { caminho: /^\/api\/public\//, metodos: ['GET'] },
  // pagina publica /linktree (public/linktree.html) so le
  { caminho: /^\/api\/linktree\/?$/, metodos: ['GET'] },
  // login/logout e checagem de sessao do painel
  { caminho: /^\/api\/auth\/login\/?$/, metodos: ['GET', 'POST', 'DELETE'] },
  // retorno do OAuth do Mercado Livre (redirect do proprio ML)
  { caminho: /^\/api\/oauth\/mercadolivre\/callback\/?$/, metodos: ['GET'] },
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const metodo = request.method.toUpperCase()

  if (metodo === 'OPTIONS') return NextResponse.next()

  const publica = PUBLICAS.some(p => p.caminho.test(pathname) && p.metodos.includes(metodo))
  if (publica) return NextResponse.next()

  if (cronValido(request) || adminDaRequisicao(request)) return NextResponse.next()

  return NextResponse.json(
    { error: 'Sessão expirada. Entre de novo no painel.', codigo: 'sem_sessao' },
    { status: 401 }
  )
}

export const config = {
  matcher: ['/api/:path*'],
}
