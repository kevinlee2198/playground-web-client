import type { UploadHeader } from "@/lib/types/resource";

/**
 * Upload a file directly to S3 via a presigned PUT URL.
 * This runs client-side since file bytes are in the browser.
 * The server's upload headers are sent verbatim; they are part of the signature.
 */
export async function uploadToS3(
  file: File,
  uploadUrl: string,
  uploadHeaders: UploadHeader[],
): Promise<{ success: boolean }> {
  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: Object.fromEntries(uploadHeaders.map((h) => [h.name, h.value])),
    });

    // 412: the write-once URL already holds an object (our retried PUT, or someone else's).
    // Treat as uploaded; confirm verifies the stored bytes.
    if (!response.ok && response.status !== 412) {
      return { success: false };
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}
