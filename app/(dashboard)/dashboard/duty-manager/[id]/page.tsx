import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ClipboardList, Calendar, User, Building2, Sun, Moon } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { DUTY_MANAGER_SECTIONS, type DutyManagerResponses, type RoomCheck } from '@/lib/duty-manager-sections'
import { HodCommentsEditor } from '@/components/hod-comments-editor'

const ALLOWED_ROLES = [
  'super_admin', 'org_admin', 'group_ops_manager',
  'general_manager', 'property_manager', 'supervisor',
]

function gradeColor(pct: number) {
  if (pct >= 90) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (pct >= 75) return 'text-lime-700 bg-lime-50 border-lime-200'
  if (pct >= 60) return 'text-amber-700 bg-amber-50 border-amber-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

function gradeLabel(pct: number) {
  if (pct >= 90) return 'Outstanding'
  if (pct >= 75) return 'Good'
  if (pct >= 60) return 'Satisfactory'
  return 'Needs Improvement'
}

function ratingBadge(rating: 1 | 2 | 3 | null) {
  if (rating === 3) return { bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: 'Good' }
  if (rating === 2) return { bg: 'bg-amber-50 border-amber-200 text-amber-700', label: 'Average' }
  if (rating === 1) return { bg: 'bg-red-50 border-red-200 text-red-700', label: 'Poor' }
  return { bg: 'bg-stone-100 border-stone-200 text-stone-400', label: '—' }
}

function barColor(pct: number) {
  if (pct >= 90) return 'bg-emerald-500'
  if (pct >= 75) return 'bg-lime-500'
  if (pct >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}

export default async function DutyManagerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const currentUser = await getCurrentUser()
  if (!currentUser.authenticated) redirect('/login')

  const { roles } = currentUser
  const userRoleNames = roles.map(r => r.role_name)
  const hasAccess = userRoleNames.some(r => ALLOWED_ROLES.includes(r))
  if (!hasAccess) redirect('/dashboard')

  const admin = createAdminClient()

  const { data: sub, error } = await admin
    .from('duty_manager_submissions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !sub) notFound()

  const isGroupLevel = userRoleNames.some(r =>
    ['super_admin', 'org_admin', 'group_ops_manager'].includes(r)
  )
  if (!isGroupLevel) {
    const propertyIds = [...new Set(roles.map(r => r.property_id))]
    if (!propertyIds.includes(sub.property_id)) redirect('/dashboard/duty-manager')
  }

  const { data: property } = await admin
    .from('properties')
    .select('name')
    .eq('id', sub.property_id)
    .single()

  const responses: DutyManagerResponses = (() => {
    try { return JSON.parse(sub.responses) } catch { return {} }
  })()

  const roomChecks: RoomCheck[] = (() => {
    try { return JSON.parse(sub.room_checks) } catch { return [] }
  })()

  const pct = Number(sub.percentage ?? 0)

  const sectionScores = DUTY_MANAGER_SECTIONS.map(section => {
    let actual = 0
    const possible = section.items.length * 3
    for (const item of section.items) {
      const resp = responses[section.id]?.[item.id]
      if (resp?.rating != null) actual += resp.rating
    }
    return { ...section, actual, possible, pct: possible > 0 ? (actual / possible) * 100 : 0 }
  })

  // Count poor items across all sections
  const poorItems = DUTY_MANAGER_SECTIONS.flatMap(section =>
    section.items
      .filter(item => responses[section.id]?.[item.id]?.rating === 1)
      .map(item => ({ section: section.title, label: item.label, comment: responses[section.id]?.[item.id]?.comment ?? '' }))
  )

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back */}
      <Link href="/dashboard/duty-manager" className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        Back to submissions
      </Link>

      {/* Summary card */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <ClipboardList className="w-5 h-5 text-blue-700" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-stone-900">Duty Manager Report</h1>
              <p className="text-sm text-stone-500">Shift inspection detail</p>
            </div>
          </div>
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${gradeColor(pct)}`}>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">Total Score</p>
              <p className="text-2xl font-bold leading-none">
                {sub.total_score}<span className="text-base font-normal opacity-60">/{sub.max_score}</span>
              </p>
            </div>
            <div className="border-l border-current/20 pl-3">
              <p className="text-xl font-bold">{pct.toFixed(1)}%</p>
              <p className="text-xs font-medium">{gradeLabel(pct)}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-stone-100">
          <div className="flex items-center gap-2.5 text-sm">
            <Building2 className="w-4 h-4 text-stone-400 shrink-0" />
            <div>
              <p className="text-xs text-stone-400">Property</p>
              <p className="font-medium text-stone-800">{property?.name ?? '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <User className="w-4 h-4 text-stone-400 shrink-0" />
            <div>
              <p className="text-xs text-stone-400">Manager</p>
              <p className="font-medium text-stone-800">{sub.manager_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
            <div>
              <p className="text-xs text-stone-400">Date</p>
              <p className="font-medium text-stone-800">
                {new Date(sub.shift_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            {sub.shift === 'AM' ? <Sun className="w-4 h-4 text-sky-400 shrink-0" /> : <Moon className="w-4 h-4 text-indigo-400 shrink-0" />}
            <div>
              <p className="text-xs text-stone-400">Shift</p>
              <p className="font-medium text-stone-800">{sub.shift === 'AM' ? 'AM — Morning' : 'PM — Evening'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Poor items alert panel */}
      {poorItems.length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-5">
          <p className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-3">
            ⚠ {poorItems.length} item{poorItems.length !== 1 ? 's' : ''} rated Poor — requires attention
          </p>
          <div className="space-y-2">
            {poorItems.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-sm">
                <span className="shrink-0 text-xs font-semibold text-red-400 bg-red-100 rounded px-1.5 py-0.5">{item.section}</span>
                <span className="text-red-800">{item.label}</span>
                {item.comment && <span className="text-red-500 italic text-xs">— "{item.comment}"</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Section breakdown */}
      <div className="space-y-4">
        {sectionScores.map((section, idx) => (
          <div key={section.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-stone-50">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-stone-400 w-5">{idx + 1}.</span>
                <h2 className="text-sm font-semibold text-stone-800">{section.title}</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:block w-24 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor(section.pct)}`} style={{ width: `${section.pct}%` }} />
                </div>
                <span className="text-sm font-semibold text-stone-700">
                  {section.actual}<span className="text-stone-400 font-normal">/{section.possible}</span>
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${gradeColor(section.pct)}`}>
                  {section.pct.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="divide-y divide-stone-50">
              {section.items.map(item => {
                const resp = responses[section.id]?.[item.id]
                const rating = (resp?.rating ?? null) as 1 | 2 | 3 | null
                const badge = ratingBadge(rating)
                return (
                  <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                    <span className={`shrink-0 px-2.5 py-1 rounded-lg text-xs font-semibold border ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <span className="flex-1 text-sm text-stone-700">{item.label}</span>
                    {resp?.comment && (
                      <span className="text-xs text-stone-400 italic shrink-0 max-w-xs text-right">"{resp.comment}"</span>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex items-center justify-between px-5 py-2.5 bg-stone-50 border-t border-stone-100">
              <span className="text-xs text-stone-500">Section total</span>
              <span className="text-sm font-semibold text-stone-800">
                {section.actual}<span className="text-stone-400 font-normal">/{section.possible}</span>
                <span className="ml-1.5 text-xs text-stone-500">({section.pct.toFixed(1)}%)</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Room Checks */}
      {roomChecks.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-stone-100 bg-stone-50">
            <h2 className="text-sm font-semibold text-stone-800">Room Checks ({roomChecks.length})</h2>
          </div>
          <div className="divide-y divide-stone-100">
            {roomChecks.map((rc, idx) => (
              <div key={idx} className="flex items-start gap-4 px-5 py-4">
                <span className="shrink-0 text-xs font-bold text-stone-500 bg-stone-100 rounded-lg px-3 py-2">
                  Room {rc.roomNo || '—'}
                </span>
                <p className="text-sm text-stone-700 leading-relaxed">{rc.notes || <span className="text-stone-400 italic">No notes recorded</span>}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Grand total bar */}
      <div className={`rounded-xl border px-6 py-4 flex items-center justify-between ${gradeColor(pct)}`}>
        <span className="text-sm font-semibold">Grand Total</span>
        <div className="flex items-center gap-4">
          <span className="text-base font-bold">{sub.total_score}<span className="font-normal opacity-70">/{sub.max_score}</span></span>
          <span className="text-lg font-bold">{pct.toFixed(1)}%</span>
          <span className="text-sm font-semibold">{gradeLabel(pct)}</span>
        </div>
      </div>

      {/* HOD Comments */}
      <HodCommentsEditor submissionId={id} initialComments={sub.hod_comments ?? null} />
    </div>
  )
}
