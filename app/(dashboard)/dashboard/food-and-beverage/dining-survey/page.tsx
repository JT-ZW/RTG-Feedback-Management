import { getCurrentUser, getPrimaryRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft,
  Star,
  MessageSquare,
  Users,
  TrendingUp,
  QrCode,
} from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDiningSurveyStats } from '@/app/actions/dining-survey-public'
import { CopyLinkButton } from '@/components/copy-link-button'
import { PropertyQrCodes } from '@/components/property-qr-codes'
import { cn } from '@/lib/utils'
import type { MealPeriod } from '@/lib/dining-survey'

const ALLOWED_ROLES = [
  'super_admin', 'org_admin', 'group_ops_manager',
  'general_manager', 'department_head', 'supervisor',
]

const QUESTION_LABELS: Record<string, string> = {
  food_quality:         'Food Quality',
  food_temperature:     'Food Temperature',
  service_speed:        'Speed of Service',
  staff_friendliness:   'Staff Friendliness',
  ambience:             'Atmosphere',
  value_for_money:      'Value for Money',
  overall_satisfaction: 'Overall Satisfaction',
}

const MEAL_COLOURS: Record<MealPeriod, string> = {
  breakfast: 'bg-yellow-100 text-yellow-800',
  lunch:     'bg-orange-100 text-orange-800',
  dinner:    'bg-indigo-100 text-indigo-800',
}

function ScoreBar({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-stone-400">No data</span>
  const pct = ((score - 1) / 4) * 100
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-all',
            pct >= 80 ? 'bg-emerald-400' : pct >= 60 ? 'bg-amber-400' : 'bg-red-400',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-stone-700 w-8 text-right">
        {score.toFixed(1)}
      </span>
    </div>
  )
}

function StarDisplay({ score }: { score: number | null }) {
  if (score === null) return <span className="text-stone-400 text-sm">—</span>
  return (
    <div className="flex items-center gap-1">
      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
      <span className="text-sm font-bold text-stone-800">{score.toFixed(1)}</span>
      <span className="text-xs text-stone-400">/ 5</span>
    </div>
  )
}

export default async function DiningSurveyStatsPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser.authenticated) redirect('/login')

  const { roles } = currentUser
  const primaryRole = getPrimaryRole(roles)
  if (!ALLOWED_ROLES.includes(primaryRole)) redirect('/dashboard')

  // Fetch all properties so we can show QR links
  const admin = createAdminClient()
  const { data: properties } = await admin
    .from('properties')
    .select('id, name, code')
    .order('name', { ascending: true })

  const allProperties = properties ?? []

  const stats = await getDiningSurveyStats(undefined, 30)
  const hasError = 'error' in stats

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  return (
    <div className="min-h-full">

      {/* Breadcrumb */}
      <Link
        href="/dashboard/food-and-beverage"
        className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors mb-6"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Food &amp; Beverage
      </Link>

      {/* Header */}
      <div className="mb-10 max-w-xl">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
          Guest Dining Survey
        </p>
        <h1 className="text-4xl font-bold text-stone-900 leading-tight mb-3">
          Guest Feedback
        </h1>
        <p className="text-stone-500 text-sm leading-relaxed">
          Real-time dining survey responses from the last 30 days across all properties.
        </p>
      </div>

      {hasError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          Failed to load stats: {(stats as { error: string }).error}
        </div>
      ) : (
        <div className="space-y-8 max-w-5xl">

          {/* Summary KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Responses',
                value: stats.totalSubmissions.toString(),
                icon: Users,
                colour: 'text-blue-600',
                bg: 'bg-blue-50',
              },
              {
                label: 'Average Score',
                value: stats.avgOverall !== null ? `${stats.avgOverall.toFixed(1)} / 5` : '—',
                icon: Star,
                colour: 'text-amber-600',
                bg: 'bg-amber-50',
              },
              {
                label: 'With Comments',
                value: stats.recentResponses.filter((r) => r.comments).length.toString(),
                icon: MessageSquare,
                colour: 'text-emerald-600',
                bg: 'bg-emerald-50',
              },
              {
                label: 'Satisfaction',
                value: stats.avgByQuestion.overall_satisfaction !== null
                  ? `${stats.avgByQuestion.overall_satisfaction.toFixed(1)} / 5`
                  : '—',
                icon: TrendingUp,
                colour: 'text-violet-600',
                bg: 'bg-violet-50',
              },
            ].map((kpi) => {
              const Icon = kpi.icon
              return (
                <div key={kpi.label} className="bg-white rounded-2xl border border-stone-200 p-5">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3', kpi.bg)}>
                    <Icon className={cn('w-5 h-5', kpi.colour)} />
                  </div>
                  <p className="text-2xl font-bold text-stone-900">{kpi.value}</p>
                  <p className="text-xs text-stone-500 mt-0.5">{kpi.label}</p>
                </div>
              )
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Score breakdown by question */}
            <div className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
              <h2 className="text-sm font-semibold text-stone-800">Score by Question</h2>
              {Object.entries(QUESTION_LABELS).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <p className="text-xs text-stone-500">{label}</p>
                  <ScoreBar score={stats.avgByQuestion[key as keyof typeof stats.avgByQuestion]} />
                </div>
              ))}
            </div>

            {/* Meal period breakdown */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-stone-200 p-6">
                <h2 className="text-sm font-semibold text-stone-800 mb-4">Responses by Meal Period</h2>
                <div className="space-y-3">
                  {(['breakfast', 'lunch', 'dinner'] as MealPeriod[]).map((mp) => {
                    const count = stats.byMealPeriod[mp]
                    const pct   = stats.totalSubmissions > 0
                      ? Math.round((count / stats.totalSubmissions) * 100)
                      : 0
                    return (
                      <div key={mp} className="flex items-center gap-3">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full w-20 text-center capitalize', MEAL_COLOURS[mp])}>
                          {mp}
                        </span>
                        <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-stone-700 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-stone-500 w-8 text-right">{count}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Property breakdown */}
              {stats.propertyBreakdown.length > 0 && (
                <div className="bg-white rounded-2xl border border-stone-200 p-6">
                  <h2 className="text-sm font-semibold text-stone-800 mb-4">By Property</h2>
                  <div className="space-y-3">
                    {stats.propertyBreakdown.map((p) => (
                      <div key={p.property_id} className="flex items-center justify-between gap-3">
                        <p className="text-xs text-stone-700 truncate flex-1">{p.property_name}</p>
                        <span className="text-xs text-stone-400 shrink-0">{p.submissions} responses</span>
                        <StarDisplay score={p.avg_score} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Per-meal average score & satisfaction breakdown */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-800 mb-5">Average Scores by Meal Period</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {(['breakfast', 'lunch', 'dinner'] as MealPeriod[]).map((mp) => {
                const ms = stats.byMealPeriodStats[mp]
                const questions: { key: keyof typeof ms; label: string }[] = [
                  { key: 'food_quality',         label: 'Food Quality' },
                  { key: 'food_temperature',      label: 'Temperature' },
                  { key: 'service_speed',         label: 'Speed of Service' },
                  { key: 'staff_friendliness',    label: 'Staff Friendliness' },
                  { key: 'ambience',              label: 'Atmosphere' },
                  { key: 'value_for_money',       label: 'Value for Money' },
                  { key: 'overall_satisfaction',  label: 'Overall Satisfaction' },
                ]
                return (
                  <div key={mp} className="space-y-4">
                    {/* Meal header */}
                    <div className="flex items-center justify-between">
                      <span className={cn('text-xs font-semibold px-2.5 py-1 rounded-full capitalize', MEAL_COLOURS[mp])}>
                        {mp}
                      </span>
                      <span className="text-xs text-stone-400">{ms.count} responses</span>
                    </div>

                    {/* Headline avg */}
                    <div className="flex items-center gap-2">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                      <span className="text-2xl font-bold text-stone-900">
                        {ms.avg_score !== null ? ms.avg_score.toFixed(1) : '—'}
                      </span>
                      <span className="text-sm text-stone-400">/ 5</span>
                    </div>

                    {/* Per-question bars */}
                    <div className="space-y-2">
                      {questions.map(({ key, label }) => {
                        const val = ms[key] as number | null
                        const pct = val !== null ? ((val - 1) / 4) * 100 : 0
                        return (
                          <div key={key} className="space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-stone-500">{label}</span>
                              <span className="text-xs font-medium text-stone-700">
                                {val !== null ? val.toFixed(1) : '—'}
                              </span>
                            </div>
                            <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  'h-full rounded-full',
                                  pct >= 80 ? 'bg-emerald-400' : pct >= 60 ? 'bg-amber-400' : val !== null ? 'bg-red-400' : 'bg-stone-200',
                                )}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recent responses */}
          {stats.recentResponses.length > 0 && (
            <div className="bg-white rounded-2xl border border-stone-200 p-6">
              <h2 className="text-sm font-semibold text-stone-800 mb-4">Recent Responses</h2>
              <div className="divide-y divide-stone-100">
                {stats.recentResponses.map((r) => (
                  <div key={r.id} className="py-3.5 flex items-start justify-between gap-4">
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full capitalize', MEAL_COLOURS[r.meal_period])}>
                          {r.meal_period}
                        </span>
                        {r.table_number && (
                          <span className="text-xs text-stone-400">Table {r.table_number}</span>
                        )}
                        {r.guest_name && (
                          <span className="text-xs text-stone-500">{r.guest_name}</span>
                        )}
                      </div>
                      {r.comments && (
                        <p className="text-sm text-stone-600 line-clamp-2 mt-1">&ldquo;{r.comments}&rdquo;</p>
                      )}
                      <p className="text-xs text-stone-400">
                        {new Date(r.created_at).toLocaleString('en-ZW', {
                          timeZone: 'Africa/Harare',
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <StarDisplay score={r.avg_score} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QR code links per property */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6">
            <div className="flex items-center gap-2 mb-1">
              <QrCode className="w-4 h-4 text-stone-500" />
              <h2 className="text-sm font-semibold text-stone-800">Property QR Codes</h2>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Click <strong>QR</strong> next to a property to view and download its QR code. Print and place it on
              restaurant tables so guests can scan and submit feedback instantly.
            </p>
            <PropertyQrCodes properties={allProperties} baseUrl={baseUrl} />
          </div>

        </div>
      )}
    </div>
  )
}
