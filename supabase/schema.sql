-- ============================================================
-- Padel Tournament — Supabase SQL Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── tournaments ──────────────────────────────────────────────
create table if not exists tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  status text not null default 'setup' check (status in ('setup', 'in_progress', 'completed')),
  current_round_number integer not null default 0,
  created_at timestamptz not null default now()
);

-- ─── players ──────────────────────────────────────────────────
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  name text not null,
  total_points integer not null default 0,
  total_diff integer not null default 0,
  wins integer not null default 0,
  losses integer not null default 0,
  games_played integer not null default 0,
  rest_count integer not null default 0,
  rest_round_number integer,
  created_at timestamptz not null default now()
);

create index if not exists players_tournament_id_idx on players(tournament_id);

-- ─── rounds ───────────────────────────────────────────────────
create table if not exists rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  round_number integer not null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now(),
  unique(tournament_id, round_number)
);

create index if not exists rounds_tournament_id_idx on rounds(tournament_id);

-- ─── round_rests ──────────────────────────────────────────────
create table if not exists round_rests (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  unique(round_id, player_id)
);

create index if not exists round_rests_round_id_idx on round_rests(round_id);

-- ─── matches ──────────────────────────────────────────────────
create table if not exists matches (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references rounds(id) on delete cascade,
  court_number integer not null,
  team_a_player_1_id uuid not null references players(id),
  team_a_player_2_id uuid not null references players(id),
  team_b_player_1_id uuid not null references players(id),
  team_b_player_2_id uuid not null references players(id),
  score_a integer,
  score_b integer,
  created_at timestamptz not null default now()
);

create index if not exists matches_round_id_idx on matches(round_id);

-- ─── player_relationship_history ─────────────────────────────
create table if not exists player_relationship_history (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references tournaments(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  related_player_id uuid not null references players(id) on delete cascade,
  relation_type text not null check (relation_type in ('partner', 'opponent')),
  round_number integer not null
);

create index if not exists prh_tournament_id_idx on player_relationship_history(tournament_id);
create index if not exists prh_player_id_idx on player_relationship_history(player_id);

-- ─── Row Level Security (optional but recommended) ───────────
-- For an MVP with no auth, disable RLS so the anon key can read/write.

alter table tournaments enable row level security;
alter table players enable row level security;
alter table rounds enable row level security;
alter table round_rests enable row level security;
alter table matches enable row level security;
alter table player_relationship_history enable row level security;

-- Allow all operations via anon key (no auth in MVP)
create policy "allow_all_tournaments" on tournaments for all using (true) with check (true);
create policy "allow_all_players" on players for all using (true) with check (true);
create policy "allow_all_rounds" on rounds for all using (true) with check (true);
create policy "allow_all_round_rests" on round_rests for all using (true) with check (true);
create policy "allow_all_matches" on matches for all using (true) with check (true);
create policy "allow_all_prh" on player_relationship_history for all using (true) with check (true);
