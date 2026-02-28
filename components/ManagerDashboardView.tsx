interface StoreSummary {
  totalUnits: number
  totalGross: number
  avgGrossPerUnit: number
  closeRate: number
  appointmentSetPct: number
  showPct: number
  soldFromShowPct: number
  goalUnits: number
  mtdUnits: number
  projectedMonthEndUnits: number
  paceStatus: 'green' | 'yellow' | 'red'
}

interface LeaderRow {
  repId: string
  repName: string
  wonUnits: number
  totalGross: number
  avgGross: number
  closeRate: number
  appointmentSetPct: number
  showPct: number
  soldFromShowPct: number
  internetWalkInSplit: string
  trend: 'up' | 'down' | 'flat'
  riskFlags: string[]
}

interface AttentionBoard {
  staleInternetLeads: number
  missedFollowUps: number
  unconfirmedAppointmentsToday: number
  repsBelowActivityThreshold: string[]
  repsAtRiskOfMissingTarget: string[]
  openDeals: number
  noActivity48h: number
  negotiationOver3Days: number
  leadsNotContacted30m: number
}

interface SourcePerformanceRow {
  source: string
  leads: number
  units: number
  closeRate: number
  grossPerUnit: number
}

interface ForecastRow {
  repId: string
  repName: string
  currentWonUnits: number
  projectedMonthEndUnits: number
  neededPerDayFor10: number
  neededPerDayFor15: number
  neededPerDayToBeatLeader: number
}

interface CoachingCard {
  repId: string
  repName: string
  title: string
  reason: string
  focus: string
  severity: 'high' | 'medium' | 'low'
}

interface GrossAlert {
  id: string
  title: string
  detail: string
  deltaPct: number
  severity: 'high' | 'medium' | 'low'
}

interface AccountabilityRow {
  dealId: string
  repName: string
  customerName: string
  status: string
  source: string
  riskScore: number
  flags: string[]
  lastActivityAt: string
}

interface ManagerDashboardViewProps {
  managerName: string
  summary: StoreSummary
  leaderboard: LeaderRow[]
  attention: AttentionBoard
  sourcePerformance: SourcePerformanceRow[]
  forecastRows: ForecastRow[]
  coachingCards: CoachingCard[]
  grossAlerts: GrossAlert[]
  accountabilityRows: AccountabilityRow[]
  rankBy: 'won_units' | 'revenue'
  filters: {
    range: 'all' | 'mtd' | '7d' | '14d' | '30d'
    repId: string
    source: string
  }
  filterOptions: {
    reps: Array<{ id: string; name: string }>
    sources: string[]
  }
}

const currency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)

const percent = (value: number) => `${(value * 100).toFixed(1)}%`

const paceBadgeClass = (status: 'green' | 'yellow' | 'red') => {
  if (status === 'green') return 'bg-green-100 text-green-700'
  if (status === 'yellow') return 'bg-yellow-100 text-yellow-700'
  return 'bg-red-100 text-red-700'
}

const rangeLabel = (range: 'all' | 'mtd' | '7d' | '14d' | '30d') => {
  if (range === 'all') return 'All Time'
  if (range === 'mtd') return 'MTD'
  if (range === '7d') return 'Last 7 Days'
  if (range === '14d') return 'Last 14 Days'
  return 'Last 30 Days'
}

export default function ManagerDashboardView({
  managerName,
  summary,
  leaderboard,
  attention,
  sourcePerformance,
  forecastRows,
  coachingCards,
  grossAlerts,
  accountabilityRows,
  rankBy,
  filters,
  filterOptions,
}: ManagerDashboardViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Command Center</h1>
        <p className="text-gray-600">Welcome back, {managerName}. Decision + intervention view for today.</p>
        <div className="mt-2">
          <a
            href="/analytics/personal"
            className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            View your personal sales analytics →
          </a>
        </div>
      </div>

      <form action="/dashboard" method="get" className="bg-white p-4 rounded-lg shadow border flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="range" className="block text-xs text-gray-600 mb-1">Date Range</label>
          <select id="range" name="range" defaultValue={filters.range} className="px-3 py-2 border border-gray-300 rounded-md text-sm">
            <option value="all">All Time</option>
            <option value="mtd">MTD</option>
            <option value="7d">Last 7 Days</option>
            <option value="14d">Last 14 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>

        <div>
          <label htmlFor="repId" className="block text-xs text-gray-600 mb-1">Rep</label>
          <select id="repId" name="repId" defaultValue={filters.repId} className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-44">
            <option value="all">All Reps</option>
            {filterOptions.reps.map((rep) => (
              <option key={rep.id} value={rep.id}>{rep.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="source" className="block text-xs text-gray-600 mb-1">Source</label>
          <select id="source" name="source" defaultValue={filters.source} className="px-3 py-2 border border-gray-300 rounded-md text-sm min-w-36">
            <option value="all">All Sources</option>
            {filterOptions.sources.map((source) => (
              <option key={source} value={source}>{source}</option>
            ))}
          </select>
        </div>

        <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
          Apply Filters
        </button>
      </form>

      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        <div className="text-xs font-medium text-gray-600 mb-2">Active Filters</div>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2 py-1 rounded bg-white border border-gray-200 text-gray-700">
            Range: {rangeLabel(filters.range)}
          </span>
          <span className="px-2 py-1 rounded bg-white border border-gray-200 text-gray-700">
            Rep: {filters.repId === 'all' ? 'All Reps' : (filterOptions.reps.find((rep) => rep.id === filters.repId)?.name || 'Selected Rep')}
          </span>
          <span className="px-2 py-1 rounded bg-white border border-gray-200 text-gray-700">
            Source: {filters.source === 'all' ? 'All Sources' : filters.source}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <p className="text-xs text-gray-500">Total Units (Store)</p>
          <p className="text-2xl font-bold text-gray-900">{summary.totalUnits}</p>
          <p className="text-xs text-gray-500">MTD {summary.mtdUnits} / Goal {summary.goalUnits}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <p className="text-xs text-gray-500">Total Gross (Store)</p>
          <p className="text-2xl font-bold text-gray-900">{currency(summary.totalGross)}</p>
          <p className="text-xs text-gray-500">Avg/Unit {currency(summary.avgGrossPerUnit)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <p className="text-xs text-gray-500">Close Rate</p>
          <p className="text-2xl font-bold text-gray-900">{percent(summary.closeRate)}</p>
          <p className="text-xs text-gray-500">Appt Set {percent(summary.appointmentSetPct)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <p className="text-xs text-gray-500">Show / Sold-from-Show</p>
          <p className="text-2xl font-bold text-gray-900">{percent(summary.showPct)}</p>
          <p className="text-xs text-gray-500">Sold-from-show {percent(summary.soldFromShowPct)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <p className="text-xs text-gray-500">Projected Month End</p>
          <p className="text-2xl font-bold text-gray-900">{summary.projectedMonthEndUnits.toFixed(1)}</p>
          <span className={`inline-block mt-1 px-2 py-1 rounded text-xs font-medium ${paceBadgeClass(summary.paceStatus)}`}>
            Pace {summary.paceStatus.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-1">Leaderboard (Advanced Metrics)</h3>
          <p className="text-sm text-gray-500 mb-4">Ranked by {rankBy === 'revenue' ? 'Revenue' : 'Won Units'}</p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-2 pr-4">Rep</th>
                  <th className="py-2 pr-4">Units</th>
                  <th className="py-2 pr-4">Gross</th>
                  <th className="py-2 pr-4">Avg Gross</th>
                  <th className="py-2 pr-4">Close</th>
                  <th className="py-2 pr-4">Appt%</th>
                  <th className="py-2 pr-4">Show%</th>
                  <th className="py-2 pr-4">Sold/Show%</th>
                  <th className="py-2 pr-4">Internet/Walk-in</th>
                  <th className="py-2 pr-4">7d</th>
                  <th className="py-2">Needs Attention</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row) => (
                  <tr key={row.repId} className="border-b last:border-b-0 align-top">
                    <td className="py-2 pr-4 font-medium text-gray-900">{row.repName}</td>
                    <td className="py-2 pr-4">{row.wonUnits}</td>
                    <td className="py-2 pr-4">{currency(row.totalGross)}</td>
                    <td className="py-2 pr-4">{currency(row.avgGross)}</td>
                    <td className="py-2 pr-4">{percent(row.closeRate)}</td>
                    <td className="py-2 pr-4">{percent(row.appointmentSetPct)}</td>
                    <td className="py-2 pr-4">{percent(row.showPct)}</td>
                    <td className="py-2 pr-4">{percent(row.soldFromShowPct)}</td>
                    <td className="py-2 pr-4">{row.internetWalkInSplit}</td>
                    <td className="py-2 pr-4">{row.trend === 'up' ? '↑' : row.trend === 'down' ? '↓' : '→'}</td>
                    <td className="py-2">
                      <div className="space-y-1">
                        {row.riskFlags.length === 0 ? (
                          <span className="text-green-600">✅ Healthy</span>
                        ) : (
                          row.riskFlags.map((flag) => (
                            <div key={flag} className="text-xs text-gray-700">{flag}</div>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Today’s Action Board</h3>
          <div className="space-y-2 text-sm">
            <div>🔴 {attention.staleInternetLeads} stale internet leads</div>
            <div>🟡 {attention.missedFollowUps} missed follow-ups</div>
            <div>🟡 {attention.unconfirmedAppointmentsToday} appointments today without confirmation</div>
            <div>🔴 {attention.repsBelowActivityThreshold.length} reps below activity threshold</div>
            <div>🟡 {attention.repsAtRiskOfMissingTarget.length} reps projected to miss target by 5+ units</div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded text-sm space-y-1">
            <div><strong>Immediate Attention</strong></div>
            <div>Open deals: {attention.openDeals}</div>
            <div>No activity in 48h: {attention.noActivity48h}</div>
            <div>Negotiation &gt; 3 days: {attention.negotiationOver3Days}</div>
            <div>Leads not contacted in 30m: {attention.leadsNotContacted30m}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Lead Source Performance</h3>
          <div className="space-y-3">
            {sourcePerformance.map((row) => (
              <div key={row.source} className="p-3 bg-gray-50 rounded grid grid-cols-5 gap-2 text-sm">
                <div className="font-medium capitalize text-gray-900">{row.source}</div>
                <div>{row.leads} leads</div>
                <div>{row.units} sold</div>
                <div>{percent(row.closeRate)}</div>
                <div>{currency(row.grossPerUnit)} avg gross</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Catch-The-Leader + Forecast</h3>
          <div className="space-y-2 text-sm">
            {forecastRows.map((row) => (
              <div key={row.repId} className="p-3 bg-gray-50 rounded">
                <div className="font-medium text-gray-900">{row.repName}</div>
                <div>Projected month-end: <strong>{row.projectedMonthEndUnits.toFixed(1)}</strong> units</div>
                <div>Need/day for 10: {row.neededPerDayFor10.toFixed(2)}</div>
                <div>Need/day for 15: {row.neededPerDayFor15.toFixed(2)}</div>
                <div>Need/day to beat #1: {row.neededPerDayToBeatLeader.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Coaching Intelligence Panel</h3>
          <div className="space-y-3">
            {coachingCards.length === 0 ? (
              <div className="text-sm text-gray-500">No coaching flags today.</div>
            ) : (
              coachingCards.map((card) => (
                <div key={`${card.repId}-${card.title}`} className="p-3 bg-gray-50 rounded border">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">{card.repName}</div>
                    <span className={`text-xs px-2 py-1 rounded ${card.severity === 'high' ? 'bg-red-100 text-red-700' : card.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                      {card.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-800 mt-1">{card.title}</div>
                  <div className="text-xs text-gray-600 mt-1">Why: {card.reason}</div>
                  <div className="text-xs text-indigo-700 mt-1">Focus: {card.focus}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Gross Compression Alerts</h3>
          <div className="space-y-3">
            {grossAlerts.length === 0 ? (
              <div className="text-sm text-gray-500">No compression alerts.</div>
            ) : (
              grossAlerts.map((alert) => (
                <div key={alert.id} className="p-3 rounded border bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">{alert.title}</div>
                    <span className={`text-xs px-2 py-1 rounded ${alert.severity === 'high' ? 'bg-red-100 text-red-700' : alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>
                      {alert.deltaPct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 mt-1">{alert.detail}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Accountability Log (Top Risk Deals)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2 pr-4">Risk</th>
                <th className="py-2 pr-4">Rep</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Last Activity</th>
                <th className="py-2">Flags</th>
              </tr>
            </thead>
            <tbody>
              {accountabilityRows.map((row) => (
                <tr key={row.dealId} className="border-b last:border-b-0 align-top">
                  <td className="py-2 pr-4 font-semibold text-gray-900">{row.riskScore}</td>
                  <td className="py-2 pr-4">{row.repName}</td>
                  <td className="py-2 pr-4">{row.customerName}</td>
                  <td className="py-2 pr-4 capitalize">{row.status}</td>
                  <td className="py-2 pr-4 capitalize">{row.source}</td>
                  <td className="py-2 pr-4">{row.lastActivityAt}</td>
                  <td className="py-2">
                    <div className="space-y-1">
                      {row.flags.map((flag) => (
                        <div key={flag} className="text-xs text-gray-700">{flag}</div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {accountabilityRows.length === 0 && (
                <tr>
                  <td className="py-4 text-sm text-gray-500" colSpan={7}>No high-risk deals found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
