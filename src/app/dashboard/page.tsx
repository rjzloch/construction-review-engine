import Link from "next/link";
import { redirect } from "next/navigation";

import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DashboardPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select(`
      role,
      organizations (
        id,
        name
      )
    `)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-red-800">
            Unable to load workspace
          </h1>

          <p className="mt-3 text-slate-600">
            {membershipError.message}
          </p>
        </div>
      </main>
    );
  }

  if (!membership) {
    redirect("/onboarding");
  }

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-5 rounded-xl bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Construction Review Engine
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-950">
              {organization?.name ?? "Project Dashboard"}
            </h1>

            <p className="mt-2 text-sm text-slate-600">
              Signed in as {user.email} · Role: {membership.role}
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

        {params.message && (
          <div className="mt-6 rounded-lg bg-green-100 p-4 text-sm text-green-800">
            {params.message}
          </div>
        )}

        {params.error && (
          <div className="mt-6 rounded-lg bg-red-100 p-4 text-sm text-red-800">
            {params.error}
          </div>
        )}

        <section className="mt-6 rounded-xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Projects
              </h2>

              <p className="mt-2 text-slate-600">
                No construction projects have been created yet.
              </p>
            </div>

            <Link
              href="/projects/new"
              className="rounded-lg bg-slate-950 px-4 py-3 text-center font-semibold text-white hover:bg-slate-800"
            >
              Create first project
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}