-- Analytics Engine Database Schema Enhancement
-- This migration adds support for the comprehensive analytics and catch-up model

-- 1. Add outcome field to activities table for tracking call/activity results
ALTER TABLE activities ADD COLUMN IF NOT EXISTS outcome TEXT 
CHECK (outcome IN (
  'connected', 'no_answer', 'left_vm', 'appt_set', 'showed', 
  'no_show', 'sold', 'lost', 'negotiating', 'follow_up'
));

-- 2. Add lead source tracking to deals table
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'unknown';
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_source_detail TEXT;

-- 3. Add analytics-specific fields to activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS contact_quality_score DECIMAL(3,2) DEFAULT 0.50;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS response_time_minutes INTEGER;
ALTER TABLE activities ADD COLUMN IF NOT EXISTS follow_up_sequence INTEGER DEFAULT 1;

-- 4. Create indexes for analytics performance
CREATE INDEX IF NOT EXISTS idx_activities_outcome ON activities(outcome);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_completed_at ON activities(completed_at);
CREATE INDEX IF NOT EXISTS idx_activities_sales_rep_period ON activities(sales_rep_id, DATE_TRUNC('month', completed_at));
CREATE INDEX IF NOT EXISTS idx_deals_lead_source ON deals(lead_source);
CREATE INDEX IF NOT EXISTS idx_deals_sales_rep_period ON deals(sales_rep_id, DATE_TRUNC('month', created_at));

-- 5. Create analytics aggregation view
CREATE OR REPLACE VIEW analytics_rep_performance AS
WITH monthly_activity_data AS (
  SELECT 
    sales_rep_id,
    DATE_TRUNC('month', completed_at) as period,
    COUNT(*) FILTER (WHERE activity_type = 'call') as total_calls,
    COUNT(DISTINCT deal_id) FILTER (WHERE activity_type IN ('call', 'email', 'text')) as unique_leads_attempted,
    COUNT(*) FILTER (WHERE activity_type IN ('call', 'email', 'text')) as total_attempts,
    COUNT(*) FILTER (WHERE outcome IN ('connected', 'appt_set', 'showed', 'sold')) as contacts,
    COUNT(*) FILTER (WHERE outcome = 'appt_set') as appointments_set,
    COUNT(*) FILTER (WHERE outcome = 'showed') as appointments_show,
    AVG(response_time_minutes) FILTER (WHERE response_time_minutes IS NOT NULL) as avg_response_time,
    COUNT(*) FILTER (WHERE activity_type = 'call' AND outcome = 'no_answer') as no_answers,
    COUNT(*) FILTER (WHERE activity_type = 'call' AND outcome = 'left_vm') as voicemails
  FROM activities 
  WHERE completed_at IS NOT NULL 
    AND completed_at >= CURRENT_DATE - INTERVAL '6 months'
  GROUP BY sales_rep_id, DATE_TRUNC('month', completed_at)
),
monthly_deal_data AS (
  SELECT 
    sales_rep_id,
    DATE_TRUNC('month', created_at) as period,
    lead_source,
    COUNT(*) as leads_count,
    COUNT(*) FILTER (WHERE status = 'closed_won') as units_sold,
    SUM(deal_amount) FILTER (WHERE status = 'closed_won') as revenue,
    SUM(gross_profit) FILTER (WHERE status = 'closed_won') as gross_profit
  FROM deals
  WHERE created_at >= CURRENT_DATE - INTERVAL '6 months'
  GROUP BY sales_rep_id, DATE_TRUNC('month', created_at), lead_source
),
lead_source_aggregated AS (
  SELECT 
    sales_rep_id,
    period,
    SUM(leads_count) as total_leads,
    SUM(units_sold) as units_sold,
    SUM(revenue) as revenue,
    SUM(gross_profit) as gross_profit,
    jsonb_object_agg(lead_source, leads_count) as leads_by_source
  FROM monthly_deal_data
  GROUP BY sales_rep_id, period
)
SELECT 
  COALESCE(a.sales_rep_id, d.sales_rep_id) as sales_rep_id,
  COALESCE(a.period, d.period) as period,
  COALESCE(d.units_sold, 0) as units_sold,
  COALESCE(d.leads_by_source, '{}'::jsonb) as leads_by_source,
  COALESCE(a.unique_leads_attempted, 0) as unique_leads_attempted,
  COALESCE(a.total_attempts, 0) as attempts,
  COALESCE(a.contacts, 0) as contacts,
  COALESCE(a.appointments_set, 0) as appointments_set,
  COALESCE(a.appointments_show, 0) as appointments_show,
  COALESCE(a.avg_response_time, 0) as first_response_time_minutes,
  COALESCE(d.revenue, 0) as revenue,
  COALESCE(d.gross_profit, 0) as gross_profit,
  
  -- Calculated rates
  CASE WHEN a.unique_leads_attempted > 0 
    THEN ROUND((a.contacts::decimal / a.unique_leads_attempted), 4) 
    ELSE 0 
  END as contact_rate,
  
  CASE WHEN a.contacts > 0 
    THEN ROUND((a.appointments_set::decimal / a.contacts), 4) 
    ELSE 0 
  END as appointment_set_rate,
  
  CASE WHEN a.appointments_set > 0 
    THEN ROUND((a.appointments_show::decimal / a.appointments_set), 4) 
    ELSE 0 
  END as show_rate,
  
  CASE WHEN a.appointments_show > 0 
    THEN ROUND((d.units_sold::decimal / a.appointments_show), 4) 
    ELSE 0 
  END as close_from_show_rate,
  
  CASE WHEN a.contacts > 0 
    THEN ROUND((d.units_sold::decimal / a.contacts), 4) 
    ELSE 0 
  END as close_from_contact_rate

FROM monthly_activity_data a
FULL OUTER JOIN lead_source_aggregated d 
  ON a.sales_rep_id = d.sales_rep_id AND a.period = d.period;

-- 6. Create store-wide source weights view  
CREATE OR REPLACE VIEW source_performance_weights AS
WITH source_totals AS (
  SELECT 
    lead_source,
    COUNT(*) as total_leads,
    COUNT(*) FILTER (WHERE status = 'closed_won') as total_units_sold,
    AVG(deal_amount) FILTER (WHERE status = 'closed_won') as avg_deal_amount
  FROM deals
  WHERE created_at >= CURRENT_DATE - INTERVAL '3 months'
    AND lead_source IS NOT NULL
  GROUP BY lead_source
)
SELECT 
  lead_source,
  total_leads,
  total_units_sold,
  avg_deal_amount,
  CASE WHEN total_leads > 0 
    THEN ROUND((total_units_sold::decimal / total_leads), 4) 
    ELSE 0 
  END as conversion_weight,
  CASE WHEN total_leads > 0 
    THEN ROUND((total_units_sold::decimal * avg_deal_amount / total_leads), 2) 
    ELSE 0 
  END as revenue_weight
FROM source_totals
WHERE total_leads >= 5  -- Only include sources with meaningful volume
ORDER BY conversion_weight DESC;

-- 7. Create catch-up targets view
CREATE OR REPLACE VIEW catch_up_targets AS
WITH rolling_performance AS (
  SELECT 
    sales_rep_id,
    AVG(units_sold) as avg_units_3mo,
    AVG(revenue) as avg_revenue_3mo,
    COUNT(*) as periods_with_data
  FROM analytics_rep_performance
  WHERE period >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
  GROUP BY sales_rep_id
  HAVING COUNT(*) >= 2  -- At least 2 months of data
),
top_performer AS (
  SELECT MAX(avg_units_3mo) as top_units
  FROM rolling_performance
)
SELECT 
  rp.sales_rep_id,
  rp.avg_units_3mo as current_units,
  tp.top_units as top_performer_units,
  (tp.top_units - rp.avg_units_3mo) as gap,
  GREATEST(
    CEIL(rp.avg_units_3mo + (tp.top_units - rp.avg_units_3mo) * 0.25),
    rp.avg_units_3mo + 1
  ) as target_units,
  ROUND(rp.avg_units_3mo / tp.top_units, 4) as performance_index,
  rp.periods_with_data
FROM rolling_performance rp
CROSS JOIN top_performer tp;

-- 8. Update existing activities with realistic outcomes for demonstration
UPDATE activities 
SET outcome = CASE 
  WHEN activity_type = 'call' THEN 
    CASE 
      WHEN (EXTRACT(EPOCH FROM created_at)::bigint % 100) < 25 THEN 'no_answer'
      WHEN (EXTRACT(EPOCH FROM created_at)::bigint % 100) < 40 THEN 'left_vm' 
      WHEN (EXTRACT(EPOCH FROM created_at)::bigint % 100) < 75 THEN 'connected'
      ELSE 'appt_set'
    END
  WHEN activity_type = 'meeting' THEN
    CASE 
      WHEN (EXTRACT(EPOCH FROM created_at)::bigint % 100) < 15 THEN 'no_show'
      WHEN (EXTRACT(EPOCH FROM created_at)::bigint % 100) < 70 THEN 'showed'
      WHEN (EXTRACT(EPOCH FROM created_at)::bigint % 100) < 90 THEN 'negotiating'
      ELSE 'sold'
    END
  WHEN activity_type = 'email' THEN 'follow_up'
  WHEN activity_type = 'demo' THEN 
    CASE 
      WHEN (EXTRACT(EPOCH FROM created_at)::bigint % 100) < 15 THEN 'no_show'
      WHEN (EXTRACT(EPOCH FROM created_at)::bigint % 100) < 70 THEN 'showed'
      WHEN (EXTRACT(EPOCH FROM created_at)::bigint % 100) < 90 THEN 'negotiating'
      ELSE 'sold'
    END
  ELSE 'connected'
END
WHERE outcome IS NULL;

-- 9. Update deals with realistic lead sources
UPDATE deals 
SET lead_source = CASE 
  WHEN (EXTRACT(EPOCH FROM created_at)::bigint % 100) < 20 THEN 'referral'
  WHEN (EXTRACT(EPOCH FROM created_at)::bigint % 100) < 35 THEN 'service'
  WHEN (EXTRACT(EPOCH FROM created_at)::bigint % 100) < 50 THEN 'phone'
  WHEN (EXTRACT(EPOCH FROM created_at)::bigint % 100) < 75 THEN 'internet'
  ELSE 'walkin'
END
WHERE lead_source = 'unknown' OR lead_source IS NULL;

-- 10. Grant access to new views
GRANT SELECT ON analytics_rep_performance TO authenticated;
GRANT SELECT ON source_performance_weights TO authenticated;
GRANT SELECT ON catch_up_targets TO authenticated;

-- 11. Create function to get rep analytics data
CREATE OR REPLACE FUNCTION get_rep_analytics(rep_id UUID, target_period TEXT DEFAULT NULL)
RETURNS TABLE (
  rep_data jsonb,
  source_weights jsonb,
  store_baselines jsonb,
  catch_up_data jsonb
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  analysis_period TEXT;
BEGIN
  -- Default to current month if no period specified
  analysis_period := COALESCE(target_period, TO_CHAR(CURRENT_DATE, 'YYYY-MM'));
  
  RETURN QUERY
  SELECT 
    to_jsonb(arp.*) as rep_data,
    (SELECT jsonb_object_agg(lead_source, conversion_weight) FROM source_performance_weights) as source_weights,
    (SELECT jsonb_build_object(
      'contact_rate', AVG(contact_rate),
      'appointment_set_rate', AVG(appointment_set_rate),
      'show_rate', AVG(show_rate)
    ) FROM analytics_rep_performance WHERE period >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')) as store_baselines,
    to_jsonb(ct.*) as catch_up_data
  FROM analytics_rep_performance arp
  LEFT JOIN catch_up_targets ct ON ct.sales_rep_id = arp.sales_rep_id
  WHERE arp.sales_rep_id = rep_id
    AND TO_CHAR(arp.period, 'YYYY-MM') = analysis_period
  LIMIT 1;
END;
$$;