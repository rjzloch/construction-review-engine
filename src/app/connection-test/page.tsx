import { createClient } from "@/lib/supabase/server";

export default async function ConnectionTestPage() {
  const supabase = await createClient();

  const { error } = await supabase.auth.getUser();

  const isConnected =
    !error ||
    error.message.toLowerCase().includes("auth session missing");

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <section className="w-full max-w-xl rounded-xl bg-white p-8 shadow-lg">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          System Diagnostic
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-950">
          Supabase Connection
        </h1>

        <div
          className={`mt-6 rounded-lg p-4 font-medium ${
            isConnected
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {isConnected
            ? "Connected to Supabase successfully."
            : "Unable to connect to Supabase."}
        </div>

        {!isConnected && (
          <p className="mt-4 text-sm text-slate-600">
            Check the Terminal for the full connection error.
          </p>
        )}
      </section>
    </main>
  );
}