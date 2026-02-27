import type { RepData, StoreBaselines } from './types'
import { safeDivide } from './utils'

export function calculateStoreBaselines(allRepData: RepData[]): StoreBaselines {
  const totals = allRepData.reduce(
    (acc, rep) => ({
      unique_leads_attempted: acc.unique_leads_attempted + rep.unique_leads_attempted,
      contacts: acc.contacts + rep.contacts,
      appointments_set: acc.appointments_set + rep.appointments_set,
    }),
    { unique_leads_attempted: 0, contacts: 0, appointments_set: 0 }
  )

  return {
    contact_rate: safeDivide(totals.contacts, totals.unique_leads_attempted),
    appointment_set_rate: safeDivide(totals.appointments_set, totals.contacts),
  }
}
