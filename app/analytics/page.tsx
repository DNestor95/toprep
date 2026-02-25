import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import CatchUpRecommendations from '@/components/CatchUpRecommendations'
import PerformanceAnalytics from '@/components/PerformanceAnalytics'
import LeaderAdvantages from '@/components/LeaderAdvantages'
import Tooltip from '@/components/Tooltip'
import { SalesAnalyticsEngine } from '@/lib/analytics-engine'
import { MockDataGenerator } from '@/lib/mock-data-generator'

export default async function AnalyticsPage() {
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

  // For now, use mock data to demonstrate the analytics engine
  // In production, this would fetch real data from the database
  const mockGenerator = new MockDataGenerator()
  const allRepData = mockGenerator.generateAllRepData()
  
  console.log('Generated mock data for analytics:', allRepData.length, 'reps')

  // Ensure current user (Devin) gets top performer data for demo
  // Replace the first rep data with current user as top performer
  const currentUserRepData = {
    ...allRepData[0], // Use first rep as template
    rep_id: session.user.id,
    units_sold: Math.max(...allRepData.map(r => r.units_sold)) + 2, // Ensure they're #1
    contacts: Math.max(...allRepData.map(r => r.contacts)) + 5,
    appointments_set: Math.max(...allRepData.map(r => r.appointments_set)) + 2,
    appointments_show: Math.max(...allRepData.map(r => r.appointments_show)) + 2
  }

  // Replace first rep with current user data
  allRepData[0] = currentUserRepData

  // Initialize analytics engine
  const analyticsEngine = new SalesAnalyticsEngine()
  const analysisResults = analyticsEngine.analyzePerformance(allRepData)
  
  // Get current user's analysis (should now be top performer)
  const currentUserRepId = session.user.id
  const userAnalysis = analysisResults.get(currentUserRepId)
  
  console.log('Current user rank:', userAnalysis?.performanceMetrics.rank)
  console.log('Is top performer:', userAnalysis?.isTopPerformer)

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Performance Analytics
              {isTopPerformer && <span className="ml-2 text-yellow-500">👑</span>}
            </h1>
            <p className="text-gray-600">
              Data-driven insights and catch-up recommendations
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
              <div className="text-2xl font-bold text-purple-600">#{performanceMetrics.rank}</div>
              <Tooltip content="Your current ranking among all sales reps, sorted by actual units sold this period.">
                <div className="text-purple-400 hover:text-purple-600 cursor-help">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
              </Tooltip>
            </div>
            <div className="text-sm text-gray-600">Current Rank</div>
            <div className="text-xs text-gray-500">Out of {allRepData.length} reps</div>
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
              expectedUnits={expectedUnits}
              coreRates={coreRates}
              performanceMetrics={performanceMetrics}
              sourceWeights={sourceWeights}
              storeBaselines={storeBaselines}
              actualUnits={repData.units_sold}
              isTopPerformer={isTopPerformer}
              leadsBreakdown={repData.leads_by_source}
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
              catchUpTarget={catchUpTarget}
              activityRecommendations={activityRecommendations}
              coreRates={coreRates}
              isTopPerformer={isTopPerformer}
              performanceIndex={performanceMetrics.performance_index}
            />
          </div>
        </div>

        {/* Leader Advantages (Advanced Analytics) */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 mb-4">
            <h3 className="text-lg font-medium text-gray-900">Advanced Analytics</h3>
            <Tooltip content="Exclusive insights for top performers (Rank #1 or 90%+ Performance Index). Includes source optimization, timing analysis, lead decay curves, and advanced forecasting. Earned through performance, not given.">
              <div className="text-gray-400 hover:text-gray-600 cursor-help">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
            </Tooltip>
          </div>
          <LeaderAdvantages
            isTopPerformer={isTopPerformer}
            confidenceScore={performanceMetrics.confidence_score}
            rank={performanceMetrics.rank}
            performanceIndex={performanceMetrics.performance_index}
            defenseTarget={Math.ceil(repData.units_sold * 0.95)}
            currentUnits={repData.units_sold}
            leadsBreakdown={repData.leads_by_source}
            sourceWeights={sourceWeights}
            coreRates={coreRates}
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
              <div>User rank: #{performanceMetrics.rank}</div>
              <div>Is top performer: {isTopPerformer ? 'YES' : 'NO'}</div>
              <div>Performance index: {(performanceMetrics.performance_index * 100).toFixed(1)}%</div>
              <div>Analysis confidence: {(performanceMetrics.confidence_score * 100).toFixed(1)}%</div>
              <div>Advanced access: {(performanceMetrics.rank === 1 || performanceMetrics.performance_index >= 0.90) ? 'UNLOCKED' : 'LOCKED'}</div>
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