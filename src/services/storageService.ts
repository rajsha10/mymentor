/**
 * PDF Storage Service — Cloudinary (raw resource type).
 *
 * IMPORTANT: For PDFs to be accessible via URL, you MUST enable
 * "Allow delivery of PDF and ZIP files" in:
 *   Cloudinary Console → Settings → Security
 *
 * Why `raw`?  Cloudinary's `image/upload` endpoint rejects or mishandles PDFs.
 * The `raw/upload` endpoint stores the file byte-for-byte and gives us a
 * permanent URL that browsers can open and download natively.
 *
 * Key decisions
 * ─────────────
 * • 10 MB limit — keeps classroom uploads reasonable on the free plan.
 * • Only PDFs — enforced both by MIME type and extension.
 * • Returns `secure_url` directly from Cloudinary's JSON response.
 * • The URL path will be `/raw/upload/...` — never `/image/upload/...`.
 * • Free tier: 25 GB storage + 25 GB bandwidth/month.
 */
export const uploadFile = async (
  file: File,
  folder: string = 'general'
): Promise<string> => {
  // ── 1. Validate environment ──────────────────────────────────────────
  const cloudName  = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Cloudinary configuration is missing. ' +
      'Set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.'
    );
  }

  // ── 2. Validate file ─────────────────────────────────────────────────
  const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
  if (file.size > MAX_SIZE) {
    throw new Error(
      `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). ` +
      `Please keep files under 10 MB.`
    );
  }

  const isPdf =
    file.name.toLowerCase().endsWith('.pdf') ||
    file.type === 'application/pdf';

  if (!isPdf) {
    throw new Error('Only PDF files are supported.');
  }

  // ── 3. Upload to Cloudinary as `raw` ─────────────────────────────────
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  // Place into a named folder for organization (materials, homework, etc.)
  formData.append('folder', folder);

  // CRITICAL: resource_type MUST be "raw" for PDFs.
  // Using "image" or "auto" causes 404s when the URL is opened.
  const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`;

  console.log(`>>> UPLOAD: Sending PDF to Cloudinary (raw) — ${file.name} (${(file.size / 1024).toFixed(0)} KB)`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Cloudinary upload error response:', errorData);
      throw new Error(
        errorData?.error?.message ||
        `Upload failed with status ${response.status}`
      );
    }

    const data = await response.json();
    const url = data.secure_url as string;

    console.log(`>>> UPLOAD SUCCESS: ${url}`);

    // Sanity-check: the URL must contain /raw/upload/ — never /image/upload/
    if (url.includes('/image/upload/')) {
      console.warn(
        '⚠ Cloudinary returned an image-type URL for a PDF. ' +
        'This should not happen when using the raw endpoint.'
      );
    }

    return url;
  } catch (error) {
    console.error('>>> UPLOAD FAILED:', error);
    throw error;
  }
};
