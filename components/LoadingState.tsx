export default function LoadingState({ message = 'טוען...' }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-slate-500 text-sm">{message}</p>
      </div>
    </div>
  );
}
