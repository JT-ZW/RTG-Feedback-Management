'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser, getPrimaryRole } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

// Roles permitted to write HOD review comments
const HOD_COMMENT_ROLES = [
  'super_admin',
  'org_admin',
  'group_ops_manager',
  'general_manager',
  'property_manager',
  'department_head',
  'supervisor',
]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface UpdateHodCommentsResult {
  success: boolean
  error?: string
}

export async function updateHodComments(
  submissionId: string,
  hodComments: string
): Promise<UpdateHodCommentsResult> {
  if (!submissionId || !UUID_RE.test(submissionId)) {
    return { success: false, error: 'Invalid submission.' }
  }

  // Verify the caller is authenticated and has a role that allows HOD reviews
  const currentUser = await getCurrentUser()
  if (!currentUser.authenticated) return { success: false, error: 'Not authenticated.' }

  const primaryRole = getPrimaryRole(currentUser.roles)
  if (!HOD_COMMENT_ROLES.includes(primaryRole)) {
    return { success: false, error: 'Insufficient permissions to add HOD comments.' }
  }

  if (hodComments.length > 10_000) {
    return { success: false, error: 'Comments exceed the 10,000 character limit.' }
  }

  const admin = createAdminClient()

  // Verify the submission belongs to the caller's organisation before mutating
  const { data: submission } = await admin
    .from('duty_manager_submissions')
    .select('id, organization_id')
    .eq('id', submissionId)
    .eq('organization_id', currentUser.profile.organization_id)
    .single()

  if (!submission) {
    return { success: false, error: 'Submission not found.' }
  }

  const { error } = await admin
    .from('duty_manager_submissions')
    .update({
      hod_comments: hodComments.trim() || null,
      status: hodComments.trim() ? 'reviewed' : 'submitted',
    })
    .eq('id', submissionId)

  if (error) {
    console.error('HOD comments update error:', error.message)
    return { success: false, error: 'Failed to save comments. Please try again.' }
  }

  revalidatePath(`/dashboard/duty-manager/${submissionId}`)
  revalidatePath('/dashboard/duty-manager')
  return { success: true }
}
