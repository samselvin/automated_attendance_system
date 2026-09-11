import { Suspense } from "react";
import { LoginForm } from "./login-form";

const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    "Your account is not registered, or your Google account's email domain is not allowed. Please contact the college office.",
  Configuration: "Sign-in is not configured correctly. Please contact the college office.",
  Default: "Something went wrong while signing in. Please try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message = error ? ERROR_MESSAGES[error] ?? ERROR_MESSAGES.Default : null;

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">College Attendance</h1>
        <p className="mt-1 text-sm text-slate-500">Sign in with your college Google account.</p>

        {message ? (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>
        ) : null}

        <div className="mt-6">
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
