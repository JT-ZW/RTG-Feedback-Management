'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  MYSTERY_SHOPPER_SECTIONS,
  computeScores,
  type FormResponses,
  type ItemResponse,
} from '@/lib/mystery-shopper-sections'
import { submitMysteryShopperForm } from '@/app/actions/mystery-shopper'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react'

interface Property {
  id: string
  name: string
}

interface MysteryShopperFormProps {
  properties: Property[]
  defaultPropertyId?: string
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Below Average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
}

const RATING_COLORS: Record<number, string> = {
  1: 'bg-red-500 text-white border-red-500',
  2: 'bg-orange-400 text-white border-orange-400',
  3: 'bg-yellow-400 text-stone-900 border-yellow-400',
  4: 'bg-lime-500 text-white border-lime-500',
  5: 'bg-emerald-500 text-white border-emerald-500',
}

// Initialise empty responses for all sections/items
function buildEmptyResponses(): FormResponses {
  const responses: FormResponses = {}
  for (const section of MYSTERY_SHOPPER_SECTIONS) {
    responses[section.id] = {}
    for (const item of section.items) {
      responses[section.id][item.id] = {
        rating: null,
        comment: '',
        possibleMark: item.possibleMark,
      }
    }
  }
  return responses
}

export function MysteryShopperForm({ properties, defaultPropertyId }: MysteryShopperFormProps) {
  const router = useRouter()
  const [propertyId, setPropertyId] = useState(defaultPropertyId ?? properties[0]?.id ?? '')
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0])
  const [shopperName, setShopperName] = useState('')
  const [responses, setResponses] = useState<FormResponses>(buildEmptyResponses)
  const [expandedSection, setExpandedSection] = useState<string>(MYSTERY_SHOPPER_SECTIONS[0].id)
  const [submitting, setSubmitting] = useState(false)
  const [submitResult, setSubmitResult] = useState<{ success: boolean; error?: string } | null>(null)

  const setRating = useCallback((sectionId: string, itemId: string, rating: number) => {
    setResponses((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [itemId]: { ...prev[sectionId][itemId], rating },
      },
    }))
  }, [])

  const setComment = useCallback((sectionId: string, itemId: string, comment: string) => {
    setResponses((prev) => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [itemId]: { ...prev[sectionId][itemId], comment },
      },
    }))
  }, [])

  const { totalActual, totalPossible, percentage } = computeScores(responses)

  function sectionScore(sectionId: string) {
    const section = MYSTERY_SHOPPER_SECTIONS.find((s) => s.id === sectionId)
    if (!section) return { actual: 0, possible: 0, complete: false }
    let actual = 0
    let possible = 0
    let rated = 0
    for (const item of section.items) {
      const r = responses[sectionId]?.[item.id]
      possible += item.possibleMark
      if (r?.rating != null) {
        actual += r.rating
        rated++
      }
    }
    return { actual, possible, complete: rated === section.items.length }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setSubmitResult(null)

    const result = await submitMysteryShopperForm({
      propertyId,
      visitDate,
      shopperName,
      responses,
    })

    setSubmitting(false)
    setSubmitResult(result)

    if (result.success) {
      setTimeout(() => router.push('/dashboard'), 2000)
    }
  }

  if (submitResult?.success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
        <h2 className="text-lg font-semibold text-stone-900 mb-1">Submission recorded</h2>
        <p className="text-stone-500 text-sm">
          Score: {totalActual}/{totalPossible} — {percentage}%
        </p>
        <p className="text-stone-400 text-xs mt-2">Redirecting to dashboard…</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      {/* Header info */}
      <div className="bg-white rounded-xl border border-stone-200 p-5 space-y-4">
        <h2 className="font-semibold text-stone-800 text-sm uppercase tracking-wide">Visit Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Property */}
          <div className="space-y-1.5">
            <Label htmlFor="property" className="text-xs font-medium text-stone-600">Property</Label>
            <select
              id="property"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              required
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Visit date */}
          <div className="space-y-1.5">
            <Label htmlFor="visitDate" className="text-xs font-medium text-stone-600">Visit Date</Label>
            <Input
              id="visitDate"
              type="date"
              value={visitDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setVisitDate(e.target.value)}
              required
              className="h-9"
            />
          </div>

          {/* Shopper name */}
          <div className="space-y-1.5">
            <Label htmlFor="shopperName" className="text-xs font-medium text-stone-600">Mystery Shopper Name</Label>
            <Input
              id="shopperName"
              type="text"
              value={shopperName}
              onChange={(e) => setShopperName(e.target.value)}
              placeholder="Full name"
              required
              className="h-9"
            />
          </div>
        </div>
      </div>

      {/* Running score bar */}
      <div className="bg-stone-900 text-white rounded-xl px-5 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-stone-400 uppercase tracking-wide mb-0.5">Running Total</p>
          <p className="text-2xl font-bold">{totalActual} <span className="text-stone-400 text-base font-normal">/ {totalPossible}</span></p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold">{percentage.toFixed(1)}<span className="text-stone-400 text-lg">%</span></p>
          <p className="text-xs text-stone-400 mt-0.5">{getScoreLabel(percentage)}</p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {MYSTERY_SHOPPER_SECTIONS.map((section, idx) => {
          const { actual, possible, complete } = sectionScore(section.id)
          const isOpen = expandedSection === section.id

          return (
            <div key={section.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {/* Section header */}
              <button
                type="button"
                onClick={() => setExpandedSection(isOpen ? '' : section.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-stone-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-stone-100 text-stone-500 text-xs font-medium flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-medium text-stone-800 text-sm">{section.title}</span>
                  {complete && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-stone-700">{actual}/{possible}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-stone-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-stone-400" />
                  )}
                </div>
              </button>

              {/* Section items */}
              {isOpen && (
                <div className="border-t border-stone-100 divide-y divide-stone-100">
                  {section.items.map((item) => {
                    const resp: ItemResponse = responses[section.id][item.id]

                    return (
                      <div key={item.id} className="px-5 py-4 space-y-3">
                        <p className="text-sm text-stone-700 leading-relaxed">{item.label}</p>

                        {/* Rating buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setRating(section.id, item.id, val)}
                              title={RATING_LABELS[val]}
                              className={cn(
                                'w-9 h-9 rounded-lg border-2 text-sm font-semibold transition-all',
                                resp.rating === val
                                  ? RATING_COLORS[val]
                                  : 'border-stone-200 text-stone-500 hover:border-stone-400 hover:text-stone-700 bg-white'
                              )}
                            >
                              {val}
                            </button>
                          ))}
                          {resp.rating && (
                            <span className="text-xs text-stone-400 ml-1">
                              {RATING_LABELS[resp.rating]}
                            </span>
                          )}
                        </div>

                        {/* Comment */}
                        <Textarea
                          value={resp.comment}
                          onChange={(e) => setComment(section.id, item.id, e.target.value)}
                          placeholder="Comments (optional)"
                          rows={2}
                          className="text-sm resize-none"
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {submitResult?.error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {submitResult.error}
        </div>
      )}

      {/* Submit */}
      <div className="flex items-center justify-between pt-2 pb-8">
        <p className="text-xs text-stone-400">
          All sections must be rated before submitting.
        </p>
        <Button
          type="submit"
          disabled={submitting || !shopperName.trim() || !propertyId}
          className="bg-stone-900 hover:bg-stone-800 text-white px-8"
        >
          {submitting ? 'Submitting…' : 'Submit Checklist'}
        </Button>
      </div>
    </form>
  )
}

function getScoreLabel(pct: number): string {
  if (pct >= 90) return 'Outstanding'
  if (pct >= 75) return 'Good'
  if (pct >= 60) return 'Satisfactory'
  if (pct >= 40) return 'Needs Improvement'
  return 'Poor'
}
