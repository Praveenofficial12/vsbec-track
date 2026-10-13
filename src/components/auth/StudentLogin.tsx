'use client'
import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, GraduationCap, Eye, EyeOff, Loader2, MapPin } from 'lucide-react'
import { apiPost } from '@/lib/api'
import { COLLEGE_NAME, COLLEGE_LOCATION, COLLEGE_IMAGES } from '@/lib/college'

export function StudentLogin() {
  const setView = useAppStore((s) => s.setView)
  const setUser = useAppStore((s) => s.setUser)
  const [registerNumber, setRegisterNumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registerNumber || !password) {
      toast.error('Please enter register number and password')
      return
    }
    setLoading(true)
    try {
      const res = await apiPost('/api/auth/student-login', { registerNumber, password })
      if (res.success) {
        // Persist the per-tab session token alongside the user so the
        // heartbeat hook can keep the session alive.
        setUser(res.user, res.sessionToken)
        toast.success(`Welcome, ${res.user.name}!`)
        setView('student-dashboard')
      }
    } catch (err: any) {
      // The API returns a 403 with a `locked: true` flag when the student's
      // account has been locked due to the screenshot policy (3 attempts).
      // We surface a longer-lasting, more prominent toast for that case.
      const isLocked = err?.data?.locked || /locked/i.test(err.message || '')
      if (isLocked) {
        toast.error(
          err?.data?.error || err.message || 'Your account is locked. Please contact the placement office.',
          { duration: 8000 },
        )
      } else {
        toast.error(err.message || 'Login failed', { duration: 5000 })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-muted/30">
      {/* Animated background: college entrance arch image at 10% opacity */}
      <div className="pointer-events-none absolute inset-0">
        <img
          src={COLLEGE_IMAGES.entranceGate}
          alt="V.S.B. Engineering College entrance arch"
          className="h-full w-full object-cover opacity-10"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-teal-50/30 to-emerald-100/40 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-emerald-950/40" />
      </div>

      {/* Floating orbs */}
      <div className="animate-float pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-emerald-400/30 blur-3xl" />
      <div className="animate-float-slow pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-teal-400/25 blur-3xl" />
      <div className="animate-float pointer-events-none absolute bottom-0 right-1/3 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl" />

      {/* Slow rotating ring */}
      <div className="animate-spin-slow pointer-events-none absolute -right-32 top-10 h-80 w-80 rounded-full border-2 border-dashed border-emerald-400/30 dark:border-emerald-700/30" />

      <div className="relative flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <button
            onClick={() => setView('landing')}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </button>

          <Card className="animate-scale-in overflow-hidden border-border shadow-soft-lg">
            <div className="relative bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white">
              {/* Marquee shimmer across the header */}
              <div className="animate-marquee pointer-events-none absolute inset-0 opacity-40" />
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <h1 className="animate-gradient-text text-2xl font-bold">Student Login</h1>
                <p className="mt-1 text-sm text-white/80">Access your placement dashboard</p>
                <p className="mt-2 flex items-center gap-1 text-xs text-white/70">
                  <MapPin className="h-3 w-3" /> {COLLEGE_NAME} · {COLLEGE_LOCATION}
                </p>
              </div>
            </div>

            <CardContent className="p-8">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg">Register Number / Email</Label>
                  <Input
                    id="reg"
                    type="text"
                    value={registerNumber}
                    onChange={(e) => setRegisterNumber(e.target.value)}
                    placeholder="e.g. VSB2400 or college email"
                    required
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pwd">Department Password</Label>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-xs text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="inline h-3 w-3" /> : <Eye className="inline h-3 w-3" />} {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <Input
                    id="pwd"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your department password"
                    required
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your department password is your login password. Contact your placement coordinator if you don't have it.
                  </p>
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Login to Dashboard'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">New student?</span>{' '}
                <button onClick={() => setView('student-register')} className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                  Register here
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
