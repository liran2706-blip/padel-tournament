'use client';

import { useEffect, useState } from 'react';
import { Tournament, Player, RoundWithDetails } from '@/types';

interface Props {
  tournament: Tournament;
  sortedPlayers: Player[];
  roundDetails: RoundWithDetails | null;
  totalRounds: number;
}

const REFRESH_INTERVAL = 15000;

export default function DisplayClient({ tournament, sortedPlayers, roundDetails, totalRounds }: Props) {
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL / 1000);

  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          window.location.reload();
          return REFRESH_INTERVAL / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

  const medals = ['🥇', '🥈', '🥉'];
  const isFinalRound = roundDetails?.round_number === totalRounds - 1;

  return (
    <div className="min-h-screen bg-[#0a1628] text-white" dir="rtl">
      {/* Top bar */}
      <div className="bg-[#0f2347] border-b border-blue-900 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-2xl">🎾</span>
          <div>
            <h1 className="text-xl font-bold text-white">{tournament.name}</h1>
            <p className="text-blue-400 text-sm">MIXING PADEL</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            {Array.from({ length: totalRounds }, (_, i) => (
              <div key={i} className={`w-4 h-4 rounded-full transition-all ${
                i + 1 < tournament.current_round_number ? 'bg-blue-500'
                  : i + 1 === tournament.current_round_number ? 'bg-white ring-2 ring-blue-400 scale-125'
                  : 'bg-blue-900'
              }`} />
            ))}
            <span className="text-blue-300 text-sm mr-2">
              סיבוב {tournament.current_round_number}/{totalRounds}
              {isFinalRound && <span className="text-yellow-400 mr-1"> — גמר</span>}
            </span>
          </div>

          <div className="text-center">
            <div className="text-xs text-blue-500">רענון בעוד</div>
            <div className="text-2xl font-bold text-blue-300 tabular-nums">{countdown}</div>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="p-6 grid grid-cols-12 gap-6 h-[calc(100vh-64px)]">

        {/* Left: Standings */}
        <div className="col-span-4 flex flex-col gap-4">
          <h2 className="text-sm font-bold text-blue-400 uppercase tracking-widest">דירוג נוכחי</h2>
          <div className="bg-[#0f2347] rounded-2xl overflow-hidden border border-blue-900 flex-1">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-blue-900/60 text-blue-300">
                  <th className="text-right px-4 py-3 font-semibold">#</th>
                  <th className="text-right px-4 py-3 font-semibold">שחקן</th>
                  <th className="text-center px-3 py-3 font-semibold">נק׳</th>
                  <th className="text-center px-3 py-3 font-semibold">הפרש</th>
                  <th className="text-center px-3 py-3 font-semibold">נצ׳</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((player, index) => (
                  <tr key={player.id} className={`border-b border-blue-900/40 transition-colors ${
                    index === 0 ? 'bg-yellow-500/10' : index === 1 ? 'bg-slate-400/5' : index === 2 ? 'bg-orange-500/5' : ''
                  }`}>
                    <td className="px-4 py-2.5 text-right">
                      {index < 3 ? <span className="text-base">{medals[index]}</span> : <span className="text-blue-600 font-bold">{index + 1}</span>}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-white text-right">{player.name}</td>
                    <td className="px-3 py-2.5 text-center font-bold text-blue-300 text-base">{player.total_points}</td>
                    <td className={`px-3 py-2.5 text-center font-medium text-sm ${player.total_diff > 0 ? 'text-green-400' : player.total_diff < 0 ? 'text-red-400' : 'text-blue-600'}`}>
                      {player.total_diff > 0 ? '+' : ''}{player.total_diff}
                    </td>
                    <td className="px-3 py-2.5 text-center text-slate-400 text-sm">{player.wins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Courts + Resting */}
        <div className="col-span-8 flex flex-col gap-4">

          {roundDetails && roundDetails.resting_players.length > 0 && (
            <div className="bg-[#0f2347] border border-blue-900 rounded-2xl px-5 py-4">
              <h2 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-3">
                😴 שחקנים במנוחה — סיבוב {roundDetails.round_number}
              </h2>
              <div className="flex flex-wrap gap-2">
                {roundDetails.resting_players.map((p) => (
                  <span key={p.id} className="bg-blue-900/50 border border-blue-700 text-blue-200 px-4 py-1.5 rounded-full text-sm font-medium">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {roundDetails && (
            <div className="flex-1">
              <h2 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-3">
                מגרשים — סיבוב {roundDetails.round_number}
                {isFinalRound && <span className="text-yellow-400 normal-case mr-2">🏆 סיבוב גמר</span>}
              </h2>
              <div className="grid grid-cols-2 gap-4 h-full">
                {roundDetails.matches.map((match) => {
                  const hasResult = match.score_a !== null && match.score_b !== null;
                  const aWon = hasResult && match.score_a! > match.score_b!;
                  const bWon = hasResult && match.score_b! > match.score_a!;

                  return (
                    <div key={match.id} className="bg-[#0f2347] border border-blue-900 rounded-2xl p-5 flex flex-col justify-between">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">מגרש {match.court_number}</span>
                        {hasResult && (
                          <span className="text-xs bg-green-900/50 text-green-400 border border-green-800 px-2 py-0.5 rounded-full font-semibold">✓ הסתיים</span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Team A */}
                        <div className={`flex-1 text-center rounded-xl p-3 transition-all ${aWon ? 'bg-blue-600/20 border border-blue-500' : 'bg-blue-900/20 border border-blue-900'}`}>
                          <p className={`font-bold text-base leading-tight text-center ${aWon ? 'text-white' : 'text-blue-200'}`}>
                            {match.team_a_player_1.name}
                          </p>
                          <p className={`font-bold text-base leading-tight mt-1 text-center ${aWon ? 'text-white' : 'text-blue-200'}`}>
                            {match.team_a_player_2.name}
                          </p>
                        </div>

                        {/* Score */}
                        <div className="flex flex-col items-center gap-1 px-2 shrink-0">
                          {hasResult ? (
                            <>
                              <span className={`text-3xl font-black tabular-nums ${aWon ? 'text-white' : 'text-blue-600'}`}>{match.score_a}</span>
                              <span className="text-blue-800 text-xs">—</span>
                              <span className={`text-3xl font-black tabular-nums ${bWon ? 'text-white' : 'text-blue-600'}`}>{match.score_b}</span>
                            </>
                          ) : (
                            <span className="text-blue-700 text-lg font-bold">VS</span>
                          )}
                        </div>

                        {/* Team B */}
                        <div className={`flex-1 text-center rounded-xl p-3 transition-all ${bWon ? 'bg-blue-600/20 border border-blue-500' : 'bg-blue-900/20 border border-blue-900'}`}>
                          <p className={`font-bold text-base leading-tight text-center ${bWon ? 'text-white' : 'text-blue-200'}`}>
                            {match.team_b_player_1.name}
                          </p>
                          <p className={`font-bold text-base leading-tight mt-1 text-center ${bWon ? 'text-white' : 'text-blue-200'}`}>
                            {match.team_b_player_2.name}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tournament.status === 'completed' && (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-8xl mb-4">🏆</div>
                <h2 className="text-4xl font-black text-white mb-2">הטורניר הסתיים!</h2>
                <p className="text-2xl text-yellow-400 font-bold">🥇 {sortedPlayers[0]?.name}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
