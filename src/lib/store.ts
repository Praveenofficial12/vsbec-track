'use client'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SessionUser, ViewKey } from './types'

interface AppState {
  // Session
  user: SessionUser | null
  // Per-tab session token used for single-session enforcement. A fresh
  // UUID is issued by the login endpoint and the client heartbeats it to
  // /api/auth/session every ~10s. If another tab logs in with the same
  // userKey, this token becomes invalid and the client is forced out.
  sessionToken: string | null
  setUser: (user: SessionUser | null, sessionToken?: string | null) => void
  logout: () => void

  // View navigation
  view: ViewKey
  setView: (view: ViewKey) => void

  // Detail navigation params
  selectedStudentId: string | null
  selectedCompanyId: string | null
  selectedDriveId: string | null
  setSelected: (key: 'studentId' | 'companyId' | 'driveId', value: string | null) => void

  // Theme
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      sessionToken: null,
      setUser: (user, sessionToken) => set({
        user,
        sessionToken: sessionToken !== undefined ? sessionToken : get().sessionToken,
      }),
      logout: () => set({ user: null, sessionToken: null, view: 'landing', selectedStudentId: null, selectedCompanyId: null, selectedDriveId: null }),

      view: 'landing',
      setView: (view) => {
        set({ view })
        if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
      },

      selectedStudentId: null,
      selectedCompanyId: null,
      selectedDriveId: null,
      setSelected: (key, value) => {
        if (key === 'studentId') set({ selectedStudentId: value })
        else if (key === 'companyId') set({ selectedCompanyId: value })
        else if (key === 'driveId') set({ selectedDriveId: value })
      },

      theme: 'light',
      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        set({ theme: next })
        if (typeof document !== 'undefined') {
          document.documentElement.classList.toggle('dark', next === 'dark')
        }
      },
    }),
    {
      name: 'vsbec-placement-store',
      version: 2,
      partialize: (state) => ({ user: state.user, sessionToken: state.sessionToken, view: state.view, theme: state.theme }),
      // Migrate old persisted state that might have incompatible fields.
      // If the persisted state has an unknown view value, reset to 'landing'.
      migrate: (persisted: any, version: number) => {
        if (!persisted) return {}
        const validViews = ['landing', 'student-login', 'admin-login', 'student-register',
          'student-dashboard', 'student-profile', 'student-skills', 'student-companies',
          'student-drives', 'student-history', 'student-notifications', 'student-settings',
          'admin-dashboard', 'admin-students', 'admin-student-detail', 'admin-companies',
          'admin-company-detail', 'admin-drives', 'admin-drive-detail', 'admin-analytics',
          'admin-reports', 'admin-restricted-actions', 'admin-student-activity', 'admin-settings']
        const migrated: any = {}
        if (persisted.user && typeof persisted.user === 'object') {
          migrated.user = persisted.user
        }
        if (persisted.sessionToken && typeof persisted.sessionToken === 'string') {
          migrated.sessionToken = persisted.sessionToken
        }
        if (persisted.view && validViews.includes(persisted.view)) {
          migrated.view = persisted.view
        } else {
          migrated.view = 'landing'
        }
        if (persisted.theme === 'light' || persisted.theme === 'dark') {
          migrated.theme = persisted.theme
        } else {
          migrated.theme = 'light'
        }
        return migrated
      },
    }
  )
)

