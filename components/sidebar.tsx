'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import React from 'react'
import { cn } from '@/lib/utils'
import {
  ClipboardList,
  UtensilsCrossed,
  ShieldCheck,
  UserCheck,
  Building2,
  Home,
  ChevronRight,
  BarChart2,
  Users,
} from 'lucide-react'

// activePaths: sidebar item highlights when pathname starts with any of these
const modules: {
  href: string
  label: string
  icon: React.ElementType
  exact?: boolean
  activePaths?: string[]
  adminOnly?: boolean
}[] = [
  {
    href: '/dashboard',
    label: 'Home',
    icon: Home,
    exact: true,
  },
  {
    href: '/dashboard/mystery-shopper',
    label: 'Mystery Shopper',
    icon: ShieldCheck,
  },
  {
    href: '/dashboard/food-and-beverage',
    label: 'Food & Beverage',
    icon: UtensilsCrossed,
    activePaths: [
      '/dashboard/food-and-beverage',
      '/dashboard/bar-checklist',
      '/dashboard/restaurant-lunch-dinner',
      '/dashboard/restaurant-breakfast',
    ],
  },
  {
    href: '/dashboard/duty-manager',
    label: 'Duty Manager',
    icon: ClipboardList,
  },
  {
    href: '/dashboard/analytics',
    label: 'Analytics & Reports',
    icon: BarChart2,
  },
  {
    href: '/dashboard/guest-checkin',
    label: 'Guest Check-In',
    icon: UserCheck,
  },
  {
    href: '/dashboard/hicc',
    label: 'HICC',
    icon: Building2,
  },
  {
    href: '/dashboard/users',
    label: 'User Management',
    icon: Users,
    adminOnly: true,
  },
]

interface SidebarProps {
  userName: string
  propertyName?: string
  roleName?: string
}

export function Sidebar({ userName, propertyName, roleName }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-rtg-brown text-stone-100 shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-rtg-gold">
        <Image
          src="/rtg-logo.png"
          alt="Rainbow Tourism Group"
          width={110}
          height={44}
          style={{ width: 110, height: 'auto' }}
          className="object-contain brightness-0 invert"
          priority
        />
        <p className="text-[10px] mt-2 font-medium tracking-widest uppercase text-rtg-gold">
          Operations Intelligence
        </p>
      </div>

      {/* Property context */}
      {propertyName && (
        <div className="px-5 py-3 border-b border-rtg-gold bg-rtg-gold-muted">
          <p className="text-[10px] uppercase tracking-widest mb-0.5 text-rtg-gold-dim">Property</p>
          <p className="text-sm text-stone-200 font-medium truncate">{propertyName}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {modules.filter(mod => !mod.adminOnly || roleName === 'org_admin' || roleName === 'super_admin').map((mod) => {
          const isActive = mod.exact
            ? pathname === mod.href
            : mod.activePaths
              ? mod.activePaths.some(p => pathname.startsWith(p))
              : pathname.startsWith(mod.href)
          const Icon = mod.icon

          return (
            <Link
              key={mod.href}
              href={mod.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-rtg-gold text-stone-900'
                  : 'text-stone-400 hover:text-stone-100 hover:bg-rtg-gold-soft'
              )}
            >
              <Icon
                className={cn(
                  'w-4 h-4 shrink-0',
                  isActive ? 'text-stone-900' : 'text-stone-500 group-hover:text-stone-300'
                )}
              />
              <span className="flex-1">{mod.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-stone-700" />}
            </Link>
          )
        })}
      </nav>

      {/* User info */}
      <div className="px-5 py-4 border-t border-rtg-gold">
        <p className="text-sm font-medium text-stone-200 truncate">{userName}</p>
        {roleName && (
          <p className="text-xs capitalize mt-0.5 text-rtg-gold-faint">
            {roleName.replace(/_/g, ' ')}
          </p>
        )}
      </div>
    </aside>
  )
}
