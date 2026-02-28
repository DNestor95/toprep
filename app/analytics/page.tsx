import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import CatchUpRecommendations from '@/components/CatchUpRecommendations'
import PerformanceAnalytics from '@/components/PerformanceAnalytics'
import LeaderAdvantages from '@/components/LeaderAdvantages'
import Tooltip from '@/components/Tooltip'
import { SalesAnalyticsEngine } from '@/lib/analytics-engine'
import type { ForecastViewModel } from '@/lib/domain/analytics/forecastViewModel'
import { MockDataGenerator } from '@/lib/mock-data-generator'
import { recomputeRepMonthForecast } from '@/lib/server/recomputeRepMonthForecast'

type RankBy = 'won_units' | 'revenue'

function parseRankBy(value?: string | null): RankBy {
  return value === 'revenue' ? 'revenue' : 'won_units'
}

function parseTopN(value?: string | null): number {
  const parsed = Number.parseInt(value ?? '1', 10)
  return Number.isFinite(parsed) ? Math.min(10, Math.max(1, parsed)) : 1
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?: { topN?: string; mode?: string }
}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role')
    .eq('id', session.user.id)
    .maybeSingle()

  const isManager = profile?.role === 'manager' || profile?.role === 'admin'
  const isPersonalMode = searchParams?.mode === 'personal'

  if (isManager && !isPersonalMode) {
    redirect('/dashboard')
  }

  const { data: appSettings } = await supabase
    .from('app_settings')
    .select('key, value')
    .in('key', ['leaderboard_rank_by', 'advanced_analytics_top_n'])

  const settingsMap = new Map<string, string>()
  appSettings?.forEach((setting) => {
    settingsMap.set(setting.key, setting.value)
  })

  const rankBy: RankBy = parseRankBy(settingsMap.get('leaderboard_rank_by'))

  let advancedAccessTopN = parseTopN(settingsMap.get('advanced_analytics_top_n'))
  const requestedTopN = parseTopN(searchParams?.topN)

  if (isManager && searchParams?.topN && requestedTopN !== advancedAccessTopN) {
    const { error: topNWriteError } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'advanced_analytics_top_n',
          value: String(requestedTopN),
          updated_by: session.user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )

    if (!topNWriteError) {
      advancedAccessTopN = requestedTopN
    }
  }

  const { data: rankingDeals } = await supabase
    .from('deals')
    .select('sales_rep_id, deal_amount, status')

  const rankingAccumulator = new Map<string, {
    wonUnits: number
    totalRevenue: number
    wonRevenue: number
    totalUnits: number
  }>()

  for (const deal of rankingDeals || []) {
    if (!deal.sales_rep_id) continue

    const current = rankingAccumulator.get(deal.sales_rep_id) || {
      wonUnits: 0,
      totalRevenue: 0,
      wonRevenue: 0,
      totalUnits: 0,
    }

    const amount = parseFloat(deal.deal_amount) || 0
    current.totalUnits += 1
    current.totalRevenue += amount

    if (deal.status === 'closed_won') {
      current.wonUnits += 1
      current.wonRevenue += amount
    }

    rankingAccumulator.set(deal.sales_rep_id, current)
  }

  const rankedReps = Array.from(rankingAccumulator.entries())
    .map(([repId, metrics]) => ({ repId, ...metrics }))
    .sort((a, b) => {
      if (rankBy === 'revenue') {
        if (b.totalRevenue !== a.totalRevenue) return b.totalRevenue - a.totalRevenue
        if (b.wonRevenue !== a.wonRevenue) return b.wonRevenue - a.wonRevenue
        return b.wonUnits - a.wonUnits
      }

      if (b.wonUnits !== a.wonUnits) return b.wonUnits - a.wonUnits
      if (b.wonRevenue !== a.wonRevenue) return b.wonRevenue - a.wonRevenue
      return b.totalUnits - a.totalUnits
    })

  const rankMap = new Map<string, number>()
  rankedReps.forEach((rep, index) => {
    rankMap.set(rep.repId, index + 1)
  })

  const getTargetUnitsByEmail = (email?: string | null) => {
    const normalizedEmail = (email || '').toLowerCase()

    if (normalizedEmail.includes('devin')) return 24
    if (normalizedEmail.includes('manager')) return 15
    if (normalizedEmail.includes('alex')) return 13
    if (normalizedEmail.includes('hayden')) return 12
    if (normalizedEmail.includes('marcus')) return 11
    if (normalizedEmail.includes('jordan')) return 10

    return 9
  }

  // Use deterministic mock data so ranking behavior is consistent across users.
  const mockGenerator = new MockDataGenerator()
  const generatedData = mockGenerator.generateAllRepData()

  const allRepData = generatedData.map((rep, index) => ({
    ...rep,
    rep_id: `mock-rep-${index + 1}`,
  }))

  const devinTopData = {
    ...allRepData[0],
    rep_id: 'rep-devin-top',
    units_sold: 24,
    contacts: Math.max(allRepData[0].contacts, 52),
    appointments_set: Math.max(allRepData[0].appointments_set, 18),
    appointments_show: Math.max(allRepData[0].appointments_show, 24),
  }

  allRepData[0] = devinTopData

  const currentUserUnits = getTargetUnitsByEmail(profile?.email || session.user.email)
  const isCurrentUserDevin = (profile?.email || session.user.email || '').toLowerCase().includes('devin')

  await recomputeRepMonthForecast(supabase, {
    repId: session.user.id,
    quotaUnits: currentUserUnits,
  })

  const currentUserBaseData = allRepData[1] || allRepData[0]
  const currentUserUnitsSold = isCurrentUserDevin ? 24 : currentUserUnits
  const currentUserAppointmentsShow = Math.max(currentUserBaseData.appointments_show, currentUserUnitsSold)
  const currentUserAppointmentsSet = Math.max(currentUserBaseData.appointments_set, currentUserAppointmentsShow)
  const currentUserContacts = Math.max(currentUserBaseData.contacts, currentUserAppointmentsSet)

  const currentUserRepData = {
    ...currentUserBaseData,
    rep_id: session.user.id,
    units_sold: currentUserUnitsSold,
    contacts: currentUserContacts,
    appointments_set: currentUserAppointmentsSet,
    appointments_show: currentUserAppointmentsShow,
  }

  if (isCurrentUserDevin) {
    allRepData[0] = currentUserRepData
  } else {
    allRepData[1] = currentUserRepData
  }

  // Initialize analytics engine
  const analyticsEngine = new SalesAnalyticsEngine()
  const analysisResults = analyticsEngine.analyzePerformance(allRepData)
  
  // Get current user's analysis
  const currentUserRepId = session.user.id
  const userAnalysis = analysisResults.get(currentUserRepId)

  const analyticsRank = userAnalysis?.performanceMetrics.rank
  const realRank = analyticsRank ?? rankMap.get(currentUserRepId) ?? rankedReps.length + 1
  const managerSelectedIsTopPerformer = realRank === 1

  const hasAdvancedAnalyticsAccess = Boolean(
    userAnalysis && realRank <= advancedAccessTopN
  )
  
  console.log('Current user rank:', realRank)
  console.log('Rank by:', rankBy)
  console.log('Advanced access top N:', advancedAccessTopN)

  if (!userAnalysis) {
    return (
      <DashboardLayout>
        <div className="p-6 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Analytics Engine</h1>
          <p className="text-gray-600">No analytics data available. Please check back later.</p>
          <div className="mt-4 text-sm text-gray-500">
            Debug: User ID {session.user.id} not found in analysis results
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const {
    repData,
    coreRates,
    expectedUnits,
    catchUpTarget,
    activityRecommendations,
    performanceMetrics,
    sourceWeights,
    storeBaselines,
    isTopPerformer
  } = userAnalysis

  const forecast: ForecastViewModel = {
    expectedUnits,
    coreRates,
    performanceMetrics,
    sourceWeights,
    storeBaselines,
    actualUnits: repData.units_sold,
    leadsBreakdown: repData.leads_by_source,
    catchUpTarget,
    activityRecommendations,
    isTopPerformer: managerSelectedIsTopPerformer,
    hasAdvancedAccess: hasAdvancedAnalyticsAccess,
    advancedAccessTopN,
    rank: realRank,
    performanceIndex: performanceMetrics.performance_index,
    confidenceScore: performanceMetrics.confidence_score,
    defenseTarget: Math.ceil(repData.units_sold * 0.95),
    currentUnits: repData.units_sold,
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isManager ? 'Personal Sales Analytics' : 'Performance Analytics'}
              {isTopPerformer && <span className="ml-2 text-yellow-500">👑</span>}
            </h1>
            <p className="text-gray-600">
              {isManager
                ? 'Your individual selling analytics. Team/store analytics are available on the manager dashboard.'
                : 'Data-driven insights and catch-up recommendations'}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Analysis Period</div>
            <div className="text-lg font-semibold text-gray-900">{repData.period}</div>
          </div>
        </div>

        {/* Key Performance Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-blue-600">{repData.units_sold}</div>
              <Tooltip content="The actual number of units you've sold this period. This is your real performance result.">
                <div className="text-blue-400 hover:text-blue-600 cursor-help">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
              </Tooltip>
            </div>
            <div className="text-sm text-gray-600">Actual Units</div>
            <div className="text-xs text-gray-500">Period: {repData.period}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-600">{expectedUnits.final_expected.toFixed(1)}</div>
              <Tooltip content="Your predicted performance based on lead mix quality and your behavior multipliers (contact rate vs store average). Formula: Base Expected × Contact Multiplier × Appointment Multiplier">
                <div className="text-green-400 hover:text-green-600 cursor-help">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
              </Tooltip>
            </div>
            <div className="text-sm text-gray-600">Expected Units</div>
            <div className="text-xs text-gray-500">Based on lead mix + behavior</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-purple-600">#{realRank}</div>
              <Tooltip content={`Your current ranking among all sales reps, sorted by manager-selected method (${rankBy === 'revenue' ? 'revenue' : 'won units'}).`}>
                <div className="text-purple-400 hover:text-purple-600 cursor-help">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
              </Tooltip>
            </div>
            <div className="text-sm text-gray-600">Current Rank</div>
            <div className="text-xs text-gray-500">Out of {Math.max(rankedReps.length, 1)} reps</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-orange-600">{(performanceMetrics.performance_index * 100).toFixed(0)}%</div>
              <Tooltip content="Your performance relative to the top performer (Your Units ÷ Top Rep Units × 100%). The top performer always shows 100%.">
                <div className="text-orange-400 hover:text-orange-600 cursor-help">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
              </Tooltip>
            </div>
            <div className="text-sm text-gray-600">Performance Index</div>
            <div className="text-xs text-gray-500">vs top performer</div>
          </div>
        </div>

        {/* Main Analytics Components */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Performance Analytics */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 mb-4">
              <h3 className="text-lg font-medium text-gray-900">Performance Analytics</h3>
              <Tooltip content="Deep dive into your performance metrics, showing how your actual results compare to algorithmic predictions based on lead quality and behavioral patterns.">
                <div className="text-gray-400 hover:text-gray-600 cursor-help">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
              </Tooltip>
            </div>
            <PerformanceAnalytics
              forecast={forecast}
            />
          </div>

          {/* Catch-Up Recommendations */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 mb-4">
              <h3 className="text-lg font-medium text-gray-900">Catch-Up Strategy</h3>
              <Tooltip content="Personalized recommendations to close the gap with top performers. Shows specific actions needed: additional leads by source, improved contact rates, and quality activity targets.">
                <div className="text-gray-400 hover:text-gray-600 cursor-help">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
              </Tooltip>
            </div>
            <CatchUpRecommendations
              forecast={forecast}
            />
          </div>
        </div>

        {/* Leader Advantages (Advanced Analytics) */}
        <div className="space-y-2">
          {isManager && (
            <form action="/analytics" method="get" className="bg-white p-4 rounded-lg shadow border flex items-center gap-3">
              <input type="hidden" name="mode" value="personal" />
              <label htmlFor="topN" className="text-sm font-medium text-gray-700">
                Advanced Analytics: top
              </label>
              <select
                id="topN"
                name="topN"
                defaultValue={String(advancedAccessTopN)}
                className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <span className="text-sm text-gray-700">reps</span>
              <button
                type="submit"
                className="ml-2 bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-indigo-700"
              >
                Apply
              </button>
            </form>
          )}

          <div className="flex items-center space-x-2 mb-4">
            <h3 className="text-lg font-medium text-gray-900">Advanced Analytics</h3>
            <Tooltip content={`Exclusive insights for top performers. Access is currently limited to top ${advancedAccessTopN} rep${advancedAccessTopN > 1 ? 's' : ''} by manager-selected ranking (${rankBy === 'revenue' ? 'revenue' : 'won units'}).`}>
              <div className="text-gray-400 hover:text-gray-600 cursor-help">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
            </Tooltip>
          </div>
          <LeaderAdvantages
            forecast={forecast}
          />
        </div>

        {/* Team Leaderboard */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center space-x-2 mb-4">
            <h3 className="text-lg font-medium text-gray-900">Team Performance Leaderboard</h3>
            <Tooltip content="Ranking of all team members by actual units sold, with Performance Index (your units ÷ top performer units) and Expected Units based on algorithmic predictions. Your row is highlighted in blue.">
              <div className="text-gray-400 hover:text-gray-600 cursor-help">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
            </Tooltip>
          </div>
          <div className="space-y-3">
            {Array.from(analysisResults.entries())
              .sort((a, b) => b[1].repData.units_sold - a[1].repData.units_sold)
              .slice(0, 10)
              .map(([repId, analysis], index) => (
                <div key={repId} className={`flex items-center justify-between p-3 rounded-lg ${
                  repId === currentUserRepId ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                }`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-yellow-500 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-400 text-white' :
                      'bg-gray-200 text-gray-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">Rep {repId.slice(-3)}</div>
                      <div className="text-sm text-gray-500">
                        <Tooltip content="Performance Index: Your units sold divided by top performer's units. Top performer = 100%.">
                          <span className="cursor-help border-b border-dotted border-gray-400">
                            PI: {(analysis.performanceMetrics.performance_index * 100).toFixed(0)}%
                          </span>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gray-900">{analysis.repData.units_sold} units</div>
                    <div className="text-sm text-gray-500">
                      <Tooltip content="Expected units based on lead mix quality and behavioral performance relative to store average.">
                        <span className="cursor-help border-b border-dotted border-gray-400">
                          Expected: {analysis.expectedUnits.final_expected.toFixed(1)}
                        </span>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Debug Information */}
        <div className="bg-gray-50 p-4 rounded-lg border">
          <details>
            <summary className="text-sm font-medium text-gray-700 cursor-pointer">
              Debug Information (Development)
            </summary>
            <div className="mt-3 text-xs text-gray-600 space-y-1">
              <div>Total reps analyzed: {allRepData.length}</div>
              <div>Current user: {profile?.email} ({session.user.id})</div>
              <div>Rank by: {rankBy === 'revenue' ? 'revenue' : 'won units'}</div>
              <div>User rank: #{realRank}</div>
              <div>Is top performer: {managerSelectedIsTopPerformer ? 'YES' : 'NO'}</div>
              <div>Performance index: {(performanceMetrics.performance_index * 100).toFixed(1)}%</div>
              <div>Analysis confidence: {(performanceMetrics.confidence_score * 100).toFixed(1)}%</div>
              <div>Advanced access threshold: Top {advancedAccessTopN}</div>
              <div>Advanced access: {hasAdvancedAnalyticsAccess ? 'UNLOCKED' : 'LOCKED'}</div>
              <div>Units sold: {repData.units_sold}</div>
              <div>Expected units: {expectedUnits.final_expected.toFixed(1)}</div>
              <div>Source weights: {JSON.stringify(sourceWeights, null, 2)}</div>
              <div>Store baselines: Contact Rate: {(storeBaselines.contact_rate * 100).toFixed(1)}%, Appointment Rate: {(storeBaselines.appointment_set_rate * 100).toFixed(1)}%</div>
            </div>
          </details>
        </div>
      </div>
    </DashboardLayout>
  )
}