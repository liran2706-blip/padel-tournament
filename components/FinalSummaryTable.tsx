import { Player } from '@/types';

interface Props {
  players: Player[];
  finalPlayerIds?: Set<string>;
}

const medals = ['🥇', '🥈', '🥉', '4️⃣'];

export default function FinalSummaryTable({ players, finalPlayerIds }: Props) {
  const hasFinal = finalPlayerIds && finalPlayerIds.size > 0;

  const finalPlayers = hasFinal
    ? players.filter(p => finalPlayerIds!.has(p.id)).sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        if (b.total_diff !== a.total_diff) return b.total_diff - a.total_diff;
        return b.wins - a.wins;
      })
    : [];
  const restPlayers = hasFinal
    ? players.filter(p => !finalPlayerIds!.has(p.id)).sort((a, b) => {
        if (b.total_points !== a.total_points) return b.total_points - a.total_points;
        if (b.total_diff !== a.total_diff) return b.total_diff - a.total_diff;
        return b.wins - a.wins;
      })
    : players;

  const renderRow = (player: Player, rank: number) => (
    <tr
      key={player.id}
      className={`border-b border-slate-100 last:border-0 ${
        rank === 1 ? 'bg-yellow-50' :
        rank === 2 ? 'bg-slate-50' :
        rank === 3 ? 'bg-orange-50' : ''
      }`}
    >
      <td className="px-3 py-2.5 text-center">
        {rank <= 4 ? (
          <span>{medals[rank - 1]}</span>
        ) : (
          <span className="text-slate-400">{rank}</span>
        )}
      </td>
      <td className="px-3 py-2.5 font-semibold text-slate-800">{player.name}</td>
      <td className="px-2 py-2.5 text-center font-bold text-green-700">{player.total_points}</td>
      <td className={`px-2 py-2.5 text-center font-medium ${
        player.total_diff > 0 ? 'text-green-600' :
        player.total_diff < 0 ? 'text-red-500' : 'text-slate-400'
      }`}>
        {player.total_diff > 0 ? '+' : ''}{player.total_diff}
      </td>
      <td className="px-2 py-2.5 text-center text-slate-700">{player.wins}</td>
      <td className="px-2 py-2.5 text-center text-slate-400">{player.losses}</td>
      <td className="px-2 py-2.5 text-center text-slate-400">{player.rest_round_number ?? '—'}</td>
    </tr>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="text-right px-3 py-2.5 font-semibold text-slate-500 w-8">#</th>
            <th className="text-right px-3 py-2.5 font-semibold text-slate-500">שחקן</th>
            <th className="text-center px-2 py-2.5 font-semibold text-slate-500">נק׳</th>
            <th className="text-center px-2 py-2.5 font-semibold text-slate-500">הפרש</th>
            <th className="text-center px-2 py-2.5 font-semibold text-slate-500">נצ׳</th>
            <th className="text-center px-2 py-2.5 font-semibold text-slate-500">הפ׳</th>
            <th className="text-center px-2 py-2.5 font-semibold text-slate-500">מ׳</th>
          </tr>
        </thead>
        <tbody>
          {hasFinal ? (
            <>
              <tr>
                <td colSpan={7} className="px-3 py-1.5 bg-yellow-50 text-yellow-700 text-xs font-semibold border-b border-yellow-100">
                  🏆 ליגת אליפות — מקומות 1–4
                </td>
              </tr>
              {finalPlayers.map((p, i) => renderRow(p, i + 1))}
              <tr>
                <td colSpan={7} className="px-3 py-1.5 bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-100">
                  מקומות 5–20
                </td>
              </tr>
              {restPlayers.map((p, i) => renderRow(p, i + 5))}
            </>
          ) : (
            players.map((p, i) => renderRow(p, i + 1))
          )}
        </tbody>
      </table>
    </div>
  );
}
