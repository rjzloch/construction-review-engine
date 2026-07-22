import { PDFParse } from "pdf-parse";

import { createClient } from "@/lib/supabase/server";

type ProcessDocumentInput = {
  documentId: string;
  projectId: string;
  organizationId: string;
  storagePath: string;
};

export async function processDocument({
  documentId,
  projectId,
  organizationId,
  storagePath,
}: ProcessDocumentInput) {
  const supabase = await createClient();
  let parser: PDFParse | null = null;

  try {
    const processingStartedAt = new Date().toISOString();

    const { error: processingUpdateError } = await supabase
      .from("documents")
      .update({
        processing_status: "processing",
        processing_started_at: processingStartedAt,
        processing_completed_at: null,
        processing_error: null,
      })
      .eq("id", documentId)
      .eq("project_id", projectId);

    if (processingUpdateError) {
      throw new Error(
        `Could not mark document as processing: ${processingUpdateError.message}`,
      );
    }

    const { data: pdfFile, error: downloadError } = await supabase.storage
      .from("project-documents")
      .download(storagePath);

    if (downloadError || !pdfFile) {
      throw new Error(
        `Could not download PDF: ${
          downloadError?.message ?? "No file was returned."
        }`,
      );
    }

    const pdfBuffer = await pdfFile.arrayBuffer();
    const pdfData = new Uint8Array(pdfBuffer);

    parser = new PDFParse({
      data: pdfData,
    });

    const documentInfo = await parser.getInfo();
    const pageCount = documentInfo.total;

    if (!pageCount || pageCount < 1) {
      throw new Error("The PDF does not contain any readable pages.");
    }

    const { error: deletePagesError } = await supabase
      .from("document_pages")
      .delete()
      .eq("document_id", documentId);

    if (deletePagesError) {
      throw new Error(
        `Could not clear previous page data: ${deletePagesError.message}`,
      );
    }

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const pageResult = await parser.getText({
        partial: [pageNumber],
      });

      const pageText = pageResult.text.trim();

      const { error: pageInsertError } = await supabase
        .from("document_pages")
        .insert({
          organization_id: organizationId,
          project_id: projectId,
          document_id: documentId,
          page_number: pageNumber,
          page_text: pageText,
          character_count: pageText.length,
        });

      if (pageInsertError) {
        throw new Error(
          `Could not save page ${pageNumber}: ${pageInsertError.message}`,
        );
      }
    }

    const { error: completedUpdateError } = await supabase
      .from("documents")
      .update({
        processing_status: "completed",
        page_count: pageCount,
        processing_completed_at: new Date().toISOString(),
        processing_error: null,
      })
      .eq("id", documentId)
      .eq("project_id", projectId);

    if (completedUpdateError) {
      throw new Error(
        `Could not mark document as completed: ${completedUpdateError.message}`,
      );
    }

    return {
      success: true,
      pageCount,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown processing error.";

    await supabase
      .from("documents")
      .update({
        processing_status: "failed",
        processing_completed_at: new Date().toISOString(),
        processing_error: message,
      })
      .eq("id", documentId)
      .eq("project_id", projectId);

    console.error(`Document processing failed for ${documentId}:`, error);

    return {
      success: false,
      pageCount: 0,
      error: message,
    };
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
}