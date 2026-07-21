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

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function completeOnboarding(formData: FormData) {
  const fullName = getRequiredFormValue(formData, "fullName");
  const jobTitle = getRequiredFormValue(formData, "jobTitle");
  const organizationName = getRequiredFormValue(
    formData,
    "organizationName",
  );

  const slug = createSlug(organizationName);

  if (!slug) {
    redirect(
      "/onboarding?error=Please%20enter%20a%20valid%20organization%20name.",
    );
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      job_title: jobTitle,
      company_name: organizationName,
    })
    .eq("id", user.id);

  if (profileError) {
    redirect(
      `/onboarding?error=${encodeURIComponent(profileError.message)}`,
    );
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({
      name: organizationName,
      slug,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (organizationError || !organization) {
    const message =
      organizationError?.message ?? "Unable to create organization.";

    redirect(`/onboarding?error=${encodeURIComponent(message)}`);
  }

  const { error: membershipError } = await supabase
    .from("organization_memberships")
    .insert({
      organization_id: organization.id,
      user_id: user.id,
      role: "owner",
    });

  if (membershipError) {
    redirect(
      `/onboarding?error=${encodeURIComponent(membershipError.message)}`,
    );
  }

  redirect("/dashboard?message=Organization%20created%20successfully.");
}