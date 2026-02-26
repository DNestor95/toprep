const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function listBigDataUsers() {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('first_name,last_name,email,role')
    .ilike('email', '%@dealer.local')
    .order('role', { ascending: false })
    .order('first_name', { ascending: true })

  if (error) {
    throw new Error(`Failed fetching users: ${error.message}`)
  }

  const rows = data || []
  const managers = rows.filter((u) => u.role === 'manager')
  const reps = rows.filter((u) => u.role === 'sales_rep')

  console.log('=== BIG-DATA LOGIN USERS ===')
  console.log(`Total: ${rows.length} (Managers: ${managers.length}, Reps: ${reps.length})`)
  console.log('Default password: test123')
  console.log('')

  console.log('Managers:')
  managers.forEach((u) => {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim()
    console.log(`- ${name} | ${u.email}`)
  })

  console.log('')
  console.log('Sales Reps:')
  reps.forEach((u) => {
    const name = `${u.first_name || ''} ${u.last_name || ''}`.trim()
    console.log(`- ${name} | ${u.email}`)
  })
}

listBigDataUsers().catch((error) => {
  console.error('Error:', error.message)
  process.exit(1)
})
