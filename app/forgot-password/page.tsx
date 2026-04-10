'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.toLowerCase().trim(),
      {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      }
    )

    // Always show the "sent" screen — don't reveal whether the email exists
    if (resetError && !resetError.message.toLowerCase().includes('rate limit')) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
  }

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
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-600 mb-8 transition-colors w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to sign in
          </Link>

          {sent ? (
            /* ── Success state ── */
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-50 mb-5">
                <CheckCircle2 className="w-7 h-7 text-emerald-500" />
              </div>
              <h1 className="text-2xl font-bold text-stone-900 mb-2">Check your inbox</h1>
              <p className="text-sm text-stone-500 mb-6 leading-relaxed">
                If <span className="font-medium text-stone-700">{email}</span> is registered,
                you&apos;ll receive a password reset link shortly.
                <br />
                <span className="text-xs text-stone-400 mt-1 block">
                  Check your junk/spam folder if it doesn&apos;t appear.
                </span>
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-rtg-brown hover:underline"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Return to sign in
              </Link>
            </div>
          ) : (
            /* ── Request form ── */
            <>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-rtg-gold-soft mb-5">
                <Mail className="w-5 h-5 text-rtg-brown" />
              </div>
              <h1 className="text-2xl font-bold text-stone-900 mb-2">Reset your password</h1>
              <p className="text-sm text-stone-500 mb-8">
                Enter your work email and we&apos;ll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-stone-700 text-sm font-medium">
                    Email address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@rtg.co.zw"
                    required
                    autoComplete="email"
                    className="h-11 rounded-lg"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-lg text-sm font-semibold text-white bg-rtg-brown hover:opacity-90"
                >
                  {loading ? 'Sending…' : 'Send reset link'}
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Footer */}
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
