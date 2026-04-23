'use client';

import { useState, useRef } from 'react';
import { MatchWithPlayers, ScoreEntry } from '@/types';
import { submitRoundResults } from '@/lib/tournament/db';
import { validateScore } from '@/lib/tournament/scheduling';

interface Props {
  tournamentId: string;
  roundId: string;
  roundNumber: number;
  matches: MatchWithPlayers[];
}

interface ScoreState {
  score_a: string;
  score_b: string;
}

export default function ResultsEntryForm({ tournamentId, roundId, roundNumber, matches }: Props) {
  const [scores, setScores] = useState<Record<string, ScoreState>>(
    Object.fromEntries(matches.map((m) => [m.id, { score_a: '', score_b: '' }]))
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const submitted = useRef(false);

  function handleScoreChange(matchId: string, field: 'score_a' | 'score_b', value: string) {
    setScores((prev) => ({ ...prev, [matchId]: { ...prev[matchId], [field]: value } }));
    setErrors((prev) => { const next = { ...prev }; delete next[matchId]; return next; });
  }

  function validateAll(): boolean {
    const errs: Record<string, string> = {};
    for (const match of matches) {
      const s = scores[match.id];
      const err = validateScore(parseInt(s.score_a, 10), parseInt(s.score_b, 10));
      if (err) errs[match.id] = err;
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (submitted.current) return;
    if (!validateAll()) return;
    submitted.current = true;
    setLoading(true);
    setGlobalError('');
    try {
      const scoreEntries: ScoreEntry[] = matches.map((m) => ({
        match_id: m.id,
        score_a: parseInt(scores[m.id].score_a, 10),
        score_b: parseInt(scores[m.id].score_b, 10),
      }));
      await submitRoundResults(tournamentId, roundId, roundNumber, scoreEntries);
      window.location.href = `/tournament/${tournamentId}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      setGlobalError('שגיאה: ' + msg);
      submitted.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="bg-white border border-blue-100 rounded-xl p-4">
      <h2 className="text-sm font-semibold text-blue-800 mb-4">הזנת תוצאות — סיבוב {roundNumber}</h2>
      <div className="space-y-4">
        {matches.map((match) => {
          const s = scores[match.id];
          const err = errors[match.id];
          return (
            <div key={match.id} className="border border-blue-50 rounded-lg p-3 bg-blue-50/30">
              <p className="text-xs font-semibold text-blue-400 mb-2">מגרש {match.court_number}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-right">
                  <p className="text-xs text-slate-600 leading-tight">{match.team_a_player_1.name}</p>
                  <p className="text-xs text-slate-600 leading-tight">{match.team_a_player_2.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number" min={0} value={s.score_a}
                    onChange={(e) => handleScoreChange(match.id, 'score_a', e.target.value)}
                    className="w-14 border border-blue-200 rounded-lg text-center py-2 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="0"
                  />
                  <span className="text-slate-300">—</span>
                  <input
                    type="number" min={0} value={s.score_b}
                    onChange={(e) => handleScoreChange(match.id, 'score_b', e.target.value)}
                    className="w-14 border border-blue-200 rounded-lg text-center py-2 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-blue-400"
                    placeholder="0"
                  />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-xs text-slate-600 leading-tight">{match.team_b_player_1.name}</p>
                  <p className="text-xs text-slate-600 leading-tight">{match.team_b_player_2.name}</p>
                </div>
              </div>
              {err && <p className="text-red-500 text-xs mt-2 text-center">{err}</p>}
            </div>
          );
        })}
      </div>
      {globalError && <p className="text-red-500 text-sm mt-3 text-center">{globalError}</p>}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full mt-4 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white font-bold py-3.5 rounded-xl text-base transition-colors shadow"
      >
        {loading ? 'שומר תוצאות...' : 'שמור תוצאות וצור סיבוב הבא'}
      </button>
    </div>
  );
}
