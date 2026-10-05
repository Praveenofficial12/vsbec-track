'use client'
import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, GraduationCap, Eye, EyeOff, Loader2 } from 'lucide-react'
import { apiPost } from '@/lib/api'

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
        setUser(res.user)
        toast.success(`Welcome, ${res.user.name}!`)
        setView('student-dashboard')
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = () => {
    setRegisterNumber('VSB2400')
    setPassword('student@123')
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <button
            onClick={() => setView('landing')}
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </button>

          <Card className="overflow-hidden border-border shadow-soft-lg">
            <div className="relative bg-gradient-to-br from-emerald-600 to-teal-700 p-8 text-white">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <h1 className="text-2xl font-bold">Student Login</h1>
                <p className="mt-1 text-sm text-white/80">Access your placement dashboard</p>
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
                    placeholder="e.g. VSB2400"
                    required
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pwd">Password</Label>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-xs text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="inline h-3 w-3" /> : <Eye className="inline h-3 w-3" />} {showPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <Input
                    id="pwd"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="bg-background"
                  />
                </div>

                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
                  <p className="text-xs text-emerald-800 dark:text-emerald-300">
                    <strong>Demo account:</strong> Use <code className="rounded bg-emerald-100 px-1 font-mono dark:bg-emerald-900/40">VSB2400</code> / <code className="rounded bg-emerald-100 px-1 font-mono dark:bg-emerald-900/40">student@123</code>
                    <button type="button" onClick={fillDemo} className="ml-2 font-semibold underline">Use demo</button>
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
