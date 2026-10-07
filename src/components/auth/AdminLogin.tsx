'use client'
import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Eye, EyeOff, Loader2, Shield, MapPin } from 'lucide-react'
import { apiPost } from '@/lib/api'
import { COLLEGE_NAME, COLLEGE_LOCATION, COLLEGE_IMAGES } from '@/lib/college'

export function AdminLogin() {
  const setView = useAppStore((s) => s.setView)
  const setUser = useAppStore((s) => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter both email and password')
      return
    }
    setLoading(true)
    try {
      const res = await apiPost('/api/auth/admin-login', { email, password })
      if (res.success) {
        setUser(res.user)
        toast.success(`Welcome back, ${res.user.name}!`)
        setView('admin-dashboard')
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-muted/30">
      {/* Animated background: college main building image at 10% opacity */}
      <div className="pointer-events-none absolute inset-0">
        <img
          src={COLLEGE_IMAGES.mainBuilding}
          alt="V.S.B. Engineering College main building"
          className="h-full w-full object-cover opacity-10"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-violet-50/40 via-purple-50/30 to-violet-100/40 dark:from-violet-950/30 dark:via-purple-950/20 dark:to-violet-950/40" />
      </div>

      {/* Floating orbs (violet/purple) */}
      <div className="animate-float pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-violet-400/30 blur-3xl" />
      <div className="animate-float-slow pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-purple-400/25 blur-3xl" />
      <div className="animate-float pointer-events-none absolute bottom-0 right-1/3 h-48 w-48 rounded-full bg-fuchsia-400/15 blur-3xl" />

      {/* Slow rotating ring */}
      <div className="animate-spin-slow pointer-events-none absolute -right-32 top-10 h-80 w-80 rounded-full border-2 border-dashed border-violet-400/30 dark:border-violet-700/30" />

      <div className="relative flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <button
            onClick={() => setView('landing')}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </button>

          <Card className="animate-scale-in overflow-hidden border-border shadow-soft-lg animate-glow-violet">
            <div className="relative bg-gradient-to-br from-violet-600 to-purple-700 p-8 text-white">
              {/* Marquee shimmer across the header */}
              <div className="animate-marquee pointer-events-none absolute inset-0 opacity-40" />
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <Shield className="h-7 w-7" />
                </div>
                <h1 className="animate-gradient-text-violet text-2xl font-bold">Admin Portal</h1>
                <p className="mt-1 text-sm text-white/80">Placement Officer / Staff access only</p>
                <p className="mt-2 flex items-center gap-1 text-xs text-white/70">
                  <MapPin className="h-3 w-3" /> {COLLEGE_NAME} · {COLLEGE_LOCATION}
                </p>
              </div>
            </div>

            <CardContent className="p-8">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Login Identifier</Label>
                  <Input
                    id="email"
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your login identifier"
                    required
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-xs text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="inline h-3 w-3" /> : <Eye className="inline h-3 w-3" />} {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="bg-background pr-10"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Access Admin Portal'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                <span className="text-muted-foreground">Are you a student?</span>{' '}
                <button onClick={() => setView('student-login')} className="font-medium text-emerald-600 hover:underline dark:text-emerald-400">
                  Student Login
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
