'use client'

// This thin wrapper exists solely to allow ssr: false on the form.
// next/dynamic with ssr: false must be used inside a Client Component —
// it cannot be called directly from a Server Component page.

import dynamic from 'next/dynamic'
import type { MealPeriod } from '@/lib/dining-survey'

const PublicDiningSurveyForm = dynamic(
  () => import('@/components/public-dining-survey-form').then((m) => m.PublicDiningSurveyForm),
  { ssr: false },
)

interface Props {
  propertyId:     string
  propertyName:   string
  autoMealPeriod: MealPeriod | null
}

export function DiningSurveyFormClient(props: Props) {
  return <PublicDiningSurveyForm {...props} />
}
