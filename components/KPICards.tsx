interface KPICardsProps {
  mtdRevenue: number
  mtdGross: number
  mtdDeals: number
  totalPipeline: number
}

export default function KPICards({ mtdRevenue, mtdGross, mtdDeals, totalPipeline }: KPICardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const kpiData = [
    {
      name: 'MTD Revenue',
      value: formatCurrency(mtdRevenue),
      change: '+12%',
      changeType: 'positive' as const,
    },
    {
      name: 'MTD Gross Profit',
      value: formatCurrency(mtdGross),
      change: '+8%',
      changeType: 'positive' as const,
    },
    {
      name: 'MTD Units Sold',
      value: mtdDeals.toString(),
      change: '+5%',
      changeType: 'positive' as const,
    },
    {
      name: 'Active Pipeline',
      value: totalPipeline.toString(),
      change: '+15%',
      changeType: 'positive' as const,
    },
  ]

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {kpiData.map((item) => (
        <div key={item.name} className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                  <span className="text-white text-sm font-medium">$</span>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {item.name}
                  </dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">
                      {item.value}
                    </div>
                    <div
                      className={`ml-2 flex items-baseline text-sm font-semibold ${
                        item.changeType === 'positive'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {item.change}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}