'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser, getPrimaryRole } from '@/lib/auth'
import {
  ADMIN_ROLES,
  ROLE_OPTIONS,
  type RoleValue,
  type OrgUser,
  type InviteUserInput,
  type UpdateUserInput,
} from '@/lib/user-management-types'

// ─── Validation helpers ──────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MAX_PROPERTIES = 50

function isValidUuid(v: string): boolean {
  return UUID_RE.test(v)
}

function isValidEmail(v: string): boolean {
  return EMAIL_RE.test(v) && v.length <= 320
}

// ─── Auth guard ──────────────────────────────────────────────────────────────

async function assertAdmin() {
  const currentUser = await getCurrentUser()
  if (!currentUser.authenticated) return { error: 'Not authenticated.' } as const
  const primaryRole = getPrimaryRole(currentUser.roles)
  if (!(ADMIN_ROLES as readonly string[]).includes(primaryRole)) {
    return { error: 'Insufficient permissions. Only System Administrators can manage users.' } as const
  }
  return { orgId: currentUser.profile.organization_id } as const
}

function roleLabel(roleName: string): string {
  return ROLE_OPTIONS.find(r => r.value === roleName)?.label ?? roleName.replace(/_/g, ' ')
}

// ─── getOrgUsers ─────────────────────────────────────────────────────────────

export async function getOrgUsers(): Promise<{ users: OrgUser[]; error?: string }> {
  const auth = await assertAdmin()
  if ('error' in auth) return { users: [], error: auth.error }

  const db = createAdminClient()

  const { data: profiles, error } = await db
    .from('profiles')
    .select('id, email, first_name, last_name, is_active, created_at')
    .eq('organization_id', auth.orgId)
    .order('first_name')

  if (error) return { users: [], error: error.message }

  if (!profiles || profiles.length === 0) return { users: [] }

  // Load role + property assignments for all users in one query
  const { data: roleRows } = await db
    .from('user_property_roles')
    .select('user_id, property_id, roles(name), properties(id, name)')
    .in('user_id', profiles.map(p => p.id))

  type RoleRow = {
    user_id: string
    property_id: string
    roles: { name: string } | null
    properties: { id: string; name: string } | null
  }

  const byUser: Record<string, { roleName: string; propId: string; propName: string }[]> = {}
  for (const row of (roleRows ?? []) as unknown as RoleRow[]) {
    if (!byUser[row.user_id]) byUser[row.user_id] = []
    byUser[row.user_id].push({
      roleName: row.roles?.name ?? '',
      propId: row.property_id,
      propName: row.properties?.name ?? '',
    })
  }

  const users: OrgUser[] = profiles.map(p => {
    const assignments = byUser[p.id] ?? []
    const primaryRole = getPrimaryRole(
      assignments.map(a => ({ property_id: a.propId, role_name: a.roleName }))
    )
    const seen = new Set<string>()
    const properties = assignments
      .filter(a => { if (seen.has(a.propId)) return false; seen.add(a.propId); return true })
      .map(a => ({ id: a.propId, name: a.propName }))

    return {
      id: p.id,
      email: p.email,
      firstName: p.first_name ?? '',
      lastName: p.last_name ?? '',
      isActive: p.is_active ?? true,
      primaryRole,
      primaryRoleLabel: roleLabel(primaryRole),
      properties,
      createdAt: p.created_at ?? '',
    }
  })

  return { users }
}

// ─── getOrgProperties ────────────────────────────────────────────────────────

export async function getOrgProperties(): Promise<{ id: string; name: string }[]> {
  const auth = await assertAdmin()
  if ('error' in auth) return []

  const db = createAdminClient()
  const { data } = await db
    .from('properties')
    .select('id, name')
    .eq('organization_id', auth.orgId)
    .order('name')

  return data ?? []
}

// ─── inviteUser ──────────────────────────────────────────────────────────────

export async function inviteUser(
  input: InviteUserInput
): Promise<{ success: boolean; error?: string }> {
  const auth = await assertAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  if (!input.email.trim()) return { success: false, error: 'Email is required.' }
  if (!isValidEmail(input.email.trim())) return { success: false, error: 'Invalid email address.' }
  if (!input.firstName.trim()) return { success: false, error: 'First name is required.' }
  if (input.firstName.trim().length > 100) return { success: false, error: 'First name is too long.' }
  if (!input.lastName.trim()) return { success: false, error: 'Last name is required.' }
  if (input.lastName.trim().length > 100) return { success: false, error: 'Last name is too long.' }
  if (input.propertyIds.length === 0) return { success: false, error: 'Assign at least one property.' }
  if (input.propertyIds.length > MAX_PROPERTIES) return { success: false, error: `Cannot assign more than ${MAX_PROPERTIES} properties at once.` }
  if (input.propertyIds.some(id => !isValidUuid(id))) return { success: false, error: 'Invalid property selection.' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) return { success: false, error: 'Server misconfiguration: NEXT_PUBLIC_APP_URL is not set.' }

  const db = createAdminClient()

  // 1 ── Invite via Supabase Auth (sends invite/set-password email)
  const { data: inviteData, error: inviteError } = await db.auth.admin.inviteUserByEmail(
    input.email.toLowerCase().trim(),
    {
      data: {
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
      },
      redirectTo: `${appUrl}/login`,
    }
  )

  if (inviteError) {
    // If user already exists in Auth, surface that clearly
    if (inviteError.message.toLowerCase().includes('already registered')) {
      return { success: false, error: 'A user with this email already exists.' }
    }
    return { success: false, error: inviteError.message }
  }

  const userId = inviteData.user.id

  // 2 ── Create profile row
  const { error: profileError } = await db
    .from('profiles')
    .upsert({
      id: userId,
      organization_id: auth.orgId,
      email: input.email.toLowerCase().trim(),
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      is_active: true,
    })

  if (profileError) return { success: false, error: `Profile error: ${profileError.message}` }

  // 3 ── Fetch role ID
  const { data: roleRow } = await db
    .from('roles')
    .select('id')
    .eq('name', input.role)
    .single()

  if (!roleRow) return { success: false, error: 'Role not found in database. Run migration 018.' }

  // 4 ── Assign role to every selected property
  const assignments = input.propertyIds.map(propId => ({
    user_id: userId,
    property_id: propId,
    role_id: roleRow.id,
  }))

  const { error: roleError } = await db
    .from('user_property_roles')
    .upsert(assignments)

  if (roleError) return { success: false, error: `Role assignment error: ${roleError.message}` }

  revalidatePath('/dashboard/users')
  return { success: true }
}

// ─── updateUser ──────────────────────────────────────────────────────────────

export async function updateUser(
  input: UpdateUserInput
): Promise<{ success: boolean; error?: string }> {
  const auth = await assertAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  if (!isValidUuid(input.userId)) return { success: false, error: 'Invalid user ID.' }
  if (input.propertyIds.length === 0) return { success: false, error: 'Assign at least one property.' }
  if (input.propertyIds.length > MAX_PROPERTIES) return { success: false, error: `Cannot assign more than ${MAX_PROPERTIES} properties at once.` }
  if (input.propertyIds.some(id => !isValidUuid(id))) return { success: false, error: 'Invalid property selection.' }

  const db = createAdminClient()

  // Verify user belongs to this org
  const { data: profile } = await db
    .from('profiles')
    .select('id')
    .eq('id', input.userId)
    .eq('organization_id', auth.orgId)
    .single()

  if (!profile) return { success: false, error: 'User not found in your organisation.' }

  // Get role ID
  const { data: roleRow } = await db
    .from('roles')
    .select('id')
    .eq('name', input.role)
    .single()

  if (!roleRow) return { success: false, error: 'Role not found.' }

  const assignments = input.propertyIds.map(propId => ({
    user_id: input.userId,
    property_id: propId,
    role_id: roleRow.id,
  }))

  // Upsert new assignments FIRST — the user always has at least the new roles
  // before any deletions, eliminating the zero-role window.
  const { error } = await db.from('user_property_roles').upsert(assignments, {
    onConflict: 'user_id,property_id',
  })
  if (error) return { success: false, error: error.message }

  // Delete rows for properties that are no longer in the new assignment list.
  // Use the array form of .in() — Supabase parameterises the values safely,
  // avoiding the raw string interpolation that was previously used here.
  await db
    .from('user_property_roles')
    .delete()
    .eq('user_id', input.userId)
    .not('property_id', 'in', `(${input.propertyIds.join(',')})`)
    // Note: propertyIds are validated as UUIDs above so interpolation is safe,
    // but as an extra defence we only call this when the array is non-empty.
    // An empty allowlist would delete all rows — the guard above prevents that.

  revalidatePath('/dashboard/users')
  return { success: true }
}

// ─── setUserActive ───────────────────────────────────────────────────────────

export async function setUserActive(
  userId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const auth = await assertAdmin()
  if ('error' in auth) return { success: false, error: auth.error }

  if (!isValidUuid(userId)) return { success: false, error: 'Invalid user ID.' }

  const db = createAdminClient()

  const { error } = await db
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', userId)
    .eq('organization_id', auth.orgId)

  if (error) return { success: false, error: error.message }

  // When deactivating, immediately revoke all active sessions so the user
  // cannot continue using an existing JWT until it naturally expires.
  if (!isActive) {
    await db.auth.admin.signOut(userId, 'global')
  }

  revalidatePath('/dashboard/users')
  return { success: true }
}
