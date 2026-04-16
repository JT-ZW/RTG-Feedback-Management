import { getCurrentUser, getPrimaryRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getDiningSurveyLiveData } from '@/app/actions/dining-survey-public'
import { DiningLiveSession } from '@/components/dining-live-session'
import Link from 'next/link'
import { ChevronLeft, Radio } from 'lucide-react'

/** Roles that can see all properties in the org */
const ORG_LEVEL_ROLES = ['super_admin', 'org_admin', 'group_ops_manager', 'general_manager']
const ALLOWED_ROLES   = [...ORG_LEVEL_ROLES, 'department_head', 'supervisor']

export default async function DiningLiveSessionPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser.authenticated) redirect('/login')

  const { profile, roles } = currentUser
  const primaryRole  = getPrimaryRole(roles)

  if (!ALLOWED_ROLES.includes(primaryRole)) redirect('/dashboard')

  const admin        = createAdminClient()
  const canSelectAll = ORG_LEVEL_ROLES.includes(primaryRole)

  // Build the list of properties this user is allowed to see
  let availableProperties: { id: string; name: string }[] = []

  if (canSelectAll) {
    const { data } = await admin
      .from('properties')
      .select('id, name')
      .eq('organization_id', profile.organization_id)
      .order('name', { ascending: true })
    availableProperties = data ?? []
  } else {
    const propertyIds = [...new Set(roles.map((r) => r.property_id))]
    if (propertyIds.length > 0) {
      const { data } = await admin
        .from('properties')
        .select('id, name')
        .in('id', propertyIds)
        .order('name', { ascending: true })
      availableProperties = data ?? []
    }
  }

  // Initial data: all accessible properties (filtered client-side thereafter)
  const defaultPropertyId = canSelectAll ? undefined : availableProperties[0]?.id
  const liveResult        = await getDiningSurveyLiveData(defaultPropertyId)
  const initialSubmissions = 'error' in liveResult ? [] : liveResult.submissions

  return (
    <div className="min-h-full">

      {/* Breadcrumb */}
      <Link
        href="/dashboard/food-and-beverage/dining-survey"
        className="inline-flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 transition-colors mb-6"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Guest Dining Survey
      </Link>

      {/* Page header */}
      <div className="mb-6 sm:mb-10 max-w-xl">
        <div className="flex items-center gap-2 mb-3">
          <p className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
            Food &amp; Beverage · Live Monitor
          </p>
          {/* Pulsing live dot */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-bold text-stone-900 leading-tight mb-3">
          Dining Feedback<br className="hidden sm:block" /> Live Session
        </h1>
        <p className="text-stone-500 text-sm leading-relaxed">
          Real-time guest dining feedback as it arrives during meal service.
          {canSelectAll && ' Select a property or view all together.'}
        </p>
      </div>

      <DiningLiveSession
        initialSubmissions={initialSubmissions}
        availableProperties={availableProperties}
        canSelectAll={canSelectAll}
        defaultPropertyId={defaultPropertyId}
      />
    </div>
  )
}
