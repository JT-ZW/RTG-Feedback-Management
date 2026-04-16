'use client'

/**
 * DiningNotificationsListener
 *
 * Mounts once in the dashboard layout. Polls for new dining survey
 * submissions every 15 seconds and fires a sonner toast for each one.
 *
 * On the first poll it silently seeds the set of already-submitted IDs so
 * that existing submissions don't trigger toasts when the page is first
 * opened. Every subsequent poll compares against that set and toasts only
 * genuinely new entries.
 *
 * Renders nothing — purely side-effect driven.
 */

import { useEffect, useRef } from 'react'
import { getDiningSurveyLiveData } from '@/app/actions/dining-survey-public'
import { toast } from 'sonner'
import type { MealPeriod } from '@/lib/dining-survey'

const POLL_INTERVAL_MS = 15_000

const MEAL_LABELS: Record<MealPeriod, string> = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
}

/**
 * A single shared AudioContext created on first user interaction.
 * Browsers require a user gesture before AudioContext can produce sound.
 * By creating it eagerly during a click/keydown we ensure it is in a
 * "running" state when the poll callback fires later.
 */
let sharedCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  try {
    if (!sharedCtx) sharedCtx = new AudioContext()
    return sharedCtx
  } catch {
    return null
  }
}

/**
 * Registers one-time event listeners that create + resume the AudioContext
 * on the first user interaction. Must be called on mount.
 */
function unlockAudio() {
  const unlock = () => {
    const ctx = getAudioContext()
    if (ctx && ctx.state === 'suspended') ctx.resume()
    window.removeEventListener('click',      unlock)
    window.removeEventListener('keydown',    unlock)
    window.removeEventListener('touchstart', unlock)
  }
  window.addEventListener('click',      unlock, { once: true })
  window.addEventListener('keydown',    unlock, { once: true })
  window.addEventListener('touchstart', unlock, { once: true })
}

/**
 * Plays a short chime using the shared AudioContext.
 * `isWarning` → descending two-tone (urgent); otherwise ascending (pleasant).
 */
function playChime(isWarning: boolean) {
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    // If still suspended (no interaction yet), attempt resume and bail —
    // better than playing nothing or erroring.
    if (ctx.state === 'suspended') {
      ctx.resume()
      return
    }

    const notes = isWarning
      ? [{ freq: 880, start: 0 }, { freq: 660, start: 0.18 }]   // descending — urgent
      : [{ freq: 660, start: 0 }, { freq: 880, start: 0.18 }]   // ascending — pleasant

    notes.forEach(({ freq, start }) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start)

      gain.gain.setValueAtTime(0, ctx.currentTime + start)
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.35)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime  + start + 0.4)
    })
  } catch {
    // Fail silently
  }
}

export function DiningNotificationsListener() {
  const seenIdsRef      = useRef<Set<string>>(new Set())
  const initializedRef  = useRef(false)

  useEffect(() => {
    // Unlock the shared AudioContext on the first user interaction so that
    // chimes fired from the poll callback (not a direct user gesture) will play.
    unlockAudio()

    const check = async () => {
      const result = await getDiningSurveyLiveData()
      if ('error' in result) return

      const { submissions } = result

      if (!initializedRef.current) {
        // First run — record every existing submission as already seen
        // so we don't spam toasts for today's historical records.
        submissions.forEach((s) => seenIdsRef.current.add(s.id))
        initializedRef.current = true
        return
      }

      // Fire a toast + chime for every submission we haven't seen before
      for (const s of submissions) {
        if (seenIdsRef.current.has(s.id)) continue
        seenIdsRef.current.add(s.id)

        const meal  = MEAL_LABELS[s.meal_period] ?? String(s.meal_period)
        const table = s.table_number ? `Table ${s.table_number}` : null
        const parts = [meal, table].filter(Boolean).join(' · ')
        const avg   = s.avg_score.toFixed(1)
        const isLow = s.avg_score < 3

        playChime(isLow)

        if (isLow) {
          toast.warning('Low-score dining feedback', {
            description: `${parts} · ★ ${avg}/5`,
            duration:    8000,
          })
        } else {
          toast.info('New dining feedback received', {
            description: `${parts} · ★ ${avg}/5`,
            duration:    5000,
          })
        }
      }
    }

    // Run once immediately, then on every interval
    check()
    const timer = setInterval(check, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [])

  return null
}
