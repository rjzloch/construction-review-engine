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

function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

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
      organization_id,
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

  const { data: projects, error: projectsError } = await supabase
    .from("projects")
    .select(`
      id,
      name,
      project_number,
      owner_name,
      location,
      project_type,
      phase,
      status,
      updated_at
    `)
    .eq("organization_id", membership.organization_id)
    .order("updated_at", { ascending: false });

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

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/projects/new"
              className="rounded-lg bg-slate-950 px-4 py-2 text-center font-semibold text-white hover:bg-slate-800"
            >
              New project
            </Link>

            <form action={signOut}>
              <button
                type="submit"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100"
              >
                Log out
              </button>
            </form>
          </div>
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

        {projectsError && (
          <div className="mt-6 rounded-lg bg-red-100 p-4 text-sm text-red-800">
            Unable to load projects: {projectsError.message}
          </div>
        )}

        <section className="mt-6 rounded-xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Projects
              </h2>

              <p className="mt-2 text-slate-600">
                Select a project to access its construction intelligence
                workspace.
              </p>
            </div>

            <p className="text-sm font-semibold text-slate-500">
              {projects?.length ?? 0} project
              {(projects?.length ?? 0) === 1 ? "" : "s"}
            </p>
          </div>

          {!projectsError && projects?.length === 0 && (
            <div className="mt-8 rounded-xl border border-dashed border-slate-300 p-10 text-center">
              <h3 className="text-lg font-bold text-slate-950">
                No projects yet
              </h3>

              <p className="mt-2 text-slate-600">
                Create your first project to begin organizing documents
                and construction reviews.
              </p>

              <Link
                href="/projects/new"
                className="mt-6 inline-block rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Create first project
              </Link>
            </div>
          )}

          {!projectsError && projects && projects.length > 0 && (
            <div className="mt-8 grid gap-5 lg:grid-cols-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="rounded-xl border border-slate-200 p-6 transition hover:border-slate-400 hover:shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {project.project_number ?? "No project number"}
                      </p>

                      <h3 className="mt-2 text-xl font-bold text-slate-950">
                        {project.name}
                      </h3>
                    </div>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {formatLabel(project.status)}
                    </span>
                  </div>

                  <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-slate-500">
                        Phase
                      </dt>
                      <dd className="mt-1 text-slate-900">
                        {formatLabel(project.phase)}
                      </dd>
                    </div>

                    <div>
                      <dt className="font-medium text-slate-500">
                        Project type
                      </dt>
                      <dd className="mt-1 text-slate-900">
                        {project.project_type ?? "Not provided"}
                      </dd>
                    </div>

                    <div>
                      <dt className="font-medium text-slate-500">
                        Owner
                      </dt>
                      <dd className="mt-1 text-slate-900">
                        {project.owner_name ?? "Not provided"}
                      </dd>
                    </div>

                    <div>
                      <dt className="font-medium text-slate-500">
                        Location
                      </dt>
                      <dd className="mt-1 text-slate-900">
                        {project.location ?? "Not provided"}
                      </dd>
                    </div>
                  </dl>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}