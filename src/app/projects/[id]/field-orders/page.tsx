import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type FieldOrdersPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function FieldOrdersPage({
  params,
}: FieldOrdersPageProps) {
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
            Change intelligence
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-950">
            Field Orders
          </h1>

          <p className="mt-3 text-slate-600">
            Field Order intake, evidence gathering, issue identification,
            and structured review will be added after document ingestion.
          </p>
        </section>
      </div>
    </main>
  );
}