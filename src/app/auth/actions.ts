"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getRequiredFormValue(formData: FormData, field: string) {
  const value = formData.get(field);

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

export async function signUp(formData: FormData) {
  const email = getRequiredFormValue(formData, "email").toLowerCase();
  const password = getRequiredFormValue(formData, "password");

  if (password.length < 8) {
    redirect(
      "/auth/sign-up?error=Password%20must%20contain%20at%20least%208%20characters.",
    );
  }

  const supabase = await createClient();

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });

  if (error) {
    redirect(`/auth/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    "/auth/sign-up?message=Check%20your%20email%20to%20confirm%20your%20account.",
  );
}

export async function signIn(formData: FormData) {
  const email = getRequiredFormValue(formData, "email").toLowerCase();
  const password = getRequiredFormValue(formData, "password");

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/auth/login");
}