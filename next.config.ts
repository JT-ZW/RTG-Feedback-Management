import type { NextConfig } from "next";

const SUPABASE_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : '*.supabase.co'

const isProd = process.env.NODE_ENV === 'production'

const securityHeaders = [
  // Prevent the site being framed by another origin (clickjacking)
  { key: 'X-Frame-Options',        value: 'DENY' },
  // Prevent MIME-type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Limit referrer information in cross-origin requests
  { key: 'Referrer-Policy',        value: 'strict-origin-when-cross-origin' },
  // Restrict browser features not used by this app
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  // Force HTTPS for 1 year in production (never in dev so localhost still works)
  ...(isProd
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
    : []),
  // Content-Security-Policy
  // Next.js injects inline scripts and styles at runtime so unsafe-inline is
  // required until nonce-based CSP is implemented. Keep it restrictive elsewhere.
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // Next.js runtime, Turbopack HMR in dev, plus inline event handlers from shadcn
      `script-src 'self' 'unsafe-eval' 'unsafe-inline'`,
      // Tailwind + shadcn generate inline styles
      `style-src 'self' 'unsafe-inline'`,
      // Allow data URIs for QR codes / canvas; blob: for potential file previews
      `img-src 'self' data: blob:`,
      "font-src 'self'",
      // Supabase API calls and WebSocket realtime
      `connect-src 'self' https://${SUPABASE_HOST} wss://${SUPABASE_HOST} https://api.groq.com`,
      // No plugin objects
      "object-src 'none'",
      // Prevent base-tag hijacking
      "base-uri 'self'",
      // Only submit forms to same origin
      "form-action 'self'",
      // No embedding of external resources
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
};

export default nextConfig;
