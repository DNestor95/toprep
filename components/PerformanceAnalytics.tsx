'use client'

import { useState } from 'react'
import type { ForecastViewModel } from '@/lib/domain/analytics/forecastViewModel'
import Tooltip from './Tooltip'

interface PerformanceAnalyticsProps {
  forecast: ForecastViewModel
}

export default function PerformanceAnalytics({
  forecast,
}: PerformanceAnalyticsProps) {
  const {
    expectedUnits,
    coreRates,
    performanceMetrics,
    sourceWeights,
    storeBaselines,
    actualUnits,
    isTopPerformer,
    leadsBreakdown,
  } = forecast

  const [selectedTab, setSelectedTab] = useState<'overview' | 'breakdown' | 'comparison'>('overview')

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`
  const formatDecimal = (value: number) => value.toFixed(2)

  const getMultiplierColor = (multiplier: number) => {
    if (multiplier >= 1.1) return 'text-green-600'
    if (multiplier >= 0.9) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConfidenceLevel = (score: number) => {
    if (score >= 0.8) return { level: 'High', color: 'green' }
    if (score >= 0.6) return { level: 'Medium', color: 'yellow' }
    return { level: 'Low', color: 'red' }
  }

  const getConfidenceBadgeClass = (color: 'green' | 'yellow' | 'red') => {
    if (color === 'green') return 'text-sm px-2 py-1 rounded bg-green-100 text-green-700'
    if (color === 'yellow') return 'text-sm px-2 py-1 rounded bg-yellow-100 text-yellow-700'
    return 'text-sm px-2 py-1 rounded bg-red-100 text-red-700'
  }

  const confidence = getConfidenceLevel(performanceMetrics.confidence_score)

  const performanceVariance = actualUnits - expectedUnits.final_expected
  const isOverperforming = performanceVariance > 0

  return (
    <div className="bg-white p-6 rounded-lg shadow border">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Performance Analytics</h3>
          <div className="flex items-center space-x-4 mt-1">
            <span className={getConfidenceBadgeClass(confidence.color)}>
              {confidence.level} Confidence
            </span>
            <span className="text-sm text-gray-500">Rank #{performanceMetrics.rank}</span>
          </div>
        </div>
        {isTopPerformer && (
          <div className="text-2xl">🏆</div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'breakdown', label: 'Breakdown' },
          { key: 'comparison', label: 'vs Store' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedTab(tab.key as any)}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              selectedTab === tab.key
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-center space-x-1">
                <div className="text-2xl font-bold text-blue-700">{actualUnits}</div>
                <Tooltip content="Your actual sales results for this period.">
                  <div className="text-blue-400 hover:text-blue-600 cursor-help">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                </Tooltip>
              </div>
              <div className="text-sm text-blue-600">Actual Units</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="flex items-center justify-center space-x-1">
                <div className="text-2xl font-bold text-green-700">{formatDecimal(expectedUnits.final_expected)}</div>
                <Tooltip content="Algorithmic prediction based on your lead sources and behavior patterns compared to store baseline.">
                  <div className="text-green-400 hover:text-green-600 cursor-help">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                </Tooltip>
              </div>
              <div className="text-sm text-green-600">Expected Units</div>
            </div>
            <div className={`text-center p-4 rounded-lg ${
              isOverperforming ? 'bg-green-50' : 'bg-red-50'
            }`}>
              <div className="flex items-center justify-center space-x-1">
                <div className={`text-2xl font-bold ${
                  isOverperforming ? 'text-green-700' : 'text-red-700'
                }`}>
                  {isOverperforming ? '+' : ''}{formatDecimal(performanceVariance)}
                </div>
                <Tooltip content="Difference between actual and expected performance. Positive means you're exceeding predictions, negative means underperforming expectations.">
                  <div className={`cursor-help ${
                    isOverperforming ? 'text-green-400 hover:text-green-600' : 'text-red-400 hover:text-red-600'
                  }`}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                </Tooltip>
              </div>
              <div className={`text-sm ${
                isOverperforming ? 'text-green-600' : 'text-red-600'
              }`}>
                Variance
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-center space-x-1">
                <div className="text-2xl font-bold text-purple-700">
                  {formatDecimal(performanceMetrics.balanced_score)}
                </div>
                <Tooltip content="Composite score: 60% actual results + 40% process quality (expected units). Rewards both outcomes and good fundamentals.">
                  <div className="text-purple-400 hover:text-purple-600 cursor-help">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                </Tooltip>
              </div>
              <div className="text-sm text-purple-600">Balanced Score</div>
            </div>
          </div>

          {/* Performance Insights */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Performance Insights</h4>
            <div className="space-y-2 text-sm">
              {isOverperforming ? (
                <div className="flex items-center text-green-700">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  You're outperforming expectations by {formatDecimal(Math.abs(performanceVariance))} units
                </div>
              ) : (
                <div className="flex items-center text-red-700">
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  You're underperforming expectations by {formatDecimal(Math.abs(performanceVariance))} units
                </div>
              )}
              
              <div className="text-gray-600">
                Performance Index: {formatPercentage(performanceMetrics.performance_index)} relative to top performer
              </div>
              
              <div className="text-gray-600">
                Confidence Level: {formatPercentage(performanceMetrics.confidence_score)} based on sample size
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Breakdown Tab */}
      {selectedTab === 'breakdown' && (
        <div className="space-y-6">
          {/* Expected Units Breakdown */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Expected Units Calculation</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-sm text-gray-600">Base Expected (from lead mix)</span>
                <span className="font-medium">{formatDecimal(expectedUnits.base_expected)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded">
                <span className="text-sm text-gray-600">Contact Multiplier</span>
                <span className={`font-medium ${getMultiplierColor(expectedUnits.contact_multiplier)}`}>
                  {formatDecimal(expectedUnits.contact_multiplier)}x
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded">
                <span className="text-sm text-gray-600">Appointment Multiplier</span>
                <span className={`font-medium ${getMultiplierColor(expectedUnits.appointment_multiplier)}`}>
                  {formatDecimal(expectedUnits.appointment_multiplier)}x
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-indigo-50 rounded border-2 border-indigo-200">
                <span className="text-sm font-medium text-indigo-800">Final Expected Units</span>
                <span className="font-bold text-indigo-800">{formatDecimal(expectedUnits.final_expected)}</span>
              </div>
            </div>
          </div>

          {/* Core Rates */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Funnel Performance</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 bg-blue-50 rounded text-center">
                <div className="text-lg font-semibold text-blue-700">{formatPercentage(coreRates.contact_rate)}</div>
                <div className="text-xs text-blue-600">Contact Rate</div>
              </div>
              <div className="p-3 bg-green-50 rounded text-center">
                <div className="text-lg font-semibold text-green-700">{formatPercentage(coreRates.appointment_set_rate)}</div>
                <div className="text-xs text-green-600">Appointment Rate</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded text-center">
                <div className="text-lg font-semibold text-yellow-700">{formatPercentage(coreRates.show_rate)}</div>
                <div className="text-xs text-yellow-600">Show Rate</div>
              </div>
              <div className="p-3 bg-purple-50 rounded text-center">
                <div className="text-lg font-semibold text-purple-700">{formatPercentage(coreRates.close_from_show)}</div>
                <div className="text-xs text-purple-600">Close Rate</div>
              </div>
            </div>
          </div>

          {/* Lead Source Breakdown */}
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Lead Source Performance</h4>
            <div className="space-y-2">
              {Object.entries(leadsBreakdown).map(([source, leads]) => {
                const weight = sourceWeights[source] || 0
                const contribution = leads * weight
                return (
                  <div key={source} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 capitalize">{source}</div>
                      <div className="text-sm text-gray-500">{leads} leads × {formatDecimal(weight)} = {formatDecimal(contribution)} units</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{formatDecimal(contribution)}</div>
                      <div className="text-sm text-gray-500">{((contribution / expectedUnits.base_expected) * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Comparison Tab */}
      {selectedTab === 'comparison' && (
        <div className="space-y-6">
          <h4 className="font-medium text-gray-900 mb-3">Performance vs Store Average</h4>
          
          <div className="space-y-4">
            {/* Contact Rate Comparison */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-700">Contact Rate</span>
                <span className={`font-semibold ${
                  coreRates.contact_rate > storeBaselines.contact_rate ? 'text-green-600' : 'text-red-600'
                }`}>
                  {coreRates.contact_rate > storeBaselines.contact_rate ? '↗' : '↘'} 
                  {formatPercentage(Math.abs(coreRates.contact_rate - storeBaselines.contact_rate))}
                </span>
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <div className="text-sm text-gray-600">You</div>
                  <div className="text-lg font-semibold text-blue-600">{formatPercentage(coreRates.contact_rate)}</div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Store Average</div>
                  <div className="text-lg font-semibold text-gray-600">{formatPercentage(storeBaselines.contact_rate)}</div>
                </div>
              </div>
            </div>

            {/* Appointment Rate Comparison */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-gray-700">Appointment Set Rate</span>
                <span className={`font-semibold ${
                  coreRates.appointment_set_rate > storeBaselines.appointment_set_rate ? 'text-green-600' : 'text-red-600'
                }`}>
                  {coreRates.appointment_set_rate > storeBaselines.appointment_set_rate ? '↗' : '↘'} 
                  {formatPercentage(Math.abs(coreRates.appointment_set_rate - storeBaselines.appointment_set_rate))}
                </span>
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <div className="text-sm text-gray-600">You</div>
                  <div className="text-lg font-semibold text-green-600">{formatPercentage(coreRates.appointment_set_rate)}</div>
                </div>
                <div className="flex-1">
                  <div className="text-sm text-gray-600">Store Average</div>
                  <div className="text-lg font-semibold text-gray-600">{formatPercentage(storeBaselines.appointment_set_rate)}</div>
                </div>
              </div>
            </div>

            {/* Behavioral Multipliers */}
            <div className="p-4 bg-indigo-50 rounded-lg">
              <h5 className="font-medium text-indigo-900 mb-3">Behavior Impact</h5>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-indigo-700">Contact behavior impact</span>
                  <span className={`font-semibold ${getMultiplierColor(expectedUnits.contact_multiplier)}`}>
                    {expectedUnits.contact_multiplier > 1 ? '+' : ''}{((expectedUnits.contact_multiplier - 1) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-indigo-700">Appointment behavior impact</span>
                  <span className={`font-semibold ${getMultiplierColor(expectedUnits.appointment_multiplier)}`}>
                    {expectedUnits.appointment_multiplier > 1 ? '+' : ''}{((expectedUnits.appointment_multiplier - 1) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="border-t border-indigo-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-medium text-indigo-800">Total behavior impact</span>
                    <span className={`font-bold ${getMultiplierColor(expectedUnits.contact_multiplier * expectedUnits.appointment_multiplier)}`}>
                      {((expectedUnits.contact_multiplier * expectedUnits.appointment_multiplier - 1) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Analytics Unlock */}
      {performanceMetrics.rank === 1 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded-lg border border-yellow-200">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-yellow-800">
              Advanced Analytics Unlocked - Click here for leader insights
            </span>
          </div>
        </div>
      )}
    </div>
  )
}