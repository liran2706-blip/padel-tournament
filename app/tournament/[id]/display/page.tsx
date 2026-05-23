import { redirect } from 'next/navigation';
import {
  fetchTournament,
  fetchPlayers,
  fetchCurrentRound,
  fetchRoundWithDetails,
  fetchRounds,
  fetchMatchesForRound,
} from '@/lib/tournament/db';
import { sortByStandings, DEFAULT_TOTAL_ROUNDS, getFinalRound } from '@/lib/tournament/scheduling';
import DisplayClient from './DisplayClient';

export const dynamic = 'force-dynamic';

export default async function DisplayPage({ params }: { params: { id: string } }) {
  const tournament = await fetchTournament(params.id);

  if (tournament.status === 'setup') {
    redirect(`/tournament/${params.id}/setup`);
  }

  const allPlayers = await fetchPlayers(params.id);
  const sortedPlayers = sortByStandings(allPlayers);
  const currentRound = await fetchCurrentRound(params.id);
  const allRounds = await fetchRounds(params.id);

  let roundDetails = null;
  if (currentRound) {
    roundDetails = await fetchRoundWithDetails(currentRound, allPlayers);
  }

  const totalRounds = (tournament as any).total_rounds ?? DEFAULT_TOTAL_ROUNDS;
  const finalRound = getFinalRound(totalRounds);

  // רק 4 השחקנים ממגרש 1 של סיבוב הגמר
  const finalRoundData = allRounds.find(r => r.round_number === finalRound && r.status === 'completed');
  let finalPlayerIds: Set<string> | undefined;
  if (finalRoundData) {
    const finalMatches = await fetchMatchesForRound(finalRoundData.id);
    const court1 = finalMatches.find(m => m.court_number === 1);
    if (court1) {
      finalPlayerIds = new Set([
        court1.team_a_player_1_id,
        court1.team_a_player_2_id,
        court1.team_b_player_1_id,
        court1.team_b_player_2_id,
      ]);
    }
  }

  return (
    <DisplayClient
      tournament={tournament}
      sortedPlayers={sortedPlayers}
      roundDetails={roundDetails}
      totalRounds={totalRounds}
      finalPlayerIds={finalPlayerIds}
    />
  );
}
