const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function generatePacingTestData() {
  console.log('Generating pacing test data...')

  try {
    // Get all users and deals
    const { data: users } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role')
      .eq('role', 'sales_rep')

    const { data: deals } = await supabase
      .from('deals')
      .select('id, sales_rep_id')

    if (!users?.length || !deals?.length) {
      console.error('No users or deals found')
      return
    }

    console.log(`Found ${users.length} sales reps and ${deals.length} deals`)

    // Generate activities for each sales rep
    const activities = []
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    for (const user of users) {
      const userDeals = deals.filter(d => d.sales_rep_id === user.id)
      
      // Generate activities for the current month
      for (let day = 1; day <= now.getDate(); day++) {
        const activityDate = new Date(currentYear, currentMonth, day)
        
        // Skip weekends
        if (activityDate.getDay() === 0 || activityDate.getDay() === 6) continue
        
        // Generate 8-15 calls per day per rep
        const callsPerDay = 8 + Math.floor(Math.random() * 8)
        
        for (let call = 0; call < callsPerDay; call++) {
          const dealId = userDeals[Math.floor(Math.random() * userDeals.length)]?.id
          if (!dealId) continue

          const callTime = new Date(activityDate)
          callTime.setHours(9 + Math.floor(Math.random() * 8)) // 9 AM to 5 PM
          callTime.setMinutes(Math.floor(Math.random() * 60))

          activities.push({
            id: `call-${user.id}-${day}-${call}`,
            deal_id: dealId,
            sales_rep_id: user.id,
            activity_type: 'call',
            description: 'Outbound call',
            completed_at: callTime.toISOString()
          })

          // 20% chance of generating a meeting from the call
          if (Math.random() < 0.2) {
            const meetingDate = new Date(callTime)
            meetingDate.setDate(meetingDate.getDate() + 1 + Math.floor(Math.random() * 7)) // 1-7 days later

            activities.push({
              id: `meeting-${user.id}-${day}-${call}`,
              deal_id: dealId,
              sales_rep_id: user.id,
              activity_type: 'meeting',
              description: 'Sales meeting',
              completed_at: meetingDate.toISOString(),
              scheduled_at: meetingDate.toISOString()
            })
          }

          // Add some email follow-ups
          if (Math.random() < 0.3) {
            const emailTime = new Date(callTime)
            emailTime.setHours(emailTime.getHours() + 1)

            activities.push({
              id: `email-${user.id}-${day}-${call}`,
              deal_id: dealId,
              sales_rep_id: user.id,
              activity_type: 'email',
              description: 'Follow-up email',
              completed_at: emailTime.toISOString()
            })
          }
        }
      }
    }

    console.log(`Generated ${activities.length} activities`)

    // Insert activities in batches
    const batchSize = 100
    for (let i = 0; i < activities.length; i += batchSize) {
      const batch = activities.slice(i, i + batchSize)
      const { error } = await supabase
        .from('activities')
        .upsert(batch, { onConflict: 'id' })

      if (error) {
        console.error('Error inserting batch:', error)
      } else {
        console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(activities.length / batchSize)}`)
      }
    }

    console.log('✅ Pacing test data generated successfully!')

  } catch (error) {
    console.error('Error generating test data:', error)
  }
}

generatePacingTestData()