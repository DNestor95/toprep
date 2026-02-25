-- Test Users Setup Script
-- Run this in Supabase SQL Editor after manually creating auth users in the dashboard

-- First, you'll need to manually create these users in Supabase Dashboard > Authentication > Users:
-- 1. Email: alex.ramirez@testcompany.com, Password: testpass123 
-- 2. Email: devin.patel@testcompany.com, Password: testpass123
-- 3. Email: hayden.brooks@testcompany.com, Password: testpass123  
-- 4. Email: marcus.lee@testcompany.com, Password: testpass123
-- 5. Email: jordan.kim@testcompany.com, Password: testpass123
-- 6. Email: manager@testcompany.com, Password: testpass123 (for testing manager role)

-- After creating the auth users above, get their UUIDs from auth.users table and update the VALUES below
-- Then run this script:

-- Insert test profiles (replace UUIDs with actual ones from auth.users)
INSERT INTO profiles (id, email, first_name, last_name, role) VALUES
('00000000-0000-0000-0000-000000000001', 'alex.ramirez@testcompany.com', 'Alex', 'Ramirez', 'sales_rep'),
('00000000-0000-0000-0000-000000000002', 'devin.patel@testcompany.com', 'Devin', 'Patel', 'sales_rep'),  
('00000000-0000-0000-0000-000000000003', 'hayden.brooks@testcompany.com', 'Hayden', 'Brooks', 'sales_rep'),
('00000000-0000-0000-0000-000000000004', 'marcus.lee@testcompany.com', 'Marcus', 'Lee', 'sales_rep'),
('00000000-0000-0000-0000-000000000005', 'jordan.kim@testcompany.com', 'Jordan', 'Kim', 'sales_rep'),
('00000000-0000-0000-0000-000000000006', 'manager@testcompany.com', 'Test', 'Manager', 'manager');

-- Create a lookup table to map your CSV rep_ids to the actual user UUIDs
CREATE TABLE IF NOT EXISTS rep_id_mapping (
  csv_rep_id INTEGER PRIMARY KEY,
  user_uuid UUID REFERENCES profiles(id),
  rep_name TEXT
);

INSERT INTO rep_id_mapping (csv_rep_id, user_uuid, rep_name) VALUES
(1, '00000000-0000-0000-0000-000000000001', 'Alex Ramirez'),
(2, '00000000-0000-0000-0000-000000000002', 'Devin Patel'), 
(3, '00000000-0000-0000-0000-000000000003', 'Hayden Brooks'),
(4, '00000000-0000-0000-0000-000000000004', 'Marcus Lee'),
(5, '00000000-0000-0000-0000-000000000005', 'Jordan Kim');