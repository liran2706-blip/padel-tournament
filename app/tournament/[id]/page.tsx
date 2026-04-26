import { redirect } from 'next/navigation';
import {
  fetchTournament, fetchPlayers, fetchCurrentRound,
  fetchRoundWithDetails, fetchRounds,
} from '@/lib/tournament/db';
import { sortByStandings, DEFAULT_TOTAL_ROUNDS, getFinalRound, TOTAL_ROUNDS } from '@/lib/tournament/scheduling';
import TournamentHeader from '@/components/TournamentHeader';
import RestingPlayersCard from '@/components/RestingPlayersCard';
import CourtMatchCard from '@/components/CourtMatchCard';
import StandingsTable from '@/components/StandingsTable';
import RoundHistory from '@/components/RoundHistory';
import ResultsEntryForm from '@/components/ResultsEntryForm';
import AddRoundButton from './AddRoundButton';

export const dynamic = 'force-dynamic';

export default async function TournamentDashboardPage({ params }: { params: { id: string } }) {
  const tournament = await fetchTournament(params.id);

  console.log('DASHBOARD: tournament status =', tournament.status, 'round =', tournament.current_round_number);

  if (tournament.status === 'setup') {
    console.log('DASHBOARD: redirecting to setup');
    redirect(`/tournament/${params.id}/setup`);
  }

  if (tournament.status === 'completed') {
    redirect(`/tournament/${params.id}/summary`);
  }

  const allPlayers = await fetchPlayers(params.id);
  const sortedPlayers = sortByStandings(allPlayers);
  const currentRound = await fetchCurrentRound(params.id);
  const allRounds = await fetchRounds(params.id);

  if (!currentRound) {
    const rounds = await fetchRounds(params.id);
    if (rounds.length === 0) redirect(`/tournament/${params.id}/setup`);
    return (
      <main className="max-w-lg mx-auto px-4 py-8 text-center">
        <p className="text-slate-500">טוען סיבוב...</p>
        <a href={`/tournament/${params.id}`} className="block mt-4 text-blue-600 underline">לחץ כאן לרענון</a>
      </main>
    );
  }

  const currentRoundDetails = await fetchRoundWithDetails(currentRound, allPlayers);
  const completedRounds = allRounds.filter((r) => r.status === 'completed');
  const roundHistoryDetails = await Promise.all(completedRounds.map((r) => fetchRoundWithDetails(r, allPlayers)));
  const isCurrentRoundComplete = currentRound.status === 'completed';

  const totalRounds = (tournament as any).total_rounds ?? DEFAULT_TOTAL_ROUNDS;
  const finalRound = getFinalRound(totalRounds);
  const roundBeforeFinal = finalRound - 1; // סיבוב 4

  // הכפתור יופיע אחרי סיבוב 4 (לפני הגמר) ואחרי ההשלמה
  const showAddRoundButton = isCurrentRoundComplete &&
    (tournament.status as string) !== 'completed' &&
    (
      currentRound.round_number >= totalRounds ||
      currentRound.round_number === roundBeforeFinal
    );

  return (
    <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
      <TournamentHeader tournament={tournament} totalRounds={totalRounds} />

      {/* Display link */}
      <a
        href={`/tournament/${params.id}/display`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full bg-blue-900 hover:bg-blue-800 text-blue-300 hover:text-white border border-blue-700 font-medium py-2.5 rounded-xl text-sm transition-colors"
      >
        <span>📺</span>
        <span>פתח מסך הקרנה</span>
      </a>

      <RestingPlayersCard players={currentRoundDetails.resting_players} />

      <div>
        <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-3">
          מגרשים — סיבוב {currentRound.round_number}
          {currentRound.round_number === finalRound && (
            <span className="mr-2 text-yellow-600 normal-case">🏆 סיבוב גמר</span>
          )}
        </h2>
        <div className="space-y-3">
          {currentRoundDetails.matches.map((match) => (
            <CourtMatchCard key={match.id} match={match} />
          ))}
        </div>
      </div>

      {!isCurrentRoundComplete && (
        <ResultsEntryForm
          tournamentId={params.id}
          roundId={currentRound.id}
          roundNumber={currentRound.round_number}
          matches={currentRoundDetails.matches}
        />
      )}

      {isCurrentRoundComplete && currentRound.round_number < totalRounds && !showAddRoundButton && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-blue-700 font-semibold">סיבוב {currentRound.round_number} הושלם ✓</p>
          <p className="text-blue-500 text-sm mt-1">סיבוב {currentRound.round_number + 1} נוצר אוטומטית</p>
        </div>
      )}

      {showAddRoundButton && (
        <AddRoundButton tournamentId={params.id} currentTotal={totalRounds} />
      )}

      <div>
        <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-3">דירוג נוכחי</h2>
        <StandingsTable players={sortedPlayers} />
      </div>

      {roundHistoryDetails.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-3">היסטוריית סיבובים</h2>
          <RoundHistory rounds={roundHistoryDetails} />
        </div>
      )}
    </main>
  );
}
