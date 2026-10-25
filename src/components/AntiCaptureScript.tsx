'use client'
import { useEffect } from 'react'

// This component injects the anti-capture script AFTER React hydration
// to prevent hydration mismatches. Using dangerouslySetInnerHTML on a
// <script> tag in the body causes React to complain about mismatched
// attributes between server and client render.
//
// By using useEffect, we ensure the script only runs in the browser
// AFTER the React tree has fully hydrated.
export function AntiCaptureScript() {
  useEffect(() => {
    const scriptContent = `
      // Defer the entire anti-capture script to run AFTER React hydration
      (function() {
        'use strict';

        function initAntiCapture() {
          var policyEnabled = true;
          var maxAttempts = 3;
          var currentAttempts = 0;
          var isLocked = false;
          var recording = false;

          function getSessionToken() {
            if (window.__sessionToken) return window.__sessionToken;
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
          setTimeout(fetchPolicyState, 500);
          setInterval(fetchPolicyState, 15000);

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
            blackOutScreen();
            var existing = document.getElementById('screenshot-policy-overlay');
            if (existing) existing.remove();
            var div = document.createElement('div');
            div.id = 'screenshot-policy-overlay';
            div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background:rgba(0,0,0,0.95);color:white;font-family:-apple-system,BlinkMacSystemFont,sans-serif;display:flex;align-items:center;justify-content:center;z-index:9999999;padding:24px;';
            var inner = document.createElement('div');
            inner.style.cssText = 'max-width:520px;text-align:center;background:#1a1a1a;border:1px solid ' + (locked ? '#f43f5e' : '#f59e0b') + ';border-radius:16px;padding:40px;box-shadow:0 10px 40px rgba(0,0,0,0.8);';
            var icon = '<div style="font-size:56px;margin-bottom:16px;">' + (locked ? '\\u{1F512}' : '\\u{26A0}\\u{FE0F}') + '</div>';
            var title = '<h2 style="font-size:22px;font-weight:700;margin-bottom:12px;color:' + (locked ? '#f43f5e' : '#f59e0b') + ';">' + (locked ? 'Account Locked' : 'Screenshot Attempt Detected') + '</h2>';
            var msg = '<p style="font-size:15px;line-height:1.6;color:#e5e7eb;white-space:pre-line;">' + message + '</p>';
            var btn = '';
            if (!locked) {
              btn = '<button id="screenshot-policy-ok" style="margin-top:24px;background:#f59e0b;color:white;border:none;padding:12px 36px;border-radius:10px;cursor:pointer;font-size:15px;font-weight:600;">I understand</button>';
            } else {
              btn = '<p style="margin-top:24px;font-size:13px;color:#9ca3af;">You will be logged out shortly...</p>';
            }
            inner.innerHTML = icon + title + msg + btn;
            div.appendChild(inner);
            document.body.appendChild(div);
            if (!locked) {
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
          }

          function recordScreenshotAttempt(source) {
            var token = getSessionToken();
            if (!token) {
              removeBlackOut();
              showBlockPopup('Screenshots are disabled on this website.');
              return;
            }
            if (recording) {
              removeBlackOut();
              return;
            }
            recording = true;
            setTimeout(function() { recording = false; }, 800);
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
                if (!data || data.error) { removeBlackOut(); return; }
                if (data.enabled === false) { removeBlackOut(); return; }
                currentAttempts = data.attempt;
                if (data.locked) {
                  isLocked = true;
                  showScreenshotOverlay(data.message || 'Your account has been locked due to restrictions. Please call the admin to unlock the account.', true);
                  window.__sessionToken = null;
                  try {
                    localStorage.removeItem('vsbec-placement-store');
                    localStorage.removeItem('app-state');
                    sessionStorage.clear();
                  } catch (e) {}
                  try {
                    fetch('/api/auth/session?token=' + encodeURIComponent(token), { method: 'DELETE' }).catch(function(){});
                  } catch (e) {}
                  setTimeout(function() {
                    window.location.replace('/');
                  }, 5000);
                } else if (data.action === 'WARNING') {
                  showScreenshotOverlay(data.message || 'Screenshot attempt detected.', false);
                }
              })
              .catch(function() { removeBlackOut(); });
          }

          function showBlockPopup(message) {
            if (window.__blockPopupDisabled) return;
            var existing = document.getElementById('block-popup-overlay');
            if (existing) existing.remove();
            var overlay = document.createElement('div');
            overlay.id = 'block-popup-overlay';
            overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:9999999;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s ease;';
            var popup = document.createElement('div');
            popup.style.cssText = 'background:#1e1e1e;color:white;border-radius:12px;padding:32px 40px;max-width:400px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:0 8px 32px rgba(0,0,0,0.5);border:1px solid #333;';
            popup.innerHTML =
              '<div style="font-size:40px;margin-bottom:12px;">\\u{1F6AB}</div>' +
              '<p style="font-size:16px;font-weight:600;margin-bottom:8px;">Action Blocked</p>' +
              '<p style="font-size:14px;opacity:0.8;line-height:1.5;">' + message + '</p>' +
              '<button id="block-popup-close" style="margin-top:16px;background:#10b981;color:white;border:none;padding:8px 24px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600;">OK</button>';
            overlay.appendChild(popup);
            document.body.appendChild(overlay);
            function closeAll() {
              if (overlay.parentNode) overlay.remove();
              var blankOverlay = document.getElementById('screenshot-blank-overlay');
              if (blankOverlay && blankOverlay.parentNode) blankOverlay.remove();
            }
            var closeTimer = setTimeout(closeAll, 2000);
            overlay.querySelector('#block-popup-close').addEventListener('click', function() {
              clearTimeout(closeTimer);
              closeAll();
            });
            overlay.addEventListener('click', function(e) {
              if (e.target === overlay) {
                clearTimeout(closeTimer);
                closeAll();
              }
            });
          }

          var animStyle = document.createElement('style');
          animStyle.textContent = '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }';
          document.head.appendChild(animStyle);

          document.addEventListener('contextmenu', function(e) {
            if (window.__blockPopupDisabled) return;
            e.preventDefault();
            showBlockPopup('Right-click is disabled on this website.');
            return false;
          });

          function handleScreenshotKey(e, source) {
            if (window.__blockPopupDisabled) return;
            var isScreenshotKey = false;
            if (e.key === 'PrintScreen' || e.code === 'PrintScreen' || e.keyCode === 44) {
              isScreenshotKey = true;
            }
            if (e.metaKey && e.shiftKey && (e.key === 'S' || e.key === 's')) {
              isScreenshotKey = true;
            }
            if (e.metaKey && e.shiftKey && (e.key === 'T' || e.key === 't')) {
              isScreenshotKey = true;
            }
            if (isScreenshotKey) {
              e.preventDefault();
              e.stopPropagation();
              try { navigator.clipboard.writeText('').catch(function(){}); } catch(err) {}
              blackOutScreen();
              recordScreenshotAttempt(source);
              return false;
            }
          }

          document.addEventListener('keydown', function(e) { handleScreenshotKey(e, 'keydown'); }, true);
          document.addEventListener('keyup', function(e) { handleScreenshotKey(e, 'keyup'); }, true);

          if (navigator.clipboard && navigator.clipboard.readText) {
            setInterval(function() {
              if (window.__blockPopupDisabled) return;
              navigator.clipboard.readText().then(function(text) {
                if (text && text.length > 200) {
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

          document.addEventListener('copy', function(e) {
            if (window.__blockPopupDisabled) return;
            e.preventDefault();
            showBlockPopup('Copying content is disabled on this website.');
            return false;
          });

          document.addEventListener('paste', function(e) {
            if (window.__blockPopupDisabled) return;
            if (!e.target.matches('input, textarea, [contenteditable]')) {
              e.preventDefault();
              showBlockPopup('Pasting is disabled on this website.');
              return false;
            }
          });

          document.addEventListener('cut', function(e) {
            if (window.__blockPopupDisabled) return;
            e.preventDefault();
            showBlockPopup('Cutting content is disabled on this website.');
            return false;
          });

          document.addEventListener('keydown', function(e) {
            if (window.__blockPopupDisabled) return;
            if (e.key === 'Meta' || e.metaKey) { e.preventDefault(); return false; }
            if (e.altKey && e.key === 'Tab') { e.preventDefault(); return false; }
            if (e.altKey && (e.key === 'F4' || e.key === 'f4')) { e.preventDefault(); return false; }
            if (e.ctrlKey && e.key === 'Escape') { e.preventDefault(); return false; }
            if (/^F([1-9]|10|11|12)$/.test(e.key) && e.key !== 'F5') {
              e.preventDefault();
              showBlockPopup('Function keys are disabled on this website.');
              return false;
            }
            if (e.ctrlKey && e.key === 's') { e.preventDefault(); showBlockPopup('Saving is disabled.'); return false; }
            if (e.ctrlKey && e.key === 'p') { e.preventDefault(); showBlockPopup('Printing is disabled.'); return false; }
            if (e.ctrlKey && e.key === 'u') { e.preventDefault(); showBlockPopup('Viewing source is disabled.'); return false; }
            if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c')) {
              e.preventDefault(); showBlockPopup('Developer tools are disabled.'); return false;
            }
            if (e.ctrlKey && e.key === 'a') { e.preventDefault(); showBlockPopup('Select all is disabled.'); return false; }
          });

          document.addEventListener('keyup', function(e) {
            if (window.__blockPopupDisabled) return;
            if (e.key === 'Meta' || e.metaKey) { e.preventDefault(); return false; }
            if (e.altKey && e.key === 'Tab') { e.preventDefault(); return false; }
            if (e.altKey && (e.key === 'F4' || e.key === 'f4')) { e.preventDefault(); return false; }
            if (e.ctrlKey && e.key === 'Escape') { e.preventDefault(); return false; }
          }, true);

          document.addEventListener('dragstart', function(e) {
            if (window.__blockPopupDisabled) return;
            e.preventDefault();
            showBlockPopup('Dragging is disabled on this website.');
            return false;
          });

          var style = document.createElement('style');
          style.textContent = [
            'body { -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; }',
            'input, textarea, [contenteditable] { -webkit-user-select: text; -moz-user-select: text; -ms-user-select: text; user-select: text; }',
            'img { -webkit-user-drag: none; -moz-user-drag: none; pointer-events: auto; }',
          ].join('\\n');
          document.head.appendChild(style);

          var overlay = document.createElement('div');
          overlay.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #1a1a1a; z-index: 999999; display: none; align-items: center; justify-content: center; color: white; font-family: sans-serif; font-size: 18px;';
          overlay.innerHTML = '<div style="text-align:center;"><p>\\u{1F512} Content hidden</p><p style="font-size:14px;opacity:0.7;">This content is protected.</p></div>';
          document.body.appendChild(overlay);
          document.addEventListener('visibilitychange', function() {
            if (document.hidden) {
              overlay.style.display = 'flex';
            } else {
              overlay.style.display = 'none';
            }
          });

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

          if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
            navigator.mediaDevices.getDisplayMedia = function() {
              showBlockPopup('Screen recording is disabled on this website.');
              return Promise.reject(new Error('Screen recording is disabled'));
            };
          }

          window.onbeforeprint = function() {
            document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;color:#333;font-family:sans-serif;"><p>Printing is disabled on this website.</p></div>';
          };

          var printStyle = document.createElement('style');
          printStyle.textContent = '@media print { body { display: none !important; } }';
          document.head.appendChild(printStyle);

        } // end of initAntiCapture

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', initAntiCapture);
        } else {
          setTimeout(initAntiCapture, 0);
        }
      })();
    `;

    const script = document.createElement('script');
    script.textContent = scriptContent;
    document.body.appendChild(script);

    return () => {
      // No cleanup needed — the script runs once and sets up event listeners
      // that live for the lifetime of the page
    };
  }, []);

  return null;
}
