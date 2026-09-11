export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <h1 className="text-lg font-semibold text-slate-900">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-slate-500">
        This page needs a connection to load current data — attendance, marks and notifications are never shown from a
        stale cache. Reconnect and try again.
      </p>
    </main>
  );
}
