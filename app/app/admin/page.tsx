'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    total_produtos: 0,
    total_clicks: 0,
    total_disparos: 0,
    total_vendas: 0,
    total_comissao: '0.00',
    total_valor_vendas: '0.00'
  })
  const [plataformas, setPlataformas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [produtos, clicks, disparos, vendas, plats] = await Promise.all([
        supabase.from('produtos').select('id', { count: 'exact', head: true }),
        supabase.from('clicks').select('plataforma'),
        supabase.from('disparos').select('id', { count: 'exact', head: true }),
        supabase.from('vendas').select('comissao, valor_venda'),
        supabase.from('config_plataformas').select('plataforma, ativo').order('plataforma')
      ])

      const totalComissao = (vendas.data || []).reduce((s, v) => s + (v.comissao || 0), 0)
      const totalVendas = (vendas.data || []).reduce((s, v) => s + (v.valor_venda || 0), 0)

      setStats({
        total_produtos: produtos.count || 0,
        total_clicks: (clicks.data || []).length,
        total_disparos: disparos.count || 0,
        total_vendas: (vendas.data || []).length,
        total_comissao: totalComissao.toFixed(2),
        total_valor_vendas: totalVendas.toFixed(2)
      })
      setPlataformas(plats.data || [])
    } finally {
      setLoading(false)
    }
  }

  const chartData = [
    { name: 'Produtos', value: stats.total_produtos },
    { name: 'Cliques', value: stats.total_clicks },
    { name: 'Disparos', value: stats.total_disparos },
    { name: 'Vendas', value: stats.total_vendas },
  ]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do sistema</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Produtos', value: stats.total_produtos, icon: '🏷️', color: 'text-blue-600' },
          { label: 'Cliques', value: stats.total_clicks, icon: '👆', color: 'text-green-600' },
          { label: 'Disparos', value: stats.total_disparos, icon: '📤', color: 'text-rose-600' },
          { label: 'Vendas', value: stats.total_vendas, icon: '💰', color: 'text-purple-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className={`text-3xl font-bold mt-1 ${s.color}`}>{loading ? '—' : s.value}</p>
                </div>
                <span className="text-3xl">{s.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Comissão */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">💵 Receita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total vendas</span>
              <span className="font-semibold">R$ {stats.total_valor_vendas}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Comissão estimada</span>
              <span className="font-semibold text-green-600">R$ {stats.total_comissao}</span>
            </div>
          </CardContent>
        </Card>

        {/* Status plataformas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">🔌 Status Plataformas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {plataformas.map(p => (
              <div key={p.plataforma} className="flex items-center justify-between">
                <span className="text-sm capitalize">{p.plataforma}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">📊 Resumo Geral</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
