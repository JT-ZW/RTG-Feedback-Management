import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ShieldCheck, Calendar, User, Building2 } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { MYSTERY_SHOPPER_SECTIONS, type FormResponses } from '@/lib/mystery-shopper-sections'

const ALLOWED_ROLES = [
  'super_admin', 'org_admin', 'group_ops_manager',
  'general_manager', 'property_manager', 'supervisor',
]

function gradeColor(pct: number) {
  if (pct >= 90) return 'text-emerald-700 bg-emerald-50 border-emerald-200'
  if (pct >= 75) return 'text-lime-700 bg-lime-50 border-lime-200'
  if (pct >= 60) return 'text-amber-700 bg-amber-50 border-amber-200'
  if (pct >= 40) return 'text-orange-700 bg-orange-50 border-orange-200'
  return 'text-red-700 bg-red-50 border-red-200'
}

function gradeLabel(pct: number) {
  if (pct >= 90) return 'Outstanding'
  if (pct >= 75) return 'Good'
  if (pct >= 60) return 'Satisfactory'
  if (pct >= 40) return 'Needs Improvement'
  return 'Poor'
}

function ratingColor(rating: number | null) {
  if (rating == null) return 'text-stone-400'
  if (rating >= 5) return 'text-emerald-600'
  if (rating >= 4) return 'text-lime-600'
  if (rating >= 3) return 'text-amber-600'
  if (rating >= 2) return 'text-orange-600'
  return 'text-red-600'
}

function sectionFill(pct: number) {
  if (pct >= 90) return 'bg-emerald-500'
  if (pct >= 75) return 'bg-lime-500'
  if (pct >= 60) return 'bg-amber-500'
  if (pct >= 40) return 'bg-orange-500'
  return 'bg-red-500'
}

export default async function SubmissionDetailPage({
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
    .from('mystery_shopper_submissions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !sub) notFound()

  // Non-group-level users can only see their own properties
  const isGroupLevel = userRoleNames.some(r =>
    ['super_admin', 'org_admin', 'group_ops_manager'].includes(r)
  )
  if (!isGroupLevel) {
    const propertyIds = [...new Set(roles.map(r => r.property_id))]
    if (!propertyIds.includes(sub.property_id)) redirect('/dashboard/mystery-shopper')
  }

  const { data: property } = await admin
    .from('properties')
    .select('name')
    .eq('id', sub.property_id)
    .single()

  const responses: FormResponses = (() => {
    try { return JSON.parse(sub.responses) } catch { return {} }
  })()

  const pct = Number(sub.percentage ?? 0)

  // Compute per-section scores
  const sectionScores = MYSTERY_SHOPPER_SECTIONS.map(section => {
    let actual = 0
    let possible = 0
    for (const item of section.items) {
      const resp = responses[section.id]?.[item.id]
      possible += item.possibleMark
      if (resp?.rating != null) actual += resp.rating
    }
    return { ...section, actual, possible, pct: possible > 0 ? (actual / possible) * 100 : 0 }
  })

  return (
    <div className="max-w-4xl space-y-6">
      {/* Back nav */}
      <Link
        href="/dashboard/mystery-shopper"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-800 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to submissions
      </Link>

      {/* Summary card */}
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-violet-700" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-stone-900">Mystery Shopper Report</h1>
              <p className="text-sm text-stone-500">Submission detail</p>
            </div>
          </div>

          {/* Grand total badge */}
          <div className={`flex items-center gap-3 px-5 py-3 rounded-xl border ${gradeColor(pct)}`}>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">Grand Total</p>
              <p className="text-2xl font-bold leading-none">
                {sub.total_score}
                <span className="text-base font-normal opacity-60">/{sub.max_score}</span>
              </p>
            </div>
            <div className="border-l border-current/20 pl-3">
              <p className="text-xl font-bold">{pct.toFixed(1)}%</p>
              <p className="text-xs font-medium">{gradeLabel(pct)}</p>
            </div>
          </div>
        </div>

        {/* Meta info */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-stone-100">
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
              <p className="text-xs text-stone-400">Shopper</p>
              <p className="font-medium text-stone-800">{sub.shopper_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 text-sm">
            <Calendar className="w-4 h-4 text-stone-400 shrink-0" />
            <div>
              <p className="text-xs text-stone-400">Visit Date</p>
              <p className="font-medium text-stone-800">
                {new Date(sub.visit_date).toLocaleDateString('en-GB', {
                  day: 'numeric', month: 'long', year: 'numeric',
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Section-by-section breakdown */}
      <div className="space-y-4">
        {sectionScores.map((section, idx) => (
          <div key={section.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-100 bg-stone-50">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-semibold text-stone-400 w-5">{idx + 1}.</span>
                <h2 className="text-sm font-semibold text-stone-800">{section.title}</h2>
              </div>
              <div className="flex items-center gap-3">
                {/* Mini progress bar */}
                <div className="hidden sm:block w-24 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${sectionFill(section.pct)}`}
                    style={{ width: `${section.pct}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-stone-700">
                  {section.actual}
                  <span className="text-stone-400 font-normal">/{section.possible}</span>
                </span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${gradeColor(section.pct)}`}>
                  {section.pct.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Items table */}
            <div className="divide-y divide-stone-50">
              {section.items.map(item => {
                const resp = responses[section.id]?.[item.id]
                const rating = resp?.rating ?? null
                const comment = resp?.comment ?? ''
                return (
                  <div key={item.id} className="px-5 py-3">
                    <div className="flex items-start gap-3">
                      {/* Rating pill */}
                      <div className={`shrink-0 mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border ${
                        rating == null
                          ? 'bg-stone-50 border-stone-200 text-stone-400'
                          : rating >= 4
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : rating === 3
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : 'bg-red-50 border-red-200 text-red-700'
                      }`}>
                        {rating ?? '–'}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-stone-700 leading-snug">{item.label}</p>
                        {comment && (
                          <p className="mt-1 text-xs text-stone-500 italic">"{comment}"</p>
                        )}
                      </div>

                      {/* Score fraction */}
                      <div className="shrink-0 text-right">
                        <span className={`text-sm font-semibold ${ratingColor(rating)}`}>
                          {rating ?? 0}
                        </span>
                        <span className="text-xs text-stone-400">/{item.possibleMark}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Section footer */}
            <div className="flex items-center justify-between px-5 py-2.5 bg-stone-50 border-t border-stone-100">
              <span className="text-xs text-stone-500">Section total</span>
              <span className="text-sm font-semibold text-stone-800">
                {section.actual}
                <span className="text-stone-400 font-normal">/{section.possible}</span>
                <span className="ml-1.5 text-xs text-stone-500">({section.pct.toFixed(1)}%)</span>
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Grand total summary bar */}
      <div className={`rounded-xl border px-6 py-4 flex items-center justify-between ${gradeColor(pct)}`}>
        <span className="text-sm font-semibold">Grand Total</span>
        <div className="flex items-center gap-4">
          <span className="text-base font-bold">
            {sub.total_score}
            <span className="font-normal opacity-70">/{sub.max_score}</span>
          </span>
          <span className="text-lg font-bold">{pct.toFixed(1)}%</span>
          <span className="text-sm font-semibold">{gradeLabel(pct)}</span>
        </div>
      </div>
    </div>
  )
}
