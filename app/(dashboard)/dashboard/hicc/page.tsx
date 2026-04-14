import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { Building2, Sparkles, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const ALLOWED_ROLES = [
  'super_admin', 'org_admin', 'group_ops_manager',
  'general_manager', 'department_head', 'supervisor',
]

export default async function HICCPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser.authenticated) redirect('/login')

  const { roles } = currentUser
  const hasAccess = roles.map(r => r.role_name).some(r => ALLOWED_ROLES.includes(r))
  if (!hasAccess) redirect('/dashboard')

  return (
    <div className="min-h-full flex flex-col items-center justify-center px-4 py-20">

      {/* Decorative ring backdrop */}
      <div className="relative flex items-center justify-center mb-10">
        <div className="absolute w-48 h-48 rounded-full border-2 border-rose-200 opacity-60 animate-pulse" />
        <div className="absolute w-36 h-36 rounded-full border-2 border-rose-300 opacity-40" />
        <div className="relative z-10 flex items-center justify-center w-24 h-24 rounded-full bg-rose-50 border border-rose-200 shadow-sm">
          <Building2 className="w-10 h-10 text-rose-600" />
        </div>
      </div>

      {/* Badge */}
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold tracking-wide uppercase mb-6">
        <Sparkles className="w-3.5 h-3.5" />
        In Development
      </div>

      {/* Heading */}
      <h1 className="text-3xl sm:text-4xl font-bold text-stone-900 text-center leading-tight mb-4">
        HICC Operations
        <span className="block text-rose-600 mt-1">Coming Soon.</span>
      </h1>

      {/* Description */}
      <p className="text-stone-500 text-sm sm:text-base text-center max-w-md leading-relaxed mb-10">
        The Harare International Conference Centre module is being purpose-built to handle the
        unique operational demands of large-scale conferencing — from room setup compliance to
        AV readiness and delegate experience tracking.
      </p>

      {/* Feature preview pills */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {[
          'Conference room compliance',
          'AV & setup checklists',
          'Delegate experience logs',
          'Event-day readiness scores',
        ].map((feat) => (
          <span
            key={feat}
            className="text-xs px-3 py-1.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200"
          >
            {feat}
          </span>
        ))}
      </div>

      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to dashboard
      </Link>
    </div>
  )
}
