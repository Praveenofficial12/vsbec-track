'use client'
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiPost, apiGet, apiDelete } from '@/lib/api'
import { toast } from 'sonner'

// Client-side single-session enforcement.
//
// While the user is logged in, this hook:
//   1. Sends a heartbeat to /api/auth/session every 10 seconds. Each
//      heartbeat refreshes the server-side `lastSeen` timestamp for this
//      tab's session token so the server knows the session is still alive.
//   2. If the heartbeat comes back with `reason: 'replaced'`, another tab
//      logged in with the same userKey, replacing this session. We show
//      the popup "This User is login in other window Please logout there
//      and then retry it again" and force-logout the current tab.
//   3. On unmount / page unload, sends a best-effort DELETE so the session
//      row is removed and the same user can immediately log in elsewhere.
//
// The hook also runs an initial validation on mount so that if a tab was
// closed and reopened (state persisted via zustand), we re-check whether the
// session is still the active one before trusting the persisted user.
const HEARTBEAT_INTERVAL_MS = 10 * 1000

export function useSessionHeartbeat() {
  const user = useAppStore((s) => s.user)
  const sessionToken = useAppStore((s) => s.sessionToken)
  const logout = useAppStore((s) => s.logout)
  const setView = useAppStore((s) => s.setView)
  const [shownWarning, setShownWarning] = useState(false)
  const logoutInProgress = useRef(false)

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
        { duration: 8000 },
      )
    } else if (reason === 'expired') {
      toast.error('Your session has expired (1 hour limit). Please log in again.', { duration: 6000 })
    } else {
      toast.error('Your session is no longer valid. Please log in again.', { duration: 6000 })
    }
    setShownWarning(true)
    setTimeout(() => { logoutInProgress.current = false }, 2000)
  }

  // Initial validation on mount + whenever the session token changes.
  useEffect(() => {
    if (!user || !sessionToken) return
    let cancelled = false
    apiGet<{ valid: boolean; reason?: string }>(
      `/api/auth/session?token=${encodeURIComponent(sessionToken)}`,
    )
      .then((res) => {
        if (cancelled) return
        if (!res.valid) {
          forceLogout((res.reason as 'replaced' | 'expired' | 'invalid') || 'invalid')
        }
      })
      .catch(() => { /* network blip — ignore, the heartbeat will retry */ })
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
            forceLogout((res.reason as 'replaced' | 'invalid') || 'invalid')
          }
        })
        .catch(() => { /* network error — ignore, retry next interval */ })
    }

    // First heartbeat shortly after mount so the server knows we're alive.
    const initialTimer = setTimeout(beat, 2000)
    const interval = setInterval(beat, HEARTBEAT_INTERVAL_MS)

    // On tab close / page unload, send a best-effort DELETE so the session
    // row is cleaned up immediately and the user can log in elsewhere.
    const onUnload = () => {
      if (sessionToken && navigator.sendBeacon) {
        // sendBeacon doesn't support DELETE with query params in all browsers,
        // so we fire a small POST instead via fetch keepalive.
        try {
          fetch(`/api/auth/session?token=${encodeURIComponent(sessionToken)}&_method=DELETE`, {
            method: 'DELETE',
            keepalive: true,
          }).catch(() => {})
        } catch { /* ignore */ }
      }
    }
    window.addEventListener('beforeunload', onUnload)

    return () => {
      cancelled = true
      clearTimeout(initialTimer)
      clearInterval(interval)
      window.removeEventListener('beforeunload', onUnload)
    }
     
  }, [user, sessionToken])
}
