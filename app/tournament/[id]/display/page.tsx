import { redirect } from 'next/navigation';
import {
  fetchTournament,
  fetchPlayers,
  fetchCurrentRound,
  fetchRoundWithDetails,
} from '@/lib/tournament/db';
import { sortByStandings, TOTAL_ROUNDS } from '@/lib/tournament/scheduling';
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

  let roundDetails = null;
  if (currentRound) {
    roundDetails = await fetchRoundWithDetails(currentRound, allPlayers);
  }

  return (
    <DisplayClient
      tournament={tournament}
      sortedPlayers={sortedPlayers}
      roundDetails={roundDetails}
      totalRounds={TOTAL_ROUNDS}
    />
  );
}
