import { PublicBarChecklistForm } from '@/components/public-bar-checklist-form'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = {
  title: 'Bar Checklist — RTG Hotels',
  description: 'Rainbow Tourism Group Bar Operations Shift Compliance Checklist',
}

export default async function PublicBarChecklistPage() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('properties')
    .select('id, name')
    .order('name', { ascending: true })

  const properties = (data ?? []).map(p => ({ id: p.id, name: p.name }))

  return <PublicBarChecklistForm properties={properties} />
}
