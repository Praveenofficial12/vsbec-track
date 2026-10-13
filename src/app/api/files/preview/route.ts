import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFile } from 'fs/promises'
import path from 'path'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'
import JSZip from 'jszip'

// GET: Convert an Office file (xlsx, docx, pptx) to HTML and return it
// for inline display in the browser — no external viewer needed.
// Query params: fileId=<DriveFile id>
//
// IMPORTANT: This route NEVER includes download links. Download is disabled
// for all students. If a file can't be parsed, we show a clean message
// explaining the file can only be viewed by the admin who uploaded it.
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
        contentHtml = renderUnsupportedCard(
          file.fileName,
          'spreadsheet',
          'The Excel file could not be parsed. It may use an unsupported format or be corrupted.'
        )
      }
    } else if (ext === 'docx' || ext === 'doc') {
      // Word files: convert to HTML using mammoth.
      // mammoth accepts a Node Buffer via the `buffer` option (NOT arrayBuffer).
      try {
        const result = await mammoth.convertToHtml({ buffer: fileBuffer })
        contentHtml = `<div class="document-content">${result.value}</div>`
      } catch (err) {
        console.error('mammoth conversion error:', err)
        contentHtml = renderUnsupportedCard(
          file.fileName,
          'Word document',
          'The Word document could not be parsed. It may use an older .doc format or be corrupted.'
        )
      }
    } else if (ext === 'pptx' || ext === 'ppt') {
      // PowerPoint: extract slide text using JSZip (pptx is a zip of XML files)
      try {
        const zip = await JSZip.loadAsync(fileBuffer)
        const slideFiles = Object.keys(zip.files)
          .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
          .sort((a, b) => {
            const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0', 10)
            const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0', 10)
            return numA - numB
          })

        if (slideFiles.length === 0) {
          contentHtml = renderUnsupportedCard(
            file.fileName,
            'PowerPoint',
            'No slides were found in this presentation. It may be corrupted.'
          )
        } else {
          const slidesHtml: string[] = []
          for (let i = 0; i < slideFiles.length; i++) {
            const slideXml = await zip.files[slideFiles[i]].async('string')
            // Extract all <a:t>...</a:t> text runs from the slide XML
            const textRuns = slideXml.match(/<a:t>([^<]*)<\/a:t>/g) || []
            const texts = textRuns.map((t) => t.replace(/<a:t>/, '').replace(/<\/a:t>/, ''))
            const slideText = texts.join(' ').trim()
            const paragraphs = slideXml.split(/<\/a:p>/).map(p => {
              const runs = p.match(/<a:t>([^<]*)<\/a:t>/g) || []
              return runs.map((r: string) => r.replace(/<a:t>/, '').replace(/<\/a:t>/, '')).join(' ')
            }).filter((p: string) => p.trim().length > 0)

            slidesHtml.push(`
              <div class="pptx-slide">
                <div class="pptx-slide-number">Slide ${i + 1} of ${slideFiles.length}</div>
                <div class="pptx-slide-content">
                  ${paragraphs.length > 0
                    ? paragraphs.map((p: string) => `<p>${escapeHtml(p)}</p>`).join('')
                    : `<p class="pptx-empty">[Blank slide]</p>`}
                </div>
              </div>
            `)
          }
          contentHtml = `
            <div class="pptx-container">
              <div class="pptx-header">
                <span class="pptx-title">📽️ ${escapeHtml(file.fileName)}</span>
                <span class="pptx-count">${slideFiles.length} slides · Text-only preview</span>
              </div>
              ${slidesHtml.join('')}
            </div>
          `
        }
      } catch (err) {
        contentHtml = renderUnsupportedCard(
          file.fileName,
          'PowerPoint',
          'The PowerPoint file could not be parsed. It may use an older .ppt format or be corrupted.'
        )
      }
    } else {
      contentHtml = renderUnsupportedCard(
        file.fileName,
        ext.toUpperCase() + ' file',
        'This file type does not support inline preview.'
      )
    }

    // Build the complete HTML page
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(file.fileName)}</title>
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

    /* PowerPoint styles */
    .pptx-container { margin-top: 40px; padding: 20px; max-width: 900px; margin-left: auto; margin-right: auto; }
    .pptx-header { background: #2d2d2d; padding: 16px 20px; border-radius: 8px 8px 0 0; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; }
    .pptx-title { font-size: 15px; font-weight: 600; color: #fff; word-break: break-all; }
    .pptx-count { font-size: 12px; color: #10b981; }
    .pptx-slide { background: #fff; color: #333; margin-bottom: 12px; border-radius: 0 0 8px 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.3); }
    .pptx-slide-number { background: #f3f4f6; padding: 6px 16px; font-size: 11px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
    .pptx-slide-content { padding: 20px 24px; min-height: 60px; }
    .pptx-slide-content p { margin-bottom: 8px; line-height: 1.5; font-size: 14px; }
    .pptx-empty { color: #9ca3af; font-style: italic; }

    /* Unsupported file card */
    .unsupported-card { margin-top: 40px; padding: 40px; max-width: 500px; margin-left: auto; margin-right: auto; text-align: center; background: #2d2d2d; border-radius: 12px; border: 1px solid #444; }
    .unsupported-icon { font-size: 64px; margin-bottom: 16px; }
    .unsupported-title { color: #fff; font-size: 18px; font-weight: 600; margin-bottom: 12px; word-break: break-all; }
    .unsupported-msg { color: #9ca3af; font-size: 13px; line-height: 1.5; margin-bottom: 16px; }
    .unsupported-meta { color: #6b7280; font-size: 11px; }
  </style>
</head>
<body oncontextmenu="return false" onkeydown="if(event.key==='PrintScreen'||event.key==='F12'||(event.ctrlKey&&event.shiftKey&&(event.key==='I'||event.key==='J'||event.key==='C'))||(event.ctrlKey&&event.key==='u')||(event.ctrlKey&&(event.key==='p'||event.key==='s'))) return false">
  <div class="toolbar">
    <span class="filename">${escapeHtml(file.fileName)}</span>
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

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderUnsupportedCard(fileName: string, fileType: string, message: string): string {
  const size = '(unknown size)'
  return `
    <div class="unsupported-card">
      <div class="unsupported-icon">📄</div>
      <div class="unsupported-title">${escapeHtml(fileName)}</div>
      <div class="unsupported-msg">${escapeHtml(message)}</div>
      <div class="unsupported-meta">${escapeHtml(fileType)} · View only</div>
    </div>
  `
}
