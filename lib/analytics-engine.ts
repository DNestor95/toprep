// SALES ANALYTICS ENGINE - Implements the complete algorithm set
// Based on the specification for predictive performance and catch-up modeling

interface RepData {
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

interface SourceWeights {
  [source: string]: number // w_s = expected units per lead from source s
}

interface CoreRates {
  contact_rate: number // CR = contacts / unique_leads_attempted
  appointment_set_rate: number // ASR = appointments_set / contacts  
  show_rate: number // SR = appointments_show / appointments_set
  close_from_show: number // units_sold / appointments_show
  close_from_contact: number // units_sold / contacts
}

interface ExpectedUnits {
  base_expected: number // EU_base from lead mix
  contact_multiplier: number // M_contact (behavior adjustment)
  appointment_multiplier: number // M_appt (behavior adjustment)
  final_expected: number // EU_rep final calculated
}

interface CatchUpTarget {
  current_units: number
  top_performer_units: number
  gap: number
  gap_close_rate: number
  target_units: number
  delta_units: number
}

interface ActivityRecommendations {
  additional_leads_needed: Record<string, number>
  required_contact_rate: number
  additional_attempts_needed: number
  is_on_track: boolean
}

interface PerformanceMetrics {
  performance_index: number // relative to top performer
  balanced_score: number // combination of units + expected units
  confidence_score: number // based on sample size
  rank: number
}

interface AnalyticsParams {
  weights_window_days: number
  rolling_avg_months: number
  gap_close_rate: number
  contact_multiplier_bounds: [number, number]
  appointment_multiplier_bounds: [number, number]
  confidence_tau: number
  max_realistic_contact_rate: number
}

export class SalesAnalyticsEngine {
  private params: AnalyticsParams

  constructor(params?: Partial<AnalyticsParams>) {
    // Default parameters from specification
    this.params = {
      weights_window_days: 90,
      rolling_avg_months: 3,
      gap_close_rate: 0.25,
      contact_multiplier_bounds: [0.80, 1.25],
      appointment_multiplier_bounds: [0.85, 1.20],
      confidence_tau: 50,
      max_realistic_contact_rate: 0.85,
      ...params
    }
  }

  // ALGORITHM SET A: CORE RATES
  calculateCoreRates(repData: RepData): CoreRates {
    const safeDivide = (numerator: number, denominator: number): number => {
      return denominator === 0 ? 0 : numerator / denominator
    }

    return {
      contact_rate: safeDivide(repData.contacts, repData.unique_leads_attempted),
      appointment_set_rate: safeDivide(repData.appointments_set, repData.contacts),
      show_rate: safeDivide(repData.appointments_show, repData.appointments_set),
      close_from_show: safeDivide(repData.units_sold, repData.appointments_show),
      close_from_contact: safeDivide(repData.units_sold, repData.contacts)
    }
  }

  // ALGORITHM SET B: EXPECTED UNITS MODEL
  calculateSourceWeights(allRepData: RepData[]): SourceWeights {
    const weights: SourceWeights = {}
    const sourceTotals: Record<string, { leads: number; units: number }> = {}

    // Aggregate store-wide data by source
    for (const repData of allRepData) {
      for (const [source, leads] of Object.entries(repData.leads_by_source)) {
        if (!sourceTotals[source]) {
          sourceTotals[source] = { leads: 0, units: 0 }
        }
        sourceTotals[source].leads += leads
        sourceTotals[source].units += repData.units_sold * (leads / Object.values(repData.leads_by_source).reduce((a, b) => a + b, 0))
      }
    }

    // Calculate w_s = expected units per lead from source s
    for (const [source, totals] of Object.entries(sourceTotals)) {
      weights[source] = totals.leads > 0 ? totals.units / totals.leads : 0
    }

    return weights
  }

  calculateStoreBaselines(allRepData: RepData[]): { contact_rate: number; appointment_set_rate: number } {
    const totals = allRepData.reduce(
      (acc, rep) => ({
        unique_leads_attempted: acc.unique_leads_attempted + rep.unique_leads_attempted,
        contacts: acc.contacts + rep.contacts,
        appointments_set: acc.appointments_set + rep.appointments_set
      }),
      { unique_leads_attempted: 0, contacts: 0, appointments_set: 0 }
    )

    return {
      contact_rate: totals.unique_leads_attempted > 0 ? totals.contacts / totals.unique_leads_attempted : 0,
      appointment_set_rate: totals.contacts > 0 ? totals.appointments_set / totals.contacts : 0
    }
  }

  calculateExpectedUnits(
    repData: RepData, 
    sourceWeights: SourceWeights, 
    storeBaselines: { contact_rate: number; appointment_set_rate: number }
  ): ExpectedUnits {
    // B2) Base Expected Units from lead mix
    const base_expected = Object.entries(repData.leads_by_source)
      .reduce((sum, [source, leads]) => sum + (leads * (sourceWeights[source] || 0)), 0)

    // B3) Behavior multipliers
    const repRates = this.calculateCoreRates(repData)
    
    const contact_multiplier = this.clamp(
      storeBaselines.contact_rate > 0 ? repRates.contact_rate / storeBaselines.contact_rate : 1,
      this.params.contact_multiplier_bounds[0],
      this.params.contact_multiplier_bounds[1]
    )

    const appointment_multiplier = this.clamp(
      storeBaselines.appointment_set_rate > 0 ? repRates.appointment_set_rate / storeBaselines.appointment_set_rate : 1,
      this.params.appointment_multiplier_bounds[0],
      this.params.appointment_multiplier_bounds[1]
    )

    const final_expected = base_expected * contact_multiplier * appointment_multiplier

    return {
      base_expected,
      contact_multiplier,
      appointment_multiplier,
      final_expected
    }
  }

  // ALGORITHM SET C: CATCH-UP TARGET
  calculateCatchUpTarget(
    repUnits: number, 
    topPerformerUnits: number
  ): CatchUpTarget {
    const gap = Math.max(0, topPerformerUnits - repUnits)
    const target_units = Math.ceil(repUnits + (gap * this.params.gap_close_rate))
    
    // Enforce minimum improvement if behind
    const final_target = gap > 0 ? Math.max(target_units, repUnits + 1) : target_units
    
    return {
      current_units: repUnits,
      top_performer_units: topPerformerUnits,
      gap,
      gap_close_rate: this.params.gap_close_rate,
      target_units: final_target,
      delta_units: final_target - repUnits
    }
  }

  // ALGORITHM SET D: ACTIVITY RECOMMENDATIONS
  calculateActivityRecommendations(
    repData: RepData,
    expectedUnits: ExpectedUnits,
    catchUpTarget: CatchUpTarget,
    sourceWeights: SourceWeights,
    storeBaselines: { contact_rate: number; appointment_set_rate: number }
  ): ActivityRecommendations {
    const deltaUnits = catchUpTarget.delta_units
    
    if (deltaUnits <= 0) {
      return {
        additional_leads_needed: {},
        required_contact_rate: this.calculateCoreRates(repData).contact_rate,
        additional_attempts_needed: 0,
        is_on_track: true
      }
    }

    // D1) Additional leads needed by source
    const additional_leads_needed: Record<string, number> = {}
    const sortedSources = Object.entries(sourceWeights)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3) // Top 3 sources

    for (const [source, weight] of sortedSources) {
      if (weight > 0) {
        const multiplier = expectedUnits.contact_multiplier * expectedUnits.appointment_multiplier
        additional_leads_needed[source] = Math.ceil(deltaUnits / (weight * multiplier))
      }
    }

    // D2) Required contact rate
    const base_multiplier = expectedUnits.base_expected * expectedUnits.appointment_multiplier
    const required_contact_multiplier = base_multiplier > 0 ? catchUpTarget.target_units / base_multiplier : 1
    const required_contact_rate = Math.min(
      storeBaselines.contact_rate * required_contact_multiplier,
      this.params.max_realistic_contact_rate
    )

    // D3) Additional attempts needed
    const current_contact_rate = this.calculateCoreRates(repData).contact_rate
    const contact_efficiency = repData.attempts > 0 ? repData.contacts / repData.attempts : 0.1
    
    const additional_contacts = Math.max(0, 
      (required_contact_rate - current_contact_rate) * repData.unique_leads_attempted
    )
    
    const additional_attempts_needed = contact_efficiency > 0 ? 
      Math.ceil(additional_contacts / contact_efficiency) : 0

    return {
      additional_leads_needed,
      required_contact_rate,
      additional_attempts_needed,
      is_on_track: false
    }
  }

  // ALGORITHM SET E: LEADER ADVANTAGE
  calculateConfidenceScore(opportunities: number): number {
    return 1 - Math.exp(-opportunities / this.params.confidence_tau)
  }

  // ALGORITHM SET F: SCOREBOARD
  calculatePerformanceMetrics(
    repUnits: number,
    topUnits: number,
    repExpectedUnits: number,
    topExpectedUnits: number,
    opportunities: number,
    rank: number
  ): PerformanceMetrics {
    const performance_index = topUnits > 0 ? repUnits / topUnits : 0
    
    const balanced_score = topUnits > 0 && topExpectedUnits > 0 ? 
      0.6 * (repUnits / topUnits) + 0.4 * (repExpectedUnits / topExpectedUnits) : 0
    
    const confidence_score = this.calculateConfidenceScore(opportunities)

    return {
      performance_index,
      balanced_score,
      confidence_score,
      rank
    }
  }

  // Helper function for clamping values
  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value))
  }

  // Main analysis function that runs all algorithms
  analyzePerformance(allRepData: RepData[]): Map<string, any> {
    const results = new Map()

    // Calculate store-wide metrics
    const sourceWeights = this.calculateSourceWeights(allRepData)
    const storeBaselines = this.calculateStoreBaselines(allRepData)

    // Find top performer
    const topPerformerUnits = Math.max(...allRepData.map(rep => rep.units_sold))

    // Analyze each rep
    for (const repData of allRepData) {
      const coreRates = this.calculateCoreRates(repData)
      const expectedUnits = this.calculateExpectedUnits(repData, sourceWeights, storeBaselines)
      const catchUpTarget = this.calculateCatchUpTarget(repData.units_sold, topPerformerUnits)
      const activityRecommendations = this.calculateActivityRecommendations(
        repData, expectedUnits, catchUpTarget, sourceWeights, storeBaselines
      )

      // Calculate rank and performance metrics
      const sortedReps = [...allRepData].sort((a, b) => b.units_sold - a.units_sold)
      const rank = sortedReps.findIndex(rep => rep.rep_id === repData.rep_id) + 1
      
      const topExpectedUnits = this.calculateExpectedUnits(
        sortedReps[0], sourceWeights, storeBaselines
      ).final_expected

      const performanceMetrics = this.calculatePerformanceMetrics(
        repData.units_sold,
        topPerformerUnits,
        expectedUnits.final_expected,
        topExpectedUnits,
        repData.unique_leads_attempted,
        rank
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
        isTopPerformer: rank === 1
      })
    }

    return results
  }
}