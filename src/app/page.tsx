'use client'
import { useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { apiPost } from '@/lib/api'
import { useSessionHeartbeat } from '@/hooks/use-session-heartbeat'
import { LandingPage } from '@/components/landing/LandingPage'
import { AdminLogin } from '@/components/auth/AdminLogin'
import { StudentLogin } from '@/components/auth/StudentLogin'
import { StudentRegister } from '@/components/auth/StudentRegister'
import { StudentDashboard } from '@/components/student/StudentDashboard'
import { StudentProfile } from '@/components/student/StudentProfile'
import { StudentSkills } from '@/components/student/StudentSkills'
import { StudentCompanies } from '@/components/student/StudentCompanies'
import { StudentDrives } from '@/components/student/StudentDrives'
import { StudentHistory } from '@/components/student/StudentHistory'
import { StudentNotifications } from '@/components/student/StudentNotifications'
import { StudentSettings } from '@/components/student/StudentSettings'
import { AdminDashboard } from '@/components/admin/AdminDashboard'
import { AdminStudents } from '@/components/admin/AdminStudents'
import { AdminStudentDetail } from '@/components/admin/AdminStudentDetail'
import { AdminCompanies } from '@/components/admin/AdminCompanies'
import { AdminCompanyDetail } from '@/components/admin/AdminCompanyDetail'
import { AdminDrives } from '@/components/admin/AdminDrives'
import { AdminDriveDetail } from '@/components/admin/AdminDriveDetail'
import { AdminAnalytics } from '@/components/admin/AdminAnalytics'
import { AdminReports } from '@/components/admin/AdminReports'
import { AdminStudentActivity } from '@/components/admin/AdminStudentActivity'
import { AdminRestrictedActions } from '@/components/admin/AdminRestrictedActions'
import { AdminSettings } from '@/components/admin/AdminSettings'

// Views that require an authenticated session. Each visit is logged to the
// backend via /api/log-activity so the placement office has an audit trail
// of which student / admin accessed which dashboard page.
const STUDENT_VIEWS = [
  'student-dashboard', 'student-profile', 'student-skills', 'student-companies',
  'student-drives', 'student-history', 'student-notifications', 'student-settings',
]
const ADMIN_VIEWS = [
  'admin-dashboard', 'admin-students', 'admin-student-detail', 'admin-companies',
  'admin-company-detail', 'admin-drives', 'admin-drive-detail', 'admin-analytics',
  'admin-reports', 'admin-restricted-actions', 'admin-student-activity', 'admin-settings',
]
const AUTHED_VIEWS = new Set([...STUDENT_VIEWS, ...ADMIN_VIEWS])

export default function Home() {
  const view = useAppStore((s) => s.view)
  const user = useAppStore((s) => s.user)
  const setView = useAppStore((s) => s.setView)
  const lastLoggedView = useRef<string | null>(null)

  // Single-session enforcement: while the user is logged in, this hook sends
  // a heartbeat every 10s. If another tab logs in with the same userKey,
  // this tab is force-logged-out with the popup "This user is logged in on
  // another window. Please log out there and then try again."
  useSessionHeartbeat()

  // Apply theme on mount
  useEffect(() => {
    const theme = useAppStore.getState().theme
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  // Guard: redirect to login if trying to access dashboard without session
  useEffect(() => {
    if (STUDENT_VIEWS.includes(view) && !user) setView('student-login')
    if (ADMIN_VIEWS.includes(view) && !user) setView('admin-login')
  }, [view, user, setView])

  // Fire-and-forget visit logging for authenticated dashboard visits.
  // We dedupe per view change so the same view doesn't get re-logged on every
  // re-render (e.g. theme toggle).
  useEffect(() => {
    if (!user) return
    if (!AUTHED_VIEWS.has(view)) return
    if (lastLoggedView.current === view) return
    lastLoggedView.current = view
    apiPost('/api/log-activity', {
      userType: user.role,
      userId: user.registerNumber || user.email,
      registerNumber: user.registerNumber || undefined,
      email: user.email,
      department: (user as any).department || undefined,
      action: 'VISIT',
      page: view,
    }).catch(() => { /* visit logging is best-effort — never block the UI */ })
  }, [view, user])

  // Public views
  if (view === 'landing') return <LandingPage />
  if (view === 'student-login') return <StudentLogin />
  if (view === 'admin-login') return <AdminLogin />
  if (view === 'student-register') return <StudentRegister />

  // Student views
  if (view === 'student-dashboard') return <StudentDashboard />
  if (view === 'student-profile') return <StudentProfile />
  if (view === 'student-skills') return <StudentSkills />
  if (view === 'student-companies') return <StudentCompanies />
  if (view === 'student-drives') return <StudentDrives />
  if (view === 'student-history') return <StudentHistory />
  if (view === 'student-notifications') return <StudentNotifications />
  if (view === 'student-settings') return <StudentSettings />

  // Admin views
  if (view === 'admin-dashboard') return <AdminDashboard />
  if (view === 'admin-students') return <AdminStudents />
  if (view === 'admin-student-detail') return <AdminStudentDetail />
  if (view === 'admin-companies') return <AdminCompanies />
  if (view === 'admin-company-detail') return <AdminCompanyDetail />
  if (view === 'admin-drives') return <AdminDrives />
  if (view === 'admin-drive-detail') return <AdminDriveDetail />
  if (view === 'admin-analytics') return <AdminAnalytics />
  if (view === 'admin-reports') return <AdminReports />
  if (view === 'admin-restricted-actions') return <AdminRestrictedActions />
  if (view === 'admin-student-activity') return <AdminStudentActivity />
  if (view === 'admin-settings') return <AdminSettings />

  return <LandingPage />
}
