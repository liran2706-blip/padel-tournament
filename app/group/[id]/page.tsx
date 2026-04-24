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
    const { data: teamsData } = await supabase.from('group_teams').select('*').eq('tournament_id', id);
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
          matchRows.push({ tournament_id: id, stage: 'group', group_name: group, team_a_id: groupTeams[i].id, team_b_id: groupTeams[j].id, match_order: order++ });
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

    // If already completed, reverse old stats first
    if (match.status === 'completed' && match.score_a !== null && match.score_b !== null) {
      const oldWinner = match.score_a > match.score_b ? match.team_a_id : match.team_b_id;
      const oldLoser = match.score_a > match.score_b ? match.team_b_id : match.team_a_id;
      const ow = teams.find(t => t.id === oldWinner)!;
      const ol = teams.find(t => t.id === oldLoser)!;
      await supabase.from('group_teams').update({ points: ow.points - 3, wins: ow.wins - 1, games_won: ow.games_won - Math.max(match.score_a, match.score_b), games_lost: ow.games_lost - Math.min(match.score_a, match.score_b) }).eq('id', oldWinner);
      await supabase.from('group_teams').update({ losses: ol.losses - 1, games_won: ol.games_won - Math.min(match.score_a, match.score_b), games_lost: ol.games_lost - Math.max(match.score_a, match.score_b) }).eq('id', oldLoser);
    }

    await supabase.from('group_matches').update({ score_a: scoreA, score_b: scoreB, status: 'completed' }).eq('id', matchId);

    // Reload teams before updating stats
    const { data: freshTeams } = await supabase.from('group_teams').select('*').eq('tournament_id', id);
    const ft = freshTeams ?? [];

    const winner = scoreA > scoreB ? match.team_a_id : match.team_b_id;
    const loser = scoreA > scoreB ? match.team_b_id : match.team_a_id;
    const wt = ft.find((t: Team) => t.id === winner)!;
    const lt = ft.find((t: Team) => t.id === loser)!;

    await supabase.from('group_teams').update({ points: wt.points + 3, wins: wt.wins + 1, games_won: wt.games_won + Math.max(scoreA, scoreB), games_lost: wt.games_lost + Math.min(scoreA, scoreB) }).eq('id', winner);
    await supabase.from('group_teams').update({ losses: lt.losses + 1, games_won: lt.games_won + Math.min(scoreA, scoreB), games_lost: lt.games_lost + Math.max(scoreA, scoreB) }).eq('id', loser);

    load();
  }

  async function generateKnockout() {
    const supabase = createClient();
    const getTop2 = (group: string) => teams
      .filter(t => t.group_name === group)
      .sort((a, b) => b.points - a.points || (b.games_won - b.games_lost) - (a.games_won - a.games_lost))
      .slice(0, 2);

    const [a1, a2] = getTop2('A');
    const [b1, b2] = getTop2('B');
    const [c1, c2] = getTop2('C');
    const [d1, d2] = getTop2('D');

    // Semi finals: 1A vs 2C, 1B vs 2D, 1C vs 2A, 1D vs 2B
    await supabase.from('group_matches').insert([
      { tournament_id: id, stage: 'semi', team_a_id: a1.id, team_b_id: c2.id, match_order: 100 },
      { tournament_id: id, stage: 'semi', team_a_id: b1.id, team_b_id: d2.id, match_order: 101 },
      { tournament_id: id, stage: 'semi', team_a_id: c1.id, team_b_id: a2.id, match_order: 102 },
      { tournament_id: id, stage: 'semi', team_a_id: d1.id, team_b_id: b2.id, match_order: 103 },
    ]);

    await supabase.from('group_tournaments').update({ status: 'knockout' }).eq('id', id);
    setTab('knockout');
    load();
  }

  async function generateFinals() {
    const supabase = createClient();
    const semiMatches = matches.filter(m => m.stage === 'semi' && m.status === 'completed');
    if (semiMatches.length < 4) return;

    const getWinner = (m: Match) => m.score_a! > m.score_b! ? m.team_a_id : m.team_b_id;

    // Final 1 (champions): winners of semi 1 & 2
    // Final 2 (3rd-4th): winners of semi 3 & 4
    await supabase.from('group_matches').insert([
      { tournament_id: id, stage: 'final', team_a_id: getWinner(semiMatches[0]), team_b_id: getWinner(semiMatches[1]), match_order: 200 },
      { tournament_id: id, stage: 'final2', team_a_id: getWinner(semiMatches[2]), team_b_id: getWinner(semiMatches[3]), match_order: 201 },
    ]);

    // Check if tournament is complete (final1 done)
    const { data: updatedMatches } = await supabase.from('group_matches').select('*').eq('tournament_id', id);
    const f1 = updatedMatches?.find(m => m.stage === 'final' && m.status === 'completed');
    if (f1) {
      await supabase.from('group_tournaments').update({ status: 'completed' }).eq('id', id);
    }

    load();
  }

  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));
  const groupMatches = matches.filter(m => m.stage === 'group');
  const semiMatches = matches.filter(m => m.stage === 'semi');
  const finalMatches = matches.filter(m => m.stage === 'final' || m.stage === 'final2');
  const allGroupDone = groupMatches.length > 0 && groupMatches.every(m => m.status === 'completed');
  const allSemiDone = semiMatches.length === 4 && semiMatches.every(m => m.status === 'completed');

  if (loading) return <div className="text-center py-20 text-slate-400">טוען...</div>;
  if (!tournament) return <div className="text-center py-20 text-slate-400">טורניר לא נמצא</div>;

  return (
    <main className="max-w-lg mx-auto px-4 py-6" dir="rtl">
      <div className="flex items-center justify-between mb-5">
        <Link href="/" className="text-purple-400 hover:text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg text-sm font-medium">🏠 בית</Link>
        <div className="text-center">
          <h1 className="text-xl font-bold text-purple-900">{tournament.name}</h1>
          <p className="text-xs text-purple-400">טורניר בתים</p>
        </div>
        <div className="w-16" />
      </div>

      {/* Display link */}
      <div className="mb-4">
        <a
          href={`/group/${id}/display`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors"
        >
          📺 פתח מסך צפייה לשחקנים
        </a>
      </div>

      {tournament.status === 'setup' && (
        <button onClick={generateGroupMatches}
          className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-4 rounded-xl text-lg mb-6 transition-colors">
          🚀 התחל טורניר
        </button>
      )}

      {tournament.status === 'group_stage' && allGroupDone && (
        <button onClick={generateKnockout}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl text-lg mb-6 transition-colors">
          🏆 עבור לשלב חצי הגמר
        </button>
      )}

      {tournament.status === 'knockout' && allSemiDone && finalMatches.length === 0 && (
        <button onClick={generateFinals}
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-4 rounded-xl text-lg mb-6 transition-colors">
          🥇 צור גמר וקרב שלישי
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
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === t.key ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Matches tab */}
      {tab === 'matches' && (
        <div>
          <div className="flex gap-2 mb-4">
            {GROUPS.map(g => (
              <button key={g} onClick={() => setActiveGroup(g)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${activeGroup === g ? 'bg-purple-700 text-white border-purple-700' : 'bg-white text-slate-600 border-slate-200'}`}>
                בית {g}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            {groupMatches.filter(m => m.group_name === activeGroup).map(match => (
              <MatchCard key={match.id} match={match} teamA={teamMap[match.team_a_id]} teamB={teamMap[match.team_b_id]} onSubmit={submitScore} />
            ))}
          </div>
        </div>
      )}

      {/* Standings tab */}
      {tab === 'standings' && (
        <div className="space-y-4">
          {GROUPS.map(group => {
            const gt = teams.filter(t => t.group_name === group).sort((a, b) => b.points - a.points || (b.games_won - b.games_lost) - (a.games_won - a.games_lost));
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
                      <th className="px-2 py-2 text-center">נק׳</th>
                      <th className="px-2 py-2 text-center">נצ</th>
                      <th className="px-2 py-2 text-center">ה</th>
                      <th className="px-2 py-2 text-center">הפרש</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gt.map((team, i) => (
                      <tr key={team.id} className={`border-b border-slate-50 ${i < 2 ? 'bg-green-50' : ''}`}>
                        <td className="px-4 py-2.5 text-slate-500 text-xs font-bold">{i + 1}</td>
                        <td className="px-2 py-2.5 font-semibold text-slate-800">{team.name}</td>
                        <td className="px-2 py-2.5 text-center font-black text-purple-700">{team.points}</td>
                        <td className="px-2 py-2.5 text-center text-green-600 font-semibold">{team.wins}</td>
                        <td className="px-2 py-2.5 text-center text-red-500 font-semibold">{team.losses}</td>
                        <td className="px-2 py-2.5 text-center text-slate-500 text-xs">{team.games_won - team.games_lost > 0 ? '+' : ''}{team.games_won - team.games_lost}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-xs text-green-600 px-4 py-1.5 bg-green-50 font-medium">✓ מקומות 1-2 מתקדמים לחצי גמר</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Knockout tab */}
      {tab === 'knockout' && (
        <div>
          {semiMatches.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <p className="text-3xl mb-3">🏆</p>
              <p>שלב הנוקאאוט יתחיל לאחר סיום שלב הבתים</p>
            </div>
          ) : (
            <KnockoutBracket
              semiMatches={semiMatches}
              finalMatches={finalMatches}
              teamMap={teamMap}
              onSubmit={submitScore}
            />
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

  useEffect(() => {
    setScoreA(match.score_a?.toString() ?? '');
    setScoreB(match.score_b?.toString() ?? '');
  }, [match.score_a, match.score_b]);

  if (!teamA || !teamB) return null;
  const isDone = match.status === 'completed';

  return (
    <div className={`bg-white border rounded-xl p-4 ${isDone ? 'border-green-200 bg-green-50/30' : 'border-slate-200'}`}>
      <div className="flex items-center gap-2">
        <div className="flex-1 text-right">
          <p className={`font-semibold text-sm ${isDone && match.score_a! > match.score_b! ? 'text-green-700 font-bold' : 'text-slate-800'}`}>
            {teamA.name}
          </p>
        </div>
        {isDone && !editing ? (
          <div className="flex items-center gap-1.5 px-2">
            <span className={`font-black text-xl ${match.score_a! > match.score_b! ? 'text-green-700' : 'text-slate-400'}`}>{match.score_a}</span>
            <span className="text-slate-300 text-sm">–</span>
            <span className={`font-black text-xl ${match.score_b! > match.score_a! ? 'text-green-700' : 'text-slate-400'}`}>{match.score_b}</span>
            <button onClick={() => setEditing(true)} className="mr-1 text-xs text-blue-400 hover:text-blue-600">✏️</button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <input type="number" value={scoreA} onChange={e => setScoreA(e.target.value)}
              className="w-10 text-center border border-slate-300 rounded-lg py-1.5 text-sm font-bold" min={0} max={99} />
            <span className="text-slate-300">–</span>
            <input type="number" value={scoreB} onChange={e => setScoreB(e.target.value)}
              className="w-10 text-center border border-slate-300 rounded-lg py-1.5 text-sm font-bold" min={0} max={99} />
            <button
              onClick={() => { onSubmit(match.id, parseInt(scoreA), parseInt(scoreB)); setEditing(false); }}
              disabled={scoreA === '' || scoreB === '' || scoreA === scoreB}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-slate-200 text-white text-xs px-2.5 py-1.5 rounded-lg font-bold transition-colors"
            >✓</button>
          </div>
        )}
        <div className="flex-1 text-left">
          <p className={`font-semibold text-sm ${isDone && match.score_b! > match.score_a! ? 'text-green-700 font-bold' : 'text-slate-800'}`}>
            {teamB.name}
          </p>
        </div>
      </div>
    </div>
  );
}

function BracketSlot({ name, isWinner, isPending }: { name: string; isWinner?: boolean; isPending?: boolean }) {
  return (
    <div className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
      isWinner ? 'bg-green-100 border-green-400 text-green-800' :
      isPending ? 'bg-slate-50 border-dashed border-slate-300 text-slate-400 italic' :
      'bg-white border-slate-200 text-slate-700'
    }`}>
      {name || '—'}
    </div>
  );
}

function KnockoutBracket({ semiMatches, finalMatches, teamMap, onSubmit }: {
  semiMatches: Match[]; finalMatches: Match[];
  teamMap: Record<string, Team>;
  onSubmit: (id: string, a: number, b: number) => void;
}) {
  const semi1 = semiMatches.find(m => m.match_order === 100);
  const semi2 = semiMatches.find(m => m.match_order === 101);
  const semi3 = semiMatches.find(m => m.match_order === 102);
  const semi4 = semiMatches.find(m => m.match_order === 103);
  const final1 = finalMatches.find(m => m.stage === 'final');
  const final2 = finalMatches.find(m => m.stage === 'final2');

  const getWinner = (m?: Match): string => {
    if (!m || m.status !== 'completed') return '';
    return teamMap[m.score_a! > m.score_b! ? m.team_a_id : m.team_b_id]?.name ?? '';
  };
  const getTeamName = (id: string) => teamMap[id]?.name ?? '?';

  return (
    <div className="space-y-6" dir="rtl">

      {/* Bracket visual */}
      <div className="bg-[#1a1a2e] rounded-2xl p-4 overflow-x-auto">
        <p className="text-center text-xs text-slate-400 mb-4 font-semibold tracking-widest uppercase">עץ נוקאאוט</p>

        <div className="flex items-center justify-between gap-2 min-w-[480px]">

          {/* Left: semi 1+2 */}
          <div className="flex flex-col gap-6 w-36">
            {/* Semi 1 */}
            <div className="space-y-1">
              <p className="text-xs text-blue-400 font-bold mb-1">חצי גמר 1</p>
              <BracketSlot name={semi1 ? getTeamName(semi1.team_a_id) : '?'} isWinner={semi1?.status === 'completed' && semi1.score_a! > semi1.score_b!} />
              <div className="text-center text-xs text-slate-500">
                {semi1?.status === 'completed' ? `${semi1.score_a} – ${semi1.score_b}` : 'vs'}
              </div>
              <BracketSlot name={semi1 ? getTeamName(semi1.team_b_id) : '?'} isWinner={semi1?.status === 'completed' && semi1.score_b! > semi1.score_a!} />
            </div>
            {/* Semi 2 */}
            <div className="space-y-1">
              <p className="text-xs text-blue-400 font-bold mb-1">חצי גמר 2</p>
              <BracketSlot name={semi2 ? getTeamName(semi2.team_a_id) : '?'} isWinner={semi2?.status === 'completed' && semi2.score_a! > semi2.score_b!} />
              <div className="text-center text-xs text-slate-500">
                {semi2?.status === 'completed' ? `${semi2.score_a} – ${semi2.score_b}` : 'vs'}
              </div>
              <BracketSlot name={semi2 ? getTeamName(semi2.team_b_id) : '?'} isWinner={semi2?.status === 'completed' && semi2.score_b! > semi2.score_a!} />
            </div>
          </div>

          {/* Lines left → final1 */}
          <div className="flex flex-col items-center gap-6 w-8">
            <div className="w-full h-px bg-blue-600 mt-8" />
            <div className="w-full h-px bg-blue-600 mt-8" />
          </div>

          {/* Center: finals */}
          <div className="flex flex-col gap-4 w-36">
            {/* Final 1 (champions) */}
            <div className="border-2 border-yellow-400 rounded-xl overflow-hidden">
              <div className="bg-yellow-400 text-center py-1">
                <p className="text-xs font-black text-yellow-900">🥇 גמר</p>
              </div>
              <div className="bg-[#0f0f1a] p-2 space-y-1">
                <BracketSlot name={final1 ? getTeamName(final1.team_a_id) : getWinner(semi1) || '...'} isWinner={final1?.status === 'completed' && final1.score_a! > final1.score_b!} isPending={!final1 && !getWinner(semi1)} />
                <div className="text-center text-xs text-slate-500">
                  {final1?.status === 'completed' ? `${final1.score_a} – ${final1.score_b}` : 'vs'}
                </div>
                <BracketSlot name={final1 ? getTeamName(final1.team_b_id) : getWinner(semi2) || '...'} isWinner={final1?.status === 'completed' && final1.score_b! > final1.score_a!} isPending={!final1 && !getWinner(semi2)} />
              </div>
              {final1?.status === 'completed' && (
                <div className="bg-yellow-400 text-center py-1.5">
                  <p className="text-xs font-black text-yellow-900">🏆 {getWinner(final1)}</p>
                </div>
              )}
            </div>

            {/* Final 2 (3rd-4th) */}
            <div className="border-2 border-blue-400 rounded-xl overflow-hidden">
              <div className="bg-blue-400 text-center py-1">
                <p className="text-xs font-black text-blue-900">🥈 גמר מקום 3-4</p>
              </div>
              <div className="bg-[#0f0f1a] p-2 space-y-1">
                <BracketSlot name={final2 ? getTeamName(final2.team_a_id) : getWinner(semi3) || '...'} isWinner={final2?.status === 'completed' && final2.score_a! > final2.score_b!} isPending={!final2 && !getWinner(semi3)} />
                <div className="text-center text-xs text-slate-500">
                  {final2?.status === 'completed' ? `${final2.score_a} – ${final2.score_b}` : 'vs'}
                </div>
                <BracketSlot name={final2 ? getTeamName(final2.team_b_id) : getWinner(semi4) || '...'} isWinner={final2?.status === 'completed' && final2.score_b! > final2.score_a!} isPending={!final2 && !getWinner(semi4)} />
              </div>
              {final2?.status === 'completed' && (
                <div className="bg-blue-400 text-center py-1.5">
                  <p className="text-xs font-black text-blue-900">🥉 {getWinner(final2)}</p>
                </div>
              )}
            </div>
          </div>

          {/* Lines right */}
          <div className="flex flex-col items-center gap-6 w-8">
            <div className="w-full h-px bg-purple-600 mt-8" />
            <div className="w-full h-px bg-purple-600 mt-8" />
          </div>

          {/* Right: semi 3+4 */}
          <div className="flex flex-col gap-6 w-36">
            <div className="space-y-1">
              <p className="text-xs text-purple-400 font-bold mb-1">חצי גמר 3</p>
              <BracketSlot name={semi3 ? getTeamName(semi3.team_a_id) : '?'} isWinner={semi3?.status === 'completed' && semi3.score_a! > semi3.score_b!} />
              <div className="text-center text-xs text-slate-500">
                {semi3?.status === 'completed' ? `${semi3.score_a} – ${semi3.score_b}` : 'vs'}
              </div>
              <BracketSlot name={semi3 ? getTeamName(semi3.team_b_id) : '?'} isWinner={semi3?.status === 'completed' && semi3.score_b! > semi3.score_a!} />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-purple-400 font-bold mb-1">חצי גמר 4</p>
              <BracketSlot name={semi4 ? getTeamName(semi4.team_a_id) : '?'} isWinner={semi4?.status === 'completed' && semi4.score_a! > semi4.score_b!} />
              <div className="text-center text-xs text-slate-500">
                {semi4?.status === 'completed' ? `${semi4.score_a} – ${semi4.score_b}` : 'vs'}
              </div>
              <BracketSlot name={semi4 ? getTeamName(semi4.team_b_id) : '?'} isWinner={semi4?.status === 'completed' && semi4.score_b! > semi4.score_a!} />
            </div>
          </div>
        </div>
      </div>

      {/* Match entry cards */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <div className="h-px flex-1 bg-purple-200" />
          <span className="text-sm font-bold text-purple-700 px-2">הזנת תוצאות</span>
          <div className="h-px flex-1 bg-purple-200" />
        </div>

        <div className="space-y-3">
          {[semi1, semi2, semi3, semi4].filter(Boolean).map((m, i) => m && (
            <div key={m.id}>
              <p className="text-xs text-slate-400 mb-1 font-semibold">חצי גמר {i + 1}</p>
              <MatchCard match={m} teamA={teamMap[m.team_a_id]} teamB={teamMap[m.team_b_id]} onSubmit={onSubmit} />
            </div>
          ))}

          {finalMatches.length > 0 && (
            <>
              <div className="flex items-center gap-2 my-3">
                <div className="h-px flex-1 bg-yellow-300" />
                <span className="text-xs font-bold text-yellow-600 px-2">גמר</span>
                <div className="h-px flex-1 bg-yellow-300" />
              </div>
              {final1 && <MatchCard match={final1} teamA={teamMap[final1.team_a_id]} teamB={teamMap[final1.team_b_id]} onSubmit={onSubmit} />}
              {final2 && <MatchCard match={final2} teamA={teamMap[final2.team_a_id]} teamB={teamMap[final2.team_b_id]} onSubmit={onSubmit} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
