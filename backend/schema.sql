-- ============================================================
-- AI Cricket Team Selection System — PostgreSQL Schema
-- Run this on your Supabase SQL editor
-- ============================================================

-- Players master table
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    country VARCHAR(50) NOT NULL,
    role VARCHAR(20) NOT NULL,           -- batsman/bowler/allrounder/wicketkeeper
    batting_style VARCHAR(30),           -- right-hand/left-hand
    bowling_style VARCHAR(50),           -- right-arm fast/left-arm spin/etc
    cricapi_id VARCHAR(100) UNIQUE,      -- used to fetch from CricAPI
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Player stats cache (per format)
CREATE TABLE IF NOT EXISTS player_stats (
    id SERIAL PRIMARY KEY,
    player_id INT REFERENCES players(id) ON DELETE CASCADE,
    format VARCHAR(10) NOT NULL,         -- T20/ODI/Test
    matches INT DEFAULT 0,
    batting_avg DECIMAL(5,2) DEFAULT 0,
    strike_rate DECIMAL(6,2) DEFAULT 0,
    runs_total INT DEFAULT 0,
    highest_score INT DEFAULT 0,
    centuries INT DEFAULT 0,
    fifties INT DEFAULT 0,
    bowling_avg DECIMAL(5,2) DEFAULT 0,
    bowling_economy DECIMAL(4,2) DEFAULT 0,
    bowling_strike_rate DECIMAL(5,2) DEFAULT 0,
    wickets_total INT DEFAULT 0,
    best_bowling VARCHAR(10),
    recent_form INTEGER[],               -- last 5 batting scores
    recent_wickets INTEGER[],            -- last 5 match wickets
    last_updated TIMESTAMP DEFAULT NOW(),
    UNIQUE(player_id, format)
);

-- Teams/Squads
CREATE TABLE IF NOT EXISTS squads (
    id SERIAL PRIMARY KEY,
    team_name VARCHAR(50) NOT NULL,
    player_id INT REFERENCES players(id) ON DELETE CASCADE,
    squad_type VARCHAR(20) DEFAULT 'all_format',
    UNIQUE(team_name, player_id)
);

-- Venues
CREATE TABLE IF NOT EXISTS venues (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(50) NOT NULL,
    country VARCHAR(50) NOT NULL,
    avg_first_innings_score_t20 INT,
    avg_first_innings_score_odi INT,
    spin_wicket_percentage INT,
    pace_wicket_percentage INT,
    typical_pitch_type VARCHAR(20),      -- spin/pace/flat/balanced
    notes TEXT
);

-- AI Selections history
CREATE TABLE IF NOT EXISTS selections (
    id SERIAL PRIMARY KEY,
    format VARCHAR(10) NOT NULL,
    team_name VARCHAR(50) NOT NULL,
    opposition VARCHAR(50) NOT NULL,
    venue_id INT REFERENCES venues(id),
    pitch_type VARCHAR(20),
    weather VARCHAR(20),
    toss_decision VARCHAR(10),
    selected_xi JSONB NOT NULL,          -- array of player objects
    batting_order JSONB,                 -- ordered player list
    bowling_combination JSONB,
    captain_id INT REFERENCES players(id),
    vice_captain_id INT REFERENCES players(id),
    ai_analysis TEXT,
    ai_strategy TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_player_stats_player_format ON player_stats(player_id, format);
CREATE INDEX IF NOT EXISTS idx_squads_team_name ON squads(team_name);
CREATE INDEX IF NOT EXISTS idx_selections_team ON selections(team_name);
CREATE INDEX IF NOT EXISTS idx_selections_created ON selections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_players_country ON players(country);
CREATE INDEX IF NOT EXISTS idx_players_role ON players(role);
