import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { uploadDocument } from "@/app/projects/[id]/documents/actions";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DocumentsPageProps = {
  params: Promise<{
    id: string;
  }>;

  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default async function DocumentsPage({
  params,
  searchParams,
}: DocumentsPageProps) {
  const { id } = await params;
  const query = await searchParams;

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
    .select("id, name, organization_id")
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
        </div>
      </main>
    );
  }

  if (!project) {
    notFound();
  }

  const { data: documents, error: documentsError } = await supabase
    .from("documents")
    .select(`
      id,
      file_name,
      mime_type,
      file_size_bytes,
      document_type,
      document_date,
      description,
      processing_status,
      created_at
    `)
    .eq("project_id", project.id)
    .order("created_at", { ascending: false });

  const uploadAction = uploadDocument.bind(null, project.id);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/projects/${project.id}`}
          className="text-sm font-semibold text-slate-700 underline"
        >
          ← Back to {project.name}
        </Link>

        <header className="mt-6 rounded-xl bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Project documents
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Document library
          </h1>

          <p className="mt-3 text-slate-600">
            Upload private project PDFs. Text extraction and AI processing
            will be added in the next steps.
          </p>
        </header>

        {query.message && (
          <div className="mt-6 rounded-lg bg-green-100 p-4 text-sm text-green-800">
            {query.message}
          </div>
        )}

        {query.error && (
          <div className="mt-6 rounded-lg bg-red-100 p-4 text-sm text-red-800">
            {query.error}
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <section className="h-fit rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-950">
              Upload document
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              PDF only. Maximum file size: 6 MB.
            </p>

            <form action={uploadAction} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="file"
                  className="block text-sm font-medium text-slate-700"
                >
                  PDF file
                </label>

                <input
                  id="file"
                  name="file"
                  type="file"
                  accept="application/pdf,.pdf"
                  required
                  className="mt-2 block w-full text-sm text-slate-700"
                />
              </div>

              <div>
                <label
                  htmlFor="documentType"
                  className="block text-sm font-medium text-slate-700"
                >
                  Document type
                </label>

                <select
                  id="documentType"
                  name="documentType"
                  defaultValue="other"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950"
                >
                  <option value="contract">Contract</option>
                  <option value="drawing">Drawing</option>
                  <option value="specification">Specification</option>
                  <option value="proposal">Proposal</option>
                  <option value="field_order">Field Order</option>
                  <option value="change_order">Change Order</option>
                  <option value="rfi">RFI</option>
                  <option value="submittal">Submittal</option>
                  <option value="meeting_minutes">Meeting Minutes</option>
                  <option value="schedule">Schedule</option>
                  <option value="estimate">Estimate</option>
                  <option value="invoice">Invoice</option>
                  <option value="correspondence">Correspondence</option>
                  <option value="report">Report</option>
                  <option value="photo">Photo</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="documentDate"
                  className="block text-sm font-medium text-slate-700"
                >
                  Document date
                </label>

                <input
                  id="documentDate"
                  name="documentDate"
                  type="date"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950"
                />
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-slate-700"
                >
                  Description
                </label>

                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  placeholder="Optional description"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-950"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-lg bg-slate-950 px-4 py-3 font-semibold text-white hover:bg-slate-800"
              >
                Upload PDF
              </button>
            </form>
          </section>

          <section className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-950">
                  Uploaded documents
                </h2>

                <p className="mt-2 text-sm text-slate-600">
                  Files are stored in a private project bucket.
                </p>
              </div>

              <span className="text-sm font-semibold text-slate-500">
                {documents?.length ?? 0} document
                {(documents?.length ?? 0) === 1 ? "" : "s"}
              </span>
            </div>

            {documentsError && (
              <div className="mt-6 rounded-lg bg-red-100 p-4 text-sm text-red-800">
                Unable to load documents: {documentsError.message}
              </div>
            )}

            {!documentsError && documents?.length === 0 && (
              <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center">
                <h3 className="font-bold text-slate-950">
                  No documents uploaded
                </h3>

                <p className="mt-2 text-sm text-slate-600">
                  Upload the first PDF to begin building the project record.
                </p>
              </div>
            )}

            {!documentsError && documents && documents.length > 0 && (
              <div className="mt-6 space-y-4">
                {documents.map((document) => (
                  <article
                    key={document.id}
                    className="rounded-xl border border-slate-200 p-5"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-bold text-slate-950">
                          <Link
                            href={`/projects/${project.id}/documents/${document.id}`}
                            className="hover:underline"
                          >
                            {document.file_name}
                          </Link>
                        </h3>

                        <p className="mt-1 text-sm text-slate-600">
                          {formatLabel(document.document_type)} ·{" "}
                          {formatFileSize(
                            Number(document.file_size_bytes),
                          )}
                        </p>
                      </div>

                      <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {formatLabel(document.processing_status)}
                      </span>
                    </div>

                    {document.description && (
                      <p className="mt-4 text-sm leading-6 text-slate-600">
                        {document.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                      <span>
                        Uploaded{" "}
                        {new Intl.DateTimeFormat("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(new Date(document.created_at))}
                      </span>

                      {document.document_date && (
                        <span>
                          Document date{" "}
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            timeZone: "UTC",
                          }).format(
                            new Date(
                              `${document.document_date}T00:00:00Z`,
                            ),
                          )}
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/projects/${project.id}/documents/${document.id}`}
                      className="mt-5 inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                    >
                      View document
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}