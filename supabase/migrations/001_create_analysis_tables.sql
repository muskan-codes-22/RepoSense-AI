-- ============================================================
-- RepoSense AI - Analysis History Tables (Safe Re-run)
-- ============================================================

-- 1. Main table: repository_analyses
CREATE TABLE IF NOT EXISTS repository_analyses (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  repository_url TEXT NOT NULL,
  repository_name TEXT NOT NULL,
  summary TEXT DEFAULT '',
  analysis_result JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Fallback table: reposense_reports
CREATE TABLE IF NOT EXISTS reposense_reports (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  owner TEXT NOT NULL DEFAULT '',
  repo TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  stars INTEGER DEFAULT 0,
  forks INTEGER DEFAULT 0,
  open_issues INTEGER DEFAULT 0,
  summary JSONB DEFAULT '{}',
  tech_stack JSONB DEFAULT '{}',
  project_structure JSONB DEFAULT '{}',
  installation JSONB DEFAULT '{}',
  ai_insights JSONB DEFAULT '{}',
  stats JSONB DEFAULT '{}',
  analyzed_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_repo_analyses_user ON repository_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_repo_analyses_url ON repository_analyses(repository_url);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reposense_reports(user_id);

-- Enable RLS
ALTER TABLE repository_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reposense_reports ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist, then recreate
DROP POLICY IF EXISTS "Users can view own analyses" ON repository_analyses;
DROP POLICY IF EXISTS "Users can insert own analyses" ON repository_analyses;
DROP POLICY IF EXISTS "Users can update own analyses" ON repository_analyses;
DROP POLICY IF EXISTS "Users can delete own analyses" ON repository_analyses;

DROP POLICY IF EXISTS "Users can view own reports" ON reposense_reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON reposense_reports;
DROP POLICY IF EXISTS "Users can update own reports" ON reposense_reports;
DROP POLICY IF EXISTS "Users can delete own reports" ON reposense_reports;

-- RLS Policies
CREATE POLICY "Users can view own analyses" ON repository_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analyses" ON repository_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analyses" ON repository_analyses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own analyses" ON repository_analyses FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own reports" ON reposense_reports FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own reports" ON reposense_reports FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own reports" ON reposense_reports FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own reports" ON reposense_reports FOR DELETE USING (auth.uid() = user_id);
