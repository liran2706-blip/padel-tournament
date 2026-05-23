import { Player } from '@/types';

interface Props {
  players: Player[];
}

export default function StandingsTable({ players }: Props) {
  return (
    <div className="bg-white border border-blue-100 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-blue-700 text-white">
            <th className="text-right px-3 py-2.5 font-semibold w-8">#</th>
            <th className="text-right px-3 py-2.5 font-semibold">שחקן</th>
            <th className="text-center px-2 py-2.5 font-semibold">נק׳</th>
            <th className="text-center px-2 py-2.5 font-semibold">הפרש</th>
            <th className="text-center px-2 py-2.5 font-semibold">נצ׳</th>
            <th className="text-center px-2 py-2.5 font-semibold">הפ׳</th>
          </tr>
        </thead>
        <tbody>
          {players.map((player, index) => (
            <tr key={player.id} className={`border-b border-blue-50 last:border-0 ${index === 0 ? 'bg-blue-50' : ''}`}>
              <td className="px-3 py-2.5 text-slate-400 font-medium">{index + 1}</td>
              <td className="px-3 py-2.5 font-semibold text-slate-800">
                <div className="flex items-center gap-1.5">
                  {index === 0 && <span className="text-base">🏆</span>}
                  <span>{player.name}</span>
                </div>
              </td>
              <td className="px-2 py-2.5 text-center font-bold text-blue-700">{player.total_points}</td>
              <td className={`px-2 py-2.5 text-center font-medium ${player.total_diff > 0 ? 'text-blue-600' : player.total_diff < 0 ? 'text-red-500' : 'text-slate-400'}`}>
                {player.total_diff > 0 ? '+' : ''}{player.total_diff}
              </td>
              <td className="px-2 py-2.5 text-center text-slate-700">{player.wins}</td>
              <td className="px-2 py-2.5 text-center text-slate-400">{player.losses}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
