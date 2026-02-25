interface Deal {
  id: string
  customer_name: string
  deal_amount: number
  status: string
  created_at: string
}

interface RecentActivitiesProps {
  deals: Deal[]
}

export default function RecentActivities({ deals }: RecentActivitiesProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'closed_won':
        return 'bg-green-100 text-green-800'
      case 'closed_lost':
        return 'bg-red-100 text-red-800'
      case 'negotiation':
        return 'bg-yellow-100 text-yellow-800'
      case 'proposal':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Deals</h3>
        <div className="space-y-4">
          {deals.length > 0 ? (
            deals.map((deal) => (
              <div key={deal.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {deal.customer_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatCurrency(deal.deal_amount)}
                  </p>
                </div>
                <div className="flex-shrink-0 ml-4">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      deal.status
                    )}`}
                  >
                    {formatStatus(deal.status)}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500">No recent deals found.</p>
          )}
        </div>
        <div className="mt-6">
          <a
            href="/pipeline"
            className="w-full flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            View all deals
          </a>
        </div>
      </div>
    </div>
  )
}