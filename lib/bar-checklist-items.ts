// Bar Checklist — Rainbow Tourism Group
// Each item is answered YES (true) or NO (false)
// Note: Original form skips item 19 — numbering preserved from the source document.

export interface BarChecklistItem {
  id: string
  number: number   // original numbering from the form
  label: string
}

export const BAR_CHECKLIST_ITEMS: BarChecklistItem[] = [
  { id: 'bc_1',  number: 1,  label: 'Did you read the hand over book and action?' },
  { id: 'bc_2',  number: 2,  label: 'Have you been given a full hand over by the outgoing bar attendant?' },
  { id: 'bc_3',  number: 3,  label: 'Are the bar floor, bar counter, fridges and cupboards clean at all times?' },
  { id: 'bc_4',  number: 4,  label: 'Are the cupboards and fridges packed as per standard?' },
  { id: 'bc_5',  number: 5,  label: 'Do you have sufficient service stocks?' },
  { id: 'bc_6',  number: 6,  label: 'Are the lights working and bulbs replaced?' },
  { id: 'bc_7',  number: 7,  label: 'Do you have sufficient beverage stocks?' },
  { id: 'bc_8',  number: 8,  label: 'Have you laid the bar display as per standard?' },
  { id: 'bc_9',  number: 9,  label: 'Have you checked on availability of stocks?' },
  { id: 'bc_10', number: 10, label: 'Do you have any out-of-stock items?' },
  { id: 'bc_11', number: 11, label: 'Have you checked whether the phones are working?' },
  { id: 'bc_12', number: 12, label: 'Have you checked whether the POS machine is functioning properly?' },
  { id: 'bc_13', number: 13, label: 'Do you have sufficient stationery, guest supplies, cleaning supplies etc.?' },
  { id: 'bc_14', number: 14, label: 'Have you ordered enough fruits for garnishes?' },
  { id: 'bc_15', number: 15, label: 'Has backup mis-en-place been done?' },
  { id: 'bc_16', number: 16, label: 'Have you checked whether the fridges and under bars are properly functioning?' },
  { id: 'bc_17', number: 17, label: 'Has the furniture around the bar been cleaned and polished?' },
  { id: 'bc_18', number: 18, label: 'Are the fridges well stocked?' },
  // Item 19 is absent from the original source document
  { id: 'bc_20', number: 20, label: 'Is the music system working and is the volume set as per standard?' },
  { id: 'bc_21', number: 21, label: 'Do you have sufficient ice for the shift?' },
  { id: 'bc_22', number: 22, label: 'Have you checked on all bar associate grooming?' },
  { id: 'bc_23', number: 23, label: 'Do you have the stock sheets for all mini bar fridges?' },
]

export const BAR_CHECKLIST_TOTAL = BAR_CHECKLIST_ITEMS.length  // 22

export type BarChecklistResponses = Record<string, boolean | null>

/** Returns { yesCount, totalAnswered, percentage } */
export function computeBarScores(responses: BarChecklistResponses) {
  const yesCount = BAR_CHECKLIST_ITEMS.filter(i => responses[i.id] === true).length
  const totalAnswered = BAR_CHECKLIST_ITEMS.filter(i => responses[i.id] !== null && responses[i.id] !== undefined).length
  const percentage = BAR_CHECKLIST_TOTAL > 0
    ? Math.round((yesCount / BAR_CHECKLIST_TOTAL) * 10000) / 100
    : 0
  return { yesCount, totalAnswered, percentage }
}
