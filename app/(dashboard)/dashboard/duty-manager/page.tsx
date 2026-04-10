import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { ClipboardList, ExternalLink, TrendingUp, TrendingDown, AlertTriangle, CalendarCheck, Building2, Sun, Moon } from 'lucide-react'
import { CopyLinkButton } from '@/components/copy-link-button'

const ALLOWED_ROLES = [
  'super_admin', 'org_admin', 'group_ops_manager',
  'general_manager', 'property_manager', 'supervisor',
]

function gradeColor(pct: number) {
  if (pct >= 90) return 'text-emerald-600 bg-emerald-50'
  if (pct >= 75) return 'text-lime-600 bg-lime-50'
  if (pct >= 60) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

function gradeLabel(pct: number) {
  if (pct >= 90) return 'Outstanding'
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

export default async function DutyManagerAdminPage() {
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
    .from('duty_manager_submissions')
    .select('id, property_id, shift_date, shift, manager_name, total_score, max_score, percentage, hod_comments, status, created_at')
    .order('shift_date', { ascending: false })
    .order('shift', { ascending: true })
    .limit(100)

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
    ? subs.reduce((sum, s) => sum + Number(s.percentage), 0) / totalSubmissions
    : null

  const byProperty: Record<string, number[]> = {}
  for (const s of subs) {
    if (!byProperty[s.property_id]) byProperty[s.property_id] = []
    byProperty[s.property_id].push(Number(s.percentage))
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
    const d = new Date(s.shift_date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  const pendingHodCount = subs.filter(s => !s.hod_comments).length
  const belowThresholdCount = subs.filter(s => Number(s.percentage) < 60).length

  const publicFormUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/forms/duty-manager`

  return (
    <div className="max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <ClipboardList className="w-5 h-5 text-blue-700" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-stone-900">Duty Manager Checklist</h1>
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Group Average */}
        <div className={`rounded-xl border p-5 ${groupAvg != null ? tileColors(groupAvg).bg : 'bg-stone-50 border-stone-200'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Group Average</span>
            <TrendingUp className="w-4 h-4 text-stone-400" />
          </div>
          {groupAvg != null ? (
            <>
              <p className={`text-3xl font-bold ${tileColors(groupAvg).val}`}>{groupAvg.toFixed(1)}<span className="text-lg font-normal">%</span></p>
              <p className={`text-xs font-medium mt-1 ${tileColors(groupAvg).val}`}>{gradeLabel(groupAvg)}</p>
            </>
          ) : <p className="text-2xl font-bold text-stone-300">—</p>}
        </div>

        {/* Top performer */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Top Property</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          {bestProperty ? (
            <>
              <p className="text-sm font-bold text-emerald-800 leading-tight">{bestProperty.name}</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{bestProperty.avg.toFixed(1)}<span className="text-base font-normal">%</span></p>
              <p className="text-xs text-emerald-600 mt-0.5">{bestProperty.count} shift{bestProperty.count !== 1 ? 's' : ''}</p>
            </>
          ) : <p className="text-2xl font-bold text-stone-300">—</p>}
        </div>

        {/* Needs attention */}
        <div className={`rounded-xl border p-5 ${lowestProperty && lowestProperty.id !== bestProperty?.id ? 'border-red-200 bg-red-50' : 'border-stone-200 bg-stone-50'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Needs Attention</span>
            <TrendingDown className="w-4 h-4 text-stone-400" />
          </div>
          {lowestProperty && lowestProperty.id !== bestProperty?.id ? (
            <>
              <p className="text-sm font-bold text-red-800 leading-tight">{lowestProperty.name}</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{lowestProperty.avg.toFixed(1)}<span className="text-base font-normal">%</span></p>
            </>
          ) : <p className="text-2xl font-bold text-stone-300">—</p>}
        </div>

        {/* This month */}
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">This Month</span>
            <CalendarCheck className="w-4 h-4 text-stone-400" />
          </div>
          <p className="text-3xl font-bold text-stone-800">{thisMonthCount}</p>
          <p className="text-xs text-stone-400 mt-1">shift{thisMonthCount !== 1 ? 's' : ''} logged in {now.toLocaleString('en-GB', { month: 'long' })}</p>
        </div>

        {/* HOD comments pending */}
        <div className={`rounded-xl border p-5 ${pendingHodCount > 0 ? 'border-amber-200 bg-amber-50' : 'border-stone-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">HOD Comments Pending</span>
            <Building2 className={`w-4 h-4 ${pendingHodCount > 0 ? 'text-amber-400' : 'text-stone-300'}`} />
          </div>
          <p className={`text-3xl font-bold ${pendingHodCount > 0 ? 'text-amber-700' : 'text-stone-800'}`}>{pendingHodCount}</p>
          <p className={`text-xs mt-1 ${pendingHodCount > 0 ? 'text-amber-600' : 'text-stone-400'}`}>
            {pendingHodCount > 0 ? 'shift report' + (pendingHodCount !== 1 ? 's' : '') + ' awaiting review' : 'All reports reviewed'}
          </p>
        </div>

        {/* Below threshold */}
        <div className={`rounded-xl border p-5 ${belowThresholdCount > 0 ? 'border-red-200 bg-red-50' : 'border-stone-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Below 60%</span>
            <AlertTriangle className={`w-4 h-4 ${belowThresholdCount > 0 ? 'text-red-400' : 'text-stone-300'}`} />
          </div>
          <p className={`text-3xl font-bold ${belowThresholdCount > 0 ? 'text-red-700' : 'text-stone-800'}`}>{belowThresholdCount}</p>
          <p className={`text-xs mt-1 ${belowThresholdCount > 0 ? 'text-red-600' : 'text-stone-400'}`}>
            {belowThresholdCount > 0 ? 'shift' + (belowThresholdCount !== 1 ? 's' : '') + ' requiring follow-up' : 'No shifts below threshold'}
          </p>
        </div>
      </div>

      {/* Per-property bar chart */}
      {propertyAvgs.length > 1 && (
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-4">Average Score by Property</p>
          <div className="space-y-3">
            {[...propertyAvgs].sort((a, b) => b.avg - a.avg).map(prop => (
              <div key={prop.id} className="flex items-center gap-3">
                <span className="w-44 text-xs font-medium text-stone-700 truncate shrink-0">{prop.name}</span>
                <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${tileColors(prop.avg).bar}`} style={{ width: `${prop.avg}%` }} />
                </div>
                <span className={`text-xs font-semibold w-12 text-right ${tileColors(prop.avg).val}`}>{prop.avg.toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submissions table */}
      {subs.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200 py-16 text-center">
          <ClipboardList className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <p className="text-stone-500 text-sm font-medium">No submissions yet</p>
          <p className="text-stone-400 text-xs mt-1">Share the duty manager form link above to start collecting reports.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Property</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Manager</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Shift</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Score</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">Grade</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wide">HOD</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {subs.map(sub => {
                  const pct = Number(sub.percentage ?? 0)
                  return (
                    <tr key={sub.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-stone-800">{propMap[sub.property_id] ?? '—'}</td>
                      <td className="px-4 py-3 text-stone-600">{sub.manager_name}</td>
                      <td className="px-4 py-3 text-stone-500">
                        {new Date(sub.shift_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sub.shift === 'AM' ? 'bg-sky-50 text-sky-700' : 'bg-indigo-50 text-indigo-700'}`}>
                          {sub.shift === 'AM' ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
                          {sub.shift}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-800">{sub.total_score}/{sub.max_score}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${gradeColor(pct)}`}>
                          {pct.toFixed(1)}% — {gradeLabel(pct)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {sub.hod_comments
                          ? <span className="text-xs text-emerald-600 font-medium">✓ Reviewed</span>
                          : <span className="text-xs text-amber-600 font-medium">Pending</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/dashboard/duty-manager/${sub.id}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                          View →
                        </Link>
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
