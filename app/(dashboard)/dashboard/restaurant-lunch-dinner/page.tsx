import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  UtensilsCrossed,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Sun,
  Moon,
} from 'lucide-react'
import { CopyLinkButton } from '@/components/copy-link-button'
import { RESTAURANT_LUNCH_DINNER_ITEMS, type RestaurantLunchDinnerResponses } from '@/lib/restaurant-lunch-dinner-items'

const ALLOWED_ROLES = [
  'super_admin', 'org_admin', 'group_ops_manager',
  'general_manager', 'department_head', 'supervisor',
]

function complianceColor(pct: number) {
  if (pct >= 90) return 'text-emerald-600 bg-emerald-50'
  if (pct >= 75) return 'text-lime-600 bg-lime-50'
  if (pct >= 60) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

function complianceLabel(pct: number) {
  if (pct >= 90) return 'Excellent'
  if (pct >= 75) return 'Good'
  if (pct >= 60) return 'Satisfactory'
  return 'Needs Improvement'
}

function tileColors(pct: number) {
  if (pct >= 90) return { bg: 'bg-emerald-50 border-emerald-200', val: 'text-emerald-700', bar: 'bg-emerald-500' }
  if (pct >= 75) return { bg: 'bg-lime-50 border-lime-200', val: 'text-lime-700', bar: 'bg-lime-500' }
  if (pct >= 60) return { bg: 'bg-amber-50 border-amber-200', val: 'text-amber-700', bar: 'bg-amber-500' }
  return { bg: 'bg-red-50 border-red-200', val: 'text-red-700', bar: 'bg-red-500' }
}

export default async function RestaurantLunchDinnerAdminPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser.authenticated) redirect('/login')

  const { roles } = currentUser
  const userRoleNames = roles.map(r => r.role_name)
  const hasAccess = userRoleNames.some(r => ALLOWED_ROLES.includes(r))
  if (!hasAccess) redirect('/dashboard')

  const admin = createAdminClient()

  const isGroupLevel = userRoleNames.some(r =>
    ['super_admin', 'org_admin', 'group_ops_manager'].includes(r)
  )

  let query = admin
    .from('restaurant_lunch_dinner_submissions')
    .select('id, property_id, submission_date, shift, submitter_name, position, responses, yes_count, total_items, compliance_score, status, created_at')
    .order('submission_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(150)

  if (!isGroupLevel) {
    const propertyIds = [...new Set(roles.map(r => r.property_id))]
    query = query.in('property_id', propertyIds)
  }

  const { data: submissions } = await query

  let allPropertiesQuery = admin.from('properties').select('id, name')
  if (!isGroupLevel) {
    const scopedIds = [...new Set(roles.map(r => r.property_id))]
    allPropertiesQuery = allPropertiesQuery.in('id', scopedIds)
  }
  const { data: allProperties } = await allPropertiesQuery

  const propMap: Record<string, string> = {}
  for (const p of allProperties ?? []) propMap[p.id] = p.name

  // ── Metrics ────────────────────────────────────────────────────────────────
  const subs = submissions ?? []
  const totalSubmissions = subs.length

  const groupAvg = totalSubmissions > 0
    ? subs.reduce((sum, s) => sum + Number(s.compliance_score ?? 0), 0) / totalSubmissions
    : null

  const byProperty: Record<string, number[]> = {}
  for (const s of subs) {
    if (!byProperty[s.property_id]) byProperty[s.property_id] = []
    byProperty[s.property_id].push(Number(s.compliance_score ?? 0))
  }
  const propertyAvgs = Object.entries(byProperty).map(([id, pcts]) => ({
    id, name: propMap[id] ?? '—',
    avg: pcts.reduce((a, b) => a + b, 0) / pcts.length,
    count: pcts.length,
  }))

  const bestProperty = propertyAvgs.length > 0 ? propertyAvgs.reduce((a, b) => a.avg >= b.avg ? a : b) : null
  const lowestProperty = propertyAvgs.length > 0 ? propertyAvgs.reduce((a, b) => a.avg <= b.avg ? a : b) : null

  const now = new Date()
  const thisMonthCount = subs.filter(s => {
    const d = new Date(s.submission_date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  const belowThresholdCount = subs.filter(s => Number(s.compliance_score ?? 0) < 75).length

  const amCount = subs.filter(s => s.shift === 'AM').length
  const pmCount = subs.filter(s => s.shift === 'PM').length

  // ── Item-level NO analysis ─────────────────────────────────────────────────
  const noCountByItem: Record<string, number> = {}
  for (const item of RESTAURANT_LUNCH_DINNER_ITEMS) noCountByItem[item.id] = 0

  for (const s of subs) {
    let parsed: RestaurantLunchDinnerResponses = {}
    try { parsed = JSON.parse(s.responses) } catch { /* skip */ }
    for (const item of RESTAURANT_LUNCH_DINNER_ITEMS) {
      if (parsed[item.id] === false) noCountByItem[item.id]++
    }
  }

  const topFailItems = [...RESTAURANT_LUNCH_DINNER_ITEMS]
    .sort((a, b) => (noCountByItem[b.id] ?? 0) - (noCountByItem[a.id] ?? 0))
    .slice(0, 5)
    .filter(item => (noCountByItem[item.id] ?? 0) > 0)

  const publicFormUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/forms/restaurant-lunch-dinner`

  return (
    <div className="max-w-6xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center shrink-0">
            <UtensilsCrossed className="w-5 h-5 text-orange-700" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-stone-900">Restaurant Checklist — Lunch &amp; Dinner</h1>
            <p className="text-sm text-stone-500">{totalSubmissions} submission{totalSubmissions !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-lg px-4 py-2.5">
          <span className="text-xs text-stone-500 font-mono truncate max-w-xs">{publicFormUrl}</span>
          <Link href={publicFormUrl} target="_blank" className="text-stone-400 hover:text-stone-700 transition-colors shrink-0">
            <ExternalLink className="w-4 h-4" />
          </Link>
          <CopyLinkButton text={publicFormUrl} />
        </div>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Group Average */}
        <div className={`rounded-xl border p-5 ${groupAvg != null ? tileColors(groupAvg).bg : 'bg-stone-50 border-stone-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Avg Compliance</span>
            <TrendingUp className="w-4 h-4 text-stone-400" />
          </div>
          {groupAvg != null ? (
            <>
              <p className={`text-3xl font-bold ${tileColors(groupAvg).val}`}>
                {groupAvg.toFixed(1)}<span className="text-lg font-normal">%</span>
              </p>
              <p className={`text-xs font-medium mt-1 ${tileColors(groupAvg).val}`}>{complianceLabel(groupAvg)}</p>
            </>
          ) : <p className="text-2xl font-bold text-stone-300">—</p>}
        </div>

        {/* Top property */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Top Property</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          {bestProperty ? (
            <>
              <p className="text-sm font-bold text-emerald-800 leading-tight">{bestProperty.name}</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">
                {bestProperty.avg.toFixed(1)}<span className="text-base font-normal">%</span>
              </p>
              <p className="text-xs text-emerald-600 mt-0.5">{bestProperty.count} submission{bestProperty.count !== 1 ? 's' : ''}</p>
            </>
          ) : <p className="text-2xl font-bold text-stone-300">—</p>}
        </div>

        {/* Needs attention */}
        <div className={`rounded-xl border p-5 ${lowestProperty && lowestProperty.id !== bestProperty?.id ? 'border-red-200 bg-red-50' : 'border-stone-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Needs Attention</span>
            <TrendingDown className="w-4 h-4 text-stone-400" />
          </div>
          {lowestProperty && lowestProperty.id !== bestProperty?.id ? (
            <>
              <p className="text-sm font-bold text-red-800 leading-tight">{lowestProperty.name}</p>
              <p className="text-2xl font-bold text-red-700 mt-1">
                {lowestProperty.avg.toFixed(1)}<span className="text-base font-normal">%</span>
              </p>
            </>
          ) : <p className="text-2xl font-bold text-stone-300">—</p>}
        </div>

        {/* Below threshold */}
        <div className={`rounded-xl border p-5 ${belowThresholdCount > 0 ? 'border-red-200 bg-red-50' : 'border-stone-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Below 75%</span>
            <AlertTriangle className={`w-4 h-4 ${belowThresholdCount > 0 ? 'text-red-400' : 'text-stone-300'}`} />
          </div>
          <p className={`text-3xl font-bold ${belowThresholdCount > 0 ? 'text-red-700' : 'text-stone-800'}`}>
            {belowThresholdCount}
          </p>
          <p className={`text-xs mt-1 ${belowThresholdCount > 0 ? 'text-red-600' : 'text-stone-400'}`}>
            {belowThresholdCount > 0
              ? `submission${belowThresholdCount !== 1 ? 's' : ''} requiring follow-up`
              : 'All above threshold'}
          </p>
        </div>

      </div>

      {/* Secondary tiles — this month + AM/PM breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">This Month</span>
            <CalendarCheck className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-3xl font-bold text-stone-800">{thisMonthCount}</p>
          <p className="text-xs text-stone-400 mt-1">
            submission{thisMonthCount !== 1 ? 's' : ''} in {now.toLocaleString('en-GB', { month: 'long' })}
          </p>
        </div>

        <div className="rounded-xl border border-sky-200 bg-sky-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">AM Shift</span>
            <Sun className="w-4 h-4 text-sky-400" />
          </div>
          <p className="text-3xl font-bold text-sky-700">{amCount}</p>
          <p className="text-xs text-sky-600 mt-1">lunch shift submission{amCount !== 1 ? 's' : ''}</p>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">PM Shift</span>
            <Moon className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-3xl font-bold text-indigo-700">{pmCount}</p>
          <p className="text-xs text-indigo-600 mt-1">dinner shift submission{pmCount !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Property bar chart */}
      {propertyAvgs.length > 1 && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">Compliance by Property</p>
          <div className="space-y-3">
            {[...propertyAvgs].sort((a, b) => b.avg - a.avg).map(prop => (
              <div key={prop.id} className="flex items-center gap-3">
                <span className="w-44 text-xs font-medium text-stone-700 truncate shrink-0">{prop.name}</span>
                <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${tileColors(prop.avg).bar}`}
                    style={{ width: `${prop.avg}%` }}
                  />
                </div>
                <span className={`text-xs font-semibold w-12 text-right ${tileColors(prop.avg).val}`}>
                  {prop.avg.toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top failing items */}
      {topFailItems.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">
            Most Common <span className="text-red-500">NO</span> Answers
          </p>
          <div className="space-y-3">
            {topFailItems.map(item => {
              const noCount = noCountByItem[item.id] ?? 0
              const failRate = totalSubmissions > 0 ? (noCount / totalSubmissions) * 100 : 0
              return (
                <div key={item.id} className="flex items-start gap-3">
                  <span className="w-5 text-xs text-stone-400 font-mono shrink-0 mt-0.5">{item.number}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-stone-700 leading-snug">{item.label}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-400 rounded-full" style={{ width: `${failRate}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-red-600 w-20 text-right">
                        {noCount} NO ({failRate.toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Submissions table */}
      {subs.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 py-16 text-center">
          <UtensilsCrossed className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm font-medium">No submissions yet</p>
          <p className="text-stone-400 text-xs mt-1">Share the form link above to start collecting reports.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Shift</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Submitted By</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Position</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Score</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Compliance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {subs.map(sub => {
                  const pct = Number(sub.compliance_score ?? 0)
                  const colors = complianceColor(pct)
                  return (
                    <tr key={sub.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 text-stone-700 font-medium">{propMap[sub.property_id] ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sub.shift === 'AM' ? 'bg-sky-50 text-sky-700' : 'bg-indigo-50 text-indigo-700'}`}>
                          {sub.shift === 'AM' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                          {sub.shift}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-stone-700">{sub.submitter_name}</td>
                      <td className="px-4 py-3 text-stone-500 text-xs">{sub.position}</td>
                      <td className="px-4 py-3 text-stone-500 text-xs whitespace-nowrap">
                        {new Date(sub.submission_date).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-stone-700 font-medium text-xs">
                          {sub.yes_count}/{sub.total_items}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${colors}`}>
                          {pct >= 75
                            ? <CheckCircle2 className="w-3 h-3" />
                            : <XCircle className="w-3 h-3" />}
                          {pct.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  )
}
