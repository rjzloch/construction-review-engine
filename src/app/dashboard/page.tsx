import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex items-center justify-between rounded-xl bg-white p-6 shadow-sm">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Construction Review Engine
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              Project Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Signed in as {user.email}
            </p>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100"
            >
              Log out
            </button>
          </form>
        </header>

        <section className="mt-6 rounded-xl bg-white p-8 shadow-sm">
          <h2 className="text-xl font-bold text-slate-950">
            Authentication successful
          </h2>

          <p className="mt-2 text-slate-600">
            Your account is authenticated and this route is protected.
          </p>
        </section>
      </div>
    </main>
  );
}