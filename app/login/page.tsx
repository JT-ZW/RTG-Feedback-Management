'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'reset_failed'
      ? 'The password reset link has expired or is invalid. Please request a new one.'
      : null
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Invalid email or password. Please try again.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex flex-col w-full lg:w-1/2 px-8 py-10 bg-white">
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
          <h1 className="text-3xl font-bold text-stone-900 mb-2">Welcome back.</h1>
          <p className="text-sm text-stone-500 mb-8">
            Sign in to access the RTG Operations Intelligence Platform.
          </p>
          <form onSubmit={handleSubmit} className="space-y-5" suppressHydrationWarning>
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
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-stone-700 text-sm font-medium">
                  Password
                </Label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-rtg-gold hover:text-rtg-brown transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="h-11 rounded-lg pr-10"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-stone-400 hover:text-stone-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </div>
        <div className="mt-8 text-xs text-stone-400">
          <span>© {new Date().getFullYear()} Rainbow Tourism Group Ltd Digital Transformation</span>
        </div>
      </div>
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
          <p className="text-sm leading-relaxed text-rtg-gold">
            Real-time compliance tracking and operational intelligence<br />
            across all Rainbow Tourism Group properties.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            {[
              { label: 'Properties', value: '7' },
              { label: 'Checklists', value: '5+' },
              { label: 'Daily items tracked', value: '150+' },
            ].map((stat) => (
              <div key={stat.label} className="px-4 py-2.5 rounded-xl bg-rtg-gold-soft border border-rtg-gold">
                <p className="text-lg font-bold text-white">{stat.value}</p>
                <p className="text-xs text-rtg-gold">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10">
          <p className="text-xs text-rtg-gold-dim">
            Rainbow Tourism Group · Operations Intelligence Platform
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}