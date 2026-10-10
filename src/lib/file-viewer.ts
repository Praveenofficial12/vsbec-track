// Shared file viewer helper — opens a file in a new browser window with an
// in-browser viewer. Download, right-click, PrintScreen, and keyboard
// shortcuts (Ctrl+S/P/U, F12, etc.) are blocked.
//
// For Office files (.xlsx, .docx, .pptx) that browsers can't render natively,
// we use Google Docs Viewer (https://docs.google.com/viewer?url=...) which
// renders the file in an iframe. For images and PDFs we render inline.

interface FileViewerOptions {
  filePath: string    // public URL path, e.g. /uploads/drives/<id>/<file>.xlsx
  fileName: string
  mimeType: string
}

export function openFileViewer({ filePath, fileName, mimeType }: FileViewerOptions) {
  const w = window.open('', '_blank', 'width=1024,height=768')
  if (!w) return

  // Build the absolute URL for Google Docs Viewer (it needs a full URL).
  const absoluteUrl = window.location.origin + filePath

  // Determine the embed HTML based on file type.
  let embedHtml: string
  if (mimeType.startsWith('image/')) {
    // Images: render inline via <img>
    embedHtml = `<img src="${filePath}" alt="${fileName}" style="margin-top:40px;max-width:100%;max-height:calc(100vh - 40px);object-fit:contain;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;" oncontextmenu="return false" ondragstart="return false" />`
  } else if (mimeType === 'application/pdf') {
    // PDFs: render via <embed>
    embedHtml = `<embed src="${filePath}" type="application/pdf" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;" />`
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
    // Google Docs Viewer can render .xlsx, .docx, .pptx, .xls, .doc, .ppt.
    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(absoluteUrl)}&embedded=true`
    embedHtml = `<iframe src="${viewerUrl}" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;border:0;" allow="fullscreen"></iframe>`
  } else if (mimeType.startsWith('text/') || mimeType === 'text/plain') {
    // Text files: fetch and display
    embedHtml = `<iframe src="${filePath}" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;border:0;" sandbox="allow-same-origin"></iframe>`
  } else {
    // Fallback: try <object> for other types
    embedHtml = `<object data="${filePath}" type="${mimeType}" style="width:100vw;height:calc(100vh - 40px);margin-top:40px;"><param name="toolbar" value="0" /><p style="color:white;text-align:center;margin-top:50vh;">This file type cannot be previewed in the browser. Please contact the admin.</p></object>`
  }

  w.document.write(`
    <html>
      <head>
        <title>${fileName}</title>
        <style>
          body { margin: 0; display: flex; align-items: center; justify-content: center; background: #1a1a1a; min-height: 100vh; }
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
