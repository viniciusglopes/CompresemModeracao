'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: '📊' },
  { label: 'Produtos', href: '/admin/produtos', icon: '🏷️' },
  { label: 'Ofertas', href: '/admin/ofertas', icon: '🎯' },
  { label: 'Disparos', href: '/admin/disparos', icon: '📤' },
  { label: 'Importar Produto', href: '/admin/importar', icon: '🔗' },
  { label: 'Grupos', href: '/admin/grupos', icon: '📡' },
  { label: 'Logs de API', href: '/admin/logs', icon: '🗂️' },
  { label: 'Analytics', href: '/admin/analytics', icon: '📈' },
  { label: 'APIs Referência', href: '/admin/apis', icon: '📚' },
]

const plataformas = [
  { label: 'Mercado Livre', href: '/admin/plataformas/mercadolivre', icon: '🛒' },
  { label: 'Shopee', href: '/admin/plataformas/shopee', icon: '🧡' },
  { label: 'AliExpress', href: '/admin/plataformas/aliexpress', icon: '🔴' },
  { label: 'Amazon', href: '/admin/plataformas/amazon', icon: '📦' },
  { label: 'Lomadee', href: '/admin/plataformas/lomadee', icon: '🏬' },
  { label: 'AWIN', href: '/admin/plataformas/awin', icon: '🌐' },
  { label: 'Lojas AWIN', href: '/admin/plataformas/awin/lojas', icon: '🏪' },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Fecha o drawer ao navegar
  useEffect(() => { setMobileOpen(false) }, [pathname])

  const handleLogout = () => {
    localStorage.removeItem('admin_authenticated')
    router.push('/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-5 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👜</span>
          <div>
            <h1 className="font-bold text-gray-900 leading-tight">Compre sem Moderação</h1>
            <p className="text-xs text-gray-500">Painel Admin</p>
          </div>
        </div>
        {/* Botão fechar no mobile */}
        <button onClick={() => setMobileOpen(false)}
          className="md:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
          ✕
        </button>
      </div>

      <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu</p>
          <ul className="space-y-1">
            {navItems.map(item => (
              <li key={item.href}>
                <Link href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    pathname === item.href
                      ? 'bg-rose-50 text-rose-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Plataformas</p>
          <ul className="space-y-1">
            {plataformas.map(item => (
              <li key={item.href}>
                <Link href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                    pathname === item.href || pathname?.startsWith(item.href + '/')
                      ? 'bg-rose-50 text-rose-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="p-4 border-t">
        <button onClick={handleLogout}
          className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-100 transition-colors">
          <span>🚪</span>
          <span>Sair</span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Botão hamburguer — só aparece em mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 p-2 bg-white rounded-lg shadow border text-gray-600 hover:bg-gray-50">
        ☰
      </button>

      {/* Sidebar desktop — visível sempre em md+ */}
      <aside className="hidden md:flex w-64 min-h-screen bg-white border-r flex-col shrink-0">
        <SidebarContent />
      </aside>

      {/* Drawer mobile — overlay */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 bg-black/40 z-40"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="md:hidden fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col shadow-2xl">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  )
}
