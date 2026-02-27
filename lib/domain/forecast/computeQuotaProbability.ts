import type { QuotaProbabilityInput } from './types'

function binomialProbabilityMass(trials: number, successes: number, probability: number): number {
  if (successes < 0 || successes > trials) return 0
  if (probability <= 0) return successes === 0 ? 1 : 0
  if (probability >= 1) return successes === trials ? 1 : 0

  const q = 1 - probability

  let combination = 1
  for (let i = 1; i <= successes; i++) {
    combination = (combination * (trials - successes + i)) / i
  }

  return combination * Math.pow(probability, successes) * Math.pow(q, trials - successes)
}

export function computeQuotaProbability(input: QuotaProbabilityInput): number {
  const closeProbability = Math.max(0, Math.min(1, input.closeProbability))
  const remainingToQuota = Math.max(0, input.quotaUnits - input.soldUnitsSoFar)

  if (remainingToQuota <= 0) return 1
  if (input.leadsRemaining <= 0) return 0
  if (remainingToQuota > input.leadsRemaining) return 0

  let probability = 0
  for (let deals = remainingToQuota; deals <= input.leadsRemaining; deals++) {
    probability += binomialProbabilityMass(input.leadsRemaining, deals, closeProbability)
  }

  return Math.max(0, Math.min(1, probability))
}
