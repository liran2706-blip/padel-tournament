import { redirect } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { fetchTournament, fetchPlayers, fetchRounds, fetchRoundWithDetails } from '@/lib/tournament/db';
import { sortByStandings } from '@/lib/tournament/scheduling';
import FinalSummaryTable from '@/components/FinalSummaryTable';
import RoundHistory from '@/components/RoundHistory';

export const dynamic = 'force-dynamic';

export default async function TournamentSummaryPage({ params }: { params: { id: string } }) {
  const tournament = await fetchTournament(params.id);
  if (tournament.status !== 'completed') redirect(`/tournament/${params.id}`);

  const allPlayers = await fetchPlayers(params.id);
  const sortedPlayers = sortByStandings(allPlayers);
  const allRounds = await fetchRounds(params.id);
  const roundDetails = await Promise.all(allRounds.map((r) => fetchRoundWithDetails(r, allPlayers)));

  const [first, second, third] = sortedPlayers;

  return (
    <main className="max-w-lg mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="rounded-2xl overflow-hidden shadow-lg">
        <Image src="/padel.png" alt="Mixing Padel" width={800} height={200} className="w-full object-cover max-h-36" />
      </div>

      <div className="text-center">
        <div className="text-5xl mb-3">🏆</div>
        <h1 className="text-2xl font-bold text-blue-900">{tournament.name}</h1>
        <p className="text-blue-400 mt-1">הטורניר הסתיים</p>
      </div>

      {/* Podium */}
      <div className="bg-white border border-blue-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-4">פודיום</h2>
        <div className="space-y-3">
          {first && (
            <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <span className="text-2xl">🥇</span>
              <div>
                <p className="font-bold text-slate-900">{first.name}</p>
                <p className="text-xs text-slate-500">{first.total_points} נק׳ · {first.wins} ניצחונות</p>
              </div>
            </div>
          )}
          {second && (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
              <span className="text-2xl">🥈</span>
              <div>
                <p className="font-bold text-slate-900">{second.name}</p>
                <p className="text-xs text-slate-500">{second.total_points} נק׳ · {second.wins} ניצחונות</p>
              </div>
            </div>
          )}
          {third && (
            <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg p-3">
              <span className="text-2xl">🥉</span>
              <div>
                <p className="font-bold text-slate-900">{third.name}</p>
                <p className="text-xs text-slate-500">{third.total_points} נק׳ · {third.wins} ניצחונות</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Final standings */}
      <div>
        <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-3">דירוג סופי</h2>
        <FinalSummaryTable players={sortedPlayers} />
      </div>

      {/* Round history */}
      <div>
        <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-3">תוצאות סיבובים</h2>
        <RoundHistory rounds={roundDetails} />
      </div>

      {/* Rest schedule */}
      <div className="bg-white border border-blue-100 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-blue-800 mb-3">לוח מנוחות</h2>
        <div className="space-y-1">
          {sortedPlayers.map((p) => (
            <div key={p.id} className="flex justify-between text-sm">
              <span className="text-slate-700">{p.name}</span>
              <span className="text-slate-400">מנוחה בסיבוב {p.rest_round_number ?? '—'}</span>
            </div>
          ))}
        </div>
      </div>

      <Link href="/" className="flex items-center justify-center w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-colors shadow">
        חזרה לדף הבית
      </Link>
    </main>
  );
}
