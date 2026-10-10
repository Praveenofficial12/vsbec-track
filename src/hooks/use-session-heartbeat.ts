'use client'
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiPost, apiGet, apiDelete } from '@/lib/api'
import { toast } from 'sonner'

// Client-side single-session enforcement.
//
// While the user is logged in, this hook:
//   1. Sends a heartbeat to /api/auth/session every 10 seconds. Each
//      heartbeat refreshes the server-side `lastSeen` timestamp so the
//      server knows the session is still alive.
//   2. If the heartbeat comes back with `reason: 'replaced'`, another tab
//      logged in with the same userKey. We show the popup and force-logout.
//   3. On explicit logout (via the Logout button), the session row is
//      deleted so the same user can log in elsewhere.
//
// IMPORTANT: We do NOT delete the session on `beforeunload` / `pagehide`.
// This is intentional — when the user refreshes the browser (F5 / Ctrl+R),
// `beforeunload` fires but the user isn't actually leaving the page. If we
// deleted the session there, the user would be logged out on every refresh.
// Instead, the session stays alive because the 30-second heartbeat grace
// period covers the brief reload window. The session is only deleted when:
//   - The user clicks the Logout button (explicit)
//   - The 1-hour hard expiry is reached
//   - The 30-second heartbeat grace period expires (tab closed for real)
//   - Another tab logs in with the same email (replaced)
const HEARTBEAT_INTERVAL_MS = 10 * 1000

export function useSessionHeartbeat() {
  const user = useAppStore((s) => s.user)
  const sessionToken = useAppStore((s) => s.sessionToken)
  const logout = useAppStore((s) => s.logout)
  const setView = useAppStore((s) => s.setView)
  const [shownWarning, setShownWarning] = useState(false)
  const logoutInProgress = useRef(false)
  const hasValidated = useRef(false)

  // Force logout with the specific popup message.
  const forceLogout = (reason: 'replaced' | 'expired' | 'invalid') => {
    if (logoutInProgress.current) return
    logoutInProgress.current = true
    // Best-effort: tell the server to drop this session row.
    if (sessionToken) {
      apiDelete(`/api/auth/session?token=${encodeURIComponent(sessionToken)}`).catch(() => {})
    }
    logout()
    setView('landing')
    if (reason === 'replaced') {
      toast.error(
        'This user is logged in on another window. Please log out there and then try again.',
        { duration: 5000 },
      )
    } else if (reason === 'expired') {
      toast.error('Your session has expired (6 hour limit). Please log in again.', { duration: 5000 })
    } else {
      toast.error('Your session is no longer valid. Please log in again.', { duration: 5000 })
    }
    setShownWarning(true)
    setTimeout(() => { logoutInProgress.current = false }, 2000)
  }

  // Initial validation on mount — but with a retry. On browser refresh, the
  // server might briefly be unreachable (dev server restarting) or the
  // heartbeat might not have run yet. We give the session the benefit of the
  // doubt: if the first validation fails with 'expired' (stale heartbeat),
  // we immediately send a heartbeat to re-validate. Only if the heartbeat
  // also fails do we force-logout.
  useEffect(() => {
    if (!user || !sessionToken) return
    if (hasValidated.current) return // only validate once per mount
    hasValidated.current = true
    let cancelled = false

    const validateAndRecover = async () => {
      try {
        const res = await apiGet<{ valid: boolean; reason?: string }>(
          `/api/auth/session?token=${encodeURIComponent(sessionToken)}`,
        )
        if (cancelled) return
        if (res.valid) return // session is fine, stay logged in

        // If the session is 'expired' (stale heartbeat) or 'invalid', try
        // sending a heartbeat to re-validate. On browser refresh, the
        // heartbeat may have been stale (>30s since last beat) but the
        // session row still exists. A fresh heartbeat will update lastSeen
        // and the session becomes valid again.
        if (res.reason === 'expired' || res.reason === 'invalid') {
          try {
            const beatRes = await apiPost('/api/auth/session', { token: sessionToken })
            if (cancelled) return
            if (beatRes?.ok === false) {
              // Heartbeat also failed — session truly invalid. Force logout.
              forceLogout((beatRes.reason as 'replaced' | 'expired' | 'invalid') || 'invalid')
            }
            // Heartbeat succeeded — session is now valid, stay logged in.
          } catch {
            // Network error on heartbeat — don't logout on refresh, just retry later
          }
        } else if (res.reason === 'replaced') {
          // Another tab logged in — this one is replaced.
          forceLogout('replaced')
        }
      } catch {
        // Network error on initial validation — don't logout on refresh.
        // The periodic heartbeat will retry.
      }
    }

    validateAndRecover()
    return () => { cancelled = true }
     
  }, [user, sessionToken])

  // Periodic heartbeat.
  useEffect(() => {
    if (!user || !sessionToken) return
    let cancelled = false

    const beat = () => {
      apiPost('/api/auth/session', { token: sessionToken })
        .then((res: any) => {
          if (cancelled) return
          if (res?.ok === false) {
            // Session replaced or invalid — force logout with popup.
            const reason = res.reason as 'replaced' | 'expired' | 'invalid'
            if (reason === 'replaced') {
              forceLogout('replaced')
            } else if (reason === 'expired') {
              forceLogout('expired')
            }
            // For 'invalid' on heartbeat, don't force logout immediately —
            // could be a transient DB issue. The next heartbeat will retry.
          }
        })
        .catch(() => { /* network error — ignore, retry next interval */ })
    }

    // First heartbeat shortly after mount so the server knows we're alive.
    const initialTimer = setTimeout(beat, 3000)
    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS)

    // We intentionally do NOT add a `beforeunload` listener that deletes
    // the session. Browser refresh triggers `beforeunload` and we don't
    // want to log the user out when they refresh.

    return () => {
      cancelled = true
      clearTimeout(initialTimer)
      clearInterval(interval)
    }
     
  }, [user, sessionToken])
}

