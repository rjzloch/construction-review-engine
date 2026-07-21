"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getRequiredFormValue(formData: FormData, field: string) {
  const value = formData.get(field);

  if (typeof value !== "string" || value.trim() === "") {
    redirect(
      `/projects/new?error=${encodeURIComponent(
        `${field} is required.`,
      )}`,
    );
  }

  return value.trim();
}

function getOptionalFormValue(formData: FormData, field: string) {
  const value = formData.get(field);

  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue === "" ? null : trimmedValue;
}

const allowedPhases = [
  "planning",
  "design",
  "procurement",
  "construction",
  "closeout",
  "warranty",
  "complete",
] as const;

const allowedStatuses = [
  "active",
  "on_hold",
  "complete",
  "cancelled",
  "archived",
] as const;

export async function createProject(formData: FormData) {
  const name = getRequiredFormValue(formData, "name");
  const projectNumber = getOptionalFormValue(formData, "projectNumber");
  const ownerName = getOptionalFormValue(formData, "ownerName");
  const location = getOptionalFormValue(formData, "location");
  const projectType = getOptionalFormValue(formData, "projectType");
  const contractType = getOptionalFormValue(formData, "contractType");
  const generalContractor = getOptionalFormValue(
    formData,
    "generalContractor",
  );
  const architectEngineer = getOptionalFormValue(
    formData,
    "architectEngineer",
  );
  const noticeToProceed = getOptionalFormValue(
    formData,
    "noticeToProceed",
  );
  const contractCompletionDate = getOptionalFormValue(
    formData,
    "contractCompletionDate",
  );

  const phaseValue = getRequiredFormValue(formData, "phase");
  const statusValue = getRequiredFormValue(formData, "status");

  if (
    !allowedPhases.includes(
      phaseValue as (typeof allowedPhases)[number],
    )
  ) {
    redirect("/projects/new?error=Invalid%20project%20phase.");
  }

  if (
    !allowedStatuses.includes(
      statusValue as (typeof allowedStatuses)[number],
    )
  ) {
    redirect("/projects/new?error=Invalid%20project%20status.");
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/auth/login");
  }

  const { data: membership, error: membershipError } = await supabase
    .from("organization_memberships")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    redirect(
      `/projects/new?error=${encodeURIComponent(
        membershipError.message,
      )}`,
    );
  }

  if (!membership) {
    redirect("/onboarding");
  }

  if (!["owner", "admin", "member"].includes(membership.role)) {
    redirect(
      "/dashboard?error=Your%20role%20does%20not%20allow%20project%20creation.",
    );
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      organization_id: membership.organization_id,
      name,
      project_number: projectNumber,
      owner_name: ownerName,
      location,
      project_type: projectType,
      phase: phaseValue,
      status: statusValue,
      contract_type: contractType,
      general_contractor: generalContractor,
      architect_engineer: architectEngineer,
      notice_to_proceed: noticeToProceed,
      contract_completion_date: contractCompletionDate,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (projectError || !project) {
    const message =
      projectError?.message ?? "Unable to create the project.";

    redirect(`/projects/new?error=${encodeURIComponent(message)}`);
  }

  redirect(
    `/dashboard?message=${encodeURIComponent(
      `${name} was created successfully.`,
    )}`,
  );
}