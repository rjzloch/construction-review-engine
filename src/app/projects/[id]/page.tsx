import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ProjectPageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export default async function ProjectPage({
  params,
}: ProjectPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(`
      id,
      organization_id,
      name,
      project_number,
      owner_name,
      location,
      project_type,
      phase,
      status,
      contract_type,
      general_contractor,
      architect_engineer,
      notice_to_proceed,
      contract_completion_date,
      created_at,
      updated_at,
      organizations (
        name
      )
    `)
    .eq("id", id)
    .maybeSingle();

  if (projectError) {
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <div className="mx-auto max-w-5xl rounded-xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-red-800">
            Unable to load project
          </h1>

          <p className="mt-3 text-slate-600">
            {projectError.message}
          </p>

          <Link
            href="/dashboard"
            className="mt-6 inline-block font-semibold text-slate-900 underline"
          >
            Return to dashboard
          </Link>
        </div>
      </main>
    );
  }

  /*
   * RLS causes inaccessible projects to return no row.
   * We intentionally show a normal 404 rather than revealing whether
   * another organization's project exists.
   */
  if (!project) {
    notFound();
  }

  const organization = Array.isArray(project.organizations)
    ? project.organizations[0]
    : project.organizations;

  const workspaceSections = [
    {
      title: "Documents",
      description:
        "Upload contracts, drawings, proposals, field orders, and supporting records.",
      href: `/projects/${project.id}/documents`,
      status: "Coming next",
    },
    {
      title: "Field Orders",
      description:
        "Review proposed changes against contracts, prior changes, scope, cost, and schedule.",
      href: `/projects/${project.id}/field-orders`,
      status: "Planned",
    },
    {
      title: "Findings",
      description:
        "Track evidence-backed risks, conflicts, missing information, and recommended actions.",
      href: `/projects/${project.id}/findings`,
      status: "Planned",
    },
    {
      title: "Project Search",
      description:
        "Search and ask questions across the complete project record with citations.",
      href: `/projects/${project.id}/search`,
      status: "Planned",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/dashboard"
                className="text-sm font-semibold text-slate-600 hover:text-slate-950"
              >
                ← All projects
              </Link>

              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {organization?.name ?? "Construction Review Engine"}
              </p>

              <h1 className="mt-1 text-3xl font-bold text-slate-950">
                {project.name}
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                {project.project_number ?? "No project number"} ·{" "}
                {formatLabel(project.phase)} ·{" "}
                {formatLabel(project.status)}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
                {formatLabel(project.phase)}
              </span>

              <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
                {formatLabel(project.status)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-6 py-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="h-fit rounded-xl bg-white p-4 shadow-sm">
          <nav aria-label="Project navigation" className="space-y-1">
            <Link
              href={`/projects/${project.id}`}
              className="block rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              Overview
            </Link>

            <Link
              href={`/projects/${project.id}/documents`}
              className="block rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Documents
            </Link>

            <Link
              href={`/projects/${project.id}/field-orders`}
              className="block rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Field Orders
            </Link>

            <Link
              href={`/projects/${project.id}/findings`}
              className="block rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Findings
            </Link>

            <Link
              href={`/projects/${project.id}/search`}
              className="block rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Project Search
            </Link>
          </nav>
        </aside>

        <div className="space-y-6">
          <section className="rounded-xl bg-white p-8 shadow-sm">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Project overview
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                Project information
              </h2>
            </div>

            <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <dt className="text-sm font-medium text-slate-500">
                  Owner
                </dt>
                <dd className="mt-1 text-slate-950">
                  {project.owner_name ?? "Not provided"}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-slate-500">
                  Location
                </dt>
                <dd className="mt-1 text-slate-950">
                  {project.location ?? "Not provided"}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-slate-500">
                  Project type
                </dt>
                <dd className="mt-1 text-slate-950">
                  {project.project_type ?? "Not provided"}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-slate-500">
                  Contract type
                </dt>
                <dd className="mt-1 text-slate-950">
                  {project.contract_type ?? "Not provided"}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-slate-500">
                  General contractor
                </dt>
                <dd className="mt-1 text-slate-950">
                  {project.general_contractor ?? "Not provided"}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-slate-500">
                  Architect or engineer
                </dt>
                <dd className="mt-1 text-slate-950">
                  {project.architect_engineer ?? "Not provided"}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-slate-500">
                  Notice to proceed
                </dt>
                <dd className="mt-1 text-slate-950">
                  {formatDate(project.notice_to_proceed)}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-slate-500">
                  Contract completion
                </dt>
                <dd className="mt-1 text-slate-950">
                  {formatDate(project.contract_completion_date)}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-slate-500">
                  Last updated
                </dt>
                <dd className="mt-1 text-slate-950">
                  {new Intl.DateTimeFormat("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  }).format(new Date(project.updated_at))}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl bg-white p-8 shadow-sm">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Construction intelligence
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-950">
                Project workspace
              </h2>

              <p className="mt-2 text-slate-600">
                This workspace will turn project records into searchable,
                evidence-backed construction intelligence.
              </p>
            </div>

            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {workspaceSections.map((section) => (
                <div
                  key={section.title}
                  className="rounded-xl border border-slate-200 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <h3 className="text-lg font-bold text-slate-950">
                      {section.title}
                    </h3>

                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {section.status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {section.description}
                  </p>

                  <Link
                    href={section.href}
                    className="mt-5 inline-block text-sm font-semibold text-slate-950 underline"
                  >
                    Open {section.title.toLowerCase()}
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-6">
            <h2 className="font-bold text-amber-950">
              Current system status
            </h2>

            <p className="mt-2 text-sm leading-6 text-amber-900">
              The secure account, organization, project database, and
              project workspace are operational. Document ingestion and AI
              review have not been added yet.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}