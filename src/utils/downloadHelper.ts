/**
 * Universal PDF download & open helpers.
 *
 * Handles all URL types:
 *  1. Cloudinary `/raw/upload/...` — correct format for PDFs
 *  2. Cloudinary `/image/upload/...` — legacy/broken; patched on the fly
 *  3. Data URLs (`data:application/pdf;base64,...`) — old Firestore-encoded PDFs
 *  4. Any other URL (Google Drive, external links, etc.)
 */

/**
 * Fix any legacy Cloudinary `/image/upload/` → `/raw/upload/`
 */
const fixCloudinaryUrl = (url: string): string => {
  if (url.includes('cloudinary.com') && url.includes('/image/upload/')) {
    return url.replace('/image/upload/', '/raw/upload/');
  }
  return url;
};

/**
 * Opens a PDF for in-browser viewing in a new tab.
 */
export const openFile = (url: string) => {
  if (!url) return;

  if (url.startsWith('data:')) {
    // Data URLs: open directly in a new tab
    const win = window.open();
    if (win) {
      win.document.write(
        `<iframe src="${url}" style="width:100%;height:100%;border:none;position:absolute;top:0;left:0;" title="PDF Viewer"></iframe>`
      );
      win.document.title = 'PDF Viewer';
    }
    return;
  }

  window.open(fixCloudinaryUrl(url), '_blank');
};

/**
 * Downloads a PDF file to the user's local machine.
 *
 * Strategy:
 *  1. For data URLs → direct anchor click (no fetch needed)
 *  2. For Cloudinary/external URLs → try fetch-blob (gives filename control)
 *  3. If fetch fails (CORS) → fallback to anchor with direct URL
 */
export const downloadFile = async (url: string, fileName: string) => {
  if (!url) {
    console.error('downloadFile: No URL provided');
    return;
  }

  // Normalise the filename
  const safeName = fileName.toLowerCase().endsWith('.pdf')
    ? fileName
    : `${fileName}.pdf`;

  // ── CASE A: Data URL (base64-encoded PDF from Firestore) ─────────────
  if (url.startsWith('data:')) {
    triggerDownload(url, safeName);
    return;
  }

  // ── CASE B: Normal URL (Cloudinary, etc.) ────────────────────────────
  const fixedUrl = fixCloudinaryUrl(url);

  try {
    // Try fetch → blob for filename control
    const response = await fetch(fixedUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    triggerDownload(blobUrl, safeName);
    // Clean up after a short delay to ensure download starts
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
  } catch {
    // Fetch failed (likely CORS). Use direct anchor download.
    // This opens the file but also triggers download in most browsers.
    console.warn('downloadFile: fetch failed (CORS?), using direct anchor fallback');
    triggerDownload(fixedUrl, safeName);
  }
};

/**
 * Internal: create an anchor element and trigger a click to download.
 */
const triggerDownload = (href: string, fileName: string) => {
  const link = document.createElement('a');
  link.href = href;
  link.download = fileName;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
