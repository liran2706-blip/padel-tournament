import { Player, Match, PlayerRelationshipHistory, ScoreEntry } from '@/types';

export const TOTAL_ROUNDS = 7;
export const FINAL_ROUND = 6;
export const BONUS_ROUND = 7;
export const DEFAULT_TOTAL_ROUNDS = TOTAL_ROUNDS;
export function getFinalRound(totalRounds: number) { return totalRounds - 1; }
export function getBonusRound(totalRounds: number) { return totalRounds; }
export const TOTAL_COURTS = 4;
export const TOTAL_PLAYERS = 20;
export const PLAYERS_PER_ROUND = 16;
export const RESTING_PER_ROUND = 4;

const WIN_BONUS = 10;

/**
 * Fisher-Yates shuffle
 */
export function shufflePlayers<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Sort players by standings: points desc, diff desc, wins desc
 */
export function sortByStandings(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    if (b.total_diff !== a.total_diff) return b.total_diff - a.total_diff;
    return b.wins - a.wins;
  });
}

/**
 * Determine which players rest each round.
 */
export function getRestingPlayersForRound(
  allPlayers: Player[],
  roundNumber: number,
  alreadyRestedPlayerIds: Set<string>,
  totalRounds: number = DEFAULT_TOTAL_ROUNDS
): Player[] {
  const finalRound = getFinalRound(totalRounds);
  const bonusRound = getBonusRound(totalRounds);

  if (roundNumber === 1) {
    const shuffled = shufflePlayers(allPlayers);
    return shuffled.slice(0, RESTING_PER_ROUND);
  }

  if (roundNumber === finalRound) {
    const sorted = sortByStandings(allPlayers);
    return sorted.slice(allPlayers.length - RESTING_PER_ROUND);
  }

  if (roundNumber === bonusRound) {
    const sorted = sortByStandings(allPlayers);
    return sorted.slice(0, allPlayers.length - RESTING_PER_ROUND);
  }

  const notYetRested = allPlayers.filter((p) => !alreadyRestedPlayerIds.has(p.id));

  if (notYetRested.length < RESTING_PER_ROUND) {
    const sorted = [...allPlayers].sort((a, b) => {
      const aRound = a.rest_round_number ?? 0;
      const bRound = b.rest_round_number ?? 0;
      if (aRound !== bRound) return aRound - bRound;
      return b.total_points - a.total_points;
    });
    return sorted.slice(0, RESTING_PER_ROUND);
  }

  const sorted = sortByStandings(notYetRested).reverse();
  return sorted.slice(0, RESTING_PER_ROUND);
}

/**
 * Build partner and opponent count maps from relationship history
 */
export function buildRelationshipMaps(
  history: PlayerRelationshipHistory[]
): {
  partnerCount: Map<string, Map<string, number>>;
  opponentCount: Map<string, Map<string, number>>;
} {
  const partnerCount = new Map<string, Map<string, number>>();
  const opponentCount = new Map<string, Map<string, number>>();

  for (const rel of history) {
    if (rel.relation_type === 'partner') {
      if (!partnerCount.has(rel.player_id)) partnerCount.set(rel.player_id, new Map());
      const map = partnerCount.get(rel.player_id)!;
      map.set(rel.related_player_id, (map.get(rel.related_player_id) || 0) + 1);
    } else {
      if (!opponentCount.has(rel.player_id)) opponentCount.set(rel.player_id, new Map());
      const map = opponentCount.get(rel.player_id)!;
      map.set(rel.related_player_id, (map.get(rel.related_player_id) || 0) + 1);
    }
  }

  return { partnerCount, opponentCount };
}

function getPartnerRepeatScore(
  a: string,
  b: string,
  partnerCount: Map<string, Map<string, number>>
): number {
  return (partnerCount.get(a)?.get(b) || 0) + (partnerCount.get(b)?.get(a) || 0);
}

function getOpponentRepeatScore(
  teamA: [string, string],
  teamB: [string, string],
  opponentCount: Map<string, Map<string, number>>
): number {
  let score = 0;
  for (const a of teamA) {
    for (const b of teamB) {
      score += (opponentCount.get(a)?.get(b) || 0) + (opponentCount.get(b)?.get(a) || 0);
    }
  }
  return score;
}

/**
 * Score a full court assignment (4 courts)
 */
function scoreCourts(
  groups: Player[][],
  pairings: Array<{ teamA: [Player, Player]; teamB: [Player, Player] }>,
  partnerCount: Map<string, Map<string, number>>,
  opponentCount: Map<string, Map<string, number>>
): number {
  let total = 0;
  for (const pairing of pairings) {
    const ps =
      getPartnerRepeatScore(pairing.teamA[0].id, pairing.teamA[1].id, partnerCount) +
      getPartnerRepeatScore(pairing.teamB[0].id, pairing.teamB[1].id, partnerCount);
    const os = getOpponentRepeatScore(
      [pairing.teamA[0].id, pairing.teamA[1].id],
      [pairing.teamB[0].id, pairing.teamB[1].id],
      opponentCount
    );
    total += ps * 3 + os * 2;
  }
  return total;
}

/**
 * Best pairing for a group of 4, minimizing repeats
 */
function bestPairingForGroup(
  group: Player[],
  partnerCount: Map<string, Map<string, number>>,
  opponentCount: Map<string, Map<string, number>>
): { teamA: [Player, Player]; teamB: [Player, Player] } {
  const [p0, p1, p2, p3] = group;

  const pairings: Array<{ teamA: [Player, Player]; teamB: [Player, Player] }> = [
    { teamA: [p0, p3], teamB: [p1, p2] },
    { teamA: [p0, p2], teamB: [p1, p3] },
    { teamA: [p0, p1], teamB: [p2, p3] },
  ];

  let best = pairings[0];
  let bestScore = Infinity;

  for (const pairing of pairings) {
    const partnerScore =
      getPartnerRepeatScore(pairing.teamA[0].id, pairing.teamA[1].id, partnerCount) +
      getPartnerRepeatScore(pairing.teamB[0].id, pairing.teamB[1].id, partnerCount);
    const opponentScore = getOpponentRepeatScore(
      [pairing.teamA[0].id, pairing.teamA[1].id],
      [pairing.teamB[0].id, pairing.teamB[1].id],
      opponentCount
    );
    const total = partnerScore * 3 + opponentScore * 2;
    if (total < bestScore) {
      bestScore = total;
      best = pairing;
    }
  }

  return best;
}

export interface CourtAssignment {
  courtNumber: number;
  teamA: [Player, Player];
  teamB: [Player, Player];
}

/**
 * Generate courts using history to minimize partner/opponent repeats.
 * Tries multiple random shuffles and picks the best assignment.
 * Used for rounds 1-5.
 */
export function generateFirstRoundCourts(
  activePlayers: Player[],
  history: PlayerRelationshipHistory[] = []
): CourtAssignment[] {
  const { partnerCount, opponentCount } = buildRelationshipMaps(history);

  const ATTEMPTS = history.length === 0 ? 1 : 300;
  let bestCourts: CourtAssignment[] | null = null;
  let bestScore = Infinity;

  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const shuffled = shufflePlayers(activePlayers);
    const courts: CourtAssignment[] = [];
    let score = 0;

    for (let i = 0; i < TOTAL_COURTS; i++) {
      const group = shuffled.slice(i * 4, i * 4 + 4);
      const pairing = bestPairingForGroup(group, partnerCount, opponentCount);

      const ps =
        getPartnerRepeatScore(pairing.teamA[0].id, pairing.teamA[1].id, partnerCount) +
        getPartnerRepeatScore(pairing.teamB[0].id, pairing.teamB[1].id, partnerCount);
      const os = getOpponentRepeatScore(
        [pairing.teamA[0].id, pairing.teamA[1].id],
        [pairing.teamB[0].id, pairing.teamB[1].id],
        opponentCount
      );
      score += ps * 3 + os;

      courts.push({
        courtNumber: i + 1,
        teamA: pairing.teamA,
        teamB: pairing.teamB,
      });
    }

    if (score < bestScore) {
      bestScore = score;
      bestCourts = courts;
      if (bestScore === 0) break;
    }
  }

  return bestCourts!;
}

/**
 * Generate courts for the final round based on standings.
 * Always uses fixed pairing: rank1+rank4 vs rank2+rank3.
 */
export function generateNextRoundCourts(
  activePlayers: Player[],
  history: PlayerRelationshipHistory[]
): CourtAssignment[] {
  const sorted = sortByStandings(activePlayers);
  const courts: CourtAssignment[] = [];

  for (let i = 0; i < TOTAL_COURTS; i++) {
    const group = sorted.slice(i * 4, i * 4 + 4);
    const [p0, p1, p2, p3] = group;
    courts.push({
      courtNumber: i + 1,
      teamA: [p0, p3],
      teamB: [p1, p2],
    });
  }

  return courts;
}

/**
 * Generate bonus round (round 7): single court for the 4 players who rested in round 6
 */
export function generateBonusRoundCourt(activePlayers: Player[]): CourtAssignment[] {
  const sorted = sortByStandings(activePlayers);
  const [p0, p1, p2, p3] = sorted;
  return [{
    courtNumber: 1,
    teamA: [p0, p3],
    teamB: [p1, p2],
  }];
}

/**
 * Calculate score delta for each player after a match result.
 * Winner receives +10 bonus points on top of games won.
 */
export interface PlayerScoreDelta {
  playerId: string;
  pointsDelta: number;
  diffDelta: number;
  winDelta: number;
  lossDelta: number;
}

export function calculateMatchDeltas(
  match: Match,
  score: ScoreEntry
): PlayerScoreDelta[] {
  const { score_a, score_b } = score;
  const diff = score_a - score_b;

  const teamA = [match.team_a_player_1_id, match.team_a_player_2_id];
  const teamB = [match.team_b_player_1_id, match.team_b_player_2_id];

  const deltas: PlayerScoreDelta[] = [];

  for (const id of teamA) {
    deltas.push({
      playerId: id,
      pointsDelta: score_a + (score_a > score_b ? WIN_BONUS : 0),
      diffDelta: diff,
      winDelta: score_a > score_b ? 1 : 0,
      lossDelta: score_a < score_b ? 1 : 0,
    });
  }

  for (const id of teamB) {
    deltas.push({
      playerId: id,
      pointsDelta: score_b + (score_b > score_a ? WIN_BONUS : 0),
      diffDelta: -diff,
      winDelta: score_b > score_a ? 1 : 0,
      lossDelta: score_b < score_a ? 1 : 0,
    });
  }

  return deltas;
}

export function validateScore(score_a: number, score_b: number): string | null {
  if (isNaN(score_a) || isNaN(score_b)) return 'יש להזין ציון מספרי';
  if (score_a < 0 || score_b < 0) return 'הציון אינו יכול להיות שלילי';
  if (score_a === score_b) return 'לא ייתכן תיקו';
  return null;
}

export const DEMO_PLAYERS = [
  'אלכס כהן', 'מיכאל לוי', 'דוד פרידמן', 'יוסי גולדברג',
  'עמית שפירו', 'נועם אברהם', 'ליאור בן דוד', 'ארז חדד',
  'גיל מנחם', 'תומר זכריה', 'ניר אלמוג', 'אורי פלד',
  'שי קפלן', 'רון בירנבוים', 'עידן ויסמן', 'יאיר שלום',
  'אייל מזרחי', 'בן ציון', 'אסף נחום', 'דור שמש',
];
