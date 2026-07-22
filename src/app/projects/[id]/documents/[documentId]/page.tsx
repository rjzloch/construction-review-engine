import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DocumentDetailPageProps = {
  params: Promise<{
    id: string;
    documentId: string;
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

export default async function DocumentDetailPage({
  params,
}: DocumentDetailPageProps) {
  const { id, documentId } = await params;

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

  if (projectError || !project) {
    notFound();
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select(`
      id,
      project_id,
      organization_id,
      file_name,
      storage_path,
      mime_type,
      file_size_bytes,
      document_type,
      document_date,
      description,
      processing_status,
      created_at
    `)
    .eq("id", documentId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (documentError || !document) {
    notFound();
  }

  const [
    { data: previewData, error: previewError },
    { data: downloadData, error: downloadError },
  ] = await Promise.all([
    supabase.storage
      .from("project-documents")
      .createSignedUrl(document.storage_path, 60 * 60),
    supabase.storage
      .from("project-documents")
      .createSignedUrl(document.storage_path, 60 * 60, {
        download: document.file_name,
      }),
  ]);

  const previewUrl = previewData?.signedUrl;
  const downloadUrl = downloadData?.signedUrl;

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <Link
          href={`/projects/${project.id}/documents`}
          className="text-sm font-semibold text-slate-700 underline"
        >
          ← Back to document library
        </Link>

        <header className="mt-6 rounded-xl bg-white p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {project.name}
              </p>

              <h1 className="mt-2 break-words text-3xl font-bold text-slate-950">
                {document.file_name}
              </h1>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {formatLabel(document.document_type)}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {formatFileSize(Number(document.file_size_bytes))}
                </span>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {formatLabel(document.processing_status)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {previewUrl && (
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Open in new tab
                </a>
              )}

              {downloadUrl && (
                <a
                  href={downloadUrl}
                  className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Download PDF
                </a>
              )}
            </div>
          </div>

          {document.description && (
            <p className="mt-6 max-w-3xl leading-7 text-slate-600">
              {document.description}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
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
                  new Date(`${document.document_date}T00:00:00Z`),
                )}
              </span>
            )}
          </div>
        </header>

        {(previewError || downloadError) && (
          <div className="mt-6 rounded-lg bg-red-100 p-4 text-sm text-red-800">
            The private PDF link could not be created.{" "}
            {previewError?.message ?? downloadError?.message}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="border-b border-slate-200 px-6 py-4">
            <h2 className="text-lg font-bold text-slate-950">
              PDF preview
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              This temporary private preview expires after one hour.
            </p>
          </div>

          {previewUrl ? (
            <iframe
              src={previewUrl}
              title={`Preview of ${document.file_name}`}
              className="h-[78vh] min-h-[650px] w-full"
            />
          ) : (
            <div className="p-10 text-center">
              <h2 className="font-bold text-slate-950">
                Preview unavailable
              </h2>

              <p className="mt-2 text-sm text-slate-600">
                Return to the document library and try opening the file
                again.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}