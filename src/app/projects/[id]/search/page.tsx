import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type SearchPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function SearchPage({
  params,
}: SearchPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <Link
          href={`/projects/${id}`}
          className="text-sm font-semibold text-slate-700 underline"
        >
          ← Back to project
        </Link>

        <section className="mt-6 rounded-xl bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Project intelligence
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Project search
          </h1>

          <p className="mt-3 text-slate-600">
            Citation-backed keyword and AI search will be added after
            document text is stored and indexed.
          </p>
        </section>
      </div>
    </main>
  );
}