'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  tournamentId: string;
  currentTotal: number;
}

export default function AddRoundButton({ tournamentId, currentTotal }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleAddRound() {
    if (!confirm(`להוסיף סיבוב ${currentTotal + 1} לטורניר?`)) return;
    setLoading(true);
    try {
      // Update total_rounds
      const newTotal = currentTotal + 1;
      const supabase = createClient();
      await supabase
        .from('tournaments')
        .update({ total_rounds: newTotal, status: 'in_progress', current_round_number: currentTotal + 1 })
        .eq('id', tournamentId);

      // Trigger next round generation via API
      const res = await fetch(`/api/tournament/${tournamentId}/add-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nextRoundNumber: currentTotal + 1, totalRounds: newTotal }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        alert('שגיאה בהוספת הסיבוב');
      }
    } catch {
      alert('שגיאה בהוספת הסיבוב');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
      <p className="text-green-700 font-semibold mb-3">הטורניר הסתיים — רוצה להוסיף סיבוב?</p>
      <button
        onClick={handleAddRound}
        disabled={loading}
        className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white font-bold px-6 py-3 rounded-xl transition-colors"
      >
        {loading ? 'מוסיף סיבוב...' : `➕ הוסף סיבוב ${currentTotal + 1}`}
      </button>
    </div>
  );
}
