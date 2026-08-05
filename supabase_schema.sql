-- ========================================================
-- GMS SERVICE TEAM SCHEDULER - DATABASE SCHEMA V2 (FINAL)
-- ========================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigger function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================================
-- DROP ALL TABLES IN REVERSE DEPENDENCY ORDER AT THE TOP
-- ========================================================
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS sd_assignments CASCADE;
DROP TABLE IF EXISTS team_availability CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS leader_history CASCADE;
DROP TABLE IF EXISTS composition_history CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS engine_settings CASCADE;
DROP TABLE IF EXISTS special_services CASCADE;
DROP TABLE IF EXISTS sd_schedules CASCADE;
DROP TABLE IF EXISTS sd_directors CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- ========================================================
-- 1. TEAMS TABLE
-- ========================================================
CREATE TABLE teams (
    id TEXT PRIMARY KEY,
    team_number INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    leader_name TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_teams_status ON teams(status);
CREATE INDEX idx_teams_number ON teams(team_number);

CREATE TRIGGER trg_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- 2. TEAM MEMBERS TABLE
-- ========================================================
CREATE TABLE team_members (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Member',
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    joined_at DATE NOT NULL DEFAULT '2026-08-01',
    left_at DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_status ON team_members(status);

CREATE TRIGGER trg_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- 3. LEADER HISTORY TABLE
-- ========================================================
CREATE TABLE leader_history (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    leader_name TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leader_history_team_id ON leader_history(team_id);

CREATE TRIGGER trg_leader_history_updated_at
    BEFORE UPDATE ON leader_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- 4. COMPOSITION HISTORY TABLE
-- ========================================================
CREATE TABLE composition_history (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    leader_name TEXT NOT NULL,
    members JSONB NOT NULL DEFAULT '[]'::jsonb,
    source_file TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_comp_hist_team_id ON composition_history(team_id);
CREATE INDEX idx_comp_hist_month_year ON composition_history(month, year);

CREATE TRIGGER trg_composition_history_updated_at
    BEFORE UPDATE ON composition_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- 5. SCHEDULES TABLE
-- ========================================================
CREATE TABLE schedules (
    id TEXT PRIMARY KEY,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'finalized')),
    quality_score NUMERIC NOT NULL DEFAULT 0,
    fairness_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_schedule_month_year UNIQUE (month, year)
);

CREATE INDEX idx_schedules_month_year ON schedules(month, year);
CREATE INDEX idx_schedules_status ON schedules(status);

CREATE TRIGGER trg_schedules_updated_at
    BEFORE UPDATE ON schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- 6. ASSIGNMENTS TABLE
-- ========================================================
CREATE TABLE assignments (
    id TEXT PRIMARY KEY,
    schedule_id TEXT NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
    weekend_id TEXT NOT NULL,
    service_date DATE NOT NULL,
    team_id TEXT REFERENCES teams(id) ON DELETE SET NULL,
    location_id TEXT NOT NULL CHECK (location_id IN ('barat', 'timur', 'selatan', 'pusura', 'english')),
    slot_id TEXT NOT NULL,
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    manually_assigned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assignments_schedule_id ON assignments(schedule_id);
CREATE INDEX idx_assignments_team_id ON assignments(team_id);
CREATE INDEX idx_assignments_weekend_id ON assignments(weekend_id);
CREATE INDEX idx_assignments_location_id ON assignments(location_id);
CREATE INDEX idx_assignments_service_date ON assignments(service_date);
CREATE INDEX idx_assignments_sched_weekend ON assignments(schedule_id, weekend_id);
CREATE INDEX idx_assignments_loc_weekend ON assignments(location_id, weekend_id);
CREATE INDEX idx_assignments_schedule_slot ON assignments(schedule_id, slot_id);

CREATE TRIGGER trg_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- 7. TEAM AVAILABILITY TABLE
-- ========================================================
CREATE TABLE team_availability (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    weekend_date DATE NOT NULL,
    available BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_team_weekend_availability UNIQUE (team_id, weekend_date)
);

CREATE INDEX idx_team_avail_team_id ON team_availability(team_id);
CREATE INDEX idx_team_avail_weekend_date ON team_availability(weekend_date);

CREATE TRIGGER trg_team_availability_updated_at
    BEFORE UPDATE ON team_availability
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- 8. ENGINE SETTINGS TABLE
-- ========================================================
CREATE TABLE engine_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    weight_monthly_balance INTEGER NOT NULL DEFAULT 50,
    weight_longterm_balance INTEGER NOT NULL DEFAULT 20,
    weight_location_rotation INTEGER NOT NULL DEFAULT 15,
    weight_slot_rotation INTEGER NOT NULL DEFAULT 10,
    weight_date_distribution INTEGER NOT NULL DEFAULT 5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_engine_settings_updated_at
    BEFORE UPDATE ON engine_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- 9. SPECIAL SERVICES TABLE
-- ========================================================
CREATE TABLE special_services (
    id TEXT PRIMARY KEY,
    event_name TEXT NOT NULL,
    date DATE NOT NULL,
    location_type TEXT NOT NULL CHECK (location_type IN ('existing', 'custom')),
    location_id TEXT CHECK (location_id IS NULL OR location_id IN ('barat', 'timur', 'selatan', 'pusura', 'english')),
    custom_location_name TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'cancelled', 'completed', 'archived')),
    assignment_mode TEXT NOT NULL DEFAULT 'auto' CHECK (assignment_mode IN ('auto', 'pre_assign')),
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    slots JSONB NOT NULL DEFAULT '[]'::jsonb,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spec_services_month_year ON special_services(month, year);
CREATE INDEX idx_spec_services_date ON special_services(date);
CREATE INDEX idx_spec_services_status ON special_services(status);

CREATE TRIGGER trg_special_services_updated_at
    BEFORE UPDATE ON special_services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- 10. SERVICE DIRECTORS TABLE
-- ========================================================
CREATE TABLE sd_directors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'cuti')),
    phone TEXT,
    email TEXT,
    notes TEXT,
    special_rules JSONB DEFAULT '{}'::jsonb,
    preferred_date DATE,
    preferred_weekend INTEGER,
    preferred_service TEXT,
    preferred_location TEXT CHECK (preferred_location IS NULL OR preferred_location IN ('barat', 'timur', 'selatan', 'pusura', 'english')),
    unavailable_dates JSONB DEFAULT '[]'::jsonb,
    vacation JSONB DEFAULT '[]'::jsonb,
    recurring_availability TEXT,
    max_services_per_month INTEGER DEFAULT 4,
    max_consecutive_weeks INTEGER DEFAULT 2,
    certification TEXT,
    qualification TEXT,
    requests JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sd_directors_status ON sd_directors(status);

CREATE TRIGGER trg_sd_directors_updated_at
    BEFORE UPDATE ON sd_directors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- 11. SERVICE DIRECTOR SCHEDULES TABLE
-- ========================================================
CREATE TABLE sd_schedules (
    id TEXT PRIMARY KEY,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'finalized')),
    notes TEXT,
    finalized_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_sd_schedule_month_year UNIQUE (month, year)
);

CREATE INDEX idx_sd_schedules_month_year ON sd_schedules(month, year);
CREATE INDEX idx_sd_schedules_status ON sd_schedules(status);

CREATE TRIGGER trg_sd_schedules_updated_at
    BEFORE UPDATE ON sd_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- 12. SERVICE DIRECTOR ASSIGNMENTS TABLE
-- ========================================================
CREATE TABLE sd_assignments (
    id TEXT PRIMARY KEY,
    sd_schedule_id TEXT NOT NULL REFERENCES sd_schedules(id) ON DELETE CASCADE,
    weekend_id TEXT NOT NULL,
    service_date DATE NOT NULL,
    sd_id TEXT REFERENCES sd_directors(id) ON DELETE SET NULL,
    location_id TEXT NOT NULL CHECK (location_id IN ('barat', 'timur', 'selatan', 'pusura', 'english')),
    slot_id TEXT NOT NULL,
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    manually_assigned BOOLEAN NOT NULL DEFAULT FALSE,
    is_special_service BOOLEAN DEFAULT FALSE,
    special_service_id TEXT REFERENCES special_services(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sd_assignments_sched ON sd_assignments(sd_schedule_id);
CREATE INDEX idx_sd_assignments_sd ON sd_assignments(sd_id);
CREATE INDEX idx_sd_assignments_weekend ON sd_assignments(weekend_id);
CREATE INDEX idx_sd_assignments_location ON sd_assignments(location_id);

CREATE TRIGGER trg_sd_assignments_updated_at
    BEFORE UPDATE ON sd_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- 13. AUDIT LOGS TABLE
-- ========================================================
CREATE TABLE audit_logs (
    id TEXT PRIMARY KEY,
    batch_id TEXT NOT NULL,
    imported_file TEXT NOT NULL,
    import_date DATE NOT NULL,
    imported_by TEXT NOT NULL,
    number_of_assignments INTEGER NOT NULL DEFAULT 0,
    number_of_teams INTEGER NOT NULL DEFAULT 0,
    warnings_count INTEGER NOT NULL DEFAULT 0,
    corrections_made INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed',
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    year INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_batch_id ON audit_logs(batch_id);
CREATE INDEX idx_audit_logs_month_year ON audit_logs(month, year);

CREATE TRIGGER trg_audit_logs_updated_at
    BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================================

-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE leader_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE composition_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE engine_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE special_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE sd_directors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sd_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sd_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Production RLS Policies: Permit authenticated and anon application roles full CRUD access
DO $$ 
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'teams', 'team_members', 'leader_history', 'composition_history', 
        'schedules', 'assignments', 'team_availability', 'engine_settings', 
        'special_services', 'sd_directors', 'sd_schedules', 'sd_assignments', 'audit_logs'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I_select_policy ON %I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I_insert_policy ON %I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I_update_policy ON %I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS %I_delete_policy ON %I', tbl, tbl);

        EXECUTE format('CREATE POLICY %I_select_policy ON %I FOR SELECT USING (true)', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_insert_policy ON %I FOR INSERT WITH CHECK (true)', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_update_policy ON %I FOR UPDATE USING (true)', tbl, tbl);
        EXECUTE format('CREATE POLICY %I_delete_policy ON %I FOR DELETE USING (true)', tbl, tbl);
    END LOOP;
END $$;
