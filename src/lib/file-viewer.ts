// Shared file viewer helper — opens a file in a new browser window with an
// in-browser viewer. Download, right-click, PrintScreen, and keyboard
// shortcuts (Ctrl+S/P/U, F12, etc.) are blocked.
//
// IMPORTANT: All file URLs must be absolute (window.location.origin + path)
// because the viewer window is opened as about:blank. Relative paths would
// resolve against about:blank and return 404.

interface FileViewerOptions {
  filePath: string    // public URL path, e.g. /uploads/drives/<id>/<file>.xlsx
  fileName: string
  mimeType: string
}

export function openFileViewer({ filePath, fileName, mimeType }: FileViewerOptions) {
  // Build the absolute URL — this is critical because the viewer window is
  // about:blank, and relative paths would resolve against about:blank (404).
  const absoluteUrl = window.location.origin + filePath

  const w = window.open('', '_blank', 'width=1024,height=768')
  if (!w) return

  // Determine the embed HTML based on file type.
  let embedHtml: string
  if (mimeType.startsWith('image/')) {
    // Images: render inline via <img>
    embedHtml = `<img src="${absoluteUrl}" alt="${fileName}" style="margin-top:40px;max-width:100%;max-height:calc(100vh - 40px);object-fit:contain;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;" oncontextmenu="return false" ondragstart="return false" />`
  } else if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
    // PDFs: render via <iframe> — browsers have built-in PDF viewers.
    // Using <iframe> instead of <embed> because it's more reliable across browsers.
    embedHtml = `<iframe src="${absoluteUrl}" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;border:0;" allow="fullscreen"></iframe>`
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
    // Office files: use Google Docs Viewer in an iframe.
    // Google Docs Viewer can render .xlsx, .docx, .pptx, .xls, .doc, .ppt
    // and works in the browser without any plugins.
    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(absoluteUrl)}&embedded=true`
    embedHtml = `<iframe src="${viewerUrl}" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;border:0;" allow="fullscreen"></iframe>`
  } else if (mimeType.startsWith('text/') || mimeType === 'text/plain' || fileName.match(/\.(txt|csv|json|md|log)$/i)) {
    // Text files: display in a <pre> block (fetched via JS to avoid iframe
    // sandbox issues with about:blank).
    embedHtml = `
      <div id="text-content" style="margin-top:40px;width:100vw;height:calc(100vh - 40px);overflow:auto;background:#1e1e1e;color:#d4d4d4;padding:16px;font-family:monospace;font-size:13px;white-space:pre-wrap;word-break:break-word;">Loading...</div>
      <script>
        fetch("${absoluteUrl}")
          .then(r => r.text())
          .then(t => {
            document.getElementById('text-content').textContent = t;
          })
          .catch(err => {
            document.getElementById('text-content').textContent = 'Failed to load file: ' + err;
          });
      </script>
    `
  } else {
    // Fallback: try <iframe> first (browsers can handle many types natively),
    // then show a message if that fails.
    embedHtml = `
      <iframe src="${absoluteUrl}" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;border:0;" allow="fullscreen"
        onerror="this.style.display='none';document.getElementById('fallback').style.display='flex'">
      </iframe>
      <div id="fallback" style="display:none;flex-direction:column;align-items:center;justify-content:center;height:100vh;color:white;text-align:center;padding:20px;">
        <p style="font-size:16px;margin-bottom:8px;">This file type (${mimeType}) cannot be previewed in the browser.</p>
        <p style="font-size:13px;opacity:0.7;">Please contact the admin if you need access to this file.</p>
      </div>
    `
  }

  w.document.write(`
    <html>
      <head>
        <title>${fileName}</title>
        <style>
          body { margin: 0; padding: 0; background: #1a1a1a; min-height: 100vh; }
          img, embed, object, iframe { max-width: 100%; max-height: 100vh; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; }
          .toolbar { position: fixed; top: 0; left: 0; right: 0; background: #2d2d2d; color: white; padding: 8px 16px; font-family: sans-serif; font-size: 13px; display: flex; align-items: center; justify-content: space-between; z-index: 9999; }
          .filename { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%; }
        </style>
      </head>
      <body oncontextmenu="return false" onkeydown="if(event.key==='PrintScreen'||event.key==='F12'||(event.ctrlKey&amp;&amp;event.shiftKey&amp;&amp;(event.key==='I'||event.key==='J'||event.key==='C'))||(event.ctrlKey&amp;&amp;event.key==='u')||(event.ctrlKey&amp;&amp;(event.key==='p'||event.key==='s'))) return false">
        <div class="toolbar">
          <span class="filename">${fileName}</span>
          <span style="font-size:11px;opacity:0.7">View only — download disabled</span>
        </div>
        ${embedHtml}
        <script>
          document.addEventListener('keyup', function(e) {
            if (e.key === 'PrintScreen') {
              navigator.clipboard.writeText('');
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
    </html>
  `)
  w.document.close()
}
