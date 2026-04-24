'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { fetchTournaments } from '@/lib/tournament/db';
import { Tournament } from '@/types';
import LogoutButton from '@/components/LogoutButton';

const statusLabel: Record<string, string> = {
  setup: 'הגדרה',
  in_progress: 'פעיל',
  completed: 'הסתיים',
};

const statusLabelGroup: Record<string, string> = {
  setup: 'הגדרה',
  group_stage: 'שלב בתים',
  knockout: 'נוקאאוט',
  completed: 'הסתיים',
};

const statusColor: Record<string, string> = {
  setup: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-green-100 text-green-800',
  group_stage: 'bg-blue-100 text-blue-800',
  knockout: 'bg-purple-100 text-purple-800',
  completed: 'bg-slate-100 text-slate-600',
};

export default function HomePage() {
  const [mixTournaments, setMixTournaments] = useState<Tournament[]>([]);
  const [groupTournaments, setGroupTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { window.location.href = '/login'; return; }

    const mixData = await fetchTournaments(user.id);
    setMixTournaments(mixData);

    const { data: groupData } = await supabase
      .from('group_tournaments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setGroupTournaments(groupData ?? []);

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDeleteMix(id: string) {
    if (!confirm('למחוק את הטורניר לחלוטין?')) return;
    const supabase = createClient();
    await supabase.from('tournaments').delete().eq('id', id);
    setMixTournaments((prev) => prev.filter(t => t.id !== id));
  }

  async function handleDeleteGroup(id: string) {
    if (!confirm('למחוק את הטורניר לחלוטין?')) return;
    const supabase = createClient();
    await supabase.from('group_tournaments').delete().eq('id', id);
    setGroupTournaments((prev) => prev.filter(t => t.id !== id));
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-blue-900">דשבורד ניהול</h1>
        <LogoutButton />
      </div>

      <div className="rounded-2xl overflow-hidden mb-8 shadow-lg">
        <Image src="/padel.png" alt="Padel" width={800} height={300} className="w-full object-cover max-h-40" priority />
      </div>

      {/* Two columns */}
      <div className="grid grid-cols-2 gap-4">

        {/* Mixing column */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-700">🎾 טורניר מיקסינג</h2>
          </div>
          <Link
            href="/tournament/new"
            className="flex items-center justify-center gap-2 w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 rounded-xl text-sm transition-colors mb-3"
          >
            ＋ טורניר חדש
          </Link>

          {loading ? (
            <p className="text-center text-slate-400 text-sm py-4">טוען...</p>
          ) : mixTournaments.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-4">אין טורנירים</p>
          ) : (
            <ul className="space-y-2">
              {mixTournaments.map((t) => (
                <li key={t.id} className="flex items-center gap-1.5">
                  <Link
                    href={t.status === 'setup' ? `/tournament/${t.id}/setup` : t.status === 'completed' ? `/tournament/${t.id}/summary` : `/tournament/${t.id}`}
                    className="flex-1 bg-white border border-blue-100 rounded-xl p-3 hover:border-blue-400 transition-all"
                  >
                    <p className="font-semibold text-slate-800 text-sm truncate">{t.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString('he-IL')}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[t.status]}`}>
                        {statusLabel[t.status]}
                      </span>
                    </div>
                  </Link>
                  <button onClick={() => handleDeleteMix(t.id)}
                    className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors">
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Groups column */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-slate-700">🏆 טורניר בתים</h2>
          </div>
          <Link
            href="/group/new"
            className="flex items-center justify-center gap-2 w-full bg-purple-700 hover:bg-purple-800 text-white font-bold py-3 rounded-xl text-sm transition-colors mb-3"
          >
            ＋ טורניר חדש
          </Link>

          {loading ? (
            <p className="text-center text-slate-400 text-sm py-4">טוען...</p>
          ) : groupTournaments.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-4">אין טורנירים</p>
          ) : (
            <ul className="space-y-2">
              {groupTournaments.map((t) => (
                <li key={t.id} className="flex items-center gap-1.5">
                  <Link
                    href={`/group/${t.id}`}
                    className="flex-1 bg-white border border-purple-100 rounded-xl p-3 hover:border-purple-400 transition-all"
                  >
                    <p className="font-semibold text-slate-800 text-sm truncate">{t.name}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-slate-400">{new Date(t.created_at).toLocaleDateString('he-IL')}</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[t.status]}`}>
                        {statusLabelGroup[t.status]}
                      </span>
                    </div>
                  </Link>
                  <button onClick={() => handleDeleteGroup(t.id)}
                    className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors">
                    🗑
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}
