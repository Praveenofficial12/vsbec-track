'use client'
import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
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
import { AdminRecommendations } from '@/components/admin/AdminRecommendations'
import { AdminReports } from '@/components/admin/AdminReports'
import { AdminAuditLogs } from '@/components/admin/AdminAuditLogs'
import { AdminSettings } from '@/components/admin/AdminSettings'

export default function Home() {
  const view = useAppStore((s) => s.view)
  const user = useAppStore((s) => s.user)
  const setView = useAppStore((s) => s.setView)

  // Apply theme on mount
  useEffect(() => {
    const theme = useAppStore.getState().theme
    if (theme === 'dark') document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [])

  // Guard: redirect to login if trying to access dashboard without session
  useEffect(() => {
    const studentViews = ['student-dashboard', 'student-profile', 'student-skills', 'student-companies', 'student-drives', 'student-history', 'student-notifications', 'student-settings']
    const adminViews = ['admin-dashboard', 'admin-students', 'admin-student-detail', 'admin-companies', 'admin-company-detail', 'admin-drives', 'admin-drive-detail', 'admin-analytics', 'admin-recommendations', 'admin-reports', 'admin-audit-logs', 'admin-settings']

    if (studentViews.includes(view) && !user) setView('student-login')
    if (adminViews.includes(view) && !user) setView('admin-login')
  }, [view, user, setView])

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
  if (view === 'admin-recommendations') return <AdminRecommendations />
  if (view === 'admin-reports') return <AdminReports />
  if (view === 'admin-audit-logs') return <AdminAuditLogs />
  if (view === 'admin-settings') return <AdminSettings />

  return <LandingPage />
}
