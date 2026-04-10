import { redirect } from 'next/navigation'
import { getCurrentUser, getPrimaryRole } from '@/lib/auth'
import { Sidebar } from '@/components/sidebar'
import { logout } from '@/app/actions/auth'
import { LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

async function getActiveProperty(organizationId: string, propertyId?: string) {
  if (!propertyId) return null
  const supabase = await createClient()
  const { data } = await supabase
    .from('properties')
    .select('id, name')
    .eq('id', propertyId)
    .eq('organization_id', organizationId)
    .single()
  return data
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const currentUser = await getCurrentUser()

  // Not authenticated — send to login (proxy won't loop since user is genuinely signed out)
  if (!currentUser.authenticated) {
    redirect('/login')
  }

  // Authenticated but no profile row in this database
  if (currentUser.noProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="max-w-md text-center px-6 py-10 bg-white rounded-2xl border border-stone-200 shadow-sm">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-amber-600 text-lg font-bold">!</span>
          </div>
          <h1 className="text-base font-semibold text-stone-900 mb-2">Profile not found</h1>
          <p className="text-sm text-stone-500 mb-6">
            Your authentication is valid but no profile record exists in this system. Contact your administrator to be set up.
          </p>
          <form action={logout}>
            <button
              type="submit"
              className="text-sm text-stone-600 underline underline-offset-2 hover:text-stone-900"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    )
  }

  const { profile, roles } = currentUser
  const primaryRole = getPrimaryRole(roles)

  // Use first available property as context for now
  const firstPropertyId = roles[0]?.property_id
  const property = firstPropertyId
    ? await getActiveProperty(profile.organization_id, firstPropertyId)
    : null

  const fullName = `${profile.first_name} ${profile.last_name}`.trim() || profile.email

  return (
    <div className="flex min-h-screen bg-[#ece8f5]">
      <Sidebar
        userName={fullName}
        propertyName={property?.name}
        roleName={primaryRole}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Top header bar */}
        <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-stone-200 shrink-0">
          <div className="flex items-center gap-3">
            {/* Thin gold accent line */}
            <div className="w-0.5 h-7 rounded-full bg-rtg-gold" />
            <p className="text-sm text-stone-500">
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </form>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
