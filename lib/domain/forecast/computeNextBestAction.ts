import type { NextBestAction, RepMonthStats } from './types'

export function computeNextBestAction(
  stats: RepMonthStats,
  quotaHitProbability: number,
  projectedUnits: number,
  quotaUnits: number
): NextBestAction {
  if (quotaHitProbability >= 0.75) {
    return {
      focus: 'maintain_pace',
      message: 'You are on track. Maintain current cadence and protect show quality.',
      targetDelta: Math.max(0, Math.round(projectedUnits - quotaUnits)),
    }
  }

  if (stats.contact_rate < 0.45) {
    return {
      focus: 'improve_contact_rate',
      message: 'Prioritize first-response speed and same-day follow-up to lift contact rate.',
      targetDelta: Math.ceil((0.45 - stats.contact_rate) * Math.max(1, stats.leads)),
    }
  }

  const showRate = stats.appts_set > 0 ? stats.appts_show / stats.appts_set : 0
  if (showRate < 0.6) {
    return {
      focus: 'improve_show_rate',
      message: 'Confirm appointments twice and tighten pre-appointment reminders to improve shows.',
      targetDelta: Math.ceil((0.6 - showRate) * Math.max(1, stats.appts_set)),
    }
  }

  return {
    focus: 'increase_leads',
    message: 'Top lever now is additional lead volume from your highest converting channels.',
    targetDelta: Math.max(1, Math.ceil(quotaUnits - projectedUnits)),
  }
}
