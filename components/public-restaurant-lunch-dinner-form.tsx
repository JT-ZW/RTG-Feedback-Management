'use client'

import { useState, useCallback } from 'react'
import {
  RESTAURANT_LUNCH_DINNER_ITEMS,
  computeRestaurantLunchDinnerScores,
  type RestaurantLunchDinnerResponses,
} from '@/lib/restaurant-lunch-dinner-items'
import { submitPublicRestaurantLunchDinner } from '@/app/actions/restaurant-lunch-dinner-public'
import { cn } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'

interface Property {
  id: string
  name: string
}

const POSITIONS = [
  'Restaurant Manager',
  'Head Waiter',
  'Restaurant Supervisor',
]

function buildEmptyResponses(): RestaurantLunchDinnerResponses {
  const r: RestaurantLunchDinnerResponses = {}
  for (const item of RESTAURANT_LUNCH_DINNER_ITEMS) {
    r[item.id] = null
  }
  return r
}

export function PublicRestaurantLunchDinnerForm({ properties }: { properties: Property[] }) {
  const [propertyId, setPropertyId] = useState('')
  const [submissionDate, setSubmissionDate] = useState(new Date().toISOString().split('T')[0])
  const [shift, setShift] = useState<'AM' | 'PM' | ''>('')
  const [submitterName, setSubmitterName] = useState('')
  const [position, setPosition] = useState('')
  const [responses, setResponses] = useState<RestaurantLunchDinnerResponses>(buildEmptyResponses)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setAnswer = useCallback((itemId: string, answer: boolean) => {
    setResponses(prev => ({ ...prev, [itemId]: answer }))
  }, [])

  const { yesCount, percentage } = computeRestaurantLunchDinnerScores(responses)
  const answeredCount = RESTAURANT_LUNCH_DINNER_ITEMS.filter(i => responses[i.id] !== null).length
  const allAnswered = answeredCount === RESTAURANT_LUNCH_DINNER_ITEMS.length

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!shift) {
      setError('Please select a shift (AM or PM).')
      return
    }
    if (!allAnswered) {
      setError('Please answer all checklist items before submitting.')
      return
    }
    setError(null)
    setSubmitting(true)

    const result = await submitPublicRestaurantLunchDinner({
      propertyId,
      submissionDate,
      shift: shift as 'AM' | 'PM',
      submitterName,
      position,
      responses,
    })

    setSubmitting(false)
    if (result.success) {
      setSubmitted(true)
    } else {
      setError(result.error ?? 'Something went wrong. Please try again.')
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <CheckCircle2 className="w-14 h-14 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-stone-900 mb-2">Checklist submitted!</h2>
          <p className="text-stone-500 text-sm leading-relaxed">
            Your restaurant {shift} shift checklist has been recorded.{' '}
            <strong>{yesCount}/{RESTAURANT_LUNCH_DINNER_ITEMS.length}</strong> items answered YES
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
          <h1 className="text-xl font-semibold tracking-tight">Restaurant Checklist — Lunch &amp; Dinner</h1>
          <p className="text-stone-400 text-sm mt-1">Restaurant Manager / Head Waiter / Restaurant Supervisor</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {/* Shift Details */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Shift Details</p>
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
              <label htmlFor="rld-date" className="block text-xs font-medium text-stone-600 mb-1">Date</label>
              <input
                suppressHydrationWarning
                id="rld-date"
                required
                type="date"
                value={submissionDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setSubmissionDate(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Shift</label>
              <div className="flex gap-2 mt-1">
                {(['AM', 'PM'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setShift(s)}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors',
                      shift === s
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Name</label>
              <input
                suppressHydrationWarning
                required
                type="text"
                value={submitterName}
                onChange={e => setSubmitterName(e.target.value)}
                placeholder="Full name"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-600 mb-1">Position</label>
              <div className="flex flex-wrap gap-2">
                {POSITIONS.map(pos => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setPosition(pos)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                      position === pos
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-600 border-stone-200 hover:border-stone-400'
                    )}
                  >
                    {pos}
                  </button>
                ))}
                <input
                  suppressHydrationWarning
                  id="rld-position"
                  type="text"
                  required
                  value={position}
                  onChange={e => setPosition(e.target.value)}
                  placeholder="Or type position…"
                  className="flex-1 min-w-40 border border-stone-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-stone-900"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[auto_1fr_80px_80px] items-center bg-stone-50 border-b border-stone-200 px-4 py-3">
            <span className="w-8 text-xs font-semibold text-stone-400 uppercase tracking-wide">#</span>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Item</span>
            <span className="text-center text-xs font-semibold text-emerald-600 uppercase tracking-wide">YES</span>
            <span className="text-center text-xs font-semibold text-red-500 uppercase tracking-wide">NO</span>
          </div>

          {/* Items */}
          <div className="divide-y divide-stone-100">
            {RESTAURANT_LUNCH_DINNER_ITEMS.map(item => {
              const val = responses[item.id]
              return (
                <div
                  key={item.id}
                  className={cn(
                    'grid grid-cols-[auto_1fr_80px_80px] items-center px-4 py-3 transition-colors',
                    val === true  && 'bg-emerald-50/40',
                    val === false && 'bg-red-50/40',
                  )}
                >
                  <span className="w-8 text-xs text-stone-400 font-mono shrink-0">{item.number}</span>
                  <span className="text-sm text-stone-800 pr-4 leading-snug">{item.label}</span>

                  {/* YES */}
                  <button
                    type="button"
                    onClick={() => setAnswer(item.id, true)}
                    className={cn(
                      'mx-auto w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all',
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
                      'mx-auto w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all',
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

          {/* Progress footer */}
          <div className="border-t border-stone-200 px-4 py-3 bg-stone-50 flex items-center justify-between gap-4">
            <span className="text-xs text-stone-500">
              {answeredCount}/{RESTAURANT_LUNCH_DINNER_ITEMS.length} answered
            </span>
            <div className="flex-1 max-w-50 h-1.5 bg-stone-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-stone-900 rounded-full transition-all"
                style={{ width: `${(answeredCount / RESTAURANT_LUNCH_DINNER_ITEMS.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
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
    </div>
  )
}
