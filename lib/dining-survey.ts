// ─── Dining Survey — shared types, constants, meal-period detection ──────────
//
// Meal periods are detected server-side using Central Africa Time (CAT / UTC+2).
// If the current time falls outside a known meal window, `null` is returned and
// the guest is shown a manual selector.

export type MealPeriod = 'breakfast' | 'lunch' | 'dinner'

// ── Survey question definitions ────────────────────────────────────────────

export interface SurveyQuestion {
  id: keyof DiningSurveyRatings
  label: string
}

export const SURVEY_QUESTIONS: SurveyQuestion[] = [
  { id: 'food_quality',         label: 'How would you rate the quality of your meal?' },
  { id: 'food_temperature',     label: 'Was your food served at the right temperature?' },
  { id: 'service_speed',        label: 'How would you rate the speed of service?' },
  { id: 'staff_friendliness',   label: 'How friendly and attentive was your server?' },
  { id: 'ambience',             label: 'How would you rate the restaurant atmosphere?' },
  { id: 'value_for_money',      label: 'Did you feel you received good value for money?' },
  { id: 'overall_satisfaction', label: 'Overall, how satisfied were you with your dining experience?' },
]

export interface DiningSurveyRatings {
  food_quality:         number | null
  food_temperature:     number | null
  service_speed:        number | null
  staff_friendliness:   number | null
  ambience:             number | null
  value_for_money:      number | null
  overall_satisfaction: number | null
}

export function buildEmptyRatings(): DiningSurveyRatings {
  return {
    food_quality:         null,
    food_temperature:     null,
    service_speed:        null,
    staff_friendliness:   null,
    ambience:             null,
    value_for_money:      null,
    overall_satisfaction: null,
  }
}

export function allRatingsComplete(ratings: DiningSurveyRatings): boolean {
  return Object.values(ratings).every((v) => v !== null && v >= 1 && v <= 5)
}

// ── Meal period detection (CAT / UTC+2) ────────────────────────────────────
//
// Windows expressed as [startHour*60+startMin, endHour*60+endMin] inclusive.

const MEAL_WINDOWS: { period: MealPeriod; start: number; end: number }[] = [
  { period: 'breakfast', start: 6 * 60,       end: 10 * 60 + 30 }, // 06:00–10:30
  { period: 'lunch',     start: 12 * 60,      end: 14 * 60 + 30 }, // 12:00–14:30
  { period: 'dinner',    start: 18 * 60,      end: 23 * 60      }, // 18:00–23:00
]

/**
 * Returns the current meal period in CAT (UTC+2), or null if outside all
 * meal windows (guest should be shown a manual selector).
 *
 * Safe to call on the server: uses the provided `now` date so tests can pass
 * a fixed timestamp. Defaults to `new Date()` when called from production code.
 */
export function detectMealPeriod(now: Date = new Date()): MealPeriod | null {
  // Convert to CAT (UTC+2)
  const catOffset = 2 * 60 // minutes
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()
  const catMinutes = (utcMinutes + catOffset) % (24 * 60)

  const match = MEAL_WINDOWS.find(
    (w) => catMinutes >= w.start && catMinutes <= w.end
  )
  return match?.period ?? null
}
