import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { detectMealPeriod } from '@/lib/dining-survey'
import { DiningSurveyFormClient } from '@/components/public-dining-survey-form-client'

interface Props {
  params: Promise<{ propertySlug: string }>
}

export async function generateMetadata({ params }: Props) {
  const { propertySlug } = await params
  const admin = createAdminClient()
  const { data } = await admin
    .from('properties')
    .select('name')
    .eq('code', propertySlug.toUpperCase())
    .single()

  return {
    title: data?.name
      ? `Dining Feedback — ${data.name}`
      : 'Dining Feedback — RTG Hotels',
    description: 'Share your dining experience with us. It takes less than a minute.',
  }
}

export default async function DiningSurveyPage({ params }: Props) {
  const { propertySlug } = await params

  // Resolve property by code — slugs are lowercase in the URL, codes are stored uppercase
  const admin = createAdminClient()
  const { data: property, error } = await admin
    .from('properties')
    .select('id, name, code')
    .eq('code', propertySlug.toUpperCase())
    .single()

  if (error || !property) notFound()

  // Detect meal period server-side (CAT / UTC+2)
  const autoMealPeriod = detectMealPeriod(new Date())

  return (
    <DiningSurveyFormClient
      propertyId={property.id}
      propertyName={property.name}
      autoMealPeriod={autoMealPeriod}
    />
  )
}
