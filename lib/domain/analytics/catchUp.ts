import type { AnalyticsParams, CatchUpTarget } from './types'

export function calculateCatchUpTarget(
  repUnits: number,
  topPerformerUnits: number,
  params: AnalyticsParams
): CatchUpTarget {
  const gap = Math.max(0, topPerformerUnits - repUnits)
  const target_units = Math.ceil(repUnits + gap * params.gap_close_rate)
  const finalTarget = gap > 0 ? Math.max(target_units, repUnits + 1) : target_units

  return {
    current_units: repUnits,
    top_performer_units: topPerformerUnits,
    gap,
    gap_close_rate: params.gap_close_rate,
    target_units: finalTarget,
    delta_units: finalTarget - repUnits,
  }
}
