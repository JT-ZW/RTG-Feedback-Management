// Shared constants and types for user management.
// Kept outside the 'use server' file so they can be imported by client components.

export const ADMIN_ROLES = ['super_admin', 'org_admin'] as const

export const ROLE_OPTIONS = [
  { value: 'org_admin',         label: 'System Administrator' },
  { value: 'group_ops_manager', label: 'Group Operations Director' },
] as const

export type RoleValue = typeof ROLE_OPTIONS[number]['value']

export interface OrgUser {
  id: string
  email: string
  firstName: string
  lastName: string
  isActive: boolean
  primaryRole: string
  primaryRoleLabel: string
  properties: { id: string; name: string }[]
  createdAt: string
}

export interface InviteUserInput {
  email: string
  firstName: string
  lastName: string
  role: RoleValue
  propertyIds: string[]
}

export interface UpdateUserInput {
  userId: string
  role: RoleValue
  propertyIds: string[]
}
