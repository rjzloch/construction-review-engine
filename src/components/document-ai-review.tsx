"use client";

import { useState } from "react";

type ReviewCitation = {
  page_number: number;
  quote: string;
};

type ReviewItem = {
  text: string;
  severity: "high" | "medium" | "low";
  citations: ReviewCitation[];
};

type ReviewQuestion = {
  question: string;
  reason: string;
  citations: ReviewCitation[];
};

type DocumentReview = {
  id: string;
  status: "processing" | "completed" | "failed";
  executive_summary: string;
  scope_summary: string;
  owner_decision_points: ReviewItem[];
  risks: ReviewItem[];
  missing_information: ReviewItem[];
  coordination_issues: ReviewItem[];
  potential_cost_drivers: ReviewItem[];
  potential_schedule_impacts: ReviewItem[];
  questions_for_team: ReviewQuestion[];
  recommended_actions: ReviewItem[];
  overall_confidence: "high" | "medium" | "low";
  error_message: string | null;
  created_at: string;
};

type DocumentAiReviewProps = {
  projectId: string;
  documentId: string;
  processingStatus: string;
  initialReview?: DocumentReview | null;
};

function severityLabel(severity: ReviewItem["severity"]) {
  if (severity === "high") {
    return "High";
  }

  if (severity === "medium") {
    return "Medium";
  }

  return "Low";
}

function CitationList({
  citations,
  projectId,
  documentId,
}: {
  citations: ReviewCitation[];
  projectId: string;
  documentId: string;
}) {
  if (citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {citations.map((citation, index) => (
        <a
          key={`${citation.page_number}-${index}`}
          href={`/projects/${projectId}/documents/${documentId}?page=${citation.page_number}`}
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          title={citation.quote}
        >
          Page {citation.page_number}
        </a>
      ))}
    </div>
  );
}

function ReviewItemList({
  items,
  projectId,
  documentId,
}: {
  items: ReviewItem[];
  projectId: string;
  documentId: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No supported items were identified.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <article
          key={`${item.text}-${index}`}
          className="rounded-lg border border-slate-200 bg-slate-50 p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="leading-7 text-slate-800">{item.text}</p>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-600">
              {severityLabel(item.severity)}
            </span>
          </div>

          <CitationList
            citations={item.citations}
            projectId={projectId}
            documentId={documentId}
          />
        </article>
      ))}
    </div>
  );
}

function ReviewSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="text-lg font-bold text-slate-950">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function DocumentAiReview({
  projectId,
  documentId,
  processingStatus,
  initialReview = null,
}: DocumentAiReviewProps) {
  const [review, setReview] = useState<DocumentReview | null>(
    initialReview,
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");

  const canGenerate = processingStatus === "completed";

  async function generateReview() {
    setIsGenerating(true);
    setError("");

    try {
      const response = await fetch(
        `/projects/${projectId}/documents/${documentId}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const result = (await response.json()) as {
        review?: DocumentReview;
        error?: string;
      };

      if (!response.ok || !result.review) {
        throw new Error(
          result.error ?? "The AI review could not be generated.",
        );
      }

      setReview(result.review);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The AI review could not be generated.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Construction intelligence
          </p>

          <h2 className="mt-1 text-2xl font-bold text-slate-950">
            Automatic AI Review
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Generate an owner-side review covering scope, decisions,
            risks, cost drivers, schedule impacts, coordination issues,
            questions, and recommended actions.
          </p>
        </div>

        <button
          type="button"
          onClick={generateReview}
          disabled={!canGenerate || isGenerating}
          className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isGenerating
            ? "Reviewing document..."
            : review
              ? "Run review again"
              : "Run AI review"}
        </button>
      </div>

      {!canGenerate && (
        <div className="mt-5 rounded-lg bg-amber-100 p-4 text-sm text-amber-900">
          Document text processing must finish before an AI review can
          be generated.
        </div>
      )}

      {error && (
        <div className="mt-5 rounded-lg bg-red-100 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {!review && !error && (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="font-semibold text-slate-800">
            No AI review has been generated yet.
          </p>

          <p className="mt-2 text-sm text-slate-600">
            Run the review to create structured construction insights
            from this document.
          </p>
        </div>
      )}

      {review && (
        <div className="mt-6 space-y-5">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
              Status: {review.status}
            </span>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-slate-700">
              Confidence: {review.overall_confidence}
            </span>
          </div>

          <ReviewSection title="Executive Summary">
            <p className="whitespace-pre-wrap leading-7 text-slate-800">
              {review.executive_summary ||
                "No executive summary was produced."}
            </p>
          </ReviewSection>

          <ReviewSection title="Scope of Work">
            <p className="whitespace-pre-wrap leading-7 text-slate-800">
              {review.scope_summary || "No scope summary was produced."}
            </p>
          </ReviewSection>

          <ReviewSection title="Owner Decision Points">
            <ReviewItemList
              items={review.owner_decision_points}
              projectId={projectId}
              documentId={documentId}
            />
          </ReviewSection>

          <ReviewSection title="Risks">
            <ReviewItemList
              items={review.risks}
              projectId={projectId}
              documentId={documentId}
            />
          </ReviewSection>

          <ReviewSection title="Missing Information">
            <ReviewItemList
              items={review.missing_information}
              projectId={projectId}
              documentId={documentId}
            />
          </ReviewSection>

          <ReviewSection title="Coordination Issues">
            <ReviewItemList
              items={review.coordination_issues}
              projectId={projectId}
              documentId={documentId}
            />
          </ReviewSection>

          <ReviewSection title="Potential Cost Drivers">
            <ReviewItemList
              items={review.potential_cost_drivers}
              projectId={projectId}
              documentId={documentId}
            />
          </ReviewSection>

          <ReviewSection title="Potential Schedule Impacts">
            <ReviewItemList
              items={review.potential_schedule_impacts}
              projectId={projectId}
              documentId={documentId}
            />
          </ReviewSection>

          <ReviewSection title="Questions for the Project Team">
            {review.questions_for_team.length === 0 ? (
              <p className="text-sm text-slate-500">
                No supported questions were identified.
              </p>
            ) : (
              <div className="space-y-4">
                {review.questions_for_team.map((item, index) => (
                  <article
                    key={`${item.question}-${index}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-semibold leading-7 text-slate-950">
                      {item.question}
                    </p>

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {item.reason}
                    </p>

                    <CitationList
                      citations={item.citations}
                      projectId={projectId}
                      documentId={documentId}
                    />
                  </article>
                ))}
              </div>
            )}
          </ReviewSection>

          <ReviewSection title="Recommended Next Actions">
            <ReviewItemList
              items={review.recommended_actions}
              projectId={projectId}
              documentId={documentId}
            />
          </ReviewSection>
        </div>
      )}
    </section>
  );
}