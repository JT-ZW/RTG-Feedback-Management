'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  SURVEY_QUESTIONS,
  buildEmptyRatings,
  allRatingsComplete,
  type MealPeriod,
  type DiningSurveyRatings,
} from '@/lib/dining-survey'
import { submitDiningSurvey } from '@/app/actions/dining-survey-public'
import { cn } from '@/lib/utils'
import { CheckCircle2, AlertCircle, ChevronDown, Star } from 'lucide-react'

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  propertyId:      string
  propertyName:    string
  autoMealPeriod:  MealPeriod | null
}

// ── Star rating input ──────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number | null
  onChange: (v: number) => void
  disabled: boolean
}) {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Star rating 1 to 5">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = (hovered ?? value ?? 0) >= star
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(null)}
            aria-label={`${star} star${star !== 1 ? 's' : ''}`}
            className={cn(
              'transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded',
              disabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-110 cursor-pointer',
            )}
          >
            <Star
              className={cn(
                'w-8 h-8 transition-colors',
                active ? 'fill-amber-400 text-amber-400' : 'fill-stone-200 text-stone-200',
              )}
            />
          </button>
        )
      })}
    </div>
  )
}

// ── Meal period selector ───────────────────────────────────────────────────

const MEAL_LABELS: Record<MealPeriod, string> = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
}

function MealSelector({
  value,
  onChange,
  disabled,
}: {
  value: MealPeriod | null
  onChange: (v: MealPeriod) => void
  disabled: boolean
}) {
  return (
    <div className="relative">
      <select
        className={cn(
          'w-full appearance-none rounded-xl border border-stone-200 bg-white px-4 py-3 pr-10',
          'text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value as MealPeriod)}
        disabled={disabled}
      >
        <option value="" disabled>Select meal period…</option>
        {(Object.keys(MEAL_LABELS) as MealPeriod[]).map((p) => (
          <option key={p} value={p}>{MEAL_LABELS[p]}</option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 pointer-events-none" />
    </div>
  )
}

// ── Main form component ────────────────────────────────────────────────────

export function PublicDiningSurveyForm({ propertyId, propertyName, autoMealPeriod }: Props) {
  const [ratings,      setRatings]      = useState<DiningSurveyRatings>(buildEmptyRatings)
  const [mealPeriod,   setMealPeriod]   = useState<MealPeriod | null>(null) // only used when auto is null
  const [tableNumber,  setTableNumber]  = useState('')
  const [comments,     setComments]     = useState('')
  const [guestName,    setGuestName]    = useState('')
  const [guestEmail,   setGuestEmail]   = useState('')
  const [guestPhone,   setGuestPhone]   = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [submitted,  setSubmitted]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const errorRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [error])

  const setRating = useCallback((id: keyof DiningSurveyRatings, val: number) => {
    setRatings((prev) => ({ ...prev, [id]: val }))
  }, [])

  const effectiveMealPeriod = autoMealPeriod ?? mealPeriod
  const ratingsComplete     = allRatingsComplete(ratings)
  const mealPeriodReady     = effectiveMealPeriod !== null
  const canSubmit           = ratingsComplete && mealPeriodReady && !submitting

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!ratingsComplete) {
      setError('Please rate all 7 questions before submitting.')
      return
    }
    if (!mealPeriodReady) {
      setError('Please select a meal period.')
      return
    }
    setError(null)
    setSubmitting(true)

    const result = await submitDiningSurvey({
      propertyId,
      mealPeriod,              // server ignores this when autoDetected
      tableNumber,
      ratings,
      comments,
      guestName,
      guestEmail,
      guestPhone,
    })

    setSubmitting(false)

    if (!result.success) {
      setError(result.error ?? 'Something went wrong. Please try again.')
      return
    }

    setSubmitted(true)
  }

  // ── Thank-you screen ──────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center px-4">
        <div className="max-w-sm w-full text-center space-y-5">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-900 mb-2">Thank you!</h1>
            <p className="text-stone-500 text-sm leading-relaxed">
              Your feedback has been received. We appreciate you taking the time —
              it helps us keep improving your experience at {propertyName}.
            </p>
          </div>
          <div className="pt-2">
            <img
              src="/rtg-logo.png"
              alt="Rainbow Tourism Group"
              className="h-8 mx-auto opacity-60"
            />
          </div>
        </div>
      </div>
    )
  }

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-stone-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <img
            src="/rtg-logo.png"
            alt="Rainbow Tourism Group"
            className="h-10 mx-auto"
          />
          <div>
            <p className="text-base font-bold text-stone-800 uppercase tracking-widest mb-1">
              {propertyName}
            </p>
            <h1 className="text-2xl font-bold text-stone-900">How was your meal?</h1>
            <p className="text-stone-500 text-sm mt-1">
              Takes less than a minute. Your feedback goes directly to our team.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* Meal period — auto badge or manual selector */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Meal Period
            </p>
            {autoMealPeriod ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-sm font-medium text-amber-800 capitalize">
                  {autoMealPeriod}
                </span>
              </div>
            ) : (
              <MealSelector
                value={mealPeriod}
                onChange={setMealPeriod}
                disabled={submitting}
              />
            )}
          </div>

          {/* 7 rated questions */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-6">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Rate Your Experience
            </p>
            {SURVEY_QUESTIONS.map((q, i) => (
              <div key={q.id} className="space-y-2">
                <p className="text-sm font-medium text-stone-800">
                  <span className="text-stone-400 mr-2">{i + 1}.</span>
                  {q.label}
                </p>
                <StarRating
                  value={ratings[q.id]}
                  onChange={(v) => setRating(q.id, v)}
                  disabled={submitting}
                />
              </div>
            ))}
          </div>

          {/* Optional details */}
          <div className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Optional Details
            </p>

            <div className="space-y-1">
              <label className="text-xs text-stone-500" htmlFor="table-number">Table number</label>
              <input
                id="table-number"
                type="text"
                inputMode="numeric"
                maxLength={20}
                placeholder="e.g. 7"
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                disabled={submitting}
               
                className={cn(
                  'w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm',
                  'placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500',
                  submitting && 'opacity-50 cursor-not-allowed',
                )}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-stone-500" htmlFor="comments">Comments &amp; suggestions</label>
              <textarea
                id="comments"
                rows={3}
                maxLength={2000}
                placeholder="Tell us what you loved or what we can improve…"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                disabled={submitting}
               
                className={cn(
                  'w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm resize-none',
                  'placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500',
                  submitting && 'opacity-50 cursor-not-allowed',
                )}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-stone-500" htmlFor="guest-name">Your name</label>
              <input
                id="guest-name"
                type="text"
                maxLength={200}
                placeholder="Anonymous"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                disabled={submitting}
               
                className={cn(
                  'w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm',
                  'placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500',
                  submitting && 'opacity-50 cursor-not-allowed',
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-stone-500" htmlFor="guest-email">Email (optional)</label>
                <input
                  id="guest-email"
                  type="email"
                  maxLength={320}
                  placeholder="you@example.com"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  disabled={submitting}
                 
                  className={cn(
                    'w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm',
                    'placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500',
                    submitting && 'opacity-50 cursor-not-allowed',
                  )}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-stone-500" htmlFor="guest-phone">Phone (optional)</label>
                <input
                  id="guest-phone"
                  type="tel"
                  maxLength={20}
                  placeholder="+263 77 000 0000"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  disabled={submitting}
                 
                  className={cn(
                    'w-full rounded-xl border border-stone-200 px-4 py-2.5 text-sm',
                    'placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-500',
                    submitting && 'opacity-50 cursor-not-allowed',
                  )}
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              ref={errorRef}
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'w-full rounded-xl py-3.5 text-sm font-semibold transition-all',
              canSubmit
                ? 'bg-stone-900 text-white hover:bg-stone-700 active:scale-[0.98]'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed',
            )}
          >
            {submitting ? 'Submitting…' : 'Submit Feedback'}
          </button>

          <p className="text-center text-xs text-stone-400">
            Your responses are anonymous. Contact details are optional and only used
            if we need to follow up on your feedback.
          </p>

        </form>
      </div>
    </div>
  )
}

