-- Fix RLS Policies - Remove infinite recursion
-- Run this in Supabase SQL Editor to fix the policy issues

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Managers and admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Sales reps can view own deals" ON deals;
DROP POLICY IF EXISTS "Managers and admins can view all deals" ON deals;
DROP POLICY IF EXISTS "Sales reps can insert/update own deals" ON deals;
DROP POLICY IF EXISTS "Sales reps can view own activities" ON activities;
DROP POLICY IF EXISTS "Managers and admins can view all activities" ON activities;
DROP POLICY IF EXISTS "Sales reps can insert/update own activities" ON activities;

-- Create simplified policies that work

-- Profiles policies
CREATE POLICY "Allow users to view profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Deals policies  
CREATE POLICY "Allow users to view deals" ON deals
  FOR SELECT USING (true);

CREATE POLICY "Users can insert deals" ON deals
  FOR INSERT WITH CHECK (auth.uid() = sales_rep_id);

CREATE POLICY "Users can update own deals" ON deals
  FOR UPDATE USING (auth.uid() = sales_rep_id);

-- Activities policies
CREATE POLICY "Allow users to view activities" ON activities
  FOR SELECT USING (true);

CREATE POLICY "Users can insert activities" ON activities
  FOR INSERT WITH CHECK (auth.uid() = sales_rep_id);

CREATE POLICY "Users can update own activities" ON activities
  FOR UPDATE USING (auth.uid() = sales_rep_id);