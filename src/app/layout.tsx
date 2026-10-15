import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as RadixToaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "V.S.B. Engineering College, Karur — Placement Management System",
  description:
    "Official placement management portal of V.S.B. Engineering College, Karur — manage students, companies, placement drives, recruitment rounds, analytics and reports.",
  keywords: [
    "V.S.B. Engineering College",
    "VSBEC",
    "Karur",
    "Placement Management System",
    "Placement ERP",
    "College Placements",
    "Tamil Nadu Engineering College",
    "Recruitment",
    "Analytics",
  ],
  authors: [{ name: "V.S.B. Engineering College, Karur — Placement Department" }],
  icons: {
    icon: "/vsbec-logo.png",
    apple: "/vsbec-logo.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#047857",
};

// Global anti-screenshot / anti-right-click / anti-screen-capture script.
// This runs on EVERY page of the website and blocks:
//   - Right-click context menu → shows popup
//   - Copy / Paste → shows popup
//   - PrintScreen + Win+PrintScreen + Win+Shift+S + Win+Shift+T → calls the
//     screenshot-attempt API (3-strike policy: 2 warnings → lock on 3rd)
//   - Screen recording → shows popup
//   - Ctrl+S, Ctrl+P, Ctrl+U, F12, Ctrl+Shift+I/J/C → blocked
//   - Text selection, drag-and-drop
//   - Visibility change (blurs content when tab loses focus)
//
// The screenshot-attempt API call requires a student session token. The
// StudentLayout component sets window.__sessionToken when the student logs
// in, so this global script can call the API from any page.
const antiCaptureScript = `
<script>
(function() {
  'use strict';

  // ─── Screenshot Policy State ──────────────────────────────────────
  // These are read from /api/students/screenshot-attempt (GET) on mount
  // and updated after each attempt. The global script uses them to decide
  // whether to show the warning/lock overlay or do nothing (policy off).
  var policyEnabled = true;
  var maxAttempts = 3;
  var currentAttempts = 0;
  var isLocked = false;
  var recording = false; // prevents double-fire from keydown+keyup

  // ─── Read session token from localStorage ────────────────────────
  // The Zustand persist store saves the session token under
  // 'vsbec-placement-store'. We read it from there so the global script
  // has the token even before the StudentLayout React component mounts.
  // This is critical because the anti-capture script runs immediately on
  // page load (it's injected via dangerouslySetInnerHTML), but the React
  // component might not have set window.__sessionToken yet.
  function getSessionToken() {
    // First check window.__sessionToken (set by StudentLayout)
    if (window.__sessionToken) return window.__sessionToken;
    // Fallback: read from the Zustand persist store in localStorage
    try {
      var raw = localStorage.getItem('vsbec-placement-store');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.state && parsed.state.sessionToken) {
          return parsed.state.sessionToken;
        }
      }
    } catch (e) {}
    return null;
  }

  // Fetch the current policy state on load. The GET endpoint returns
  // { enabled, maxAttempts, attempt, locked } based on the session token.
  function fetchPolicyState() {
    var token = getSessionToken();
    if (!token) return;
    fetch('/api/students/screenshot-attempt?token=' + encodeURIComponent(token))
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data || data.error) return;
        policyEnabled = data.enabled !== false;
        maxAttempts = data.maxAttempts || 3;
        currentAttempts = data.attempt || 0;
        isLocked = data.locked === true;
      })
      .catch(function() {});
  }
  // Delay the first fetch slightly so React has time to mount and set
  // window.__sessionToken (the Zustand store fallback should also work).
  setTimeout(fetchPolicyState, 500);
  // Re-fetch every 15s in case the admin toggles the policy or the
  // student's attempt count changes.
  setInterval(fetchPolicyState, 15000);

  // ─── Black Screen + Warning/Lock Overlay ─────────────────────────
  // When PrintScreen is detected, the ENTIRE screen goes black IMMEDIATELY
  // (before the OS can capture the frame). Then the warning popup appears
  // on top of the black screen. When the student clicks "I understand"
  // (or auto-close after 8s), the black screen and popup are removed and
  // the student stays on the page they were on.
  //
  // On the 3rd attempt (lock), the black screen + lock popup stays until
  // the auto-redirect to the landing page after 5 seconds.
  function blackOutScreen() {
    var existing = document.getElementById('screenshot-blank-overlay');
    if (existing) return existing;
    var blank = document.createElement('div');
    blank.id = 'screenshot-blank-overlay';
    blank.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background:#000000;z-index:9999998;pointer-events:none;';
    document.body.appendChild(blank);
    return blank;
  }

  function removeBlackOut() {
    var blank = document.getElementById('screenshot-blank-overlay');
    if (blank && blank.parentNode) blank.remove();
  }

  function showScreenshotOverlay(message, locked) {
    // Step 1: immediately black out the ENTIRE screen so any captured
    // frame is pure black. This happens BEFORE the API call so the
    // screenshot is useless even if the OS captures it.
    blackOutScreen();

    // Step 2: remove any existing popup
    var existing = document.getElementById('screenshot-policy-overlay');
    if (existing) existing.remove();

    // Step 3: create the warning/lock popup ON TOP of the black screen
    var div = document.createElement('div');
    div.id = 'screenshot-policy-overlay';
    div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background:rgba(0,0,0,0.95);color:white;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;z-index:9999999;padding:24px;';
    var inner = document.createElement('div');
    inner.style.cssText = 'max-width:520px;text-align:center;background:#1a1a1a;border:1px solid ' + (locked ? '#f43f5e' : '#f59e0b') + ';border-radius:16px;padding:40px;box-shadow:0 10px 40px rgba(0,0,0,0.8);';
    var icon = '<div style="font-size:56px;margin-bottom:16px;">' + (locked ? '🔒' : '⚠️') + '</div>';
    var title = '<h2 style="font-size:22px;font-weight:700;margin-bottom:12px;color:' + (locked ? '#f43f5e' : '#f59e0b') + ';">' + (locked ? 'Account Locked' : 'Screenshot Attempt Detected') + '</h2>';
    var msg = '<p style="font-size:15px;line-height:1.6;color:#e5e7eb;white-space:pre-line;">' + message + '</p>';
    var btn = '';
    if (!locked) {
      // Warning (attempts 1 & 2) — "I understand" button cancels the popup
      // and returns the student to the page they were on.
      btn = '<button id="screenshot-policy-ok" style="margin-top:24px;background:#f59e0b;color:white;border:none;padding:12px 36px;border-radius:10px;cursor:pointer;font-size:15px;font-weight:600;">I understand</button>';
    } else {
      // Lock (attempt 3) — no cancel button, auto-redirect after 5s
      btn = '<p style="margin-top:24px;font-size:13px;color:#9ca3af;">You will be logged out shortly...</p>';
    }
    inner.innerHTML = icon + title + msg + btn;
    div.appendChild(inner);
    document.body.appendChild(div);

    if (!locked) {
      // Warning: clicking "I understand" or auto-close after 8s removes
      // the black screen + popup and returns the student to where they were.
      var okBtn = document.getElementById('screenshot-policy-ok');
      if (okBtn) {
        okBtn.addEventListener('click', function() {
          div.remove();
          removeBlackOut();
        });
      }
      setTimeout(function() {
        if (div.parentNode) div.remove();
        removeBlackOut();
      }, 8000);
    }
    // For locked: the black screen + popup stays until the redirect
    // (handled in recordScreenshotAttempt).
  }

  // ─── Record Screenshot Attempt ────────────────────────────────────
  // Called on every detected screenshot shortcut. The black screen is
  // ALREADY showing (added by handleScreenshotKey). This function calls
  // the API and then shows the warning/lock popup on top of the black
  // screen. If the API fails or the policy is disabled, the black screen
  // is removed.
  function recordScreenshotAttempt(source) {
    var token = getSessionToken();
    // Only call the API if we have a student session token (admin pages
    // don't set it, and the policy doesn't apply to admins).
    if (!token) {
      // No student token → remove the black screen and show generic popup
      removeBlackOut();
      showBlockPopup('Screenshots are disabled on this website.');
      return;
    }
    if (recording) {
      removeBlackOut(); // double-fire — just remove the black screen
      return;
    }
    recording = true;
    setTimeout(function() { recording = false; }, 800);

    // Clear clipboard immediately
    try { navigator.clipboard.writeText('').catch(function(){}); } catch(e) {}

    fetch('/api/students/screenshot-attempt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({
        fileId: 'student-portal',
        fileName: source || 'screenshot',
        page: window.location.pathname,
      }),
    })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (!data || data.error) {
          removeBlackOut();
          return;
        }
        if (data.enabled === false) {
          // Policy disabled by admin — remove black screen, no popup
          removeBlackOut();
          return;
        }
        currentAttempts = data.attempt;
        if (data.locked) {
          isLocked = true;
          // Show the lock overlay with the "Please call the admin" message.
          // The black screen + lock popup stays until the auto-redirect.
          showScreenshotOverlay(data.message || 'Your account has been locked due to restrictions. Please call the admin to unlock the account.', true);
          // Clear the session token immediately so no further API calls
          // can be made with it.
          window.__sessionToken = null;
          // Clear ALL persisted state so the student is properly logged out
          // after the redirect. The Zustand store uses 'vsbec-placement-store'
          // as its localStorage key — removing it ensures the student lands
          // on the landing page (not the dashboard) after the redirect.
          try {
            localStorage.removeItem('vsbec-placement-store');
            localStorage.removeItem('app-state');
            sessionStorage.clear();
          } catch (e) {}
          // Also tell the server to drop the session row so the same
          // student can't be re-validated by the heartbeat hook.
          try {
            fetch('/api/auth/session?token=' + encodeURIComponent(token), { method: 'DELETE' }).catch(function(){});
          } catch (e) {}
          // Redirect to the landing page after 5 seconds (the overlay's
          // "You will be logged out shortly..." countdown matches this).
          setTimeout(function() {
            // Hard redirect — use replace so the student can't use the
            // browser's back button to return to the locked dashboard.
            window.location.replace('/');
          }, 5000);
        } else if (data.action === 'WARNING') {
          showScreenshotOverlay(data.message || 'Screenshot attempt detected.', false);
        }
      })
      .catch(function() {
        // Network error — remove the black screen so the student isn't stuck
        removeBlackOut();
      });
  }

  // Create a custom popup that appears centered INSIDE the website.
  // On OK click or auto-close, the website returns to normal (overlay removed).
  // Skipped on admin pages (where __blockPopupDisabled is set by AdminLayout).
  function showBlockPopup(message) {
    if (window.__blockPopupDisabled) return;
    // Remove any existing popup
    var existing = document.getElementById('block-popup-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'block-popup-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';

    var popup = document.createElement('div');
    popup.style.cssText = 'background:#1e1e1e;color:white;border-radius:12px;padding:32px 40px;max-width:400px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.5);border:1px solid #333;';
    popup.innerHTML =
      '<div style="font-size:40px;margin-bottom:12px;">🚫</div>' +
      '<p style="font-size:16px;font-weight:600;margin-bottom:8px;">Action Blocked</p>' +
      '<p style="font-size:14px;opacity:0.8;line-height:1.5;">' + message + '</p>' +
      '<button id="block-popup-close" style="margin-top:16px;background:#10b981;color:white;border:none;padding:8px 24px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">OK</button>';

    overlay.appendChild(popup);
    document.body.appendChild(overlay);

    // Function to close popup AND remove any screenshot blank overlay
    // so the website returns to normal
    function closeAll() {
      if (overlay.parentNode) overlay.remove();
      // Also remove the screenshot blank overlay if it exists
      var blankOverlay = document.getElementById('screenshot-blank-overlay');
      if (blankOverlay && blankOverlay.parentNode) {
        blankOverlay.remove();
      }
    }

    // Auto-close after 2 seconds — website returns to normal
    var closeTimer = setTimeout(closeAll, 2000);

    // Close on button click — website returns to normal immediately
    overlay.querySelector('#block-popup-close').addEventListener('click', function() {
      clearTimeout(closeTimer);
      closeAll();
    });

    // Close on overlay click — website returns to normal
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        clearTimeout(closeTimer);
        closeAll();
      }
    });
  }

  // Add fade-in animation
  var animStyle = document.createElement('style');
  animStyle.textContent = '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }';
  document.head.appendChild(animStyle);

  // 1. Disable right-click context menu → show popup (not on admin pages)
  document.addEventListener('contextmenu', function(e) {
    if (window.__blockPopupDisabled) return;
    e.preventDefault();
    showBlockPopup('Right-click is disabled on this website.');
    return false;
  });

  // 2. Block ALL screenshot shortcuts:
  //    - PrintScreen (plain)
  //    - Win+PrintScreen (Windows captures to file)
  //    - Win+Shift+S (Snipping Tool / Snip & Sketch)
  //    - Win+Shift+T (Text Extractor / PowerToys)
  //    - Ctrl+PrintScreen
  //
  // We listen on BOTH keydown AND keyup because different browsers and OS
  // combos deliver the event at different phases. The recording flag
  // prevents double-counting within 800ms.
  function handleScreenshotKey(e, source) {
    if (window.__blockPopupDisabled) return; // admin pages
    var isScreenshotKey = false;
    // Standard PrintScreen (key, code, or keyCode 44)
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
      isScreenshotKey = true;
    }
    // Win+Shift+S (Snipping Tool) — metaKey is the Windows key on some browsers
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
      // Clear clipboard immediately
      try { navigator.clipboard.writeText('').catch(function(){}); } catch(err) {}
      // ─── IMMEDIATELY BLACK OUT THE ENTIRE SCREEN ───
      // This happens BEFORE the API call so the OS captures a black frame.
      // The black overlay covers the entire viewport including any iframes.
      blackOutScreen();
      // Now call the API (which will show the warning/lock popup on top
      // of the black screen when the response arrives).
      recordScreenshotAttempt(source);
      return false;
    }
  }

  document.addEventListener('keydown', function(e) {
    handleScreenshotKey(e, 'keydown');
  }, true);

  document.addEventListener('keyup', function(e) {
    handleScreenshotKey(e, 'keyup');
  }, true);

  // 2b. Detect clipboard reads (catches OS-level captures that don't fire
  //     a key event). This is ONLY for screenshot detection — it does NOT
  //     apply to copy/paste of small amounts of text. We only flag
  //     clipboard contents > 200 chars (a screenshot capture produces a
  //     large data URL or image blob, not a short copied string).
  //     Copy/paste of text is handled separately in sections 3-5 and only
  //     shows a block popup WITHOUT incrementing the screenshot counter.
  if (navigator.clipboard && navigator.clipboard.readText) {
    setInterval(function() {
      if (window.__blockPopupDisabled) return;
      navigator.clipboard.readText().then(function(text) {
        if (text && text.length > 200) {
          // Large clipboard content → likely a screenshot capture
          navigator.clipboard.writeText('').catch(function(){});
          if (getSessionToken()) {
            recordScreenshotAttempt('clipboard-large-read');
          } else {
            showBlockPopup('Screenshots are disabled on this website.');
          }
        }
      }).catch(function(){});
    }, 2000);
  }

  // 3. Block copy (Ctrl+C) → show popup
  document.addEventListener('copy', function(e) {
    if (window.__blockPopupDisabled) return;
    e.preventDefault();
    showBlockPopup('Copying content is disabled on this website.');
    return false;
  });

  // 4. Block paste (Ctrl+V) on non-input elements → show popup
  document.addEventListener('paste', function(e) {
    if (window.__blockPopupDisabled) return;
    if (!e.target.matches('input, textarea, [contenteditable]')) {
      e.preventDefault();
      showBlockPopup('Pasting is disabled on this website.');
      return false;
    }
  });

  // 5. Block cut (Ctrl+X) → show popup
  document.addEventListener('cut', function(e) {
    if (window.__blockPopupDisabled) return;
    e.preventDefault();
    showBlockPopup('Cutting content is disabled on this website.');
    return false;
  });

  // 6. Block keyboard shortcuts — only on student pages (admin pages
  //    set __blockPopupDisabled = true so the admin has full access).
  //    Blocks: Windows/Super key, Alt+Tab, Alt+F4, Ctrl+Esc, F1-F12,
  //    Ctrl+S/P/U/A, Ctrl+Shift+I/J/C, etc.
  document.addEventListener('keydown', function(e) {
    if (window.__blockPopupDisabled) return;
    // ── Windows / Meta key (Super key) ──
    // The Windows key opens the Start menu and is used in many OS shortcuts
    // (Win+E, Win+R, Win+L, etc.) that could be used to escape the
    // browser. We block it on student pages.
    if (e.key === 'Meta' || e.metaKey) {
      e.preventDefault();
      // Don't show a popup for every Meta keypress — just silently block it.
      return false;
    }
    // ── Alt+Tab (switch windows) ──
    // Note: browsers can't always intercept Alt+Tab, but we try.
    if (e.altKey && e.key === 'Tab') {
      e.preventDefault();
      return false;
    }
    // ── Alt+F4 (close window) ──
    if (e.altKey && (e.key === 'F4' || e.key === 'f4')) {
      e.preventDefault();
      return false;
    }
    // ── Ctrl+Escape (Windows Start menu) ──
    if (e.ctrlKey && e.key === 'Escape') {
      e.preventDefault();
      return false;
    }
    // ── F1 through F12 function keys ──
    // F1 = Help, F3 = Find, F5 = Refresh (we allow F5), F11 = Full screen,
    // F12 = Dev tools. Block all except F5 so the student can still refresh.
    if (/^F([1-9]|10|11|12)$/.test(e.key) && e.key !== 'F5') {
      e.preventDefault();
      showBlockPopup('Function keys are disabled on this website.');
      return false;
    }
    // Ctrl+S (save page)
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); showBlockPopup('Saving is disabled.'); return false; }
    // Ctrl+P (print)
    if (e.ctrlKey && e.key === 'p') { e.preventDefault(); showBlockPopup('Printing is disabled.'); return false; }
    // Ctrl+U (view source)
    if (e.ctrlKey && e.key === 'u') { e.preventDefault(); showBlockPopup('Viewing source is disabled.'); return false; }
    // Ctrl+Shift+I / J / C (dev tools)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault(); showBlockPopup('Developer tools are disabled.'); return false;
    }
    // Ctrl+A (select all)
    if (e.ctrlKey && e.key === 'a') { e.preventDefault(); showBlockPopup('Select all is disabled.'); return false; }
  });

  // 6b. Block the keyup event for the same keys (some browsers fire the
  //     event on keyup rather than keydown).
  document.addEventListener('keyup', function(e) {
    if (window.__blockPopupDisabled) return;
    if (e.key === 'Meta' || e.metaKey) { e.preventDefault(); return false; }
    if (e.altKey && e.key === 'Tab') { e.preventDefault(); return false; }
    if (e.altKey && (e.key === 'F4' || e.key === 'f4')) { e.preventDefault(); return false; }
    if (e.ctrlKey && e.key === 'Escape') { e.preventDefault(); return false; }
  }, true);

  // 7. Disable drag-and-drop
  document.addEventListener('dragstart', function(e) {
    if (window.__blockPopupDisabled) return;
    e.preventDefault();
    showBlockPopup('Dragging is disabled on this website.');
    return false;
  });

  // 8. Disable text selection via CSS
  var style = document.createElement('style');
  style.textContent = [
    'body { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }',
    'input, textarea, [contenteditable] { -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; }',
    'img { -webkit-user-drag: none; -moz-user-drag: none; pointer-events: auto; }',
    '.anti-capture-overlay {',
    '  position: fixed; top: 0; left: 0; right: 0; bottom: 0;',
    '  background: #1a1a1a; z-index: 999999;',
    '  display: none; align-items: center; justify-content: center;',
    '  color: white; font-family: sans-serif; font-size: 18px;',
    '}',
  ].join('\\n');
  document.head.appendChild(style);

  // 9. Blur overlay when tab loses visibility (anti-screen-capture)
  var overlay = document.createElement('div');
  overlay.className = 'anti-capture-overlay';
  overlay.innerHTML = '<div style="text-align:center;"><p>🔒 Content hidden</p><p style="font-size:14px;opacity:0.7;">This content is protected.</p></div>';
  document.body.appendChild(overlay);

  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      overlay.style.display = 'flex';
    } else {
      overlay.style.display = 'none';
    }
  });

  // 10. Detect dev tools via window size difference
  var devToolsCheck = function() {
    var threshold = 200;
    var widthDiff = window.outerWidth - window.innerWidth;
    var heightDiff = window.outerHeight - window.innerHeight;
    if (widthDiff > threshold || heightDiff > threshold) {
      document.body.style.filter = 'blur(10px)';
    } else {
      document.body.style.filter = '';
    }
  };
  setInterval(devToolsCheck, 1000);
  window.addEventListener('resize', devToolsCheck);

  // 11. Block screen recording via getDisplayMedia → show popup
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    navigator.mediaDevices.getDisplayMedia = function() {
      showBlockPopup('Screen recording is disabled on this website.');
      return Promise.reject(new Error('Screen recording is disabled'));
    };
  }

  // 12. Block printing
  window.onbeforeprint = function() {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#333;font-family:sans-serif;"><p>Printing is disabled on this website.</p></div>';
  };

  // 13. Add print CSS
  var printStyle = document.createElement('style');
  printStyle.textContent = '@media print { body { display: none !important; } }';
  document.head.appendChild(printStyle);

})();
</script>
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <RadixToaster />
        <SonnerToaster position="top-center" richColors closeButton duration={5000} />
        <span dangerouslySetInnerHTML={{ __html: antiCaptureScript }} />
      </body>
    </html>
  );
}
