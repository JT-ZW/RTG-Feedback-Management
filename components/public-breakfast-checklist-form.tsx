'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  BREAKFAST_SECTIONS,
  ALL_BREAKFAST_ITEMS,
  WEEKDAY_SPECIAL,
  computeBreakfastScores,
  type BreakfastResponses,
} from '@/lib/restaurant-breakfast-items'
import { submitPublicBreakfastChecklist } from '@/app/actions/restaurant-breakfast-public'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import { toast, Toaster } from 'sonner'

interface Property {
  id: string
  name: string
}

function buildEmptyResponses(): BreakfastResponses {
  const r: BreakfastResponses = {}
  for (const item of ALL_BREAKFAST_ITEMS) {
    r[item.id] = null
  }
  return r
}

/** Returns the special-of-the-day item id for a given date string (YYYY-MM-DD) */
function getTodaySpecialId(dateStr: string): string | null {
  if (!dateStr) return null
  const day = new Date(dateStr).getDay()
  return WEEKDAY_SPECIAL[day] ?? null
}

export function PublicBreakfastChecklistForm({ properties }: { properties: Property[] }) {
  const [propertyId, setPropertyId] = useState('')
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().split('T')[0])
  const [responses, setResponses] = useState<BreakfastResponses>(buildEmptyResponses)
  const [checkedBy, setCheckedBy] = useState('')
  const [restaurantManager, setRestaurantManager] = useState('')
  const [executiveChef, setExecutiveChef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const errorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])

  const setAnswer = useCallback((itemId: string, answer: boolean) => {
    setResponses(prev => ({ ...prev, [itemId]: answer }))
  }, [])

  const { yesCount, percentage } = computeBreakfastScores(responses)
  const answeredCount = ALL_BREAKFAST_ITEMS.filter(i => responses[i.id] !== null).length
  const allAnswered = answeredCount === ALL_BREAKFAST_ITEMS.length

  const todaySpecialId = getTodaySpecialId(submissionDate)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!allAnswered) {
      const remaining = ALL_BREAKFAST_ITEMS.length - answeredCount
      setError(`${remaining} checklist item${remaining !== 1 ? 's' : ''} still need${remaining === 1 ? 's' : ''} an answer — scroll through the list above to complete them.`)
      return
    }
    setError(null)
    setSubmitting(true)

    const result = await submitPublicBreakfastChecklist({
      propertyId,
      submissionDate,
      responses,
      checkedBy,
      restaurantManager,
      executiveChef,
    })

    setSubmitting(false)
    if (result.success) {
      setSubmitted(true)
    } else {
      const msg = result.error ?? 'Something went wrong. Please try again.'
      setError(msg)
      toast.error('Submission failed', { description: msg })
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-stone-900 mb-2">Checklist submitted!</h2>
          <p className="text-stone-500 text-sm leading-relaxed">
            Your breakfast checklist has been recorded.{' '}
            <strong>{yesCount}/{ALL_BREAKFAST_ITEMS.length}</strong> items answered YES
            ({percentage.toFixed(1)}% compliance).
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-stone-900 text-white py-6 px-4">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-stone-400 mb-1">Rainbow Tourism Group</p>
          <h1 className="text-xl font-semibold tracking-tight">Restaurant Breakfast Checklist</h1>
          <p className="text-stone-400 text-sm mt-1">Restaurant Manager / Head Waiter / Restaurant Supervisor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Header details */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Property</label>
              <select
                suppressHydrationWarning
                required
                aria-label="Property"
                value={propertyId}
                onChange={e => setPropertyId(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              >
                <option value="">Select property…</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="bk-date" className="block text-xs font-medium text-stone-600 mb-1">Date</label>
              <input
                suppressHydrationWarning
                id="bk-date"
                required
                type="date"
                value={submissionDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setSubmissionDate(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

          </div>
        </div>

        {/* Checklist sections */}
        {BREAKFAST_SECTIONS.map(section => (
          <div key={section.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">

            {/* Section header */}
            <div className="bg-stone-800 text-white px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest">{section.title}</span>
              <div className="flex gap-6">
                <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wide w-10 text-center">YES</span>
                <span className="text-xs font-semibold text-red-300 uppercase tracking-wide w-10 text-center">NO</span>
              </div>
            </div>

            {/* Items */}
            <div className="divide-y divide-stone-100">
              {section.items.map(item => {
                const val = responses[item.id]
                const isToday = section.id === 'special_of_day' && item.id === todaySpecialId
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'flex items-center px-4 py-3 gap-3 transition-colors',
                      val === true  && 'bg-emerald-50/40',
                      val === false && 'bg-red-50/40',
                      isToday && 'ring-1 ring-inset ring-amber-300',
                    )}
                  >
                    <span className={cn(
                      'flex-1 text-sm leading-snug',
                      isToday ? 'text-amber-800 font-semibold' : 'text-stone-800'
                    )}>
                      {item.label}
                      {isToday && (
                        <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                          Today
                        </span>
                      )}
                    </span>

                    {/* YES */}
                    <button
                      type="button"
                      onClick={() => setAnswer(item.id, true)}
                      className={cn(
                        'w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all shrink-0',
                        val === true
                          ? 'bg-emerald-500 border-emerald-500 text-white scale-110'
                          : 'border-stone-200 text-stone-400 hover:border-emerald-400 hover:text-emerald-500'
                      )}
                      aria-label={`${item.label} — Yes`}
                    >
                      Y
                    </button>

                    {/* NO */}
                    <button
                      type="button"
                      onClick={() => setAnswer(item.id, false)}
                      className={cn(
                        'w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all shrink-0',
                        val === false
                          ? 'bg-red-500 border-red-500 text-white scale-110'
                          : 'border-stone-200 text-stone-400 hover:border-red-400 hover:text-red-500'
                      )}
                      aria-label={`${item.label} — No`}
                    >
                      N
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {/* Progress */}
        <div className="bg-white rounded-xl border border-stone-200 px-4 py-3 flex items-center justify-between gap-4">
          <span className="text-xs text-stone-500">
            {answeredCount}/{ALL_BREAKFAST_ITEMS.length} answered
          </span>
          <div className="flex-1 max-w-50 h-1.5 bg-stone-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-stone-900 rounded-full transition-all"
              style={{ width: `${(answeredCount / ALL_BREAKFAST_ITEMS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Sign-off */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Sign-off</p>
          <div className="grid grid-cols-1 gap-4">

            <div>
              <label htmlFor="bk-checked-by" className="block text-xs font-medium text-stone-600 mb-1">Checked By</label>
              <input
                suppressHydrationWarning
                id="bk-checked-by"
                required
                type="text"
                value={checkedBy}
                onChange={e => setCheckedBy(e.target.value)}
                placeholder="Full name"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div>
              <label htmlFor="bk-manager" className="block text-xs font-medium text-stone-600 mb-1">Restaurant Manager / Hostess</label>
              <input
                suppressHydrationWarning
                id="bk-manager"
                required
                type="text"
                value={restaurantManager}
                onChange={e => setRestaurantManager(e.target.value)}
                placeholder="Full name"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div>
              <label htmlFor="bk-chef" className="block text-xs font-medium text-stone-600 mb-1">Executive / Head Chef</label>
              <input
                suppressHydrationWarning
                id="bk-chef"
                required
                type="text"
                value={executiveChef}
                onChange={e => setExecutiveChef(e.target.value)}
                placeholder="Full name"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

          </div>
        </div>

        {error && (
          <div ref={errorRef} className="bg-red-50 border border-red-300 rounded-xl px-4 py-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700">Cannot submit yet</p>
              <p className="text-sm text-red-600 mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-stone-900 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-stone-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit Checklist'}
        </button>

      </form>
      <Toaster position="top-center" richColors />
    </div>
  )
}
