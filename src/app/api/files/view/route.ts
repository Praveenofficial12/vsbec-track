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
    // Session token passed by the student-side iframe caller so the
    // file viewer can call /api/students/screenshot-attempt to enforce
    // the 3-strike screenshot policy. Admin-originated views don't pass
    // a token, in which case screenshot detection is a no-op.
    const sessionToken = searchParams.get('token') || ''

    if (!fileId) {
      return new NextResponse('<html><body><h1>File ID is required</h1></body></html>', {
        status: 400,
        headers: { 'Content-Type': 'text/html' },
      })
    }

    const file = await db.driveFile.findUnique({
      where: { id: fileId },
      select: { id: true, fileName: true, filePath: true, mimeType: true, driveId: true, fileSize: true, roundName: true, locked: true },
    })

    if (!file) {
      return new NextResponse(
        `<html><body style="background:#1a1a1a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>File not found</h2><p>This file may have been deleted by the admin.</p></div></body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html' } },
      )
    }

    // ─── Round-based file lock check ──────────────────────────────────
    // If the file is permanently locked (locked=true in DB) OR the file
    // belongs to a round and the student has already updated their round
    // status for that round, the file can no longer be viewed.
    // Admin-originated views (no session token) skip this check.
    if (sessionToken && file.roundName) {
      // Check if the student has a round result for this round
      const session = await db.sessionTracker.findFirst({
        where: { token: sessionToken },
        select: { userKey: true },
      })
      if (session) {
        const registerNumber = session.userKey.replace(/^STUDENT:/, '')
        const student = await db.student.findFirst({
          where: { registerNumber },
          select: { id: true },
        })
        if (student) {
          const participation = await db.driveParticipation.findFirst({
            where: { driveId: file.driveId, studentId: student.id },
            select: { id: true },
          })
          if (participation) {
            const roundResult = await db.roundResult.findFirst({
              where: {
                participationId: participation.id,
                round: { roundName: file.roundName },
              },
              select: { status: true },
            })
            // If the round result exists and is NOT PENDING (i.e. it's
            // CLEARED, NOT_CLEARED, or ABSENT), the file is permanently
            // locked for this student.
            if (roundResult && roundResult.status !== 'PENDING') {
              return new NextResponse(
                `<html><body style="background:#1a1a1a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><div style="font-size:64px;margin-bottom:16px;">🔒</div><h2>File Locked</h2><p>This file is no longer available because you have already updated your status for the <strong>${file.roundName}</strong> round.</p></div></body></html>`,
                { status: 403, headers: { 'Content-Type': 'text/html' } },
              )
            }
          }
        }
      }
    }

    // Also check the permanent `locked` flag in the DB
    if (file.locked) {
      return new NextResponse(
        `<html><body style="background:#1a1a1a;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><div style="font-size:64px;margin-bottom:16px;">🔒</div><h2>File Locked</h2><p>This file has been permanently locked by the admin.</p></div></body></html>`,
        { status: 403, headers: { 'Content-Type': 'text/html' } },
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
<body oncontextmenu="return false" oncopy="return false" oncut="return false" ondragstart="return false" onselectstart="return false" onkeydown="if(event.key==='PrintScreen'||event.key==='F12'||event.key==='Meta'||event.metaKey||(event.ctrlKey&&event.shiftKey&&(event.key==='I'||event.key==='J'||event.key==='C'))||(event.ctrlKey&&event.key==='u')||(event.ctrlKey&&event.key==='c')||(event.ctrlKey&&event.key==='a')||(event.ctrlKey&&(event.key==='p'||event.key==='s'))) return false" style="user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;">
  <div class="toolbar">
    <span class="filename">${fileName}</span>
    <span class="badge">View only — download disabled</span>
  </div>
  ${embedHtml}
  <script>
    // ─── Screenshot Policy Enforcement (inside the file viewer iframe) ────
    // This script runs INSIDE the iframe. It detects PrintScreen, Win+Shift+S,
    // Win+Shift+T, and clipboard captures, then calls the screenshot-attempt
    // API (3-strike policy: 2 warnings → lock on 3rd).
    //
    // The PARENT window (StudentLayout) also has its own listener, but when
    // the iframe has focus, the parent's keydown event might NOT fire. So
    // we need BOTH: the iframe's listener (catches events when iframe has
    // focus) AND the parent's listener (catches events when the parent has
    // focus). The API call is idempotent — the server debounces by 800ms
    // via the screenshotAttempts counter.
    var SESSION_TOKEN = ${JSON.stringify(sessionToken)};
    var FILE_ID = ${JSON.stringify(fileId)};
    var FILE_NAME = ${JSON.stringify(fileName)};
    var LOCKED = false;
    var recording = false;

    // Expose the session token on window.__sessionToken so the global
    // anti-capture script (from layout.tsx) can pick it up and call the
    // screenshot-attempt API. This ensures the SAME detection logic runs
    // inside the iframe as on the main student pages.
    if (SESSION_TOKEN) {
      window.__sessionToken = SESSION_TOKEN;
    }
    window.__currentFileName = FILE_NAME;

    function showScreenshotOverlay(message, locked) {
      // The black screen is ALREADY showing (added by handleScreenshotKey).
      // This function just adds the warning/lock popup ON TOP of it.
      var existing = document.getElementById('screenshot-overlay');
      if (existing) existing.remove();
      var div = document.createElement('div');
      div.id = 'screenshot-overlay';
      div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background:rgba(0,0,0,0.95);color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;z-index:999999;padding:24px;';
      var inner = document.createElement('div');
      inner.style.cssText = 'max-width:560px;text-align:center;background:#1a1a1a;border:1px solid ' + (locked ? '#f43f5e' : '#f59e0b') + ';border-radius:16px;padding:40px;box-shadow:0 10px 40px rgba(0,0,0,0.8);';
      var icon = document.createElement('div');
      icon.style.cssText = 'font-size:56px;margin-bottom:16px;';
      icon.textContent = locked ? '🔒' : '⚠️';
      var title = document.createElement('div');
      title.style.cssText = 'font-size:22px;font-weight:700;margin-bottom:12px;color:' + (locked ? '#f43f5e' : '#f59e0b') + ';';
      title.textContent = locked ? 'Account Locked' : 'Screenshot Attempt Detected';
      var msg = document.createElement('p');
      msg.style.cssText = 'font-size:15px;line-height:1.6;color:#e5e7eb;white-space:pre-line;margin-bottom:8px;';
      msg.textContent = message;
      inner.appendChild(icon);
      inner.appendChild(title);
      inner.appendChild(msg);
      if (locked) {
        var note = document.createElement('p');
        note.style.cssText = 'font-size:13px;color:#9ca3af;margin-top:16px;';
        note.textContent = 'You will be logged out shortly. Please call the admin to unlock your account.';
        inner.appendChild(note);
        // Black screen already showing — stays until redirect
      } else {
        var btn = document.createElement('button');
        btn.textContent = 'I understand';
        btn.style.cssText = 'margin-top:24px;background:#f59e0b;color:white;border:none;padding:12px 36px;border-radius:10px;cursor:pointer;font-size:15px;font-weight:600;';
        // On "I understand": remove the popup AND the black screen,
        // returning the student to the file they were viewing.
        btn.addEventListener('click', function() {
          div.remove();
          removeBlackOut();
        });
        inner.appendChild(btn);
        // Auto-close warnings after 8 seconds — also remove black screen
        setTimeout(function() {
          if (div.parentNode) div.remove();
          removeBlackOut();
        }, 8000);
      }
      div.appendChild(inner);
      document.body.appendChild(div);
    }

    function recordScreenshotAttempt(source) {
      if (LOCKED || !SESSION_TOKEN) {
        removeBlackOut(); // no policy or already locked — remove black screen
        return;
      }
      if (recording) {
        removeBlackOut(); // double-fire — remove black screen
        return;
      }
      recording = true;
      setTimeout(function() { recording = false; }, 800);

      // Empty the clipboard immediately to make the screenshot useless
      try { navigator.clipboard.writeText('').catch(function(){}); } catch(e) {}

      fetch('/api/students/screenshot-attempt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + SESSION_TOKEN,
        },
        body: JSON.stringify({ fileId: FILE_ID, fileName: FILE_NAME, page: 'file-viewer' }),
      }).then(function(r) { return r.json(); }).then(function(data) {
        if (!data || data.error) {
          removeBlackOut();
          return;
        }
        if (data.enabled === false) {
          removeBlackOut(); // policy disabled — remove black screen
          return;
        }
        if (data.locked) {
          LOCKED = true;
          window.__sessionToken = null;
          showScreenshotOverlay(data.message || 'Your account has been locked due to restrictions. Please call the admin to unlock the account.', true);
          // Notify the parent window so it can close the file viewer
          // and redirect the student to the login page.
          try {
            window.parent.postMessage({ type: 'STUDENT_LOCKED', message: data.message }, '*');
          } catch(e) {}
          // Also clear the parent's session and redirect
          setTimeout(function() {
            try { window.parent.postMessage({ type: 'FORCE_LOGOUT' }, '*'); } catch(e) {}
          }, 5000);
        } else if (data.action === 'WARNING') {
          showScreenshotOverlay(data.message || 'Screenshot attempt detected.', false);
          try {
            window.parent.postMessage({ type: 'SCREENSHOT_WARNING', message: data.message, attempt: data.attempt }, '*');
          } catch(e) {}
        }
      }).catch(function(err) {
        console.error('Screenshot attempt record failed:', err);
        removeBlackOut(); // network error — remove black screen so student isn't stuck
      });
    }

    // ─── Black Screen helpers (inside the iframe) ─────────────────────
    function blackOutScreen() {
      var existing = document.getElementById('screenshot-blank');
      if (existing) return;
      var blank = document.createElement('div');
      blank.id = 'screenshot-blank';
      blank.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background:#000000;z-index:999998;';
      document.body.appendChild(blank);
    }
    function removeBlackOut() {
      var blank = document.getElementById('screenshot-blank');
      if (blank && blank.parentNode) blank.remove();
    }

    // ─── Keydown/Keyup handler — detects ALL screenshot shortcuts ───────
    // - PrintScreen (plain, Win+PrintScreen, Ctrl+PrintScreen)
    // - Win+Shift+S (Snipping Tool)
    // - Win+Shift+T (Text Extractor)
    // - Meta key alone (Windows key) — blocked
    function handleScreenshotKey(e) {
      if (!SESSION_TOKEN) return; // admin view — no policy
      var isScreenshotKey = false;
      // Standard PrintScreen
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
        isScreenshotKey = true;
      }
      // Win+Shift+S (Snipping Tool) — metaKey is the Windows key
      if (e.metaKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
        isScreenshotKey = true;
      }
      // Win+Shift+T (Text Extractor)
      if (e.metaKey && e.shiftKey && (e.key === 'T' || e.key === 't')) {
        isScreenshotKey = true;
      }
      if (isScreenshotKey) {
        e.preventDefault();
        e.stopPropagation();
        // Clear clipboard IMMEDIATELY
        try { navigator.clipboard.writeText('').catch(function(){}); } catch(err) {}
        // ─── IMMEDIATELY BLACK OUT THE ENTIRE IFRAME ───
        // This happens BEFORE the API call so the OS captures a black frame.
        blackOutScreen();
        // Now call the API (which will show the warning/lock popup on top
        // of the black screen when the response arrives).
        recordScreenshotAttempt(e.type === 'keydown' ? 'keydown-' + e.key : 'keyup-' + e.key);
        return false;
      }
    }

    // Listen on BOTH keydown AND keyup (capture phase) so we catch the
    // event regardless of which element inside the iframe has focus.
    document.addEventListener('keydown', handleScreenshotKey, true);
    document.addEventListener('keyup', handleScreenshotKey, true);

    // ─── Clipboard polling — catches OS-level captures ──────────────────
    // Some screenshot tools (Snipping Tool via taskbar) don't fire a key
    // event. Poll the clipboard every 1 second; if it contains a large
    // data blob (>200 chars), treat it as a screenshot capture.
    if (SESSION_TOKEN && navigator.clipboard && navigator.clipboard.readText) {
      setInterval(function() {
        navigator.clipboard.readText().then(function(text) {
          if (text && text.length > 200) {
            navigator.clipboard.writeText('').catch(function(){});
            recordScreenshotAttempt('clipboard-large-read');
          }
        }).catch(function(){});
      }, 1000);
    }

    // ─── Blur/visibility handler — blanks the screen when the tab loses focus ──
    // This prevents the student from using Alt+Tab to switch to another app
    // and taking a screenshot there. When the tab regains focus, we check
    // the clipboard for screenshot content.
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        // Tab lost focus — blank the screen
        var blank = document.getElementById('visibility-blank');
        if (!blank) {
          blank = document.createElement('div');
          blank.id = 'visibility-blank';
          blank.style.cssText = 'position:fixed;inset:0;background:#1a1a1a;z-index:999997;display:flex;align-items:center;justify-content:center;color:white;font-family:sans-serif;font-size:18px;';
          blank.textContent = '🔒 Content hidden — return to the portal to continue';
          document.body.appendChild(blank);
        }
      } else {
        // Tab regained focus — check clipboard for screenshot content
        var blank = document.getElementById('visibility-blank');
        if (blank && blank.parentNode) blank.remove();
        // Check if the clipboard now contains a screenshot
        if (SESSION_TOKEN && navigator.clipboard && navigator.clipboard.readText) {
          navigator.clipboard.readText().then(function(text) {
            if (text && text.length > 200) {
              navigator.clipboard.writeText('').catch(function(){});
              recordScreenshotAttempt('visibility-clipboard-read');
            }
          }).catch(function(){});
        }
      }
    });

    // ─── Continuous clipboard clearing ──────────────────────────────────
    // Clear the clipboard every 500ms so any screenshot capture is
    // immediately overwritten with empty content. This is the most
    // reliable way to prevent screenshots from being usable.
    if (SESSION_TOKEN) {
      setInterval(function() {
        try { navigator.clipboard.writeText('').catch(function(){}); } catch(e) {}
      }, 500);
    }
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
