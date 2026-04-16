'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getDiningSurveyLiveData } from '@/app/actions/dining-survey-public'
import {
  Star, Clock, MessageSquare, Activity, Wifi, WifiOff,
  AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MealPeriod } from '@/lib/dining-survey'
import type { LiveSubmission } from '@/app/actions/dining-survey-public'

// ─── Constants ────────────────────────────────────────────────────────────────

const MEAL_LABELS: Record<MealPeriod, string> = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
}

const MEAL_COLORS: Record<MealPeriod, string> = {
  breakfast: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  lunch:     'bg-orange-100 text-orange-800 border-orange-200',
  dinner:    'bg-indigo-100 text-indigo-800 border-indigo-200',
}

const QUESTIONS: { key: keyof LiveSubmission; label: string }[] = [
  { key: 'food_quality',         label: 'Food Quality'   },
  { key: 'food_temperature',     label: 'Temperature'    },
  { key: 'service_speed',        label: 'Service Speed'  },
  { key: 'staff_friendliness',   label: 'Staff'          },
  { key: 'ambience',             label: 'Ambience'       },
  { key: 'value_for_money',      label: 'Value'          },
  { key: 'overall_satisfaction', label: 'Overall'        },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreTextColor(score: number) {
  if (score >= 4)   return 'text-emerald-600'
  if (score >= 3)   return 'text-amber-600'
  return 'text-red-600'
}

function scoreBorderBg(score: number) {
  if (score >= 4)   return 'border-emerald-200 bg-emerald-50/60'
  if (score >= 3)   return 'border-amber-200   bg-amber-50/60'
  return 'border-red-200   bg-red-50/60'
}

function scoreBarColor(score: number) {
  if (score >= 4)  return 'bg-emerald-400'
  if (score >= 3)  return 'bg-amber-400'
  return 'bg-red-400'
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${mins % 60}m ago`
}

// ─── Submission Card ──────────────────────────────────────────────────────────

function SubmissionCard({
  submission: s,
  showProperty,
  isNew,
}: {
  submission:   LiveSubmission
  showProperty: boolean
  isNew:        boolean
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border p-4 sm:p-5 transition-all duration-300',
        scoreBorderBg(s.avg_score),
        isNew && 'ring-2 ring-rtg-brown/30',
      )}
    >
      {/* Top row: badges + score */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {showProperty && (
            <span className="text-xs font-semibold bg-stone-100 text-stone-700 px-2 py-0.5 rounded-md border border-stone-200 shrink-0">
              {s.property_name}
            </span>
          )}
          <span className={cn(
            'text-xs font-semibold px-2 py-0.5 rounded-md border shrink-0',
            MEAL_COLORS[s.meal_period],
          )}>
            {MEAL_LABELS[s.meal_period]}
          </span>
          {s.table_number && (
            <span className="text-xs text-stone-500 shrink-0">Table {s.table_number}</span>
          )}
          {s.guest_name && (
            <span className="text-xs text-stone-400 truncate">{s.guest_name}</span>
          )}
        </div>

        <div className="shrink-0 flex flex-col items-end gap-1">
          <span className={cn('text-2xl font-bold leading-none', scoreTextColor(s.avg_score))}>
            {s.avg_score.toFixed(1)}
            <span className="text-sm font-normal text-stone-400 ml-0.5">/5</span>
          </span>
          {s.avg_score < 3 && (
            <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600">
              <AlertTriangle className="w-3 h-3" /> Low score
            </span>
          )}
        </div>
      </div>

      {/* Per-question bar chart */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 sm:gap-y-2 sm:gap-x-6">
        {QUESTIONS.map((q) => {
          const val = s[q.key] as number
          const pct = ((val - 1) / 4) * 100
          return (
            <div key={q.key} className="flex items-center gap-2">
              <span className="text-[11px] text-stone-400 w-18 shrink-0 truncate">{q.label}</span>
              <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', scoreBarColor(val))}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[11px] font-semibold text-stone-500 w-4 text-right shrink-0">{val}</span>
            </div>
          )
        })}
      </div>

      {/* Comments */}
      {s.comments && (
        <div className="mt-4 pt-3 border-t border-stone-100">
          <button
            className="flex items-center gap-1.5 text-[11px] text-stone-400 hover:text-stone-700 transition-colors w-full text-left"
            onClick={() => setExpanded((v) => !v)}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className={cn('flex-1 leading-relaxed', !expanded && 'line-clamp-1')}>
              {s.comments}
            </span>
            {s.comments.length > 80 && (
              expanded
                ? <ChevronUp className="w-3 h-3 shrink-0" />
                : <ChevronDown className="w-3 h-3 shrink-0" />
            )}
          </button>
        </div>
      )}

      {/* Timestamp — suppressHydrationWarning because timeAgo() uses Date.now() which
          differs by ms between SSR and client hydration, causing a text mismatch. */}
      <div className="flex items-center gap-1.5 mt-3">
        <Clock className="w-3 h-3 text-stone-300" />
        <span className="text-[11px] text-stone-400" suppressHydrationWarning>
          {formatTime(s.created_at)} · {timeAgo(s.created_at)}
        </span>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  initialSubmissions: LiveSubmission[]
  availableProperties: { id: string; name: string }[]
  canSelectAll: boolean
  defaultPropertyId?: string
}

export function DiningLiveSession({
  initialSubmissions,
  availableProperties,
  canSelectAll,
  defaultPropertyId,
}: Props) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(
    defaultPropertyId ?? '__all__',
  )
  const [mealFilter, setMealFilter] = useState<MealPeriod | 'all'>('all')
  const [submissions, setSubmissions] = useState<LiveSubmission[]>(initialSubmissions)
  const [connected, setConnected] = useState(false)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())

  // Keep property map in a ref so the Realtime callback can look up names
  const propMapRef = useRef<Map<string, string>>(
    new Map(availableProperties.map((p) => [p.id, p.name])),
  )
  useEffect(() => {
    propMapRef.current = new Map(availableProperties.map((p) => [p.id, p.name]))
  }, [availableProperties])

  // ── Polling fallback (30 s) — catches submissions if Realtime is delayed ──
  useEffect(() => {
    const poll = async () => {
      const result = await getDiningSurveyLiveData()
      if ('error' in result) return
      setSubmissions((prev) => {
        const existingIds = new Set(prev.map((s) => s.id))
        const brandNew = result.submissions.filter((s) => !existingIds.has(s.id))
        if (brandNew.length === 0) return prev
        return [...brandNew, ...prev]
      })
    }
    const timer = setInterval(poll, 30_000)
    return () => clearInterval(timer)
  }, [])

  // ── Realtime subscription ────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session) return

      // Explicitly attach the JWT so the Realtime server can evaluate RLS.
      supabase.realtime.setAuth(session.access_token)

      channel = supabase
        .channel('dining-live-feed')
        .on(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          'postgres_changes' as any,
          {
            event:  'INSERT',
            schema: 'public',
            table:  'dining_survey_submissions',
          },
          (payload: { new: Record<string, unknown> }) => {
          const row = payload.new
          const avgScore =
            // avg_score is a generated column — not present in Realtime payloads
            QUESTIONS.reduce((sum, q) => sum + Number(row[q.key] ?? 0), 0) / QUESTIONS.length
          const roundedAvg = Math.round(avgScore * 10) / 10
          const newSub: LiveSubmission = {
            id:                   String(row.id),
            created_at:           String(row.created_at),
            property_id:          String(row.property_id),
            property_name:        propMapRef.current.get(String(row.property_id)) ?? String(row.property_id),
            meal_period:          row.meal_period as MealPeriod,
            table_number:         row.table_number ? String(row.table_number) : null,
            avg_score:            roundedAvg,
            food_quality:         Number(row.food_quality),
            food_temperature:     Number(row.food_temperature),
            service_speed:        Number(row.service_speed),
            staff_friendliness:   Number(row.staff_friendliness),
            ambience:             Number(row.ambience),
            value_for_money:      Number(row.value_for_money),
            overall_satisfaction: Number(row.overall_satisfaction),
            comments:             row.comments ? String(row.comments) : null,
            guest_name:           row.guest_name ? String(row.guest_name) : null,
          }

          setSubmissions((prev) => [newSub, ...prev])

          // Briefly highlight the new card
          setNewIds((prev) => {
            const next = new Set(prev)
            next.add(newSub.id)
            return next
          })
          setTimeout(() => {
            setNewIds((prev) => {
              const next = new Set(prev)
              next.delete(newSub.id)
              return next
            })
          }, 4000)
        },
      )
          .subscribe((status: string) => {
            setConnected(status === 'SUBSCRIBED')
          })
      })

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
    }
  }, []) // runs once — propMapRef handles updates without re-subscribing

  // ── Client-side filtering ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let result = submissions
    if (selectedPropertyId !== '__all__') {
      result = result.filter((s) => s.property_id === selectedPropertyId)
    }
    if (mealFilter !== 'all') {
      result = result.filter((s) => s.meal_period === mealFilter)
    }
    return result
  }, [submissions, selectedPropertyId, mealFilter])

  // ── Session stats (based on current filter) ──────────────────────────────
  const stats = useMemo(() => {
    const total = filtered.length
    if (total === 0) return { total: 0, avgScore: null, flagged: 0 }
    const avgScore = filtered.reduce((s, r) => s + r.avg_score, 0) / total
    const flagged  = filtered.filter((r) => r.avg_score < 3).length
    return { total, avgScore, flagged }
  }, [filtered])

  const showProperty = selectedPropertyId === '__all__'
  const showSelector = canSelectAll || availableProperties.length > 1

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── Controls row ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">

        {/* Property selector */}
        {showSelector && (
          <select
            aria-label="Select property"
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            className="text-sm border border-stone-200 rounded-xl px-3 py-2 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-rtg-brown/20 cursor-pointer"
            suppressHydrationWarning
          >
            {canSelectAll && <option value="__all__">All Properties</option>}
            {availableProperties.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

        {/* Meal period filter pills */}
        <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-xl p-1">
          {(['all', 'breakfast', 'lunch', 'dinner'] as const).map((mp) => (
            <button
              key={mp}
              onClick={() => setMealFilter(mp)}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-semibold transition-colors',
                mealFilter === mp
                  ? 'bg-rtg-brown text-white'
                  : 'text-stone-500 hover:text-stone-800',
              )}
            >
              {mp === 'all' ? 'All Meals' : MEAL_LABELS[mp]}
            </button>
          ))}
        </div>

        {/* Live connection indicator */}
        <div className={cn(
          'sm:ml-auto flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border',
          connected
            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
            : 'text-stone-400 bg-stone-50 border-stone-200 animate-pulse',
        )}>
          {connected
            ? <Wifi    className="w-3.5 h-3.5" />
            : <WifiOff className="w-3.5 h-3.5" />}
          {connected ? 'Live' : 'Connecting…'}
        </div>
      </div>

      {/* ── Session stats strip ───────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-5">
          <p className="text-[10px] sm:text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
            Responses Today
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-stone-900">{stats.total}</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-5">
          <p className="text-[10px] sm:text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-1">
            Avg Score
          </p>
          <p className={cn(
            'text-2xl sm:text-3xl font-bold',
            stats.avgScore !== null ? scoreTextColor(stats.avgScore) : 'text-stone-300',
          )}>
            {stats.avgScore !== null
              ? <>{stats.avgScore.toFixed(1)}<span className="text-base sm:text-lg font-normal text-stone-400"> /5</span></>
              : '—'
            }
          </p>
        </div>

        <div className={cn(
          'rounded-2xl border p-3 sm:p-5',
          stats.flagged > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-stone-200',
        )}>
          <p className={cn(
            'text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-1',
            stats.flagged > 0 ? 'text-red-500' : 'text-stone-400',
          )}>
            Flagged (&lt;3★)
          </p>
          <p className={cn(
            'text-2xl sm:text-3xl font-bold',
            stats.flagged > 0 ? 'text-red-600' : 'text-stone-900',
          )}>
            {stats.flagged}
          </p>
        </div>
      </div>

      {/* ── Live feed ───────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <Activity className="w-8 h-8 mx-auto mb-3 opacity-25" />
            <p className="text-sm font-medium">Waiting for guest submissions…</p>
            <p className="text-xs mt-1.5 text-stone-300">
              Share the dining survey QR code with guests at the table to start collecting feedback.
            </p>
          </div>
        ) : (
          filtered.map((sub) => (
            <SubmissionCard
              key={sub.id}
              submission={sub}
              showProperty={showProperty}
              isNew={newIds.has(sub.id)}
            />
          ))
        )}
      </div>

      {/* Footer note */}
      {filtered.length > 0 && (
        <p className="text-xs text-stone-300 text-center pb-4">
          Showing today&apos;s {filtered.length} submission{filtered.length !== 1 ? 's' : ''}
          {mealFilter !== 'all' ? ` for ${MEAL_LABELS[mealFilter]}` : ''}.
          New responses appear instantly.
        </p>
      )}
    </div>
  )
}
