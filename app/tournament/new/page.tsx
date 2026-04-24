'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createTournament, createPlayers } from '@/lib/tournament/db';
import { createClient } from '@/lib/supabase/client';
import { DEMO_PLAYERS } from '@/lib/tournament/scheduling';
import Link from 'next/link';

const PLAYER_COUNT = 20;

export default function NewTournamentPage() {
  const [proBlocked, setProBlocked] = useState(false);
  const router = useRouter();
  const [name, setName] = useState('');
  const [players, setPlayers] = useState<string[]>(Array(PLAYER_COUNT).fill(''));
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function checkPro() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('pro_users').select('active').eq('user_id', user.id).maybeSingle();
      if (data && data.active === false) setProBlocked(true);
    }
    checkPro();
  }, []);

  function fillDemo() {
    setName('טורניר מיקסינג פאדל');
    setPlayers([...DEMO_PLAYERS]);
  }

  function handlePlayerChange(index: number, value: string) {
    const updated = [...players];
    updated[index] = value;
    setPlayers(updated);
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (!name.trim()) errs.push('יש להזין שם לטורניר');
    const trimmed = players.map((p) => p.trim());
    const nonEmpty = trimmed.filter(Boolean);
    if (nonEmpty.length < PLAYER_COUNT) errs.push(`יש להזין בדיוק ${PLAYER_COUNT} שמות שחקנים`);
    const unique = new Set(trimmed.filter(Boolean));
    if (unique.size < nonEmpty.length) errs.push('שמות השחקנים חייבים להיות ייחודיים');
    setErrors(errs);
    return errs.length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const tournament = await createTournament(name.trim(), user?.id);
      await createPlayers(tournament.id, players.map((p) => p.trim()));
      router.push(`/tournament/${tournament.id}/setup`);
    } catch (err) {
      setErrors(['שגיאה: ' + (err instanceof Error ? err.message : JSON.stringify(err))]);
    } finally {
      setLoading(false);
    }
  }

  if (proBlocked) return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4" dir="rtl">
      <div className="max-w-md w-full text-center bg-white rounded-2xl p-8 shadow-lg border border-red-200">
        <p className="text-5xl mb-4">🔒</p>
        <h2 className="text-xl font-black text-slate-800 mb-3">הגישה חסומה</h2>
        <p className="text-slate-500 mb-6">הטורניר שלך הסתיים. כדי להקים טורניר נוסף יש לשלם ולקבל אישור.</p>
        <a href="https://pro.israelpadel.com/dashboard"
          className="block w-full bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors">
          לדשבורד שלי ←
        </a>
      </div>
    </div>
  );

  return (
    <main className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/" className="text-blue-400 hover:text-blue-600 text-2xl">←</Link>
        <h1 className="text-2xl font-bold text-blue-900">טורניר חדש</h1>
      </div>

      <div className="bg-white border border-blue-100 rounded-xl p-4 mb-4">
        <label className="block text-sm font-semibold text-blue-800 mb-2">שם הטורניר</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="שם הטורניר..."
          className="w-full border border-blue-200 rounded-lg px-3 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 text-right"
        />
      </div>

      <button
        onClick={fillDemo}
        className="w-full border-2 border-dashed border-blue-300 text-blue-500 hover:border-blue-500 hover:text-blue-700 rounded-xl py-3 text-sm font-medium transition-colors mb-4"
      >
        מלא שחקני הדגמה
      </button>

      <div className="bg-white border border-blue-100 rounded-xl p-4 mb-4">
        <p className="text-sm font-semibold text-blue-800 mb-3">שחקנים ({PLAYER_COUNT})</p>
        <div className="space-y-2">
          {players.map((player, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-slate-400 w-6 text-center">{i + 1}</span>
              <input
                type="text"
                value={player}
                onChange={(e) => handlePlayerChange(i, e.target.value)}
                placeholder={`שחקן ${i + 1}`}
                className="flex-1 border border-blue-100 rounded-lg px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 text-right"
              />
            </div>
          ))}
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
          {errors.map((err, i) => (
            <p key={i} className="text-red-600 text-sm">• {err}</p>
          ))}
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white font-bold py-4 rounded-xl text-lg transition-colors shadow"
      >
        {loading ? 'יוצר טורניר...' : 'צור טורניר'}
      </button>
    </main>
  );
}
