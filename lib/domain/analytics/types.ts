export interface RepData {
  rep_id: string
  period: string
  units_sold: number
  leads_by_source: Record<string, number>
  unique_leads_attempted: number
  attempts: number
  contacts: number
  appointments_set: number
  appointments_show: number
  first_response_time_minutes?: number
  lead_age_days_at_first_contact?: number
  gross_profit?: number
}

export interface SourceWeights {
  [source: string]: number
}

export interface CoreRates {
  contact_rate: number
  appointment_set_rate: number
  show_rate: number
  close_from_show: number
  close_from_contact: number
}

export interface ExpectedUnits {
  base_expected: number
  contact_multiplier: number
  appointment_multiplier: number
  final_expected: number
}

export interface CatchUpTarget {
  current_units: number
  top_performer_units: number
  gap: number
  gap_close_rate: number
  target_units: number
  delta_units: number
}

export interface ActivityRecommendations {
  additional_leads_needed: Record<string, number>
  required_contact_rate: number
  additional_attempts_needed: number
  is_on_track: boolean
}

export interface PerformanceMetrics {
  performance_index: number
  balanced_score: number
  confidence_score: number
  rank: number
}

export interface AnalyticsParams {
  weights_window_days: number
  rolling_avg_months: number
  gap_close_rate: number
  contact_multiplier_bounds: [number, number]
  appointment_multiplier_bounds: [number, number]
  confidence_tau: number
  max_realistic_contact_rate: number
}

export type StoreBaselines = {
  contact_rate: number
  appointment_set_rate: number
}

export type RepAnalysisResult = {
  repData: RepData
  coreRates: CoreRates
  expectedUnits: ExpectedUnits
  catchUpTarget: CatchUpTarget
  activityRecommendations: ActivityRecommendations
  performanceMetrics: PerformanceMetrics
  sourceWeights: SourceWeights
  storeBaselines: StoreBaselines
  isTopPerformer: boolean
}
