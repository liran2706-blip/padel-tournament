'use client';

import { useState, useRef } from 'react';
import { startTournament } from '@/lib/tournament/db';

export default function StartTournamentButton({ tournamentId }: { tournamentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const started = useRef(false);

  async function handleStart() {
    if (started.current) return;
    started.current = true;
    setLoading(true);
    setError('');
    try {
      await startTournament(tournamentId);
      window.location.href = `/tournament/${tournamentId}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      setError('שגיאה: ' + msg);
      started.current = false;
      setLoading(false);
    }
  }

  return (
    <div>
      {error && <p className="text-red-600 text-sm mb-3 text-center">{error}</p>}
      <button
        onClick={handleStart}
        disabled={loading}
        className="w-full bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white font-bold py-4 rounded-xl text-xl transition-colors shadow"
      >
        {loading ? 'מתחיל סיבוב 1...' : '🎾 התחל טורניר'}
      </button>
    </div>
  );
}
