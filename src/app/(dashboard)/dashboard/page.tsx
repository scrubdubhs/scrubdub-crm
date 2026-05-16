'use client'
import { useState, useEffect } from 'react'
import { DollarSign, Target, Eye, BarChart2, ArrowUp, ArrowDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { PIPELINE_STAGES, LEAD_SOURCES } from '@/lib/constants'
import { createClient } from '@/lib/supabase-browser'

type Stats = {
  total_revenue: number
  revenue_this_month: number
  revenue_last_month: number
  total_leads: number
  close_rate: number
  avg_job_value: number
  jobs_this_month: number
  pipeline_counts: Record<string, number>
  leads_by_source: Record<string, number>
  monthly_revenue: { month: string; revenue: number }[]
}

const EMPTY: Stats = {
  total_revenue: 0, revenue_this_month: 0, revenue_last_month: 0,
  total_leads: 0, close_rate: 0, avg_job_value: 0, jobs_this_month: 0,
  pipeline_counts: {}, leads_by_source: {}, monthly_revenue: [],
}

function StatCard({ icon: Icon, label, value, sub, color, trend }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string; trend?: number
}) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <div className={`p-2 rounded-lg ${color} bg-opacity-20`}>
          <Icon size={14} className={color.replace('bg-', 'text-')} />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</div>
        {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{sub}</div>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
          {Math.abs(trend)}% vs last month
        </div>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const now = new Date()
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

      const [{ data: paidInv }, { data: leads }, { data: jobs }] = await Promise.all([
        supabase.from('invoices').select('total, paid_at, created_at').eq('payment_status', 'paid'),
        supabase.from('leads').select('stage, source, created_at'),
        supabase.from('jobs').select('scheduled_date, total_price').eq('status', 'completed'),
      ])

      const totalRevenue = (paidInv ?? []).reduce((s, i) => s + i.total, 0)
      const revenueThisMonth = (paidInv ?? []).filter(i => i.paid_at >= thisMonthStart).reduce((s, i) => s + i.total, 0)
      const revenueLastMonth = (paidInv ?? []).filter(i => i.paid_at >= lastMonthStart && i.paid_at <= lastMonthEnd).reduce((s, i) => s + i.total, 0)

      const totalLeads = (leads ?? []).length
      const paidLeads = (leads ?? []).filter(l => l.stage === 'paid').length
      const closeRate = totalLeads > 0 ? Math.round((paidLeads / totalLeads) * 100) : 0

      const jobsThisMonth = (jobs ?? []).filter(j => j.scheduled_date >= thisMonthStart.slice(0, 10)).length
      const avgJobValue = jobs && jobs.length > 0 ? jobs.reduce((s, j) => s + j.total_price, 0) / jobs.length : 0

      const pipeline_counts: Record<string, number> = {}
      for (const l of (leads ?? [])) pipeline_counts[l.stage] = (pipeline_counts[l.stage] ?? 0) + 1

      const leads_by_source: Record<string, number> = {}
      for (const l of (leads ?? [])) leads_by_source[l.source] = (leads_by_source[l.source] ?? 0) + 1

      const monthly_revenue: { month: string; revenue: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const start = d.toISOString()
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString()
        const rev = (paidInv ?? []).filter(inv => inv.paid_at >= start && inv.paid_at <= end).reduce((s, inv) => s + inv.total, 0)
        monthly_revenue.push({ month: d.toLocaleString('default', { month: 'short' }), revenue: rev })
      }

      setStats({ total_revenue: totalRevenue, revenue_this_month: revenueThisMonth, revenue_last_month: revenueLastMonth, total_leads: totalLeads, close_rate: closeRate, avg_job_value: avgJobValue, jobs_this_month: jobsThisMonth, pipeline_counts, leads_by_source, monthly_revenue })
      setLoading(false)
    }
    load()
  }, [])

  const revenueChange = stats.revenue_last_month > 0
    ? Math.round(((stats.revenue_this_month - stats.revenue_last_month) / stats.revenue_last_month) * 100)
    : 0
  const maxRevenue = Math.max(...stats.monthly_revenue.map(m => m.revenue), 1)

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div className="px-6 py-4 border-b shrink-0" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <h1 className="text-lg font-semibold">Dashboard</h1>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>Scrub-A-Dub Home Services — St. Louis, MO</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-secondary)' }}>Loading…</div>
      ) : (
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} label="Revenue This Month" value={formatCurrency(stats.revenue_this_month)}
              sub={`${formatCurrency(stats.total_revenue)} all time`} color="bg-green-500" trend={revenueChange} />
            <StatCard icon={Target} label="Close Rate" value={`${stats.close_rate}%`} sub="Leads → Paid" color="bg-blue-500" />
            <StatCard icon={BarChart2} label="Avg Job Value" value={formatCurrency(stats.avg_job_value)}
              sub={`${stats.jobs_this_month} jobs this month`} color="bg-yellow-500" />
            <StatCard icon={Eye} label="Total Leads" value={String(stats.total_leads)} sub="All time" color="bg-purple-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-sm font-medium mb-4">Monthly Revenue (last 6 months)</div>
              {stats.monthly_revenue.every(m => m.revenue === 0) ? (
                <div className="h-36 flex items-center justify-center text-sm" style={{ color: 'var(--text-secondary)' }}>No revenue data yet</div>
              ) : (
                <div className="flex items-end gap-2 h-36">
                  {stats.monthly_revenue.map(m => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.revenue > 0 ? formatCurrency(m.revenue) : ''}</div>
                      <div className="w-full rounded-t-md bg-blue-500 transition-all"
                        style={{ height: `${(m.revenue / maxRevenue) * 100}px` }} />
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{m.month}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl p-4 space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <div className="text-sm font-medium">Lead Sources</div>
              {Object.keys(stats.leads_by_source).length === 0 ? (
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No leads yet</div>
              ) : Object.entries(stats.leads_by_source).map(([source, count]) => {
                const label = LEAD_SOURCES.find(l => l.key === source)?.label ?? source
                const pct = stats.total_leads > 0 ? Math.round((count / stats.total_leads) * 100) : 0
                return (
                  <div key={source}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                      <span>{count} ({pct}%)</span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{ background: 'var(--border)' }}>
                      <div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="text-sm font-medium mb-3">Pipeline Overview</div>
            {Object.keys(stats.pipeline_counts).length === 0 ? (
              <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>No leads in pipeline yet</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {PIPELINE_STAGES.map(stage => {
                  const count = stats.pipeline_counts[stage.key] ?? 0
                  return (
                    <div key={stage.key} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                      <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{stage.label}</span>
                      <span className="text-xs font-semibold">{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
