import { fetchTournament, fetchPlayers } from '@/lib/tournament/db';
import { redirect } from 'next/navigation';
import StartTournamentButton from './StartTournamentButton';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function TournamentSetupPage({
  params,
}: {
  params: { id: string };
}) {
  const tournament = await fetchTournament(params.id);
  if (tournament.status !== 'setup') {
    redirect(`/tournament/${params.id}`);
  }

  const players = await fetchPlayers(params.id);

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-blue-400 hover:text-blue-600 text-2xl">←</Link>
        <h1 className="text-2xl font-bold text-blue-900">{tournament.name}</h1>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
        <p className="text-blue-800 font-semibold mb-1">הטורניר מוכן להתחלה</p>
        <p className="text-blue-600 text-sm">{players.length} שחקנים · 4 מגרשים · 6 סיבובים</p>
      </div>

      <div className="bg-white border border-blue-100 rounded-xl p-4 mb-6">
        <p className="text-sm font-semibold text-blue-800 mb-3">רשימת שחקנים</p>
        <div className="grid grid-cols-2 gap-2">
          {players.map((p, i) => (
            <div key={p.id} className="flex items-center gap-2 text-sm text-slate-700">
              <span className="text-slate-400 text-xs w-5">{i + 1}.</span>
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      <StartTournamentButton tournamentId={params.id} />
    </main>
  );
}
