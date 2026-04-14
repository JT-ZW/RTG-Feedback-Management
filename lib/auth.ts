import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type UserProfile = {
  id: string
  organization_id: string
  email: string
  first_name: string
  last_name: string
  is_active: boolean
}

export type UserRole = {
  property_id: string
  role_name: string
}

export const getCurrentUser = cache(async function getCurrentUser() {
  // Use the cookie-based client to verify the session
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  // Not authenticated at all — caller should redirect to /login
  if (authError || !user) return { authenticated: false as const }

  // Use the admin client to read profile + roles — bypasses RLS reliably
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('id, organization_id, email, first_name, last_name, is_active')
    .eq('id', user.id)
    .single()

  // Authenticated but no profile row in this database
  if (!profile) {
    return {
      authenticated: true as const,
      profile: {
        id: user.id,
        organization_id: '',
        email: user.email ?? '',
        first_name: '',
        last_name: '',
        is_active: true,
      } satisfies UserProfile,
      roles: [] as UserRole[],
      noProfile: true,
    }
  }

  // Account deactivated by an admin — treat as unauthenticated so every
  // downstream caller (dashboard layout, server actions) automatically blocks them.
  if (!profile.is_active) {
    return { authenticated: false as const }
  }

  // Fetch all property roles for this user
  const { data: roles } = await admin
    .from('user_property_roles')
    .select('property_id, roles(name)')
    .eq('user_id', user.id)

  const userRoles: UserRole[] =
    roles?.map((r: any) => ({
      property_id: r.property_id,
      role_name: r.roles?.name ?? '',
    })) ?? []

  return { authenticated: true as const, profile, roles: userRoles, noProfile: false }
})

/**
 * Returns the highest-privilege role across all properties.
 * Used for dashboard routing and top-level access decisions.
 */
export function getPrimaryRole(roles: UserRole[]): string {
  const hierarchy = [
    'super_admin',
    'org_admin',
    'group_ops_manager',
    'general_manager',
    'department_head',
    'supervisor',
    'property_manager',
    'front_desk',
    'housekeeping',
    'finance',
  ]
  for (const r of hierarchy) {
    if (roles.some((role) => role.role_name === r)) return r
  }
  return roles[0]?.role_name ?? 'staff'
}
