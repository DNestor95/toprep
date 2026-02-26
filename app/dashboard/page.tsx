import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import KPICards from '@/components/KPICards'
import RecentActivities from '@/components/RecentActivities'
import PacingTracker from '@/components/PacingTracker'
import DailyGoals from '@/components/DailyGoals'
import ManagerDashboardView from '@/components/ManagerDashboardView'

type RankBy = 'won_units' | 'revenue'
type RangeFilter = 'all' | 'mtd' | '7d' | '14d' | '30d'

function parseRankBy(value?: string | null): RankBy {
  return value === 'revenue' ? 'revenue' : 'won_units'
}

function parseRange(value?: string | null): RangeFilter {
  if (value === 'all' || value === 'mtd' || value === '7d' || value === '14d' || value === '30d') return value
  return 'all'
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams?: { range?: string; repId?: string; source?: string }
}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Fetch user profile - simplified query to avoid RLS issues
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role')
    .eq('id', session.user.id)
    .maybeSingle()

  const { data: allProfiles } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role')

  const { data: rankSetting } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'leaderboard_rank_by')
    .maybeSingle()

  const managerRankBy: RankBy = parseRankBy(rankSetting?.value)

  console.log('Profile fetch result:', { profile, profileError })

  // Fetch user's deals - simplified query 
  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select(`
      id,
      customer_name,
      deal_amount,
      gross_profit,
      status,
      source,
      close_date,
      created_at,
      sales_rep_id
    `)
    .order('created_at', { ascending: false })

  console.log('Deals fetch result:', { dealsCount: deals?.length, dealsError })

  // Fetch user's activities for pacing tracker
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select(`
      id,
      deal_id,
      activity_type,
      description,
      scheduled_at,
      completed_at,
      sales_rep_id
    `)
    .order('completed_at', { ascending: false })

  console.log('Activities fetch result:', { activitiesCount: activities?.length, activitiesError })

  // Filter activities based on user role
  let userActivities = activities || []
  if (profile?.role === 'sales_rep') {
    userActivities = activities?.filter(activity => activity.sales_rep_id === session.user.id) || []
  }

  console.log('Filtered activities for user:', userActivities.length)

  // Filter deals based on user role (since RLS might be having issues)
  let userDeals = deals || []
  if (profile?.role === 'sales_rep') {
    userDeals = deals?.filter(deal => deal.sales_rep_id === session.user.id) || []
  }

  console.log('Filtered deals for user:', userDeals.length)

  // Calculate KPIs - Use broader date range to show data
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  
  // Get deals from current month OR recent deals if no current month data
  let mtdDeals = userDeals.filter(deal => {
    const dealDate = new Date(deal.created_at)
    return dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear
  })

  // If no MTD data, use last 30 days or all deals as fallback
  if (mtdDeals.length === 0) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    mtdDeals = userDeals.filter(deal => {
      const dealDate = new Date(deal.created_at)
      return dealDate >= thirtyDaysAgo
    })
  }

  // If still no data, just show all deals for demo
  if (mtdDeals.length === 0) {
    mtdDeals = userDeals
  }

  console.log('MTD/Recent deals:', mtdDeals.length)

  const closedWonDeals = mtdDeals.filter(deal => deal.status === 'closed_won')

  const mtdRevenue = closedWonDeals.reduce((sum, deal) => {
    return sum + (parseFloat(deal.deal_amount) || 0)
  }, 0)

  const mtdGross = closedWonDeals.reduce((sum, deal) => {
    return sum + (parseFloat(deal.gross_profit) || 0)
  }, 0)

  const isManager = profile?.role === 'manager' || profile?.role === 'admin'

  const parseDate = (value?: string | null) => (value ? new Date(value) : null)
  const now = new Date()
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const endOfToday = new Date(startOfToday)
  endOfToday.setDate(endOfToday.getDate() + 1)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const selectedRange = parseRange(searchParams?.range)
  const selectedRepId = searchParams?.repId || 'all'
  const selectedSource = (searchParams?.source || 'all').toLowerCase()

  const rangeStart = (() => {
    if (selectedRange === 'all') return null
    if (selectedRange === 'mtd') return monthStart
    const days = selectedRange === '7d' ? 7 : selectedRange === '14d' ? 14 : 30
    const start = new Date(now)
    start.setDate(start.getDate() - days)
    return start
  })()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const remainingDays = Math.max(1, daysInMonth - dayOfMonth)

  const allDeals = userDeals.filter((deal) => {
    if (isManager && selectedRepId !== 'all' && deal.sales_rep_id !== selectedRepId) return false
    if (isManager && selectedSource !== 'all' && (deal.source || '').toLowerCase() !== selectedSource) return false
    const createdAt = parseDate(deal.created_at)
    if (!createdAt) return false
    if (!rangeStart) return true
    return createdAt >= rangeStart && createdAt <= now
  })

  const scopedDealIdSet = new Set(allDeals.map((deal) => deal.id))

  const allActivities = userActivities.filter((activity) => {
    if (isManager && selectedRepId !== 'all' && activity.sales_rep_id !== selectedRepId) return false
    if (isManager && selectedSource !== 'all' && !scopedDealIdSet.has(activity.deal_id)) return false
    const activityDate = parseDate(activity.completed_at) || parseDate(activity.scheduled_at)
    if (!activityDate) return false
    if (!rangeStart) return true
    return activityDate >= rangeStart && activityDate <= now
  })
  const wonDealsAll = allDeals.filter((deal) => deal.status === 'closed_won')
  const wonDealsMtd = wonDealsAll.filter((deal) => {
    const date = parseDate(deal.created_at)
    return date ? date >= monthStart : false
  })

  const storeGoalUnits = 60
  const storeTotalUnits = wonDealsAll.length
  const storeMtdUnits = wonDealsMtd.length
  const storeTotalGross = wonDealsAll.reduce((sum, deal) => sum + (parseFloat(deal.gross_profit) || 0), 0)
  const storeAvgGrossPerUnit = storeTotalUnits > 0 ? storeTotalGross / storeTotalUnits : 0
  const storeCloseRate = allDeals.length > 0 ? storeTotalUnits / allDeals.length : 0

  const contactActivities = allActivities.filter((activity) => activity.activity_type === 'call' || activity.activity_type === 'email')
  const meetings = allActivities.filter((activity) => activity.activity_type === 'meeting')
  const completedMeetings = meetings.filter((activity) => Boolean(activity.completed_at))

  const appointmentSetPct = contactActivities.length > 0 ? meetings.length / contactActivities.length : 0
  const showPct = meetings.length > 0 ? completedMeetings.length / meetings.length : 0
  const soldFromShowPct = completedMeetings.length > 0 ? storeTotalUnits / completedMeetings.length : 0

  const projectedMonthEndUnits = dayOfMonth > 0 ? (storeMtdUnits / dayOfMonth) * daysInMonth : 0
  const goalVsActual = storeGoalUnits > 0 ? projectedMonthEndUnits / storeGoalUnits : 0
  const paceStatus: 'green' | 'yellow' | 'red' = goalVsActual >= 1 ? 'green' : goalVsActual >= 0.85 ? 'yellow' : 'red'

  const repNameMap = new Map<string, string>()
  allProfiles?.forEach((rep) => {
    repNameMap.set(rep.id, `${rep.first_name || ''} ${rep.last_name || ''}`.trim() || rep.email || 'Unknown')
  })

  const latestActivityByDeal = new Map<string, Date>()
  allActivities.forEach((activity) => {
    if (!activity.deal_id) return
    const activityDate = parseDate(activity.completed_at) || parseDate(activity.scheduled_at)
    if (!activityDate) return
    const previous = latestActivityByDeal.get(activity.deal_id)
    if (!previous || activityDate > previous) {
      latestActivityByDeal.set(activity.deal_id, activityDate)
    }
  })

  const openDeals = allDeals.filter((deal) => !['closed_won', 'closed_lost'].includes(deal.status))
  const noActivity48h = openDeals.filter((deal) => {
    const last = latestActivityByDeal.get(deal.id)
    if (!last) return true
    return now.getTime() - last.getTime() > 48 * 60 * 60 * 1000
  })

  const staleInternetLeads = openDeals.filter((deal) => {
    if ((deal.source || '').toLowerCase() !== 'internet') return false
    const last = latestActivityByDeal.get(deal.id)
    if (!last) return true
    return now.getTime() - last.getTime() > 48 * 60 * 60 * 1000
  }).length

  const negotiationOver3Days = openDeals.filter((deal) => {
    if (deal.status !== 'negotiation') return false
    const created = parseDate(deal.created_at)
    if (!created) return false
    return now.getTime() - created.getTime() > 3 * 24 * 60 * 60 * 1000
  }).length

  const leadsNotContacted30m = allDeals.filter((deal) => {
    if (deal.status !== 'lead') return false
    const created = parseDate(deal.created_at)
    if (!created) return false
    const earliestActivity = allActivities
      .filter((activity) => activity.deal_id === deal.id)
      .map((activity) => parseDate(activity.completed_at) || parseDate(activity.scheduled_at))
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => a.getTime() - b.getTime())[0]

    if (!earliestActivity) return now.getTime() - created.getTime() > 30 * 60 * 1000
    return earliestActivity.getTime() - created.getTime() > 30 * 60 * 1000
  }).length

  const appointmentsToday = meetings.filter((activity) => {
    const scheduled = parseDate(activity.scheduled_at)
    return scheduled ? scheduled >= startOfToday && scheduled < endOfToday : false
  })

  const unconfirmedAppointmentsToday = appointmentsToday.filter((activity) => {
    const description = (activity.description || '').toLowerCase()
    return !description.includes('confirm') && !activity.completed_at
  }).length

  const missedFollowUps = allActivities.filter((activity) => {
    const scheduled = parseDate(activity.scheduled_at)
    if (!scheduled) return false
    return scheduled < now && !activity.completed_at
  }).length

  const repRowsMap = new Map<string, {
    repId: string
    repName: string
    prospects: number
    wonUnits: number
    totalGross: number
    internetCount: number
    walkinCount: number
    contacts: number
    meetings: number
    completedMeetings: number
    staleDeals: number
    activitiesToday: number
    wonLast7: number
    wonPrev7: number
    projectedMonthEndUnits: number
    mtdWonUnits: number
  }>()

  const ensureRep = (repId: string) => {
    if (!repRowsMap.has(repId)) {
      repRowsMap.set(repId, {
        repId,
        repName: repNameMap.get(repId) || `Rep ${repId.slice(-4)}`,
        prospects: 0,
        wonUnits: 0,
        totalGross: 0,
        internetCount: 0,
        walkinCount: 0,
        contacts: 0,
        meetings: 0,
        completedMeetings: 0,
        staleDeals: 0,
        activitiesToday: 0,
        wonLast7: 0,
        wonPrev7: 0,
        projectedMonthEndUnits: 0,
        mtdWonUnits: 0,
      })
    }
    return repRowsMap.get(repId)!
  }

  allDeals.forEach((deal) => {
    const rep = ensureRep(deal.sales_rep_id)
    rep.prospects += 1
    if ((deal.source || '').toLowerCase() === 'internet') rep.internetCount += 1
    if ((deal.source || '').toLowerCase() === 'walkin') rep.walkinCount += 1

    if (deal.status === 'closed_won') {
      rep.wonUnits += 1
      rep.totalGross += parseFloat(deal.gross_profit) || 0
      const created = parseDate(deal.created_at)
      if (created && created >= monthStart) rep.mtdWonUnits += 1

      if (created) {
        const daysAgo = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        if (daysAgo <= 7) rep.wonLast7 += 1
        if (daysAgo > 7 && daysAgo <= 14) rep.wonPrev7 += 1
      }
    }
  })

  allActivities.forEach((activity) => {
    const rep = ensureRep(activity.sales_rep_id)
    if (activity.activity_type === 'call' || activity.activity_type === 'email') rep.contacts += 1
    if (activity.activity_type === 'meeting') {
      rep.meetings += 1
      if (activity.completed_at) rep.completedMeetings += 1
    }
    const completedOrScheduled = parseDate(activity.completed_at) || parseDate(activity.scheduled_at)
    if (completedOrScheduled && completedOrScheduled >= startOfToday) {
      rep.activitiesToday += 1
    }
  })

  openDeals.forEach((deal) => {
    const rep = ensureRep(deal.sales_rep_id)
    const last = latestActivityByDeal.get(deal.id)
    if (!last || now.getTime() - last.getTime() > 48 * 60 * 60 * 1000) {
      rep.staleDeals += 1
    }
  })

  repRowsMap.forEach((rep) => {
    rep.projectedMonthEndUnits = dayOfMonth > 0 ? (rep.mtdWonUnits / dayOfMonth) * daysInMonth : 0
  })

  const repLeaderboard = Array.from(repRowsMap.values())
    .map((rep) => {
      const closeRate = rep.prospects > 0 ? rep.wonUnits / rep.prospects : 0
      const avgGross = rep.wonUnits > 0 ? rep.totalGross / rep.wonUnits : 0
      const apptSetPct = rep.contacts > 0 ? rep.meetings / rep.contacts : 0
      const showRate = rep.meetings > 0 ? rep.completedMeetings / rep.meetings : 0
      const soldFromShowRate = rep.completedMeetings > 0 ? rep.wonUnits / rep.completedMeetings : 0
      const splitDenominator = Math.max(1, rep.internetCount + rep.walkinCount)
      const internetPct = Math.round((rep.internetCount / splitDenominator) * 100)
      const walkinPct = Math.round((rep.walkinCount / splitDenominator) * 100)

      const riskFlags: string[] = []
      if (rep.activitiesToday < 3) riskFlags.push('🔴 Low activity')
      if (rep.prospects >= 10 && closeRate < storeCloseRate * 0.7) riskFlags.push('🟡 High leads, low close rate')
      if (avgGross > 0 && avgGross < storeAvgGrossPerUnit * 0.8) riskFlags.push('🔴 Low gross per deal')
      if (rep.staleDeals >= 3) riskFlags.push('🟡 Too many stale deals')

      return {
        repId: rep.repId,
        repName: rep.repName,
        wonUnits: rep.wonUnits,
        totalGross: rep.totalGross,
        avgGross,
        closeRate,
        appointmentSetPct: apptSetPct,
        showPct: showRate,
        soldFromShowPct: soldFromShowRate,
        internetWalkInSplit: `${internetPct}% / ${walkinPct}%`,
        trend: rep.wonLast7 > rep.wonPrev7 ? 'up' as const : rep.wonLast7 < rep.wonPrev7 ? 'down' as const : 'flat' as const,
        riskFlags,
      }
    })
    .sort((a, b) => {
      if (managerRankBy === 'revenue') {
        if (b.totalGross !== a.totalGross) return b.totalGross - a.totalGross
        if (b.wonUnits !== a.wonUnits) return b.wonUnits - a.wonUnits
        return b.avgGross - a.avgGross
      }

      if (b.wonUnits !== a.wonUnits) return b.wonUnits - a.wonUnits
      if (b.totalGross !== a.totalGross) return b.totalGross - a.totalGross
      return b.avgGross - a.avgGross
    })

  const leaderProjectedUnits = repLeaderboard.length > 0
    ? (repRowsMap.get(repLeaderboard[0].repId)?.projectedMonthEndUnits || 0)
    : 0

  const forecastRows = repLeaderboard.map((rep) => {
    const repRaw = repRowsMap.get(rep.repId)!
    const neededPerDayFor10 = Math.max(0, 10 - repRaw.mtdWonUnits) / remainingDays
    const neededPerDayFor15 = Math.max(0, 15 - repRaw.mtdWonUnits) / remainingDays
    const neededPerDayToBeatLeader = Math.max(0, Math.ceil(leaderProjectedUnits + 1) - repRaw.mtdWonUnits) / remainingDays

    return {
      repId: rep.repId,
      repName: rep.repName,
      currentWonUnits: repRaw.mtdWonUnits,
      projectedMonthEndUnits: repRaw.projectedMonthEndUnits,
      neededPerDayFor10,
      neededPerDayFor15,
      neededPerDayToBeatLeader,
    }
  })

  const repsBelowActivityThreshold = Array.from(repRowsMap.values())
    .filter((rep) => rep.activitiesToday < 3)
    .map((rep) => rep.repName)

  const repsAtRiskOfMissingTarget = forecastRows
    .filter((rep) => rep.projectedMonthEndUnits < 10 - 5)
    .map((rep) => rep.repName)

  const sourceAccumulator = new Map<string, { leads: number; units: number; gross: number }>()
  allDeals.forEach((deal) => {
    const source = (deal.source || 'unknown').toLowerCase()
    const current = sourceAccumulator.get(source) || { leads: 0, units: 0, gross: 0 }
    current.leads += 1
    if (deal.status === 'closed_won') {
      current.units += 1
      current.gross += parseFloat(deal.gross_profit) || 0
    }
    sourceAccumulator.set(source, current)
  })

  const sourcePerformance = Array.from(sourceAccumulator.entries())
    .map(([source, data]) => ({
      source,
      leads: data.leads,
      units: data.units,
      closeRate: data.leads > 0 ? data.units / data.leads : 0,
      grossPerUnit: data.units > 0 ? data.gross / data.units : 0,
    }))
    .sort((a, b) => b.leads - a.leads)

  const managerRepOptions = (allProfiles || [])
    .filter((person) => person.role === 'sales_rep')
    .map((person) => ({
      id: person.id,
      name: `${person.first_name || ''} ${person.last_name || ''}`.trim() || person.email || 'Unknown',
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  const managerSourceOptions = Array.from(
    new Set(
      userDeals
        .map((deal) => (deal.source || 'unknown').toLowerCase())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b))

  const avgProspectsPerRep = repLeaderboard.length > 0
    ? repLeaderboard.reduce((sum, rep) => sum + (repRowsMap.get(rep.repId)?.prospects || 0), 0) / repLeaderboard.length
    : 0
  const avgCloseRate = repLeaderboard.length > 0
    ? repLeaderboard.reduce((sum, rep) => sum + rep.closeRate, 0) / repLeaderboard.length
    : 0
  const avgShowRate = repLeaderboard.length > 0
    ? repLeaderboard.reduce((sum, rep) => sum + rep.showPct, 0) / repLeaderboard.length
    : 0

  const coachingCards = repLeaderboard.flatMap((rep) => {
    const repRaw = repRowsMap.get(rep.repId)
    if (!repRaw) return []

    const activitiesPerLead = repRaw.prospects > 0 ? repRaw.activitiesToday / repRaw.prospects : 0
    const cards: {
      repId: string
      repName: string
      title: string
      reason: string
      focus: string
      severity: 'high' | 'medium' | 'low'
    }[] = []

    if (repRaw.prospects >= avgProspectsPerRep && rep.closeRate < avgCloseRate * 0.7) {
      cards.push({
        repId: rep.repId,
        repName: rep.repName,
        title: 'High lead volume, low close rate',
        reason: `Prospects ${repRaw.prospects} with close rate ${Math.round(rep.closeRate * 100)}% below team benchmark.`,
        focus: 'Objection handling and qualification quality.',
        severity: 'high',
      })
    }

    if (rep.appointmentSetPct >= appointmentSetPct * 0.9 && rep.showPct < avgShowRate * 0.75) {
      cards.push({
        repId: rep.repId,
        repName: rep.repName,
        title: 'Good appointment set, low show rate',
        reason: `Set rate is healthy, but show rate is ${Math.round(rep.showPct * 100)}%.`,
        focus: 'Appointment confirmation workflow and reminder cadence.',
        severity: 'medium',
      })
    }

    if (rep.avgGross > 0 && rep.avgGross < storeAvgGrossPerUnit * 0.8 && rep.wonUnits >= 2) {
      cards.push({
        repId: rep.repId,
        repName: rep.repName,
        title: 'Gross compression risk',
        reason: `Avg gross ${Math.round(rep.avgGross)} is below store baseline ${Math.round(storeAvgGrossPerUnit)}.`,
        focus: 'Value-building, TO timing, and F&I handoff consistency.',
        severity: 'high',
      })
    }

    if (activitiesPerLead < 0.15 || repRaw.staleDeals >= 3) {
      cards.push({
        repId: rep.repId,
        repName: rep.repName,
        title: 'Follow-up discipline needed',
        reason: `${repRaw.staleDeals} stale deals and low activity density.`,
        focus: 'Daily follow-up blocks and same-day lead touch.',
        severity: 'medium',
      })
    }

    if (rep.closeRate > avgCloseRate * 1.15 && repRaw.prospects < avgProspectsPerRep * 0.7) {
      cards.push({
        repId: rep.repId,
        repName: rep.repName,
        title: 'High efficiency, low volume',
        reason: `Strong close rate with lower lead volume than peers.`,
        focus: 'Increase lead allocation and prospecting opportunities.',
        severity: 'low',
      })
    }

    return cards.slice(0, 2)
  }).slice(0, 10)

  const nowTs = now.getTime()
  const soldDeals = allDeals
    .filter((deal) => deal.status === 'closed_won')
    .map((deal) => ({
      ...deal,
      soldDate: parseDate(deal.close_date) || parseDate(deal.created_at),
    }))
    .filter((deal) => Boolean(deal.soldDate)) as Array<typeof allDeals[number] & { soldDate: Date }>

  const inWindow = (date: Date, startDaysAgo: number, endDaysAgo: number) => {
    const daysAgo = (nowTs - date.getTime()) / (1000 * 60 * 60 * 24)
    return daysAgo >= endDaysAgo && daysAgo < startDaysAgo
  }

  const recentSold = soldDeals.filter((deal) => inWindow(deal.soldDate, 14, 0))
  const priorSold = soldDeals.filter((deal) => inWindow(deal.soldDate, 28, 14))
  const recentAvgGross = recentSold.length > 0
    ? recentSold.reduce((sum, deal) => sum + (parseFloat(deal.gross_profit) || 0), 0) / recentSold.length
    : 0
  const priorAvgGross = priorSold.length > 0
    ? priorSold.reduce((sum, deal) => sum + (parseFloat(deal.gross_profit) || 0), 0) / priorSold.length
    : 0

  const grossAlerts: {
    id: string
    title: string
    detail: string
    deltaPct: number
    severity: 'high' | 'medium' | 'low'
  }[] = []

  if (recentSold.length >= 8 && priorSold.length >= 8 && priorAvgGross > 0) {
    const deltaPct = ((recentAvgGross - priorAvgGross) / priorAvgGross) * 100
    if (deltaPct <= -20) {
      grossAlerts.push({
        id: 'store-gross-compression',
        title: 'Store Avg Gross Compression',
        detail: `Last 14 days avg gross ${Math.round(recentAvgGross)} vs prior 14 days ${Math.round(priorAvgGross)}.`,
        deltaPct,
        severity: 'high',
      })
    }
  }

  const sourceGrossByWindow = new Map<string, { recentGross: number; recentUnits: number; priorGross: number; priorUnits: number }>()
  soldDeals.forEach((deal) => {
    const key = (deal.source || 'unknown').toLowerCase()
    const bucket = sourceGrossByWindow.get(key) || { recentGross: 0, recentUnits: 0, priorGross: 0, priorUnits: 0 }
    const gross = parseFloat(deal.gross_profit) || 0
    if (inWindow(deal.soldDate, 14, 0)) {
      bucket.recentGross += gross
      bucket.recentUnits += 1
    } else if (inWindow(deal.soldDate, 28, 14)) {
      bucket.priorGross += gross
      bucket.priorUnits += 1
    }
    sourceGrossByWindow.set(key, bucket)
  })

  sourceGrossByWindow.forEach((value, source) => {
    if (value.recentUnits < 5 || value.priorUnits < 5) return
    const recent = value.recentGross / value.recentUnits
    const prior = value.priorGross / value.priorUnits
    if (prior <= 0) return
    const deltaPct = ((recent - prior) / prior) * 100
    if (deltaPct <= -20) {
      grossAlerts.push({
        id: `source-${source}`,
        title: `Source Compression: ${source}`,
        detail: `Avg gross dropped from ${Math.round(prior)} to ${Math.round(recent)}.`,
        deltaPct,
        severity: 'medium',
      })
    }
  })

  const formatLastActivity = (date: Date | null) => {
    if (!date) return 'No activity'
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  }

  const accountabilityRows = openDeals.map((deal) => {
    const created = parseDate(deal.created_at)
    const lastActivity = latestActivityByDeal.get(deal.id) || null
    const dealActivities = allActivities.filter((activity) => activity.deal_id === deal.id)
    const hasConfirmedAppt = dealActivities.some((activity) => (activity.description || '').toLowerCase().includes('confirm'))
    const appointmentWithin24h = dealActivities.some((activity) => {
      const scheduled = parseDate(activity.scheduled_at)
      if (!scheduled) return false
      const diff = scheduled.getTime() - nowTs
      return diff >= 0 && diff <= 24 * 60 * 60 * 1000
    })

    let riskScore = 0
    const flags: string[] = []

    const stale48h = !lastActivity || nowTs - lastActivity.getTime() > 48 * 60 * 60 * 1000
    if (stale48h) {
      riskScore += 30
      flags.push('No activity in 48h')
    }

    const source = (deal.source || '').toLowerCase()
    const uncontacted30m = source === 'internet' && created
      ? (!lastActivity || lastActivity.getTime() - created.getTime() > 30 * 60 * 1000)
      : false
    if (uncontacted30m) {
      riskScore += 35
      flags.push('Internet lead not contacted in 30m')
    }

    const overdueFollowup = dealActivities.some((activity) => {
      const scheduled = parseDate(activity.scheduled_at)
      return scheduled ? scheduled < now && !activity.completed_at : false
    })
    if (overdueFollowup) {
      riskScore += 25
      flags.push('Overdue follow-up')
    }

    const negotiationOver3DaysFlag = deal.status === 'negotiation' && created
      ? nowTs - created.getTime() > 3 * 24 * 60 * 60 * 1000
      : false
    if (negotiationOver3DaysFlag) {
      riskScore += 15
      flags.push('Negotiation > 3 days')
    }

    if (appointmentWithin24h && !hasConfirmedAppt) {
      riskScore += 20
      flags.push('Appointment unconfirmed (<24h)')
    }

    riskScore = Math.min(100, riskScore)

    return {
      dealId: deal.id,
      repName: repNameMap.get(deal.sales_rep_id) || `Rep ${deal.sales_rep_id.slice(-4)}`,
      customerName: deal.customer_name,
      status: deal.status,
      source: deal.source || 'unknown',
      riskScore,
      flags,
      lastActivityAt: formatLastActivity(lastActivity),
    }
  })
    .filter((row) => row.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 15)

  if (isManager) {
    return (
      <DashboardLayout>
        <ManagerDashboardView
          managerName={profile?.first_name || session.user.email || 'Manager'}
          rankBy={managerRankBy}
          summary={{
            totalUnits: storeTotalUnits,
            totalGross: storeTotalGross,
            avgGrossPerUnit: storeAvgGrossPerUnit,
            closeRate: storeCloseRate,
            appointmentSetPct,
            showPct,
            soldFromShowPct,
            goalUnits: storeGoalUnits,
            mtdUnits: storeMtdUnits,
            projectedMonthEndUnits,
            paceStatus,
          }}
          leaderboard={repLeaderboard}
          attention={{
            staleInternetLeads,
            missedFollowUps,
            unconfirmedAppointmentsToday,
            repsBelowActivityThreshold,
            repsAtRiskOfMissingTarget,
            openDeals: openDeals.length,
            noActivity48h: noActivity48h.length,
            negotiationOver3Days,
            leadsNotContacted30m,
          }}
          sourcePerformance={sourcePerformance}
          forecastRows={forecastRows}
          coachingCards={coachingCards}
          grossAlerts={grossAlerts}
          accountabilityRows={accountabilityRows}
          filters={{
            range: selectedRange,
            repId: selectedRepId,
            source: selectedSource,
          }}
          filterOptions={{
            reps: managerRepOptions,
            sources: managerSourceOptions,
          }}
        />
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile?.first_name || session.user.email}
          </h1>
          <p className="text-gray-600">Here's your sales overview for today.</p>
        </div>

        <KPICards 
          mtdRevenue={mtdRevenue}
          mtdGross={mtdGross}
          mtdDeals={closedWonDeals.length}
          totalPipeline={userDeals.filter(d => !['closed_won', 'closed_lost'].includes(d.status)).length || 0}
        />

        <PacingTracker 
          activities={userActivities.map(activity => ({
            id: activity.id,
            deal_id: activity.deal_id,
            activity_type: activity.activity_type,
            outcome: undefined, // Will be simulated in the component
            description: activity.description,
            completed_at: activity.completed_at || activity.scheduled_at,
            scheduled_at: activity.scheduled_at
          }))}
          deals={userDeals.map(deal => ({
            id: deal.id,
            customer_name: deal.customer_name,
            deal_amount: parseFloat(deal.deal_amount) || 0,
            status: deal.status,
            created_at: deal.created_at,
            close_date: deal.close_date
          }))}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <DailyGoals 
              activities={userActivities}
              deals={userDeals}
              monthlyGoals={{
                calls: 220,
                appointments: 44,
                deals: 10,
                revenue: 60000
              }}
            />
          </div>
          
          <div className="lg:col-span-2">
            <RecentActivities deals={userDeals.slice(0, 8) || []} />
          </div>
        </div>

        {/* Quick Actions and Debug Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <a 
                href="/analytics" 
                className="block w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-center"
              >
                🧠 Performance Analytics
              </a>
              <a 
                href="/pipeline" 
                className="block w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-center"
              >
                View Pipeline ({userDeals.filter(d => !['closed_won', 'closed_lost'].includes(d.status)).length || 0} active)
              </a>
              <a 
                href="/leaderboard" 
                className="block w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-center"
              >
                View Leaderboard
              </a>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
            <div className="p-3 bg-gray-100 rounded text-sm">
              <p><strong>Data Overview:</strong></p>
              <p>Total deals in DB: {deals?.length || 0}</p>
              <p>User deals: {userDeals.length}</p>
              <p>User activities: {userActivities.length}</p>
              <p>MTD/Recent deals: {mtdDeals.length}</p>
              <p>Closed won: {closedWonDeals.length}</p>
              <p>User role: {profile?.role}</p>
              <p>Active pipeline: {userDeals.filter(d => !['closed_won', 'closed_lost'].includes(d.status)).length || 0}</p>
              {profileError && <p className="text-red-600">Profile Error: {profileError.message}</p>}
              {dealsError && <p className="text-red-600">Deals Error: {dealsError.message}</p>}
              {activitiesError && <p className="text-red-600">Activities Error: {activitiesError.message}</p>}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}