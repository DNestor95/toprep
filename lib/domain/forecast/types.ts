export interface RepMonthStats {
  rep_id: string
  month: string
  leads: number
  contacts: number
  appts_set: number
  appts_show: number
  sold_units: number
  close_rate: number
  contact_rate: number
}

export interface ProjectionInput {
  soldUnitsSoFar: number
  leadsSoFar: number
  closeRate: number
  dayOfMonth: number
  daysInMonth: number
}

export interface QuotaProbabilityInput {
  quotaUnits: number
  soldUnitsSoFar: number
  leadsRemaining: number
  closeProbability: number
}

export interface NextBestAction {
  focus: 'increase_leads' | 'improve_contact_rate' | 'improve_show_rate' | 'maintain_pace'
  message: string
  targetDelta: number
}
