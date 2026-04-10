export interface ChecklistItem {
  id: string
  label: string
  possibleMark: number
}

export interface ChecklistSection {
  id: string
  title: string
  items: ChecklistItem[]
}

export const MYSTERY_SHOPPER_SECTIONS: ChecklistSection[] = [
  {
    id: 'reservations',
    title: 'Reservations',
    items: [
      { id: 'res_1', label: 'Greetings upon arrival/on the phone using a standard greeting', possibleMark: 5 },
      { id: 'res_2', label: 'Ease of booking', possibleMark: 5 },
      { id: 'res_3', label: 'Staff professionalism', possibleMark: 5 },
      { id: 'res_4', label: 'Accuracy of reservation details', possibleMark: 5 },
    ],
  },
  {
    id: 'arrival',
    title: 'Arrival',
    items: [
      { id: 'arr_1', label: 'Greeting upon arrival using standard greeting', possibleMark: 5 },
      { id: 'arr_2', label: 'Did the Porter handle all bags promptly and carefully, ensuring proper tagging?', possibleMark: 5 },
      { id: 'arr_3', label: 'Ambiance of entrance area', possibleMark: 5 },
      { id: 'arr_4', label: 'During check-in, were you offered a welcome drink with a smile?', possibleMark: 5 },
    ],
  },
  {
    id: 'check_in',
    title: 'Check-In',
    items: [
      { id: 'ci_1', label: 'Adequate information provided', possibleMark: 5 },
      { id: 'ci_2', label: 'Did staff rise up, make eye contact and greet you with warmth?', possibleMark: 5 },
      { id: 'ci_3', label: 'Was check-in completed within 3 minutes, while confirming details?', possibleMark: 5 },
      { id: 'ci_4', label: 'Did staff anticipate your needs before being asked (e.g., luggage assistance, directions)?', possibleMark: 5 },
    ],
  },
  {
    id: 'rooming',
    title: 'Rooming',
    items: [
      { id: 'rm_1', label: 'Did the Porter escort you to the room, explaining key features of the hotel and confirm comfort during induction to room facilities?', possibleMark: 5 },
      { id: 'rm_2', label: 'Room cleanliness', possibleMark: 5 },
      { id: 'rm_3', label: 'Did they deliver any guest request (e.g., pillow, amenities) within 10 minutes of asking?', possibleMark: 5 },
      { id: 'rm_4', label: 'Room ambiance', possibleMark: 5 },
      { id: 'rm_5', label: 'Did staff always greet guests with a warm smile, courtesy and ask about your stay?', possibleMark: 5 },
      { id: 'rm_6', label: 'Condition of furniture', possibleMark: 5 },
      { id: 'rm_7', label: 'Was the bed linen crisp, bathrooms spotless and was there a fresh scent always?', possibleMark: 5 },
      { id: 'rm_8', label: 'Availability of bathroom linen', possibleMark: 5 },
      { id: 'rm_9', label: 'Quality of Wi-Fi', possibleMark: 5 },
    ],
  },
  {
    id: 'breakfast',
    title: 'Breakfast',
    items: [
      { id: 'bf_1', label: 'Were you welcomed and seated within 1 minute of arrival?', possibleMark: 5 },
      { id: 'bf_2', label: "Were the menus presented cheerfully and was the chef's special highlighted?", possibleMark: 5 },
      { id: 'bf_3', label: 'Food quality', possibleMark: 5 },
      { id: 'bf_4', label: 'Did the waitron deliver food and drinks quickly, confidently and politely?', possibleMark: 5 },
      { id: 'bf_5', label: 'Did the waiter ask "Is everything to your satisfaction?" within 5 minutes after delivering food?', possibleMark: 5 },
      { id: 'bf_6', label: 'Value for money', possibleMark: 5 },
    ],
  },
  {
    id: 'lunch',
    title: 'Lunch',
    items: [
      { id: 'lu_1', label: 'Menu variety', possibleMark: 5 },
      { id: 'lu_2', label: 'Did they plate every dish attractively, with clean edges and correct garnishing?', possibleMark: 5 },
      { id: 'lu_3', label: 'Did they use the freshest ingredients and adhere to food safety standards at all times?', possibleMark: 5 },
      { id: 'lu_4', label: 'Was the food temperature accurate for the menu item ordered?', possibleMark: 5 },
      { id: 'lu_5', label: 'Did they deliver the food on time?', possibleMark: 5 },
      { id: 'lu_6', label: 'Did they serve all guests with good quality, fresh and tasty food with speed?', possibleMark: 5 },
      { id: 'lu_7', label: 'Value for money', possibleMark: 5 },
    ],
  },
  {
    id: 'dinner',
    title: 'Dinner',
    items: [
      { id: 'di_1', label: 'Menu variety', possibleMark: 5 },
      { id: 'di_2', label: 'Did they plate every dish attractively, with clean edges and correct garnishing?', possibleMark: 5 },
      { id: 'di_3', label: 'Did they use the freshest ingredients and adhere to food safety standards at all times?', possibleMark: 5 },
      { id: 'di_4', label: 'Was the food temperature accurate for the menu item ordered?', possibleMark: 5 },
      { id: 'di_5', label: 'Value for money', possibleMark: 5 },
    ],
  },
  {
    id: 'guest_interaction',
    title: 'Guest Interaction',
    items: [
      { id: 'gi_1', label: 'Staff engagement', possibleMark: 5 },
      { id: 'gi_2', label: 'Did staff provide accurate information or solutions within 10 minutes? Did someone check back with "Did everything work out well?"', possibleMark: 5 },
      { id: 'gi_3', label: 'Did management walk the property regularly, actively engaging guests with "How is your stay/meal so far?"', possibleMark: 5 },
      { id: 'gi_4', label: 'Overall hospitality', possibleMark: 5 },
    ],
  },
  {
    id: 'billing_checkout',
    title: 'Billing & Check-out',
    items: [
      { id: 'bc_1', label: 'Did staff rise up, make eye contact and greet you with warmth?', possibleMark: 5 },
      { id: 'bc_2', label: 'Explanation of charges', possibleMark: 5 },
      { id: 'bc_3', label: 'Accuracy of bill', possibleMark: 5 },
      { id: 'bc_4', label: 'Was check-out completed within 3 minutes, confirming satisfaction with your stay?', possibleMark: 5 },
      { id: 'bc_5', label: 'Was your next date of stay confirmed?', possibleMark: 5 },
      { id: 'bc_6', label: 'Did they wish you a pleasant journey after escorting you to the car?', possibleMark: 5 },
    ],
  },
]

export const MAX_SCORE = MYSTERY_SHOPPER_SECTIONS.reduce(
  (total, section) =>
    total + section.items.reduce((s, item) => s + item.possibleMark, 0),
  0
)

export interface ItemResponse {
  rating: number | null    // 1–5
  comment: string
  possibleMark: number
}

export type SectionResponses = Record<string, ItemResponse>
export type FormResponses = Record<string, SectionResponses>

export function computeScores(responses: FormResponses) {
  let totalActual = 0
  let totalPossible = 0

  for (const section of MYSTERY_SHOPPER_SECTIONS) {
    for (const item of section.items) {
      const resp = responses[section.id]?.[item.id]
      totalPossible += item.possibleMark
      if (resp?.rating != null) {
        totalActual += resp.rating
      }
    }
  }

  const percentage = totalPossible > 0
    ? Math.round((totalActual / totalPossible) * 10000) / 100
    : 0

  return { totalActual, totalPossible, percentage }
}
