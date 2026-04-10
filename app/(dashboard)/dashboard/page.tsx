import { getCurrentUser, getPrimaryRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ShieldCheck,
  UtensilsCrossed,
  ClipboardList,
  UserCheck,
  Building2,
  ArrowUpRight,
  BarChart2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ALL_MODULES = [
  {
    href: '/dashboard/mystery-shopper',
    label: 'Mystery Shopper Checklist',
    description: 'Full-property guest experience audit scored across 9 touchpoints.',
    icon: ShieldCheck,
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-700',
    roles: ['super_admin', 'org_admin', 'group_ops_manager', 'general_manager', 'property_manager', 'supervisor'],
    status: 'active' as const,
  },
  {
    href: '/dashboard/food-and-beverage',
    label: 'Food & Beverage',
    description: 'Bar, restaurant lunch & dinner, and morning breakfast compliance checklists.',
    icon: UtensilsCrossed,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-700',
    roles: ['super_admin', 'org_admin', 'group_ops_manager', 'general_manager', 'department_head', 'supervisor'],
    status: 'active' as const,
  },
  {
    href: '/dashboard/duty-manager',
    label: 'Duty Manager Checklist',
    description: 'Shift handover log covering the whole property.',
    icon: ClipboardList,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-700',
    roles: ['super_admin', 'org_admin', 'group_ops_manager', 'general_manager', 'property_manager', 'supervisor'],
    status: 'active' as const,
  },
  {
    href: '/dashboard/guest-checkin',
    label: 'Guest Check-In Feedback',
    description: 'Post check-in sentiment and experience capture.',
    icon: UserCheck,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-700',
    roles: ['super_admin', 'org_admin', 'group_ops_manager', 'general_manager', 'department_head', 'supervisor', 'front_desk'],
    status: 'coming_soon' as const,
  },
  {
    href: '/dashboard/hicc',
    label: 'HICC',
    description: 'Harare International Conference Centre operational checklist.',
    icon: Building2,
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-700',
    roles: ['super_admin', 'org_admin', 'group_ops_manager', 'general_manager', 'department_head', 'supervisor'],
    status: 'coming_soon' as const,
  },
]

// Roles that can see analytics / cross-property data
const ANALYTICS_ROLES = ['super_admin', 'org_admin', 'group_ops_manager', 'general_manager']

export default async function DashboardPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser.authenticated) redirect('/login')

  const { profile, roles } = currentUser
  const primaryRole = getPrimaryRole(roles)
  const firstName = profile.first_name || 'there'

  const visibleModules = ALL_MODULES.filter((m) => m.roles.includes(primaryRole))
  const canViewAnalytics = ANALYTICS_ROLES.includes(primaryRole)

  // First active module gets the featured dark card
  const featuredHref = visibleModules.find(m => m.status === 'active')?.href

  return (
    <div className="min-h-full">

      {/* Hero */}
      <div className="mb-10 max-w-2xl">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
          Good {getTimeOfDay()}, {firstName}
        </p>
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-stone-900 leading-tight mb-3">
          Your Operations<br />Intelligence Platform.
        </h1>
        <p className="text-stone-500 text-sm leading-relaxed">
          Select a module below to submit a checklist or view performance reports across your properties.
        </p>
      </div>

      {/* Module tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
        {visibleModules.map((mod) => {
          const Icon = mod.icon
          const isActive = mod.status === 'active'
          const isDark = mod.href === featuredHref

          if (isActive) {
            return (
              <Link key={mod.href} href={mod.href} className="group block">
                <div className={cn(
                  'relative rounded-2xl p-6 h-52 flex flex-col justify-between overflow-hidden transition-all duration-200 group-hover:scale-[1.02]',
                  isDark
                    ? 'bg-stone-900 shadow-lg'
                    : 'bg-white border border-stone-200 hover:shadow-md'
                )}>
                  {/* Top: title + arrow */}
                  <div className="flex items-start justify-between gap-2">
                    <h2 className={cn(
                      'text-lg font-bold leading-snug',
                      isDark ? 'text-white' : 'text-stone-900'
                    )}>
                      {mod.label}
                    </h2>
                    <ArrowUpRight className={cn(
                      'w-4 h-4 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity',
                      isDark ? 'text-stone-300' : 'text-stone-500'
                    )} />
                  </div>

                  {/* Bottom: description + icon */}
                  <div className="flex items-end justify-between gap-3">
                    <p className={cn(
                      'text-xs leading-relaxed',
                      isDark ? 'text-stone-400' : 'text-stone-500'
                    )}>
                      {mod.description}
                    </p>
                    <div className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                      isDark ? 'bg-stone-800' : mod.iconBg
                    )}>
                      <Icon className={cn('w-6 h-6', isDark ? 'text-stone-300' : mod.iconColor)} />
                    </div>
                  </div>
                </div>
              </Link>
            )
          }

          // Coming soon
          return (
            <div key={mod.href} className="relative rounded-2xl p-6 h-52 flex flex-col justify-between bg-white border border-stone-200 opacity-50 cursor-not-allowed">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold leading-snug text-stone-900">{mod.label}</h2>
                <span className="text-[10px] font-semibold bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full mt-0.5 shrink-0 whitespace-nowrap">
                  Coming soon
                </span>
              </div>
              <div className="flex items-end justify-between gap-3">
                <p className="text-xs text-stone-500 leading-relaxed">{mod.description}</p>
                <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', mod.iconBg)}>
                  <Icon className={cn('w-6 h-6', mod.iconColor)} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Analytics tile — managers only */}
      {canViewAnalytics && (
        <div className="mt-6 max-w-5xl">
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-widest mb-3">Intelligence</p>
          <Link href="/dashboard/analytics" className="group block max-w-sm">
            <div className="relative rounded-2xl p-6 h-52 flex flex-col justify-between overflow-hidden bg-rtg-brown shadow-lg transition-all duration-200 group-hover:scale-[1.02]">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-bold leading-snug text-white">Analytics &amp; Reports</h2>
                <ArrowUpRight className="w-4 h-4 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-rtg-gold" />
              </div>
              <div className="flex items-end justify-between gap-3">
                <p className="text-xs leading-relaxed text-stone-400">
                  AI-powered thematic analysis, cross-property compliance matrix, and worst-item rankings.
                </p>
                <div className="w-12 h-12 rounded-xl bg-rtg-gold-soft border border-rtg-gold flex items-center justify-center shrink-0">
                  <BarChart2 className="w-6 h-6 text-rtg-gold" />
                </div>
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  )
}

function getTimeOfDay() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
