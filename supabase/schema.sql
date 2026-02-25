-- User profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT CHECK (role IN ('sales_rep', 'manager', 'admin')) DEFAULT 'sales_rep',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Sales deals table
CREATE TABLE IF NOT EXISTS deals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sales_rep_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  deal_amount DECIMAL(12,2) NOT NULL,
  gross_profit DECIMAL(12,2) DEFAULT 0,
  status TEXT CHECK (status IN ('lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost')) DEFAULT 'lead',
  source TEXT DEFAULT 'unknown',
  close_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id UUID REFERENCES deals(id) ON DELETE CASCADE NOT NULL,
  sales_rep_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'demo')) NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Managers and admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

-- Deals policies  
CREATE POLICY "Sales reps can view own deals" ON deals
  FOR SELECT USING (sales_rep_id = auth.uid());

CREATE POLICY "Managers and admins can view all deals" ON deals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

-- Activities policies
CREATE POLICY "Sales reps can view own activities" ON activities
  FOR SELECT USING (sales_rep_id = auth.uid());

CREATE POLICY "Managers and admins can view all activities" ON activities
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

-- Insert/Update/Delete policies (users can modify their own data)
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Sales reps can insert/update own deals" ON deals
  FOR ALL USING (sales_rep_id = auth.uid());

CREATE POLICY "Sales reps can insert/update own activities" ON activities
  FOR ALL USING (sales_rep_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deals_sales_rep_id ON deals(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at);
CREATE INDEX IF NOT EXISTS idx_activities_deal_id ON activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_activities_sales_rep_id ON activities(sales_rep_id);