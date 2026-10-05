'use client'
import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, GraduationCap, Eye, EyeOff, Loader2, Shield } from 'lucide-react'
import { apiPost } from '@/lib/api'

export function AdminLogin() {
  const setView = useAppStore((s) => s.setView)
  const setUser = useAppStore((s) => s.setUser)
  const [email, setEmail] = useState('Vsbec@2027')
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
            <div className="relative bg-gradient-to-br from-violet-600 to-purple-700 p-8 text-white">
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative">
                <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                  <Shield className="h-7 w-7" />
                </div>
                <h1 className="text-2xl font-bold">Admin Portal</h1>
                <p className="mt-1 text-sm text-white/80">Placement Officer / Staff access only</p>
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
                    placeholder="Vsbec@2027"
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

                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <strong>Demo credentials:</strong> Use <code className="rounded bg-amber-100 px-1 font-mono dark:bg-amber-900/40">Vsbec@2027</code> as login and <code className="rounded bg-amber-100 px-1 font-mono dark:bg-amber-900/40">admin@123</code> as password.
                  </p>
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
