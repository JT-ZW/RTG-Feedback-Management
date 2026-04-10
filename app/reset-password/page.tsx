'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import { Eye, EyeOff, CheckCircle2, ShieldCheck } from 'lucide-react'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)

    // Redirect to the dashboard after a short pause
    setTimeout(() => router.push('/dashboard'), 2500)
  }

  // Strength indicator
  const strength = (() => {
    if (!password) return 0
    let score = 0
    if (password.length >= 8) score++
    if (password.length >= 12) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  })()

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'][strength] ?? ''
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-500'][strength] ?? ''

  return (
    <div className="min-h-screen flex">

      {/* ── Left: Form ── */}
      <div className="flex flex-col w-full lg:w-1/2 px-8 py-10 bg-white">
        {/* Logo */}
        <div className="mb-10">
          <Image
            src="/rtg-logo.png"
            alt="Rainbow Tourism Group"
            width={120}
            height={48}
            style={{ width: 120, height: 'auto' }}
            className="object-contain"
            priority
          />
        </div>

        <div className="flex-1 flex flex-col justify-center max-w-sm w-full mx-auto">
          {done ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 mb-5">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold text-stone-900 mb-2">Password updated!</h1>
              <p className="text-sm text-stone-500">Redirecting you to your dashboard…</p>
            </div>
          ) : (
            /* ── Reset form ── */
            <>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rtg-gold-soft mb-5">
                <ShieldCheck className="w-5 h-5 text-rtg-brown" />
              </div>
              <h1 className="text-2xl font-bold text-stone-900 mb-2">Set a new password</h1>
              <p className="text-sm text-stone-500 mb-8">
                Choose a strong password for your account.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New password */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-stone-700 text-sm font-medium">
                    New password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      autoComplete="new-password"
                      className="h-11 rounded-lg pr-10"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-stone-400 hover:text-stone-600"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {password && (
                    <div className="space-y-1 pt-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map(i => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : 'bg-stone-100'}`}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] text-stone-400">{strengthLabel}</p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div className="space-y-1.5">
                  <Label htmlFor="confirm" className="text-stone-700 text-sm font-medium">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Re-enter your password"
                      required
                      autoComplete="new-password"
                      className="h-11 rounded-lg pr-10"
                    />
                    <button
                      type="button"
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                      onClick={() => setShowConfirm(v => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-stone-400 hover:text-stone-600"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirm && password !== confirm && (
                    <p className="text-[11px] text-red-500">Passwords don&apos;t match</p>
                  )}
                  {confirm && password === confirm && password.length >= 8 && (
                    <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passwords match
                    </p>
                  )}
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={loading || password !== confirm || password.length < 8}
                  className="w-full h-11 rounded-lg text-sm font-semibold text-white bg-rtg-brown hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Updating…' : 'Update password'}
                </Button>
              </form>
            </>
          )}
        </div>

        <div className="mt-8 text-xs text-stone-400">
          <span>© {new Date().getFullYear()} Rainbow Tourism Group Ltd Digital Transformation</span>
        </div>
      </div>

      {/* ── Right: Brand panel ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden bg-rtg-brown">
        <div className="absolute -bottom-32 -right-32 w-125 h-125 rounded-full opacity-10 border-40 border-rtg-gold" />
        <div className="absolute -bottom-16 -right-16 w-85 h-85 rounded-full opacity-15 border-30 border-rtg-gold" />
        <div className="absolute -top-15 -left-15 w-65 h-65 rounded-full opacity-10 border-24 border-rtg-gold" />

        <div className="relative z-10">
          <Image
            src="/rtg-logo.png"
            alt="RTG"
            width={80}
            height={32}
            style={{ width: 80, height: 'auto' }}
            className="object-contain brightness-0 invert opacity-80"
          />
        </div>

        <div className="relative z-10">
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Elevating hospitality<br />through data.
          </h2>
          <p className="text-stone-400 text-sm leading-relaxed max-w-xs">
            Real-time compliance tracking and operational intelligence
            across all Rainbow Tourism Group properties.
          </p>
          <div className="flex gap-4 mt-8">
            {[['7', 'Properties'], ['5+', 'Checklists'], ['150+', 'Daily items tracked']].map(([n, l]) => (
              <div key={l} className="bg-rtg-gold-soft rounded-xl px-4 py-3 min-w-20">
                <p className="text-xl font-bold text-white">{n}</p>
                <p className="text-xs text-stone-400 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-stone-500">
          Rainbow Tourism Group · Operations Intelligence Platform
        </p>
      </div>

    </div>
  )
}
