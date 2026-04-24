import { NextRequest, NextResponse } from 'next/server';
import {
  fetchPlayers,
  fetchRelationshipHistory,
} from '@/lib/tournament/db';
import {
  getRestingPlayersForRound,
  generateFirstRoundCourts,
  getFinalRound,
  getBonusRound,
  generateNextRoundCourts,
  generateBonusRoundCourt,
} from '@/lib/tournament/scheduling';
import { supabase } from '@/lib/supabase/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { tournamentId: string } }
) {
  try {
    const { nextRoundNumber, totalRounds } = await request.json();
    const tournamentId = params.tournamentId;

    const allPlayers = await fetchPlayers(tournamentId);
    const alreadyRestedIds = new Set(
      allPlayers.filter((p) => p.rest_count > 0).map((p) => p.id)
    );

    const restingPlayers = getRestingPlayersForRound(
      allPlayers, nextRoundNumber, alreadyRestedIds, totalRounds
    );
    const restingIds = new Set(restingPlayers.map((p) => p.id));
    const activePlayers = allPlayers.filter((p) => !restingIds.has(p.id));

    const { data: round, error: roundErr } = await supabase
      .from('rounds')
      .insert({ tournament_id: tournamentId, round_number: nextRoundNumber, status: 'pending' })
      .select().single();
    if (roundErr) throw roundErr;

    await supabase.from('round_rests').insert(
      restingPlayers.map((p) => ({ round_id: round.id, player_id: p.id }))
    );

    for (const p of restingPlayers) {
      await supabase.from('players')
        .update({ rest_count: p.rest_count + 1, rest_round_number: nextRoundNumber })
        .eq('id', p.id);
    }

    const history = await fetchRelationshipHistory(tournamentId);
    const finalRound = getFinalRound(totalRounds);
    const bonusRound = getBonusRound(totalRounds);

    let courts;
    if (nextRoundNumber === bonusRound) {
      courts = generateBonusRoundCourt(activePlayers);
    } else if (nextRoundNumber === finalRound) {
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

    await supabase.from('matches').insert(matchRows);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to add round' }, { status: 500 });
  }
}
