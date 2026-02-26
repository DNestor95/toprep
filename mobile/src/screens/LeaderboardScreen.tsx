import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { LeaderboardEntry } from '../types'

export default function LeaderboardScreen() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    const [dealsResult, profilesResult] = await Promise.all([
      supabase
        .from('deals')
        .select('id, sales_rep_id, deal_amount, gross_profit, status'),
      supabase
        .from('profiles')
        .select('id, first_name, last_name, email'),
    ])

    const dealsData = dealsResult.data || []
    const profilesData = profilesResult.data || []

    const profilesMap = new Map(profilesData.map((p: any) => [p.id, p]))

    const entries = dealsData.reduce((acc: LeaderboardEntry[], deal: any) => {
      const existing = acc.find(e => e.id === deal.sales_rep_id)
      const profile: any = profilesMap.get(deal.sales_rep_id)
      const amount = parseFloat(deal.deal_amount) || 0
      const gross = parseFloat(deal.gross_profit) || 0

      if (existing) {
        existing.totalRevenue += amount
        existing.totalGross += gross
        existing.unitsCount += 1
        if (deal.status === 'closed_won') {
          existing.wonCount += 1
        }
      } else {
        acc.push({
          id: deal.sales_rep_id,
          name: profile
            ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() || profile.email
            : 'Unknown',
          totalRevenue: amount,
          totalGross: gross,
          unitsCount: 1,
          wonCount: deal.status === 'closed_won' ? 1 : 0,
        })
      }
      return acc
    }, [])

    entries.sort((a, b) => b.totalRevenue - a.totalRevenue)
    setLeaderboard(entries)
  }, [])

  useEffect(() => {
    fetchData().finally(() => setLoading(false))
  }, [fetchData])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  const rankColors = ['#F59E0B', '#9CA3AF', '#B45309']
  const rankEmojis = ['🥇', '🥈', '🥉']

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
      <View style={styles.headerCard}>
        <Text style={styles.headerTitle}>
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        <Text style={styles.headerSubtitle}>Sales Performance Ranking</Text>
      </View>

      {leaderboard.map((entry, index) => (
        <View key={entry.id} style={[styles.row, index < 3 && styles.topRow]}>
          <View style={styles.rankContainer}>
            <Text style={styles.rankEmoji}>
              {index < 3 ? rankEmojis[index] : ''}
            </Text>
            <Text style={[styles.rankNumber, index < 3 && { color: rankColors[index] }]}>
              {index + 1}
            </Text>
          </View>

          <View style={styles.repInfo}>
            <Text style={styles.repName}>{entry.name}</Text>
            <Text style={styles.repStats}>
              {entry.wonCount} won · {entry.unitsCount} total
            </Text>
          </View>

          <View style={styles.revenueContainer}>
            <Text style={styles.revenue}>${entry.totalRevenue.toLocaleString()}</Text>
            <Text style={styles.gross}>+${entry.totalGross.toLocaleString()} gross</Text>
          </View>
        </View>
      ))}

      {leaderboard.length === 0 && (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No leaderboard data available.</Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerCard: {
    backgroundColor: '#4F46E5',
    padding: 20,
    marginBottom: 8,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 13, color: '#C7D2FE', marginTop: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  topRow: {
    borderLeftWidth: 4,
    borderLeftColor: '#4F46E5',
  },
  rankContainer: { width: 48, alignItems: 'center' },
  rankEmoji: { fontSize: 18 },
  rankNumber: { fontSize: 16, fontWeight: '700', color: '#6B7280' },
  repInfo: { flex: 1, marginLeft: 8 },
  repName: { fontSize: 15, fontWeight: '700', color: '#111827' },
  repStats: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  revenueContainer: { alignItems: 'flex-end' },
  revenue: { fontSize: 15, fontWeight: '700', color: '#111827' },
  gross: { fontSize: 12, color: '#10B981', marginTop: 2 },
  emptyContainer: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
})
