'use client'

import { useState } from 'react'
import Tooltip from './Tooltip'

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

interface CoreRates {
  contact_rate: number
  appointment_set_rate: number
  show_rate: number
  close_from_show: number
  close_from_contact: number
}

interface CatchUpRecommendationsProps {
  catchUpTarget: CatchUpTarget
  activityRecommendations: ActivityRecommendations
  coreRates: CoreRates
  isTopPerformer: boolean
  performanceIndex: number
}

export default function CatchUpRecommendations({
  catchUpTarget,
  activityRecommendations,
  coreRates,
  isTopPerformer,
  performanceIndex
}: CatchUpRecommendationsProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<'leads' | 'contact' | 'combined'>('combined')

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`

  const getPerformanceColor = (index: number) => {
    if (index >= 0.9) return 'text-green-600 bg-green-50'
    if (index >= 0.7) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const getGapSeverity = (gap: number) => {
    if (gap <= 2) return { color: 'green', label: 'Close' }
    if (gap <= 5) return { color: 'yellow', label: 'Moderate' }
    return { color: 'red', label: 'Significant' }
  }

  const getGapSeverityClass = (color: 'green' | 'yellow' | 'red') => {
    if (color === 'green') return 'text-xs text-green-500'
    if (color === 'yellow') return 'text-xs text-yellow-500'
    return 'text-xs text-red-500'
  }

  const gapSeverity = getGapSeverity(catchUpTarget.gap)

  if (isTopPerformer) {
    return (
      <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 p-6 rounded-lg border border-yellow-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-yellow-800">🏆 Top Performer Status</h3>
          <div className="text-2xl font-bold text-yellow-700">{catchUpTarget.current_units} units</div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-white bg-opacity-60 rounded">
            <div className="text-lg font-semibold text-yellow-700">{formatPercentage(coreRates.contact_rate)}</div>
            <div className="text-sm text-yellow-600">Contact Rate</div>
          </div>
          <div className="text-center p-3 bg-white bg-opacity-60 rounded">
            <div className="text-lg font-semibold text-yellow-700">{formatPercentage(coreRates.appointment_set_rate)}</div>
            <div className="text-sm text-yellow-600">Appointment Rate</div>
          </div>
          <div className="text-center p-3 bg-white bg-opacity-60 rounded">
            <div className="text-lg font-semibold text-yellow-700">{formatPercentage(coreRates.show_rate)}</div>
            <div className="text-sm text-yellow-600">Show Rate</div>
          </div>
          <div className="text-center p-3 bg-white bg-opacity-60 rounded">
            <div className="text-lg font-semibold text-yellow-700">{formatPercentage(coreRates.close_from_show)}</div>
            <div className="text-sm text-yellow-600">Close Rate</div>
          </div>
        </div>

        <div className="bg-white bg-opacity-60 p-4 rounded">
          <h4 className="font-medium text-yellow-800 mb-2">Defense Target</h4>
          <p className="text-sm text-yellow-700">
            Maintain at least <strong>{Math.ceil(catchUpTarget.current_units * 0.95)}</strong> units next month to defend your position.
          </p>
          <p className="text-xs text-yellow-600 mt-2">
            Focus on process optimization and helping teammates to strengthen overall team performance.
          </p>
        </div>
      </div>
    )
  }

  if (activityRecommendations.is_on_track) {
    return (
      <div className="bg-green-50 p-6 rounded-lg border border-green-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-green-800">✅ On Track</h3>
          <div className={`px-3 py-1 rounded-lg ${getPerformanceColor(performanceIndex)}`}>
            <span className="text-sm font-medium">PI: {(performanceIndex * 100).toFixed(0)}%</span>
          </div>
        </div>
        
        <p className="text-green-700 mb-4">
          Your current performance trajectory will meet or exceed the target for next month.
        </p>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white bg-opacity-60 p-3 rounded">
            <div className="text-lg font-semibold text-green-700">{catchUpTarget.current_units}</div>
            <div className="text-sm text-green-600">Current Units</div>
          </div>
          <div className="bg-white bg-opacity-60 p-3 rounded">
            <div className="text-lg font-semibold text-green-700">{catchUpTarget.target_units}</div>
            <div className="text-sm text-green-600">Target Units</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Catch-Up Strategy</h3>
        <Tooltip content="Performance Index: Your units divided by top performer's units. Shows your relative position as a percentage.">
          <div className={`px-3 py-1 rounded-lg ${getPerformanceColor(performanceIndex)} cursor-help`}>
            <span className="text-sm font-medium">PI: {(performanceIndex * 100).toFixed(0)}%</span>
          </div>
        </Tooltip>
      </div>

      {/* Gap Analysis */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="flex items-center justify-center space-x-1">
            <div className="text-2xl font-bold text-gray-900">{catchUpTarget.current_units}</div>
            <Tooltip content="Your current monthly average units sold.">
              <div className="text-gray-400 hover:text-gray-600 cursor-help">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
            </Tooltip>
          </div>
          <div className="text-sm text-gray-600">Current</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded">
          <div className="flex items-center justify-center space-x-1">
            <div className="text-2xl font-bold text-blue-600">{catchUpTarget.target_units}</div>
            <Tooltip content="Your recommended target for next month. Calculated as: Current + (Gap × 25%). Designed to close the gap progressively while remaining achievable.">
              <div className="text-blue-400 hover:text-blue-600 cursor-help">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
            </Tooltip>
          </div>
          <div className="text-sm text-blue-600">Target</div>
          <div className="text-xs text-blue-500">+{catchUpTarget.delta_units}</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded">
          <div className="flex items-center justify-center space-x-1">
            <div className="text-2xl font-bold text-gray-500">{catchUpTarget.top_performer_units}</div>
            <Tooltip content="Current top performer's monthly average. Your long-term goal for catching up.">
              <div className="text-gray-400 hover:text-gray-600 cursor-help">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
            </Tooltip>
          </div>
          <div className="text-sm text-gray-600">Top Performer</div>
          <div className={getGapSeverityClass(gapSeverity.color)}>Gap: {catchUpTarget.gap}</div>
        </div>
      </div>

      {/* Strategy Selection */}
      <div className="flex space-x-2 mb-4">
        {[
          { key: 'leads', label: 'More Leads' },
          { key: 'contact', label: 'Better Contact Rate' },
          { key: 'combined', label: 'Combined' }
        ].map((strategy) => (
          <button
            key={strategy.key}
            onClick={() => setSelectedStrategy(strategy.key as any)}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              selectedStrategy === strategy.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {strategy.label}
          </button>
        ))}
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        {(selectedStrategy === 'leads' || selectedStrategy === 'combined') && (
          <div className="p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-3">📈 Additional Leads Needed</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(activityRecommendations.additional_leads_needed)
                .slice(0, 3)
                .map(([source, count]) => (
                <div key={source} className="bg-white p-3 rounded">
                  <div className="text-lg font-semibold text-blue-700">{count}</div>
                  <div className="text-sm text-blue-600 capitalize">{source} leads</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(selectedStrategy === 'contact' || selectedStrategy === 'combined') && (
          <div className="p-4 bg-green-50 rounded-lg">
            <h4 className="font-medium text-green-900 mb-3">📞 Contact Rate Improvement</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded">
                <div className="text-sm text-green-600">Current Contact Rate</div>
                <div className="text-lg font-semibold text-green-700">
                  {formatPercentage(coreRates.contact_rate)}
                </div>
              </div>
              <div className="bg-white p-3 rounded">
                <div className="text-sm text-green-600">Target Contact Rate</div>
                <div className="text-lg font-semibold text-green-700">
                  {formatPercentage(activityRecommendations.required_contact_rate)}
                </div>
              </div>
            </div>
            
            {activityRecommendations.additional_attempts_needed > 0 && (
              <div className="mt-3 p-3 bg-white rounded">
                <div className="text-sm text-green-600">Additional Quality Attempts</div>
                <div className="text-lg font-semibold text-green-700">
                  +{activityRecommendations.additional_attempts_needed} calls/texts
                </div>
                <div className="text-xs text-green-500 mt-1">
                  Focus on quality contacts, not volume
                </div>
              </div>
            )}
          </div>
        )}

        {/* Process Metrics */}
        <div className="p-4 bg-yellow-50 rounded-lg">
          <h4 className="font-medium text-yellow-900 mb-3">📊 Your Process Metrics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white p-2 rounded text-center">
              <div className="text-sm font-semibold text-yellow-700">{formatPercentage(coreRates.contact_rate)}</div>
              <div className="text-xs text-yellow-600">Contact Rate</div>
            </div>
            <div className="bg-white p-2 rounded text-center">
              <div className="text-sm font-semibold text-yellow-700">{formatPercentage(coreRates.appointment_set_rate)}</div>
              <div className="text-xs text-yellow-600">Appt Rate</div>
            </div>
            <div className="bg-white p-2 rounded text-center">
              <div className="text-sm font-semibold text-yellow-700">{formatPercentage(coreRates.show_rate)}</div>
              <div className="text-xs text-yellow-600">Show Rate</div>
            </div>
            <div className="bg-white p-2 rounded text-center">
              <div className="text-sm font-semibold text-yellow-700">{formatPercentage(coreRates.close_from_show)}</div>
              <div className="text-xs text-yellow-600">Close Rate</div>
            </div>
          </div>
        </div>

        {/* Anti-Gaming Notice */}
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-red-400 mt-0.5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div>
              <h5 className="text-sm font-medium text-red-800">Quality Focus</h5>
              <p className="text-xs text-red-700 mt-1">
                Recommendations emphasize meaningful contacts and quality efforts. 
                Volume without engagement won't improve your metrics.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}