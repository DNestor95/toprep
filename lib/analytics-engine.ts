import { analyzePerformance } from './domain/analytics/analyzePerformance'
import type { AnalyticsParams, RepAnalysisResult, RepData } from './domain/analytics/types'

const DEFAULT_PARAMS: AnalyticsParams = {
  weights_window_days: 90,
  rolling_avg_months: 3,
  gap_close_rate: 0.25,
  contact_multiplier_bounds: [0.8, 1.25],
  appointment_multiplier_bounds: [0.85, 1.2],
  confidence_tau: 50,
  max_realistic_contact_rate: 0.85,
}

export class SalesAnalyticsEngine {
  private params: AnalyticsParams

  constructor(params?: Partial<AnalyticsParams>) {
    this.params = {
      ...DEFAULT_PARAMS,
      ...(params ?? {}),
    }
  }

  analyzePerformance(allRepData: RepData[]): Map<string, RepAnalysisResult> {
    return analyzePerformance(allRepData, this.params)
  }
}

export type {
  ActivityRecommendations,
  AnalyticsParams,
  CatchUpTarget,
  CoreRates,
  ExpectedUnits,
  PerformanceMetrics,
  RepAnalysisResult,
  RepData,
  SourceWeights,
  StoreBaselines,
} from './domain/analytics/types'
