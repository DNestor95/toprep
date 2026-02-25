-- Quick Test Data Setup (Simple Version)
-- This creates users and sample deals for immediate testing

-- Step 1: Manually create these users in Supabase Dashboard > Authentication > Users
-- (Turn OFF email confirmation in Auth settings first!)

-- User 1: alex@test.com, password: test123
-- User 2: devin@test.com, password: test123  
-- User 3: hayden@test.com, password: test123
-- User 4: marcus@test.com, password: test123
-- User 5: jordan@test.com, password: test123
-- User 6: manager@test.com, password: test123

-- Step 2: After creating the auth users, run this query to get their UUIDs:
-- SELECT id, email FROM auth.users ORDER BY created_at DESC;

-- Step 3: Update the UUIDs below with the actual ones and run this script:

-- Create profiles (UPDATE THESE UUIDs WITH REAL ONES!)
INSERT INTO profiles (id, email, first_name, last_name, role) VALUES
('UUID_FROM_AUTH_USERS_1', 'alex@test.com', 'Alex', 'Ramirez', 'sales_rep'),
('UUID_FROM_AUTH_USERS_2', 'devin@test.com', 'Devin', 'Patel', 'sales_rep'),
('UUID_FROM_AUTH_USERS_3', 'hayden@test.com', 'Hayden', 'Brooks', 'sales_rep'),
('UUID_FROM_AUTH_USERS_4', 'marcus@test.com', 'Marcus', 'Lee', 'sales_rep'),
('UUID_FROM_AUTH_USERS_5', 'jordan@test.com', 'Jordan', 'Kim', 'sales_rep'),
('UUID_FROM_AUTH_USERS_6', 'manager@test.com', 'Test', 'Manager', 'manager');

-- Create sample deals (UPDATE UUIDs here too!)
INSERT INTO deals (sales_rep_id, customer_name, deal_amount, gross_profit, status, source, close_date) VALUES
('UUID_FROM_AUTH_USERS_1', 'Toyota Camry - Smith', 28500, 3500, 'closed_won', 'Phone', '2024-02-15'),
('UUID_FROM_AUTH_USERS_1', 'Honda CR-V - Johnson', 32000, 4200, 'negotiation', 'Internet', NULL),
('UUID_FROM_AUTH_USERS_2', 'Toyota Highlander - Wilson', 45000, 5800, 'proposal', 'Internet', NULL),
('UUID_FROM_AUTH_USERS_2', 'Ford Explorer - Davis', 38000, 4500, 'closed_won', 'Walk-in', '2024-02-10'),
('UUID_FROM_AUTH_USERS_3', 'Nissan Altima - Brown', 26500, 2800, 'qualified', 'Referral', NULL),
('UUID_FROM_AUTH_USERS_4', 'Honda Civic - Miller', 24000, 3200, 'closed_won', 'Internet', '2024-02-12'),
('UUID_FROM_AUTH_USERS_5', 'Toyota RAV4 - Garcia', 35000, 4100, 'lead', 'Internet', NULL),
('UUID_FROM_AUTH_USERS_5', 'Chevrolet Tahoe - Martinez', 65000, 8500, 'closed_won', 'Referral', '2024-02-07');

-- Create some activities
INSERT INTO activities (deal_id, sales_rep_id, activity_type, description, completed_at) VALUES
((SELECT id FROM deals WHERE customer_name = 'Toyota Camry - Smith'), 'UUID_FROM_AUTH_USERS_1', 'call', 'Initial contact call', NOW() - INTERVAL '5 days'),
((SELECT id FROM deals WHERE customer_name = 'Honda CR-V - Johnson'), 'UUID_FROM_AUTH_USERS_1', 'email', 'Sent pricing information', NOW() - INTERVAL '2 days'),
((SELECT id FROM deals WHERE customer_name = 'Toyota Highlander - Wilson'), 'UUID_FROM_AUTH_USERS_2', 'meeting', 'Test drive appointment', NOW() - INTERVAL '1 day');