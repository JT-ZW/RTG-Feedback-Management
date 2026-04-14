'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser, getPrimaryRole } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getGroqClient, GROQ_MODEL } from '@/lib/groq'
import { BAR_CHECKLIST_ITEMS } from '@/lib/bar-checklist-items'
import { ALL_BREAKFAST_ITEMS, BREAKFAST_SECTIONS } from '@/lib/restaurant-breakfast-items'
import { RESTAURANT_LUNCH_DINNER_ITEMS } from '@/lib/restaurant-lunch-dinner-items'
import { DUTY_MANAGER_SECTIONS } from '@/lib/duty-manager-sections'
import { MYSTERY_SHOPPER_SECTIONS } from '@/lib/mystery-shopper-sections'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AIInsightTheme {
  name: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  affectedProperties: string[]
  frequency: number
}

export interface AIInsightRecommendation {
  priority: number
  action: string
  rationale: string
  target: string
  module: string
}

export interface AIInsightPropertyHighlight {
  property: string
  compliance: number
  trend: 'improving' | 'declining' | 'stable'
  note: string
}

export interface AIInsightContent {
  executiveSummary: string
  overallCompliance: number
  trend: 'improving' | 'declining' | 'stable'
  themes: AIInsightTheme[]
  recommendations: AIInsightRecommendation[]
  propertyHighlights: AIInsightPropertyHighlight[]
  sentiment: {
    overall: 'positive' | 'neutral' | 'negative'
    positiveThemes: string[]
    concernAreas: string[]
  }
  dataPoints: {
    submissionsAnalysed: number
    commentsAnalysed: number
    periodDays: number
  }
}

export interface PropertyModuleScore {
  avg: number | null
  count: number
}

export interface WeeklyTrend {
  week: string
  weekLabel: string
  avg: number | null
  count: number
}

export interface PropertyTrend {
  propertyId: string
  propertyName: string
  weeks: WeeklyTrend[]
  direction: 'improving' | 'declining' | 'stable' | 'insufficient_data'
  delta: number | null
}

export interface ShiftBreakdown {
  module: string
  label: string
  am: number | null
  pm: number | null
  amCount: number
  pmCount: number
  gap: number | null
}

export interface DayOfWeekPattern {
  day: string
  dayIndex: number
  avg: number | null
  count: number
}

export interface SectionScore {
  sectionId: string
  sectionTitle: string
  avg: number | null
  count: number
}

export interface ModuleSectionBreakdown {
  module: string
  label: string
  sections: SectionScore[]
}

export interface WorstItem {
  label: string
  module: string
  sectionTitle: string
  failRate: number
  failCount: number
  totalAnswered: number
}

export interface SubmissionCadence {
  date: string
  count: number
}

export interface AnalyticsData {
  properties: { id: string; name: string }[]
  propertyCompliance: Record<string, Record<string, PropertyModuleScore>>
  moduleAverages: { module: string; label: string; avg: number; count: number }[]
  worstItems: WorstItem[]
  propertyTrends: PropertyTrend[]
  shiftBreakdowns: ShiftBreakdown[]
  dayOfWeekPatterns: DayOfWeekPattern[]
  sectionBreakdowns: ModuleSectionBreakdown[]
  submissionCadence: SubmissionCadence[]
  expectedSubmissionsPerDay: number
  avgActualSubmissionsPerDay: number
  latestInsight: { content: AIInsightContent; generatedAt: string } | null
  totalSubmissions: number
  orgCompliance: number | null
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MODULES = [
  // scoreCol = the actual column name used in each table for the compliance percentage
  // bar/lunch-dinner/breakfast → compliance_score
  // duty_manager / mystery_shopper → percentage  (those tables have no compliance_score column)
  { key: 'bar_checklist',           label: 'Bar Checklist',   table: 'bar_checklist_submissions',           scoreCol: 'compliance_score' },
  { key: 'restaurant_lunch_dinner', label: 'Lunch & Dinner',  table: 'restaurant_lunch_dinner_submissions', scoreCol: 'compliance_score' },
  { key: 'restaurant_breakfast',    label: 'Breakfast',       table: 'restaurant_breakfast_submissions',    scoreCol: 'compliance_score' },
  { key: 'duty_manager',            label: 'Duty Manager',    table: 'duty_manager_submissions',            scoreCol: 'percentage'        },
  { key: 'mystery_shopper',         label: 'Mystery Shopper', table: 'mystery_shopper_submissions',         scoreCol: 'percentage'        },
]

const ANALYTICS_ROLES = ['super_admin', 'org_admin', 'group_ops_manager', 'general_manager']

type RawRow = {
  property_id: string
  compliance_score?: number | null
  percentage?: number | null
  submission_date?: string | null
  shift_date?: string | null
  visit_date?: string | null
  shift?: string | null
}

function dateColFor(modKey: string) {
  if (modKey === 'duty_manager') return 'shift_date'
  if (modKey === 'mystery_shopper') return 'visit_date'
  return 'submission_date'
}

function scoreFrom(row: RawRow): number | null {
  const v = row.compliance_score ?? row.percentage ?? null
  return v !== null ? Number(v) : null
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

// ─── getAnalyticsData ────────────────────────────────────────────────────────

export async function getAnalyticsData(): Promise<AnalyticsData> {
  // Auth check uses the user JWT client (respects RLS on auth tables)
  const supabase = await createClient()
  const currentUser = await getCurrentUser()
  if (!currentUser.authenticated) redirect('/login')

  const { profile, roles } = currentUser
  const primaryRole = getPrimaryRole(roles)
  if (!ANALYTICS_ROLES.includes(primaryRole)) redirect('/dashboard')

  // All data reads use the admin client (service role) to bypass RLS.
  // Application-level auth (role check above) already gates this path.
  const db = createAdminClient()

  const orgId = profile.organization_id
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString().split('T')[0]

  // 1 ── Properties
  const { data: props } = await db
    .from('properties')
    .select('id, name')
    .eq('organization_id', orgId)
    .order('name')
  const propList = props ?? []
  const propMap: Record<string, string> = {}
  for (const p of propList) propMap[p.id] = p.name

  // 2 ── Fetch all module rows in parallel
  const moduleRows: Record<string, RawRow[]> = {}
  let totalSubmissions = 0

  const moduleFetchResults = await Promise.all(
    MODULES.map(mod => {
      const dc = dateColFor(mod.key)
      const selectShift = mod.key === 'restaurant_lunch_dinner' ? ', shift' : ''
      return db
        .from(mod.table as never)
        .select(`property_id, ${mod.scoreCol}, ${dc}${selectShift}`)
        .eq('organization_id', orgId)
        .gte(dc, since)
        .order(dc, { ascending: true })
        .then(({ data: rows, error: fetchErr }) => {
          if (fetchErr) console.error(`[analytics] ${mod.key} fetch error:`, fetchErr.message)
          return { key: mod.key, rows: (rows ?? []) as unknown as RawRow[] }
        })
    })
  )

  for (const { key, rows } of moduleFetchResults) {
    moduleRows[key] = rows
    totalSubmissions += rows.length
  }

  // 3 ── Property × Module compliance matrix
  const propertyCompliance: Record<string, Record<string, PropertyModuleScore>> = {}
  for (const p of propList) {
    propertyCompliance[p.id] = {}
    for (const mod of MODULES) propertyCompliance[p.id][mod.key] = { avg: null, count: 0 }
  }

  const moduleAverages: AnalyticsData['moduleAverages'] = []

  for (const mod of MODULES) {
    const byProp: Record<string, number[]> = {}
    for (const row of moduleRows[mod.key]) {
      const s = scoreFrom(row)
      if (s === null) continue
      if (!byProp[row.property_id]) byProp[row.property_id] = []
      byProp[row.property_id].push(s)
    }
    for (const [propId, scores] of Object.entries(byProp)) {
      if (propertyCompliance[propId]) {
        propertyCompliance[propId][mod.key] = { avg: avg(scores), count: scores.length }
      }
    }
    const all = Object.values(byProp).flat()
    moduleAverages.push({ module: mod.key, label: mod.label, avg: all.length > 0 ? avg(all) : 0, count: moduleRows[mod.key].length })
  }

  // 4 ── Org compliance
  const activeAvgs = moduleAverages.filter(m => m.count > 0).map(m => m.avg)
  const orgCompliance = activeAvgs.length > 0 ? avg(activeAvgs) : null

  // 5 ── Weekly property trends (5 rolling weeks)
  const now = new Date()
  const daysAgoStr = (n: number) => {
    const d = new Date(now); d.setDate(d.getDate() - n)
    return d.toISOString().split('T')[0]
  }
  const weekLabel = (n: number) => {
    const d = new Date(now); d.setDate(d.getDate() - n * 7)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }
  const WEEKS = [
    { key: 'W5', label: weekLabel(5), start: daysAgoStr(35), end: daysAgoStr(29) },
    { key: 'W4', label: weekLabel(4), start: daysAgoStr(28), end: daysAgoStr(22) },
    { key: 'W3', label: weekLabel(3), start: daysAgoStr(21), end: daysAgoStr(15) },
    { key: 'W2', label: weekLabel(2), start: daysAgoStr(14), end: daysAgoStr(8)  },
    { key: 'W1', label: weekLabel(1), start: daysAgoStr(7),  end: daysAgoStr(1)  },
  ]

  const propertyTrends: PropertyTrend[] = propList.map(prop => {
    const weeks: WeeklyTrend[] = WEEKS.map(w => {
      const scores: number[] = []
      for (const mod of MODULES) {
        const dc = dateColFor(mod.key)
        for (const row of moduleRows[mod.key]) {
          if (row.property_id !== prop.id) continue
          const dateVal = (row as Record<string, string | null | number | undefined>)[dc] as string | null
          if (!dateVal || dateVal < w.start || dateVal > w.end) continue
          const s = scoreFrom(row)
          if (s !== null) scores.push(s)
        }
      }
      return { week: w.key, weekLabel: w.label, avg: scores.length > 0 ? avg(scores) : null, count: scores.length }
    })

    const valid = weeks.filter(w => w.avg !== null)
    let direction: PropertyTrend['direction'] = 'insufficient_data'
    let delta: number | null = null
    if (valid.length >= 2) {
      delta = valid[valid.length - 1].avg! - valid[0].avg!
      direction = delta > 3 ? 'improving' : delta < -3 ? 'declining' : 'stable'
    }
    return { propertyId: prop.id, propertyName: prop.name, weeks, direction, delta }
  })

  // 6 ── Shift breakdown (Bar, Lunch & Dinner — both have AM/PM)
  const SHIFT_MODULES = [
    { key: 'bar_checklist', label: 'Bar Checklist' },
    { key: 'restaurant_lunch_dinner', label: 'Lunch & Dinner' },
  ]
  const shiftBreakdowns: ShiftBreakdown[] = SHIFT_MODULES.map(mod => {
    const am: number[] = [], pm: number[] = []
    for (const row of moduleRows[mod.key]) {
      const s = scoreFrom(row)
      if (s === null) continue
      if (row.shift === 'AM') am.push(s)
      else if (row.shift === 'PM') pm.push(s)
    }
    const amAvg = am.length > 0 ? avg(am) : null
    const pmAvg = pm.length > 0 ? avg(pm) : null
    return {
      module: mod.key, label: mod.label,
      am: amAvg, pm: pmAvg,
      amCount: am.length, pmCount: pm.length,
      gap: amAvg !== null && pmAvg !== null ? amAvg - pmAvg : null,
    }
  })

  // 7 ── Day-of-week patterns (org-wide)
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dowBuckets: number[][] = [[], [], [], [], [], [], []]
  for (const mod of MODULES) {
    const dc = dateColFor(mod.key)
    for (const row of moduleRows[mod.key]) {
      const dateVal = (row as Record<string, string | null | number | undefined>)[dc] as string | null
      if (!dateVal) continue
      const s = scoreFrom(row)
      if (s === null) continue
      dowBuckets[new Date(dateVal + 'T12:00:00').getDay()].push(s)
    }
  }
  const dayOfWeekPatterns: DayOfWeekPattern[] = DOW.map((day, i) => ({
    day, dayIndex: i,
    avg: dowBuckets[i].length > 0 ? avg(dowBuckets[i]) : null,
    count: dowBuckets[i].length,
  }))

  // 8 ── Submission cadence heatmap
  const cadenceMap: Record<string, number> = {}
  for (const mod of MODULES) {
    const dc = dateColFor(mod.key)
    for (const row of moduleRows[mod.key]) {
      const dateVal = (row as Record<string, string | null | number | undefined>)[dc] as string | null
      if (!dateVal) continue
      cadenceMap[dateVal] = (cadenceMap[dateVal] ?? 0) + 1
    }
  }
  const submissionCadence: SubmissionCadence[] = Object.entries(cadenceMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  const expectedSubmissionsPerDay = propList.length * 2
  const avgActualSubmissionsPerDay = totalSubmissions / 30

  // 9 ── Section-level breakdown (Breakfast, Duty Manager, Mystery Shopper)
  const sectionBreakdowns: ModuleSectionBreakdown[] = []

  // Breakfast
  {
    const { data: bfRows } = await db
      .from('restaurant_breakfast_submissions')
      .select('responses')
      .eq('organization_id', orgId)
      .gte('submission_date', since)
      .limit(200)

    const sections: SectionScore[] = BREAKFAST_SECTIONS.map(section => {
      const sectionScores: number[] = []
      for (const row of (bfRows ?? []) as { responses: string }[]) {
        try {
          const p: Record<string, boolean | null> = JSON.parse(row.responses)
          let yes = 0, answered = 0
          for (const item of section.items) {
            if (p[item.id] === true || p[item.id] === false) { answered++; if (p[item.id]) yes++ }
          }
          if (answered > 0) sectionScores.push((yes / answered) * 100)
        } catch { /* skip */ }
      }
      return {
        sectionId: section.id, sectionTitle: section.title,
        avg: sectionScores.length > 0 ? avg(sectionScores) : null,
        count: sectionScores.length,
      }
    })
    sectionBreakdowns.push({ module: 'restaurant_breakfast', label: 'Breakfast', sections })
  }

  // Duty Manager
  {
    const { data: dmRows } = await db
      .from('duty_manager_submissions')
      .select('responses')
      .eq('organization_id', orgId)
      .gte('shift_date', since)
      .limit(200)

    const sections: SectionScore[] = DUTY_MANAGER_SECTIONS.map(section => {
      let totalRating = 0, totalPossible = 0, count = 0
      for (const row of (dmRows ?? []) as { responses: string }[]) {
        try {
          const p: Record<string, Record<string, { rating?: number | null }>> = JSON.parse(row.responses)
          let sA = 0, sP = 0
          for (const item of section.items) {
            const r = p[section.id]?.[item.id]?.rating ?? null
            if (r !== null) { sA += Number(r); sP += 3 }
          }
          if (sP > 0) { totalRating += sA; totalPossible += sP; count++ }
        } catch { /* skip */ }
      }
      return {
        sectionId: section.id, sectionTitle: section.title,
        avg: totalPossible > 0 ? (totalRating / totalPossible) * 100 : null,
        count,
      }
    })
    sectionBreakdowns.push({ module: 'duty_manager', label: 'Duty Manager', sections })
  }

  // Mystery Shopper
  {
    const { data: msRows } = await db
      .from('mystery_shopper_submissions')
      .select('responses')
      .eq('organization_id', orgId)
      .gte('visit_date', since)
      .limit(200)

    const sections: SectionScore[] = MYSTERY_SHOPPER_SECTIONS.map(section => {
      const sectionScores: number[] = []
      for (const row of (msRows ?? []) as { responses: string }[]) {
        try {
          const p: Record<string, Record<string, { rating?: number | null }>> = JSON.parse(row.responses)
          let a = 0, po = 0
          for (const item of section.items) {
            const r = p[section.id]?.[item.id]?.rating ?? null
            if (r !== null) { a += Number(r); po += item.possibleMark }
          }
          if (po > 0) sectionScores.push((a / po) * 100)
        } catch { /* skip */ }
      }
      return {
        sectionId: section.id, sectionTitle: section.title,
        avg: sectionScores.length > 0 ? avg(sectionScores) : null,
        count: sectionScores.length,
      }
    })
    sectionBreakdowns.push({ module: 'mystery_shopper', label: 'Mystery Shopper', sections })
  }

  // 10 ── Worst items
  const bfSectionLookup: Record<string, string> = {}
  for (const s of BREAKFAST_SECTIONS) for (const item of s.items) bfSectionLookup[item.id] = s.title

  const worstItems: WorstItem[] = []
  const yesNoMods = [
    { key: 'bar_checklist',           label: 'Bar',          table: 'bar_checklist_submissions',             items: BAR_CHECKLIST_ITEMS as { id: string; label: string }[],             lookup: null as Record<string,string>|null },
    { key: 'restaurant_lunch_dinner', label: 'Lunch & Dinner', table: 'restaurant_lunch_dinner_submissions', items: RESTAURANT_LUNCH_DINNER_ITEMS as { id: string; label: string }[], lookup: null },
    { key: 'restaurant_breakfast',    label: 'Breakfast',    table: 'restaurant_breakfast_submissions',      items: ALL_BREAKFAST_ITEMS as { id: string; label: string }[],              lookup: bfSectionLookup },
  ]

  for (const mod of yesNoMods) {
    const { data: rRows } = await db
      .from(mod.table as never)
      .select('responses')
      .eq('organization_id', orgId)
      .gte('submission_date', since)
      .limit(200)

    const fails: Record<string, { fail: number; total: number }> = {}
    for (const row of (rRows ?? []) as { responses: string }[]) {
      try {
        const p: Record<string, boolean | null> = JSON.parse(row.responses)
        for (const item of mod.items) {
          if (!fails[item.id]) fails[item.id] = { fail: 0, total: 0 }
          if (p[item.id] === true || p[item.id] === false) {
            fails[item.id].total++
            if (p[item.id] === false) fails[item.id].fail++
          }
        }
      } catch { /* skip */ }
    }

    for (const item of mod.items) {
      const f = fails[item.id]
      if (!f || f.total === 0) continue
      worstItems.push({
        label: item.label,
        module: mod.key,
        sectionTitle: mod.lookup?.[item.id] ?? mod.label,
        failRate: (f.fail / f.total) * 100,
        failCount: f.fail,
        totalAnswered: f.total,
      })
    }
  }
  worstItems.sort((a, b) => b.failRate - a.failRate)

  // 11 ── Latest AI insight
  const { data: insightRow } = await db
    .from('ai_insights')
    .select('content, generated_at')
    .eq('organization_id', orgId)
    .is('property_id', null)
    .order('generated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const latestInsight = insightRow
    ? { content: insightRow.content as AIInsightContent, generatedAt: insightRow.generated_at as string }
    : null

  return {
    properties: propList,
    propertyCompliance,
    moduleAverages,
    worstItems: worstItems.slice(0, 20),
    propertyTrends,
    shiftBreakdowns,
    dayOfWeekPatterns,
    sectionBreakdowns,
    submissionCadence,
    expectedSubmissionsPerDay,
    avgActualSubmissionsPerDay,
    latestInsight,
    totalSubmissions,
    orgCompliance,
  }
}

// ─── generateOrgInsights ─────────────────────────────────────────────────────

export async function generateOrgInsights(): Promise<{ success: boolean; error?: string }> {
  const currentUser = await getCurrentUser()
  if (!currentUser.authenticated) return { success: false, error: 'Not authenticated.' }

  const { profile, roles } = currentUser
  const primaryRole = getPrimaryRole(roles)
  if (!ANALYTICS_ROLES.includes(primaryRole)) return { success: false, error: 'Insufficient permissions.' }

  const orgId = profile.organization_id
  const admin = createAdminClient()
  const supabase = await createClient()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const since = thirtyDaysAgo.toISOString().split('T')[0]
  const todayStr = new Date().toISOString().split('T')[0]

  const { data: properties } = await admin
    .from('properties')
    .select('id, name')
    .eq('organization_id', orgId)

  const propMap: Record<string, string> = {}
  for (const p of (properties ?? [])) propMap[p.id] = p.name

  // ── Build quantitative summary ────────────────────────────────────────────
  const quantSections: string[] = []
  let totalSubmissions = 0

  for (const mod of MODULES) {
    const dc = dateColFor(mod.key)
    const { data: rows } = await admin
      .from(mod.table as never)
      .select(`property_id, compliance_score, percentage`)
      .eq('organization_id', orgId)
      .gte(dc, since)

    const rowsArr = (rows ?? []) as { property_id: string; compliance_score?: number | null; percentage?: number | null }[]
    totalSubmissions += rowsArr.length

    if (rowsArr.length === 0) {
      quantSections.push(`${mod.label}: No submissions in this period.`)
      continue
    }

    const byProp: Record<string, number[]> = {}
    for (const row of rowsArr) {
      const score = Number(row.compliance_score ?? row.percentage ?? 0)
      if (!byProp[row.property_id]) byProp[row.property_id] = []
      byProp[row.property_id].push(score)
    }

    const lines = [`${mod.label} (${rowsArr.length} submissions):`]
    for (const [propId, scores] of Object.entries(byProp)) {
      const a = scores.reduce((x, y) => x + y, 0) / scores.length
      lines.push(`  - ${propMap[propId] ?? propId}: ${a.toFixed(1)}% avg (${scores.length} submissions)`)
    }
    quantSections.push(lines.join('\n'))
  }

  // ── Worst items for AI context ────────────────────────────────────────────
  const worstForAI: string[] = []
  const yesNoMods = [
    { table: 'bar_checklist_submissions',             items: BAR_CHECKLIST_ITEMS as { id: string; label: string }[],             label: 'Bar',          dc: 'submission_date' },
    { table: 'restaurant_lunch_dinner_submissions',   items: RESTAURANT_LUNCH_DINNER_ITEMS as { id: string; label: string }[], label: 'Lunch & Dinner', dc: 'submission_date' },
    { table: 'restaurant_breakfast_submissions',      items: ALL_BREAKFAST_ITEMS as { id: string; label: string }[],            label: 'Breakfast',    dc: 'submission_date' },
  ]
  for (const mod of yesNoMods) {
    const { data: rRows } = await admin
      .from(mod.table as never)
      .select('responses')
      .eq('organization_id', orgId)
      .gte(mod.dc, since)
      .limit(200)
    const fails: Record<string, { fail: number; total: number }> = {}
    for (const row of (rRows ?? []) as { responses: string }[]) {
      try {
        const p: Record<string, boolean | null> = JSON.parse(row.responses)
        for (const item of mod.items) {
          if (!fails[item.id]) fails[item.id] = { fail: 0, total: 0 }
          if (p[item.id] === true || p[item.id] === false) {
            fails[item.id].total++
            if (!p[item.id]) fails[item.id].fail++
          }
        }
      } catch { /* skip */ }
    }
    for (const item of mod.items) {
      const f = fails[item.id]
      if (!f || f.total < 3) continue
      const rate = (f.fail / f.total) * 100
      if (rate >= 30) worstForAI.push(`[${mod.label}] "${item.label}" failing ${rate.toFixed(0)}% (${f.fail}/${f.total})`)
    }
  }
  worstForAI.sort()

  // ── Extract free-text comments ────────────────────────────────────────────
  const extractedComments: string[] = []

  const { data: msRows } = await admin
    .from('mystery_shopper_submissions')
    .select('responses, property_id')
    .eq('organization_id', orgId)
    .gte('visit_date', since)
    .limit(30)

  for (const row of (msRows ?? []) as { responses: string; property_id: string }[]) {
    try {
      const parsed = JSON.parse(row.responses) as Record<string, Record<string, { comment?: string }>>
      for (const section of Object.values(parsed)) {
        for (const item of Object.values(section)) {
          if (item.comment?.trim()) extractedComments.push(`[Mystery Shopper | ${propMap[row.property_id] ?? 'Unknown'}] ${item.comment.trim()}`)
        }
      }
    } catch { /* skip */ }
  }

  const { data: dmRows } = await admin
    .from('duty_manager_submissions')
    .select('responses, room_checks, hod_comments, property_id')
    .eq('organization_id', orgId)
    .gte('shift_date', since)
    .limit(30)

  for (const row of (dmRows ?? []) as { responses: string; room_checks: string; hod_comments?: string; property_id: string }[]) {
    const pName = propMap[row.property_id] ?? 'Unknown'
    try {
      const parsed = JSON.parse(row.responses) as Record<string, Record<string, { comment?: string }>>
      for (const s of Object.values(parsed)) for (const item of Object.values(s)) {
        if (item.comment?.trim()) extractedComments.push(`[Duty Manager | ${pName}] ${item.comment.trim()}`)
      }
    } catch { /* skip */ }
    try {
      const checks = JSON.parse(row.room_checks) as { notes?: string }[]
      for (const c of checks) if (c.notes?.trim()) extractedComments.push(`[Room Check | ${pName}] ${c.notes.trim()}`)
    } catch { /* skip */ }
    if (row.hod_comments?.trim()) extractedComments.push(`[HOD Comment | ${pName}] ${row.hod_comments.trim()}`)
  }

  // ── Build GROQ prompt ─────────────────────────────────────────────────────
  const propertyList = Object.values(propMap).join(', ')
  const commentsBlock = extractedComments.length > 0
    ? extractedComments.slice(0, 60).join('\n')
    : 'No qualitative observations available for this period.'

  const worstBlock = worstForAI.length > 0
    ? worstForAI.slice(0, 15).join('\n')
    : 'No items with ≥30% failure rate in this period.'

  const prompt = `You are an operational intelligence analyst for Rainbow Tourism Group (RTG), a hotel management company operating ${Object.keys(propMap).length} properties in Zimbabwe (${propertyList}).

Analyse the following 30-day operational data and respond with a single valid JSON object. No markdown, no explanation outside the JSON.

## COMPLIANCE DATA (last 30 days, by module and property)
${quantSections.join('\n\n')}

## HIGH-FAILURE CHECKLIST ITEMS (≥30% failure rate)
${worstBlock}

## QUALITATIVE OBSERVATIONS (mystery shopper comments, duty manager notes, HOD observations)
${commentsBlock}

## REQUIRED JSON STRUCTURE
{
  "executiveSummary": "2-3 sentence plain-English overview for senior management. Mention specific properties and modules.",
  "overallCompliance": <number 0-100, overall average across all modules and properties>,
  "trend": "improving|declining|stable",
  "themes": [
    {
      "name": "<3-5 word theme label>",
      "severity": "HIGH|MEDIUM|LOW",
      "description": "<1-2 sentences tying this theme to specific data points>",
      "affectedProperties": ["<property names>"],
      "frequency": <number of data points supporting this theme>
    }
  ],
  "recommendations": [
    {
      "priority": <1-5, 1=most urgent>,
      "action": "<specific, actionable instruction — not generic advice>",
      "rationale": "<cite specific data: property name, percentage, item name>",
      "target": "<property name or 'All Properties'>",
      "module": "<module name>"
    }
  ],
  "propertyHighlights": [
    {
      "property": "<name>",
      "compliance": <avg number>,
      "trend": "improving|declining|stable",
      "note": "<one sentence — specific, data-grounded>"
    }
  ],
  "sentiment": {
    "overall": "positive|neutral|negative",
    "positiveThemes": ["<specific recurring positives from comments>"],
    "concernAreas": ["<specific recurring concerns from comments>"]
  },
  "dataPoints": {
    "submissionsAnalysed": ${totalSubmissions},
    "commentsAnalysed": ${extractedComments.length},
    "periodDays": 30
  }
}

Rules:
- Maximum 5 themes, maximum 5 recommendations, maximum 7 property highlights
- Every claim must reference specific data — no vague generalisations
- If data is sparse, be honest about it in executiveSummary
- Output ONLY the JSON object, nothing else`

  // ── Call GROQ ─────────────────────────────────────────────────────────────
  let parsedContent: AIInsightContent
  try {
    const groq = getGroqClient()
    const completion = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2048,
    })
    const raw = completion.choices[0]?.message?.content ?? ''
    const jsonStr = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
    parsedContent = JSON.parse(jsonStr) as AIInsightContent
  } catch (err) {
    return { success: false, error: `AI generation failed: ${err instanceof Error ? err.message : 'Unknown error'}` }
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  await admin
    .from('ai_insights')
    .delete()
    .eq('organization_id', orgId)
    .is('property_id', null)
    .eq('insight_type', 'weekly_summary')

  const { error: insertError } = await admin
    .from('ai_insights')
    .insert({
      organization_id: orgId,
      property_id: null,
      insight_type: 'weekly_summary',
      period_start: since,
      period_end: todayStr,
      content: parsedContent,
      model_used: GROQ_MODEL,
    })

  if (insertError) return { success: false, error: `Failed to save insights: ${insertError.message}` }

  revalidatePath('/dashboard/analytics')
  return { success: true }
}
