interface Deal {
  id: string
  customer_name: string
  deal_amount: number
  status: string
  profiles?: {
    first_name?: string
    last_name?: string
    email: string
  }
}

interface Stage {
  id: string
  name: string
  deals: Deal[]
}

interface PipelineBoardProps {
  stages: Stage[]
}

export default function PipelineBoard({ stages }: PipelineBoardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStageColor = (stageId: string) => {
    switch (stageId) {
      case 'lead':
        return 'bg-gray-100 border-gray-200'
      case 'qualified':
        return 'bg-blue-100 border-blue-200'
      case 'proposal':
        return 'bg-yellow-100 border-yellow-200'
      case 'negotiation':
        return 'bg-orange-100 border-orange-200'
      case 'closed_won':
        return 'bg-green-100 border-green-200'
      case 'closed_lost':
        return 'bg-red-100 border-red-200'
      default:
        return 'bg-gray-100 border-gray-200'
    }
  }

  const calculateStageValue = (deals: Deal[]) => {
    return deals.reduce((sum, deal) => sum + deal.deal_amount, 0)
  }

  return (
    <div className="overflow-x-auto">
      <div className="inline-flex space-x-4 pb-4">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className={`w-80 rounded-lg p-4 ${getStageColor(stage.id)}`}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">{stage.name}</h3>
              <span className="text-sm text-gray-600">
                {stage.deals.length} ({formatCurrency(calculateStageValue(stage.deals))})
              </span>
            </div>
            
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {stage.deals.map((deal) => (
                <div
                  key={deal.id}
                  className="bg-white p-3 rounded-md shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {deal.customer_name}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(deal.deal_amount)}
                      </p>
                      {deal.profiles && (
                        <p className="text-xs text-gray-500 mt-1">
                          {deal.profiles.first_name} {deal.profiles.last_name}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0">
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {stage.deals.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No deals in this stage</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}