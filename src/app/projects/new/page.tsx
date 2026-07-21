import Link from "next/link";
import { redirect } from "next/navigation";

import { createProject } from "@/app/projects/actions";
import { createClient } from "@/lib/supabase/server";

type NewProjectPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewProjectPage({
  searchParams,
}: NewProjectPageProps) {
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
        name
      )
    `)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    redirect(
      `/dashboard?error=${encodeURIComponent(
        membershipError.message,
      )}`,
    );
  }

  if (!membership) {
    redirect("/onboarding");
  }

  if (!["owner", "admin", "member"].includes(membership.role)) {
    redirect(
      "/dashboard?error=Your%20role%20does%20not%20allow%20project%20creation.",
    );
  }

  const organization = Array.isArray(membership.organizations)
    ? membership.organizations[0]
    : membership.organizations;

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-slate-700 underline"
          >
            ← Back to dashboard
          </Link>
        </div>

        <section className="rounded-xl bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {organization?.name ?? "Construction Review Engine"}
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Create a project
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            Enter the basic project information. Documents and review
            workflows will be added in later stages.
          </p>

          {params.error && (
            <div className="mt-6 rounded-lg bg-red-100 p-4 text-sm text-red-800">
              {params.error}
            </div>
          )}

          <form action={createProject} className="mt-8 space-y-8">
            <section>
              <h2 className="text-lg font-bold text-slate-950">
                Project identity
              </h2>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Project name
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    placeholder="Terminal 3 Improvement Program"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="projectNumber"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Project number
                  </label>

                  <input
                    id="projectNumber"
                    name="projectNumber"
                    type="text"
                    placeholder="CRE-001"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="projectType"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Project type
                  </label>

                  <input
                    id="projectType"
                    name="projectType"
                    type="text"
                    placeholder="Terminal renovation"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="ownerName"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Owner
                  </label>

                  <input
                    id="ownerName"
                    name="ownerName"
                    type="text"
                    placeholder="Project owner"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="location"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Location
                  </label>

                  <input
                    id="location"
                    name="location"
                    type="text"
                    placeholder="Chicago, Illinois"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950">
                Project status
              </h2>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="phase"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Phase
                  </label>

                  <select
                    id="phase"
                    name="phase"
                    defaultValue="construction"
                    required
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
                  >
                    <option value="planning">Planning</option>
                    <option value="design">Design</option>
                    <option value="procurement">Procurement</option>
                    <option value="construction">Construction</option>
                    <option value="closeout">Closeout</option>
                    <option value="warranty">Warranty</option>
                    <option value="complete">Complete</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="status"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Status
                  </label>

                  <select
                    id="status"
                    name="status"
                    defaultValue="active"
                    required
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
                  >
                    <option value="active">Active</option>
                    <option value="on_hold">On hold</option>
                    <option value="complete">Complete</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950">
                Project team
              </h2>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="contractType"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Contract type
                  </label>

                  <input
                    id="contractType"
                    name="contractType"
                    type="text"
                    placeholder="Design-bid-build"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="generalContractor"
                    className="block text-sm font-medium text-slate-700"
                  >
                    General contractor
                  </label>

                  <input
                    id="generalContractor"
                    name="generalContractor"
                    type="text"
                    placeholder="General contractor name"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <label
                    htmlFor="architectEngineer"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Architect or engineer
                  </label>

                  <input
                    id="architectEngineer"
                    name="architectEngineer"
                    type="text"
                    placeholder="Design firm name"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
                  />
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-950">
                Key dates
              </h2>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="noticeToProceed"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Notice to proceed
                  </label>

                  <input
                    id="noticeToProceed"
                    name="noticeToProceed"
                    type="date"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
                  />
                </div>

                <div>
                  <label
                    htmlFor="contractCompletionDate"
                    className="block text-sm font-medium text-slate-700"
                  >
                    Contract completion date
                  </label>

                  <input
                    id="contractCompletionDate"
                    name="contractCompletionDate"
                    type="date"
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950 outline-none focus:border-slate-900"
                  />
                </div>
              </div>
            </section>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/dashboard"
                className="rounded-lg border border-slate-300 px-5 py-3 text-center font-semibold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </Link>

              <button
                type="submit"
                className="rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Create project
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}