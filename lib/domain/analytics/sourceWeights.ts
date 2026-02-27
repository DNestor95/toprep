import type { RepData, SourceWeights } from './types'
import { shrinkTowardPrior } from './smoothing'
import { clamp, sum } from './utils'

type Options = {
  iterations?: number
  prior_strength?: number
  min_weight?: number
  max_weight?: number
}

export function calculateSourceWeights(allRepData: RepData[], opts: Options = {}): SourceWeights {
  const iterations = opts.iterations ?? 6
  const priorStrength = opts.prior_strength ?? 50
  const minWeight = opts.min_weight ?? 0
  const maxWeight = opts.max_weight ?? 2

  const sources = new Set<string>()
  let totalLeads = 0
  let totalUnits = 0
  const leadsBySourceTotals: Record<string, number> = {}

  for (const rep of allRepData) {
    totalUnits += rep.units_sold
    const repLeads = sum(Object.values(rep.leads_by_source))
    totalLeads += repLeads

    for (const [source, leads] of Object.entries(rep.leads_by_source)) {
      sources.add(source)
      leadsBySourceTotals[source] = (leadsBySourceTotals[source] ?? 0) + leads
    }
  }

  const globalRate = totalLeads > 0 ? totalUnits / totalLeads : 0

  const weights: SourceWeights = {}
  for (const source of sources) {
    weights[source] = globalRate
  }

  const predictUnits = (rep: RepData): number => {
    let predictedUnits = 0
    for (const [source, leads] of Object.entries(rep.leads_by_source)) {
      predictedUnits += leads * (weights[source] ?? globalRate)
    }
    return predictedUnits
  }

  for (let iteration = 0; iteration < iterations; iteration++) {
    const numerator: Record<string, number> = {}
    const denominator: Record<string, number> = {}

    for (const rep of allRepData) {
      const predictedUnits = predictUnits(rep)
      if (predictedUnits <= 0) continue

      const scale = rep.units_sold / predictedUnits

      for (const [source, leads] of Object.entries(rep.leads_by_source)) {
        if (leads <= 0) continue
        numerator[source] = (numerator[source] ?? 0) + leads * scale
        denominator[source] = (denominator[source] ?? 0) + leads
      }
    }

    for (const source of sources) {
      const sourceDenominator = denominator[source] ?? 0

      if (sourceDenominator <= 0) {
        weights[source] = globalRate
        continue
      }

      const averageScale = (numerator[source] ?? 0) / sourceDenominator
      const updatedWeight = (weights[source] ?? globalRate) * averageScale

      const leadsForSource = leadsBySourceTotals[source] ?? 0
      const smoothedWeight = shrinkTowardPrior(
        updatedWeight,
        leadsForSource,
        globalRate,
        priorStrength
      )

      weights[source] = clamp(smoothedWeight, minWeight, maxWeight)
    }
  }

  return weights
}
