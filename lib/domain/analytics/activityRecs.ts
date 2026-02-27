import { calculateCoreRates } from './coreRates'
import type {
  ActivityRecommendations,
  AnalyticsParams,
  CatchUpTarget,
  ExpectedUnits,
  RepData,
  SourceWeights,
  StoreBaselines,
} from './types'

export function calculateActivityRecommendations(
  repData: RepData,
  expectedUnits: ExpectedUnits,
  catchUpTarget: CatchUpTarget,
  sourceWeights: SourceWeights,
  storeBaselines: StoreBaselines,
  params: AnalyticsParams
): ActivityRecommendations {
  const deltaUnits = catchUpTarget.delta_units

  if (deltaUnits <= 0) {
    return {
      additional_leads_needed: {},
      required_contact_rate: calculateCoreRates(repData).contact_rate,
      additional_attempts_needed: 0,
      is_on_track: true,
    }
  }

  const additional_leads_needed: Record<string, number> = {}
  const sortedSources = Object.entries(sourceWeights)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  for (const [source, weight] of sortedSources) {
    if (weight <= 0) continue
    const multiplier = expectedUnits.contact_multiplier * expectedUnits.appointment_multiplier
    additional_leads_needed[source] = Math.ceil(deltaUnits / (weight * multiplier))
  }

  const baseMultiplier = expectedUnits.base_expected * expectedUnits.appointment_multiplier
  const requiredContactMultiplier =
    baseMultiplier > 0 ? catchUpTarget.target_units / baseMultiplier : 1

  const required_contact_rate = Math.min(
    storeBaselines.contact_rate * requiredContactMultiplier,
    params.max_realistic_contact_rate
  )

  const currentContactRate = calculateCoreRates(repData).contact_rate
  const contactEfficiency = repData.attempts > 0 ? repData.contacts / repData.attempts : 0.1

  const additionalContacts = Math.max(
    0,
    (required_contact_rate - currentContactRate) * repData.unique_leads_attempted
  )

  const additional_attempts_needed =
    contactEfficiency > 0 ? Math.ceil(additionalContacts / contactEfficiency) : 0

  return {
    additional_leads_needed,
    required_contact_rate,
    additional_attempts_needed,
    is_on_track: false,
  }
}
