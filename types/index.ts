export type TournamentStatus = 'setup' | 'in_progress' | 'completed';
export type RoundStatus = 'pending' | 'completed';
export type RelationType = 'partner' | 'opponent';

export interface Tournament {
  id: string;
  name: string;
  status: TournamentStatus;
  current_round_number: number;
  user_id: string;
  created_at: string;
}

export interface Player {
  id: string;
  tournament_id: string;
  name: string;
  total_points: number;
  total_diff: number;
  wins: number;
  losses: number;
  games_played: number;
  rest_count: number;
  rest_round_number: number | null;
  created_at: string;
}

export interface Round {
  id: string;
  tournament_id: string;
  round_number: number;
  status: RoundStatus;
  created_at: string;
}

export interface RoundRest {
  id: string;
  round_id: string;
  player_id: string;
}

export interface Match {
  id: string;
  round_id: string;
  court_number: number;
  team_a_player_1_id: string;
  team_a_player_2_id: string;
  team_b_player_1_id: string;
  team_b_player_2_id: string;
  score_a: number | null;
  score_b: number | null;
  created_at: string;
}

export interface PlayerRelationshipHistory {
  id: string;
  tournament_id: string;
  player_id: string;
  related_player_id: string;
  relation_type: RelationType;
  round_number: number;
}

// Enriched types for display
export interface MatchWithPlayers extends Match {
  team_a_player_1: Player;
  team_a_player_2: Player;
  team_b_player_1: Player;
  team_b_player_2: Player;
}

export interface RoundWithDetails extends Round {
  matches: MatchWithPlayers[];
  resting_players: Player[];
}

export interface ScoreEntry {
  match_id: string;
  score_a: number;
  score_b: number;
}

export interface StandingsRow {
  player: Player;
  rank: number;
}
