'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
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
  team_a?: Team;
  team_b?: Team;
}

const GROUPS = ['A', 'B', 'C', 'D'];

export default function GroupTournamentPage() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState('A');
  const [tab, setTab] = useState<'matches' | 'standings' | 'knockout'>('matches');

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: t } = await supabase.from('group_tournaments').select('*').eq('id', id).single();
    setTournament(t);
    const { data: teamsData } = await supabase.from('group_teams').select('*').eq('tournament_id', id).order('points', { ascending: false });
    setTeams(teamsData ?? []);
    const { data: matchesData } = await supabase.from('group_matches').select('*').eq('tournament_id', id).order('match_order');
    setMatches(matchesData ?? []);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function generateGroupMatches() {
    const supabase = createClient();
    const matchRows: any[] = [];
    let order = 0;

    GROUPS.forEach(group => {
      const groupTeams = teams.filter(t => t.group_name === group);
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          matchRows.push({
            tournament_id: id,
            stage: 'group',
            group_name: group,
            team_a_id: groupTeams[i].id,
            team_b_id: groupTeams[j].id,
            match_order: order++,
          });
        }
      }
    });

    await supabase.from('group_matches').insert(matchRows);
    await supabase.from('group_tournaments').update({ status: 'group_stage' }).eq('id', id);
    load();
  }

  async function submitScore(matchId: string, scoreA: number, scoreB: number) {
    const supabase = createClient();
    const match = matches.find(m => m.id === matchId);
    if (!match) return;

    await supabase.from('group_matches').update({ score_a: scoreA, score_b: scoreB, status: 'completed' }).eq('id', matchId);

    // Update team stats
    const winner = scoreA > scoreB ? match.team_a_id : match.team_b_id;
    const loser = scoreA > scoreB ? match.team_b_id : match.team_a_id;
    const winnerTeam = teams.find(t => t.id === winner)!;
    const loserTeam = teams.find(t => t.id === loser)!;

    await supabase.from('group_teams').update({
      points: winnerTeam.points + 3,
      wins: winnerTeam.wins + 1,
      games_won: winnerTeam.games_won + Math.max(scoreA, scoreB),
      games_lost: winnerTeam.games_lost + Math.min(scoreA, scoreB),
    }).eq('id', winner);

    await supabase.from('group_teams').update({
      losses: loserTeam.losses + 1,
      games_won: loserTeam.games_won + Math.min(scoreA, scoreB),
      games_lost: loserTeam.games_lost + Math.max(scoreA, scoreB),
    }).eq('id', loser);

    load();
  }

  async function generateKnockout() {
    const supabase = createClient();
    const matchRows: any[] = [];
    let order = 100;

    // Top 2 from each group
    // QF: 1A vs 1C, 1B vs 1D, 2A vs 2C, 2B vs 2D
    const getTop2 = (group: string) => {
      return teams
        .filter(t => t.group_name === group)
        .sort((a, b) => b.points - a.points || (b.games_won - b.games_lost) - (a.games_won - a.games_lost))
        .slice(0, 2);
    };

    const [a1, a2] = getTop2('A');
    const [b1, b2] = getTop2('B');
    const [c1, c2] = getTop2('C');
    const [d1, d2] = getTop2('D');

    // Quarter finals
    matchRows.push({ tournament_id: id, stage: 'quarter', team_a_id: a1.id, team_b_id: c1.id, match_order: order++ });
    matchRows.push({ tournament_id: id, stage: 'quarter', team_a_id: b1.id, team_b_id: d1.id, match_order: order++ });
    matchRows.push({ tournament_id: id, stage: 'quarter', team_a_id: a2.id, team_b_id: c2.id, match_order: order++ });
    matchRows.push({ tournament_id: id, stage: 'quarter', team_a_id: b2.id, team_b_id: d2.id, match_order: order++ });

    await supabase.from('group_matches').insert(matchRows);
    await supabase.from('group_tournaments').update({ status: 'knockout' }).eq('id', id);
    load();
  }

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));
  const groupMatches = matches.filter(m => m.stage === 'group');
  const knockoutMatches = matches.filter(m => m.stage !== 'group');
  const allGroupDone = groupMatches.length > 0 && groupMatches.every(m => m.status === 'completed');

  if (loading) return <div className="text-center py-20 text-slate-400">טוען...</div>;
  if (!tournament) return <div className="text-center py-20 text-slate-400">טורניר לא נמצא</div>;

  return (
    <main className="max-w-lg mx-auto px-4 py-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <Link href="/" className="text-purple-400 hover:text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg text-sm font-medium">
          🏠 בית
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-bold text-purple-900">{tournament.name}</h1>
          <p className="text-xs text-purple-400">טורניר בתים</p>
        </div>
        <div className="w-16" />
      </div>

      {/* Start tournament */}
      {tournament.status === 'setup' && (
        <button onClick={generateGroupMatches}
          className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-4 rounded-xl text-lg mb-6 transition-colors">
          🚀 התחל טורניר
        </button>
      )}

      {/* Generate knockout */}
      {tournament.status === 'group_stage' && allGroupDone && (
        <button onClick={generateKnockout}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl text-lg mb-6 transition-colors">
          🏆 עבור לשלב הנוקאאוט
        </button>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-5">
        {[
          { key: 'matches', label: 'משחקים' },
          { key: 'standings', label: 'טבלה' },
          { key: 'knockout', label: 'נוקאאוט' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              tab === t.key ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab: Matches */}
      {tab === 'matches' && (
        <div>
          {/* Group selector */}
          <div className="flex gap-2 mb-4">
            {GROUPS.map(g => (
              <button key={g} onClick={() => setActiveGroup(g)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${
                  activeGroup === g ? 'bg-purple-700 text-white border-purple-700' : 'bg-white text-slate-600 border-slate-200'
                }`}>
                בית {g}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {groupMatches.filter(m => m.group_name === activeGroup).map(match => (
              <MatchCard
                key={match.id}
                match={match}
                teamA={teamMap[match.team_a_id]}
                teamB={teamMap[match.team_b_id]}
                onSubmit={submitScore}
              />
            ))}
          </div>
        </div>
      )}

      {/* Tab: Standings */}
      {tab === 'standings' && (
        <div className="space-y-4">
          {GROUPS.map(group => {
            const groupTeams = teams
              .filter(t => t.group_name === group)
              .sort((a, b) => b.points - a.points || (b.games_won - b.games_lost) - (a.games_won - a.games_lost));
            return (
              <div key={group} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="bg-purple-50 px-4 py-2 border-b border-purple-100">
                  <h3 className="font-bold text-purple-700">בית {group}</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 border-b border-slate-100">
                      <th className="text-right px-4 py-2">#</th>
                      <th className="text-right px-2 py-2">זוג</th>
                      <th className="px-2 py-2 text-center">נ</th>
                      <th className="px-2 py-2 text-center">נצ</th>
                      <th className="px-2 py-2 text-center">ה</th>
                      <th className="px-2 py-2 text-center">הפ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupTeams.map((team, i) => (
                      <tr key={team.id} className={`border-b border-slate-50 ${i < 2 ? 'bg-green-50' : ''}`}>
                        <td className="px-4 py-2.5 text-slate-500 text-xs">{i + 1}</td>
                        <td className="px-2 py-2.5 font-semibold text-slate-800">{team.name}</td>
                        <td className="px-2 py-2.5 text-center font-bold text-purple-700">{team.points}</td>
                        <td className="px-2 py-2.5 text-center text-green-600">{team.wins}</td>
                        <td className="px-2 py-2.5 text-center text-red-500">{team.losses}</td>
                        <td className="px-2 py-2.5 text-center text-slate-500 text-xs">{team.games_won - team.games_lost > 0 ? '+' : ''}{team.games_won - team.games_lost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-green-600 px-4 py-1.5 bg-green-50">✓ מקומות 1-2 מתקדמים</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: Knockout */}
      {tab === 'knockout' && (
        <div>
          {knockoutMatches.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-3xl mb-3">🏆</p>
              <p>שלב הנוקאאוט יתחיל לאחר סיום שלב הבתים</p>
            </div>
          ) : (
            <KnockoutBracket matches={knockoutMatches} teamMap={teamMap} onSubmit={submitScore} />
          )}
        </div>
      )}
    </main>
  );
}

function MatchCard({ match, teamA, teamB, onSubmit }: {
  match: Match; teamA: Team; teamB: Team;
  onSubmit: (id: string, a: number, b: number) => void;
}) {
  const [scoreA, setScoreA] = useState(match.score_a?.toString() ?? '');
  const [scoreB, setScoreB] = useState(match.score_b?.toString() ?? '');
  const [editing, setEditing] = useState(false);

  if (!teamA || !teamB) return null;

  const isDone = match.status === 'completed';

  return (
    <div className={`bg-white border rounded-xl p-4 ${isDone ? 'border-green-200' : 'border-slate-200'}`}>
      <div className="flex items-center gap-2">
        <div className="flex-1 text-right">
          <p className={`font-semibold text-sm ${isDone && match.score_a! > match.score_b! ? 'text-green-700' : 'text-slate-800'}`}>
            {teamA.name}
          </p>
        </div>

        {isDone && !editing ? (
          <div className="flex items-center gap-1 px-3">
            <span className="font-black text-lg text-slate-800">{match.score_a}</span>
            <span className="text-slate-400">–</span>
            <span className="font-black text-lg text-slate-800">{match.score_b}</span>
            <button onClick={() => setEditing(true)} className="mr-2 text-xs text-blue-400 hover:text-blue-600">✏️</button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <input type="number" value={scoreA} onChange={e => setScoreA(e.target.value)}
              className="w-10 text-center border border-slate-300 rounded-lg py-1 text-sm font-bold" min={0} max={99} />
            <span className="text-slate-400">–</span>
            <input type="number" value={scoreB} onChange={e => setScoreB(e.target.value)}
              className="w-10 text-center border border-slate-300 rounded-lg py-1 text-sm font-bold" min={0} max={99} />
            <button
              onClick={() => { onSubmit(match.id, parseInt(scoreA), parseInt(scoreB)); setEditing(false); }}
              disabled={scoreA === '' || scoreB === '' || scoreA === scoreB}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 text-white text-xs px-2 py-1 rounded-lg font-bold transition-colors"
            >
              ✓
            </button>
          </div>
        )}

        <div className="flex-1 text-left">
          <p className={`font-semibold text-sm ${isDone && match.score_b! > match.score_a! ? 'text-green-700' : 'text-slate-800'}`}>
            {teamB.name}
          </p>
        </div>
      </div>
    </div>
  );
}

function KnockoutBracket({ matches, teamMap, onSubmit }: {
  matches: Match[]; teamMap: Record<string, Team>;
  onSubmit: (id: string, a: number, b: number) => void;
}) {
  const stageLabel: Record<string, string> = {
    quarter: 'רבע גמר', semi: 'חצי גמר', final: 'גמר', third: 'מקום שלישי'
  };

  const stages = ['quarter', 'semi', 'final', 'third'];

  return (
    <div className="space-y-5">
      {stages.map(stage => {
        const stageMatches = matches.filter(m => m.stage === stage);
        if (stageMatches.length === 0) return null;
        return (
          <div key={stage}>
            <h3 className="font-bold text-purple-700 mb-3 text-sm">{stageLabel[stage]}</h3>
            <div className="space-y-2">
              {stageMatches.map(match => (
                <MatchCard
                  key={match.id}
                  match={match}
                  teamA={teamMap[match.team_a_id]}
                  teamB={teamMap[match.team_b_id]}
                  onSubmit={onSubmit}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
