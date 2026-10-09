'use client'
import { StudentLayout } from './StudentLayout'
import { useAppStore } from '@/lib/store'
import { apiDelete } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { User, Bell, Shield, Palette, Globe, Key, Save, LogOut } from 'lucide-react'
import { toast } from 'sonner'

export function StudentSettings() {
  const user = useAppStore((s) => s.user)
  const logout = useAppStore((s) => s.logout)
  const setView = useAppStore((s) => s.setView)
  const sessionToken = useAppStore((s) => s.sessionToken)

  const handleLogout = async () => {
    // Drop this tab's session row so the same user can log in elsewhere.
    if (sessionToken) {
      apiDelete(`/api/auth/session?token=${encodeURIComponent(sessionToken)}`).catch(() => {})
    }
    logout()
    setView('landing')
  }

  return (
    <StudentLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your account preferences</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Full Name</Label>
                <Input value={user?.name || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Register Number</Label>
                <Input value={user?.registerNumber || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Email</Label>
                <Input value={user?.email || ''} disabled />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Role</Label>
                <Badge variant="outline">Student</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notification Preferences
            </CardTitle>
            <CardDescription>Choose what notifications you want to receive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'New company drive notifications', desc: 'Get notified when a new drive is announced', enabled: true },
              { label: 'Round result updates', desc: 'Get notified when your round results are updated', enabled: true },
              { label: 'Registration deadline reminders', desc: 'Get reminders before drive registrations close', enabled: true },
              { label: 'Final selection notifications', desc: 'Get notified when final results are announced', enabled: true },
              { label: 'Email notifications', desc: 'Receive notifications via email', enabled: false },
            ].map((pref, i) => (
              <div key={i} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium">{pref.label}</p>
                  <p className="text-xs text-muted-foreground">{pref.desc}</p>
                </div>
                <Switch defaultChecked={pref.enabled} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <LogOut className="h-4 w-4" />
              Sign Out
            </CardTitle>
            <CardDescription>Sign out of your account on this device</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={handleLogout} className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  )
}
