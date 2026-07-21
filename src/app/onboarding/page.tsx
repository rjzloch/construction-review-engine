import { redirect } from "next/navigation";

import { completeOnboarding } from "@/app/onboarding/actions";
import { createClient } from "@/lib/supabase/server";

type OnboardingPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  const { data: existingMembership } = await supabase
    .from("organization_memberships")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existingMembership) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-xl rounded-xl bg-white p-8 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Construction Review Engine
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Set up your workspace
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          Tell us who you are and create your first organization.
        </p>

        {params.error && (
          <div className="mt-6 rounded-lg bg-red-100 p-4 text-sm text-red-800">
            {params.error}
          </div>
        )}

        <form action={completeOnboarding} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="fullName"
              className="block text-sm font-medium text-slate-700"
            >
              Full name
            </label>

            <input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="jobTitle"
              className="block text-sm font-medium text-slate-700"
            >
              Job title
            </label>

            <input
              id="jobTitle"
              name="jobTitle"
              type="text"
              required
              placeholder="Owner's Representative"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
            />
          </div>

          <div>
            <label
              htmlFor="organizationName"
              className="block text-sm font-medium text-slate-700"
            >
              Organization name
            </label>

            <input
              id="organizationName"
              name="organizationName"
              type="text"
              required
              placeholder="RJ Zloch"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
            />

            <p className="mt-2 text-xs text-slate-500">
              This will be the secure workspace containing your projects.
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800"
          >
            Create workspace
          </button>
        </form>
      </section>
    </main>
  );
}