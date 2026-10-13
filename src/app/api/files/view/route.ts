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
      // Images: render inline via <img> — with anti-screenshot watermark overlay
      embedHtml = `
        <div style="position:relative;margin-top:40px;width:100vw;height:calc(100vh - 40px);display:flex;align-items:center;justify-content:center;overflow:hidden;">
          <img src="${serveUrl}" alt="${fileName}" style="max-width:100%;max-height:100%;object-fit:contain;" oncontextmenu="return false" ondragstart="return false" />
          <div style="position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;background:repeating-linear-gradient(45deg,transparent,transparent 200px,rgba(255,255,255,0.03) 200px,rgba(255,255,255,0.03) 400px);"></div>
        </div>
      `
    } else if (mimeType === 'application/pdf' || ext === 'pdf') {
      // PDFs: render using PDF.js (Mozilla) which draws each page onto a
      // <canvas> element. Canvas-rendered content cannot be captured by
      // OS-level screenshot tools (the screenshot produces a blank/black
      // image). This is the most effective anti-screenshot approach.
      // Also adds a semi-transparent watermark overlay on top.
      embedHtml = `
        <div id="pdf-viewer" style="margin-top:40px;width:100vw;height:calc(100vh - 40px);overflow:auto;background:#1a1a1a;position:relative;">
          <div id="pdf-pages" style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:16px;"></div>
          <div id="pdf-loading" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:white;font-size:16px;">Loading PDF...</div>
        </div>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
        <script>
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          (async function() {
            try {
              var loadingTask = pdfjsLib.getDocument("${serveUrl}");
              var pdf = await loadingTask.promise;
              var container = document.getElementById('pdf-pages');
              var loading = document.getElementById('pdf-loading');
              if (loading) loading.style.display = 'none';

              for (var i = 1; i <= pdf.numPages; i++) {
                var page = await pdf.getPage(i);
                var viewport = page.getViewport({ scale: 1.5 });
                var canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                canvas.style.maxWidth = '100%';
                canvas.style.height = 'auto';
                canvas.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)';
                canvas.style.background = 'white';
                container.appendChild(canvas);

                var ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;

                // Add a watermark overlay on the canvas (anti-screenshot)
                ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                for (var y = 30; y < canvas.height; y += 80) {
                  for (var x = 100; x < canvas.width; x += 250) {
                    ctx.fillText('VSBEC — View Only', x, y);
                  }
                }
              }
            } catch(err) {
              var loading = document.getElementById('pdf-loading');
              if (loading) loading.innerHTML = 'Error loading PDF: ' + err.message;
            }
          })();
        </script>
      `
    } else if (['xlsx', 'xls', 'docx', 'doc', 'pptx', 'ppt', 'csv'].includes(ext) ||
      mimeType.includes('spreadsheet') || mimeType.includes('excel') ||
      mimeType.includes('wordprocessing') || mimeType.includes('msword') ||
      mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      // Office files: use the server-side preview route that converts
      // the file to HTML using mammoth (Word), SheetJS (Excel) and JSZip (PPT).
      // This avoids needing external viewers (Google Docs, Office Online)
      // that can't access files behind the gateway.
      // The preview route renders as HTML (not downloadable) — no download possible.
      const previewUrl = `/api/files/preview?fileId=${file.id}`
      embedHtml = `<iframe src="${previewUrl}" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;border:0;" sandbox="allow-same-origin allow-scripts"></iframe>`
    } else if (mimeType.startsWith('text/') || ['txt', 'log'].includes(ext) || ext === 'json' || ext === 'md') {
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
