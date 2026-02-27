import type { AnalyticsParams, PerformanceMetrics } from './types'

export function calculateConfidenceScore(opportunities: number, params: AnalyticsParams): number {
  return 1 - Math.exp(-opportunities / params.confidence_tau)
}

export function calculatePerformanceMetrics(
  repUnits: number,
  topUnits: number,
  repExpectedUnits: number,
  topExpectedUnits: number,
  opportunities: number,
  rank: number,
  params: AnalyticsParams
): PerformanceMetrics {
  const performance_index = topUnits > 0 ? repUnits / topUnits : 0

  const balanced_score =
    topUnits > 0 && topExpectedUnits > 0
      ? 0.6 * (repUnits / topUnits) + 0.4 * (repExpectedUnits / topExpectedUnits)
      : 0

  const confidence_score = calculateConfidenceScore(opportunities, params)

  return {
    performance_index,
    balanced_score,
    confidence_score,
    rank,
  }
}
