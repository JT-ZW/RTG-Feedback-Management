'use client'

import { useState } from 'react'
import { Menu } from 'lucide-react'
import { Sidebar } from '@/components/sidebar'
import { InactivityGuard } from '@/components/inactivity-guard'

interface DashboardShellProps {
  children: React.ReactNode
  /** Server-rendered logout button/form passed as a node */
  logoutNode: React.ReactNode
  userName: string
  propertyName?: string
  roleName?: string
}

export function DashboardShell({
  children,
  logoutNode,
  userName,
  propertyName,
  roleName,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-[#ece8f5]">
      <Sidebar
        userName={userName}
        propertyName={propertyName}
        roleName={roleName}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <div className="flex flex-col flex-1 min-w-0">
        {/* Top header bar */}
        <header className="flex items-center justify-between px-4 lg:px-6 py-3 bg-white border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-3">
            {/* Hamburger - mobile/tablet only */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            {/* Thin gold accent line */}
            <div className="w-0.5 h-7 rounded-full bg-rtg-gold hidden sm:block" />
            <p className="text-xs sm:text-sm text-stone-500">
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          {logoutNode}
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>

      <InactivityGuard />
    </div>
  )
}
