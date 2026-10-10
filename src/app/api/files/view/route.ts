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
//   - PDFs: <iframe>
//   - Office files (.xlsx, .docx, .pptx): Google Docs Viewer
//   - Text files: fetched and displayed in <pre>
//
// The page also blocks download, right-click, PrintScreen, and keyboard
// shortcuts (Ctrl+S/P/U, F12, etc.).
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

    // Build the absolute URL for the file
    const origin = req.nextUrl.origin
    const fileUrl = `${origin}${file.filePath}`

    // Check if the file exists on disk
    const fullPath = path.join(process.cwd(), 'public', file.filePath)
    const fileExists = existsSync(fullPath)

    if (!fileExists) {
      return new NextResponse(
        `<html><body style="background:#1a1a1a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>File not found on server</h2><p>The file "${file.fileName}" was not found on the server. It may have been deleted or moved.</p></div></body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html' } },
      )
    }

    // Determine the embed HTML based on file type
    const fileName = file.fileName
    const mimeType = file.mimeType
    let embedHtml: string

    if (mimeType.startsWith('image/')) {
      // Images: render inline via <img>
      embedHtml = `<img src="${fileUrl}" alt="${fileName}" style="margin-top:40px;max-width:100%;max-height:calc(100vh - 40px);object-fit:contain;" oncontextmenu="return false" ondragstart="return false" />`
    } else if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      // PDFs: render via <iframe> — browsers have built-in PDF viewers
      embedHtml = `<iframe src="${fileUrl}" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;border:0;" allow="fullscreen"></iframe>`
    } else if (
      mimeType.includes('spreadsheet') ||
      mimeType.includes('excel') ||
      mimeType.includes('officedocument.spreadsheet') ||
      mimeType.includes('wordprocessing') ||
      mimeType.includes('msword') ||
      mimeType.includes('officedocument.wordprocessing') ||
      mimeType.includes('presentation') ||
      mimeType.includes('powerpoint') ||
      mimeType.includes('officedocument.presentation') ||
      fileName.match(/\.(xlsx|docx|pptx|xls|doc|ppt)$/i)
    ) {
      // Office files: use Google Docs Viewer in an iframe
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
      embedHtml = `<iframe src="${viewerUrl}" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;border:0;" allow="fullscreen"></iframe>`
    } else if (mimeType.startsWith('text/') || mimeType === 'text/plain' || fileName.match(/\.(txt|csv|json|md|log)$/i)) {
      // Text files: fetch and display
      embedHtml = `
        <div id="text-content" style="margin-top:40px;width:100vw;height:calc(100vh - 40px);overflow:auto;background:#1e1e1e;color:#d4d4d4;padding:16px;font-family:monospace;font-size:13px;white-space:pre-wrap;word-break:break-word;">Loading...</div>
        <script>
          fetch("${fileUrl}")
            .then(r => r.text())
            .then(t => { document.getElementById('text-content').textContent = t; })
            .catch(err => { document.getElementById('text-content').textContent = 'Failed to load file: ' + err; });
        </script>
      `
    } else {
      // Fallback: try <iframe> for other types
      embedHtml = `<iframe src="${fileUrl}" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;border:0;" allow="fullscreen"></iframe>`
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
    // Block PrintScreen
    document.addEventListener('keyup', function(e) {
      if (e.key === 'PrintScreen') {
        navigator.clipboard.writeText('').catch(function(){});
        alert('Screenshots are disabled for this document.');
      }
    });
    // Block Ctrl+S, Ctrl+P, Ctrl+U, F12, DevTools shortcuts
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
