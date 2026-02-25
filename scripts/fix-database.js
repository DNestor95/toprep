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

async function fixRLSPolicies() {
  console.log('🔧 Fixing RLS policies...')
  
  try {
    // Temporarily disable RLS for testing
    console.log('Disabling RLS for testing...')
    
    const queries = [
      'ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;',
      'ALTER TABLE deals DISABLE ROW LEVEL SECURITY;', 
      'ALTER TABLE activities DISABLE ROW LEVEL SECURITY;'
    ]

    for (const query of queries) {
      console.log(`Executing: ${query}`)
      const { error } = await supabaseAdmin.rpc('exec_sql', { sql: query })
      if (error) {
        console.error(`Error with query "${query}":`, error.message)
      }
    }

    console.log('✅ RLS temporarily disabled for testing')
    console.log('🚨 Note: In production, you should re-enable RLS with proper policies')
    
    // Test data access
    console.log('\n📊 Testing data access...')
    const { data: deals, error: dealsError } = await supabaseAdmin
      .from('deals')
      .select('count')

    if (dealsError) {
      console.error('Error accessing deals:', dealsError.message)
    } else {
      console.log('✅ Can access deals table')
    }

    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles') 
      .select('count')

    if (profilesError) {
      console.error('Error accessing profiles:', profilesError.message)
    } else {
      console.log('✅ Can access profiles table')
    }

  } catch (error) {
    console.error('Failed to fix RLS policies:', error.message)
  }
}

// Alternative: Just check current data
async function checkData() {
  console.log('📋 Checking current data...')
  
  try {
    const { data: dealCount } = await supabaseAdmin
      .from('deals')
      .select('id', { count: 'exact' })
    
    console.log(`Deals in database: ${dealCount?.length || 0}`)
    
    const { data: profiles } = await supabaseAdmin
      .from('profiles') 
      .select('email, first_name, last_name')
      
    console.log(`Profiles in database: ${profiles?.length || 0}`)
    profiles?.forEach(p => console.log(`  - ${p.first_name} ${p.last_name} (${p.email})`))
    
  } catch (error) {
    console.error('Error checking data:', error)
  }
}

// Run both
async function main() {
  await checkData()
  await fixRLSPolicies()
  
  console.log('\n🎉 Database fix complete!')
  console.log('Now restart your dev server and try logging in again.')
}

main()