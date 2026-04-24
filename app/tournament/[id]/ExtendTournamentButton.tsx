'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  tournamentId: string;
  currentTotal: number;
  currentRound: number;
}

export default function ExtendTournamentButton({ tournamentId, currentTotal, currentRound }: Props) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(1);
  const [loading, setLoading] = useState(false);

  const roundsLeft = currentTotal - currentRound;
  // Only show if we're in the last 2 rounds before final
  if (roundsLeft > 2) return null;

  async function handleExtend() {
    if (!confirm(`להוסיף ${adding} סיבובים? הטורניר יהיה ${currentTotal + adding} סיבובים`)) return;
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from('tournaments')
      .update({ total_rounds: currentTotal + adding })
      .eq('id', tournamentId);
    window.location.reload();
  }

  return (
    <div>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-medium py-2.5 rounded-xl transition-colors border border-slate-200"
        >
          ➕ הארך את הטורניר
        </button>
      ) : (
        <div className="bg-white border border-blue-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">
            כמה סיבובים להוסיף?
          </p>
          <div className="flex gap-2 mb-3">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => setAdding(n)}
                className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-colors ${
                  adding === n
                    ? 'bg-blue-700 text-white border-blue-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                }`}
              >
                +{n}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 mb-3">
            הטורניר יהיה {currentTotal + adding} סיבובים · גמר בסיבוב {currentTotal + adding - 1} · השלמה בסיבוב {currentTotal + adding}
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleExtend}
              disabled={loading}
              className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:bg-blue-300 text-white font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              {loading ? 'מעדכן...' : 'אשר'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-sm transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
