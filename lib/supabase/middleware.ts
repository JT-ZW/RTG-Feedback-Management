import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const INACTIVITY_MS = 15 * 60 * 1000 // 15 minutes
const LAST_ACTIVE_COOKIE = 'rtg_last_active'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { pathname } = request.nextUrl

  // Public routes — never redirect to login
  const isPublicRoute =
    pathname.startsWith('/forms/') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth/callback')

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Authenticated user on a protected route — enforce inactivity timeout
  if (user && !isPublicRoute) {
    const lastActiveStr = request.cookies.get(LAST_ACTIVE_COOKIE)?.value
    const now = Date.now()

    const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : NaN
    const isStale = isNaN(lastActive) || now - lastActive > INACTIVITY_MS

    if (isStale) {
      // Session has gone stale — sign out and force re-login
      await supabase.auth.signOut()
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('reason', 'inactivity')
      const redirectRes = NextResponse.redirect(url)
      // Copy any cookie mutations from signOut (clearing auth tokens) to the redirect response
      supabaseResponse.cookies.getAll().forEach(({ name, value, ...opts }) => {
        redirectRes.cookies.set(name, value, opts)
      })
      redirectRes.cookies.delete(LAST_ACTIVE_COOKIE)
      return redirectRes
    }

    // Refresh the sliding-window activity cookie on every valid request
    supabaseResponse.cookies.set(LAST_ACTIVE_COOKIE, String(now), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60,
      path: '/',
    })
  }

  // Redirect unauthenticated users to login (except public routes)
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from login
  if (user && pathname.startsWith('/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
