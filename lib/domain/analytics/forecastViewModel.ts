import type {
  ActivityRecommendations,
  CatchUpTarget,
  CoreRates,
  ExpectedUnits,
  PerformanceMetrics,
  SourceWeights,
  StoreBaselines,
} from './types'

export interface ForecastViewModel {
  expectedUnits: ExpectedUnits
  coreRates: CoreRates
  performanceMetrics: PerformanceMetrics
  sourceWeights: SourceWeights
  storeBaselines: StoreBaselines
  actualUnits: number
  leadsBreakdown: Record<string, number>
  catchUpTarget: CatchUpTarget
  activityRecommendations: ActivityRecommendations
  isTopPerformer: boolean
  hasAdvancedAccess: boolean
  advancedAccessTopN: number
  rank: number
  performanceIndex: number
  confidenceScore: number
  defenseTarget: number
  currentUnits: number
}
