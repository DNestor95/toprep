-- Manager settings storage for persisted UI controls

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read app settings" ON app_settings;
CREATE POLICY "Authenticated users can read app settings" ON app_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Managers can insert app settings" ON app_settings;
CREATE POLICY "Managers can insert app settings" ON app_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

DROP POLICY IF EXISTS "Managers can update app settings" ON app_settings;
CREATE POLICY "Managers can update app settings" ON app_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE id = auth.uid() AND role IN ('manager', 'admin')
    )
  );

GRANT SELECT, INSERT, UPDATE ON app_settings TO authenticated;

INSERT INTO app_settings (key, value)
VALUES ('leaderboard_rank_by', 'won_units')
ON CONFLICT (key) DO NOTHING;

INSERT INTO app_settings (key, value)
VALUES ('advanced_analytics_top_n', '1')
ON CONFLICT (key) DO NOTHING;
