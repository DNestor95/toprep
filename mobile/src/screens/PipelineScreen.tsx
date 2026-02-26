import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { Deal, Profile } from '../types'

const STAGES = [
  { id: 'lead', name: 'Lead', color: '#6B7280' },
  { id: 'qualified', name: 'Qualified', color: '#8B5CF6' },
  { id: 'proposal', name: 'Proposal', color: '#3B82F6' },
  { id: 'negotiation', name: 'Negotiation', color: '#F59E0B' },
  { id: 'closed_won', name: 'Closed Won', color: '#10B981' },
  { id: 'closed_lost', name: 'Closed Lost', color: '#EF4444' },
]

export default function PipelineScreen() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedStage, setSelectedStage] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const [profileResult, dealsResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('id, email, first_name, last_name, role')
        .eq('id', session.user.id)
        .maybeSingle(),
      supabase
        .from('deals')
        .select('id, customer_name, deal_amount, gross_profit, status, source, close_date, created_at, sales_rep_id')
        .order('created_at', { ascending: false }),
    ])

    const fetchedProfile = profileResult.data as Profile | null
    setProfile(fetchedProfile)

    let fetchedDeals = (dealsResult.data as Deal[]) || []
    if (fetchedProfile?.role === 'sales_rep') {
      fetchedDeals = fetchedDeals.filter(d => d.sales_rep_id === session.user.id)
    }
    setDeals(fetchedDeals)
  }, [])

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const filteredDeals = selectedStage
    ? deals.filter(d => d.status === selectedStage)
    : deals

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Stage filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.stageScroll}
        contentContainerStyle={styles.stageContainer}
      >
        <TouchableOpacity
          style={[styles.stageChip, selectedStage === null && styles.stageChipActive]}
          onPress={() => setSelectedStage(null)}
        >
          <Text style={[styles.stageChipText, selectedStage === null && styles.stageChipTextActive]}>
            All ({deals.length})
          </Text>
        </TouchableOpacity>
        {STAGES.map(stage => {
          const count = deals.filter(d => d.status === stage.id).length
          const isActive = selectedStage === stage.id
          return (
            <TouchableOpacity
              key={stage.id}
              style={[styles.stageChip, isActive && { backgroundColor: stage.color }]}
              onPress={() => setSelectedStage(isActive ? null : stage.id)}
            >
              <Text style={[styles.stageChipText, isActive && styles.stageChipTextActive]}>
                {stage.name} ({count})
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Deals list */}
      <ScrollView
        style={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredDeals.map(deal => {
          const stage = STAGES.find(s => s.id === deal.status)
          return (
            <View key={deal.id} style={styles.dealCard}>
              <View style={styles.dealHeader}>
                <Text style={styles.customerName}>{deal.customer_name}</Text>
                <Text style={styles.dealAmount}>
                  ${parseFloat(deal.deal_amount).toLocaleString()}
                </Text>
              </View>
              <View style={styles.dealMeta}>
                <View style={[styles.stageDot, { backgroundColor: stage?.color ?? '#6B7280' }]} />
                <Text style={styles.stageName}>{stage?.name ?? deal.status}</Text>
                {deal.source && <Text style={styles.source}> · {deal.source}</Text>}
              </View>
              {deal.close_date && (
                <Text style={styles.closeDate}>
                  Close: {new Date(deal.close_date).toLocaleDateString()}
                </Text>
              )}
            </View>
          )
        })}
        {filteredDeals.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No deals in this stage.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  stageScroll: { flexGrow: 0, backgroundColor: '#FFFFFF' },
  stageContainer: { padding: 12, gap: 8, flexDirection: 'row' },
  stageChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  stageChipActive: { backgroundColor: '#4F46E5' },
  stageChipText: { fontSize: 13, fontWeight: '500', color: '#374151' },
  stageChipTextActive: { color: '#FFFFFF' },
  list: { flex: 1, padding: 12 },
  dealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  dealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  customerName: { fontSize: 15, fontWeight: '700', color: '#111827', flex: 1 },
  dealAmount: { fontSize: 15, fontWeight: '700', color: '#4F46E5' },
  dealMeta: { flexDirection: 'row', alignItems: 'center' },
  stageDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  stageName: { fontSize: 13, color: '#6B7280' },
  source: { fontSize: 13, color: '#9CA3AF' },
  closeDate: { fontSize: 12, color: '#9CA3AF', marginTop: 6 },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
})
