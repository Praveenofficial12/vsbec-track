import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { existsSync } from 'fs'
import path from 'path'

// Helper: format file size in human-readable format
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// GET: Serve a file viewer HTML page that embeds the file inline.
// Query params: fileId=<DriveFile id>
//
// This endpoint returns a complete HTML page that renders the file in the
// browser using the appropriate method based on file type:
//   - Images: <img>
//   - PDFs: <iframe> (browser built-in PDF viewer)
//   - Office files: served via /api/files/serve in an <iframe> — the browser
//     will either render it natively or prompt to download
//   - Text files: fetched and displayed in <pre>
//
// IMPORTANT: All file URLs use the /api/files/serve route (not /uploads/...)
// because the serve route streams the file content with the correct
// Content-Type header. This ensures the file renders correctly in the
// browser regardless of the hosting environment.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return new NextResponse('<html><body><h1>File ID is required</h1></body></html>', {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      })
    }

    const file = await db.driveFile.findUnique({
      where: { id: fileId },
      select: { id: true, fileName: true, filePath: true, mimeType: true, driveId: true, fileSize: true },
    })

    if (!file) {
      return new NextResponse(
        `<html><body style="background:#1a1a1a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>File not found</h2><p>This file may have been deleted by the admin.</p></div></body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html' } },
      )
    }

    // Check if the file exists on disk
    const fullPath = path.join(process.cwd(), 'public', file.filePath)
    const fileExists = existsSync(fullPath)

    if (!fileExists) {
      return new NextResponse(
        `<html><body style="background:#1a1a1a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>File not found on server</h2><p>The file "${file.fileName}" was not found on the server.</p></div></body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html' } },
      )
    }

    const fileName = file.fileName
    const mimeType = file.mimeType
    // Use the serve route for ALL file types — it streams the file with
    // the correct Content-Type so the browser can render it.
    const serveUrl = `/api/files/serve?fileId=${file.id}`

    let embedHtml: string

    // Determine the file extension
    const ext = fileName.toLowerCase().split('.').pop() || ''

    if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) {
      // Images: render inline via <img>
      embedHtml = `<img src="${serveUrl}" alt="${fileName}" style="margin-top:40px;max-width:100%;max-height:calc(100vh - 40px);object-fit:contain;" oncontextmenu="return false" ondragstart="return false" />`
    } else if (mimeType === 'application/pdf' || ext === 'pdf') {
      // PDFs: render via <iframe> with toolbar hidden.
      // The #toolbar=0&navpanes=0&view=FitH fragment hides the browser's
      // built-in PDF toolbar (download, print, zoom buttons) so the user
      // cannot download or print the PDF.
      embedHtml = `<iframe src="${serveUrl}#toolbar=0&navpanes=0&view=FitH" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;border:0;" allow="fullscreen"></iframe>`
    } else if (['xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt'].includes(ext) ||
      mimeType.includes('spreadsheet') || mimeType.includes('excel') ||
      mimeType.includes('wordprocessing') || mimeType.includes('msword') ||
      mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      // Office files: use Microsoft Office Online viewer
      // (https://view.officeapps.live.com/op/embed.aspx?src=<url>).
      // Build the absolute URL from request headers so Office Online can
      // fetch the file from the public-facing address.
      const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000'
      const proto = req.headers.get('x-forwarded-proto') || 'http'
      const absoluteServeUrl = `${proto}://${host}${serveUrl}`
      const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteServeUrl)}`

      const fileExt = ext
      const fileIcon = ['xlsx', 'xls'].includes(fileExt) ? '📊' :
        ['docx', 'doc'].includes(fileExt) ? '📝' :
        ['pptx', 'ppt'].includes(fileExt) ? '📽️' : '📄'
      const fileTypeLabel = ['xlsx', 'xls'].includes(fileExt) ? 'Excel Spreadsheet' :
        ['docx', 'doc'].includes(fileExt) ? 'Word Document' :
        ['pptx', 'ppt'].includes(fileExt) ? 'PowerPoint Presentation' : 'Office Document'

      embedHtml = `
        <div id="office-loading" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1a1a1a;color:white;text-align:center;padding:20px;gap:16px;">
          <div style="font-size:48px;animation:spin 1s linear infinite;">⏳</div>
          <p style="font-size:16px;opacity:0.8;">Loading ${fileTypeLabel} in Microsoft Office Online...</p>
          <p style="font-size:12px;opacity:0.5;">${fileName}</p>
        </div>
        <iframe id="office-iframe" src="${officeViewerUrl}" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;border:0;display:none;" allow="fullscreen"
          onload="this.style.display='block';document.getElementById('office-loading').style.display='none'">
        </iframe>
        <div id="office-fallback" style="display:none;width:100vw;height:calc(100vh - 40px);margin-top:40px;flex-direction:column;align-items:center;justify-content:center;background:#1a1a1a;color:white;text-align:center;padding:20px;gap:24px;">
          <div style="font-size:64px;">${fileIcon}</div>
          <div>
            <p style="font-size:20px;font-weight:600;word-break:break-all;max-width:600px;margin:0 auto 8px;">${fileName}</p>
            <p style="font-size:14px;opacity:0.7;">${fileTypeLabel} · ${formatFileSize(file.fileSize || 0)}</p>
          </div>
          <div style="background:#2d2d2d;border-radius:12px;padding:24px 32px;max-width:500px;">
            <p style="font-size:13px;opacity:0.8;margin-bottom:16px;">The online viewer couldn't load this file. Click below to open it directly.</p>
            <a href="${serveUrl}" target="_blank" rel="noopener noreferrer"
               style="display:inline-flex;align-items:center;gap:8px;background:#10b981;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-size:15px;font-weight:600;">
              📂 Open &amp; View File
            </a>
          </div>
        </div>
        <script>
          // Show fallback if Office Online doesn't load within 15 seconds
          setTimeout(function() {
            var iframe = document.getElementById('office-iframe');
            var loading = document.getElementById('office-loading');
            var fallback = document.getElementById('office-fallback');
            if (iframe && iframe.style.display === 'none') {
              if (loading) loading.style.display = 'none';
              if (iframe) iframe.style.display = 'none';
              if (fallback) fallback.style.display = 'flex';
            }
          }, 15000);
        </script>
      `
    } else if (mimeType.startsWith('text/') || ['txt', 'csv', 'json', 'md', 'log'].includes(ext)) {
      // Text files: fetch and display
      embedHtml = `
        <div id="text-content" style="margin-top:40px;width:100vw;height:calc(100vh - 40px);overflow:auto;background:#1e1e1e;color:#d4d4d4;padding:16px;font-family:monospace;font-size:13px;white-space:pre-wrap;word-break:break-word;">Loading...</div>
        <script>
          fetch("${serveUrl}")
            .then(r => r.text())
            .then(t => { document.getElementById('text-content').textContent = t; })
            .catch(err => { document.getElementById('text-content').textContent = 'Failed to load file: ' + err; });
        </script>
      `
    } else {
      // Fallback: open directly in iframe via the serve route
      embedHtml = `<iframe src="${serveUrl}" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;border:0;" allow="fullscreen"></iframe>`
    }

    // Build the complete HTML page with anti-download protections
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fileName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a1a; min-height: 100vh; overflow: hidden; }
    img, embed, object, iframe { max-width: 100%; max-height: 100vh; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
    .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #2d2d2d; color: white; padding: 8px 16px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; display: flex; align-items: center; justify-content: space-between; z-index: 9999; box-shadow: 0 2px 8px rgba(0,0,0,0.3); gap: 12px; }
    .filename { font-weight: 500; word-break: break-all; overflow-wrap: anywhere; max-width: 70%; }
    .badge { font-size: 11px; opacity: 0.7; white-space: nowrap; flex-shrink: 0; }
  </style>
</head>
<body oncontextmenu="return false" onkeydown="if(event.key==='PrintScreen'||event.key==='F12'||(event.ctrlKey&&event.shiftKey&&(event.key==='I'||event.key==='J'||event.key==='C'))||(event.ctrlKey&&event.key==='u')||(event.ctrlKey&&(event.key==='p'||event.key==='s'))) return false">
  <div class="toolbar">
    <span class="filename">${fileName}</span>
    <span class="badge">View only — download disabled</span>
  </div>
  ${embedHtml}
  <script>
    document.addEventListener('keyup', function(e) {
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('').catch(function(){});
        alert('Screenshots are disabled for this document.');
      }
    });
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey && (e.key === 's' || e.key === 'p' || e.key === 'u')) ||
          e.key === 'F12' ||
          (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))) {
        e.preventDefault();
        return false;
      }
    });
  </script>
</body>
</html>`

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('File viewer error:', error)
    return new NextResponse(
      `<html><body style="background:#1a1a1a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>Error loading file</h2><p>Please try again or contact the admin.</p></div></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } },
    )
  }
}
