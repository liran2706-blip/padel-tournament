'use client';

import { useState } from 'react';
import { RoundWithDetails } from '@/types';

interface Props {
  rounds: RoundWithDetails[];
}

export default function RoundHistory({ rounds }: Props) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      {rounds.map((round) => (
        <div key={round.id} className="bg-white border border-blue-100 rounded-xl overflow-hidden">
          <button
            onClick={() => setOpen(open === round.id ? null : round.id)}
            className="w-full px-4 py-3 flex items-center justify-between text-right"
          >
            <span className="font-semibold text-blue-900">סיבוב {round.round_number}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded-full">
                הושלם ✓
              </span>
              <span className="text-slate-400 text-sm">
                {open === round.id ? '▲' : '▼'}
              </span>
            </div>
          </button>

          {open === round.id && (
            <div className="border-t border-blue-50 px-4 py-3 space-y-3">
              <div>
                <p className="text-xs font-semibold text-blue-300 mb-1">במנוחה</p>
                <p className="text-sm text-slate-600">
                  {round.resting_players.map((p) => p.name).join(', ')}
                </p>
              </div>
              <div className="space-y-2">
                {round.matches.map((match) => (
                  <div key={match.id} className="flex items-center gap-2 text-sm">
                    <span className="text-xs text-blue-300 w-14 shrink-0">
                      מגרש {match.court_number}
                    </span>
                    <span className="flex-1 text-right text-slate-700">
                      {match.team_a_player_1.name} / {match.team_a_player_2.name}
                    </span>
                    <span className="font-bold text-blue-800 shrink-0">
                      {match.score_a !== null ? `${match.score_a}–${match.score_b}` : '—'}
                    </span>
                    <span className="flex-1 text-left text-slate-700">
                      {match.team_b_player_1.name} / {match.team_b_player_2.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
