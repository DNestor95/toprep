import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import PipelineBoard from '@/components/PipelineBoard'

export default async function Pipeline() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Fetch user profile to check permissions
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single()

  // Fetch deals based on user role
  const dealsQuery = supabase
    .from('deals')
    .select(`
      *,
      profiles:sales_rep_id (
        first_name,
        last_name,
        email
      ),
      activities (
        id,
        activity_type,
        description,
        created_at
      )
    `)
    .order('created_at', { ascending: false })

  if (profile?.role === 'sales_rep') {
    dealsQuery.eq('sales_rep_id', session.user.id)
  }

  const { data: deals } = await dealsQuery

  // Group deals by status
  const stages = [
    { id: 'lead', name: 'Lead', deals: [] },
    { id: 'qualified', name: 'Qualified', deals: [] },
    { id: 'proposal', name: 'Proposal', deals: [] },
    { id: 'negotiation', name: 'Negotiation', deals: [] },
    { id: 'closed_won', name: 'Closed Won', deals: [] },
    { id: 'closed_lost', name: 'Closed Lost', deals: [] }
  ]

  deals?.forEach(deal => {
    const stage = stages.find(s => s.id === deal.status)
    if (stage) {
      stage.deals.push(deal)
    }
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deal Pipeline</h1>
            <p className="text-gray-600">Track deals through your sales process</p>
          </div>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            Add New Deal
          </button>
        </div>

        <PipelineBoard stages={stages} />
      </div>
    </DashboardLayout>
  )
}