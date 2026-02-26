const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const csv = require('csv-parser')
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

const DATA_DIR = path.join('test-data', 'big-data')
const DEFAULT_PASSWORD = 'test123'

function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = []
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject)
  })
}

function normalizeBoolean(value) {
  return String(value || '').toLowerCase() === 'true'
}

function toEmailFromName(name) {
  return `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '')}@dealer.local`
}

function splitName(name) {
  const parts = String(name || '').trim().split(/\s+/)
  if (parts.length <= 1) return { firstName: parts[0] || 'User', lastName: '' }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  }
}

function mapDealStatus(status, stage) {
  const normalizedStatus = String(status || '').toLowerCase()
  const normalizedStage = String(stage || '').toLowerCase()

  if (normalizedStatus === 'sold') return 'closed_won'
  if (normalizedStatus === 'lost' || normalizedStage === 'lost') return 'closed_lost'
  if (normalizedStage === 'negotiation' || normalizedStage === 'negotiating') return 'negotiation'
  if (normalizedStage === 'showed' || normalizedStage === 'appt_set') return 'qualified'
  if (normalizedStage === 'contacted') return 'qualified'
  return 'lead'
}

function mapActivityType(type) {
  const normalized = String(type || '').toLowerCase()
  if (normalized === 'call' || normalized === 'text') return 'call'
  if (normalized === 'email') return 'email'
  if (normalized === 'appt' || normalized === 'visit') return 'meeting'
  if (normalized === 'note') return 'note'
  return 'note'
}

function toIsoOrNull(value) {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function estimatedDealAmount(opportunityId) {
  const id = Number(opportunityId) || 1
  return 18000 + (id % 50) * 700
}

async function chunkInsert(table, rows, chunkSize = 500) {
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize)
    const { error } = await supabaseAdmin.from(table).insert(chunk)
    if (error) {
      throw new Error(`Failed insert into ${table}: ${error.message}`)
    }
  }
}

async function fetchAllInsertedDeals() {
  const allDeals = []
  const pageSize = 1000
  let from = 0

  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await supabaseAdmin
      .from('deals')
      .select('id, customer_name')
      .ilike('customer_name', 'OPP-%')
      .range(from, to)

    if (error) {
      throw new Error(`Failed reading inserted deals: ${error.message}`)
    }

    if (!data || data.length === 0) {
      break
    }

    allDeals.push(...data)

    if (data.length < pageSize) {
      break
    }

    from += pageSize
  }

  return allDeals
}

async function createOrUpdateAuthUsers(usersCsv) {
  const { data: usersPage, error: listError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (listError) throw new Error(`Unable to list auth users: ${listError.message}`)

  const existingByEmail = new Map()
  for (const user of usersPage.users || []) {
    if (user.email) existingByEmail.set(user.email.toLowerCase(), user)
  }

  const repIdToUserId = new Map()
  const createdUsers = []

  for (const row of usersCsv) {
    if (!normalizeBoolean(row.active)) continue

    const repId = Number(row.id)
    const role = String(row.role || 'sales_rep')
    const { firstName, lastName } = splitName(row.name)
    const email = toEmailFromName(row.name)

    let authUser = existingByEmail.get(email)

    if (!authUser) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
          role,
          rep_id: repId,
        },
      })

      if (error || !data?.user) {
        throw new Error(`Failed creating auth user ${email}: ${error?.message || 'unknown error'}`)
      }

      authUser = data.user
      createdUsers.push({ email, role })
      existingByEmail.set(email, authUser)
    } else {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
        password: DEFAULT_PASSWORD,
        email_confirm: true,
        user_metadata: {
          ...(authUser.user_metadata || {}),
          first_name: firstName,
          last_name: lastName,
          role,
          rep_id: repId,
        },
      })

      if (error) {
        throw new Error(`Failed updating auth user ${email}: ${error.message}`)
      }
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: authUser.id,
          email,
          first_name: firstName,
          last_name: lastName,
          role,
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      throw new Error(`Failed upserting profile ${email}: ${profileError.message}`)
    }

    repIdToUserId.set(repId, authUser.id)
  }

  return { repIdToUserId, createdUsers }
}

async function importBigData() {
  console.log('🚀 Importing big dealership dataset...')

  const usersCsv = await readCSV(path.join(DATA_DIR, 'users.csv'))
  const opportunities = await readCSV(path.join(DATA_DIR, 'opportunities.csv'))
  const financials = await readCSV(path.join(DATA_DIR, 'sales_financials.csv'))
  const activities = await readCSV(path.join(DATA_DIR, 'activities.csv'))

  console.log(`Loaded CSVs: users=${usersCsv.length}, opportunities=${opportunities.length}, financials=${financials.length}, activities=${activities.length}`)

  const { repIdToUserId, createdUsers } = await createOrUpdateAuthUsers(usersCsv)

  console.log(`Auth/profile provisioning complete. Created ${createdUsers.length} new users.`)

  const repIdsInUsers = new Set(usersCsv.filter((u) => normalizeBoolean(u.active)).map((u) => Number(u.id)))
  const repCount = [...repIdsInUsers].filter((id) => id <= 30).length
  const managerCount = [...repIdsInUsers].filter((id) => id >= 100).length
  console.log(`Active users in big-data: ${repCount} reps, ${managerCount} managers`)

  console.log('Clearing existing activities and deals...')
  const { error: deleteActivitiesError } = await supabaseAdmin.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (deleteActivitiesError) throw new Error(`Failed clearing activities: ${deleteActivitiesError.message}`)

  const { error: deleteDealsError } = await supabaseAdmin.from('deals').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (deleteDealsError) throw new Error(`Failed clearing deals: ${deleteDealsError.message}`)

  const financialByOpportunity = new Map()
  for (const row of financials) {
    financialByOpportunity.set(String(row.opportunity_id), row)
  }

  const dealRows = []
  const opportunityById = new Map()

  for (const opp of opportunities) {
    const opportunityId = String(opp.id)
    opportunityById.set(opportunityId, opp)

    const repId = Number(opp.rep_id)
    const userId = repIdToUserId.get(repId)
    if (!userId) continue

    const fin = financialByOpportunity.get(opportunityId)
    const gross = fin ? Number(fin.total_gross) || 0 : Math.round(estimatedDealAmount(opportunityId) * 0.12)
    const amount = fin ? Math.max(5000, Math.round((Number(fin.total_gross) || 0) * 8)) : estimatedDealAmount(opportunityId)

    dealRows.push({
      sales_rep_id: userId,
      customer_name: `OPP-${opportunityId} ${opp.vehicle_type || 'vehicle'} ${opp.vehicle_model || ''} - ${opp.eleads_opportunity_id || ''}`.trim(),
      deal_amount: amount,
      gross_profit: gross,
      status: mapDealStatus(opp.status, opp.stage),
      source: opp.source || 'unknown',
      close_date: toIsoOrNull(opp.closed_at),
      created_at: toIsoOrNull(opp.created_at) || new Date().toISOString(),
    })
  }

  console.log(`Inserting ${dealRows.length} deals...`)
  await chunkInsert('deals', dealRows, 500)

  const insertedDeals = await fetchAllInsertedDeals()

  const dealIdByOpportunity = new Map()
  for (const deal of insertedDeals || []) {
    const match = /^OPP-(\d+)\b/.exec(deal.customer_name || '')
    if (match) {
      dealIdByOpportunity.set(match[1], deal.id)
    }
  }

  const activityRows = []
  for (const activity of activities) {
    const opportunityId = String(activity.opportunity_id)
    const dealId = dealIdByOpportunity.get(opportunityId)
    const opp = opportunityById.get(opportunityId)
    if (!dealId || !opp) continue

    const repId = Number(opp.rep_id)
    const salesRepId = repIdToUserId.get(repId)
    if (!salesRepId) continue

    const atIso = toIsoOrNull(activity.at) || new Date().toISOString()

    activityRows.push({
      deal_id: dealId,
      sales_rep_id: salesRepId,
      activity_type: mapActivityType(activity.type),
      description: `${String(activity.type || 'activity').toUpperCase()} - ${activity.outcome || 'completed'}`,
      scheduled_at: atIso,
      completed_at: atIso,
      created_at: atIso,
    })
  }

  console.log(`Inserting ${activityRows.length} activities...`)
  await chunkInsert('activities', activityRows, 800)

  console.log('✅ Big-data import complete.')
  console.log(`✅ Provisioned users: 30 reps + 2 managers (from users.csv active rows).`)
  console.log(`✅ Imported deals: ${dealRows.length}`)
  console.log(`✅ Imported activities: ${activityRows.length}`)
  console.log(`🔐 Login password for provisioned users: ${DEFAULT_PASSWORD}`)
}

importBigData().catch((error) => {
  console.error('❌ Big-data import failed:', error.message)
  process.exit(1)
})
