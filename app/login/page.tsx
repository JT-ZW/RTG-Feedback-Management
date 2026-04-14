'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

// Loaded client-side only — prevents SSR entirely, which eliminates hydration
// mismatches caused by browser extensions (e.g. Shark) injecting DOM nodes into
// input containers before React can hydrate.
const LoginForm = dynamic(
  () => import('./login-form').then((m) => m.LoginForm),
  { ssr: false }
)

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}