'use client'

import { useState } from 'react'
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2,
  BarChart3, Sparkles, Calendar, Sun, ChevronUp, ChevronDown,
  Activity, Building2, ClipboardList,
} from 'lucide-react'
import { AnalyticsTabs } from '@/components/analytics-tabs'
import { AnalyticsRefreshButton } from '@/components/analytics-refresh-button'
import type { AnalyticsData, WorstItem, PropertyTrend, ShiftBreakdown, DayOfWeekPattern, ModuleSectionBreakdown, SubmissionCadence } from '@/app/actions/analytics'

const MODULE_LABELS: Record<string, string> = {
  bar_checklist: 'Bar',
  restaurant_lunch_dinner: 'L&D',
  restaurant_breakfast: 'Breakfast',
  duty_manager: 'Duty Mgr',
  mystery_shopper: 'Mystery',
}

function scoreColor(score: number | null) {
  if (score === null) return 'bg-stone-100 text-stone-400'
  if (score >= 80) return 'bg-emerald-50 text-emerald-700'
  if (score >= 60) return 'bg-amber-50 text-amber-700'
  return 'bg-red-50 text-red-700'
}

function scoreBg(score: number | null) {
  if (score === null) return '#f5f5f4'
  if (score >= 80) return '#d1fae5'
  if (score >= 60) return '#fef3c7'
  return '#fee2e2'
}

function fmt(n: number | null, decimals = 1) {
  if (n === null) return '—'
  return n.toFixed(decimals) + '%'
}

// ─── KPI Tile ────────────────────────────────────────────────────────────────
function KpiTile({ label, value, sub, icon: Icon, color }: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-xs text-stone-500 uppercase tracking-wide font-medium">{label}</p>
        <p className="text-2xl font-bold text-stone-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-stone-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ─── Tab: Overview ───────────────────────────────────────────────────────────
function OverviewTab({ data }: { data: AnalyticsData }) {
  const { orgCompliance, totalSubmissions, properties, moduleAverages, propertyCompliance } = data
  const activeProps = properties.filter(p =>
    Object.values(propertyCompliance[p.id] || {}).some(m => m.count > 0)
  )
  const expectedPerDay = data.expectedSubmissionsPerDay
  const actualPerDay = data.avgActualSubmissionsPerDay
  const gapPct = expectedPerDay > 0 ? ((actualPerDay / expectedPerDay) * 100) : null

  const maxCount = Math.max(...moduleAverages.map(m => m.count), 1)

  return (
    <div className="space-y-6">
      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiTile
          label="Org Compliance"
          value={fmt(orgCompliance)}
          sub="30-day average across all modules"
          icon={Activity}
          color="bg-rtg-gold-soft text-rtg-brown"
        />
        <KpiTile
          label="Total Submissions"
          value={totalSubmissions.toLocaleString()}
          sub="Last 30 days"
          icon={ClipboardList}
          color="bg-stone-100 text-stone-600"
        />
        <KpiTile
          label="Active Properties"
          value={`${activeProps.length} / ${properties.length}`}
          sub="Properties with submissions"
          icon={Building2}
          color="bg-stone-100 text-stone-600"
        />
        <KpiTile
          label="Submission Rate"
          value={gapPct !== null ? gapPct.toFixed(0) + '%' : '—'}
          sub={`${actualPerDay.toFixed(1)}/day actual vs ${expectedPerDay} expected`}
          icon={Calendar}
          color={gapPct !== null && gapPct < 60 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}
        />
      </div>

      {/* Module averages */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-4">Module Performance (30-day avg)</h3>
        <div className="space-y-3">
          {moduleAverages.map(mod => (
            <div key={mod.module} className="flex items-center gap-3">
              <span className="text-xs text-stone-500 w-20 sm:w-28 shrink-0 truncate">{mod.label}</span>
              <div className="flex-1 bg-stone-100 rounded-full h-5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${mod.count > 0 ? Math.min(mod.avg, 100) : 0}%`,
                    backgroundColor: mod.avg >= 80 ? '#059669' : mod.avg >= 60 ? '#d97706' : '#dc2626',
                  }}
                />
              </div>
              <span className={`text-xs font-semibold w-14 text-right ${mod.count === 0 ? 'text-stone-400' : mod.avg >= 80 ? 'text-emerald-700' : mod.avg >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                {mod.count > 0 ? fmt(mod.avg) : 'No data'}
              </span>
              <span className="text-xs text-stone-400 w-20 text-right hidden sm:block">{mod.count} submissions</span>
              <div
                className="h-2 rounded-full ml-1 hidden sm:block"
                style={{
                  width: `${(mod.count / maxCount) * 60}px`,
                  backgroundColor: '#C8922A30',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Property × Module matrix */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 overflow-x-auto">
        <h3 className="text-sm font-semibold text-stone-700 mb-4">Property Compliance Matrix</h3>
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th className="text-left text-stone-500 font-medium pb-2 pr-4 whitespace-nowrap">Property</th>
              {moduleAverages.map(mod => (
                <th key={mod.module} className="text-center text-stone-500 font-medium pb-2 px-2 whitespace-nowrap">
                  {MODULE_LABELS[mod.module]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {properties.map(prop => (
              <tr key={prop.id}>
                <td className="py-2 pr-4 font-medium text-stone-700 whitespace-nowrap">{prop.name}</td>
                {moduleAverages.map(mod => {
                  const cell = propertyCompliance[prop.id]?.[mod.module]
                  return (
                    <td key={mod.module} className="py-2 px-2 text-center">
                      {cell && cell.count > 0 ? (
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md font-semibold ${scoreColor(cell.avg)}`}
                        >
                          {fmt(cell.avg, 0)}
                        </span>
                      ) : (
                        <span className="text-stone-300">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center gap-4 mt-4 text-xs text-stone-500">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-200 inline-block" /> ≥80% Good</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-200 inline-block" /> 60–79% Fair</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> &lt;60% Poor</span>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Trends ─────────────────────────────────────────────────────────────
function TrendsTab({ trends }: { trends: PropertyTrend[] }) {
  const directionBadge = (d: PropertyTrend['direction'], delta: number | null) => {
    if (d === 'improving') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium">
        <TrendingUp className="w-3 h-3" /> +{delta?.toFixed(1)}%
      </span>
    )
    if (d === 'declining') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-medium">
        <TrendingDown className="w-3 h-3" /> {delta?.toFixed(1)}%
      </span>
    )
    if (d === 'stable') return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 text-xs font-medium">
        <Minus className="w-3 h-3" /> Stable
      </span>
    )
    return <span className="text-xs text-stone-400">Insufficient data</span>
  }

  if (trends.length === 0) {
    return <p className="text-stone-400 text-sm">No trend data available yet.</p>
  }

  const weekLabels = trends[0].weeks.map(w => w.weekLabel)

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-6 overflow-x-auto">
      <h3 className="text-sm font-semibold text-stone-700 mb-4">Weekly Compliance Trends by Property (rolling 5 weeks)</h3>
      <table className="min-w-full text-xs">
        <thead>
          <tr>
            <th className="text-left text-stone-500 font-medium pb-2 pr-6 whitespace-nowrap">Property</th>
            {weekLabels.map((wl, i) => (
              <th key={i} className="text-center text-stone-500 font-medium pb-2 px-3 whitespace-nowrap">{wl}</th>
            ))}
            <th className="text-center text-stone-500 font-medium pb-2 px-3 whitespace-nowrap">Trend</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-50">
          {trends.map(prop => (
            <tr key={prop.propertyId} className="hover:bg-stone-50">
              <td className="py-3 pr-6 font-medium text-stone-800 whitespace-nowrap">{prop.propertyName}</td>
              {prop.weeks.map((w, i) => (
                <td key={i} className="py-3 px-3 text-center">
                  {w.avg !== null ? (
                    <span
                      className="inline-block px-2 py-0.5 rounded-md font-semibold"
                      style={{ backgroundColor: scoreBg(w.avg), color: w.avg >= 80 ? '#065f46' : w.avg >= 60 ? '#92400e' : '#991b1b' }}
                    >
                      {w.avg.toFixed(0)}%
                    </span>
                  ) : (
                    <span className="text-stone-300">—</span>
                  )}
                </td>
              ))}
              <td className="py-3 px-3 text-center">{directionBadge(prop.direction, prop.delta)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Tab: Section Drill-Down ──────────────────────────────────────────────────
function SectionsTab({ sectionBreakdowns }: { sectionBreakdowns: ModuleSectionBreakdown[] }) {
  const [activeModule, setActiveModule] = useState(sectionBreakdowns[0]?.module ?? '')

  const current = sectionBreakdowns.find(b => b.module === activeModule)
  const sorted = current ? [...current.sections].sort((a, b) => {
    if (a.avg === null) return 1
    if (b.avg === null) return -1
    return a.avg - b.avg
  }) : []

  return (
    <div className="space-y-4">
      {/* Module selector */}
      <div className="flex gap-2 flex-wrap">
        {sectionBreakdowns.map(b => (
          <button
            key={b.module}
            onClick={() => setActiveModule(b.module)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
              activeModule === b.module
                ? 'bg-rtg-brown text-white border-rtg-brown'
                : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {current && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="text-sm font-semibold text-stone-700 mb-1">{current.label} — Section Scores</h3>
          <p className="text-xs text-stone-400 mb-5">Sorted worst-first. Based on last 30 days.</p>
          <div className="space-y-4">
            {sorted.map(section => (
              <div key={section.sectionId}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-stone-700 font-medium">{section.sectionTitle}</span>
                  <span className={`text-sm font-bold ${section.avg === null ? 'text-stone-400' : section.avg >= 80 ? 'text-emerald-700' : section.avg >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                    {fmt(section.avg)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-stone-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${section.avg !== null ? Math.min(section.avg, 100) : 0}%`,
                        backgroundColor: section.avg === null ? '#d6d3d1' : section.avg >= 80 ? '#059669' : section.avg >= 60 ? '#d97706' : '#dc2626',
                      }}
                    />
                  </div>
                  <span className="text-xs text-stone-400 w-20 text-right flex-shrink-0">
                    {section.count > 0 ? `${section.count} forms` : 'No data'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Tab: Failure Analysis ────────────────────────────────────────────────────
function FailuresTab({ worstItems, shiftBreakdowns, dayOfWeekPatterns }: {
  worstItems: WorstItem[]
  shiftBreakdowns: ShiftBreakdown[]
  dayOfWeekPatterns: DayOfWeekPattern[]
}) {
  const badgeMod = (mod: string) => {
    const colors: Record<string, string> = {
      bar_checklist: 'bg-blue-50 text-blue-700',
      restaurant_lunch_dinner: 'bg-purple-50 text-purple-700',
      restaurant_breakfast: 'bg-orange-50 text-orange-700',
      duty_manager: 'bg-stone-100 text-stone-600',
      mystery_shopper: 'bg-rtg-gold-soft text-rtg-brown',
    }
    return colors[mod] ?? 'bg-stone-100 text-stone-600'
  }

  const validDow = dayOfWeekPatterns.filter(d => d.avg !== null)
  const worstDay = validDow.length > 0 ? validDow.reduce((a, b) => a.avg! < b.avg! ? a : b) : null
  const bestDay = validDow.length > 0 ? validDow.reduce((a, b) => a.avg! > b.avg! ? a : b) : null
  const maxDow = Math.max(...validDow.map(d => d.count), 1)

  return (
    <div className="space-y-6">
      {/* Worst items */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <div className="flex items-center gap-2 mb-1">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-semibold text-stone-700">High-Failure Checklist Items</h3>
        </div>
        <p className="text-xs text-stone-400 mb-5">Items with highest failure rates in the last 30 days, sorted worst-first.</p>
        {worstItems.length === 0 ? (
          <p className="text-stone-400 text-sm">No failure data yet.</p>
        ) : (
          <div className="space-y-2">
            {worstItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 py-2 border-b border-stone-50 last:border-0">
                <span className="text-xs font-bold text-stone-400 w-5 flex-shrink-0 pt-1">#{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-800 font-medium leading-snug">{item.label}</p>
                  <p className="text-xs text-stone-400 mt-0.5">{item.sectionTitle}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline-flex ${badgeMod(item.module)}`}>
                  {MODULE_LABELS[item.module]}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="w-20 bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-400"
                      style={{ width: `${Math.min(item.failRate, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-red-600 w-10 text-right">
                    {item.failRate.toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shift breakdown */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Sun className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-stone-700">AM vs PM Compliance</h3>
          </div>
          <p className="text-xs text-stone-400 mb-5">Bar and Lunch & Dinner modules only (shift-based).</p>
          <div className="space-y-5">
            {shiftBreakdowns.map(sb => (
              <div key={sb.module}>
                <p className="text-xs font-semibold text-stone-600 mb-2">{sb.label}</p>
                <div className="space-y-2">
                  {[
                    { label: 'AM', value: sb.am, count: sb.amCount },
                    { label: 'PM', value: sb.pm, count: sb.pmCount },
                  ].map(shift => (
                    <div key={shift.label} className="flex items-center gap-3">
                      <span className="text-xs text-stone-500 w-5">{shift.label}</span>
                      <div className="flex-1 bg-stone-100 rounded-full h-4 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${shift.value !== null ? Math.min(shift.value, 100) : 0}%`,
                            backgroundColor: shift.value === null ? '#d6d3d1' : shift.value >= 80 ? '#059669' : shift.value >= 60 ? '#d97706' : '#dc2626',
                          }}
                        />
                      </div>
                      <span className={`text-xs font-semibold w-12 text-right ${shift.value === null ? 'text-stone-400' : shift.value >= 80 ? 'text-emerald-700' : shift.value >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                        {fmt(shift.value, 0)}
                      </span>
                      <span className="text-xs text-stone-400 w-16 text-right hidden sm:block">{shift.count} forms</span>
                    </div>
                  ))}
                </div>
                {sb.gap !== null && (
                  <p className={`text-xs mt-2 ${Math.abs(sb.gap) > 5 ? 'text-amber-600 font-medium' : 'text-stone-400'}`}>
                    Gap: {sb.gap > 0 ? 'AM leads PM by ' : 'PM leads AM by '}{Math.abs(sb.gap).toFixed(1)}%
                    {Math.abs(sb.gap) > 10 && ' ⚠ Significant gap'}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Day-of-week */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-stone-500" />
            <h3 className="text-sm font-semibold text-stone-700">Day-of-Week Patterns</h3>
          </div>
          <p className="text-xs text-stone-400 mb-5">Avg compliance by day across all modules.</p>
          <div className="space-y-2">
            {dayOfWeekPatterns.map(d => (
              <div key={d.day} className="flex items-center gap-3">
                <span className={`text-xs w-8 flex-shrink-0 font-medium ${
                  worstDay?.day === d.day ? 'text-red-600' :
                  bestDay?.day === d.day ? 'text-emerald-600' : 'text-stone-500'
                }`}>{d.day}</span>
                <div className="flex-1 bg-stone-100 rounded-full h-4 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${d.avg !== null ? Math.min(d.avg, 100) : 0}%`,
                      backgroundColor: d.avg === null ? '#d6d3d1' : d.avg >= 80 ? '#059669' : d.avg >= 60 ? '#d97706' : '#dc2626',
                    }}
                  />
                </div>
                <span className={`text-xs font-semibold w-12 text-right ${d.avg === null ? 'text-stone-400' : d.avg >= 80 ? 'text-emerald-700' : d.avg >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                  {fmt(d.avg, 0)}
                </span>
                <div className="h-2 rounded-full" style={{ width: `${(d.count / maxDow) * 40}px`, backgroundColor: '#C8922A40', minWidth: '2px' }} />
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-4 text-xs">
            {worstDay && <p className="text-red-600">↓ Worst: <strong>{worstDay.day}</strong> ({fmt(worstDay.avg, 0)})</p>}
            {bestDay && <p className="text-emerald-600">↑ Best: <strong>{bestDay.day}</strong> ({fmt(bestDay.avg, 0)})</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Submission Cadence ──────────────────────────────────────────────────
function CadenceTab({ cadence, expectedPerDay, actualPerDay }: {
  cadence: SubmissionCadence[]
  expectedPerDay: number
  actualPerDay: number
}) {
  const maxCount = Math.max(...cadence.map(c => c.count), 1)
  const zeroDays = 30 - cadence.filter(c => c.count > 0).length
  const gapPct = expectedPerDay > 0 ? ((actualPerDay / expectedPerDay) * 100) : null

  const heatColor = (count: number) => {
    if (count === 0) return '#f5f5f4'
    const intensity = count / maxCount
    if (intensity < 0.2) return '#fef3c7'
    if (intensity < 0.5) return '#C8922A50'
    if (intensity < 0.8) return '#C8922A90'
    return '#2B1D0E'
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }

  // Build full 30-day range
  const fullRange: { date: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    const found = cadence.find(c => c.date === dateStr)
    fullRange.push({ date: dateStr, count: found?.count ?? 0 })
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wide">Expected/day</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{expectedPerDay}</p>
          <p className="text-xs text-stone-400 mt-0.5">All modules × properties</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wide">Actual/day</p>
          <p className="text-2xl font-bold text-stone-800 mt-1">{actualPerDay.toFixed(1)}</p>
          <p className="text-xs text-stone-400 mt-0.5">30-day rolling average</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wide">Submission Rate</p>
          <p className={`text-2xl font-bold mt-1 ${gapPct === null ? 'text-stone-400' : gapPct >= 80 ? 'text-emerald-700' : gapPct >= 50 ? 'text-amber-700' : 'text-red-700'}`}>
            {gapPct !== null ? gapPct.toFixed(0) + '%' : '—'}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">Actual vs expected</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <p className="text-xs text-stone-400 uppercase tracking-wide">Zero-submission days</p>
          <p className={`text-2xl font-bold mt-1 ${zeroDays > 5 ? 'text-red-700' : zeroDays > 2 ? 'text-amber-700' : 'text-emerald-700'}`}>
            {zeroDays}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">Days with no activity</p>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-1">Daily Submission Heatmap</h3>
        <p className="text-xs text-stone-400 mb-5">Each cell = one day over the last 30 days. Darker = more submissions.</p>
        <div className="grid grid-cols-5 lg:grid-cols-10 gap-2">
          {fullRange.map(day => (
            <div
              key={day.date}
              className="rounded-lg aspect-square flex flex-col items-center justify-center cursor-default"
              style={{ backgroundColor: heatColor(day.count) }}
              title={`${formatDate(day.date)}: ${day.count} submissions`}
            >
              <span className="text-xs font-bold" style={{ color: day.count > maxCount * 0.6 ? '#fff' : '#44403c' }}>
                {day.count > 0 ? day.count : ''}
              </span>
              <span className="text-[9px] leading-none mt-0.5" style={{ color: day.count > maxCount * 0.6 ? '#ffffff90' : '#a8a29e' }}>
                {new Date(day.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-stone-500">
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded inline-block border border-stone-200" style={{ backgroundColor: '#f5f5f4' }} /> 0
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded inline-block" style={{ backgroundColor: '#fef3c7' }} /> Low
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded inline-block" style={{ backgroundColor: '#C8922A90' }} /> Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 rounded inline-block" style={{ backgroundColor: '#2B1D0E' }} /> High
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Tab: AI Insights ─────────────────────────────────────────────────────────
function AITab({ latestInsight }: { latestInsight: AnalyticsData['latestInsight'] }) {
  if (!latestInsight) {
    return (
      <div className="bg-white rounded-2xl border border-stone-200 p-10 flex flex-col items-center justify-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rtg-gold-soft flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-rtg-gold" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-stone-800">No AI Insights Yet</h3>
          <p className="text-sm text-stone-400 mt-1 max-w-xs">
            Generate your first AI-powered analysis. This will synthesise compliance data, trends, and free-text feedback into executive insights.
          </p>
        </div>
        <AnalyticsRefreshButton />
      </div>
    )
  }

  const c = latestInsight.content
  const trendIcon = c.trend === 'improving' ? <TrendingUp className="w-4 h-4" /> : c.trend === 'declining' ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />
  const sentimentColor = c.sentiment.overall === 'positive' ? 'text-emerald-700' : c.sentiment.overall === 'negative' ? 'text-red-700' : 'text-amber-600'
  const severityColor = (s: string) => s === 'HIGH' ? 'bg-red-50 text-red-700' : s === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : 'bg-stone-100 text-stone-600'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-rtg-gold" />
          <span className="text-sm font-semibold text-stone-700">AI Analysis</span>
          <span className="text-xs text-stone-400">
            Generated {new Date(latestInsight.generatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <AnalyticsRefreshButton />
      </div>

      {/* Executive summary */}
      <div className="bg-rtg-brown rounded-2xl p-6 text-white">
        <div className="flex items-start gap-3">
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            {trendIcon}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-xs font-medium text-white/60 uppercase tracking-wider">Executive Summary</span>
              <span className={`text-xs px-2 py-0.5 rounded-full bg-white/10 ${sentimentColor}`}>
                {c.sentiment.overall}
              </span>
            </div>
            <p className="text-sm leading-relaxed text-white/90">{c.executiveSummary}</p>
            <div className="flex gap-4 mt-3 text-xs text-white/60">
              <span>{c.dataPoints.submissionsAnalysed} submissions analysed</span>
              <span>{c.dataPoints.commentsAnalysed} comments reviewed</span>
              <span>{c.dataPoints.periodDays}-day period</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Themes */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">Key Themes</h3>
          <div className="space-y-3">
            {c.themes.map((theme, i) => (
              <div key={i} className="flex gap-3">
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 h-fit mt-0.5 ${severityColor(theme.severity)}`}>
                  {theme.severity}
                </span>
                <div>
                  <p className="text-sm font-medium text-stone-800">{theme.name}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{theme.description}</p>
                  {theme.affectedProperties.length > 0 && (
                    <p className="text-xs text-stone-400 mt-1">Affects: {theme.affectedProperties.join(', ')}</p>
                  )}
                </div>
              </div>
            ))}
            {c.themes.length === 0 && <p className="text-sm text-stone-400">No themes identified.</p>}
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">Recommendations</h3>
          <div className="space-y-4">
            {c.recommendations.map((rec, i) => (
              <div key={i} className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-rtg-gold-soft text-rtg-brown text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {rec.priority}
                </span>
                <div>
                  <p className="text-sm font-medium text-stone-800">{rec.action}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{rec.rationale}</p>
                  <p className="text-xs text-stone-400 mt-1">{rec.target} · {rec.module}</p>
                </div>
              </div>
            ))}
            {c.recommendations.length === 0 && <p className="text-sm text-stone-400">No recommendations generated.</p>}
          </div>
        </div>
      </div>

      {/* Property highlights */}
      {c.propertyHighlights.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">Property Highlights</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {c.propertyHighlights.map((ph, i) => (
              <div key={i} className="border border-stone-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-stone-800">{ph.property}</span>
                  <span className={`text-xs font-bold ${ph.compliance >= 80 ? 'text-emerald-700' : ph.compliance >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                    {ph.compliance}%
                  </span>
                </div>
                <span className={`text-xs inline-flex items-center gap-1 ${ph.trend === 'improving' ? 'text-emerald-600' : ph.trend === 'declining' ? 'text-red-600' : 'text-stone-400'}`}>
                  {ph.trend === 'improving' ? <TrendingUp className="w-3 h-3" /> : ph.trend === 'declining' ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                  {ph.trend}
                </span>
                <p className="text-xs text-stone-400 mt-1">{ph.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sentiment */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6">
        <h3 className="text-sm font-semibold text-stone-700 mb-4">Sentiment Overview</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Positive themes
            </p>
            <ul className="space-y-1">
              {c.sentiment.positiveThemes.map((t, i) => (
                <li key={i} className="text-sm text-stone-600">• {t}</li>
              ))}
              {c.sentiment.positiveThemes.length === 0 && <li className="text-sm text-stone-400">None noted</li>}
            </ul>
          </div>
          <div>
            <p className="text-xs text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Concern areas
            </p>
            <ul className="space-y-1">
              {c.sentiment.concernAreas.map((t, i) => (
                <li key={i} className="text-sm text-stone-600">• {t}</li>
              ))}
              {c.sentiment.concernAreas.length === 0 && <li className="text-sm text-stone-400">None noted</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const [activeTab, setActiveTab] = useState('overview')

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-stone-900">Analytics &amp; Reports</h1>
          <p className="text-sm text-stone-500 mt-0.5">Last 30 days · {data.totalSubmissions} total submissions across {data.properties.length} properties</p>
        </div>
      </div>

      {/* Tab bar */}
      <AnalyticsTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab panels */}
      {activeTab === 'overview' && <OverviewTab data={data} />}
      {activeTab === 'trends' && <TrendsTab trends={data.propertyTrends} />}
      {activeTab === 'sections' && <SectionsTab sectionBreakdowns={data.sectionBreakdowns} />}
      {activeTab === 'failures' && (
        <FailuresTab
          worstItems={data.worstItems}
          shiftBreakdowns={data.shiftBreakdowns}
          dayOfWeekPatterns={data.dayOfWeekPatterns}
        />
      )}
      {activeTab === 'cadence' && (
        <CadenceTab
          cadence={data.submissionCadence}
          expectedPerDay={data.expectedSubmissionsPerDay}
          actualPerDay={data.avgActualSubmissionsPerDay}
        />
      )}
      {activeTab === 'ai' && <AITab latestInsight={data.latestInsight} />}
    </div>
  )
}
