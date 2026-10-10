// Shared file viewer helper — opens a file in a new browser window using a
// dedicated server-side viewer API route.
//
// Instead of opening about:blank and using document.write() (which was
// unreliable and caused 404 errors), we open a real URL:
//   /api/files/view?fileId=<DriveFile.id>
//
// The server-side route returns a complete HTML page that embeds the file
// using the correct method based on mime type (img, iframe, Google Docs
// Viewer, etc.) with download/screenshot protections.

interface FileViewerOptions {
  fileId: string     // DriveFile.id
  filePath: string   // public URL path (kept for backward compat)
  fileName: string
  mimeType: string
}

export function openFileViewer({ fileId }: FileViewerOptions) {
  // Open the server-side viewer route in a new tab.
  // The route returns a complete HTML page with the file embedded.
  const viewerUrl = `/api/files/view?fileId=${encodeURIComponent(fileId)}`
  window.open(viewerUrl, '_blank', 'width=1024,height=768')
}
