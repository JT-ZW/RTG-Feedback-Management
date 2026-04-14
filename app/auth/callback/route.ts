import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // Validate next param: must start with '/' and must NOT be protocol-relative ('//').
  // Prevents open-redirect attacks where an attacker crafts a link like
  // /auth/callback?code=...&next=//evil.com or ?next=https://evil.com
  const rawNext = searchParams.get('next') ?? '/dashboard'
  const next =
    rawNext.startsWith('/') && !rawNext.startsWith('//')
      ? rawNext
      : '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      const response = NextResponse.redirect(`${origin}${next}`)
      // Plant the activity marker so the proxy's inactivity guard passes on the first request
      response.cookies.set('rtg_last_active', String(Date.now()), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 15 * 60,
        path: '/',
      })
      return response
    }
  }

  // Something went wrong — send back to login with a message
  return NextResponse.redirect(`${origin}/login?error=reset_failed`)
}
