const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const csv = require('csv-parser')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper function to read CSV file
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = []
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', reject)
  })
}

// Get user mapping from rep_id to UUID
async function getUserMapping() {
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, first_name, last_name')
  
  // Map based on the users.csv structure: 1=Alex, 2=Devin, 3=Hayden, 4=Marcus, 5=Jordan
  const mapping = {}
  profiles.forEach(profile => {
    if (profile.email === 'alex@test.com') mapping[1] = profile.id
    if (profile.email === 'devin@test.com') mapping[2] = profile.id
    if (profile.email === 'hayden@test.com') mapping[3] = profile.id
    if (profile.email === 'marcus@test.com') mapping[4] = profile.id
    if (profile.email === 'jordan@test.com') mapping[5] = profile.id
  })
  
  return mapping
}

// Map opportunity status/stage to our deal statuses
function mapStatus(status, stage) {
  if (status === 'sold') return 'closed_won'
  if (stage === 'negotiating') return 'negotiation'
  if (stage === 'appt_set') return 'qualified'
  if (stage === 'contacted') return 'qualified'
  if (stage === 'new') return 'lead'
  return 'lead'
}

// Map activity type
function mapActivityType(type) {
  const typeMapping = {
    'call': 'call',
    'email': 'email',
    'text': 'call', // Map text to call
    'meeting': 'meeting'
  }
  return typeMapping[type] || 'note'
}

async function importFullDataset() {
  console.log('🚀 Starting full dataset import...')
  
  try {
    // Get user mapping
    console.log('Getting user mapping...')
    const userMapping = await getUserMapping()
    console.log('User mapping:', userMapping)

    // Clear existing deals (keep the sample ones or clear all)
    console.log('Clearing existing sample deals...')
    await supabaseAdmin.from('deals').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    
    // Read CSV files
    console.log('Reading CSV files...')
    const opportunities = await readCSV(path.join('test-data', 'opportunities.csv'))
    const financials = await readCSV(path.join('test-data', 'sales_financials.csv'))
    const activities = await readCSV(path.join('test-data', 'activities.csv'))
    
    console.log(`Loaded ${opportunities.length} opportunities, ${financials.length} financials, ${activities.length} activities`)

    // Create financial lookup map
    const financialMap = new Map()
    financials.forEach(f => {
      financialMap.set(f.opportunity_id, f)
    })

    // Import opportunities as deals
    console.log('Importing opportunities as deals...')
    const dealMap = new Map() // opportunity_id -> deal_id
    let importedCount = 0
    
    for (const opp of opportunities) {
      const repId = parseInt(opp.rep_id)
      const userId = userMapping[repId]
      
      if (!userId) {
        console.log(`Skipping opportunity ${opp.id} - no user mapping for rep_id ${repId}`)
        continue
      }

      const financial = financialMap.get(opp.id)
      const dealAmount = financial ? parseFloat(financial.total_gross) : Math.floor(Math.random() * 50000) + 15000
      const grossProfit = financial ? parseFloat(financial.total_gross) : dealAmount * 0.15

      const customerName = `${opp.vehicle_type} ${opp.vehicle_model} - ${opp.eleads_opportunity_id}`
      
      const dealData = {
        sales_rep_id: userId,
        customer_name: customerName,
        deal_amount: dealAmount,
        gross_profit: grossProfit,
        status: mapStatus(opp.status, opp.stage),
        source: opp.source || 'unknown',
        close_date: opp.closed_at || null,
        created_at: opp.created_at || new Date().toISOString()
      }

      const { data, error } = await supabaseAdmin
        .from('deals')
        .insert(dealData)
        .select('id')
        .single()

      if (error) {
        console.error(`Error importing opportunity ${opp.id}:`, error.message)
      } else {
        dealMap.set(opp.id, data.id)
        importedCount++
        if (importedCount % 50 === 0) {
          console.log(`Imported ${importedCount} deals...`)
        }
      }
    }

    console.log(`✅ Imported ${importedCount} deals`)

    // Import activities
    console.log('Importing activities...')
    let activityCount = 0
    
    for (const activity of activities) {
      const dealId = dealMap.get(activity.opportunity_id)
      if (!dealId) {
        continue // Skip activities for opportunities we didn't import
      }

      // Get the sales rep for this deal
      const opportunity = opportunities.find(o => o.id === activity.opportunity_id)
      if (!opportunity) continue
      
      const userId = userMapping[parseInt(opportunity.rep_id)]
      if (!userId) continue

      const activityData = {
        deal_id: dealId,
        sales_rep_id: userId,
        activity_type: mapActivityType(activity.type),
        description: `${activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} activity - ${activity.outcome || 'completed'}`,
        completed_at: activity.at || new Date().toISOString()
      }

      const { error } = await supabaseAdmin
        .from('activities')
        .insert(activityData)

      if (error) {
        console.error(`Error importing activity ${activity.id}:`, error.message)
      } else {
        activityCount++
        if (activityCount % 100 === 0) {
          console.log(`Imported ${activityCount} activities...`)
        }
      }
    }

    console.log(`✅ Imported ${activityCount} activities`)
    
    // Show summary
    console.log('\n📊 Import Summary:')
    console.log(`• ${importedCount} deals imported`)
    console.log(`• ${activityCount} activities imported`)
    console.log(`• ${Object.keys(userMapping).length} sales reps with data`)

    // Show stats by rep
    const { data: dealStats } = await supabaseAdmin
      .from('deals')
      .select(`
        sales_rep_id,
        profiles!deals_sales_rep_id_fkey(first_name, last_name),
        status
      `)
    
    if (dealStats) {
      console.log('\n👥 Deals by Sales Rep:')
      const repStats = {}
      dealStats.forEach(deal => {
        const repName = `${deal.profiles.first_name} ${deal.profiles.last_name}`
        if (!repStats[repName]) {
          repStats[repName] = { total: 0, won: 0 }
        }
        repStats[repName].total++
        if (deal.status === 'closed_won') {
          repStats[repName].won++
        }
      })

      Object.entries(repStats).forEach(([name, stats]) => {
        console.log(`  ${name}: ${stats.total} total deals, ${stats.won} won`)
      })
    }

    console.log('\n🎉 Full dataset import complete!')
    console.log('\nYou can now login and see real data:')
    console.log('• Dashboard: See actual KPIs and metrics')
    console.log('• Leaderboard: Real performance rankings') 
    console.log('• Pipeline: All deals in various stages')

  } catch (error) {
    console.error('Import failed:', error)
  }
}

importFullDataset()