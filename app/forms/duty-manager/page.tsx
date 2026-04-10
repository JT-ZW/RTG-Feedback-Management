import { PublicDutyManagerForm } from '@/components/public-duty-manager-form'
import { createAdminClient } from '@/lib/supabase/admin'

export const metadata = {
  title: 'Duty Manager Checklist — RTG Hotels',
  description: 'Rainbow Tourism Group Duty Manager Daily Inspection Form',
}

export default async function PublicDutyManagerPage() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('properties')
    .select('id, name')
    .order('name', { ascending: true })

  const properties = (data ?? []).map(p => ({ id: p.id, name: p.name }))

  return <PublicDutyManagerForm properties={properties} />
}
