import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { Profile, Deal, Activity } from '../types'

export default function DashboardScreen() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [deals, setDeals] = useState<Deal[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const [profileResult, dealsResult, activitiesResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role')
        .eq('id', session.user.id)
        .maybeSingle(),
      supabase
        .from('deals')
        .select('id, customer_name, deal_amount, gross_profit, status, source, close_date, created_at, sales_rep_id')
        .order('created_at', { ascending: false }),
      supabase
        .from('activities')
        .select('id, deal_id, activity_type, description, scheduled_at, completed_at, sales_rep_id')
        .order('completed_at', { ascending: false }),
    ])

    const fetchedProfile = profileResult.data as Profile | null
    setProfile(fetchedProfile)

    let fetchedDeals = (dealsResult.data as Deal[]) || []
    let fetchedActivities = (activitiesResult.data as Activity[]) || []

    if (fetchedProfile?.role === 'sales_rep') {
      fetchedDeals = fetchedDeals.filter(d => d.sales_rep_id === session.user.id)
      fetchedActivities = fetchedActivities.filter(a => a.sales_rep_id === session.user.id)
    }

    setDeals(fetchedDeals)
    setActivities(fetchedActivities)
  }, [])

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
  }

  // KPI calculations — use last 30 days; fall back to all deals if no recent data
  const currentDate = new Date()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentDeals = deals.filter(d => new Date(d.created_at) >= thirtyDaysAgo)
  const usingAllDeals = recentDeals.length === 0
  const displayDeals = usingAllDeals ? deals : recentDeals
  const kpiPeriodLabel = usingAllDeals ? 'All Time' : 'Last 30 Days'

  const closedWon = displayDeals.filter(d => d.status === 'closed_won')
  const mtdRevenue = closedWon.reduce((sum, d) => sum + (parseFloat(d.deal_amount) || 0), 0)
  const mtdGross = closedWon.reduce((sum, d) => sum + (parseFloat(d.gross_profit) || 0), 0)
  const activePipeline = deals.filter(d => !['closed_won', 'closed_lost'].includes(d.status)).length

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Welcome, {profile?.first_name || 'Sales Rep'}
          </Text>
          <Text style={styles.date}>
            {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </Text>
        </View>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* KPI Cards */}
      <View style={styles.kpiSection}>
        <Text style={styles.kpiPeriod}>{kpiPeriodLabel}</Text>
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, styles.kpiBlue]}>
            <Text style={styles.kpiLabel}>Revenue</Text>
            <Text style={styles.kpiValue}>${mtdRevenue.toLocaleString()}</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiGreen]}>
            <Text style={styles.kpiLabel}>Gross</Text>
            <Text style={styles.kpiValue}>${mtdGross.toLocaleString()}</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiPurple]}>
            <Text style={styles.kpiLabel}>Deals Closed</Text>
            <Text style={styles.kpiValue}>{closedWon.length}</Text>
          </View>
          <View style={[styles.kpiCard, styles.kpiOrange]}>
            <Text style={styles.kpiLabel}>Active Pipeline</Text>
            <Text style={styles.kpiValue}>{activePipeline}</Text>
          </View>
        </View>
      </View>

      {/* Recent Activities */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activities</Text>
        {activities.slice(0, 5).map(activity => (
          <View key={activity.id} style={styles.activityCard}>
            <View style={styles.activityDot} />
            <View style={styles.activityInfo}>
              <Text style={styles.activityType}>{formatStatus(activity.activity_type)}</Text>
              {activity.description ? (
                <Text style={styles.activityDescription} numberOfLines={1}>
                  {activity.description}
                </Text>
              ) : null}
              <Text style={styles.activityDate}>
                {new Date(activity.completed_at ?? activity.scheduled_at ?? '').toLocaleDateString()}
              </Text>
            </View>
          </View>
        ))}
        {activities.length === 0 && (
          <Text style={styles.emptyText}>No recent activities.</Text>
        )}
      </View>

      {/* Recent Deals */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Deals</Text>
        {deals.slice(0, 5).map(deal => (
          <View key={deal.id} style={styles.dealCard}>
            <View style={styles.dealInfo}>
              <Text style={styles.dealName}>{deal.customer_name}</Text>
              <Text style={styles.dealAmount}>${parseFloat(deal.deal_amount).toLocaleString()}</Text>
            </View>
            <View style={[styles.statusBadge, getStatusStyle(deal.status)]}>
              <Text style={styles.statusText}>{formatStatus(deal.status)}</Text>
            </View>
          </View>
        ))}
        {deals.length === 0 && (
          <Text style={styles.emptyText}>No deals yet.</Text>
        )}
      </View>
    </ScrollView>
  )
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getStatusStyle(status: string) {
  switch (status) {
    case 'closed_won': return { backgroundColor: '#D1FAE5' }
    case 'closed_lost': return { backgroundColor: '#FEE2E2' }
    case 'negotiation': return { backgroundColor: '#FEF3C7' }
    case 'proposal': return { backgroundColor: '#DBEAFE' }
    case 'qualified': return { backgroundColor: '#EDE9FE' }
    default: return { backgroundColor: '#F3F4F6' }
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    padding: 20,
    paddingTop: 16,
  },
  greeting: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  date: { fontSize: 13, color: '#C7D2FE', marginTop: 2 },
  signOutButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  signOutText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  kpiSection: { backgroundColor: '#FFFFFF', marginTop: 0 },
  kpiPeriod: { fontSize: 12, color: '#9CA3AF', paddingHorizontal: 16, paddingTop: 12 },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 8,
  },
  kpiCard: {
    width: '46%',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: '2%',
  },
  kpiBlue: { backgroundColor: '#EFF6FF' },
  kpiGreen: { backgroundColor: '#F0FDF4' },
  kpiPurple: { backgroundColor: '#FAF5FF' },
  kpiOrange: { backgroundColor: '#FFF7ED' },
  kpiLabel: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  kpiValue: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  section: { backgroundColor: '#FFFFFF', margin: 12, borderRadius: 12, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  dealCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dealInfo: { flex: 1 },
  dealName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  dealAmount: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginLeft: 8 },
  statusText: { fontSize: 11, fontWeight: '600', color: '#374151' },
  emptyText: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', paddingVertical: 16 },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
    marginTop: 4,
    marginRight: 10,
  },
  activityInfo: { flex: 1 },
  activityType: { fontSize: 14, fontWeight: '600', color: '#111827' },
  activityDescription: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  activityDate: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
})
