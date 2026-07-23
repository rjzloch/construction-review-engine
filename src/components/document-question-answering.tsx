"use client";

import { FormEvent, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Citation = {
  pageNumber: number;
  excerpt?: string;
};

type QuestionResponse = {
  answer?: string;
  citations?: Citation[];
  error?: string;
};

type DocumentQuestionAnsweringProps = {
  projectId: string;
  documentId: string;
  processingStatus: string;
};

export default function DocumentQuestionAnswering({
  projectId,
  documentId,
  processingStatus,
}: DocumentQuestionAnsweringProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const documentIsReady = processingStatus === "completed";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || isLoading || !documentIsReady) {
      return;
    }

    setIsLoading(true);
    setError("");
    setAnswer("");
    setCitations([]);

    try {
      const response = await fetch(
        `/api/projects/${projectId}/documents/${documentId}/questions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            question: trimmedQuestion,
          }),
        },
      );

      const data = (await response.json()) as QuestionResponse;

      if (!response.ok) {
        throw new Error(
          data.error || "The document question could not be answered.",
        );
      }

      if (!data.answer) {
        throw new Error("The AI response did not contain an answer.");
      }

      setAnswer(data.answer);
      setCitations(Array.isArray(data.citations) ? data.citations : []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "An unexpected error occurred.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function openCitation(pageNumber: number) {
    const params = new URLSearchParams(searchParams.toString());

    params.set("page", String(pageNumber));

    const queryString = params.toString();

    router.push(queryString ? `${pathname}?${queryString}` : pathname);
  }

  return (
    <section className="mt-6 rounded-xl bg-white p-6 shadow-sm">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Document intelligence
        </p>

        <h2 className="mt-1 text-xl font-bold text-slate-950">
          Ask this document
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Ask a question about the uploaded document. The answer will be based
          on extracted document text and will include page citations when
          available.
        </p>
      </div>

      {!documentIsReady && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          This document must finish processing before AI questions can be
          answered. Current status:{" "}
          <span className="font-semibold">{processingStatus}</span>.
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5">
        <label
          htmlFor="document-question"
          className="block text-sm font-semibold text-slate-900"
        >
          Question
        </label>

        <textarea
          id="document-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Example: What are the contractor’s responsibilities and important deadlines?"
          rows={4}
          disabled={!documentIsReady || isLoading}
          className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={
              !documentIsReady || isLoading || question.trim().length === 0
            }
            className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isLoading ? "Analyzing document..." : "Ask question"}
          </button>

          {question && !isLoading && (
            <button
              type="button"
              onClick={() => {
                setQuestion("");
                setAnswer("");
                setCitations([]);
                setError("");
              }}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {answer && (
        <div className="mt-6 border-t border-slate-200 pt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Answer
          </h3>

          <div className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-800">
            {answer}
          </div>

          {citations.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-slate-900">
                Supporting pages
              </h3>

              <div className="mt-3 space-y-3">
                {citations.map((citation, index) => (
                  <button
                    key={`${citation.pageNumber}-${index}`}
                    type="button"
                    onClick={() => openCitation(citation.pageNumber)}
                    className="block w-full rounded-lg border border-slate-200 bg-slate-50 p-4 text-left hover:border-slate-300 hover:bg-slate-100"
                  >
                    <span className="text-sm font-bold text-slate-950">
                      Page {citation.pageNumber}
                    </span>

                    {citation.excerpt && (
                      <span className="mt-2 block text-sm leading-6 text-slate-600">
                        {citation.excerpt}
                      </span>
                    )}

                    <span className="mt-2 block text-xs font-semibold text-slate-500">
                      Open cited page →
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}