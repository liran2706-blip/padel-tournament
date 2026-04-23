import { MatchWithPlayers } from '@/types';

interface Props {
  match: MatchWithPlayers;
}

export default function CourtMatchCard({ match }: Props) {
  const hasResult = match.score_a !== null && match.score_b !== null;

  return (
    <div className="bg-white border border-blue-100 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">
          מגרש {match.court_number}
        </span>
        {hasResult && (
          <span className="text-xs bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
            ✓ הוזן
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 text-right">
          <p className="font-semibold text-slate-800 text-sm leading-tight">{match.team_a_player_1.name}</p>
          <p className="font-semibold text-slate-800 text-sm leading-tight mt-0.5">{match.team_a_player_2.name}</p>
        </div>

        <div className="flex items-center gap-1 px-2">
          {hasResult ? (
            <>
              <span className={`text-xl font-bold w-8 text-center ${match.score_a! > match.score_b! ? 'text-blue-700' : 'text-slate-400'}`}>
                {match.score_a}
              </span>
              <span className="text-slate-300 font-light">—</span>
              <span className={`text-xl font-bold w-8 text-center ${match.score_b! > match.score_a! ? 'text-blue-700' : 'text-slate-400'}`}>
                {match.score_b}
              </span>
            </>
          ) : (
            <span className="text-slate-300 text-sm font-medium px-2">vs</span>
          )}
        </div>

        <div className="flex-1 text-left">
          <p className="font-semibold text-slate-800 text-sm leading-tight">{match.team_b_player_1.name}</p>
          <p className="font-semibold text-slate-800 text-sm leading-tight mt-0.5">{match.team_b_player_2.name}</p>
        </div>
      </div>
    </div>
  );
}
