import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import LeaderboardTable from '@/components/LeaderboardTable'

type RankBy = 'won_units' | 'revenue'

function parseRankBy(value?: string | null): RankBy {
  return value === 'revenue' ? 'revenue' : 'won_units'
}

export default async function Leaderboard({
  searchParams,
}: {
  searchParams?: { rankBy?: string }
}) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  // Fetch leaderboard data - simplified query to avoid RLS issues
  const { data: leaderboardData, error } = await supabase
    .from('deals')
    .select(`
      id,
      sales_rep_id,
      deal_amount,
      gross_profit,
      status,
      created_at
    `)

  console.log('Leaderboard raw data fetched:', leaderboardData?.length)
  if (error) console.error('Leaderboard query error:', error)

  // Fetch profiles separately
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role')

  console.log('Profiles fetched:', profilesData?.length)
  if (profilesError) console.error('Profiles error:', profilesError)

  // Create profiles lookup
  const profilesMap = new Map()
  profilesData?.forEach(profile => {
    profilesMap.set(profile.id, profile)
  })

  const currentUserProfile = profilesMap.get(session.user.id)
  const isManager = currentUserProfile?.role === 'manager' || currentUserProfile?.role === 'admin'
  const requestedRankBy = parseRankBy(searchParams?.rankBy)

  let persistedRankBy: RankBy = 'won_units'
  const { data: persistedSetting, error: settingReadError } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', 'leaderboard_rank_by')
    .maybeSingle()

  if (!settingReadError && persistedSetting?.value) {
    persistedRankBy = parseRankBy(persistedSetting.value)
  }

  if (isManager && searchParams?.rankBy && requestedRankBy !== persistedRankBy) {
    const { error: settingWriteError } = await supabase
      .from('app_settings')
      .upsert(
        {
          key: 'leaderboard_rank_by',
          value: requestedRankBy,
          updated_by: session.user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      )

    if (!settingWriteError) {
      persistedRankBy = requestedRankBy
    }
  }

  const rankBy: RankBy = persistedRankBy

  // Process leaderboard data
  const leaderboard = leaderboardData?.reduce((acc: any[], deal) => {
    const existingRep = acc.find(rep => rep.id === deal.sales_rep_id)
    const profile = profilesMap.get(deal.sales_rep_id)
    
    if (existingRep) {
      existingRep.totalRevenue += parseFloat(deal.deal_amount) || 0
      existingRep.totalGross += parseFloat(deal.gross_profit) || 0
      existingRep.prospectsCount += 1
      if (deal.status === 'closed_won') {
        existingRep.wonCount += 1
        existingRep.wonRevenue += parseFloat(deal.deal_amount) || 0
      }
    } else {
      acc.push({
        id: deal.sales_rep_id,
        name: `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || profile?.email || 'Unknown',
        totalRevenue: parseFloat(deal.deal_amount) || 0,
        totalGross: parseFloat(deal.gross_profit) || 0,
        prospectsCount: 1,
        wonCount: deal.status === 'closed_won' ? 1 : 0,
        wonRevenue: deal.status === 'closed_won' ? parseFloat(deal.deal_amount) || 0 : 0
      })
    }
    
    return acc
  }, []) || []

  if (rankBy === 'revenue') {
    leaderboard.sort((a, b) => {
      if (b.totalRevenue !== a.totalRevenue) {
        return b.totalRevenue - a.totalRevenue
      }

      if (b.wonRevenue !== a.wonRevenue) {
        return b.wonRevenue - a.wonRevenue
      }

      return b.wonCount - a.wonCount
    })
  } else {
    // Sort by won units first (primary ranking metric), then won revenue, then total units
    leaderboard.sort((a, b) => {
      if (b.wonCount !== a.wonCount) {
        return b.wonCount - a.wonCount
      }

      if (b.wonRevenue !== a.wonRevenue) {
        return b.wonRevenue - a.wonRevenue
      }

      return b.prospectsCount - a.prospectsCount
    })
  }

  console.log('Processed leaderboard:', leaderboard.length, 'reps')

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
          <p className="text-gray-600">
            Monthly performance ranking (by {rankBy === 'revenue' ? 'revenue' : 'won units'})
          </p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-gray-900">
                Sales Performance - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h3>
              <div className="flex items-center space-x-3">
                {isManager && (
                  <form action="/leaderboard" method="get" className="flex items-center space-x-2">
                    <label htmlFor="rankBy" className="text-sm text-gray-700 font-medium">
                      Rank by
                    </label>
                    <select
                      id="rankBy"
                      name="rankBy"
                      defaultValue={rankBy}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="won_units">Won Units</option>
                      <option value="revenue">Revenue</option>
                    </select>
                    <button type="submit" className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700">
                      Apply
                    </button>
                  </form>
                )}

                <div className="flex space-x-2">
                  <button className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md text-sm">
                    MTD
                  </button>
                  <button className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm">
                    YTD
                  </button>
                </div>
              </div>
            </div>
            <LeaderboardTable data={leaderboard} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}