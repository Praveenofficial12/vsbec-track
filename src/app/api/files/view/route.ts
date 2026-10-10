import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { existsSync } from 'fs'
import path from 'path'

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
      select: { id: true, fileName: true, filePath: true, mimeType: true, driveId: true },
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
      // PDFs: render via <iframe> — browsers have built-in PDF viewers
      embedHtml = `<iframe src="${serveUrl}" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;border:0;" allow="fullscreen"></iframe>`
    } else if (['xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt'].includes(ext) ||
      mimeType.includes('spreadsheet') || mimeType.includes('excel') ||
      mimeType.includes('wordprocessing') || mimeType.includes('msword') ||
      mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      // Office files: browsers can't render these natively.
      // Use Google Docs Viewer with the serve route URL as the source.
      // The serve route provides a publicly accessible URL that Google can fetch.
      // Build the absolute URL from request headers.
      const host = req.headers.get('host') || req.headers.get('x-forwarded-host') || 'localhost:3000'
      const proto = req.headers.get('x-forwarded-proto') || 'http'
      const absoluteServeUrl = `${proto}://${host}${serveUrl}`
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(absoluteServeUrl)}&embedded=true`

      embedHtml = `
        <div id="viewer-container" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;position:relative;">
          <iframe id="office-iframe" src="${viewerUrl}" style="width:100%;height:100%;border:0;" allow="fullscreen"></iframe>
        </div>
        <div id="office-fallback" style="display:none;flex-direction:column;align-items:center;justify-content:center;height:100vh;color:white;text-align:center;padding:20px;gap:16px;">
          <div style="font-size:48px;">📄</div>
          <p style="font-size:18px;font-weight:600;word-break:break-all;max-width:80%;">${fileName}</p>
          <p style="font-size:14px;opacity:0.7;max-width:400px;">The online viewer couldn't load this file. Click below to view it directly in your browser.</p>
          <a href="${serveUrl}" target="_blank" style="background:#10b981;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">View File</a>
        </div>
        <script>
          var iframe = document.getElementById('office-iframe');
          var fallback = document.getElementById('office-fallback');
          var loaded = false;
          if (iframe) {
            iframe.onload = function() { loaded = true; };
          }
          setTimeout(function() {
            if (!loaded) {
              if (iframe) iframe.style.display = 'none';
              if (fallback) fallback.style.display = 'flex';
            }
          }, 10000);
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
