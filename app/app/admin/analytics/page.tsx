'use client'

import { useState, useEffect } from 'react'

const PLAT_LABELS: Record<string, string> = {
  mercadolivre: 'Mercado Livre',
  shopee: 'Shopee',
  lomadee: 'Lomadee',
  awin: 'AWIN',
}

const PLAT_COLORS: Record<string, string> = {
  mercadolivre: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  shopee: 'bg-orange-100 text-orange-800 border-orange-200',
  lomadee: 'bg-green-100 text-green-800 border-green-200',
  awin: 'bg-purple-100 text-purple-800 border-purple-200',
}

const PLAT_BAR_COLORS: Record<string, string> = {
  mercadolivre: 'bg-yellow-400',
  shopee: 'bg-orange-400',
  lomadee: 'bg-green-400',
  awin: 'bg-purple-400',
}

function formatDate(iso: string) {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

interface Analytics {
  resumo: { total_produtos: number; total_disparos: number; total_clicks: number }
  produtos_por_plataforma: Record<string, number>
  disparos: {
    por_status: Record<string, number>
    por_canal: Record<string, number>
    por_grupo: Record<string, number>
    diario: Record<string, { enviado: number; erro: number }>
    recentes: Array<{ id: string; produto_id: string; canal: string; grupo_nome: string; status: string; erro: string | null; disparado_em: string }>
  }
  api_logs: {
    por_plataforma: Record<string, { success: number; error: number; rate_limit: number; total: number; avg_ms: number }>
    recentes: Array<{ id: string; plataforma: string; endpoint: string; status: string; duracao_ms: number; nicho: string; total_encontrados: number; salvos: number; erro: string | null; criado_em: string }>
  }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'resumo' | 'disparos' | 'api_logs'>('resumo')

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Analytics</h1>
        <div className="text-gray-400 text-center py-20">Carregando...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="max-w-[1400px] mx-auto p-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Analytics</h1>
        <div className="text-red-500 text-center py-20">Erro ao carregar dados</div>
      </div>
    )
  }

  const maxProdPlat = Math.max(...Object.values(data.produtos_por_plataforma), 1)

  const dispDiasOrdered = Object.entries(data.disparos.diario)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
  const maxDispDia = Math.max(...dispDiasOrdered.map(([, v]) => v.enviado + v.erro), 1)

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Visao geral de produtos, disparos e APIs</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Produtos no banco</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{data.resumo.total_produtos}</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            {Object.entries(data.produtos_por_plataforma).map(([plat, count]) => (
              <span key={plat} className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLAT_COLORS[plat] || 'bg-gray-100 text-gray-700'}`}>
                {PLAT_LABELS[plat] || plat}: {count}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Disparos WhatsApp</p>
          <p className="text-3xl font-bold text-emerald-600 mt-1">{data.resumo.total_disparos}</p>
          <div className="flex gap-2 mt-3 flex-wrap">
            {Object.entries(data.disparos.por_status).map(([status, count]) => (
              <span key={status} className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                status === 'enviado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {status}: {count}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Clicks rastreados</p>
          <p className="text-3xl font-bold text-blue-600 mt-1">{data.resumo.total_clicks}</p>
          <p className="text-xs text-gray-400 mt-3">Clicks em links de afiliado</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1 w-fit">
        {[
          { key: 'resumo' as const, label: 'Resumo' },
          { key: 'disparos' as const, label: `Disparos (${data.resumo.total_disparos})` },
          { key: 'api_logs' as const, label: 'Retornos API' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Resumo Tab */}
      {tab === 'resumo' && (
        <div className="space-y-6">
          {/* Produtos por plataforma */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Produtos por plataforma</h2>
            <div className="space-y-3">
              {Object.entries(data.produtos_por_plataforma)
                .sort(([, a], [, b]) => b - a)
                .map(([plat, count]) => (
                  <div key={plat} className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium w-24 text-center ${PLAT_COLORS[plat] || 'bg-gray-100 text-gray-700'}`}>
                      {PLAT_LABELS[plat] || plat}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${PLAT_BAR_COLORS[plat] || 'bg-gray-400'}`}
                        style={{ width: `${(count / maxProdPlat) * 100}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-gray-700 w-12 text-right">{count}</span>
                  </div>
                ))}
            </div>
          </div>

          {/* Disparos ultimos 14 dias */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Disparos por dia (ultimos 14 dias)</h2>
            {dispDiasOrdered.length === 0 ? (
              <p className="text-gray-400 text-sm">Nenhum disparo registrado</p>
            ) : (
              <div className="flex items-end gap-1 h-40">
                {dispDiasOrdered.map(([dia, val]) => {
                  const total = val.enviado + val.erro
                  const pctEnv = (val.enviado / maxDispDia) * 100
                  const pctErr = (val.erro / maxDispDia) * 100
                  return (
                    <div key={dia} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="w-full flex flex-col justify-end" style={{ height: '120px' }}>
                        {val.erro > 0 && (
                          <div className="bg-red-400 rounded-t" style={{ height: `${pctErr}%`, minHeight: val.erro > 0 ? '2px' : 0 }} />
                        )}
                        <div className={`bg-emerald-400 ${val.erro === 0 ? 'rounded-t' : ''} rounded-b`}
                          style={{ height: `${pctEnv}%`, minHeight: val.enviado > 0 ? '2px' : 0 }} />
                      </div>
                      <span className="text-[10px] text-gray-400">{dia.slice(5).replace('-', '/')}</span>
                      <div className="absolute -top-8 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                        {total} ({val.enviado} ok, {val.erro} err)
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* API por plataforma */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Retornos de API por plataforma</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-2 font-medium text-gray-600">Plataforma</th>
                    <th className="pb-2 font-medium text-gray-600 text-right">Total</th>
                    <th className="pb-2 font-medium text-gray-600 text-right">Sucesso</th>
                    <th className="pb-2 font-medium text-gray-600 text-right">Erro</th>
                    <th className="pb-2 font-medium text-gray-600 text-right">Rate Limit</th>
                    <th className="pb-2 font-medium text-gray-600 text-right">Taxa Sucesso</th>
                    <th className="pb-2 font-medium text-gray-600 text-right">Tempo medio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {Object.entries(data.api_logs.por_plataforma).map(([plat, stats]) => {
                    const rate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0
                    return (
                      <tr key={plat}>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded font-medium ${PLAT_COLORS[plat] || 'bg-gray-100 text-gray-700'}`}>
                            {PLAT_LABELS[plat] || plat}
                          </span>
                        </td>
                        <td className="py-2 text-right font-medium">{stats.total}</td>
                        <td className="py-2 text-right text-green-600">{stats.success}</td>
                        <td className="py-2 text-right text-red-600">{stats.error}</td>
                        <td className="py-2 text-right text-yellow-600">{stats.rate_limit}</td>
                        <td className="py-2 text-right">
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            rate >= 80 ? 'bg-green-100 text-green-700' :
                            rate >= 50 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {rate}%
                          </span>
                        </td>
                        <td className="py-2 text-right text-gray-500">{stats.avg_ms}ms</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Disparos Tab */}
      {tab === 'disparos' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Ultimos 50 disparos</h2>
            <div className="flex gap-2">
              {Object.entries(data.disparos.por_grupo).map(([grupo, count]) => (
                <span key={grupo} className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                  {grupo}: {count}
                </span>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left bg-gray-50">
                  <th className="px-4 py-2.5 font-medium text-gray-600">Data/Hora</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Canal</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Grupo</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Produto ID</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Erro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.disparos.recentes.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-400">Nenhum disparo registrado</td></tr>
                ) : data.disparos.recentes.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{formatDate(d.disparado_em)}</td>
                    <td className="px-4 py-2">
                      <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium">
                        {d.canal}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600">{d.grupo_nome || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        d.status === 'enviado' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-400 font-mono">{d.produto_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-2 text-xs text-red-500 max-w-[200px] truncate">{d.erro || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* API Logs Tab */}
      {tab === 'api_logs' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-5 py-3 border-b bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">Ultimas 100 chamadas de API</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left bg-gray-50">
                  <th className="px-4 py-2.5 font-medium text-gray-600">Data/Hora</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Plataforma</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Endpoint</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 text-right">Tempo</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Nicho</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 text-right">Encontrados</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600 text-right">Salvos</th>
                  <th className="px-4 py-2.5 font-medium text-gray-600">Erro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.api_logs.recentes.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-400">Nenhum log de API registrado</td></tr>
                ) : data.api_logs.recentes.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{formatDate(log.criado_em)}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${PLAT_COLORS[log.plataforma] || 'bg-gray-100 text-gray-700'}`}>
                        {PLAT_LABELS[log.plataforma] || log.plataforma}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-600 font-mono">{log.endpoint}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                        log.status === 'success' ? 'bg-green-100 text-green-700' :
                        log.status === 'rate_limit' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-gray-500 text-right">{log.duracao_ms}ms</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{log.nicho || '-'}</td>
                    <td className="px-4 py-2 text-xs text-right font-medium">{log.total_encontrados ?? '-'}</td>
                    <td className="px-4 py-2 text-xs text-right font-medium text-green-600">{log.salvos ?? '-'}</td>
                    <td className="px-4 py-2 text-xs text-red-500 max-w-[250px] truncate">{log.erro || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
