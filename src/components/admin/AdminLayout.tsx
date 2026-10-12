'use client'
import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiDelete } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  GraduationCap, LayoutDashboard, Users, Building2, Target, BarChart3,
  Sparkles, FileText, Settings, LogOut, Menu, Bell, Search, ChevronRight, Shield, ExternalLink
} from 'lucide-react'
import { COLLEGE_LOGO } from '@/lib/college'
import type { ViewKey } from '@/lib/types'

const NAV_ITEMS: { key: ViewKey; label: string; icon: any; section: string }[] = [
  { key: 'admin-dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Overview' },
  { key: 'admin-students', label: 'Students', icon: Users, section: 'Overview' },
  { key: 'admin-companies', label: 'Companies', icon: Building2, section: 'Overview' },
  { key: 'admin-drives', label: 'Placement Drives', icon: Target, section: 'Overview' },
  { key: 'admin-analytics', label: 'Analytics', icon: BarChart3, section: 'Insights' },
  { key: 'admin-recommendations', label: 'Recommendations', icon: Sparkles, section: 'Insights' },
  { key: 'admin-reports', label: 'Reports', icon: FileText, section: 'Insights' },
  { key: 'admin-student-activity', label: 'Student Activity', icon: BarChart3, section: 'System' },
  { key: 'admin-settings', label: 'Settings', icon: Settings, section: 'System' },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user)
  const view = useAppStore((s) => s.view)
  const setView = useAppStore((s) => s.setView)
  const logout = useAppStore((s) => s.logout)
  const sessionToken = useAppStore((s) => s.sessionToken)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogout = async () => {
    // Drop this tab's session row so the same admin can log in elsewhere.
    if (sessionToken) {
      apiDelete(`/api/auth/session?token=${encodeURIComponent(sessionToken)}`).catch(() => {})
    }
    logout()
    setView('landing')
  }

  const sections = NAV_ITEMS.reduce((acc, item) => {
    if (!acc[item.section]) acc[item.section] = []
    acc[item.section].push(item)
    return acc
  }, {} as Record<string, typeof NAV_ITEMS>)

  const Sidebar = (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg overflow-hidden shadow-soft">
          <img src={COLLEGE_LOGO} alt="VSBEC Logo" className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">V.S.B. Engineering</p>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Admin Portal · Karur</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3">
        {Object.entries(sections).map(([sectionName, items]) => (
          <div key={sectionName} className="mb-4">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">{sectionName}</p>
            <div className="space-y-1">
              {items.map((item) => {
                const isActive = view === item.key
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setView(item.key)
                      setMobileOpen(false)
                    }}
                    className={cn(
                      'group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
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
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <a
          href="https://filehost.base44.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-900/20 dark:text-violet-300 dark:hover:bg-violet-900/30"
        >
          <ExternalLink className="h-4 w-4" />
          File Host
        </a>
        <div className="mb-2 flex items-center gap-3 rounded-lg bg-sidebar-accent/50 px-3 py-2">
          <Avatar className="h-9 w-9 ring-2 ring-sidebar-primary/30">
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-semibold text-white">
              {user?.name?.charAt(0)?.toUpperCase() || 'A'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-sidebar-border lg:block">
        {Sidebar}
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0">
          {Sidebar}
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 flex-col lg:pl-64">
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
                placeholder="Search students, companies..."
                onFocus={() => setView('admin-students')}
                className="w-full rounded-lg border border-border bg-muted/40 py-2 pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:bg-background focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="relative">
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
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-semibold text-white">
                {user?.name?.charAt(0)?.toUpperCase() || 'A'}
              </AvatarFallback>
            </Avatar>
          </div>
        </header>

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
              Are you sure you want to log out? You will need to log in again to access the admin portal.
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
    </div>
  )
}
