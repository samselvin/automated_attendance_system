import { requireSession } from "@/lib/guards";
import { ChangePasswordForm } from "./change-password-form";

export default async function ChangePasswordPage() {
  const session = await requireSession();

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Change your password</h1>
        <p className="mt-1 text-sm text-slate-500">
          {session.user.mustChangePassword
            ? "You're using a temporary password. Set a new one to continue."
            : "Update the password for your account."}
        </p>
        <div className="mt-6">
          <ChangePasswordForm />
        </div>
      </div>
    </main>
  );
}
