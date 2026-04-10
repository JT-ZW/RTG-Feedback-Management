import { getCurrentUser, getPrimaryRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  Wine,
  UtensilsCrossed,
  Sunrise,
  ArrowUpRight,
  ChevronLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FNB_MODULES = [
  {
    href: '/dashboard/bar-checklist',
    label: 'Bar Checklist',
    description: 'Shift compliance checklist for bar operations across all outlets.',
    icon: Wine,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-700',
  },
  {
    href: '/dashboard/restaurant-lunch-dinner',
    label: 'Restaurant — Lunch & Dinner',
    description: 'AM/PM shift compliance checklist for restaurant lunch and dinner service.',
    icon: UtensilsCrossed,
    iconBg: 'bg-orange-100',
    iconColor: 'text-orange-700',
  },
  {
    href: '/dashboard/restaurant-breakfast',
    label: 'Restaurant Breakfast Checklist',
    description: 'Morning buffet compliance across 11 sections including egg station and special of the day.',
    icon: Sunrise,
    iconBg: 'bg-yellow-100',
    iconColor: 'text-yellow-700',
  },
]

const ALLOWED_ROLES = [
  'super_admin', 'org_admin', 'group_ops_manager',
  'general_manager', 'department_head', 'supervisor',
]

export default async function FoodAndBeveragePage() {
  const currentUser = await getCurrentUser()
  if (!currentUser.authenticated) redirect('/login')

  const { roles } = currentUser
  const primaryRole = getPrimaryRole(roles)

  if (!ALLOWED_ROLES.includes(primaryRole)) redirect('/dashboard')

  return (
    <div className="min-h-full">

      {/* Breadcrumb */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors mb-6"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Home
      </Link>

      {/* Header */}
      <div className="mb-10 max-w-xl">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-3">
          Food &amp; Beverage
        </p>
        <h1 className="text-4xl font-bold text-stone-900 leading-tight mb-3">
          Select a checklist<br />to get started.
        </h1>
        <p className="text-stone-500 text-sm leading-relaxed">
          Choose a checklist below to submit a compliance form or view performance reports.
        </p>
      </div>

      {/* Sub-module tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl">
        {FNB_MODULES.map((mod, i) => {
          const Icon = mod.icon
          const isDark = i === 0

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
        })}
      </div>
    </div>
  )
}
