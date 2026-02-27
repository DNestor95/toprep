import type { CoreRates, RepData } from './types'
import { safeDivide } from './utils'

export function calculateCoreRates(repData: RepData): CoreRates {
  return {
    contact_rate: safeDivide(repData.contacts, repData.unique_leads_attempted),
    appointment_set_rate: safeDivide(repData.appointments_set, repData.contacts),
    show_rate: safeDivide(repData.appointments_show, repData.appointments_set),
    close_from_show: safeDivide(repData.units_sold, repData.appointments_show),
    close_from_contact: safeDivide(repData.units_sold, repData.contacts),
  }
}
