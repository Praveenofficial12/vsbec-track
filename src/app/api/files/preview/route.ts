import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFile } from 'fs/promises'
import path from 'path'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

// GET: Convert an Office file (xlsx, docx, pptx) to HTML and return it
// for inline display in the browser — no external viewer needed.
// Query params: fileId=<DriveFile id>
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    const file = await db.driveFile.findUnique({
      where: { id: fileId },
      select: { id: true, fileName: true, filePath: true, mimeType: true, fileSize: true },
    })

    if (!file) {
      return new NextResponse(
        `<html><body style="background:#1a1a1a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>File not found</h2></div></body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html' } },
      )
    }

    const fullPath = path.join(process.cwd(), 'public', file.filePath)
    const fileBuffer = await readFile(fullPath)
    const ext = file.fileName.toLowerCase().split('.').pop() || ''
    const serveUrl = `/api/files/serve?fileId=${file.id}`

    let contentHtml = ''

    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      // Excel files: convert to HTML table using SheetJS
      try {
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
        const sheetsHtml: string[] = []

        // Convert each sheet to HTML
        for (const sheetName of workbook.SheetNames) {
          const sheet = workbook.Sheets[sheetName]
          const html = XLSX.utils.sheet_to_html(sheet, { editable: false })
          sheetsHtml.push(`
            <div class="sheet-container">
              <div class="sheet-name">📋 ${sheetName}</div>
              <div class="sheet-content">${html}</div>
            </div>
          `)
        }

        contentHtml = sheetsHtml.join('')
      } catch (err) {
        contentHtml = `<div style="text-align:center;color:white;padding:40px;"><h3>Could not parse Excel file</h3><p>The file may be corrupted or in an unsupported format.</p><a href="${serveUrl}" target="_blank" style="color:#10b981;">Download original file</a></div>`
      }
    } else if (ext === 'docx' || ext === 'doc') {
      // Word files: convert to HTML using mammoth
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer: fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength) })
        contentHtml = `<div class="document-content">${result.value}</div>`
      } catch (err) {
        contentHtml = `<div style="text-align:center;color:white;padding:40px;"><h3>Could not parse Word document</h3><p>The file may be corrupted or in an unsupported format.</p><a href="${serveUrl}" target="_blank" style="color:#10b981;">Download original file</a></div>`
      }
    } else if (ext === 'pptx' || ext === 'ppt') {
      // PowerPoint: can't easily convert server-side, show info card
      contentHtml = `
        <div style="text-align:center;color:white;padding:40px;">
          <div style="font-size:64px;">📽️</div>
          <h3>${file.fileName}</h3>
          <p style="opacity:0.7;margin-bottom:20px;">PowerPoint Presentation · ${(file.fileSize / 1024).toFixed(1)} KB</p>
          <p style="max-width:400px;margin:0 auto 20px;opacity:0.6;">PowerPoint files cannot be previewed inline. Click below to open the file.</p>
          <a href="${serveUrl}" target="_blank" style="display:inline-block;background:#10b981;color:white;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">📂 Open File</a>
        </div>
      `
    } else {
      contentHtml = `<div style="text-align:center;color:white;padding:40px;"><h3>Unsupported file type</h3></div>`
    }

    // Build the complete HTML page
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${file.fileName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #1a1a1a; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; }
    .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #2d2d2d; color: white; padding: 8px 16px; font-size: 13px; display: flex; align-items: center; justify-content: space-between; z-index: 9999; box-shadow: 0 2px 8px rgba(0,0,0,0.3); gap: 12px; }
    .filename { font-weight: 500; word-break: break-all; overflow-wrap: anywhere; max-width: 70%; }
    .badge { font-size: 11px; opacity: 0.7; white-space: nowrap; flex-shrink: 0; }

    /* Excel table styles */
    .sheet-container { margin-top: 40px; padding: 20px; }
    .sheet-name { font-size: 16px; font-weight: 600; color: #10b981; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #333; }
    .sheet-content { overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    td, th { border: 1px solid #333; padding: 6px 10px; min-width: 80px; }
    tr:nth-child(even) { background: #222; }
    tr:nth-child(odd) { background: #1e1e1e; }
    tr:hover { background: #2a2a2a; }

    /* Word document styles */
    .document-content { margin-top: 40px; padding: 40px; max-width: 800px; margin-left: auto; margin-right: auto; background: #fff; color: #333; border-radius: 8px; line-height: 1.6; }
    .document-content h1, .document-content h2, .document-content h3 { margin-top: 20px; margin-bottom: 10px; }
    .document-content p { margin-bottom: 12px; }
    .document-content ul, .document-content ol { margin-left: 20px; margin-bottom: 12px; }
    .document-content table { border: 1px solid #ddd; }
    .document-content td, .document-content th { border: 1px solid #ddd; padding: 8px; }
  </style>
</head>
<body oncontextmenu="return false" onkeydown="if(event.key==='PrintScreen'||event.key==='F12'||(event.ctrlKey&&event.shiftKey&&(event.key==='I'||event.key==='J'||event.key==='C'))||(event.ctrlKey&&event.key==='u')||(event.ctrlKey&&(event.key==='p'||event.key==='s'))) return false">
  <div class="toolbar">
    <span class="filename">${file.fileName}</span>
    <span class="badge">View only — download disabled</span>
  </div>
  ${contentHtml}
  <script>
    // Anti-screenshot protections
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
    document.addEventListener('dragstart', function(e) { e.preventDefault(); return false; });
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        document.body.style.filter = 'blur(20px)';
      } else {
        document.body.style.filter = '';
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
    console.error('File preview error:', error)
    return new NextResponse(
      `<html><body style="background:#1a1a1a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>Error loading file</h2><p>Please try again or contact the admin.</p></div></body></html>`,
      { status: 500, headers: { 'Content-Type': 'text/html' } },
    )
  }
}
