'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'
import AdminNotificacoes from '@/components/AdminNotificacoes'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    // A sessao vale pelo cookie do servidor, nao pelo localStorage
    // (todas as rotas /api exigem o cookie desde 01/10/2026).
    fetch('/api/auth/login', { cache: 'no-store' })
      .then(r => {
        if (r.status === 401) {
          try { localStorage.removeItem('admin_authenticated') } catch {}
          router.push('/login')
        }
      })
      .catch(() => {})
  }, [router])

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="bg-white border-b px-4 md:px-6 py-2.5 flex items-center justify-end shrink-0">
          {/* Espaço para o botão hamburger no mobile */}
          <div className="w-8 md:hidden" />
          <AdminNotificacoes />
        </header>
        <main className="flex-1 p-4 md:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
