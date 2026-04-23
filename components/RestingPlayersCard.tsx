import { Player } from '@/types';

interface Props {
  players: Player[];
}

export default function RestingPlayersCard({ players }: Props) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <p className="text-sm font-semibold text-blue-800 mb-2">
        😴 שחקנים במנוחה ({players.length})
      </p>
      <div className="flex flex-wrap gap-2">
        {players.map((p) => (
          <span key={p.id} className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
            {p.name}
          </span>
        ))}
      </div>
    </div>
  );
}
