-- Insert sample profiles (these would be created via Supabase Auth in practice)
-- This is just for demonstration - in real app, profiles are created via triggers on auth.users

-- Sample deals data
INSERT INTO deals (sales_rep_id, customer_name, deal_amount, gross_profit, status, source, close_date) VALUES
  -- You would replace these UUIDs with actual user IDs from your auth.users table
  ('550e8400-e29b-41d4-a716-446655440001', 'Acme Corp', 50000.00, 12000.00, 'closed_won', 'website', CURRENT_DATE - INTERVAL '5 days'),
  ('550e8400-e29b-41d4-a716-446655440001', 'Beta Industries', 75000.00, 18000.00, 'proposal', 'referral', NULL),
  ('550e8400-e29b-41d4-a716-446655440002', 'Gamma LLC', 30000.00, 7500.00, 'closed_won', 'cold_call', CURRENT_DATE - INTERVAL '2 days'),
  ('550e8400-e29b-41d4-a716-446655440002', 'Delta Solutions', 95000.00, 22000.00, 'negotiation', 'website', NULL),
  ('550e8400-e29b-41d4-a716-446655440003', 'Epsilon Corp', 40000.00, 9500.00, 'qualified', 'trade_show', NULL);

-- Sample activities
INSERT INTO activities (deal_id, sales_rep_id, activity_type, description, completed_at) VALUES
  -- You would need to use actual deal IDs from the deals table
  ((SELECT id FROM deals WHERE customer_name = 'Acme Corp'), '550e8400-e29b-41d4-a716-446655440001', 'call', 'Initial discovery call', NOW() - INTERVAL '7 days'),
  ((SELECT id FROM deals WHERE customer_name = 'Beta Industries'), '550e8400-e29b-41d4-a716-446655440001', 'email', 'Sent proposal follow-up', NOW() - INTERVAL '3 days'),
  ((SELECT id FROM deals WHERE customer_name = 'Gamma LLC'), '550e8400-e29b-41d4-a716-446655440002', 'meeting', 'Product demonstration', NOW() - INTERVAL '5 days');