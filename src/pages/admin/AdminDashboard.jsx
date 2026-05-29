import { useEffect, useState } from 'react'
import { Loader2, Users, TrendingUp, CreditCard, AlertTriangle, DollarSign, Calendar, RefreshCw, ArrowUp, ArrowDown, UserCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const fmtBRL = (n) => `R$ ${Number(n || 0).toFixed(2).replace('.', ',')}`
const fmtPct = (n) => `${Number(n || 0).toFixed(1)}%`

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin?resource=stats', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar')
      setStats(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading && !stats) {
    return (
      <div className="text-center py-12">
        <Loader2 size={28} className="animate-spin mx-auto mb-3" style={{ color: '#d4af37' }} />
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Carregando métricas…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg p-4 text-sm" style={{ background: 'rgba(244,63,94,0.08)', border: '1px solid rgba(244,63,94,0.25)', color: '#fda4af' }}>
        {error}
      </div>
    )
  }

  if (!stats) return null

  // Growth do mês (novos vs mês passado)
  const growth = stats.newLastMonth > 0
    ? ((stats.newThisMonth - stats.newLastMonth) / stats.newLastMonth) * 100
    : (stats.newThisMonth > 0 ? 100 : 0)

  return (
    <div className="space-y-6">
      {/* Refresh */}
      <div className="flex justify-end">
        <button
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-50"
          style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-medium)', color: 'var(--text-secondary)' }}
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
          Atualizar
        </button>
      </div>

      {/* HERO: Assinantes ativos + MRR + ARR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <HeroCard
          label="Assinantes ativos"
          value={stats.activeSubs.toLocaleString('pt-BR')}
          sub={`de ${stats.totalUsers} total · ${stats.newThisMonth} novo${stats.newThisMonth !== 1 ? 's' : ''} no mês`}
          icon={UserCheck}
          accent="#06b6d4"
          isNumber
        />
        <HeroCard
          label="MRR · Recorrente mensal"
          value={fmtBRL(stats.mrr)}
          sub={`ARPU médio: ${fmtBRL(stats.arpu)}`}
          icon={TrendingUp}
          accent="#10b981"
        />
        <HeroCard
          label="ARR · Anualizado"
          value={fmtBRL(stats.arr)}
          sub={`Previsão p/ próximo mês: ${fmtBRL(stats.predictedNextMonth)}`}
          icon={Calendar}
          accent="#d4af37"
        />
      </div>

      {/* Métricas principais — grid 4 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <MetricCard
          label="Receita do mês"
          value={fmtBRL(stats.monthlyRevenue)}
          icon={DollarSign}
          accent="#10b981"
          sub="líquido (já descontou Asaas)"
        />
        <MetricCard
          label="Novos no mês"
          value={stats.newThisMonth}
          icon={Users}
          accent="#06b6d4"
          sub={growthSubtitle(growth, stats.newLastMonth)}
        />
        <MetricCard
          label="Cancelamentos"
          value={stats.cancelsThisMonth}
          icon={AlertTriangle}
          accent="#f43f5e"
          sub={`Churn: ${fmtPct(stats.churnPct)}`}
        />
        <MetricCard
          label="ARPU"
          value={fmtBRL(stats.arpu)}
          icon={CreditCard}
          accent="#a78bfa"
          sub="ticket médio/ativo"
        />
      </div>

      {/* Mix de planos + Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Mix de planos">
          <div className="space-y-3">
            <PlanRow label="Mensal" count={stats.planMix.monthly} total={stats.activeSubs} color="#06b6d4" />
            <PlanRow label="Anual" count={stats.planMix.annual} total={stats.activeSubs} color="#d4af37" />
          </div>
        </Card>

        <Card title="Status dos usuários">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <StatusRow label="Ativos" count={stats.activeSubs} color="#10b981" />
            <StatusRow label="Trial" count={stats.trialUsers} color="#06b6d4" />
            <StatusRow label="Atrasados" count={stats.overdueUsers} color="#f59e0b" />
            <StatusRow label="Cancelados" count={stats.cancelledUsers} color="#94a3b8" />
            <StatusRow label="Expirados" count={stats.expiredUsers} color="#f43f5e" />
            <StatusRow label="Total" count={stats.totalUsers} color="#d4af37" emphasis />
          </div>
        </Card>
      </div>

      {/* Gráfico — novos por mês (últimos 6) */}
      {stats.subscribersOverTime?.length > 0 && (
        <Card title="Novos assinantes — últimos 6 meses">
          <BarChart data={stats.subscribersOverTime} />
        </Card>
      )}

      {/* Gráfico — receita mensal (últimos 12 meses) */}
      {stats.monthlyRevenueHistory?.length > 0 && (
        <Card title="Receita mensal líquida — últimos 12 meses">
          <RevenueChart data={stats.monthlyRevenueHistory} />
        </Card>
      )}
    </div>
  )
}

// ---------- HeroCard ----------
function HeroCard({ label, value, sub, icon: Icon, accent, isNumber }) {
  return (
    <div className="rounded-2xl p-5 sm:p-6 relative overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${accent}15, var(--bg-elev2) 60%)`,
        border: `1px solid ${accent}30`,
      }}>
      <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full pointer-events-none"
        style={{ background: `radial-gradient(circle, ${accent}22, transparent 70%)` }} />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>{label}</span>
          <Icon size={16} style={{ color: accent }} />
        </div>
        <div style={{
          fontFamily: isNumber ? 'JetBrains Mono, monospace' : 'Fraunces, serif',
          fontWeight: isNumber ? 600 : 500,
          color: accent,
        }} className="text-3xl sm:text-4xl tabular-nums">
          {value}
        </div>
        {sub && <div className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>{sub}</div>}
      </div>
    </div>
  )
}

// ---------- MetricCard ----------
function MetricCard({ label, value, icon: Icon, accent, sub }) {
  return (
    <div className="rounded-xl p-3.5 sm:p-4"
      style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-soft)' }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <Icon size={14} style={{ color: accent }} />
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-xl sm:text-2xl font-semibold tabular-nums">
        {value}
      </div>
      {sub && <div className="text-[11px] mt-1.5 truncate" style={{ color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  )
}

// ---------- Card wrapper ----------
function Card({ title, children }) {
  return (
    <div className="rounded-xl p-4 sm:p-5" style={{ background: 'var(--bg-elev1)', border: '1px solid var(--border-soft)' }}>
      <div className="text-xs uppercase tracking-widest mb-3" style={{ color: 'var(--text-tertiary)' }}>{title}</div>
      {children}
    </div>
  )
}

// ---------- PlanRow ----------
function PlanRow({ label, count, total, color }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span>{label}</span>
        <span className="tabular-nums" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
          {count} <span style={{ color: 'var(--text-muted)' }}>({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elev3)' }}>
        <div className="h-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ---------- StatusRow ----------
function StatusRow({ label, count, color, emphasis }) {
  return (
    <div className="flex items-center gap-2">
      {!emphasis && <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />}
      <span style={{ color: emphasis ? color : 'var(--text-secondary)', fontWeight: emphasis ? 600 : 400 }}>{label}</span>
      <span className="ml-auto tabular-nums font-medium" style={{ fontFamily: 'JetBrains Mono, monospace', color: emphasis ? color : 'var(--text-primary)' }}>
        {count}
      </span>
    </div>
  )
}

// ---------- BarChart simples ----------
function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.news), 1)
  return (
    <div className="flex items-end justify-between gap-2 h-32 mt-2">
      {data.map((d, i) => {
        const h = (d.news / max) * 100
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            <div className="text-xs tabular-nums font-medium" style={{ color: 'var(--text-secondary)' }}>{d.news}</div>
            <div className="w-full rounded-t" style={{ height: `${Math.max(4, h)}%`, background: 'linear-gradient(180deg, #d4af37, #a87f1f)' }} />
            <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{d.month}</div>
          </div>
        )
      })}
    </div>
  )
}

function growthSubtitle(growth, lastMonth) {
  if (lastMonth === 0) return 'primeiro mês'
  const isUp = growth >= 0
  return `${isUp ? '↑' : '↓'} ${Math.abs(growth).toFixed(0)}% vs mês passado`
}

// ---------- RevenueChart — receita mensal dos últimos 12 meses ----------
// Gráfico de barras com valor em R$ acima de cada barra, dourado.
// Destaca o mês atual com cor mais clara.
function RevenueChart({ data }) {
  const max = Math.max(...data.map((d) => d.revenue), 1)
  const total = data.reduce((s, d) => s + d.revenue, 0)
  const positive = data.filter((d) => d.revenue > 0)
  const avg = positive.length > 0 ? total / positive.length : 0

  // Calcula crescimento do último mês completo vs mês anterior
  const lastTwo = data.slice(-2)
  const growth = lastTwo.length === 2 && lastTwo[0].revenue > 0
    ? ((lastTwo[1].revenue - lastTwo[0].revenue) / lastTwo[0].revenue) * 100
    : 0

  return (
    <div>
      {/* Header com totais agregados */}
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-4 pb-3 border-b" style={{ borderColor: 'var(--border-soft)' }}>
        <div>
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Total no período
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-xl font-semibold tabular-nums">
            {fmtBRL(total)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
            Média (meses com receita)
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace' }} className="text-sm font-medium tabular-nums">
            {fmtBRL(avg)}
            {Math.abs(growth) > 0 && (
              <span className={`ml-2 text-xs ${growth >= 0 ? 'text-emerald-300/85' : 'text-rose-300/85'}`}>
                {growth >= 0 ? '↑' : '↓'} {Math.abs(growth).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico de barras */}
      <div className="flex items-end justify-between gap-1 sm:gap-2 h-40">
        {data.map((d, i) => {
          const h = max > 0 ? (d.revenue / max) * 100 : 0
          const isCurrent = i === data.length - 1
          const isZero = d.revenue === 0
          return (
            <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0 group relative">
              {/* Valor em cima da barra (só desktop, pra mobile fica tooltip) */}
              <div
                className="text-[10px] tabular-nums font-medium whitespace-nowrap hidden sm:block"
                style={{ color: isZero ? 'var(--text-muted)' : 'var(--text-secondary)' }}
              >
                {d.revenue >= 1000 ? `${(d.revenue / 1000).toFixed(1)}k` : Math.round(d.revenue)}
              </div>

              {/* Barra */}
              <div
                className="w-full rounded-t transition-all relative cursor-default"
                style={{
                  height: isZero ? '2px' : `${Math.max(4, h)}%`,
                  background: isZero
                    ? 'var(--border-soft)'
                    : isCurrent
                    ? 'linear-gradient(180deg, #f4d676, #d4af37)'
                    : 'linear-gradient(180deg, #d4af37, #a87f1f)',
                  boxShadow: isCurrent && !isZero ? '0 0 12px rgba(212,175,55,0.3)' : 'none',
                }}
                title={`${d.month}: ${fmtBRL(d.revenue)}`}
              />

              {/* Label do mês */}
              <div
                className="text-[9px] sm:text-[10px] uppercase tracking-wider truncate w-full text-center"
                style={{ color: isCurrent ? '#d4af37' : 'var(--text-muted)' }}
              >
                {d.month}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mt-3 text-[11px] flex items-center gap-3 flex-wrap" style={{ color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded" style={{ background: '#d4af37' }} /> Meses anteriores
        </span>
        <span className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded" style={{ background: '#f4d676' }} /> Mês atual
        </span>
      </div>
    </div>
  )
}
