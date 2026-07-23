"use client";

import { useState } from "react";

type MetadataReference = {
  value: string;
  page_numbers: number[];
};

type DateReference = {
  date: string;
  description: string;
  page_numbers: number[];
};

type DocumentMetadata = {
  id: string;
  status: "pending" | "processing" | "completed" | "failed";
  document_category: string | null;
  document_title: string | null;
  document_number: string | null;
  revision: string | null;
  document_date: string | null;
  discipline: string | null;
  companies: MetadataReference[];
  people: MetadataReference[];
  drawing_references: MetadataReference[];
  specification_sections: MetadataReference[];
  equipment: MetadataReference[];
  building_systems: MetadataReference[];
  locations: MetadataReference[];
  key_dates: DateReference[];
  contract_references: MetadataReference[];
  overall_confidence: "high" | "medium" | "low" | null;
  error_message: string | null;
};

type DocumentMetadataProps = {
  projectId: string;
  documentId: string;
  processingStatus: string;
  initialMetadata?: DocumentMetadata | null;
};

function formatLabel(value: string | null) {
  if (!value) {
    return "Not identified";
  }

  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function PageLinks({
  pageNumbers,
  projectId,
  documentId,
}: {
  pageNumbers: number[];
  projectId: string;
  documentId: string;
}) {
  if (pageNumbers.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {pageNumbers.map((pageNumber) => (
        <a
          key={pageNumber}
          href={`/projects/${projectId}/documents/${documentId}?page=${pageNumber}`}
          className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Page {pageNumber}
        </a>
      ))}
    </div>
  );
}

function ReferenceSection({
  title,
  items,
  projectId,
  documentId,
}: {
  title: string;
  items: MetadataReference[];
  projectId: string;
  documentId: string;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold text-slate-950">{title}</h3>

      {items.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">
          None identified.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item, index) => (
            <article
              key={`${item.value}-${index}`}
              className="rounded-lg bg-slate-50 p-4"
            >
              <p className="font-medium text-slate-900">
                {item.value}
              </p>

              <PageLinks
                pageNumbers={item.page_numbers}
                projectId={projectId}
                documentId={documentId}
              />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default function DocumentMetadataPanel({
  projectId,
  documentId,
  processingStatus,
  initialMetadata = null,
}: DocumentMetadataProps) {
  const [metadata, setMetadata] =
    useState<DocumentMetadata | null>(initialMetadata);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState("");

  const canExtract = processingStatus === "completed";

  async function extractMetadata() {
    setIsExtracting(true);
    setError("");

    try {
      const response = await fetch(
        `/projects/${projectId}/documents/${documentId}/metadata`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const result = (await response.json()) as {
        metadata?: DocumentMetadata;
        error?: string;
      };

      if (!response.ok || !result.metadata) {
        throw new Error(
          result.error ?? "Metadata could not be extracted.",
        );
      }

      setMetadata(result.metadata);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Metadata could not be extracted.",
      );
    } finally {
      setIsExtracting(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Document intelligence
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-950">
            Construction Metadata
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Classify the document and identify its discipline,
            references, companies, equipment, systems, locations, and
            key dates.
          </p>
        </div>

        <button
          type="button"
          onClick={extractMetadata}
          disabled={!canExtract || isExtracting}
          className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isExtracting
            ? "Extracting metadata..."
            : metadata
              ? "Extract again"
              : "Extract metadata"}
        </button>
      </div>

      {!canExtract && (
        <div className="mt-5 rounded-lg bg-amber-100 p-4 text-sm text-amber-900">
          Document processing must finish before metadata can be
          extracted.
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-lg bg-red-100 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {!metadata && !error && (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-semibold text-slate-800">
            No metadata has been extracted yet.
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Extract metadata to classify and organize this document.
          </p>
        </div>
      )}

      {metadata && (
        <div className="mt-6 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Category
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                {formatLabel(metadata.document_category)}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Discipline
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                {formatLabel(metadata.discipline)}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Document number
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                {metadata.document_number || "Not identified"}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Confidence
              </p>
              <p className="mt-2 font-semibold text-slate-900">
                {formatLabel(metadata.overall_confidence)}
              </p>
            </div>
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold text-slate-950">
              Document identity
            </h3>

            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-semibold text-slate-500">
                  Title
                </dt>
                <dd className="mt-1 text-slate-900">
                  {metadata.document_title || "Not identified"}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-semibold text-slate-500">
                  Revision
                </dt>
                <dd className="mt-1 text-slate-900">
                  {metadata.revision || "Not identified"}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-semibold text-slate-500">
                  Document date
                </dt>
                <dd className="mt-1 text-slate-900">
                  {metadata.document_date || "Not identified"}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-semibold text-slate-500">
                  Status
                </dt>
                <dd className="mt-1 text-slate-900">
                  {formatLabel(metadata.status)}
                </dd>
              </div>
            </dl>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <ReferenceSection
              title="Companies"
              items={metadata.companies}
              projectId={projectId}
              documentId={documentId}
            />

            <ReferenceSection
              title="People"
              items={metadata.people}
              projectId={projectId}
              documentId={documentId}
            />

            <ReferenceSection
              title="Drawing References"
              items={metadata.drawing_references}
              projectId={projectId}
              documentId={documentId}
            />

            <ReferenceSection
              title="Specification Sections"
              items={metadata.specification_sections}
              projectId={projectId}
              documentId={documentId}
            />

            <ReferenceSection
              title="Equipment"
              items={metadata.equipment}
              projectId={projectId}
              documentId={documentId}
            />

            <ReferenceSection
              title="Building Systems"
              items={metadata.building_systems}
              projectId={projectId}
              documentId={documentId}
            />

            <ReferenceSection
              title="Locations and Areas"
              items={metadata.locations}
              projectId={projectId}
              documentId={documentId}
            />

            <ReferenceSection
              title="Contract References"
              items={metadata.contract_references}
              projectId={projectId}
              documentId={documentId}
            />
          </div>

          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold text-slate-950">Key Dates</h3>

            {metadata.key_dates.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">
                No key dates were identified.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {metadata.key_dates.map((item, index) => (
                  <article
                    key={`${item.date}-${item.description}-${index}`}
                    className="rounded-lg bg-slate-50 p-4"
                  >
                    <p className="font-semibold text-slate-900">
                      {item.date || "Date not normalized"}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {item.description}
                    </p>

                    <PageLinks
                      pageNumbers={item.page_numbers}
                      projectId={projectId}
                      documentId={documentId}
                    />
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}