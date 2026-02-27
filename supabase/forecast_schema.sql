-- Forecast-first schema additions
-- Adds monthly cached stats and forecast outputs used by the domain forecast engine.

CREATE TABLE IF NOT EXISTS rep_month_stats (
  rep_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  leads INTEGER NOT NULL DEFAULT 0,
  contacts INTEGER NOT NULL DEFAULT 0,
  appts_set INTEGER NOT NULL DEFAULT 0,
  appts_show INTEGER NOT NULL DEFAULT 0,
  sold_units INTEGER NOT NULL DEFAULT 0,
  close_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
  contact_rate NUMERIC(6,4) NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (rep_id, month)
);

CREATE TABLE IF NOT EXISTS rep_month_forecast (
  rep_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  month DATE NOT NULL,
  quota_units INTEGER NOT NULL,
  projected_units NUMERIC(10,2) NOT NULL DEFAULT 0,
  quota_hit_probability NUMERIC(6,4) NOT NULL DEFAULT 0,
  expected_future_deals NUMERIC(10,4) NOT NULL DEFAULT 0,
  next_best_action JSONB NOT NULL DEFAULT '{}'::jsonb,
  model_version TEXT NOT NULL DEFAULT 'v1-binomial',
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY (rep_id, month)
);

ALTER TABLE rep_month_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE rep_month_forecast ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rep can view own month stats" ON rep_month_stats;
CREATE POLICY "Rep can view own month stats" ON rep_month_stats
  FOR SELECT USING (rep_id = auth.uid());

DROP POLICY IF EXISTS "Rep can upsert own month stats" ON rep_month_stats;
CREATE POLICY "Rep can upsert own month stats" ON rep_month_stats
  FOR ALL USING (rep_id = auth.uid()) WITH CHECK (rep_id = auth.uid());

DROP POLICY IF EXISTS "Managers can view all month stats" ON rep_month_stats;
CREATE POLICY "Managers can view all month stats" ON rep_month_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Rep can view own month forecast" ON rep_month_forecast;
CREATE POLICY "Rep can view own month forecast" ON rep_month_forecast
  FOR SELECT USING (rep_id = auth.uid());

DROP POLICY IF EXISTS "Rep can upsert own month forecast" ON rep_month_forecast;
CREATE POLICY "Rep can upsert own month forecast" ON rep_month_forecast
  FOR ALL USING (rep_id = auth.uid()) WITH CHECK (rep_id = auth.uid());

DROP POLICY IF EXISTS "Managers can view all month forecast" ON rep_month_forecast;
CREATE POLICY "Managers can view all month forecast" ON rep_month_forecast
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_rep_month_stats_month ON rep_month_stats(month);
CREATE INDEX IF NOT EXISTS idx_rep_month_forecast_month ON rep_month_forecast(month);
CREATE INDEX IF NOT EXISTS idx_rep_month_forecast_prob ON rep_month_forecast(quota_hit_probability);
