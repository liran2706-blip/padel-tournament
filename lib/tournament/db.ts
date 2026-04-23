import { supabase } from '@/lib/supabase/client';

function getSupabase() {
  return supabase;
}
import {
  Tournament,
  Player,
  Round,
  RoundRest,
  Match,
  MatchWithPlayers,
  RoundWithDetails,
  PlayerRelationshipHistory,
  ScoreEntry,
} from '@/types';
import {
  shufflePlayers,
  getRestingPlayersForRound,
  generateFirstRoundCourts,
  generateNextRoundCourts,
  generateBonusRoundCourt,
  calculateMatchDeltas,
  TOTAL_ROUNDS,
  FINAL_ROUND,
  BONUS_ROUND,
  CourtAssignment,
} from '@/lib/tournament/scheduling';

// ─── Tournaments ────────────────────────────────────────────────────

export async function fetchTournaments(userId?: string): Promise<Tournament[]> {
  let query = getSupabase()
    .from('tournaments')
    .select('*')
    .order('created_at', { ascending: false });
  if (userId) {
    query = query.eq('user_id', userId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return data as Tournament[];
}

export async function fetchTournament(id: string): Promise<Tournament> {
  const { data, error } = await getSupabase()
    .from('tournaments')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as Tournament;
}

export async function createTournament(name: string, userId?: string): Promise<Tournament> {
  const { data, error } = await getSupabase()
    .from('tournaments')
    .insert({ name, status: 'setup', current_round_number: 0, user_id: userId })
    .select()
    .single();
  if (error) throw error;
  return data as Tournament;
}

// ─── Players ────────────────────────────────────────────────────────

export async function fetchPlayers(tournamentId: string): Promise<Player[]> {
  const { data, error } = await getSupabase()
    .from('players')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data as Player[];
}

export async function createPlayers(
  tournamentId: string,
  names: string[]
): Promise<Player[]> {
  const rows = names.map((name) => ({
    tournament_id: tournamentId,
    name,
    total_points: 0,
    total_diff: 0,
    wins: 0,
    losses: 0,
    games_played: 0,
    rest_count: 0,
    rest_round_number: null,
  }));
  const { data, error } = await getSupabase()
    .from('players')
    .insert(rows)
    .select();
  if (error) throw error;
  return data as Player[];
}

export async function updatePlayerStats(
  playerId: string,
  delta: {
    total_points: number;
    total_diff: number;
    wins: number;
    losses: number;
    games_played: number;
  }
): Promise<void> {
  // fetch current
  const { data: current, error: fetchErr } = await getSupabase()
    .from('players')
    .select('total_points,total_diff,wins,losses,games_played')
    .eq('id', playerId)
    .single();
  if (fetchErr) throw fetchErr;

  const { error } = await getSupabase()
    .from('players')
    .update({
      total_points: current.total_points + delta.total_points,
      total_diff: current.total_diff + delta.total_diff,
      wins: current.wins + delta.wins,
      losses: current.losses + delta.losses,
      games_played: current.games_played + delta.games_played,
    })
    .eq('id', playerId);
  if (error) throw error;
}

// ─── Rounds ─────────────────────────────────────────────────────────

export async function fetchRounds(tournamentId: string): Promise<Round[]> {
  const { data, error } = await getSupabase()
    .from('rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('round_number', { ascending: true });
  if (error) throw error;
  return data as Round[];
}

export async function fetchCurrentRound(tournamentId: string): Promise<Round | null> {
  const { data: tournament } = await getSupabase()
    .from('tournaments')
    .select('current_round_number')
    .eq('id', tournamentId)
    .maybeSingle();
  if (!tournament || tournament.current_round_number === 0) return null;

  const { data } = await getSupabase()
    .from('rounds')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round_number', tournament.current_round_number)
    .maybeSingle();
  return data as Round | null;
}

// ─── Round Rests ─────────────────────────────────────────────────────

export async function fetchRoundRests(roundId: string): Promise<RoundRest[]> {
  const { data, error } = await getSupabase()
    .from('round_rests')
    .select('*')
    .eq('round_id', roundId);
  if (error) throw error;
  return data as RoundRest[];
}

// ─── Matches ─────────────────────────────────────────────────────────

export async function fetchMatchesForRound(roundId: string): Promise<Match[]> {
  const { data, error } = await getSupabase()
    .from('matches')
    .select('*')
    .eq('round_id', roundId)
    .order('court_number', { ascending: true });
  if (error) throw error;
  return data as Match[];
}

export async function fetchRoundWithDetails(
  round: Round,
  allPlayers: Player[]
): Promise<RoundWithDetails> {
  const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

  const rests = await fetchRoundRests(round.id);
  const restingPlayers = rests
    .map((r) => playerMap.get(r.player_id))
    .filter(Boolean) as Player[];

  const matches = await fetchMatchesForRound(round.id);
  const matchesWithPlayers: MatchWithPlayers[] = matches.map((m) => ({
    ...m,
    team_a_player_1: playerMap.get(m.team_a_player_1_id)!,
    team_a_player_2: playerMap.get(m.team_a_player_2_id)!,
    team_b_player_1: playerMap.get(m.team_b_player_1_id)!,
    team_b_player_2: playerMap.get(m.team_b_player_2_id)!,
  }));

  return { ...round, matches: matchesWithPlayers, resting_players: restingPlayers };
}

// ─── Relationship History ─────────────────────────────────────────────

export async function fetchRelationshipHistory(
  tournamentId: string
): Promise<PlayerRelationshipHistory[]> {
  const { data, error } = await getSupabase()
    .from('player_relationship_history')
    .select('*')
    .eq('tournament_id', tournamentId);
  if (error) throw error;
  return data as PlayerRelationshipHistory[];
}

async function insertRelationships(
  tournamentId: string,
  courts: CourtAssignment[],
  roundNumber: number
): Promise<void> {
  const rows: Omit<PlayerRelationshipHistory, 'id'>[] = [];

  for (const court of courts) {
    const [a1, a2] = court.teamA;
    const [b1, b2] = court.teamB;

    // partners
    rows.push(
      { tournament_id: tournamentId, player_id: a1.id, related_player_id: a2.id, relation_type: 'partner', round_number: roundNumber },
      { tournament_id: tournamentId, player_id: a2.id, related_player_id: a1.id, relation_type: 'partner', round_number: roundNumber },
      { tournament_id: tournamentId, player_id: b1.id, related_player_id: b2.id, relation_type: 'partner', round_number: roundNumber },
      { tournament_id: tournamentId, player_id: b2.id, related_player_id: b1.id, relation_type: 'partner', round_number: roundNumber }
    );

    // opponents
    for (const a of [a1, a2]) {
      for (const b of [b1, b2]) {
        rows.push(
          { tournament_id: tournamentId, player_id: a.id, related_player_id: b.id, relation_type: 'opponent', round_number: roundNumber },
          { tournament_id: tournamentId, player_id: b.id, related_player_id: a.id, relation_type: 'opponent', round_number: roundNumber }
        );
      }
    }
  }

  const { error } = await getSupabase().from('player_relationship_history').insert(rows);
  if (error) throw error;
}

// ─── High-level operations ────────────────────────────────────────────

export async function startTournament(tournamentId: string): Promise<void> {
  // Guard against double execution
  const { data: existingRound } = await getSupabase()
    .from('rounds')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('round_number', 1)
    .maybeSingle();

  if (existingRound) {
    await getSupabase()
      .from('tournaments')
      .update({ status: 'in_progress', current_round_number: 1 })
      .eq('id', tournamentId);
    return;
  }

  const players = await fetchPlayers(tournamentId);

  // Generate rest: randomize for round 1
  const shuffled = shufflePlayers(players);
  const restingPlayers = shuffled.slice(0, 4);
  const activePlayers = shuffled.slice(4);

  // Create round 1
  const { data: roundData, error: roundErr } = await getSupabase()
    .from('rounds')
    .insert({
      tournament_id: tournamentId,
      round_number: 1,
      status: 'pending',
    })
    .select()
    .single();
  if (roundErr) throw roundErr;
  const round = roundData as Round;

  // Insert rests
  await getSupabase().from('round_rests').insert(
    restingPlayers.map((p) => ({ round_id: round.id, player_id: p.id }))
  );

  // Update rest flags
  for (const p of restingPlayers) {
    await getSupabase()
      .from('players')
      .update({ rest_count: 1, rest_round_number: 1 })
      .eq('id', p.id);
  }

  // Generate court assignments
  const courts = generateFirstRoundCourts(activePlayers);

  // Insert matches
  const matchRows = courts.map((c) => ({
    round_id: round.id,
    court_number: c.courtNumber,
    team_a_player_1_id: c.teamA[0].id,
    team_a_player_2_id: c.teamA[1].id,
    team_b_player_1_id: c.teamB[0].id,
    team_b_player_2_id: c.teamB[1].id,
    score_a: null,
    score_b: null,
  }));
  const { error: matchErr } = await getSupabase().from('matches').insert(matchRows);
  if (matchErr) throw matchErr;

  // Insert relationship history
  await insertRelationships(tournamentId, courts, 1);

  // Update tournament status
  await getSupabase()
    .from('tournaments')
    .update({ status: 'in_progress', current_round_number: 1 })
    .eq('id', tournamentId);
}

export async function submitRoundResults(
  tournamentId: string,
  roundId: string,
  roundNumber: number,
  scores: ScoreEntry[]
): Promise<void> {
  // Guard: if round already completed, skip
  const { data: existingRound } = await getSupabase()
    .from('rounds')
    .select('status')
    .eq('id', roundId)
    .maybeSingle();

  if (existingRound?.status === 'completed') {
    return;
  }

  // Fetch all matches for the round
  const matches = await fetchMatchesForRound(roundId);

  // Update match scores
  for (const score of scores) {
    const { error } = await getSupabase()
      .from('matches')
      .update({ score_a: score.score_a, score_b: score.score_b })
      .eq('id', score.match_id);
    if (error) throw error;
  }

  // Calculate and apply player deltas
  for (const match of matches) {
    const score = scores.find((s) => s.match_id === match.id);
    if (!score) throw new Error('Missing score for match ' + match.id);
    const deltas = calculateMatchDeltas(match, score);
    for (const delta of deltas) {
      await updatePlayerStats(delta.playerId, {
        total_points: delta.pointsDelta,
        total_diff: delta.diffDelta,
        wins: delta.winDelta,
        losses: delta.lossDelta,
        games_played: 1,
      });
    }
  }

  // Mark round complete
  await getSupabase()
    .from('rounds')
    .update({ status: 'completed' })
    .eq('id', roundId);

  // If not last round, generate next
  if (roundNumber < TOTAL_ROUNDS) {
    await generateAndSaveNextRound(tournamentId, roundNumber + 1);
  } else {
    // Tournament complete
    await getSupabase()
      .from('tournaments')
      .update({ status: 'completed' })
      .eq('id', tournamentId);
  }
}

async function generateAndSaveNextRound(
  tournamentId: string,
  nextRoundNumber: number
): Promise<void> {
  // Guard against duplicate rounds
  const { data: existingRound } = await getSupabase()
    .from('rounds')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('round_number', nextRoundNumber)
    .maybeSingle();

  if (existingRound) {
    await getSupabase()
      .from('tournaments')
      .update({ current_round_number: nextRoundNumber })
      .eq('id', tournamentId);
    return;
  }

  const allPlayers = await fetchPlayers(tournamentId);

  // Find who has already rested
  const alreadyRestedIds = new Set(
    allPlayers.filter((p) => p.rest_count > 0).map((p) => p.id)
  );

  const restingPlayers = getRestingPlayersForRound(
    allPlayers,
    nextRoundNumber,
    alreadyRestedIds
  );
  const restingIds = new Set(restingPlayers.map((p) => p.id));
  const activePlayers = allPlayers.filter((p) => !restingIds.has(p.id));

  // Create round
  const { data: roundData, error: roundErr } = await getSupabase()
    .from('rounds')
    .insert({
      tournament_id: tournamentId,
      round_number: nextRoundNumber,
      status: 'pending',
    })
    .select()
    .single();
  if (roundErr) throw roundErr;
  const round = roundData as Round;

  // Insert rests
  await getSupabase().from('round_rests').insert(
    restingPlayers.map((p) => ({ round_id: round.id, player_id: p.id }))
  );

  for (const p of restingPlayers) {
    await getSupabase()
      .from('players')
      .update({ rest_count: p.rest_count + 1, rest_round_number: nextRoundNumber })
      .eq('id', p.id);
  }

  // Fetch relationship history for repeat minimization
  const history = await fetchRelationshipHistory(tournamentId);

  // Round 7 (bonus): single court for 4 players who rested in round 6
  // Round 6 (final): ranked pairing
  // Rounds 1-5: random
  let courts: CourtAssignment[];
  if (nextRoundNumber === BONUS_ROUND) {
    courts = generateBonusRoundCourt(activePlayers);
  } else if (nextRoundNumber === FINAL_ROUND) {
    courts = generateNextRoundCourts(activePlayers, history);
  } else {
    courts = generateFirstRoundCourts(activePlayers);
  }

  const matchRows = courts.map((c) => ({
    round_id: round.id,
    court_number: c.courtNumber,
    team_a_player_1_id: c.teamA[0].id,
    team_a_player_2_id: c.teamA[1].id,
    team_b_player_1_id: c.teamB[0].id,
    team_b_player_2_id: c.teamB[1].id,
    score_a: null,
    score_b: null,
  }));

  const { error: matchErr } = await getSupabase().from('matches').insert(matchRows);
  if (matchErr) throw matchErr;

  await insertRelationships(tournamentId, courts, nextRoundNumber);

  await getSupabase()
    .from('tournaments')
    .update({ current_round_number: nextRoundNumber })
    .eq('id', tournamentId);
}
