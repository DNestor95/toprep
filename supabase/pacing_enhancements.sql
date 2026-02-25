-- Enhanced schema for pacing tracker
-- Add outcome field to activities table

-- First, add the outcome column if it doesn't exist
ALTER TABLE activities ADD COLUMN IF NOT EXISTS outcome TEXT 
CHECK (outcome IN (
  'connected', 'no_answer', 'left_vm', 'appt_set', 'showed', 
  'no_show', 'sold', 'lost', 'negotiating', 'follow_up'
));

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_activities_outcome ON activities(outcome);
CREATE INDEX IF NOT EXISTS idx_activities_activity_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_completed_at ON activities(completed_at);

-- Update existing activities with realistic outcomes based on activity type
UPDATE activities 
SET outcome = CASE 
  WHEN activity_type = 'call' THEN 
    CASE 
      WHEN random() < 0.3 THEN 'no_answer'
      WHEN random() < 0.5 THEN 'left_vm' 
      WHEN random() < 0.8 THEN 'connected'
      ELSE 'appt_set'
    END
  WHEN activity_type = 'meeting' THEN
    CASE 
      WHEN random() < 0.2 THEN 'no_show'
      WHEN random() < 0.7 THEN 'showed'
      WHEN random() < 0.9 THEN 'negotiating'
      ELSE 'sold'
    END
  WHEN activity_type = 'email' THEN 'follow_up'
  WHEN activity_type = 'demo' THEN 
    CASE 
      WHEN random() < 0.6 THEN 'showed'
      WHEN random() < 0.9 THEN 'negotiating'
      ELSE 'sold'
    END
  ELSE 'connected'
END
WHERE outcome IS NULL;

-- Add appointment-related fields to deals table if they don't exist
ALTER TABLE deals ADD COLUMN IF NOT EXISTS appointment_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS appointment_showed BOOLEAN DEFAULT FALSE;
ALTER TABLE deals ADD COLUMN IF NOT EXISTS lead_source_detail TEXT;

-- Create view for pacing calculations
CREATE OR REPLACE VIEW pacing_metrics AS
WITH call_metrics AS (
  SELECT 
    sales_rep_id,
    DATE_TRUNC('month', completed_at) as month_year,
    COUNT(*) FILTER (WHERE activity_type = 'call') as total_calls,
    COUNT(*) FILTER (WHERE activity_type = 'call' AND outcome IN ('connected', 'appt_set')) as connected_calls,
    COUNT(*) FILTER (WHERE outcome = 'appt_set') as appointments_set,
    COUNT(*) FILTER (WHERE outcome = 'showed') as appointments_showed
  FROM activities 
  WHERE completed_at IS NOT NULL
  GROUP BY sales_rep_id, DATE_TRUNC('month', completed_at)
),
deal_metrics AS (
  SELECT 
    sales_rep_id,
    DATE_TRUNC('month', created_at) as month_year,
    COUNT(*) FILTER (WHERE status = 'closed_won') as deals_closed,
    SUM(deal_amount) FILTER (WHERE status = 'closed_won') as revenue_closed,
    AVG(deal_amount) FILTER (WHERE status = 'closed_won') as avg_deal_size
  FROM deals
  GROUP BY sales_rep_id, DATE_TRUNC('month', created_at)
)
SELECT 
  COALESCE(c.sales_rep_id, d.sales_rep_id) as sales_rep_id,
  COALESCE(c.month_year, d.month_year) as month_year,
  COALESCE(c.total_calls, 0) as total_calls,
  COALESCE(c.connected_calls, 0) as connected_calls,
  COALESCE(c.appointments_set, 0) as appointments_set,
  COALESCE(c.appointments_showed, 0) as appointments_showed,
  COALESCE(d.deals_closed, 0) as deals_closed,
  COALESCE(d.revenue_closed, 0) as revenue_closed,
  COALESCE(d.avg_deal_size, 0) as avg_deal_size,
  
  -- Calculate rates
  CASE WHEN c.total_calls > 0 
    THEN ROUND((c.connected_calls::decimal / c.total_calls * 100), 2) 
    ELSE 0 
  END as connection_rate,
  
  CASE WHEN c.connected_calls > 0 
    THEN ROUND((c.appointments_set::decimal / c.connected_calls * 100), 2) 
    ELSE 0 
  END as appointment_rate,
  
  CASE WHEN c.appointments_set > 0 
    THEN ROUND((c.appointments_showed::decimal / c.appointments_set * 100), 2) 
    ELSE 0 
  END as show_rate,
  
  CASE WHEN c.appointments_showed > 0 
    THEN ROUND((d.deals_closed::decimal / c.appointments_showed * 100), 2) 
    ELSE 0 
  END as closing_rate

FROM call_metrics c
FULL OUTER JOIN deal_metrics d ON c.sales_rep_id = d.sales_rep_id AND c.month_year = d.month_year;

-- Grant permissions
GRANT SELECT ON pacing_metrics TO authenticated;