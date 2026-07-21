export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100">
      <div className="rounded-xl bg-white p-10 shadow-xl">
        <h1 className="text-4xl font-bold">
          Construction Review Engine
        </h1>

        <p className="mt-4 text-slate-600">
          AI-powered construction intelligence for owner-side project management.
        </p>

        <div className="mt-6 rounded bg-slate-900 p-4 font-mono text-green-400">
          System Status: Online
        </div>
      </div>
    </main>
  );
}