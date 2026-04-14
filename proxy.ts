import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// ─── IP-based sliding-window rate limiter ────────────────────────────────────
//
// Protects public form routes from automated bulk submissions and the login
// route from brute-force credential stuffing.
//
// State is held in a module-level Map, which persists for the lifetime of
// the Node.js process. For multi-instance / serverless deployments (e.g.
// Vercel Edge), replace the Map with a Redis-backed store such as
// @upstash/ratelimit — the isRateLimited signature stays the same.

const _log = new Map<string, number[]>()

const RULES: { test: (p: string) => boolean; max: number; windowMs: number }[] = [
  // Public form submissions — 15 POSTs per minute per IP
  { test: (p) => p.startsWith('/forms/'), max: 15, windowMs: 60_000 },
  // Login — 8 attempts per 15 minutes per IP (brute-force protection)
  { test: (p) => p === '/login',          max: 8,  windowMs: 15 * 60_000 },
]

function isRateLimited(ip: string, pathname: string): boolean {
  const rule = RULES.find((r) => r.test(pathname))
  if (!rule) return false

  // Use a coarse bucket key so all sub-paths of /forms/* share one counter per IP
  const bucket = ip + ':' + pathname.split('/').slice(0, 2).join('/')
  const now = Date.now()
  const cutoff = now - rule.windowMs

  const timestamps = (_log.get(bucket) ?? []).filter((t) => t > cutoff)
  timestamps.push(now)
  _log.set(bucket, timestamps)

  return timestamps.length > rule.max
}

// Prevent unbounded Map growth — prune expired entries periodically
let _pruneCounter = 0
function maybePrune() {
  if (++_pruneCounter < 500) return
  _pruneCounter = 0
  const cutoff = Date.now() - 15 * 60_000
  for (const [key, timestamps] of _log) {
    const fresh = timestamps.filter((t) => t > cutoff)
    if (fresh.length === 0) _log.delete(key)
    else _log.set(key, fresh)
  }
}

// ─── Proxy entry point ───────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  // Only POST requests carry form submissions / login attempts worth limiting.
  // GET requests (page loads) are intentionally excluded from rate limiting.
  if (request.method === 'POST') {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      'unknown'

    maybePrune()

    if (isRateLimited(ip, request.nextUrl.pathname)) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please wait before trying again.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      )
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
