// Restaurant Breakfast Checklist — Rainbow Tourism Group
// Each item: YES (true) or NO (false), with optional comment per item.
// Sign-off: Checked By, Restaurant Manager/Hostess, Executive/Head Chef.

export interface BreakfastItem {
  id: string
  label: string
}

export interface BreakfastSection {
  id: string
  title: string
  items: BreakfastItem[]
}

export const BREAKFAST_SECTIONS: BreakfastSection[] = [
  {
    id: 'cereals',
    title: 'Cereals',
    items: [
      { id: 'cer_1', label: '3 Types (2 local, 1 imported)' },
      { id: 'cer_2', label: 'Honey' },
      { id: 'cer_3', label: 'Hot Milk' },
      { id: 'cer_4', label: 'Cold Milk' },
    ],
  },
  {
    id: 'juices',
    title: 'Juices',
    items: [
      { id: 'jui_1', label: '3 Juices (1 Sugar Free)' },
    ],
  },
  {
    id: 'pastries',
    title: 'Pastries',
    items: [
      { id: 'pas_1', label: 'Toast — 2 Types Fresh Bread (1 Healthy Bread)' },
      { id: 'pas_2', label: 'Croissants (1 type)' },
      { id: 'pas_3', label: 'Danish (1 type)' },
      { id: 'pas_4', label: 'Scones' },
      { id: 'pas_5', label: 'Muffins (1 type)' },
    ],
  },
  {
    id: 'spreads',
    title: 'Preserves / Spreads',
    items: [
      { id: 'spr_1', label: 'Butter' },
      { id: 'spr_2', label: 'Marmalade' },
      { id: 'spr_3', label: 'Honey' },
      { id: 'spr_4', label: 'Peanut Butter' },
      { id: 'spr_5', label: 'Maple Syrup' },
    ],
  },
  {
    id: 'yoghurt',
    title: 'Yoghurt & Fruit',
    items: [
      { id: 'yog_1', label: '2 Types (1 Plain & 1 Fruit)' },
      { id: 'yog_2', label: '2 Tinned' },
      { id: 'yog_3', label: '2 Whole Fruits' },
      { id: 'yog_4', label: 'Assorted Sliced Fruits' },
    ],
  },
  {
    id: 'condiments',
    title: 'Condiments',
    items: [
      { id: 'con_1', label: 'Bovril / Marmite' },
      { id: 'con_2', label: 'English Mustard' },
      { id: 'con_3', label: 'Worcestershire Sauce' },
      { id: 'con_4', label: 'Tomato Ketchup' },
      { id: 'con_5', label: 'Chutney' },
      { id: 'con_6', label: 'Fresh Chillies' },
    ],
  },
  {
    id: 'cold_meats',
    title: 'Cold Meats',
    items: [
      { id: 'cmt_1', label: '2 Types' },
    ],
  },
  {
    id: 'hot_buffet',
    title: 'Hot Buffet',
    items: [
      { id: 'hbf_1', label: 'Sausages' },
      { id: 'hbf_2', label: 'Bacon' },
      { id: 'hbf_3', label: 'Baked Beans' },
      { id: 'hbf_4', label: 'Grilled Tomato' },
      { id: 'hbf_5', label: 'Potatoes' },
      { id: 'hbf_6', label: 'Vegetarian Option to be Available' },
    ],
  },
  {
    id: 'special_of_day',
    title: 'Special of the Day',
    items: [
      { id: 'sod_mon', label: 'Vegetable Curry — Monday' },
      { id: 'sod_tue', label: 'Beef Steaks — Tuesday' },
      { id: 'sod_wed', label: 'Mince Meat — Wednesday' },
      { id: 'sod_thu', label: 'Vegetable Curry — Thursday' },
      { id: 'sod_fri', label: 'Chicken Liver / Gizzards — Friday' },
      { id: 'sod_sat', label: 'Liver / Kidney — Saturday' },
      { id: 'sod_sun', label: 'Meat Balls — Sunday' },
    ],
  },
  {
    id: 'egg_station',
    title: 'Egg Station',
    items: [
      { id: 'egg_1', label: 'Omelettes' },
      { id: 'egg_2', label: 'Tomato' },
      { id: 'egg_3', label: 'Onion' },
      { id: 'egg_4', label: 'Cheese' },
      { id: 'egg_5', label: 'Mushroom' },
      { id: 'egg_6', label: 'Red / Green Pepper' },
      { id: 'egg_7', label: 'Poached (Per Order)' },
      { id: 'egg_8', label: 'Fried (Cooked to Order)' },
      { id: 'egg_9', label: 'Boiled' },
      { id: 'egg_10', label: 'Scrambled' },
    ],
  },
  {
    id: 'beverages',
    title: 'Hot & Cold Beverages',
    items: [
      { id: 'bev_1', label: 'Decaffeinated Coffee' },
      { id: 'bev_2', label: 'Filter Coffee' },
      { id: 'bev_3', label: 'Rooibos' },
      { id: 'bev_4', label: 'Tanganda' },
    ],
  },
]

// Flat list of all items for scoring
export const ALL_BREAKFAST_ITEMS = BREAKFAST_SECTIONS.flatMap(s => s.items)
export const BREAKFAST_TOTAL = ALL_BREAKFAST_ITEMS.length  // 52

// Weekday index → Special of the Day item id
export const WEEKDAY_SPECIAL: Record<number, string> = {
  1: 'sod_mon',  // Monday
  2: 'sod_tue',  // Tuesday
  3: 'sod_wed',  // Wednesday
  4: 'sod_thu',  // Thursday
  5: 'sod_fri',  // Friday
  6: 'sod_sat',  // Saturday
  0: 'sod_sun',  // Sunday
}

export type BreakfastResponses = Record<string, boolean | null>

/** Returns { yesCount, totalAnswered, percentage } */
export function computeBreakfastScores(responses: BreakfastResponses) {
  const yesCount = ALL_BREAKFAST_ITEMS.filter(i => responses[i.id] === true).length
  const totalAnswered = ALL_BREAKFAST_ITEMS.filter(
    i => responses[i.id] !== null && responses[i.id] !== undefined
  ).length
  const percentage = BREAKFAST_TOTAL > 0
    ? Math.round((yesCount / BREAKFAST_TOTAL) * 10000) / 100
    : 0
  return { yesCount, totalAnswered, percentage }
}
