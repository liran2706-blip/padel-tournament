'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Team {
  id: string;
  name: string;
  group_name: string;
  points: number;
  wins: number;
  losses: number;
  games_won: number;
  games_lost: number;
}

interface Match {
  id: string;
  stage: string;
  group_name: string | null;
  team_a_id: string;
  team_b_id: string;
  score_a: number | null;
  score_b: number | null;
  status: string;
  match_order: number;
}

const GROUPS = ['A', 'B', 'C', 'D'];

export default function GroupDisplayPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: t } = await supabase.from('group_tournaments').select('*').eq('id', id).single();
    setTournament(t);
    const { data: teamsData } = await supabase.from('group_teams').select('*').eq('tournament_id', id);
    setTeams(teamsData ?? []);
    const { data: matchesData } = await supabase.from('group_matches').select('*').eq('tournament_id', id).order('match_order');
    setMatches(matchesData ?? []);
    setLastUpdate(new Date());
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 20000);
    return () => clearInterval(interval);
  }, [load]);

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));
  const semiMatches = matches.filter(m => m.stage === 'semi');
  const finalMatches = matches.filter(m => m.stage === 'final' || m.stage === 'final2');
  const getWinner = (m: Match) => m.status === 'completed' ? (teamMap[m.score_a! > m.score_b! ? m.team_a_id : m.team_b_id]?.name ?? '') : '';
  const getTeamName = (tid: string) => teamMap[tid]?.name ?? '?';

  const semi1 = semiMatches.find(m => m.match_order === 100);
  const semi2 = semiMatches.find(m => m.match_order === 101);
  const semi3 = semiMatches.find(m => m.match_order === 102);
  const semi4 = semiMatches.find(m => m.match_order === 103);
  const final1 = finalMatches.find(m => m.stage === 'final');
  const final2 = finalMatches.find(m => m.stage === 'final2');

  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white p-4" dir="rtl">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-black text-white">{tournament?.name ?? '...'}</h1>
        <p className="text-blue-400 text-sm mt-1">טורניר בתים פאדל</p>
        <p className="text-slate-600 text-xs mt-1">מתעדכן אוטומטית · {lastUpdate.toLocaleTimeString('he-IL')}</p>
      </div>

      {/* Group standings */}
      {tournament?.status !== 'knockout' && tournament?.status !== 'completed' && (
        <div className="mb-8">
          <h2 className="text-center text-blue-400 font-bold text-sm uppercase tracking-widest mb-4">טבלאות בתים</h2>
          <div className="grid grid-cols-2 gap-3">
            {GROUPS.map(group => {
              const gt = teams.filter(t => t.group_name === group).sort((a, b) => b.points - a.points || (b.games_won - b.games_lost) - (a.games_won - a.games_lost));
              return (
                <div key={group} className="bg-[#1a1a2e] rounded-xl overflow-hidden">
                  <div className="bg-purple-900 px-3 py-1.5 text-center">
                    <p className="text-purple-200 font-bold text-sm">בית {group}</p>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800">
                        <th className="text-right px-3 py-1.5">זוג</th>
                        <th className="px-2 py-1.5 text-center">נק׳</th>
                        <th className="px-2 py-1.5 text-center">נצ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gt.map((team, i) => (
                        <tr key={team.id} className={`border-b border-slate-800/50 ${i < 2 ? 'bg-green-900/20' : ''}`}>
                          <td className="px-3 py-2 font-semibold text-white">{team.name}</td>
                          <td className="px-2 py-2 text-center font-black text-purple-300">{team.points}</td>
                          <td className="px-2 py-2 text-center text-green-400">{team.wins}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Knockout bracket */}
      {semiMatches.length > 0 && (
        <div>
          <h2 className="text-center text-yellow-400 font-bold text-sm uppercase tracking-widest mb-4">שלב הנוקאאוט</h2>

          {/* Visual bracket */}
          <div className="bg-[#1a1a2e] rounded-2xl p-4 mb-6 overflow-x-auto">
            <div className="flex items-center justify-between gap-3 min-w-[500px]">

              {/* Left semis */}
              <div className="flex flex-col gap-5 w-36">
                {[semi1, semi2].map((m, i) => m && (
                  <div key={m.id} className="space-y-1">
                    <p className="text-xs text-blue-400 font-semibold">חצי {i + 1}</p>
                    <div className={`px-2 py-1.5 rounded-lg text-xs font-semibold border ${m.status === 'completed' && m.score_a! > m.score_b! ? 'bg-green-900 border-green-500 text-green-300' : 'bg-slate-800 border-slate-600 text-slate-200'}`}>{getTeamName(m.team_a_id)}</div>
                    <div className="text-center text-xs text-slate-500">{m.status === 'completed' ? `${m.score_a}–${m.score_b}` : 'vs'}</div>
                    <div className={`px-2 py-1.5 rounded-lg text-xs font-semibold border ${m.status === 'completed' && m.score_b! > m.score_a! ? 'bg-green-900 border-green-500 text-green-300' : 'bg-slate-800 border-slate-600 text-slate-200'}`}>{getTeamName(m.team_b_id)}</div>
                  </div>
                ))}
              </div>

              {/* Arrow */}
              <div className="text-blue-500 text-2xl">→</div>

              {/* Finals */}
              <div className="flex flex-col gap-4 w-40">
                <div className="border-2 border-yellow-500 rounded-xl overflow-hidden">
                  <div className="bg-yellow-500 text-center py-1 text-xs font-black text-black">🥇 גמר</div>
                  <div className="bg-[#0f0f1a] p-2 space-y-1">
                    <div className={`px-2 py-1.5 rounded-lg text-xs font-semibold border ${final1?.status === 'completed' && final1.score_a! > final1.score_b! ? 'bg-yellow-900 border-yellow-500 text-yellow-300' : 'bg-slate-800 border-slate-600 text-slate-300'}`}>
                      {final1 ? getTeamName(final1.team_a_id) : getWinner(semi1!) || '...'}
                    </div>
                    <div className="text-center text-xs text-slate-500">{final1?.status === 'completed' ? `${final1.score_a}–${final1.score_b}` : 'vs'}</div>
                    <div className={`px-2 py-1.5 rounded-lg text-xs font-semibold border ${final1?.status === 'completed' && final1.score_b! > final1.score_a! ? 'bg-yellow-900 border-yellow-500 text-yellow-300' : 'bg-slate-800 border-slate-600 text-slate-300'}`}>
                      {final1 ? getTeamName(final1.team_b_id) : getWinner(semi2!) || '...'}
                    </div>
                  </div>
                  {final1?.status === 'completed' && (
                    <div className="bg-yellow-500 text-center py-1 text-xs font-black text-black">🏆 {getWinner(final1)}</div>
                  )}
                </div>
                <div className="border-2 border-blue-500 rounded-xl overflow-hidden">
                  <div className="bg-blue-500 text-center py-1 text-xs font-black text-white">🥈 מקום 3-4</div>
                  <div className="bg-[#0f0f1a] p-2 space-y-1">
                    <div className={`px-2 py-1.5 rounded-lg text-xs font-semibold border ${final2?.status === 'completed' && final2.score_a! > final2.score_b! ? 'bg-blue-900 border-blue-400 text-blue-200' : 'bg-slate-800 border-slate-600 text-slate-300'}`}>
                      {final2 ? getTeamName(final2.team_a_id) : getWinner(semi3!) || '...'}
                    </div>
                    <div className="text-center text-xs text-slate-500">{final2?.status === 'completed' ? `${final2.score_a}–${final2.score_b}` : 'vs'}</div>
                    <div className={`px-2 py-1.5 rounded-lg text-xs font-semibold border ${final2?.status === 'completed' && final2.score_b! > final2.score_a! ? 'bg-blue-900 border-blue-400 text-blue-200' : 'bg-slate-800 border-slate-600 text-slate-300'}`}>
                      {final2 ? getTeamName(final2.team_b_id) : getWinner(semi4!) || '...'}
                    </div>
                  </div>
                  {final2?.status === 'completed' && (
                    <div className="bg-blue-500 text-center py-1 text-xs font-black text-white">🥉 {getWinner(final2)}</div>
                  )}
                </div>
              </div>

              {/* Arrow */}
              <div className="text-purple-500 text-2xl">←</div>

              {/* Right semis */}
              <div className="flex flex-col gap-5 w-36">
                {[semi3, semi4].map((m, i) => m && (
                  <div key={m.id} className="space-y-1">
                    <p className="text-xs text-purple-400 font-semibold">חצי {i + 3}</p>
                    <div className={`px-2 py-1.5 rounded-lg text-xs font-semibold border ${m.status === 'completed' && m.score_a! > m.score_b! ? 'bg-green-900 border-green-500 text-green-300' : 'bg-slate-800 border-slate-600 text-slate-200'}`}>{getTeamName(m.team_a_id)}</div>
                    <div className="text-center text-xs text-slate-500">{m.status === 'completed' ? `${m.score_a}–${m.score_b}` : 'vs'}</div>
                    <div className={`px-2 py-1.5 rounded-lg text-xs font-semibold border ${m.status === 'completed' && m.score_b! > m.score_a! ? 'bg-green-900 border-green-500 text-green-300' : 'bg-slate-800 border-slate-600 text-slate-200'}`}>{getTeamName(m.team_b_id)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Standings if knockout */}
          {(tournament?.status === 'knockout' || tournament?.status === 'completed') && (
            <div className="bg-[#1a1a2e] rounded-2xl p-4">
              <h3 className="text-center text-purple-400 font-bold text-sm mb-4">טבלאות בתים — שלב קבוצות</h3>
              <div className="grid grid-cols-2 gap-3">
                {GROUPS.map(group => {
                  const gt = teams.filter(t => t.group_name === group).sort((a, b) => b.points - a.points || (b.games_won - b.games_lost) - (a.games_won - a.games_lost));
                  return (
                    <div key={group} className="bg-[#0f0f1a] rounded-xl overflow-hidden">
                      <div className="bg-purple-900/50 px-3 py-1 text-center">
                        <p className="text-purple-300 font-bold text-xs">בית {group}</p>
                      </div>
                      <table className="w-full text-xs">
                        <tbody>
                          {gt.map((team, i) => (
                            <tr key={team.id} className={`border-b border-slate-800/50 ${i < 2 ? 'bg-green-900/10' : ''}`}>
                              <td className="px-2 py-1.5 text-slate-400 text-xs">{i + 1}</td>
                              <td className="px-2 py-1.5 font-semibold text-white text-xs">{team.name}</td>
                              <td className="px-2 py-1.5 text-center font-black text-purple-300 text-xs">{team.points}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Champion announcement */}
      {final1?.status === 'completed' && (
        <div className="mt-6 bg-gradient-to-r from-yellow-900 to-yellow-700 border-2 border-yellow-400 rounded-2xl p-6 text-center">
          <p className="text-4xl mb-2">🏆</p>
          <p className="text-yellow-200 font-bold text-sm">אלוף הטורניר</p>
          <p className="text-3xl font-black text-yellow-300 mt-1">{getWinner(final1)}</p>
        </div>
      )}
    </div>
  );
}
