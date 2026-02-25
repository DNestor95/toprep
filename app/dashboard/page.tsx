import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import KPICards from '@/components/KPICards'
import RecentActivities from '@/components/RecentActivities'
import PacingTracker from '@/components/PacingTracker'
import DailyGoals from '@/components/DailyGoals'

export default async function Dashboard() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Fetch user profile - simplified query to avoid RLS issues
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name, role')
    .eq('id', session.user.id)
    .maybeSingle()

  console.log('Profile fetch result:', { profile, profileError })

  // Fetch user's deals - simplified query 
  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select(`
      id,
      customer_name,
      deal_amount,
      gross_profit,
      status,
      source,
      close_date,
      created_at,
      sales_rep_id
    `)
    .order('created_at', { ascending: false })

  console.log('Deals fetch result:', { dealsCount: deals?.length, dealsError })

  // Fetch user's activities for pacing tracker
  const { data: activities, error: activitiesError } = await supabase
    .from('activities')
    .select(`
      id,
      deal_id,
      activity_type,
      description,
      scheduled_at,
      completed_at,
      sales_rep_id
    `)
    .order('completed_at', { ascending: false })

  console.log('Activities fetch result:', { activitiesCount: activities?.length, activitiesError })

  // Filter activities based on user role
  let userActivities = activities || []
  if (profile?.role === 'sales_rep') {
    userActivities = activities?.filter(activity => activity.sales_rep_id === session.user.id) || []
  }

  console.log('Filtered activities for user:', userActivities.length)

  // Filter deals based on user role (since RLS might be having issues)
  let userDeals = deals || []
  if (profile?.role === 'sales_rep') {
    userDeals = deals?.filter(deal => deal.sales_rep_id === session.user.id) || []
  }

  console.log('Filtered deals for user:', userDeals.length)

  // Calculate KPIs - Use broader date range to show data
  const currentDate = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()
  
  // Get deals from current month OR recent deals if no current month data
  let mtdDeals = userDeals.filter(deal => {
    const dealDate = new Date(deal.created_at)
    return dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear
  })

  // If no MTD data, use last 30 days or all deals as fallback
  if (mtdDeals.length === 0) {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    mtdDeals = userDeals.filter(deal => {
      const dealDate = new Date(deal.created_at)
      return dealDate >= thirtyDaysAgo
    })
  }

  // If still no data, just show all deals for demo
  if (mtdDeals.length === 0) {
    mtdDeals = userDeals
  }

  console.log('MTD/Recent deals:', mtdDeals.length)

  const closedWonDeals = mtdDeals.filter(deal => deal.status === 'closed_won')

  const mtdRevenue = closedWonDeals.reduce((sum, deal) => {
    return sum + (parseFloat(deal.deal_amount) || 0)
  }, 0)

  const mtdGross = closedWonDeals.reduce((sum, deal) => {
    return sum + (parseFloat(deal.gross_profit) || 0)
  }, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile?.first_name || session.user.email}
          </h1>
          <p className="text-gray-600">Here's your sales overview for today.</p>
        </div>

        <KPICards 
          mtdRevenue={mtdRevenue}
          mtdGross={mtdGross}
          mtdDeals={closedWonDeals.length}
          totalPipeline={userDeals.filter(d => !['closed_won', 'closed_lost'].includes(d.status)).length || 0}
        />

        <PacingTracker 
          activities={userActivities.map(activity => ({
            id: activity.id,
            deal_id: activity.deal_id,
            activity_type: activity.activity_type,
            outcome: undefined, // Will be simulated in the component
            description: activity.description,
            completed_at: activity.completed_at || activity.scheduled_at,
            scheduled_at: activity.scheduled_at
          }))}
          deals={userDeals.map(deal => ({
            id: deal.id,
            customer_name: deal.customer_name,
            deal_amount: parseFloat(deal.deal_amount) || 0,
            status: deal.status,
            created_at: deal.created_at,
            close_date: deal.close_date
          }))}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <DailyGoals 
              activities={userActivities}
              deals={userDeals}
              monthlyGoals={{
                calls: 220,
                appointments: 44,
                deals: 10,
                revenue: 60000
              }}
            />
          </div>
          
          <div className="lg:col-span-2">
            <RecentActivities deals={userDeals.slice(0, 8) || []} />
          </div>
        </div>

        {/* Quick Actions and Debug Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <a 
                href="/analytics" 
                className="block w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 text-center"
              >
                🧠 Performance Analytics
              </a>
              <a 
                href="/pipeline" 
                className="block w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 text-center"
              >
                View Pipeline ({userDeals.filter(d => !['closed_won', 'closed_lost'].includes(d.status)).length || 0} active)
              </a>
              <a 
                href="/leaderboard" 
                className="block w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 text-center"
              >
                View Leaderboard
              </a>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">System Status</h3>
            <div className="p-3 bg-gray-100 rounded text-sm">
              <p><strong>Data Overview:</strong></p>
              <p>Total deals in DB: {deals?.length || 0}</p>
              <p>User deals: {userDeals.length}</p>
              <p>User activities: {userActivities.length}</p>
              <p>MTD/Recent deals: {mtdDeals.length}</p>
              <p>Closed won: {closedWonDeals.length}</p>
              <p>User role: {profile?.role}</p>
              <p>Active pipeline: {userDeals.filter(d => !['closed_won', 'closed_lost'].includes(d.status)).length || 0}</p>
              {profileError && <p className="text-red-600">Profile Error: {profileError.message}</p>}
              {dealsError && <p className="text-red-600">Deals Error: {dealsError.message}</p>}
              {activitiesError && <p className="text-red-600">Activities Error: {activitiesError.message}</p>}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}