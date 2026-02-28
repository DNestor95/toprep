import type { CoreRates, RepData } from './types'
import { safeDivide } from './utils'

export function calculateCoreRates(repData: RepData): CoreRates {
  const closeFromShow = safeDivide(repData.units_sold, repData.appointments_show)
  const closeFromContact = safeDivide(repData.units_sold, repData.contacts)

  return {
    contact_rate: safeDivide(repData.contacts, repData.unique_leads_attempted),
    appointment_set_rate: safeDivide(repData.appointments_set, repData.contacts),
    show_rate: safeDivide(repData.appointments_show, repData.appointments_set),
    close_from_show: Math.max(0, Math.min(1, closeFromShow)),
    close_from_contact: Math.max(0, Math.min(1, closeFromContact)),
  }
}
