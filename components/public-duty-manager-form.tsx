'use client'

import { useState, useCallback } from 'react'
import {
  DUTY_MANAGER_SECTIONS,
  computeDMScores,
  type DutyManagerResponses,
  type RoomCheck,
} from '@/lib/duty-manager-sections'
import { submitPublicDutyManagerForm } from '@/app/actions/duty-manager-public'
import { cn } from '@/lib/utils'
import { CheckCircle2, Plus, Trash2 } from 'lucide-react'

interface Property {
  id: string
  name: string
}

const RATING_OPTIONS = [
  { value: 1, label: 'Poor',    bg: 'bg-red-500 text-white',     outline: 'border-red-400 text-red-600 hover:bg-red-50' },
  { value: 2, label: 'Average', bg: 'bg-amber-400 text-white',   outline: 'border-amber-400 text-amber-600 hover:bg-amber-50' },
  { value: 3, label: 'Good',    bg: 'bg-emerald-500 text-white', outline: 'border-emerald-400 text-emerald-600 hover:bg-emerald-50' },
]

function buildEmptyResponses(): DutyManagerResponses {
  const r: DutyManagerResponses = {}
  for (const section of DUTY_MANAGER_SECTIONS) {
    r[section.id] = {}
    for (const item of section.items) {
      r[section.id][item.id] = { rating: null, comment: '' }
    }
  }
  return r
}

function buildEmptyRoomChecks(): RoomCheck[] {
  return [{ roomNo: '', notes: '' }, { roomNo: '', notes: '' }]
}

export function PublicDutyManagerForm({ properties }: { properties: Property[] }) {
  const [propertyId, setPropertyId] = useState('')
  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0])
  const [shift, setShift] = useState<'AM' | 'PM' | ''>('')
  const [managerName, setManagerName] = useState('')
  const [responses, setResponses] = useState<DutyManagerResponses>(buildEmptyResponses)
  const [roomChecks, setRoomChecks] = useState<RoomCheck[]>(buildEmptyRoomChecks)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const setRating = useCallback((sectionId: string, itemId: string, rating: 1 | 2 | 3) => {
    setResponses(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [itemId]: { ...prev[sectionId][itemId], rating },
      },
    }))
  }, [])

  const setComment = useCallback((sectionId: string, itemId: string, comment: string) => {
    setResponses(prev => ({
      ...prev,
      [sectionId]: {
        ...prev[sectionId],
        [itemId]: { ...prev[sectionId][itemId], comment },
      },
    }))
  }, [])

  const addRoomCheck = () => {
    if (roomChecks.length < 5) setRoomChecks(prev => [...prev, { roomNo: '', notes: '' }])
  }

  const removeRoomCheck = (idx: number) => {
    if (roomChecks.length > 1) setRoomChecks(prev => prev.filter((_, i) => i !== idx))
  }

  const updateRoomCheck = (idx: number, field: keyof RoomCheck, value: string) => {
    setRoomChecks(prev => prev.map((rc, i) => i === idx ? { ...rc, [field]: value } : rc))
  }

  const { totalActual, totalPossible, percentage } = computeDMScores(responses)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const result = await submitPublicDutyManagerForm({
      propertyId,
      shiftDate,
      shift: shift as 'AM' | 'PM',
      managerName,
      responses,
      roomChecks: roomChecks.filter(rc => rc.roomNo.trim()),
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
            Your duty manager checklist has been recorded.
            Final score: <strong>{totalActual}/{totalPossible}</strong> ({percentage.toFixed(1)}%).
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
          <h1 className="text-xl font-semibold tracking-tight">Duty Manager Checklist</h1>
          <p className="text-stone-400 text-sm mt-1">Rainbow Tourism Group — Daily Property Inspection</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* Shift Details */}
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">Shift Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Property</label>
              <select
                required
                value={propertyId}
                onChange={e => setPropertyId(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                suppressHydrationWarning
              >
                <option value="">Select property…</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Date</label>
              <input
                required
                type="date"
                value={shiftDate}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setShiftDate(e.target.value)}
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                suppressHydrationWarning
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
              {/* hidden input for required validation */}
              <input type="text" required value={shift} onChange={() => {}} className="sr-only" tabIndex={-1} suppressHydrationWarning />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1">Duty Manager</label>
              <input
                required
                type="text"
                value={managerName}
                onChange={e => setManagerName(e.target.value)}
                placeholder="Full name"
                className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-900"
                suppressHydrationWarning
              />
            </div>
          </div>
        </div>

        {/* Checklist Sections */}
        {DUTY_MANAGER_SECTIONS.map((section, sIdx) => (
          <div key={section.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {/* Section header */}
            <div className="bg-stone-900 text-white px-5 py-3 flex items-center gap-2">
              <span className="text-xs font-bold text-stone-400">{String(sIdx + 1).padStart(2, '0')}</span>
              <h2 className="text-sm font-semibold uppercase tracking-wide">{section.title}</h2>
            </div>

            {/* Column headers */}
            <div className="grid grid-cols-[1fr_180px_1fr] gap-0 bg-stone-50 border-b border-stone-200 px-5 py-2">
              <span className="text-xs font-semibold text-stone-500">Item</span>
              <span className="text-xs font-semibold text-stone-500 text-center">Rating</span>
              <span className="text-xs font-semibold text-stone-500 text-right">Comment</span>
            </div>

            {/* Items */}
            <div className="divide-y divide-stone-50">
              {section.items.map(item => {
                const resp = responses[section.id]?.[item.id]
                return (
                  <div key={item.id} className="grid grid-cols-[1fr_180px_1fr] gap-3 items-center px-5 py-3">
                    <span className="text-sm text-stone-700">{item.label}</span>

                    {/* Rating buttons */}
                    <div className="flex gap-1.5 justify-center">
                      {RATING_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRating(section.id, item.id, opt.value as 1 | 2 | 3)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all',
                            resp?.rating === opt.value
                              ? opt.bg + ' border-transparent shadow-sm'
                              : opt.outline
                          )}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {/* Comment */}
                    <input
                      type="text"
                      value={resp?.comment ?? ''}
                      onChange={e => setComment(section.id, item.id, e.target.value)}
                      placeholder="Optional comment…"
                      className="w-full border border-stone-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-stone-400"
                      suppressHydrationWarning
                    />
                  </div>
                )
              })}
            </div>

            {/* Section score */}
            <div className="flex items-center justify-between px-5 py-2.5 bg-stone-50 border-t border-stone-200">
              <span className="text-xs text-stone-500">Section total</span>
              <span className="text-sm font-semibold text-stone-700">
                {section.items.reduce(
                  (sum, item) => sum + (responses[section.id]?.[item.id]?.rating ?? 0), 0
                )}
                <span className="text-stone-400 font-normal">/{section.items.length * 3}</span>
              </span>
            </div>
          </div>
        ))}

        {/* Room Checks */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="bg-stone-900 text-white px-5 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide">Room Checks</h2>
            <span className="text-xs text-stone-400">{roomChecks.length}/5 rooms</span>
          </div>
          <div className="divide-y divide-stone-100">
            {roomChecks.map((rc, idx) => (
              <div key={idx} className="flex items-start gap-3 px-5 py-4">
                <div className="shrink-0">
                  <label className="block text-xs font-medium text-stone-500 mb-1">Room No.</label>
                  <input
                    type="text"
                    value={rc.roomNo}
                    onChange={e => updateRoomCheck(idx, 'roomNo', e.target.value)}
                    placeholder="e.g. 405"
                    className="w-24 border border-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-stone-400"
                    suppressHydrationWarning
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-stone-500 mb-1">Observations / Notes</label>
                  <textarea
                    value={rc.notes}
                    onChange={e => updateRoomCheck(idx, 'notes', e.target.value)}
                    placeholder="Enter observations for this room…"
                    rows={2}
                    className="w-full border border-stone-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-stone-400"
                    suppressHydrationWarning
                  />
                </div>
                {roomChecks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRoomCheck(idx)}
                    className="mt-6 text-stone-400 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {roomChecks.length < 5 && (
            <div className="px-5 pb-4">
              <button
                type="button"
                onClick={addRoomCheck}
                className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 border border-dashed border-stone-300 rounded-lg px-4 py-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add room check
              </button>
            </div>
          )}
        </div>

        {/* Live score summary */}
        <div className="bg-stone-900 text-white rounded-xl px-6 py-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Total Score</p>
            <p className="text-3xl font-bold mt-1">
              {totalActual}
              <span className="text-lg font-normal text-stone-400">/{totalPossible}</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest text-stone-400">Percentage</p>
            <p className="text-3xl font-bold mt-1">{percentage.toFixed(1)}%</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || !propertyId || !shift || !managerName.trim()}
          className="w-full bg-stone-900 text-white py-3.5 rounded-xl font-semibold text-sm hover:bg-stone-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Submitting…' : 'Submit Checklist'}
        </button>
      </form>
    </div>
  )
}
