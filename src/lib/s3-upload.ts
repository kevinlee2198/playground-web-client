/**
 * Upload a file directly to S3 via a presigned PUT URL.
 * This runs client-side since file bytes are in the browser.
 */
export async function uploadToS3(
  file: File,
  uploadUrl: string,
): Promise<{ success: boolean }> {
  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!response.ok) {
      return { success: false };
    }

    return { success: true };
  } catch {
    return { success: false };
  }
}
