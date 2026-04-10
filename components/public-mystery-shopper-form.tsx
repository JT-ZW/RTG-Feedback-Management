'use client'

import { useState, useCallback } from 'react'
import {
  MYSTERY_SHOPPER_SECTIONS,
  computeScores,
  type FormResponses,
  type ItemResponse,
} from '@/lib/mystery-shopper-sections'
import { submitPublicMysteryShopperForm } from '@/app/actions/mystery-shopper-public'
import { cn } from '@/lib/utils'
import { CheckCircle2 } from 'lucide-react'

const RATING_COLORS: Record<number, string> = {
  1: 'bg-red-500 text-white',
  2: 'bg-orange-400 text-white',
  3: 'bg-yellow-400 text-stone-900',
  4: 'bg-lime-500 text-white',
  5: 'bg-emerald-500 text-white',
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
}

function buildEmptyResponses(): FormResponses {
  const r: FormResponses = {}
  for (const section of MYSTERY_SHOPPER_SECTIONS) {
    r[section.id] = {}
    for (const item of section.items) {
      r[section.id][item.id] = { rating: null, comment: '', possibleMark: item.possibleMark }
    }
  }
  return r
}

interface Property {
  id: string
  name: string
}

export function PublicMysteryShopperForm({ properties }: { properties: Property[] }) {
  const [propertyId, setPropertyId] = useState('')
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0])
  const [shopperName, setShopperName] = useState('')
  const [responses, setResponses] = useState<FormResponses>(buildEmptyResponses)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setRating = useCallback((sectionId: string, itemId: string, rating: number) => {
    setResponses(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [itemId]: { ...prev[sectionId][itemId], rating } },
    }))
  }, [])

  const setComment = useCallback((sectionId: string, itemId: string, comment: string) => {
    setResponses(prev => ({
      ...prev,
      [sectionId]: { ...prev[sectionId], [itemId]: { ...prev[sectionId][itemId], comment } },
    }))
  }, [])

  const { totalActual, totalPossible, percentage } = computeScores(responses)

  function sectionActual(sectionId: string) {
    return MYSTERY_SHOPPER_SECTIONS.find(s => s.id === sectionId)
      ?.items.reduce((sum, item) => sum + (responses[sectionId]?.[item.id]?.rating ?? 0), 0) ?? 0
  }

  function sectionPossible(sectionId: string) {
    return MYSTERY_SHOPPER_SECTIONS.find(s => s.id === sectionId)
      ?.items.reduce((sum, item) => sum + item.possibleMark, 0) ?? 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await submitPublicMysteryShopperForm({
      propertyId,
      visitDate,
      shopperName,
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
          <h2 className="text-xl font-semibold text-stone-900 mb-2">Thank you!</h2>
          <p className="text-stone-500 text-sm leading-relaxed">
            Your mystery shopper checklist has been submitted successfully.
            Your final score was <strong>{totalActual}/{totalPossible}</strong> ({percentage.toFixed(1)}%).
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-stone-900 text-white py-6 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-semibold tracking-tight">Mystery Shopper Checklist</h1>
          <p className="text-stone-400 text-sm mt-1">Rainbow Tourism Group — Confidential Audit Form</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Visit Details */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Visit Details</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Property</label>
              <select
                required
                value={propertyId}
                onChange={e => setPropertyId(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              >
                <option value="">Select property…</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Visit Date</label>
              <input
                required
                type="date"
                value={visitDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setVisitDate(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Mystery Shopper Name</label>
              <input
                required
                type="text"
                value={shopperName}
                onChange={e => setShopperName(e.target.value)}
                placeholder="Full name"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-xs text-amber-800">
              Please evaluate each touch‑point using the rating scale: <strong>1 (Poor)</strong> to <strong>5 (Excellent)</strong>. Provide comments where applicable.
            </p>
          </div>
        </div>

        {/* Sections */}
        {MYSTERY_SHOPPER_SECTIONS.map(section => (
          <div key={section.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {/* Section header */}
            <div className="bg-stone-900 text-white px-5 py-3 flex items-center justify-between">
              <h2 className="font-semibold text-sm">{section.title}</h2>
              <span className="text-stone-300 text-xs">
                {sectionActual(section.id)} / {sectionPossible(section.id)}
              </span>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_180px_180px_80px_80px] gap-0 bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-500 uppercase tracking-wide">
              <div className="px-4 py-2">Criteria</div>
              <div className="px-3 py-2 border-l border-stone-200">Rating (1–5)</div>
              <div className="px-3 py-2 border-l border-stone-200">Comments</div>
              <div className="px-3 py-2 border-l border-stone-200 text-center">Possible</div>
              <div className="px-3 py-2 border-l border-stone-200 text-center">Actual</div>
            </div>

            {/* Items */}
            <div className="divide-y divide-stone-100">
              {section.items.map(item => {
                const resp: ItemResponse = responses[section.id][item.id]
                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-[1fr_180px_180px_80px_80px] gap-0 items-start"
                  >
                    {/* Label */}
                    <div className="px-4 py-3 text-sm text-stone-700 leading-relaxed">
                      {item.label}
                    </div>

                    {/* Rating buttons */}
                    <div className="px-3 py-3 border-l border-stone-100 flex flex-col gap-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setRating(section.id, item.id, val)}
                            title={RATING_LABELS[val]}
                            className={cn(
                              'w-8 h-8 rounded text-xs font-bold border-2 transition-all',
                              resp.rating === val
                                ? `${RATING_COLORS[val]} border-transparent`
                                : 'border-stone-200 text-stone-400 hover:border-stone-400 bg-white'
                            )}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                      {resp.rating && (
                        <span className="text-[11px] text-stone-400">{RATING_LABELS[resp.rating]}</span>
                      )}
                    </div>

                    {/* Comment */}
                    <div className="px-3 py-3 border-l border-stone-100">
                      <textarea
                        value={resp.comment}
                        onChange={e => setComment(section.id, item.id, e.target.value)}
                        placeholder="Optional comment…"
                        rows={2}
                        className="w-full text-xs border border-stone-200 rounded px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-stone-400"
                      />
                    </div>

                    {/* Possible mark */}
                    <div className="px-3 py-3 border-l border-stone-100 text-center text-sm text-stone-500 font-medium">
                      {item.possibleMark}
                    </div>

                    {/* Actual mark */}
                    <div className={cn(
                      'px-3 py-3 border-l border-stone-100 text-center text-sm font-bold',
                      resp.rating
                        ? resp.rating >= 4 ? 'text-emerald-600' : resp.rating >= 3 ? 'text-amber-600' : 'text-red-600'
                        : 'text-stone-300'
                    )}>
                      {resp.rating ?? '—'}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Section total row */}
            <div className="grid grid-cols-[1fr_180px_180px_80px_80px] gap-0 bg-stone-50 border-t border-stone-200">
              <div className="col-span-3 px-4 py-2 text-xs font-semibold text-stone-600">Section Total</div>
              <div className="px-3 py-2 border-l border-stone-200 text-center text-xs font-semibold text-stone-600">
                {sectionPossible(section.id)}
              </div>
              <div className="px-3 py-2 border-l border-stone-200 text-center text-xs font-bold text-stone-800">
                {sectionActual(section.id)}
              </div>
            </div>
          </div>
        ))}

        {/* Grand Total */}
        <div className="bg-stone-900 text-white rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">Grand Total</p>
              <p className="text-3xl font-bold">{totalActual} <span className="text-stone-400 text-lg font-normal">/ {totalPossible}</span></p>
            </div>
            <div className="text-right">
              <p className="text-stone-400 text-xs uppercase tracking-wider mb-1">Percentage</p>
              <p className="text-4xl font-bold">{percentage.toFixed(1)}<span className="text-stone-400 text-xl">%</span></p>
              <p className="text-stone-400 text-xs mt-1">Divide total by {totalPossible} to get %</p>
            </div>
          </div>
        </div>

        {/* Shopper confirmation */}
        <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Submission Confirmation</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Mystery Shopper Name</label>
              <input
                type="text"
                value={shopperName}
                onChange={e => setShopperName(e.target.value)}
                required
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Date Submitted</label>
              <input
                type="text"
                value={new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                readOnly
                className="w-full border border-stone-100 rounded-lg px-3 py-2 text-sm bg-stone-50 text-stone-500"
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end pb-12">
          <button
            type="submit"
            disabled={submitting || !propertyId || !shopperName.trim()}
            className="bg-stone-900 text-white px-10 py-3 rounded-lg font-medium text-sm hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting…' : 'Submit Checklist'}
          </button>
        </div>
      </form>
    </div>
  )
}
