const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const testUsers = [
  { email: 'alex@test.com', password: 'test123', firstName: 'Alex', lastName: 'Ramirez', role: 'sales_rep' },
  { email: 'devin@test.com', password: 'test123', firstName: 'Devin', lastName: 'Patel', role: 'sales_rep' },
  { email: 'hayden@test.com', password: 'test123', firstName: 'Hayden', lastName: 'Brooks', role: 'sales_rep' },
  { email: 'marcus@test.com', password: 'test123', firstName: 'Marcus', lastName: 'Lee', role: 'sales_rep' },
  { email: 'jordan@test.com', password: 'test123', firstName: 'Jordan', lastName: 'Kim', role: 'sales_rep' },
  { email: 'manager@test.com', password: 'test123', firstName: 'Test', lastName: 'Manager', role: 'manager' }
]

async function createTestUsers() {
  console.log('Creating test users...')
  
  for (const user of testUsers) {
    try {
      console.log(`Creating user: ${user.email}`)
      
      // Create auth user
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true // Skip email verification
      })

      if (authError) {
        console.error(`Error creating auth user ${user.email}:`, authError.message)
        continue
      }

      console.log(`✅ Auth user created: ${user.email} (ID: ${authData.user.id})`)

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: user.email,
          first_name: user.firstName,
          last_name: user.lastName,
          role: user.role
        })

      if (profileError) {
        console.error(`Error creating profile for ${user.email}:`, profileError.message)
      } else {
        console.log(`✅ Profile created: ${user.firstName} ${user.lastName}`)
      }

    } catch (error) {
      console.error(`Unexpected error for ${user.email}:`, error.message)
    }
  }
}

async function createTestDeals() {
  console.log('\nCreating test deals...')
  
  // Get user IDs
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, first_name, last_name')
  
  if (!profiles || profiles.length === 0) {
    console.error('No profiles found. Make sure users were created first.')
    return
  }

  const deals = [
    { userEmail: 'alex@test.com', customerName: 'Toyota Camry - Smith', amount: 28500, profit: 3500, status: 'closed_won', source: 'Phone' },
    { userEmail: 'alex@test.com', customerName: 'Honda CR-V - Johnson', amount: 32000, profit: 4200, status: 'negotiation', source: 'Internet' },
    { userEmail: 'devin@test.com', customerName: 'Toyota Highlander - Wilson', amount: 45000, profit: 5800, status: 'proposal', source: 'Internet' },
    { userEmail: 'devin@test.com', customerName: 'Ford Explorer - Davis', amount: 38000, profit: 4500, status: 'closed_won', source: 'Walk-in' },
    { userEmail: 'hayden@test.com', customerName: 'Nissan Altima - Brown', amount: 26500, profit: 2800, status: 'qualified', source: 'Referral' },
    { userEmail: 'marcus@test.com', customerName: 'Honda Civic - Miller', amount: 24000, profit: 3200, status: 'closed_won', source: 'Internet' },
    { userEmail: 'jordan@test.com', customerName: 'Toyota RAV4 - Garcia', amount: 35000, profit: 4100, status: 'lead', source: 'Internet' },
    { userEmail: 'jordan@test.com', customerName: 'Chevrolet Tahoe - Martinez', amount: 65000, profit: 8500, status: 'closed_won', source: 'Referral' }
  ]

  for (const deal of deals) {
    const profile = profiles.find(p => p.email === deal.userEmail)
    if (!profile) {
      console.error(`Profile not found for ${deal.userEmail}`)
      continue
    }

    const { error } = await supabaseAdmin
      .from('deals')
      .insert({
        sales_rep_id: profile.id,
        customer_name: deal.customerName,
        deal_amount: deal.amount,
        gross_profit: deal.profit,
        status: deal.status,
        source: deal.source,
        close_date: deal.status === 'closed_won' ? new Date().toISOString().split('T')[0] : null
      })

    if (error) {
      console.error(`Error creating deal ${deal.customerName}:`, error.message)
    } else {
      console.log(`✅ Deal created: ${deal.customerName} for ${profile.first_name}`)
    }
  }
}

async function main() {
  try {
    await createTestUsers()
    await createTestDeals()
    console.log('\n🎉 Test data setup complete!')
    console.log('\nYou can now login with:')
    console.log('- alex@test.com / test123')
    console.log('- manager@test.com / test123')
    console.log('- (or any of the other test users)')
  } catch (error) {
    console.error('Setup failed:', error)
  }
}

main()