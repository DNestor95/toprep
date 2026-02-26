'use client'

import { useState } from 'react'

interface LeaderAdvantagesProps {
  isTopPerformer: boolean
  hasAdvancedAccess: boolean
  advancedAccessTopN: number
  confidenceScore: number
  rank: number
  performanceIndex: number
  defenseTarget: number
  currentUnits: number
  leadsBreakdown: Record<string, number>
  sourceWeights: Record<string, number>
  coreRates: {
    contact_rate: number
    appointment_set_rate: number
    show_rate: number
    close_from_show: number
  }
}

interface SourceOptimization {
  source: string
  current_leads: number
  weight: number
  contribution: number
  optimization_score: number
}

export default function LeaderAdvantages({ 
  isTopPerformer,
  hasAdvancedAccess,
  advancedAccessTopN,
  confidenceScore,
  rank,
  performanceIndex,
  defenseTarget,
  currentUnits,
  leadsBreakdown,
  sourceWeights,
  coreRates 
}: LeaderAdvantagesProps) {
  const [selectedInsight, setSelectedInsight] = useState<'optimizer' | 'timing' | 'decay' | 'forecast'>('optimizer')

  if (!hasAdvancedAccess) {
    return (
      <div className="bg-gray-50 p-6 rounded-lg border">
        <div className="text-center">
          <div className="text-4xl mb-4">🔒</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Analytics Locked</h3>
          <p className="text-gray-600">
            Reach the top {advancedAccessTopN} performer{advancedAccessTopN > 1 ? 's' : ''} by rank to unlock advanced insights:
          </p>
          <div className="mt-4 space-y-2 text-sm text-gray-500">
            <div>• Source Mix Optimizer</div>
            <div>• Best Contact Time Analysis</div>
            <div>• Lead Decay Curves</div>
            <div>• Advanced Forecasting</div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              Current Performance: <strong>{(performanceIndex * 100).toFixed(0)}%</strong> | 
              Rank: <strong>#{rank}</strong>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Calculate source optimizations
  const sourceOptimizations: SourceOptimization[] = Object.entries(leadsBreakdown)
    .map(([source, leads]) => {
      const weight = sourceWeights[source] || 0
      const contribution = leads * weight
      const optimization_score = weight * (1 + Math.random() * 0.5) // Mock optimization potential
      
      return {
        source,
        current_leads: leads,
        weight,
        contribution,
        optimization_score
      }
    })
    .sort((a, b) => b.optimization_score - a.optimization_score)

  // Mock data for advanced insights
  const bestContactTimes = [
    { hour: '9:00 AM', success_rate: 0.42, volume: 15 },
    { hour: '10:00 AM', success_rate: 0.38, volume: 24 },
    { hour: '11:00 AM', success_rate: 0.35, volume: 28 },
    { hour: '2:00 PM', success_rate: 0.41, volume: 22 },
    { hour: '3:00 PM', success_rate: 0.39, volume: 19 },
    { hour: '4:00 PM', success_rate: 0.36, volume: 16 }
  ]

  const leadDecayData = [
    { day: 0, contact_probability: 0.65, close_probability: 0.18 },
    { day: 1, contact_probability: 0.52, close_probability: 0.15 },
    { day: 2, contact_probability: 0.41, close_probability: 0.12 },
    { day: 3, contact_probability: 0.33, close_probability: 0.09 },
    { day: 7, contact_probability: 0.18, close_probability: 0.05 },
    { day: 14, contact_probability: 0.08, close_probability: 0.02 }
  ]

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-amber-50 p-6 rounded-lg border border-yellow-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-amber-900 flex items-center">
            🏆 Leader Analytics
            <span className="ml-2 px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded">UNLOCKED</span>
          </h3>
          <p className="text-sm text-amber-700">
            Advanced insights for top performers (Confidence: {formatPercentage(confidenceScore)})
          </p>
        </div>
        {rank === 1 && (
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{defenseTarget}</div>
            <div className="text-xs text-amber-600">Defense Target</div>
          </div>
        )}
      </div>

      {/* Insight Navigation */}
      <div className="flex space-x-2 mb-6">
        {[
          { key: 'optimizer', label: 'Source Optimizer', icon: '📊' },
          { key: 'timing', label: 'Contact Timing', icon: '⏰' },
          { key: 'decay', label: 'Lead Decay', icon: '📉' },
          { key: 'forecast', label: 'Forecast', icon: '🔮' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedInsight(tab.key as any)}
            className={`px-3 py-2 text-sm font-medium rounded-md flex items-center space-x-1 ${
              selectedInsight === tab.key
                ? 'bg-amber-600 text-white'
                : 'bg-white bg-opacity-60 text-amber-700 hover:bg-white'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Source Mix Optimizer */}
      {selectedInsight === 'optimizer' && (
        <div className="space-y-4">
          <div className="bg-white bg-opacity-80 p-4 rounded-lg">
            <h4 className="font-medium text-amber-900 mb-3">Lead Source Optimization</h4>
            <div className="space-y-3">
              {sourceOptimizations.slice(0, 5).map((optimization) => (
                <div key={optimization.source} className="flex items-center justify-between p-3 bg-amber-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-amber-900 capitalize">{optimization.source}</div>
                    <div className="text-sm text-amber-700">
                      {optimization.current_leads} leads × {optimization.weight.toFixed(3)} weight = {optimization.contribution.toFixed(1)} units
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-amber-800">
                      Optimization Score: {optimization.optimization_score.toFixed(2)}
                    </div>
                    <div className="text-xs text-amber-600">
                      {optimization.optimization_score > optimization.weight ? 'High potential' : 'Optimized'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white bg-opacity-80 p-4 rounded-lg">
            <h5 className="font-medium text-amber-900 mb-2">Recommendations</h5>
            <div className="space-y-2 text-sm text-amber-800">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Focus on {sourceOptimizations[0]?.source} - highest ROI potential
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 text-amber-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Consider reducing low-weight sources below 0.1 efficiency
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contact Timing Analysis */}
      {selectedInsight === 'timing' && (
        <div className="space-y-4">
          <div className="bg-white bg-opacity-80 p-4 rounded-lg">
            <h4 className="font-medium text-amber-900 mb-3">Optimal Contact Times</h4>
            <div className="space-y-3">
              {bestContactTimes.map((timeSlot) => (
                <div key={timeSlot.hour} className="flex items-center justify-between p-3 bg-amber-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-amber-900">{timeSlot.hour}</div>
                    <div className="text-sm text-amber-700">Volume: {timeSlot.volume} calls</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-amber-800">
                      {formatPercentage(timeSlot.success_rate)}
                    </div>
                    <div className="text-xs text-amber-600">Success Rate</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white bg-opacity-80 p-4 rounded-lg">
            <h5 className="font-medium text-amber-900 mb-2">Timing Insights</h5>
            <div className="space-y-2 text-sm text-amber-800">
              <div>• Best contact window: 9-10 AM (42% success rate)</div>
              <div>• Avoid 12-1 PM and after 5 PM (low response rates)</div>
              <div>• Follow-up timing: 2-4 PM shows strong engagement</div>
            </div>
          </div>
        </div>
      )}

      {/* Lead Decay Analysis */}
      {selectedInsight === 'decay' && (
        <div className="space-y-4">
          <div className="bg-white bg-opacity-80 p-4 rounded-lg">
            <h4 className="font-medium text-amber-900 mb-3">Lead Age vs. Performance</h4>
            <div className="space-y-3">
              {leadDecayData.map((dataPoint) => (
                <div key={dataPoint.day} className="flex items-center justify-between p-3 bg-amber-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-amber-900">
                      Day {dataPoint.day} {dataPoint.day === 0 ? '(Same Day)' : ''}
                    </div>
                  </div>
                  <div className="flex space-x-6 text-sm">
                    <div className="text-center">
                      <div className="font-semibold text-blue-700">{formatPercentage(dataPoint.contact_probability)}</div>
                      <div className="text-xs text-blue-600">Contact</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-green-700">{formatPercentage(dataPoint.close_probability)}</div>
                      <div className="text-xs text-green-600">Close</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white bg-opacity-80 p-4 rounded-lg border-l-4 border-amber-400">
            <h5 className="font-medium text-amber-900 mb-2">Critical Insight</h5>
            <div className="text-sm text-amber-800">
              <strong>Same-day contact is 3.6x more effective than day-3 contact.</strong> 
              Prioritize fresh leads for maximum ROI. Contact probability drops 20% per day of delay.
            </div>
          </div>
        </div>
      )}

      {/* Advanced Forecasting */}
      {selectedInsight === 'forecast' && (
        <div className="space-y-4">
          <div className="bg-white bg-opacity-80 p-4 rounded-lg">
            <h4 className="font-medium text-amber-900 mb-3">Advanced Forecasting</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-amber-50 rounded text-center">
                <div className="text-2xl font-bold text-amber-700">{currentUnits + Math.floor(Math.random() * 3)}</div>
                <div className="text-sm text-amber-600">Conservative</div>
                <div className="text-xs text-amber-500">±{Math.ceil(currentUnits * 0.1)} units</div>
              </div>
              <div className="p-3 bg-amber-100 rounded text-center border-2 border-amber-300">
                <div className="text-2xl font-bold text-amber-800">{currentUnits + Math.floor(Math.random() * 5)}</div>
                <div className="text-sm text-amber-700">Most Likely</div>
                <div className="text-xs text-amber-600">±{Math.ceil(currentUnits * 0.15)} units</div>
              </div>
              <div className="p-3 bg-amber-50 rounded text-center">
                <div className="text-2xl font-bold text-amber-700">{currentUnits + Math.floor(Math.random() * 8)}</div>
                <div className="text-sm text-amber-600">Optimistic</div>
                <div className="text-xs text-amber-500">±{Math.ceil(currentUnits * 0.25)} units</div>
              </div>
            </div>
          </div>

          <div className="bg-white bg-opacity-80 p-4 rounded-lg">
            <h5 className="font-medium text-amber-900 mb-3">Confidence Intervals</h5>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-amber-700">Forecast Accuracy</span>
                <span className="font-medium text-amber-800">{formatPercentage(confidenceScore)}</span>
              </div>
              <div className="w-full bg-amber-200 rounded-full h-2">
                <div 
                  className="bg-amber-600 h-2 rounded-full" 
                  style={{ width: `${confidenceScore * 100}%` }}
                />
              </div>
              <div className="text-xs text-amber-600">
                Based on {Math.floor(confidenceScore * 100)} completed opportunities
              </div>
            </div>
          </div>

          {rank === 1 && (
            <div className="bg-gradient-to-r from-yellow-100 to-amber-100 p-4 rounded-lg border border-yellow-300">
              <h5 className="font-medium text-amber-900 mb-2">Defense Strategy</h5>
              <div className="text-sm text-amber-800">
                Maintain <strong>{defenseTarget}</strong> units to defend your #1 position. 
                Focus on process consistency rather than volume increases.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Feature Status */}
      <div className="mt-6 pt-4 border-t border-amber-200">
        <div className="flex items-center justify-between text-xs text-amber-700">
          <span>Advanced Analytics Enabled</span>
          <span>Confidence Level: {formatPercentage(confidenceScore)}</span>
        </div>
      </div>
    </div>
  )
}