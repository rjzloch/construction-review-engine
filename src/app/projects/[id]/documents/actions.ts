"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { processDocument } from "@/lib/documents/process-document";
import { createClient } from "@/lib/supabase/server";

const maximumFileSize = 6 * 1024 * 1024;

const allowedDocumentTypes = [
  "contract",
  "drawing",
  "specification",
  "proposal",
  "field_order",
  "change_order",
  "rfi",
  "submittal",
  "meeting_minutes",
  "schedule",
  "estimate",
  "invoice",
  "correspondence",
  "report",
  "photo",
  "other",
] as const;

function cleanFileName(fileName: string) {
  const lastPeriod = fileName.lastIndexOf(".");
  const rawName =
    lastPeriod > 0 ? fileName.slice(0, lastPeriod) : fileName;
  const extension =
    lastPeriod > 0 ? fileName.slice(lastPeriod).toLowerCase() : "";

  const safeName = rawName
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return `${safeName || "document"}${extension}`;
}

function getOptionalValue(formData: FormData, field: string) {
  const value = formData.get(field);

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}

export async function uploadDocument(
  projectId: string,
  formData: FormData,
) {
  const fileValue = formData.get("file");
  const documentTypeValue = formData.get("documentType");
  const documentDate = getOptionalValue(formData, "documentDate");
  const description = getOptionalValue(formData, "description");

  if (!(fileValue instanceof File) || fileValue.size === 0) {
    redirect(
      `/projects/${projectId}/documents?error=${encodeURIComponent(
        "Select a PDF to upload.",
      )}`,
    );
  }

  if (fileValue.type !== "application/pdf") {
    redirect(
      `/projects/${projectId}/documents?error=${encodeURIComponent(
        "Only PDF files are currently supported.",
      )}`,
    );
  }

  if (fileValue.size > maximumFileSize) {
    redirect(
      `/projects/${projectId}/documents?error=${encodeURIComponent(
        "The PDF must be 6 MB or smaller.",
      )}`,
    );
  }

  if (
    typeof documentTypeValue !== "string" ||
    !allowedDocumentTypes.includes(
      documentTypeValue as (typeof allowedDocumentTypes)[number],
    )
  ) {
    redirect(
      `/projects/${projectId}/documents?error=${encodeURIComponent(
        "Select a valid document type.",
      )}`,
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

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("id, organization_id")
    .eq("id", projectId)
    .maybeSingle();

  if (projectError || !project) {
    redirect(
      `/projects/${projectId}/documents?error=${encodeURIComponent(
        projectError?.message ??
          "Project not found or access was denied.",
      )}`,
    );
  }

  const documentId = randomUUID();
  const safeFileName = cleanFileName(fileValue.name);

  const storagePath = [
    project.organization_id,
    project.id,
    documentId,
    safeFileName,
  ].join("/");

  const fileBuffer = await fileValue.arrayBuffer();

  const { error: storageError } = await supabase.storage
    .from("project-documents")
    .upload(storagePath, fileBuffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (storageError) {
    redirect(
      `/projects/${projectId}/documents?error=${encodeURIComponent(
        storageError.message,
      )}`,
    );
  }

  const { error: metadataError } = await supabase
    .from("documents")
    .insert({
      id: documentId,
      organization_id: project.organization_id,
      project_id: project.id,
      file_name: fileValue.name,
      storage_path: storagePath,
      mime_type: fileValue.type,
      file_size_bytes: fileValue.size,
      document_type: documentTypeValue,
      document_date: documentDate,
      description,
      processing_status: "uploaded",
      uploaded_by: user.id,
    });

  if (metadataError) {
    await supabase.storage
      .from("project-documents")
      .remove([storagePath]);

    redirect(
      `/projects/${projectId}/documents?error=${encodeURIComponent(
        metadataError.message,
      )}`,
    );
  }

  const processingResult = await processDocument({
    documentId,
    projectId: project.id,
    organizationId: project.organization_id,
    storagePath,
  });

  revalidatePath(`/projects/${projectId}/documents`);

  if (!processingResult.success) {
    redirect(
      `/projects/${projectId}/documents?error=${encodeURIComponent(
        `The PDF was uploaded, but text extraction failed: ${
          processingResult.error ?? "Unknown processing error."
        }`,
      )}`,
    );
  }

  redirect(
    `/projects/${projectId}/documents?message=${encodeURIComponent(
      `${fileValue.name} uploaded and processed successfully.`,
    )}`,
  );
}