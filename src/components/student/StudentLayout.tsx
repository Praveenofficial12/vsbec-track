'use client'
import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { apiDelete, apiPost, apiGet } from '@/lib/api'
import { StudentAgent } from './StudentAgent'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  GraduationCap, LayoutDashboard, User, Award, Building2, Target,
  History, Bell, Settings, LogOut, Menu, Search, ChevronRight, Shield,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { COLLEGE_LOGO } from '@/lib/college'
import type { ViewKey } from '@/lib/types'

const NAV_ITEMS: { key: ViewKey; label: string; icon: any }[] = [
  { key: 'student-dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'student-profile', label: 'My Profile', icon: User },
  { key: 'student-skills', label: 'My Skills', icon: Award },
  { key: 'student-companies', label: 'Companies', icon: Building2 },
  { key: 'student-drives', label: 'My Drives', icon: Target },
  { key: 'student-history', label: 'Placement History', icon: History },
  { key: 'student-notifications', label: 'Notifications', icon: Bell },
  { key: 'student-settings', label: 'Settings', icon: Settings },
]

export function StudentLayout({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user)
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)
  const logout = useAppStore((s) => s.logout)
  const sessionToken = useAppStore((s) => s.sessionToken)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showLockOverlay, setShowLockOverlay] = useState(false)
  const [lockMessage, setLockMessage] = useState('')
  const [showWarningOverlay, setShowWarningOverlay] = useState(false)
  const [warningMessage, setWarningMessage] = useState('')
  const policyCheckRef = useRef(false)
  const lockOverlayRef = useRef(false)

  // ─── Screenshot Policy Hook ───────────────────────────────────────────
  // Attaches a PrintScreen keydown + keyup listener to the MAIN window
  // (not the file viewer iframe) so screenshot attempts are caught on
  // every student page. The listener calls /api/students/screenshot-attempt
  // which increments the attempt counter and returns the new state.
  //
  // Behavior:
  //   - If the policy is disabled by the admin → listener is a no-op
  //   - Attempt 1 or 2 → warning overlay with attempt count + remaining
  //   - Attempt 3 → lock overlay, sessions deleted, student force-logged-out
  //
  // We also poll the current policy state on mount (in case the admin
  // toggled it since the last login) so we know whether to attach the
  // listener at all.
  useEffect(() => {
    if (!sessionToken) return
    if (policyCheckRef.current) return // only check once per mount
    policyCheckRef.current = true

    let policyEnabled = true
    let maxAttempts = 3
    let currentAttempts = 0

    // Fetch the current policy state once on mount.
    apiGet<{ enabled: boolean; maxAttempts: number; attempt: number; locked: boolean }>(
      `/api/students/screenshot-attempt?token=${encodeURIComponent(sessionToken)}`,
    ).then((state) => {
      policyEnabled = state.enabled
      maxAttempts = state.maxAttempts
      currentAttempts = state.attempt
      // If the student already has attempts, show a reminder toast so they
      // know they're on thin ice.
      if (policyEnabled && currentAttempts > 0 && !state.locked) {
        const remaining = Math.max(0, maxAttempts - currentAttempts)
        toast.warning(
          `Screenshot policy active — ${currentAttempts}/${maxAttempts} attempts recorded. ${remaining} remaining before lock.`,
          { duration: 6000 },
        )
      }
    }).catch(() => { /* policy check is best-effort */ })

    // The actual PrintScreen listener. Fires on BOTH keydown and keyup
    // because some browsers only emit one of them.
    const recordAttempt = () => {
      if (lockOverlayRef.current) return
      // Empty the clipboard immediately so the screenshot is useless
      try { navigator.clipboard.writeText('').catch(() => {}) } catch {}
      apiPost('/api/students/screenshot-attempt', {
        fileId: 'student-portal',
        fileName: 'student-portal-page',
        page: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      }).then((res: any) => {
        if (!res) return
        if (res.enabled === false) return // policy disabled by admin
        if (res.locked) {
          // Account locked → show the lock overlay then force-logout
          lockOverlayRef.current = true
          setLockMessage(res.message || 'Your account has been locked due to restrictions. Please call the admin to unlock the account.')
          setShowLockOverlay(true)
          // Trigger an immediate heartbeat which will fail (session deleted)
          // → the heartbeat hook will route the student to the login page.
          setTimeout(() => {
            apiPost('/api/auth/session', { token: sessionToken }).catch(() => {})
          }, 3000)
        } else if (res.action === 'WARNING') {
          setWarningMessage(res.message)
          setShowWarningOverlay(true)
        }
      }).catch(() => { /* network error — don't block */ })
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault()
        recordAttempt()
      }
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        e.preventDefault()
        // Also try to clear the clipboard in case keyup doesn't fire
        try { navigator.clipboard.writeText('').catch(() => {}) } catch {}
        // Some browsers need the API call on keydown to register
        recordAttempt()
      }
    }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
    }
  }, [sessionToken])

  const handleLogout = async () => {
    // Tell the server to drop this tab's session row so the same user can
    // immediately log in elsewhere (single-session enforcement).
    if (sessionToken) {
      apiDelete(`/api/auth/session?token=${encodeURIComponent(sessionToken)}`).catch(() => {})
    }
    logout()
    setView('landing')
  }

  const Sidebar = (
    <div className="flex h-full flex-col bg-sidebar">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden shadow-soft">
          <img src={COLLEGE_LOGO} alt="VSBEC Logo" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">V.S.B. Engineering</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Student Portal · Karur</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = view === item.key
          return (
            <button
              key={item.key}
              onClick={() => {
                setView(item.key)
                setMobileOpen(false)
              }}
              className={cn(
                'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-soft'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              )}
            >
              <item.icon className={cn('h-4 w-4 shrink-0 transition-transform group-hover:scale-110', isActive && 'scale-110')} />
              {item.label}
              {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
            </button>
          )
        })}
      </nav>

      {/* User & Logout */}
      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 flex items-center gap-3 rounded-lg bg-sidebar-accent/50 px-3 py-2">
          <Avatar className="h-9 w-9 ring-2 ring-sidebar-primary/30">
            <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-semibold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'S'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.registerNumber}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowLogoutConfirm(true)} className="w-full justify-start text-muted-foreground hover:text-foreground">
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border lg:block">
        {Sidebar}
      </aside>

      {/* Mobile Sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          {Sidebar}
        </SheetContent>
      </Sheet>

      {/* Main */}
      <div className="flex flex-1 flex-col lg:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button className="rounded-md p-2 hover:bg-accent lg:hidden">
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
          </Sheet>

          <div className="flex flex-1 items-center gap-2">
            <div className="relative hidden max-w-md flex-1 sm:block">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search drives, companies..."
                className="w-full rounded-lg border border-border bg-muted/40 py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setView('student-notifications')} className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLogoutConfirm(true)}
              className="hidden items-center gap-2 text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 sm:inline-flex"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm font-medium">Logout</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowLogoutConfirm(true)}
              className="text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 sm:hidden"
            >
              <LogOut className="h-4 w-4" />
            </Button>
            <Avatar className="h-9 w-9 ring-2 ring-primary/20">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-semibold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || 'S'}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>

      {/* Logout confirmation popup */}
      <AlertDialog open={showLogoutConfirm} onOpenChange={setShowLogoutConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to log out? You will need to log in again to access the portal.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-rose-600 hover:bg-rose-700"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AI Assistant Chatbot */}
      <StudentAgent />

      {/* Screenshot Warning Overlay — shown on attempts 1 and 2 */}
      {showWarningOverlay && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 p-4"
          onClick={() => setShowWarningOverlay(false)}
        >
          <div
            className="relative max-w-md rounded-2xl border border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 p-8 text-center shadow-2xl dark:border-amber-700 dark:from-amber-950 dark:to-orange-950"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowWarningOverlay(false)}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700 transition-colors hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300"
              title="Dismiss"
            >
              ✕
            </button>
            <div className="mb-3 text-5xl">⚠️</div>
            <h2 className="mb-3 text-xl font-bold text-amber-700 dark:text-amber-300">
              Screenshot Attempt Detected
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-amber-800 dark:text-amber-200">
              {warningMessage}
            </p>
            <Button
              size="sm"
              className="mt-5 bg-amber-600 hover:bg-amber-700"
              onClick={() => setShowWarningOverlay(false)}
            >
              I understand
            </Button>
          </div>
        </div>
      )}

      {/* Account Locked Overlay — shown on attempt 3, cannot be dismissed */}
      {showLockOverlay && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/95 p-4">
          <div className="max-w-md rounded-2xl border border-rose-500 bg-gradient-to-br from-rose-50 to-red-50 p-8 text-center shadow-2xl dark:from-rose-950 dark:to-red-950">
            <div className="mb-4 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/40">
                <Lock className="h-10 w-10 text-rose-600 dark:text-rose-400" />
              </div>
            </div>
            <h2 className="mb-3 text-2xl font-bold text-rose-700 dark:text-rose-300">
              Account Locked
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-rose-800 dark:text-rose-200">
              {lockMessage || 'Your account has been locked due to restrictions. Please call the admin to unlock the account.'}
            </p>
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-900/20 dark:text-rose-300">
              <p className="font-semibold">What happened?</p>
              <p className="mt-1">
                You pressed the PrintScreen key 3 times while using the student portal.
                As a security measure, your account has been locked to prevent
                unauthorized screen capture of placement materials.
              </p>
              <p className="mt-2 font-semibold">How to unlock:</p>
              <p className="mt-1">
                Please contact the VSBEC Placement Office. An admin will verify
                your identity and unlock your account from the Restricted Actions panel.
              </p>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-rose-600 dark:text-rose-400">
              <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
              <span>You will be logged out shortly...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
