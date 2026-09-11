export function EmptyState({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {subtitle ? <p className="mt-1 text-xs text-slate-400">{subtitle}</p> : null}
    </div>
  );
}
