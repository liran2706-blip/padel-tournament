import Link from 'next/link';
import { Tournament } from '@/types';

interface Props {
  tournament: Tournament;
  totalRounds: number;
}

export default function TournamentHeader({ tournament, totalRounds }: Props) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-blue-400 hover:text-blue-600 text-xl">←</Link>
        <div>
          <h1 className="text-xl font-bold text-blue-900">{tournament.name}</h1>
          <p className="text-sm text-blue-400">
            סיבוב {tournament.current_round_number} מתוך {totalRounds}
          </p>
        </div>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: totalRounds }, (_, i) => (
          <div
            key={i}
            className={`w-3 h-3 rounded-full ${
              i + 1 < tournament.current_round_number
                ? 'bg-blue-600'
                : i + 1 === tournament.current_round_number
                ? 'bg-blue-400 ring-2 ring-blue-200'
                : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
