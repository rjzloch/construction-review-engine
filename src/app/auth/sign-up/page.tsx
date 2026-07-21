import Link from "next/link";

import { signUp } from "@/app/auth/actions";

type SignUpPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function SignUpPage({
  searchParams,
}: SignUpPageProps) {
  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Construction Review Engine
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Create your account
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Start building a secure project intelligence workspace.
        </p>

        {params.error && (
          <div className="mt-6 rounded-lg bg-red-100 p-4 text-sm text-red-800">
            {params.error}
          </div>
        )}

        {params.message && (
          <div className="mt-6 rounded-lg bg-green-100 p-4 text-sm text-green-800">
            {params.message}
          </div>
        )}

        <form action={signUp} className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-slate-700"
            >
              Email address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
            />

            <p className="mt-2 text-xs text-slate-500">
              Use at least eight characters.
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800"
          >
            Create account
          </button>
        </form>

        <p className="mt-6 text-sm text-slate-600">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-slate-950 underline"
          >
            Log in
          </Link>
        </p>
      </section>
    </main>
  );
}