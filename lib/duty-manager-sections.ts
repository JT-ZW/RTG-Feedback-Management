// Duty Manager Checklist — Rainbow Towers Hotel
// Rating scale: 1 = Poor, 2 = Average, 3 = Good
// Max per item = 3

export interface DutyManagerItem {
  id: string
  label: string
}

export interface DutyManagerSection {
  id: string
  title: string
  items: DutyManagerItem[]
}

export const DUTY_MANAGER_SECTIONS: DutyManagerSection[] = [
  {
    id: 'hotel_entrance',
    title: 'Hotel Entrance',
    items: [
      { id: 'he_1', label: 'Lights' },
      { id: 'he_2', label: 'Car entrance alley' },
      { id: 'he_3', label: 'Flag poles' },
      { id: 'he_4', label: 'Car parking area' },
      { id: 'he_5', label: 'Entrance doors clean' },
      { id: 'he_6', label: 'Hotel signs lit' },
      { id: 'he_7', label: 'Boom gate manned' },
    ],
  },
  {
    id: 'front_office',
    title: 'Front Office Area',
    items: [
      { id: 'fo_1', label: 'Guest service agent' },
      { id: 'fo_2', label: 'Telephone room' },
      { id: 'fo_3', label: 'Safe deposit room' },
      { id: 'fo_4', label: 'Luggage room' },
      { id: 'fo_5', label: 'Employees uniforms' },
      { id: 'fo_6', label: 'Front desks tidy and clean' },
    ],
  },
  {
    id: 'vip_arrivals',
    title: 'VIP Arrivals / Rooms',
    items: [
      { id: 'vip_1', label: 'Check VIP arrivals' },
      { id: 'vip_2', label: 'Inspect VIP rooms' },
      { id: 'vip_3', label: 'Meet VIP arrivals' },
      { id: 'vip_4', label: 'Monitor crew check in / check out' },
    ],
  },
  {
    id: 'main_lobby',
    title: 'Main Lobby, Lapat Aviators',
    items: [
      { id: 'ml_1', label: 'Marble polished' },
      { id: 'ml_2', label: 'Plants' },
      { id: 'ml_3', label: 'Lamp shades' },
      { id: 'ml_4', label: 'Lights' },
      { id: 'ml_5', label: 'Chandeliers' },
      { id: 'ml_6', label: 'Music' },
      { id: 'ml_7', label: 'Carpets / rugs' },
    ],
  },
  {
    id: 'lobby_bathrooms',
    title: 'Lobby & M1 M2 Bathrooms',
    items: [
      { id: 'lb_1', label: 'Lights' },
      { id: 'lb_2', label: 'Music' },
      { id: 'lb_3', label: 'Odour free' },
      { id: 'lb_4', label: 'Toilet paper' },
      { id: 'lb_5', label: 'Urine bowls' },
      { id: 'lb_6', label: 'Stones preventing odour' },
      { id: 'lb_7', label: 'Floor' },
      { id: 'lb_8', label: 'Time cleaning sheet being completed' },
    ],
  },
  {
    id: 'elevators',
    title: 'Elevators',
    items: [
      { id: 'el_1', label: 'Staff — Small Service elevator' },
      { id: 'el_2', label: 'Staff — Big Service elevator' },
      { id: 'el_3', label: 'Staff — Kitchen Service elevator' },
      { id: 'el_4', label: 'Staff — Aviators Service elevator' },
      { id: 'el_5', label: 'Guest — A Lift' },
      { id: 'el_6', label: 'Guest — B Lift' },
      { id: 'el_7', label: 'Guest — C Lift' },
      { id: 'el_8', label: 'Guest — D Lift' },
    ],
  },
  {
    id: 'business_centre',
    title: 'Business Centre',
    items: [
      { id: 'bc_1', label: 'Lights' },
      { id: 'bc_2', label: 'Furniture' },
      { id: 'bc_3', label: 'A/C' },
      { id: 'bc_4', label: 'Carpet' },
      { id: 'bc_5', label: 'Staff uniforms' },
      { id: 'bc_6', label: 'Staff well groomed' },
    ],
  },
  {
    id: 'banquet_rooms',
    title: 'Banquet Function Rooms',
    items: [
      { id: 'br_1', label: 'Function rooms checked' },
      { id: 'br_2', label: 'A/C' },
      { id: 'br_3', label: 'Well organised' },
      { id: 'br_4', label: 'Employees uniforms' },
      { id: 'br_5', label: 'Checks evening set ups preparation' },
    ],
  },
  {
    id: 'non_occupied_rooms',
    title: 'Non Occupied Function Rooms',
    items: [
      { id: 'no_1', label: 'Doors closed' },
      { id: 'no_2', label: 'A/C switched off' },
      { id: 'no_3', label: 'Lights switched off' },
      { id: 'no_4', label: 'Room either set up or clear & clean' },
    ],
  },
  {
    id: 'icc',
    title: 'ICC',
    items: [
      { id: 'icc_1', label: 'Toilets M1' },
      { id: 'icc_2', label: 'Toilets M2' },
      { id: 'icc_3', label: 'Main Auditorium' },
      { id: 'icc_4', label: 'Committee rooms' },
      { id: 'icc_5', label: 'VIP Area' },
      { id: 'icc_6', label: 'Corporate offices area' },
      { id: 'icc_7', label: 'Lights switched off' },
    ],
  },
  {
    id: 'outlets',
    title: 'Outlets (incl Room Service)',
    items: [
      { id: 'out_1', label: 'Staff coverage' },
      { id: 'out_2', label: 'Tray collection' },
      { id: 'out_3', label: 'Cleanliness' },
      { id: 'out_4', label: 'Food presentation' },
    ],
  },
  {
    id: 'basement',
    title: 'Basement — Hotel & ICC',
    items: [
      { id: 'bas_1', label: 'Cleanliness' },
      { id: 'bas_2', label: 'Safety' },
      { id: 'bas_3', label: 'Plant rooms' },
    ],
  },
  {
    id: 'pool_gym',
    title: 'Pool Area & Gym Area',
    items: [
      { id: 'pg_1', label: 'Cushions in place' },
      { id: 'pg_2', label: 'Pool beds' },
      { id: 'pg_3', label: 'Umbrellas clean and open' },
      { id: 'pg_4', label: 'Service at pool area' },
      { id: 'pg_5', label: 'Pool status' },
      { id: 'pg_6', label: 'General cleanliness' },
    ],
  },
  {
    id: 'back_of_house',
    title: 'Back of House / Car Park',
    items: [
      { id: 'boh_1', label: 'All lights working' },
      { id: 'boh_2', label: 'Hotel signage working' },
      { id: 'boh_3', label: 'Bin area clean / clear' },
      { id: 'boh_4', label: 'Skip bin' },
      { id: 'boh_5', label: 'Media centre bin area' },
      { id: 'boh_6', label: 'Car park outlook' },
    ],
  },
  {
    id: 'security',
    title: 'Security',
    items: [
      { id: 'sec_1', label: 'Guards coverage all areas' },
      { id: 'sec_2', label: 'Fire panel' },
      { id: 'sec_3', label: 'CCTV working' },
      { id: 'sec_4', label: 'Security brief' },
    ],
  },
]

export const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Average',
  3: 'Good',
}

// Max possible: every item rated 3
export const DM_MAX_SCORE = DUTY_MANAGER_SECTIONS.reduce(
  (total, section) => total + section.items.length * 3,
  0
)

export interface DutyManagerItemResponse {
  rating: 1 | 2 | 3 | null
  comment: string
}

// section_id -> item_id -> response
export type DutyManagerResponses = Record<string, Record<string, DutyManagerItemResponse>>

export interface RoomCheck {
  roomNo: string
  notes: string
}

export function computeDMScores(responses: DutyManagerResponses) {
  let totalActual = 0
  let totalPossible = 0

  for (const section of DUTY_MANAGER_SECTIONS) {
    for (const item of section.items) {
      const resp = responses[section.id]?.[item.id]
      totalPossible += 3
      if (resp?.rating != null) totalActual += resp.rating
    }
  }

  const percentage =
    totalPossible > 0
      ? Math.round((totalActual / totalPossible) * 10000) / 100
      : 0

  return { totalActual, totalPossible, percentage }
}
