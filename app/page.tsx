'use client';

import { useEffect, useState } from 'react';
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

const statusColor: Record<string, string> = {
  setup: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-slate-100 text-slate-600',
};

export default function HomePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }
      setUserId(user.id);
      const data = await fetchTournaments(user.id);
      setTournaments(data);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <main className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-end mb-4">
        <LogoutButton />
      </div>

      <div className="rounded-2xl overflow-hidden mb-6 shadow-lg">
        <Image src="/padel.png" alt="Mixing Padel" width={800} height={450} className="w-full object-cover" priority />
      </div>

      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-blue-900">טורניר מיקסינג פאדל</h1>
        <p className="text-blue-500 mt-1 text-sm">ספורט. חברים. חוויה.</p>
      </div>

      <Link
        href="/tournament/new"
        className="flex items-center justify-center gap-2 w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-4 rounded-xl text-lg transition-colors mb-8 shadow"
      >
        <span>＋</span>
        <span>טורניר חדש</span>
      </Link>

      <div>
        <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wide mb-3">הטורנירים שלי</h2>
        {loading ? (
          <p className="text-center text-slate-400 py-8">טוען...</p>
        ) : tournaments.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <p className="text-lg">אין טורנירים עדיין</p>
            <p className="text-sm mt-1">צור טורניר חדש כדי להתחיל</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {tournaments.map((t) => (
              <li key={t.id}>
                <Link
                  href={t.status === 'setup' ? `/tournament/${t.id}/setup` : t.status === 'completed' ? `/tournament/${t.id}/summary` : `/tournament/${t.id}`}
                  className="flex items-center justify-between bg-white border border-blue-100 rounded-xl p-4 hover:border-blue-400 hover:shadow-sm transition-all"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(t.created_at).toLocaleDateString('he-IL')}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColor[t.status]}`}>
                    {statusLabel[t.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
