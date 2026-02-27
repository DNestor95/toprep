import type { ProjectionInput } from './types'

export function computeProjectedUnits(input: ProjectionInput): number {
  const daysElapsed = Math.max(1, Math.min(input.dayOfMonth, input.daysInMonth))
  const daysRemaining = Math.max(0, input.daysInMonth - daysElapsed)

  const leadsPerDay = input.leadsSoFar / daysElapsed
  const projectedRemainingLeads = leadsPerDay * daysRemaining
  const expectedFutureDeals = projectedRemainingLeads * Math.max(0, Math.min(1, input.closeRate))

  return input.soldUnitsSoFar + expectedFutureDeals
}
