import type { SupabaseClient } from '@supabase/supabase-js'
import { computeNextBestAction } from '@/lib/domain/forecast/computeNextBestAction'
import { computeProjectedUnits } from '@/lib/domain/forecast/computeProjectedUnits'
import { computeQuotaProbability } from '@/lib/domain/forecast/computeQuotaProbability'
import type { RepMonthStats } from '@/lib/domain/forecast/types'

type RecomputeInput = {
  repId: string
  quotaUnits: number
  monthDate?: Date
}

type RecomputeResult = {
  month: string
  projectedUnits: number
  quotaHitProbability: number
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function startOfNextMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
}

function formatMonthDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function getDaysInMonth(date: Date): number {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate()
}

export async function recomputeRepMonthForecast(
  supabase: SupabaseClient,
  input: RecomputeInput
): Promise<RecomputeResult | null> {
  const monthDate = input.monthDate ?? new Date()
  const monthStart = startOfMonth(monthDate)
  const monthEnd = startOfNextMonth(monthDate)
  const monthKey = formatMonthDate(monthStart)

  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select('status, created_at')
    .eq('sales_rep_id', input.repId)
    .gte('created_at', monthStart.toISOString())
    .lt('created_at', monthEnd.toISOString())

  if (dealsError) {
    console.warn('forecast recompute deals query failed', dealsError.message)
    return null
  }

  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select('outcome, completed_at')
    .eq('sales_rep_id', input.repId)
    .gte('completed_at', monthStart.toISOString())
    .lt('completed_at', monthEnd.toISOString())

  if (activitiesError) {
    console.warn('forecast recompute activities query failed', activitiesError.message)
    return null
  }

  const leads = deals?.length ?? 0
  const soldUnits = (deals ?? []).filter((deal) => deal.status === 'closed_won').length

  const contactOutcomes = new Set(['connected', 'appt_set', 'showed', 'sold', 'negotiating', 'follow_up'])
  const contacts = (activities ?? []).filter((activity) => contactOutcomes.has(activity.outcome ?? '')).length
  const apptsSet = (activities ?? []).filter((activity) => activity.outcome === 'appt_set').length
  const apptsShow = (activities ?? []).filter((activity) => activity.outcome === 'showed').length

  const closeRate = apptsShow > 0 ? soldUnits / apptsShow : 0
  const contactRate = leads > 0 ? contacts / leads : 0

  const stats: RepMonthStats = {
    rep_id: input.repId,
    month: monthKey,
    leads,
    contacts,
    appts_set: apptsSet,
    appts_show: apptsShow,
    sold_units: soldUnits,
    close_rate: closeRate,
    contact_rate: contactRate,
  }

  const { error: statsUpsertError } = await supabase
    .from('rep_month_stats')
    .upsert(
      {
        rep_id: stats.rep_id,
        month: stats.month,
        leads: stats.leads,
        contacts: stats.contacts,
        appts_set: stats.appts_set,
        appts_show: stats.appts_show,
        sold_units: stats.sold_units,
        close_rate: stats.close_rate,
        contact_rate: stats.contact_rate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'rep_id,month' }
    )

  if (statsUpsertError) {
    console.warn('forecast recompute rep_month_stats upsert failed', statsUpsertError.message)
    return null
  }

  const today = new Date()
  const isCurrentMonth =
    today.getUTCFullYear() === monthDate.getUTCFullYear() &&
    today.getUTCMonth() === monthDate.getUTCMonth()

  const daysInMonth = getDaysInMonth(monthDate)
  const dayOfMonth = isCurrentMonth ? Math.max(1, today.getUTCDate()) : daysInMonth
  const daysRemaining = Math.max(0, daysInMonth - dayOfMonth)

  const leadsPerDay = dayOfMonth > 0 ? leads / dayOfMonth : 0
  const leadsRemaining = Math.max(0, Math.round(leadsPerDay * daysRemaining))
  const closeProbability = contacts > 0 ? soldUnits / contacts : 0

  const projectedUnits = computeProjectedUnits({
    soldUnitsSoFar: soldUnits,
    leadsSoFar: leads,
    closeRate: closeProbability,
    dayOfMonth,
    daysInMonth,
  })

  const quotaHitProbability = computeQuotaProbability({
    quotaUnits: input.quotaUnits,
    soldUnitsSoFar: soldUnits,
    leadsRemaining,
    closeProbability,
  })

  const expectedFutureDeals = leadsRemaining * closeProbability
  const nextBestAction = computeNextBestAction(stats, quotaHitProbability, projectedUnits, input.quotaUnits)

  const { error: forecastUpsertError } = await supabase
    .from('rep_month_forecast')
    .upsert(
      {
        rep_id: input.repId,
        month: monthKey,
        quota_units: input.quotaUnits,
        projected_units: projectedUnits,
        quota_hit_probability: quotaHitProbability,
        expected_future_deals: expectedFutureDeals,
        next_best_action: nextBestAction,
        model_version: 'v1-binomial',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'rep_id,month' }
    )

  if (forecastUpsertError) {
    console.warn('forecast recompute rep_month_forecast upsert failed', forecastUpsertError.message)
    return null
  }

  return {
    month: monthKey,
    projectedUnits,
    quotaHitProbability,
  }
}
