'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface LogEntry {
  id: string
  plataforma: string
  endpoint: string
  metodo: string
  status: 'success' | 'error' | 'rate_limit'
  http_status: number | null
  duracao_ms: number | null
  nicho: string | null
  total_encontrados: number | null
  salvos: number | null
  erro: string | null
  detalhes: Record<string, any> | null
  request_json: Record<string, any> | null
  response_json: Record<string, any> | null
  criado_em: string
}

interface JsonSize {
  size_bytes: number
  size_pretty: string
  rows_with_json: number
}

const PLATAFORMAS = [
  { id: '', label: 'Todas' },
  { id: 'mercadolivre', label: '🛒 ML' },
  { id: 'shopee', label: '🧡 Shopee' },
  { id: 'aliexpress', label: '🔴 AliExpress' },
  { id: 'amazon', label: '📦 Amazon' },
  { id: 'lomadee', label: '🏬 Lomadee' },
  { id: 'awin', label: '🌐 AWIN' },
]

const STATUS_OPTS = [
  { id: '', label: 'Todos' },
  { id: 'success', label: '✅ Sucesso' },
  { id: 'error', label: '❌ Erro' },
  { id: 'rate_limit', label: '⏱️ Rate Limit' },
]

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, erros: 0, sucessos: 0 })
  const [jsonSize, setJsonSize] = useState<JsonSize | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)

  const hoje = new Date().toISOString().slice(0, 10)
  const [dataInicio, setDataInicio] = useState(hoje)
  const [dataFim, setDataFim] = useState(hoje)
  const [plataforma, setPlataforma] = useState('')
  const [status, setStatus] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(false)

  const loadLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '300' })
      if (plataforma) params.set('plataforma', plataforma)
      if (status) params.set('status', status)
      if (dataInicio) params.set('data_inicio', dataInicio)
      if (dataFim) params.set('data_fim', dataFim)

      const res = await fetch(`/api/logs?${params}`)
      const data = await res.json()
      setLogs(data.logs || [])
      setStats({ total: data.total || 0, erros: data.erros || 0, sucessos: data.sucessos || 0 })
      if (data.json_size) setJsonSize(data.json_size)
    } finally {
      setLoading(false)
    }
  }, [plataforma, status, dataInicio, dataFim])

  useEffect(() => { loadLogs() }, [loadLogs])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(loadLogs, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh, loadLogs])

  const handleLimpar = async () => {
    if (!confirm('Excluir logs com mais de 30 dias?')) return
    await fetch('/api/logs?dias=30', { method: 'DELETE' })
    loadLogs()
  }

  const handleLimparJsons = async () => {
    if (!confirm('Limpar todos os JSONs armazenados? Os logs serão mantidos.')) return
    await fetch('/api/logs', { method: 'PATCH' })
    setJsonSize(null)
    loadLogs()
  }

  const fmtDur = (ms: number | null) => {
    if (!ms) return '–'
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const fmtData = (iso: string) =>
    new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })

  const statusBadge = (s: string) => {
    if (s === 'success') return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 text-xs">✅ Sucesso</Badge>
    if (s === 'rate_limit') return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 text-xs">⏱️ Rate Limit</Badge>
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">❌ Erro</Badge>
  }

  const plataformaIcon = (p: string) => {
    if (p === 'mercadolivre') return '🛒'
    if (p === 'shopee') return '🧡'
    if (p === 'aliexpress') return '🔴'
    if (p === 'amazon') return '📦'
    if (p === 'lomadee') return '🏬'
    if (p === 'awin') return '🌐'
    return '🔌'
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🗂️ Logs de API</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {stats.total} registros · <span className="text-green-600">{stats.sucessos} sucessos</span> · <span className="text-red-600">{stats.erros} erros</span>
          </p>
          {jsonSize && (
            <p className="text-xs text-gray-400 mt-0.5">
              JSONs armazenados: <span className="font-medium text-gray-600">{jsonSize.size_pretty}</span>
              <span className="ml-1">({jsonSize.rows_with_json} logs)</span>
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => setAutoRefresh(v => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${autoRefresh ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {autoRefresh ? '🟢 Auto (10s)' : '⏸️ Auto off'}
          </button>
          <Button onClick={loadLogs} variant="outline" className="text-xs h-8">🔄 Atualizar</Button>
          {jsonSize && jsonSize.size_bytes > 0 && (
            <Button onClick={handleLimparJsons} variant="outline" className="text-xs h-8 text-rose-500 hover:text-rose-600">
              🧹 Limpar JSONs ({jsonSize.size_pretty})
            </Button>
          )}
          <Button onClick={handleLimpar} variant="outline" className="text-xs h-8 text-red-500 hover:text-red-600">🗑️ Limpar antigos</Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="mb-4">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap gap-4">
            {/* Data */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5 font-medium">Período</p>
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-gray-400">De</span>
                  <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                    className="px-2 py-1.5 rounded-lg text-xs border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-rose-400" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs text-gray-400">Até</span>
                  <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                    className="px-2 py-1.5 rounded-lg text-xs border border-gray-200 bg-white text-gray-700 focus:outline-none focus:border-rose-400" />
                </div>
                <button onClick={() => { setDataInicio(''); setDataFim('') }}
                  className="text-xs text-gray-400 hover:text-gray-600 mt-4">Todos</button>
              </div>
            </div>

            {/* Plataforma */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5 font-medium">Plataforma</p>
              <div className="flex flex-wrap gap-1.5">
                {PLATAFORMAS.map(p => (
                  <button key={p.id} onClick={() => setPlataforma(p.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${plataforma === p.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <p className="text-xs text-gray-500 mb-1.5 font-medium">Status</p>
              <div className="flex gap-1.5">
                {STATUS_OPTS.map(s => (
                  <button key={s.id} onClick={() => setStatus(s.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${status === s.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de logs */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">Nenhum log encontrado.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Data/Hora</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Plataforma</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Categoria</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Status</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Encontrados</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Salvos</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Duração</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => (
                <>
                  <tr key={log.id}
                    className={`hover:bg-gray-50 transition-colors ${log.status !== 'success' ? 'bg-red-50/30' : ''}`}>
                    <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtData(log.criado_em)}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-gray-700">
                      {plataformaIcon(log.plataforma)} {log.plataforma}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600">{log.nicho || '–'}</td>
                    <td className="px-4 py-2.5">{statusBadge(log.status)}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-gray-600">{log.total_encontrados ?? '–'}</td>
                    <td className="px-4 py-2.5 text-xs text-right font-medium text-green-700">{log.salvos ?? '–'}</td>
                    <td className="px-4 py-2.5 text-xs text-right text-gray-500">{fmtDur(log.duracao_ms)}</td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => setExpandido(expandido === log.id ? null : log.id)}
                        className="text-xs text-blue-500 hover:underline">
                        {expandido === log.id ? '▲' : '▼'}
                      </button>
                    </td>
                  </tr>
                  {expandido === log.id && (
                    <tr key={log.id + '_exp'} className="bg-gray-50">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="space-y-2 text-xs text-gray-600">
                          <p><span className="font-medium">Endpoint:</span> {log.endpoint}</p>
                          {log.erro && <p className="text-red-600"><span className="font-medium">Erro:</span> {log.erro}</p>}
                          {log.detalhes && (
                            <div>
                              <p className="font-medium text-gray-500 mb-1">Detalhes</p>
                              <pre className="bg-gray-100 rounded p-2 text-xs overflow-auto max-h-32">
                                {JSON.stringify(log.detalhes, null, 2)}
                              </pre>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            {log.request_json ? (
                              <div>
                                <p className="font-medium text-blue-600 mb-1">📤 Request</p>
                                <pre className="bg-blue-50 border border-blue-100 rounded p-2 text-xs overflow-auto max-h-48">
                                  {JSON.stringify(log.request_json, null, 2)}
                                </pre>
                              </div>
                            ) : (
                              <div>
                                <p className="font-medium text-gray-400 mb-1">📤 Request</p>
                                <p className="text-gray-400 text-xs italic">Não armazenado</p>
                              </div>
                            )}
                            {log.response_json ? (
                              <div>
                                <p className="font-medium text-green-600 mb-1">📥 Response</p>
                                <pre className="bg-green-50 border border-green-100 rounded p-2 text-xs overflow-auto max-h-48">
                                  {JSON.stringify(log.response_json, null, 2)}
                                </pre>
                              </div>
                            ) : (
                              <div>
                                <p className="font-medium text-gray-400 mb-1">📥 Response</p>
                                <p className="text-gray-400 text-xs italic">Não armazenado</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
