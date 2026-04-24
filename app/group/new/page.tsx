'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const DEMO_TEAMS = [
  'זוג א', 'זוג ב', 'זוג ג', 'זוג ד',
  'זוג ה', 'זוג ו', 'זוג ז', 'זוג ח',
  'זוג ט', 'זוג י', 'זוג יא', 'זוג יב',
  'זוג יג', 'זוג יד', 'זוג טו', 'זוג טז',
];

const GROUPS = ['A', 'B', 'C', 'D'];

export default function NewGroupTournamentPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [teams, setTeams] = useState<string[]>(Array(16).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function fillDemo() {
    setName('טורניר בתים פאדל');
    setTeams(DEMO_TEAMS);
  }

  async function handleCreate() {
    if (!name.trim()) { setError('יש להזין שם לטורניר'); return; }
    if (teams.some(t => !t.trim())) { setError('יש למלא את כל שמות הזוגות'); return; }
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: tournament, error: tErr } = await supabase
      .from('group_tournaments')
      .insert({ name: name.trim(), status: 'setup', user_id: user?.id })
      .select().single();
    if (tErr) { setError(tErr.message); setLoading(false); return; }

    // Insert teams with group assignment
    const teamRows = teams.map((teamName, i) => ({
      tournament_id: tournament.id,
      name: teamName.trim(),
      group_name: GROUPS[Math.floor(i / 4)],
    }));
    await supabase.from('group_teams').insert(teamRows);

    router.push(`/group/${tournament.id}`);
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-purple-400 hover:text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg text-sm font-medium">
          🏠 בית
        </Link>
        <h1 className="text-2xl font-bold text-purple-900">טורניר בתים חדש</h1>
      </div>

      <div className="bg-white border border-purple-100 rounded-2xl p-4 mb-4">
        <label className="block text-sm font-semibold text-purple-800 mb-2">שם הטורניר</label>
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="שם הטורניר..."
          className="w-full border border-purple-200 rounded-xl px-4 py-3 text-right focus:outline-none focus:ring-2 focus:ring-purple-400 text-lg"
        />
      </div>

      <button onClick={fillDemo}
        className="w-full border-2 border-dashed border-purple-300 text-purple-500 hover:border-purple-500 hover:text-purple-700 rounded-xl py-3 text-sm font-medium transition-colors mb-4">
        מלא זוגות הדגמה
      </button>

      {GROUPS.map((group, gi) => (
        <div key={group} className="bg-white border border-purple-100 rounded-2xl p-4 mb-3">
          <h3 className="font-bold text-purple-700 mb-3">בית {group}</h3>
          <div className="space-y-2">
            {[0, 1, 2, 3].map((j) => {
              const idx = gi * 4 + j;
              return (
                <div key={j} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 w-4">{j + 1}</span>
                  <input
                    type="text"
                    value={teams[idx]}
                    onChange={e => { const t = [...teams]; t[idx] = e.target.value; setTeams(t); }}
                    placeholder={`זוג ${idx + 1}`}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}

      <button onClick={handleCreate} disabled={loading}
        className="w-full bg-purple-700 hover:bg-purple-800 disabled:bg-purple-300 text-white font-bold py-4 rounded-xl text-lg transition-colors">
        {loading ? 'יוצר טורניר...' : 'צור טורניר ←'}
      </button>
    </main>
  );
}
