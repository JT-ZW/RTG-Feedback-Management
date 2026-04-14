'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const TIMEOUT_MS = 15 * 60 * 1000 // 15 minutes
const WARNING_MS = 2 * 60 * 1000  // warn 2 minutes before

// Events that count as "activity"
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click',
]

export function InactivityGuard() {
  const router = useRouter()
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const toastId    = useRef<string | number | null>(null)
  const lastActivityAt = useRef<number>(Date.now())

  const clearTimers = useCallback(() => {
    if (logoutTimer.current) clearTimeout(logoutTimer.current)
    if (warnTimer.current)   clearTimeout(warnTimer.current)
    if (toastId.current)     toast.dismiss(toastId.current)
    logoutTimer.current = null
    warnTimer.current   = null
    toastId.current     = null
  }, [])

  const signOut = useCallback(async () => {
    clearTimers()
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login?reason=inactivity')
  }, [clearTimers, router])

  const resetTimers = useCallback(() => {
    clearTimers()
    lastActivityAt.current = Date.now()

    // Show a warning 2 minutes before the session expires
    warnTimer.current = setTimeout(() => {
      toastId.current = toast.warning('Your session will expire in 2 minutes due to inactivity.', {
        duration: TIMEOUT_MS - WARNING_MS, // keep visible until logout
        id: 'inactivity-warning',
      })
    }, TIMEOUT_MS - WARNING_MS)

    // Sign out after full timeout
    logoutTimer.current = setTimeout(signOut, TIMEOUT_MS)
  }, [clearTimers, signOut])

  useEffect(() => {
    resetTimers()

    const handleActivity = () => resetTimers()
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, handleActivity, { passive: true }))

    // Also handle tab visibility — if the user was away longer than the timeout, sign
    // them out immediately; otherwise restart the clock from where they left off
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (Date.now() - lastActivityAt.current > TIMEOUT_MS) {
          signOut()
        } else {
          resetTimers()
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      clearTimers()
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, handleActivity))
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [resetTimers, clearTimers])

  // Renders nothing — purely behavioural
  return null
}
