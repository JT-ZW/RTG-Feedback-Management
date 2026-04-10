import { getOrgUsers, getOrgProperties } from '@/app/actions/user-management'
import { UsersPageClient } from '@/components/users-page-client'
import { getCurrentUser, getPrimaryRole } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function UsersPage() {
  const currentUser = await getCurrentUser()
  if (!currentUser.authenticated) redirect('/login')

  const primaryRole = getPrimaryRole(currentUser.roles)
  if (!['super_admin', 'org_admin'].includes(primaryRole)) redirect('/dashboard')

  const [{ users, error }, properties] = await Promise.all([
    getOrgUsers(),
    getOrgProperties(),
  ])

  return (
    <UsersPageClient
      initialUsers={users}
      properties={properties}
      error={error}
    />
  )
}
