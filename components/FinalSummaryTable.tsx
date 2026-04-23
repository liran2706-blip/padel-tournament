import { Player } from '@/types';

interface Props {
  players: Player[];
}

const medals = ['🥇', '🥈', '🥉'];

export default function FinalSummaryTable({ players }: Props) {
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
          {players.map((player, index) => (
            <tr
              key={player.id}
              className={`border-b border-slate-100 last:border-0 ${
                index === 0
                  ? 'bg-yellow-50'
                  : index === 1
                  ? 'bg-slate-50'
                  : index === 2
                  ? 'bg-orange-50'
                  : ''
              }`}
            >
              <td className="px-3 py-2.5 text-center">
                {index < 3 ? (
                  <span>{medals[index]}</span>
                ) : (
                  <span className="text-slate-400">{index + 1}</span>
                )}
              </td>
              <td className="px-3 py-2.5 font-semibold text-slate-800">
                {player.name}
              </td>
              <td className="px-2 py-2.5 text-center font-bold text-green-700">
                {player.total_points}
              </td>
              <td
                className={`px-2 py-2.5 text-center font-medium ${
                  player.total_diff > 0
                    ? 'text-green-600'
                    : player.total_diff < 0
                    ? 'text-red-500'
                    : 'text-slate-400'
                }`}
              >
                {player.total_diff > 0 ? '+' : ''}
                {player.total_diff}
              </td>
              <td className="px-2 py-2.5 text-center text-slate-700">{player.wins}</td>
              <td className="px-2 py-2.5 text-center text-slate-400">{player.losses}</td>
              <td className="px-2 py-2.5 text-center text-slate-400">
                {player.rest_round_number ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
