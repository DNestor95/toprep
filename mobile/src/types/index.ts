export interface Profile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: 'sales_rep' | 'manager' | 'admin'
}

export interface Deal {
  id: string
  customer_name: string
  // Supabase returns PostgreSQL numeric columns as strings; use parseFloat() when doing math
  deal_amount: string
  gross_profit: string
  status: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost'
  source: string | null
  close_date: string | null
  created_at: string
  sales_rep_id: string
}

export interface Activity {
  id: string
  deal_id: string
  activity_type: string
  description: string | null
  scheduled_at: string | null
  completed_at: string | null
  sales_rep_id: string
}

export interface LeaderboardEntry {
  id: string
  name: string
  totalRevenue: number
  totalGross: number
  wonCount: number
  unitsCount: number
}
