'use client'

import { useState, useEffect, useRef } from 'react'

interface Notif {
  id: string
  tipo: 'error' | 'rate_limit' | 'warning' | 'info'
  titulo: string
  mensagem: string
  plataforma: string
  lida: boolean
  criado_em: string
}

function timeAgo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'agora'
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`
  return `${Math.floor(diff / 86400)}d atrás`
}

const TIPO_STYLE: Record<string, string> = {
  rate_limit: 'bg-yellow-50 border-yellow-200',
  error: 'bg-red-50 border-red-200',
  warning: 'bg-rose-50 border-rose-200',
  info: 'bg-blue-50 border-blue-200',
}

export default function AdminNotificacoes() {
  const [aberto, setAberto] = useState(false)
  const [notifs, setNotifs] = useState<Notif[]>([])
  const [naoLidas, setNaoLidas] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const carregar = async () => {
    try {
      const res = await fetch('/api/notificacoes')
      const data = await res.json()
      setNotifs(data.notificacoes || [])
      setNaoLidas(data.nao_lidas || 0)
    } catch {}
  }

  useEffect(() => {
    carregar()
    const interval = setInterval(carregar, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const marcarLidas = async () => {
    await fetch('/api/notificacoes', { method: 'PATCH' })
    setNaoLidas(0)
    setNotifs(prev => prev.map(n => ({ ...n, lida: true })))
  }

  const limpar = async () => {
    await fetch('/api/notificacoes', { method: 'DELETE' })
    setNotifs(prev => prev.filter(n => !n.lida))
  }

  const abrir = () => {
    setAberto(v => !v)
    if (!aberto && naoLidas > 0) marcarLidas()
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={abrir}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
        <span className="text-lg">🔔</span>
        {naoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-2xl shadow-2xl border z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <p className="font-semibold text-sm text-gray-800">Notificações</p>
            <div className="flex gap-2">
              {notifs.some(n => n.lida) && (
                <button onClick={limpar} className="text-xs text-gray-400 hover:text-gray-600">
                  Limpar lidas
                </button>
              )}
              {naoLidas > 0 && (
                <button onClick={marcarLidas} className="text-xs text-blue-500 hover:text-blue-600">
                  Marcar todas lidas
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-400">
                <p className="text-2xl mb-1">✅</p>
                Nenhuma notificação
              </div>
            ) : (
              notifs.map(n => (
                <div key={n.id}
                  className={`px-4 py-3 ${!n.lida ? 'bg-blue-50/30' : ''}`}>
                  <div className={`rounded-lg p-2.5 border ${TIPO_STYLE[n.tipo] || 'bg-gray-50 border-gray-200'}`}>
                    <p className="text-xs font-semibold text-gray-800 leading-snug">{n.titulo}</p>
                    {n.mensagem && (
                      <p className="text-xs text-gray-600 mt-0.5 leading-snug">{n.mensagem}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.criado_em)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
