import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export default function ForbiddenPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-lg font-semibold text-slate-900">You don&apos;t have access to this page</h1>
      <p className="max-w-sm text-sm text-slate-600">
        If you believe this is a mistake, contact your Admin or HOD.
      </p>
      <div className="flex gap-3">
        <Link href="/" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700">
          Home
        </Link>
        <SignOutButton />
      </div>
    </main>
  );
}
