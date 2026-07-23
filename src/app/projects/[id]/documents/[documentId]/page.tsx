import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import DocumentAiReview from "@/components/document-ai-review";
import DocumentMetadataPanel from "@/components/document-metadata";
import DocumentQuestionAnswering from "@/components/document-question-answering";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type DocumentDetailPageProps = {
  params: Promise<{
    id: string;
    documentId: string;
  }>;
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
};

type DocumentPage = {
  id: string;
  page_number: number;
  page_text: string | null;
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

function getSelectedPage(value: string | undefined, pageCount: number) {
  const parsedPage = Number.parseInt(value ?? "1", 10);

  if (!Number.isFinite(parsedPage) || parsedPage < 1) {
    return 1;
  }

  if (pageCount > 0 && parsedPage > pageCount) {
    return pageCount;
  }

  return parsedPage;
}

function getTextPreview(text: string | null, query: string) {
  if (!text) {
    return "No extracted text is available for this page.";
  }

  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    const preview = text.slice(0, 500);
    return text.length > 500 ? `${preview}…` : preview;
  }

  const lowercaseText = text.toLowerCase();
  const lowercaseQuery = trimmedQuery.toLowerCase();
  const matchIndex = lowercaseText.indexOf(lowercaseQuery);

  if (matchIndex === -1) {
    const preview = text.slice(0, 500);
    return text.length > 500 ? `${preview}…` : preview;
  }

  const previewStart = Math.max(0, matchIndex - 180);
  const previewEnd = Math.min(
    text.length,
    matchIndex + trimmedQuery.length + 320,
  );

  const prefix = previewStart > 0 ? "…" : "";
  const suffix = previewEnd < text.length ? "…" : "";

  return `${prefix}${text.slice(previewStart, previewEnd)}${suffix}`;
}

export default async function DocumentDetailPage({
  params,
  searchParams,
}: DocumentDetailPageProps) {
  const { id, documentId } = await params;
  const resolvedSearchParams = await searchParams;
  const searchQuery = resolvedSearchParams.q?.trim() ?? "";

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
      page_count,
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
    { data: documentPages, error: pagesError },
    { data: latestReview, error: reviewError },
    { data: latestMetadata, error: metadataError },
  ] = await Promise.all([
    supabase.storage
      .from("project-documents")
      .createSignedUrl(document.storage_path, 60 * 60),

    supabase.storage
      .from("project-documents")
      .createSignedUrl(document.storage_path, 60 * 60, {
        download: document.file_name,
      }),

    supabase
      .from("document_pages")
      .select("id, page_number, page_text")
      .eq("document_id", document.id)
      .order("page_number", { ascending: true }),

    supabase
      .from("document_reviews")
      .select("*")
      .eq("document_id", document.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),

    supabase
      .from("document_metadata")
      .select("*")
      .eq("document_id", document.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const previewUrl = previewData?.signedUrl;
  const downloadUrl = downloadData?.signedUrl;

  const pageCount = Number(document.page_count ?? 0);

  const selectedPage = getSelectedPage(
    resolvedSearchParams.page,
    pageCount,
  );

  const allDocumentPages = (documentPages ?? []) as DocumentPage[];

  const visibleDocumentPages = searchQuery
    ? allDocumentPages.filter((documentPage) =>
        documentPage.page_text
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()),
      )
    : allDocumentPages;

  const selectedPageData =
    allDocumentPages.find(
      (documentPage) => documentPage.page_number === selectedPage,
    ) ?? null;

  const previewUrlWithPage = previewUrl
    ? `${previewUrl}#page=${selectedPage}`
    : undefined;

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

                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {pageCount} {pageCount === 1 ? "page" : "pages"}
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

        <DocumentQuestionAnswering
          projectId={project.id}
          documentId={document.id}
          processingStatus={document.processing_status}
        />

        <DocumentAiReview
          projectId={project.id}
          documentId={document.id}
          processingStatus={document.processing_status}
          initialReview={latestReview}
        />

        <DocumentMetadataPanel
          projectId={project.id}
          documentId={document.id}
          processingStatus={document.processing_status}
          initialMetadata={latestMetadata}
        />

        {(previewError || downloadError) && (
          <div className="mt-6 rounded-lg bg-red-100 p-4 text-sm text-red-800">
            The private PDF link could not be created.{" "}
            {previewError?.message ?? downloadError?.message}
          </div>
        )}

        {pagesError && (
          <div className="mt-6 rounded-lg bg-red-100 p-4 text-sm text-red-800">
            The extracted document text could not be loaded.{" "}
            {pagesError.message}
          </div>
        )}

        {reviewError && (
          <div className="mt-6 rounded-lg bg-red-100 p-4 text-sm text-red-800">
            The latest AI review could not be loaded.{" "}
            {reviewError.message}
          </div>
        )}

        {metadataError && (
          <div className="mt-6 rounded-lg bg-red-100 p-4 text-sm text-red-800">
            The latest document metadata could not be loaded.{" "}
            {metadataError.message}
          </div>
        )}

        <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor="document-search"
                className="block text-sm font-semibold text-slate-900"
              >
                Search extracted text
              </label>

              <input
                id="document-search"
                name="q"
                type="search"
                defaultValue={searchQuery}
                placeholder="Search contract terms, dates, field conditions..."
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-950 outline-none focus:border-slate-500"
              />
            </div>

            <button
              type="submit"
              className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Search document
            </button>

            {searchQuery && (
              <Link
                href={`/projects/${project.id}/documents/${document.id}`}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Clear
              </Link>
            )}
          </form>

          {searchQuery && !pagesError && (
            <p className="mt-4 text-sm text-slate-600">
              Found {visibleDocumentPages.length} matching{" "}
              {visibleDocumentPages.length === 1 ? "page" : "pages"} for{" "}
              <span className="font-semibold text-slate-950">
                “{searchQuery}”
              </span>
              .
            </p>
          )}
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,0.75fr)]">
          <section className="overflow-hidden rounded-xl bg-white shadow-sm">
            <div className="border-b border-slate-200 px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    PDF preview
                  </h2>

                  <p className="mt-1 text-sm text-slate-600">
                    Viewing page {selectedPage} of {pageCount || "unknown"}.
                  </p>
                </div>

                <div className="flex gap-2">
                  {selectedPage > 1 && (
                    <Link
                      href={{
                        pathname: `/projects/${project.id}/documents/${document.id}`,
                        query: {
                          ...(searchQuery ? { q: searchQuery } : {}),
                          page: selectedPage - 1,
                        },
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Previous
                    </Link>
                  )}

                  {pageCount > 0 && selectedPage < pageCount && (
                    <Link
                      href={{
                        pathname: `/projects/${project.id}/documents/${document.id}`,
                        query: {
                          ...(searchQuery ? { q: searchQuery } : {}),
                          page: selectedPage + 1,
                        },
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {previewUrlWithPage ? (
              <iframe
                key={previewUrlWithPage}
                src={previewUrlWithPage}
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

          <aside className="rounded-xl bg-white shadow-sm">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-bold text-slate-950">
                {searchQuery ? "Matching pages" : "Extracted pages"}
              </h2>

              <p className="mt-1 text-sm text-slate-600">
                Select a page to review it beside the original PDF.
              </p>
            </div>

            <div className="max-h-[78vh] overflow-y-auto p-4">
              {visibleDocumentPages.length > 0 ? (
                <div className="space-y-3">
                  {visibleDocumentPages.map((documentPage) => {
                    const isSelected =
                      documentPage.page_number === selectedPage;

                    return (
                      <Link
                        key={documentPage.id}
                        href={{
                          pathname: `/projects/${project.id}/documents/${document.id}`,
                          query: {
                            ...(searchQuery ? { q: searchQuery } : {}),
                            page: documentPage.page_number,
                          },
                        }}
                        className={`block rounded-lg border p-4 transition ${
                          isSelected
                            ? "border-slate-950 bg-slate-100"
                            : "border-slate-200 hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        <p className="text-sm font-bold text-slate-950">
                          Page {documentPage.page_number}
                        </p>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {getTextPreview(
                            documentPage.page_text,
                            searchQuery,
                          )}
                        </p>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
                  <p className="font-semibold text-slate-900">
                    {searchQuery
                      ? "No matching pages found"
                      : "No extracted pages found"}
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {searchQuery
                      ? "Try a shorter word, different wording, or clear the search."
                      : "Confirm that document processing completed successfully."}
                  </p>
                </div>
              )}
            </div>
          </aside>
        </div>

        <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-950">
            Full extracted text — Page {selectedPage}
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Compare extracted text against the original PDF before relying
            on it for a project decision.
          </p>

          <pre className="mt-5 max-h-[600px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-5 text-sm leading-7 text-slate-100">
            {selectedPageData?.page_text ||
              "No extracted text is available for this page."}
          </pre>
        </section>
      </div>
    </main>
  );
}