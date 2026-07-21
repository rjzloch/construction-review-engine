import Link from "next/link";

export default function ProjectNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-lg rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Construction Review Engine
        </p>

        <h1 className="mt-3 text-3xl font-bold text-slate-950">
          Project not found
        </h1>

        <p className="mt-3 text-slate-600">
          The project does not exist, or your account does not have
          permission to access it.
        </p>

        <Link
          href="/dashboard"
          className="mt-6 inline-block rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white hover:bg-slate-800"
        >
          Return to dashboard
        </Link>
      </section>
    </main>
  );
}