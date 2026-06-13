'use client'

import { useEffect, useState } from 'react'
import AdminHeader from '@/components/admin/AdminHeader'
import { Spinner, StatusBadge, formatCurrency, formatDate } from '@/components/ui'
import { locacaoService, infracaoService, manutencaoService, clienteService } from '@/lib/services'
import { supabase } from '@/lib/supabase'
import { LOCACAO_STATUS } from '@/types'
import { Bike, TrendingUp, AlertTriangle, Wrench, Users, Clock } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

interface UltimaLocacao {
  id: number
  data_inicio: string
  data_fim: string
  status: string
  valor_total: number
  cliente_nome: string
  moto_nome: string
  moto_placa: string
}

interface LocacaoRaw {
  created_at: string
  valor_total: number
  status: string
}

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

function buildMonthlyRevenue(locacoes: LocacaoRaw[]) {
  const now = new Date()
  const months: { mes: string; receita: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ mes: `${MESES[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`, receita: 0 })
  }
  for (const l of locacoes) {
    if (!l.created_at) continue
    const d = new Date(l.created_at)
    const key = `${MESES[d.getMonth()]}/${d.getFullYear().toString().slice(2)}`
    const m = months.find((x) => x.mes === key)
    if (m) m.receita += l.valor_total || 0
  }
  return months
}

function buildStatusDist(locacoes: LocacaoRaw[]) {
  const counts: Record<string, number> = {}
  for (const l of locacoes) counts[l.status] = (counts[l.status] || 0) + 1
  return Object.entries(counts).map(([status, value]) => ({
    name: LOCACAO_STATUS[status]?.label || status,
    value,
    color: LOCACAO_STATUS[status]?.color || '#6B7280',
  }))
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [loc, setLoc] = useState({ ativas: 0, atrasadas: 0, receita_total: 0, receita_pendente: 0 })
  const [inf, setInf] = useState({ pendentes: 0, valor_pendente: 0 })
  const [man, setMan] = useState({ em_andamento: 0 })
  const [totalClientes, setTotalClientes] = useState(0)
  const [ultimas, setUltimas] = useState<UltimaLocacao[]>([])
  const [monthlyRevenue, setMonthlyRevenue] = useState<{ mes: string; receita: number }[]>([])
  const [statusDist, setStatusDist] = useState<{ name: string; value: number; color: string }[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    try {
      const [l, i, m, clientes, recentes, todasLoc] = await Promise.all([
        locacaoService.getEstatisticas(),
        infracaoService.getEstatisticas(),
        manutencaoService.getEstatisticas(),
        clienteService.getClientes(),
        supabase.from('locacoes').select('id,data_inicio,data_fim,status,valor_total,cliente_nome,moto_nome,moto_placa').order('created_at', { ascending: false }).limit(5),
        supabase.from('locacoes').select('created_at,valor_total,status'),
      ])
      setLoc(l); setInf(i); setMan(m); setTotalClientes(clientes.length)
      setUltimas((recentes.data as UltimaLocacao[]) || [])
      const raw = (todasLoc.data as LocacaoRaw[]) || []
      setMonthlyRevenue(buildMonthlyRevenue(raw))
      setStatusDist(buildStatusDist(raw))
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const receitaRecebida = Math.max(0, loc.receita_total - loc.receita_pendente)

  const cards = [
    { label: 'Locações Ativas', value: loc.ativas, icon: Bike, color: '#3B82F6', sub: loc.atrasadas > 0 ? `${loc.atrasadas} atrasada(s)` : undefined, subColor: '#EF4444' },
    { label: 'Receita Total', value: formatCurrency(loc.receita_total), icon: TrendingUp, color: '#22C55E', sub: `Recebido: ${formatCurrency(receitaRecebida)}`, subColor: '#22C55E' },
    { label: 'Infrações Pendentes', value: inf.pendentes, icon: AlertTriangle, color: '#F59E0B', sub: formatCurrency(inf.valor_pendente), subColor: '#F59E0B' },
    { label: 'Manutenções', value: man.em_andamento, icon: Wrench, color: '#39FF14', sub: 'em andamento', subColor: '#9CA3AF' },
    { label: 'Total de Clientes', value: totalClientes, icon: Users, color: '#8B5CF6' },
  ]

  return (
    <>
      <AdminHeader title="Dashboard" subtitle="Visão geral da operação" />
      <main className="flex-1 p-6 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : (
          <>
            {/* Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {cards.map((c) => (
                <div key={c.label} className="rounded-xl border border-white/10 bg-[#111] p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-medium text-white/50 uppercase tracking-wide">{c.label}</p>
                      <p className="text-2xl font-bold text-white mt-1">{c.value}</p>
                      {c.sub && <p className="text-xs mt-1" style={{ color: c.subColor }}>{c.sub}</p>}
                    </div>
                    <div className="p-2.5 rounded-lg" style={{ backgroundColor: c.color }}>
                      <c.icon size={20} className="text-white" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Receita mensal */}
              <div className="lg:col-span-2 rounded-xl border border-white/10 bg-[#111] p-5">
                <h2 className="font-semibold text-white mb-4">Receita — últimos 6 meses</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={monthlyRevenue} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} axisLine={false} tickLine={false} width={50} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                      labelStyle={{ color: 'rgba(255,255,255,0.7)' }}
                      formatter={(v) => [formatCurrency(Number(v ?? 0)), 'Receita']}
                    />
                    <Bar dataKey="receita" fill="#39FF14" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Distribuição por status */}
              <div className="rounded-xl border border-white/10 bg-[#111] p-5">
                <h2 className="font-semibold text-white mb-4">Status das Locações</h2>
                {statusDist.length === 0 ? (
                  <div className="flex items-center justify-center h-[220px] text-white/30 text-sm">Sem dados</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={statusDist} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={80} paddingAngle={2}>
                        {statusDist.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Legend
                        formatter={(value) => <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{value}</span>}
                        wrapperStyle={{ fontSize: 11 }}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                        formatter={(v, name) => [v, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Últimas Locações */}
            <div className="rounded-xl border border-white/10 bg-[#111]">
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="font-semibold text-white">Últimas Locações</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-white/40 uppercase tracking-wide border-b border-white/10">
                      <th className="px-6 py-3">Cliente</th>
                      <th className="px-6 py-3">Moto</th>
                      <th className="px-6 py-3">Período</th>
                      <th className="px-6 py-3">Valor</th>
                      <th className="px-6 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimas.length === 0 ? (
                      <tr><td colSpan={5} className="px-6 py-8 text-center text-white/40">Nenhuma locação encontrada</td></tr>
                    ) : ultimas.map((l) => {
                      const st = LOCACAO_STATUS[l.status] || { label: l.status, color: '#6B7280' }
                      return (
                        <tr key={l.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                          <td className="px-6 py-3 font-medium text-white">{l.cliente_nome || '-'}</td>
                          <td className="px-6 py-3 text-white/70">{l.moto_nome ? `${l.moto_nome}${l.moto_placa ? ` · ${l.moto_placa}` : ''}` : '-'}</td>
                          <td className="px-6 py-3 text-white/70">
                            <span className="flex items-center gap-1"><Clock size={12} />{formatDate(l.data_inicio)} → {formatDate(l.data_fim)}</span>
                          </td>
                          <td className="px-6 py-3 font-medium text-white">{formatCurrency(l.valor_total)}</td>
                          <td className="px-6 py-3"><StatusBadge label={st.label} color={st.color} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  )
}
