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
//   - PrintScreen (screenshot) → shows popup + clears clipboard
//   - Screen recording → shows popup
//   - Ctrl+S, Ctrl+P, Ctrl+U, F12, Ctrl+Shift+I/J/C → blocked
//   - Text selection, drag-and-drop
//   - Visibility change (blurs content when tab loses focus)
const antiCaptureScript = `
<script>
(function() {
  'use strict';

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

  // 2. Block PrintScreen (screenshot) — handles Win+PrintScreen, Ctrl+PrintScreen,
  //    and plain PrintScreen. Blanks screen + popup, auto-restore on OK.
  document.addEventListener('keyup', function(e) {
    if (window.__blockPopupDisabled) return;
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
      // Clear clipboard immediately
      if (navigator.clipboard) {
        navigator.clipboard.writeText('').catch(function(){});
      }
      // Temporarily blank the screen (removed when popup closes)
      var existing = document.getElementById('screenshot-blank-overlay');
      if (!existing) {
        var blankOverlay = document.createElement('div');
        blankOverlay.id = 'screenshot-blank-overlay';
        blankOverlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#1a1a1a;z-index:9999998;';
        document.body.appendChild(blankOverlay);
      }
      // Show popup — clicking OK or auto-close will remove the blank overlay
      showBlockPopup('Screenshots are disabled on this website. Click OK to return.');
    }
  });

  // Also catch keydown for Win+PrintScreen (some browsers send it on keydown)
  document.addEventListener('keydown', function(e) {
    if (window.__blockPopupDisabled) return;
    if (window.__blockPopupDisabled) return;
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText('').catch(function(){});
      }
      var existing = document.getElementById('screenshot-blank-overlay');
      if (!existing) {
        var blankOverlay = document.createElement('div');
        blankOverlay.id = 'screenshot-blank-overlay';
        blankOverlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:#1a1a1a;z-index:9999998;';
        document.body.appendChild(blankOverlay);
      }
      showBlockPopup('Screenshots are disabled on this website. Click OK to return.');
    }
  });

  // 2b. Detect screenshot via clipboard read
  if (navigator.clipboard && navigator.clipboard.readText) {
    setInterval(function() {
      navigator.clipboard.readText().then(function(text) {
        if (text && text.length > 50) {
          navigator.clipboard.writeText('').catch(function(){});
          showBlockPopup('Screenshots are disabled on this website. Click OK to return.');
        }
      }).catch(function(){});
    }, 1000);
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

  // 6. Block keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    if (window.__blockPopupDisabled) return;
    // Ctrl+S (save page)
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); showBlockPopup('Saving is disabled.'); return false; }
    // Ctrl+P (print)
    if (e.ctrlKey && e.key === 'p') { e.preventDefault(); showBlockPopup('Printing is disabled.'); return false; }
    // Ctrl+U (view source)
    if (e.ctrlKey && e.key === 'u') { e.preventDefault(); showBlockPopup('Viewing source is disabled.'); return false; }
    // F12 (dev tools)
    if (e.key === 'F12') { e.preventDefault(); showBlockPopup('Developer tools are disabled.'); return false; }
    // Ctrl+Shift+I / J / C (dev tools)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault(); showBlockPopup('Developer tools are disabled.'); return false;
    }
    // Ctrl+A (select all)
    if (e.ctrlKey && e.key === 'a') { e.preventDefault(); showBlockPopup('Select all is disabled.'); return false; }
    // Ctrl+C (copy) on non-input
    if (e.ctrlKey && e.key === 'c' && !e.target.matches('input, textarea, [contenteditable]')) {
      e.preventDefault(); showBlockPopup('Copying is disabled.'); return false;
    }
    // Ctrl+V (paste) on non-input
    if (e.ctrlKey && e.key === 'v' && !e.target.matches('input, textarea, [contenteditable]')) {
      e.preventDefault(); showBlockPopup('Pasting is disabled.'); return false;
    }
  });

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
