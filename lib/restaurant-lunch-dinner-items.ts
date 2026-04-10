// Restaurant Lunch/Dinner Checklist — Rainbow Tourism Group
// RESTAURANT MANAGER / HEAD WAITER / RESTAURANT SUPERVISOR
// Each item: YES (true) or NO (false)
// Shift: AM or PM

export interface RestaurantLunchDinnerItem {
  id: string
  number: number
  label: string
}

export const RESTAURANT_LUNCH_DINNER_ITEMS: RestaurantLunchDinnerItem[] = [
  { id: 'rld_1',  number: 1,  label: 'Did you read the handover book and take action?' },
  { id: 'rld_2',  number: 2,  label: 'Do you have enough staff for the shift?' },
  {
    id: 'rld_3',
    number: 3,
    label: 'Has line-up been done and have you checked staff for: general personal hygiene & grooming, proper uniform and name badge in position, waiter\'s towel, waiter\'s friend, docket pad & pen?',
  },
  { id: 'rld_4',  number: 4,  label: 'Have you checked group reservations and billing procedures?' },
  { id: 'rld_5',  number: 5,  label: 'Has the Chef taken the team through the buffet items for the day?' },
  { id: 'rld_6',  number: 6,  label: 'Did you liaise with the chef and barman for out of stock items?' },
  { id: 'rld_7',  number: 7,  label: 'Has the barman told you the wine/cocktail of the day?' },
  { id: 'rld_8',  number: 8,  label: 'Did you check if the cashier has collected the guest ledger?' },
  { id: 'rld_9',  number: 9,  label: 'Does the cashier have enough change?' },
  { id: 'rld_10', number: 10, label: 'Are the lights working?' },
  { id: 'rld_11', number: 11, label: 'Is the restaurant floor clean and free from wipe marks?' },
  { id: 'rld_12', number: 12, label: 'Are the windows open (if necessary)?' },
  { id: 'rld_13', number: 13, label: 'Are the hot dishes buffet and salad bar equipped as per standard?' },
  { id: 'rld_14', number: 14, label: 'Are condiments clean and free from spillages?' },
  { id: 'rld_15', number: 15, label: 'Is all mis-en-place ready?' },
  { id: 'rld_16', number: 16, label: 'Are there enough plates for service?' },
  { id: 'rld_17', number: 17, label: 'Are there enough cups and saucers?' },
  { id: 'rld_18', number: 18, label: 'Is there enough cutlery?' },
  { id: 'rld_19', number: 19, label: 'Are all tables set up and laid accordingly?' },
  { id: 'rld_20', number: 20, label: 'Are all the side boards clean and well stocked?' },
  { id: 'rld_21', number: 21, label: 'Are all bookings confirmed and allocated?' },
  { id: 'rld_22', number: 22, label: 'Do all tables have clean table numbers plaques?' },
  { id: 'rld_23', number: 23, label: 'Are all mints, serviettes, toothpicks and sugars adequate?' },
  { id: 'rld_24', number: 24, label: 'Do salt cruets have salt and do pepper cruets have pepper in them?' },
  { id: 'rld_25', number: 25, label: 'Are the cleaning equipment and agents readily available?' },
  { id: 'rld_26', number: 26, label: 'Is the music system working and is the volume set as per standard?' },
  { id: 'rld_27', number: 27, label: 'Is all required linen for service available and has communication with laundry been established?' },
  { id: 'rld_28', number: 28, label: 'Has laundry personnel been established for the shift?' },
  { id: 'rld_29', number: 29, label: 'Is all the equipment operational?' },
]

export const RESTAURANT_LUNCH_DINNER_TOTAL = RESTAURANT_LUNCH_DINNER_ITEMS.length  // 29

export type RestaurantLunchDinnerResponses = Record<string, boolean | null>

/** Returns { yesCount, totalAnswered, percentage } */
export function computeRestaurantLunchDinnerScores(responses: RestaurantLunchDinnerResponses) {
  const yesCount = RESTAURANT_LUNCH_DINNER_ITEMS.filter(i => responses[i.id] === true).length
  const totalAnswered = RESTAURANT_LUNCH_DINNER_ITEMS.filter(
    i => responses[i.id] !== null && responses[i.id] !== undefined
  ).length
  const percentage = RESTAURANT_LUNCH_DINNER_TOTAL > 0
    ? Math.round((yesCount / RESTAURANT_LUNCH_DINNER_TOTAL) * 10000) / 100
    : 0
  return { yesCount, totalAnswered, percentage }
}
