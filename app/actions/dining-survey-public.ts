'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import {
  detectMealPeriod,
  allRatingsComplete,
  type MealPeriod,
  type DiningSurveyRatings,
} from '@/lib/dining-survey'

// ── Input / output types ───────────────────────────────────────────────────

export interface DiningSurveyInput {
  propertyId:   string
  /** Client-supplied meal period — only used when server auto-detection
   *  returns null (gap / off-hours). Must still be validated server-side. */
  mealPeriod:   MealPeriod | null
  tableNumber:  string
  ratings:      DiningSurveyRatings
  comments:     string
  guestName:    string
  guestEmail:   string
  guestPhone:   string
}

export interface DiningSurveyResult {
  success: boolean
  error?:  string
}

// ── Validation helpers ─────────────────────────────────────────────────────

const UUID_RE    = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE   = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_RE   = /^\+?[\d\s\-().]{7,20}$/
const MEAL_PERIODS: MealPeriod[] = ['breakfast', 'lunch', 'dinner']

// ── Server action ──────────────────────────────────────────────────────────

export async function submitDiningSurvey(
  input: DiningSurveyInput
): Promise<DiningSurveyResult> {
  // ── Property ID
  if (!input.propertyId || !UUID_RE.test(input.propertyId)) {
    return { success: false, error: 'Invalid property.' }
  }

  // ── Ratings — all 7 must be present and 1-5
  if (!allRatingsComplete(input.ratings)) {
    return { success: false, error: 'Please rate all questions before submitting.' }
  }
  for (const val of Object.values(input.ratings)) {
    if (typeof val !== 'number' || !Number.isInteger(val) || val < 1 || val > 5) {
      return { success: false, error: 'Each question must be rated between 1 and 5.' }
    }
  }

  // ── Meal period — detect server-side first; fall back to client value
  const autoDetected = detectMealPeriod(new Date())
  let mealPeriodAuto = false
  let mealPeriod: MealPeriod

  if (autoDetected) {
    mealPeriod     = autoDetected
    mealPeriodAuto = true
  } else {
    // Guest supplied the value from the manual selector
    if (!input.mealPeriod || !MEAL_PERIODS.includes(input.mealPeriod)) {
      return { success: false, error: 'Please select a meal period.' }
    }
    mealPeriod = input.mealPeriod
  }

  // ── Optional text field lengths
  if (input.tableNumber.length  > 20)  return { success: false, error: 'Table number is too long.'     }
  if (input.comments.length     > 2000) return { success: false, error: 'Comments are too long.'        }
  if (input.guestName.length    > 200)  return { success: false, error: 'Name is too long.'             }
  if (input.guestPhone.length   > 0 && !PHONE_RE.test(input.guestPhone)) {
    return { success: false, error: 'Please enter a valid phone number.' }
  }
  if (input.guestEmail.length   > 0 && !EMAIL_RE.test(input.guestEmail)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }
  if (input.guestEmail.length   > 320) return { success: false, error: 'Email address is too long.'    }

  // ── Resolve property → organisation_id
  const admin = createAdminClient()

  const { data: property } = await admin
    .from('properties')
    .select('id, organization_id')
    .eq('id', input.propertyId)
    .single()

  if (!property) {
    return { success: false, error: 'Property not found. Please contact the hotel.' }
  }

  // ── Persist
  const { error: dbError } = await admin
    .from('dining_survey_submissions')
    .insert({
      organization_id:     property.organization_id,
      property_id:         property.id,
      meal_period:         mealPeriod,
      meal_period_auto:    mealPeriodAuto,
      table_number:        input.tableNumber.trim()  || null,
      food_quality:        input.ratings.food_quality,
      food_temperature:    input.ratings.food_temperature,
      service_speed:       input.ratings.service_speed,
      staff_friendliness:  input.ratings.staff_friendliness,
      ambience:            input.ratings.ambience,
      value_for_money:     input.ratings.value_for_money,
      overall_satisfaction: input.ratings.overall_satisfaction,
      comments:            input.comments.trim()    || null,
      guest_name:          input.guestName.trim()   || null,
      guest_email:         input.guestEmail.trim()  || null,
      guest_phone:         input.guestPhone.trim()  || null,
    })

  if (dbError) {
    console.error('Dining survey submission error:', dbError.message)
    return { success: false, error: 'Failed to save your feedback. Please try again.' }
  }

  return { success: true }
}

// ── Dashboard stats action (authenticated users only) ─────────────────────

export interface MealPeriodStats {
  count:                number
  avg_score:            number | null
  overall_satisfaction: number | null
  food_quality:         number | null
  food_temperature:     number | null
  service_speed:        number | null
  staff_friendliness:   number | null
  ambience:             number | null
  value_for_money:      number | null
}

export interface DiningSurveyStats {
  totalSubmissions:   number
  avgOverall:         number | null
  avgByQuestion: {
    food_quality:         number | null
    food_temperature:     number | null
    service_speed:        number | null
    staff_friendliness:   number | null
    ambience:             number | null
    value_for_money:      number | null
    overall_satisfaction: number | null
  }
  byMealPeriod: {
    breakfast: number
    lunch:     number
    dinner:    number
  }
  byMealPeriodStats: {
    breakfast: MealPeriodStats
    lunch:     MealPeriodStats
    dinner:    MealPeriodStats
  }
  recentResponses: {
    id:                   string
    created_at:           string
    meal_period:          MealPeriod
    avg_score:            number
    overall_satisfaction: number
    table_number:         string | null
    comments:             string | null
    guest_name:           string | null
  }[]
  propertyBreakdown: {
    property_id:   string
    property_name: string
    submissions:   number
    avg_score:     number | null
  }[]
}

export async function getDiningSurveyStats(
  propertyId?: string,
  days = 30,
): Promise<DiningSurveyStats | { error: string }> {
  const admin = createAdminClient()

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  let query = admin
    .from('dining_survey_submissions')
    .select(`
      id, created_at, meal_period, avg_score,
      food_quality, food_temperature, service_speed,
      staff_friendliness, ambience, value_for_money,
      overall_satisfaction, table_number, comments, guest_name,
      property_id, properties(name)
    `)
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (propertyId) {
    query = query.eq('property_id', propertyId)
  }

  const { data, error } = await query

  if (error) return { error: error.message }

  const rows = data ?? []

  if (rows.length === 0) {
    const emptyMeal: MealPeriodStats = {
      count: 0, avg_score: null, overall_satisfaction: null,
      food_quality: null, food_temperature: null, service_speed: null,
      staff_friendliness: null, ambience: null, value_for_money: null,
    }
    return {
      totalSubmissions: 0,
      avgOverall: null,
      avgByQuestion: {
        food_quality: null, food_temperature: null, service_speed: null,
        staff_friendliness: null, ambience: null, value_for_money: null,
        overall_satisfaction: null,
      },
      byMealPeriod: { breakfast: 0, lunch: 0, dinner: 0 },
      byMealPeriodStats: { breakfast: emptyMeal, lunch: emptyMeal, dinner: emptyMeal },
      recentResponses: [],
      propertyBreakdown: [],
    }
  }

  const avg = (key: keyof typeof rows[0]) => {
    const vals = rows.map((r) => r[key] as number).filter((v) => typeof v === 'number')
    if (!vals.length) return null
    return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
  }

  const avgFrom = (subset: typeof rows, key: keyof typeof rows[0]) => {
    const vals = subset.map((r) => r[key] as number).filter((v) => typeof v === 'number')
    if (!vals.length) return null
    return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
  }

  const mealStats = (mp: MealPeriod): MealPeriodStats => {
    const subset = rows.filter((r) => r.meal_period === mp)
    return {
      count:                subset.length,
      avg_score:            avgFrom(subset, 'avg_score'),
      overall_satisfaction: avgFrom(subset, 'overall_satisfaction'),
      food_quality:         avgFrom(subset, 'food_quality'),
      food_temperature:     avgFrom(subset, 'food_temperature'),
      service_speed:        avgFrom(subset, 'service_speed'),
      staff_friendliness:   avgFrom(subset, 'staff_friendliness'),
      ambience:             avgFrom(subset, 'ambience'),
      value_for_money:      avgFrom(subset, 'value_for_money'),
    }
  }

  // Property breakdown
  const propMap = new Map<string, { name: string; count: number; total: number }>()
  for (const r of rows) {
    const pid  = r.property_id as string
    const name = (r.properties as unknown as { name: string } | null)?.name ?? pid
    const entry = propMap.get(pid) ?? { name, count: 0, total: 0 }
    entry.count++
    entry.total += r.avg_score as number ?? 0
    propMap.set(pid, entry)
  }

  return {
    totalSubmissions: rows.length,
    avgOverall: avg('avg_score'),
    avgByQuestion: {
      food_quality:         avg('food_quality'),
      food_temperature:     avg('food_temperature'),
      service_speed:        avg('service_speed'),
      staff_friendliness:   avg('staff_friendliness'),
      ambience:             avg('ambience'),
      value_for_money:      avg('value_for_money'),
      overall_satisfaction: avg('overall_satisfaction'),
    },
    byMealPeriod: {
      breakfast: rows.filter((r) => r.meal_period === 'breakfast').length,
      lunch:     rows.filter((r) => r.meal_period === 'lunch').length,
      dinner:    rows.filter((r) => r.meal_period === 'dinner').length,
    },
    byMealPeriodStats: {
      breakfast: mealStats('breakfast'),
      lunch:     mealStats('lunch'),
      dinner:    mealStats('dinner'),
    },
    recentResponses: rows.slice(0, 20).map((r) => ({
      id:                   r.id as string,
      created_at:           r.created_at as string,
      meal_period:          r.meal_period as MealPeriod,
      avg_score:            r.avg_score as number,
      overall_satisfaction: r.overall_satisfaction as number,
      table_number:         r.table_number as string | null,
      comments:             r.comments as string | null,
      guest_name:           r.guest_name as string | null,
    })),
    propertyBreakdown: Array.from(propMap.entries()).map(([pid, v]) => ({
      property_id:   pid,
      property_name: v.name,
      submissions:   v.count,
      avg_score:     v.count > 0 ? Math.round((v.total / v.count) * 10) / 10 : null,
    })),
  }
}

// ── Dining survey satisfaction trends (for analytics page) ───────────────────

export interface DiningSurveyTrendPoint {
  label:     string          // "Apr 8", "Week 15", "Mar–Apr" etc.
  dateFrom:  string          // ISO date string for tooltip context
  breakfast: number | null   // avg_score for breakfast in this bucket
  lunch:     number | null
  dinner:    number | null
  overall:   number | null   // across all meal periods
}

export interface DiningSurveyTrends {
  points:      DiningSurveyTrendPoint[]
  periodDays:  number
  bucketLabel: string   // "Daily" | "Weekly" | "Bi-weekly"
}

export async function getDiningSurveyTrends(
  days: 7 | 30 | 90 = 30,
): Promise<DiningSurveyTrends | { error: string }> {
  const admin = createAdminClient()

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await admin
    .from('dining_survey_submissions')
    .select('created_at, meal_period, avg_score')
    .gte('created_at', since)
    .order('created_at', { ascending: true })

  if (error) return { error: error.message }

  const rows = data ?? []

  // Bucket strategy: daily for 7d, weekly for 30d, bi-weekly for 90d
  const bucketDays = days === 7 ? 1 : days === 30 ? 7 : 14
  const bucketLabel = days === 7 ? 'Daily' : days === 30 ? 'Weekly' : 'Bi-weekly'

  // Build bucket array from today back `days` days
  const now = Date.now()
  const totalBuckets = Math.ceil(days / bucketDays)

  const points: DiningSurveyTrendPoint[] = []

  for (let i = totalBuckets - 1; i >= 0; i--) {
    const bucketEnd   = new Date(now - i * bucketDays * 86400_000)
    const bucketStart = new Date(bucketEnd.getTime() - bucketDays * 86400_000)

    const inBucket = rows.filter((r) => {
      const t = new Date(r.created_at as string).getTime()
      return t >= bucketStart.getTime() && t < bucketEnd.getTime()
    })

    const mealAvg = (mp: MealPeriod) => {
      const vals = inBucket
        .filter((r) => r.meal_period === mp)
        .map((r) => r.avg_score as number)
        .filter((v) => typeof v === 'number')
      if (!vals.length) return null
      return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10
    }

    const allVals = inBucket.map((r) => r.avg_score as number).filter((v) => typeof v === 'number')
    const overallAvg = allVals.length
      ? Math.round((allVals.reduce((s, v) => s + v, 0) / allVals.length) * 10) / 10
      : null

    // Label: for daily use "Apr 8", for weekly/bi-weekly use "Apr 8–14"
    const fmtDate = (d: Date) =>
      d.toLocaleDateString('en-ZW', { timeZone: 'Africa/Harare', month: 'short', day: 'numeric' })

    const label = bucketDays === 1
      ? fmtDate(bucketEnd)
      : `${fmtDate(bucketStart)}–${fmtDate(bucketEnd)}`

    points.push({
      label,
      dateFrom:  bucketStart.toISOString().split('T')[0],
      breakfast: mealAvg('breakfast'),
      lunch:     mealAvg('lunch'),
      dinner:    mealAvg('dinner'),
      overall:   overallAvg,
    })
  }

  return { points, periodDays: days, bucketLabel }
}

// ── Live session data (today's submissions, for real-time monitor) ────────────

export interface LiveSubmission {
  id:                   string
  created_at:           string
  property_id:          string
  property_name:        string
  meal_period:          MealPeriod
  table_number:         string | null
  avg_score:            number
  food_quality:         number
  food_temperature:     number
  service_speed:        number
  staff_friendliness:   number
  ambience:             number
  value_for_money:      number
  overall_satisfaction: number
  comments:             string | null
  guest_name:           string | null
}

export async function getDiningSurveyLiveData(
  propertyId?: string,
): Promise<{ submissions: LiveSubmission[] } | { error: string }> {
  const admin = createAdminClient()

  // Today from midnight CAT (UTC+2) expressed as UTC
  const nowMs     = Date.now()
  const catOffset = 2 * 60 * 60 * 1000
  const catNow    = new Date(nowMs + catOffset)
  const catMidnight = Date.UTC(
    catNow.getUTCFullYear(), catNow.getUTCMonth(), catNow.getUTCDate(),
  )
  const todaySince = new Date(catMidnight - catOffset).toISOString()

  let query = admin
    .from('dining_survey_submissions')
    .select(`
      id, created_at, property_id, meal_period, table_number,
      avg_score, food_quality, food_temperature, service_speed,
      staff_friendliness, ambience, value_for_money, overall_satisfaction,
      comments, guest_name,
      properties(name)
    `)
    .gte('created_at', todaySince)
    .order('created_at', { ascending: false })
    .limit(200)

  if (propertyId) {
    query = query.eq('property_id', propertyId)
  }

  const { data, error } = await query
  if (error) return { error: error.message }

  const submissions: LiveSubmission[] = (data ?? []).map((r: any) => ({
    id:                   r.id,
    created_at:           r.created_at,
    property_id:          r.property_id,
    property_name:        (r.properties as { name: string } | null)?.name ?? r.property_id,
    meal_period:          r.meal_period as MealPeriod,
    table_number:         r.table_number,
    avg_score:            Math.round(Number(r.avg_score) * 10) / 10,
    food_quality:         r.food_quality,
    food_temperature:     r.food_temperature,
    service_speed:        r.service_speed,
    staff_friendliness:   r.staff_friendliness,
    ambience:             r.ambience,
    value_for_money:      r.value_for_money,
    overall_satisfaction: r.overall_satisfaction,
    comments:             r.comments,
    guest_name:           r.guest_name,
  }))

  return { submissions }
}
