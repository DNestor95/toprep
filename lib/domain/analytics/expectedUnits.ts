import { calculateCoreRates } from './coreRates'
import type {
  AnalyticsParams,
  ExpectedUnits,
  RepData,
  SourceWeights,
  StoreBaselines,
} from './types'
import { clamp } from './utils'

export function calculateExpectedUnits(
  repData: RepData,
  sourceWeights: SourceWeights,
  storeBaselines: StoreBaselines,
  params: AnalyticsParams
): ExpectedUnits {
  const base_expected = Object.entries(repData.leads_by_source).reduce(
    (acc, [source, leads]) => acc + leads * (sourceWeights[source] || 0),
    0
  )

  const repRates = calculateCoreRates(repData)

  const contact_multiplier = clamp(
    storeBaselines.contact_rate > 0 ? repRates.contact_rate / storeBaselines.contact_rate : 1,
    params.contact_multiplier_bounds[0],
    params.contact_multiplier_bounds[1]
  )

  const appointment_multiplier = clamp(
    storeBaselines.appointment_set_rate > 0
      ? repRates.appointment_set_rate / storeBaselines.appointment_set_rate
      : 1,
    params.appointment_multiplier_bounds[0],
    params.appointment_multiplier_bounds[1]
  )

  const final_expected = base_expected * contact_multiplier * appointment_multiplier

  return {
    base_expected,
    contact_multiplier,
    appointment_multiplier,
    final_expected,
  }
}
