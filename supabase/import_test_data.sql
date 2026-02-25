-- Script to import deals/opportunities from your test data
-- Run this after setting up test users and updating the UUIDs in the previous script

-- First, let's create an opportunities import table to match your CSV structure
CREATE TABLE IF NOT EXISTS imported_opportunities (
  id INTEGER,
  eleads_opportunity_id TEXT,
  rep_id INTEGER,  -- This will map to our rep_id_mapping table
  created_at DATE,
  status TEXT,
  stage TEXT,
  source TEXT,
  vehicle_type TEXT,
  vehicle_model TEXT,
  sold_at DATE,
  closed_at DATE
);

-- Example of how to import your opportunities data (you'll need to adapt this for CSV import)
-- This shows the structure - you can use Supabase dashboard to import the CSV to this table first

-- After importing to imported_opportunities table, transform to our deals table:
INSERT INTO deals (
  sales_rep_id,
  customer_name,
  deal_amount,
  gross_profit,
  status,
  source,
  close_date,
  created_at
)
SELECT 
  rim.user_uuid as sales_rep_id,
  CONCAT(io.vehicle_type, ' ', io.vehicle_model, ' - ID:', io.eleads_opportunity_id) as customer_name,
  COALESCE(sf.total_gross, 25000) as deal_amount,  -- Use financial data or default
  COALESCE(sf.total_gross, 0) as gross_profit,
  CASE 
    WHEN io.status = 'sold' THEN 'closed_won'
    WHEN io.stage = 'negotiating' THEN 'negotiation'
    WHEN io.stage = 'appt_set' THEN 'qualified'
    WHEN io.stage = 'contacted' THEN 'lead'
    ELSE 'lead'
  END as status,
  io.source,
  io.closed_at as close_date,
  io.created_at
FROM imported_opportunities io
JOIN rep_id_mapping rim ON io.rep_id = rim.csv_rep_id  
LEFT JOIN sales_financials sf ON io.id = sf.opportunity_id
WHERE io.rep_id IN (1,2,3,4,5);

-- You can also import financial data:
CREATE TABLE IF NOT EXISTS sales_financials (
  opportunity_id INTEGER,
  front_gross DECIMAL(10,2),
  back_gross DECIMAL(10,2), 
  total_gross DECIMAL(10,2),
  deal_type TEXT,
  sold_at DATE,
  rep_id INTEGER,
  source TEXT
);