// Mock data generator for testing the analytics engine
// Generates realistic sales data for multiple reps with varied performance levels

export interface RepData {
  rep_id: string
  period: string
  units_sold: number
  leads_by_source: Record<string, number>
  unique_leads_attempted: number
  attempts: number
  contacts: number
  appointments_set: number
  appointments_show: number
  first_response_time_minutes?: number
  lead_age_days_at_first_contact?: number
  gross_profit?: number
}

interface RepProfile {
  id: string
  name: string
  skill_level: 'top' | 'high' | 'average' | 'developing'
  source_preference: string[]
  contact_efficiency: number
  closing_ability: number
}

export class MockDataGenerator {
  private readonly sources = ['internet', 'phone', 'walkin', 'service', 'referral']
  private readonly sourceWeights = {
    internet: 0.08,
    phone: 0.12,
    walkin: 0.15,
    service: 0.20,
    referral: 0.25
  }

  generateRepProfiles(): RepProfile[] {
    return [
      {
        id: 'rep-001',
        name: 'Sarah Chen',
        skill_level: 'top',
        source_preference: ['referral', 'service', 'phone'],
        contact_efficiency: 0.75,
        closing_ability: 0.85
      },
      {
        id: 'rep-002', 
        name: 'Mike Rodriguez',
        skill_level: 'high',
        source_preference: ['phone', 'internet', 'service'],
        contact_efficiency: 0.65,
        closing_ability: 0.72
      },
      {
        id: 'rep-003',
        name: 'Jessica Wang',
        skill_level: 'average',
        source_preference: ['internet', 'walkin'],
        contact_efficiency: 0.55,
        closing_ability: 0.60
      },
      {
        id: 'rep-004',
        name: 'David Thompson',
        skill_level: 'developing',
        source_preference: ['phone', 'walkin'],
        contact_efficiency: 0.45,
        closing_ability: 0.50
      },
      {
        id: 'rep-005',
        name: 'Angela Foster',
        skill_level: 'high',
        source_preference: ['service', 'referral'],
        contact_efficiency: 0.68,
        closing_ability: 0.75
      }
    ]
  }

  generateRepData(profile: RepProfile, period: string = '2026-02'): RepData {
    // Base lead volume varies by skill level
    const baseLeads = this.getBaseLeadVolume(profile.skill_level)
    
    // Generate leads by source based on preferences and randomness
    const leads_by_source = this.generateLeadsBySource(profile, baseLeads)
    const total_leads = Object.values(leads_by_source).reduce((a, b) => a + b, 0)
    
    // Calculate attempts and contacts based on rep efficiency
    const unique_leads_attempted = Math.floor(total_leads * (0.85 + Math.random() * 0.1))
    const attempts_per_lead = 2.5 + Math.random() * 1.5 // 2.5-4 attempts per lead
    const attempts = Math.floor(unique_leads_attempted * attempts_per_lead)
    
    // Contacts based on efficiency with some randomness
    const contact_variance = 0.8 + Math.random() * 0.4 // ±20% variance
    const contacts = Math.floor(unique_leads_attempted * profile.contact_efficiency * contact_variance)
    
    // Appointments and shows based on funnel progression
    const appointment_rate = 0.20 + Math.random() * 0.15 // 20-35% of contacts
    const appointments_set = Math.floor(contacts * appointment_rate)
    
    const show_rate = 0.70 + Math.random() * 0.25 // 70-95% show rate
    const appointments_show = Math.floor(appointments_set * show_rate)
    
    // Units sold based on closing ability and shows
    const close_variance = 0.7 + Math.random() * 0.6 // ±30% variance
    const expected_units = this.calculateExpectedUnits(leads_by_source)
    const behavioral_modifier = (profile.contact_efficiency + profile.closing_ability) / 2
    const units_sold = Math.floor(expected_units * behavioral_modifier * close_variance)

    // Additional metrics
    const first_response_time_minutes = Math.floor(15 + Math.random() * 120) // 15-135 minutes
    const lead_age_days_at_first_contact = Math.floor(0.5 + Math.random() * 2) // 0.5-2.5 days
    const gross_profit = units_sold * (3500 + Math.random() * 2000) // $3500-5500 per unit

    return {
      rep_id: profile.id,
      period,
      units_sold,
      leads_by_source,
      unique_leads_attempted,
      attempts,
      contacts,
      appointments_set,
      appointments_show,
      first_response_time_minutes,
      lead_age_days_at_first_contact,
      gross_profit
    }
  }

  private getBaseLeadVolume(skill_level: string): number {
    switch (skill_level) {
      case 'top': return 80 + Math.floor(Math.random() * 20) // 80-100 leads
      case 'high': return 60 + Math.floor(Math.random() * 15) // 60-75 leads
      case 'average': return 45 + Math.floor(Math.random() * 15) // 45-60 leads
      case 'developing': return 30 + Math.floor(Math.random() * 15) // 30-45 leads
      default: return 50
    }
  }

  private generateLeadsBySource(profile: RepProfile, totalLeads: number): Record<string, number> {
    const leads_by_source: Record<string, number> = {}
    let remaining = totalLeads

    // Distribute leads based on preferences and randomness
    for (let i = 0; i < this.sources.length; i++) {
      const source = this.sources[i]
      
      let allocation: number
      if (i === this.sources.length - 1) {
        // Last source gets remaining leads
        allocation = remaining
      } else {
        // Preferred sources get more leads
        const isPreferred = profile.source_preference.includes(source)
        const baseAllocation = totalLeads / this.sources.length
        const preferenceBoost = isPreferred ? 1.5 : 0.8
        const randomVariance = 0.7 + Math.random() * 0.6
        
        allocation = Math.floor(baseAllocation * preferenceBoost * randomVariance)
        allocation = Math.min(allocation, remaining)
      }

      leads_by_source[source] = Math.max(0, allocation)
      remaining -= allocation
    }

    return leads_by_source
  }

  private calculateExpectedUnits(leads_by_source: Record<string, number>): number {
    return Object.entries(leads_by_source).reduce((total, [source, leads]) => {
      const weight = this.sourceWeights[source] || 0.1
      return total + (leads * weight)
    }, 0)
  }

  generateAllRepData(period: string = '2026-02'): RepData[] {
    const profiles = this.generateRepProfiles()
    return profiles.map(profile => this.generateRepData(profile, period))
  }

  // Generate historical data for trend analysis
  generateHistoricalData(months: number = 3): Map<string, RepData[]> {
    const profiles = this.generateRepProfiles()
    const historicalData = new Map<string, RepData[]>()

    const currentDate = new Date('2026-02-25')
    
    for (let i = 0; i < months; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      
      const monthData = profiles.map(profile => {
        // Add some month-to-month variation and trends
        const performanceTrend = i === 0 ? 1.0 : 0.95 + (Math.random() * 0.1) // Slight month-over-month variance
        
        const baseData = this.generateRepData(profile, period)
        
        // Apply trend to key metrics
        baseData.units_sold = Math.floor(baseData.units_sold * performanceTrend)
        baseData.contacts = Math.floor(baseData.contacts * performanceTrend)
        baseData.appointments_set = Math.floor(baseData.appointments_set * performanceTrend)
        
        return baseData
      })

      historicalData.set(period, monthData)
    }

    return historicalData
  }

  // Generate sample data that matches your current database structure
  generateMockActivitiesAndDeals(): { activities: any[], deals: any[] } {
    const profiles = this.generateRepProfiles()
    const activities: any[] = []
    const deals: any[] = []

    profiles.forEach((profile, profileIndex) => {
      const repData = this.generateRepData(profile)
      
      // Generate deals
      for (let i = 0; i < repData.units_sold; i++) {
        deals.push({
          id: `deal-${profile.id}-${i}`,
          sales_rep_id: profile.id,
          customer_name: `Customer ${profileIndex}-${i}`,
          deal_amount: 15000 + Math.random() * 20000,
          status: 'closed_won',
          created_at: this.getRandomDateInPeriod(repData.period),
          close_date: this.getRandomDateInPeriod(repData.period)
        })
      }

      // Generate activities
      for (let i = 0; i < repData.attempts; i++) {
        const activityType = Math.random() < 0.7 ? 'call' : (Math.random() < 0.5 ? 'email' : 'meeting')
        
        activities.push({
          id: `activity-${profile.id}-${i}`,
          deal_id: deals[Math.floor(Math.random() * deals.length)]?.id || `deal-${profile.id}-0`,
          sales_rep_id: profile.id,
          activity_type: activityType,
          description: `${activityType} activity`,
          completed_at: this.getRandomDateInPeriod(repData.period),
          scheduled_at: this.getRandomDateInPeriod(repData.period)
        })
      }
    })

    return { activities, deals }
  }

  private getRandomDateInPeriod(period: string): string {
    const [year, month] = period.split('-').map(Number)
    const startDate = new Date(year, month - 1, 1)
    const endDate = new Date(year, month, 0) // Last day of month
    
    const randomTime = startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime())
    return new Date(randomTime).toISOString()
  }
}