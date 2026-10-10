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
//   - Right-click context menu
//   - PrintScreen (clears clipboard + shows alert)
//   - Ctrl+S (save), Ctrl+P (print), Ctrl+U (view source)
//   - F12, Ctrl+Shift+I/J/C (dev tools)
//   - Text selection (via CSS user-select: none)
//   - Drag-and-drop of images
//   - Screen capture API (when supported by the browser)
//   - Visibility change detection (blurs content when tab loses focus)
//   - Camera access detection (notifies if camera is activated)
const antiCaptureScript = `
<script>
(function() {
  'use strict';

  // 1. Disable right-click context menu
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  });

  // 2. Block PrintScreen — clear clipboard and show alert
  document.addEventListener('keyup', function(e) {
    if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
      // Try to clear the clipboard
      if (navigator.clipboard) {
        navigator.clipboard.writeText('').catch(function(){});
      }
      // Show alert
      alert('Screenshots are disabled on this website.');
    }
  });

  // Also check clipboard periodically for screenshot evidence
  if (navigator.clipboard && navigator.clipboard.readText) {
    var lastClip = '';
    setInterval(function() {
      navigator.clipboard.readText().then(function(text) {
        if (text && text !== lastClip && text.length > 100) {
          // Clipboard was modified — possibly a screenshot
          navigator.clipboard.writeText('').catch(function(){});
        }
        lastClip = text;
      }).catch(function(){});
    }, 2000);
  }

  // 3. Block keyboard shortcuts: Ctrl+S, Ctrl+P, Ctrl+U, F12, Ctrl+Shift+I/J/C
  document.addEventListener('keydown', function(e) {
    // Ctrl+S (save page)
    if (e.ctrlKey && e.key === 's') { e.preventDefault(); return false; }
    // Ctrl+P (print)
    if (e.ctrlKey && e.key === 'p') { e.preventDefault(); return false; }
    // Ctrl+U (view source)
    if (e.ctrlKey && e.key === 'u') { e.preventDefault(); return false; }
    // F12 (dev tools)
    if (e.key === 'F12') { e.preventDefault(); return false; }
    // Ctrl+Shift+I / J / C (dev tools)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
      e.preventDefault(); return false;
    }
    // Ctrl+A (select all) — block to prevent easy copying
    if (e.ctrlKey && e.key === 'a') { e.preventDefault(); return false; }
    // Ctrl+C (copy) — block on non-input elements
    if (e.ctrlKey && e.key === 'c' && !e.target.matches('input, textarea, [contenteditable]')) {
      e.preventDefault(); return false;
    }
  });

  // 4. Disable drag-and-drop (prevents dragging images to desktop)
  document.addEventListener('dragstart', function(e) {
    e.preventDefault();
    return false;
  });

  // 5. Disable text selection via CSS (added dynamically)
  var style = document.createElement('style');
  style.textContent = [
    'body { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }',
    'input, textarea, [contenteditable] { -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; }',
    'img { -webkit-user-drag: none; -moz-user-drag: none; pointer-events: auto; }',
    // Add a blur overlay when the page is not visible (anti-screen-capture)
    '.anti-capture-overlay {',
    '  position: fixed; top: 0; left: 0; right: 0; bottom: 0;',
    '  background: #1a1a1a; z-index: 999999;',
    '  display: none; align-items: center; justify-content: center;',
    '  color: white; font-family: sans-serif; font-size: 18px;',
    '}',
  ].join('\\n');
  document.head.appendChild(style);

  // 6. Add blur overlay — shown when the tab loses visibility (screen capture
  //    tools often switch tabs/windows, which triggers visibilitychange)
  var overlay = document.createElement('div');
  overlay.className = 'anti-capture-overlay';
  overlay.innerHTML = '<div style="text-align:center;"><p>🔒 Content hidden</p><p style="font-size:14px;opacity:0.7;">This content is protected. Please return to the tab to view it.</p></div>';
  document.body.appendChild(overlay);

  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      overlay.style.display = 'flex';
    } else {
      overlay.style.display = 'none';
    }
  });

  // 7. Detect dev tools via window size difference
  var devToolsCheck = function() {
    var threshold = 200;
    var widthDiff = window.outerWidth - window.innerWidth;
    var heightDiff = window.outerHeight - window.innerHeight;
    if (widthDiff > threshold || heightDiff > threshold) {
      // Dev tools likely open — blur the content
      document.body.style.filter = 'blur(10px)';
    } else {
      document.body.style.filter = '';
    }
  };
  setInterval(devToolsCheck, 1000);
  window.addEventListener('resize', devToolsCheck);

  // 8. Try to block screen capture via getDisplayMedia (if browser supports it)
  if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
    var origGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getDisplayMedia = function() {
      alert('Screen recording is disabled on this website.');
      return Promise.reject(new Error('Screen recording is disabled'));
    };
  }

  // 9. Detect if the camera is accessed (for phone screen capture)
  if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    var origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = function(constraints) {
      if (constraints && constraints.video) {
        // Allow the camera for profile photos etc., but log it
        console.warn('Camera access detected — screen capture may be in progress.');
      }
      return origGetUserMedia(constraints);
    };
  }

  // 10. Detect screen capture via the Screen Capture API
  if ('getScreenDetails' in window) {
    // Browser supports Screen Details API — monitor for screen changes
    window.getScreenDetails().then(function(screenDetails) {
      screenDetails.addEventListener('change', function() {
        // Screen configuration changed — could be a capture tool
        console.warn('Screen configuration changed.');
      });
    }).catch(function(){});
  }

  // 11. Block printing
  window.onbeforeprint = function() {
    document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#333;font-family:sans-serif;"><p>Printing is disabled on this website.</p></div>';
  };

  // 12. Add print CSS to hide everything when printing
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
        <SonnerToaster position="top-right" richColors closeButton duration={5000} />
        <span dangerouslySetInnerHTML={{ __html: antiCaptureScript }} />
      </body>
    </html>
  );
}
