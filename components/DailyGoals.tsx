'use client'

import { useState, useMemo } from 'react'

interface DailyMetrics {
  date: string
  calls: number
  connections: number
  appointments: number
  shows: number
  deals: number
  revenue: number
}

interface DailyGoalsProps {
  activities: any[]
  deals: any[]
  monthlyGoals?: {
    calls: number
    appointments: number
    deals: number
    revenue: number
  }
}

export default function DailyGoals({ activities, deals, monthlyGoals }: DailyGoalsProps) {
  const [selectedView, setSelectedView] = useState<'current' | 'trend'>('current')

  // Default monthly goals if not provided
  const goals = monthlyGoals || {
    calls: 200,
    appointments: 40,
    deals: 8,
    revenue: 50000
  }

  const dailyMetrics = useMemo((): DailyMetrics[] => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
    
    const metrics: DailyMetrics[] = []
    
    for (let day = 1; day <= Math.min(daysInMonth, now.getDate()); day++) {
      const dayStart = new Date(currentYear, currentMonth, day)
      const dayEnd = new Date(currentYear, currentMonth, day + 1)
      
      const dayActivities = activities.filter(activity => {
        const activityDate = new Date(activity.completed_at)
        return activityDate >= dayStart && activityDate < dayEnd
      })
      
      const dayDeals = deals.filter(deal => {
        const dealDate = new Date(deal.created_at)
        return dealDate >= dayStart && dealDate < dayEnd && deal.status === 'closed_won'
      })
      
      // Simulate realistic outcomes for activities
      const calls = dayActivities.filter(a => a.activity_type === 'call').length
      const connections = Math.floor(calls * 0.65) // 65% connection rate
      const appointments = Math.floor(connections * 0.25) // 25% appointment rate
      const shows = Math.floor(appointments * 0.8) // 80% show rate
      const dayRevenue = dayDeals.reduce((sum, deal) => sum + deal.deal_amount, 0)
      
      metrics.push({
        date: dayStart.toISOString().split('T')[0],
        calls,
        connections,
        appointments,
        shows,
        deals: dayDeals.length,
        revenue: dayRevenue
      })
    }
    
    return metrics
  }, [activities, deals])

  const currentMetrics = dailyMetrics[dailyMetrics.length - 1] || {
    date: new Date().toISOString().split('T')[0],
    calls: 0,
    connections: 0,
    appointments: 0,
    shows: 0,
    deals: 0,
    revenue: 0
  }

  const totalMetrics = useMemo(() => {
    return dailyMetrics.reduce(
      (totals, day) => ({
        calls: totals.calls + day.calls,
        connections: totals.connections + day.connections,
        appointments: totals.appointments + day.appointments,
        shows: totals.shows + day.shows,
        deals: totals.deals + day.deals,
        revenue: totals.revenue + day.revenue
      }),
      { calls: 0, connections: 0, appointments: 0, shows: 0, deals: 0, revenue: 0 }
    )
  }, [dailyMetrics])

  const workingDaysInMonth = Math.floor(new Date().getDate() * 0.7) // Assuming 70% are working days
  const dailyGoals = {
    calls: Math.ceil(goals.calls / 22), // Assuming 22 working days per month
    appointments: Math.ceil(goals.appointments / 22),
    deals: Math.ceil(goals.deals / 22),
    revenue: Math.ceil(goals.revenue / 22)
  }

  const getProgressColor = (current: number, goal: number) => {
    const percentage = goal > 0 ? (current / goal) * 100 : 0
    if (percentage >= 100) return 'text-green-600 bg-green-50'
    if (percentage >= 80) return 'text-yellow-600 bg-yellow-50'
    return 'text-red-600 bg-red-50'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-900">Daily Goals</h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedView('current')}
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              selectedView === 'current'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setSelectedView('trend')}
            className={`px-3 py-1 text-xs font-medium rounded-md ${
              selectedView === 'trend'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Trend
          </button>
        </div>
      </div>

      {selectedView === 'current' ? (
        <div className="space-y-4">
          {/* Today's Performance */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`p-3 rounded-lg ${getProgressColor(currentMetrics.calls, dailyGoals.calls)}`}>
              <div className="text-2xl font-bold">{currentMetrics.calls}</div>
              <div className="text-sm">Calls Today</div>
              <div className="text-xs opacity-75">Goal: {dailyGoals.calls}</div>
            </div>
            
            <div className={`p-3 rounded-lg ${getProgressColor(currentMetrics.appointments, dailyGoals.appointments)}`}>
              <div className="text-2xl font-bold">{currentMetrics.appointments}</div>
              <div className="text-sm">Appointments</div>
              <div className="text-xs opacity-75">Goal: {dailyGoals.appointments}</div>
            </div>
            
            <div className={`p-3 rounded-lg ${getProgressColor(currentMetrics.deals, dailyGoals.deals)}`}>
              <div className="text-2xl font-bold">{currentMetrics.deals}</div>
              <div className="text-sm">Deals</div>
              <div className="text-xs opacity-75">Goal: {dailyGoals.deals}</div>
            </div>
            
            <div className={`p-3 rounded-lg ${getProgressColor(currentMetrics.revenue, dailyGoals.revenue)}`}>
              <div className="text-lg font-bold">{formatCurrency(currentMetrics.revenue)}</div>
              <div className="text-sm">Revenue</div>
              <div className="text-xs opacity-75">Goal: {formatCurrency(dailyGoals.revenue)}</div>
            </div>
          </div>

          {/* Month Progress */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Month Progress</h4>
            <div className="space-y-3">
              {Object.entries(goals).map(([key, monthlyGoal]) => {
                const current = totalMetrics[key as keyof typeof totalMetrics]
                const percentage = monthlyGoal > 0 ? (current / monthlyGoal) * 100 : 0
                
                return (
                  <div key={key} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize">{key}</span>
                        <span>{key === 'revenue' ? formatCurrency(current) : current} / {key === 'revenue' ? formatCurrency(monthlyGoal) : monthlyGoal}</span>
                      </div>
                      <div className="mt-1 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            percentage >= 100 ? 'bg-green-500' : 
                            percentage >= 80 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        // Trend view
        <div className="space-y-4">
          <div className="text-sm text-gray-600">Last 7 days performance</div>
          <div className="space-y-2">
            {dailyMetrics.slice(-7).map((day, index) => (
              <div key={day.date} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="text-sm font-medium">
                  {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                </div>
                <div className="flex space-x-4 text-sm">
                  <span>📞 {day.calls}</span>
                  <span>📅 {day.appointments}</span>
                  <span>🤝 {day.deals}</span>
                  <span>💰 {formatCurrency(day.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}