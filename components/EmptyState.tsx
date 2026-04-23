interface Props {
  title: string;
  description?: string;
}

export default function EmptyState({ title, description }: Props) {
  return (
    <div className="text-center py-12 text-slate-400">
      <p className="text-2xl mb-2">🎾</p>
      <p className="font-medium text-slate-600">{title}</p>
      {description && <p className="text-sm mt-1">{description}</p>}
    </div>
  );
}
