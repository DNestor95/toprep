import { calculateActivityRecommendations } from './activityRecs'
import { calculateCatchUpTarget } from './catchUp'
import { calculateCoreRates } from './coreRates'
import { calculateExpectedUnits } from './expectedUnits'
import { calculatePerformanceMetrics } from './performanceMetrics'
import { calculateSourceWeights } from './sourceWeights'
import { calculateStoreBaselines } from './storeBaselines'
import type { AnalyticsParams, RepAnalysisResult, RepData } from './types'

export function analyzePerformance(
  allRepData: RepData[],
  params: AnalyticsParams
): Map<string, RepAnalysisResult> {
  const results = new Map<string, RepAnalysisResult>()
  if (allRepData.length === 0) return results

  const sourceWeights = calculateSourceWeights(allRepData)
  const storeBaselines = calculateStoreBaselines(allRepData)
  const topPerformerUnits = Math.max(...allRepData.map((rep) => rep.units_sold))
  const sortedByUnits = [...allRepData].sort((a, b) => b.units_sold - a.units_sold)

  const topExpectedUnits = calculateExpectedUnits(
    sortedByUnits[0],
    sourceWeights,
    storeBaselines,
    params
  ).final_expected

  for (const repData of allRepData) {
    const coreRates = calculateCoreRates(repData)
    const expectedUnits = calculateExpectedUnits(repData, sourceWeights, storeBaselines, params)
    const catchUpTarget = calculateCatchUpTarget(repData.units_sold, topPerformerUnits, params)
    const activityRecommendations = calculateActivityRecommendations(
      repData,
      expectedUnits,
      catchUpTarget,
      sourceWeights,
      storeBaselines,
      params
    )

    const rank = sortedByUnits.findIndex((rep) => rep.rep_id === repData.rep_id) + 1
    const performanceMetrics = calculatePerformanceMetrics(
      repData.units_sold,
      topPerformerUnits,
      expectedUnits.final_expected,
      topExpectedUnits,
      repData.unique_leads_attempted,
      rank,
      params
    )

    results.set(repData.rep_id, {
      repData,
      coreRates,
      expectedUnits,
      catchUpTarget,
      activityRecommendations,
      performanceMetrics,
      sourceWeights,
      storeBaselines,
      isTopPerformer: rank === 1,
    })
  }

  return results
}
