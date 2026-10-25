'use client'
import { useEffect, useState, useCallback } from 'react'
import { apiGet, apiPost, avatarColor, initials, formatDate } from '@/lib/api'
import { AdminLayout } from './AdminLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import {
  Shield, ShieldAlert, ShieldCheck, Lock, Unlock, RefreshCw, Search, AlertTriangle,
  Users, Mail, Phone, Eye, Clock, Ban, RotateCcw, ShieldX,
} from 'lucide-react'
import { toast } from 'sonner'

// Restricted Actions — admin page that lists every student who is either
// currently locked (3 screenshot attempts) or has pending warnings (1 or 2
// attempts). The admin can unlock a locked account or reset the warning
// counter for a student who hasn't been locked yet.

interface RestrictedStudent {
  id: string
  registerNumber: string
  fullName: string
  collegeEmail: string
  mobile: string | null
  department: string | null
  year: string | null
  section: string | null
  cgpa: number | null
  placementStatus: string
  screenshotAttempts: number
  accountLocked: boolean
  lockedAt: string | null
  lockedReason: string | null
  updatedAt: string
}

interface RestrictedResponse {
  students: RestrictedStudent[]
  summary: { locked: number; warned: number; total: number }
}

type ActionTarget =
  | { student: RestrictedStudent; action: 'unlock' | 'reset-warnings' }
  | null

export function AdminRestrictedActions() {
  const [students, setStudents] = useState<RestrictedStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'locked' | 'warned'>('all')
  const [search, setSearch] = useState('')
  const [summary, setSummary] = useState({ locked: 0, warned: 0, total: 0 })
  const [actionTarget, setActionTarget] = useState<ActionTarget>(null)
  const [actionReason, setActionReason] = useState('')
  const [acting, setActing] = useState(false)

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const r = await apiGet<RestrictedResponse>(
        `/api/admin/restricted-actions?filter=${filter}`,
      )
      setStudents(r.students || [])
      setSummary(r.summary || { locked: 0, warned: 0, total: 0 })
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Failed to load restricted actions')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchStudents()
  }, [fetchStudents])

  // Filter by search term (register number, name, email) on the client side
  const filtered = students.filter((s) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.registerNumber.toLowerCase().includes(q) ||
      s.collegeEmail.toLowerCase().includes(q)
    )
  })

  const handleConfirmAction = async () => {
    if (!actionTarget) return
    setActing(true)
    try {
      const r = await apiPost<{ success: boolean; message: string }>(
        '/api/admin/restricted-actions/unlock',
        { studentId: actionTarget.student.id, action: actionTarget.action, reason: actionReason || undefined },
      )
      toast.success(r.message, { duration: 5000 })
      setActionTarget(null)
      setActionReason('')
      await fetchStudents()
    } catch (e: any) {
      toast.error(e.message || 'Failed to update student')
    } finally {
      setActing(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <ShieldAlert className="h-6 w-6 text-rose-600 dark:text-rose-400" />
              Restricted Actions
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage locked accounts and screenshot-policy warnings.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchStudents}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-rose-200 bg-gradient-to-br from-rose-50 to-red-50/50 dark:border-rose-900/50 dark:from-rose-950/30 dark:to-red-950/10">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Locked Accounts</p>
                  <p className="mt-1 text-3xl font-bold text-rose-600 dark:text-rose-400">{summary.locked}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Need admin permission to unlock</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/30">
                  <Lock className="h-6 w-6 text-rose-600 dark:text-rose-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-yellow-50/50 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-yellow-950/10">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Pending Warnings</p>
                  <p className="mt-1 text-3xl font-bold text-amber-600 dark:text-amber-400">{summary.warned}</p>
                  <p className="mt-1 text-xs text-muted-foreground">1–2 screenshot attempts recorded</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <ShieldAlert className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-teal-950/10">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Tracked</p>
                  <p className="mt-1 text-3xl font-bold text-emerald-600 dark:text-emerald-400">{summary.total}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Students on the restricted list</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Users className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, register number, email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filter} onValueChange={(v: 'all' | 'locked' | 'warned') => setFilter(v)}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All ({summary.total})</SelectItem>
                  <SelectItem value="locked">Locked only ({summary.locked})</SelectItem>
                  <SelectItem value="warned">Warnings only ({summary.warned})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Students list */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} className="h-56" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={<ShieldCheck className="h-6 w-6" />}
                title="No restricted students"
                description={
                  filter === 'locked'
                    ? 'No accounts are currently locked. All students can log in normally.'
                    : filter === 'warned'
                      ? 'No students have pending screenshot warnings.'
                      : 'No students have triggered the screenshot policy. Everything looks clean.'
                }
                action={<Button variant="outline" size="sm" onClick={fetchStudents}><RefreshCw className="mr-2 h-3.5 w-3.5" />Refresh</Button>}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((s) => (
              <RestrictedStudentCard
                key={s.id}
                student={s}
                onUnlock={() => setActionTarget({ student: s, action: 'unlock' })}
                onResetWarnings={() => setActionTarget({ student: s, action: 'reset-warnings' })}
              />
            ))}
          </div>
        )}

        {/* Action confirmation dialog */}
        <AlertDialog open={!!actionTarget} onOpenChange={(open) => { if (!open) { setActionTarget(null); setActionReason('') } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                {actionTarget?.action === 'unlock' ? (
                  <><Unlock className="h-5 w-5 text-emerald-600" />Unlock Account</>
                ) : (
                  <><RotateCcw className="h-5 w-5 text-amber-600" />Reset Warning Counter</>
                )}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3">
                  <p>
                    {actionTarget?.action === 'unlock'
                      ? <>You are about to unlock <strong>{actionTarget?.student.fullName}</strong> ({actionTarget?.student.registerNumber}). They will be able to log in immediately.</>
                      : <>You are about to reset the screenshot warning counter for <strong>{actionTarget?.student.fullName}</strong> ({actionTarget?.student.registerNumber}). This does NOT unlock a locked account — it only resets the warning count to 0.</>}
                  </p>
                  {actionTarget?.student.accountLocked && actionTarget?.action === 'unlock' && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs dark:border-rose-900/40 dark:bg-rose-900/10">
                      <p className="flex items-center gap-1.5 font-medium text-rose-700 dark:text-rose-300">
                        <Lock className="h-3 w-3" />
                        Locked at: {actionTarget?.student.lockedAt ? new Date(actionTarget?.student.lockedAt).toLocaleString() : 'unknown'}
                      </p>
                      <p className="mt-1 text-rose-600 dark:text-rose-400">
                        Reason: {actionTarget?.student.lockedReason || 'Not specified'}
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Admin note (optional)
                    </label>
                    <Input
                      placeholder="e.g. Spoke with student in person, verified identity..."
                      value={actionReason}
                      onChange={(e) => setActionReason(e.target.value)}
                    />
                  </div>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={acting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmAction}
                disabled={acting}
                className={actionTarget?.action === 'unlock'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-amber-600 hover:bg-amber-700'}
              >
                {acting ? 'Processing...' : actionTarget?.action === 'unlock' ? 'Unlock Account' : 'Reset Warnings'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  )
}

// ───────────────────────────────────────────────────────────────────────────
// RestrictedStudentCard — one card per restricted student
// ───────────────────────────────────────────────────────────────────────────

function RestrictedStudentCard({
  student,
  onUnlock,
  onResetWarnings,
}: {
  student: RestrictedStudent
  onUnlock: () => void
  onResetWarnings: () => void
}) {
  const isLocked = student.accountLocked
  const attempts = student.screenshotAttempts

  return (
    <Card
      className={
        isLocked
          ? 'border-rose-300 shadow-sm dark:border-rose-800'
          : 'border-amber-200 shadow-sm dark:border-amber-800'
      }
    >
      <CardContent className="p-5">
        {/* Header: avatar + name + status badge */}
        <div className="mb-3 flex items-start gap-3">
          <Avatar className="h-12 w-12 ring-2 ring-transparent">
            <AvatarFallback className={`${avatarColor(student.fullName)} text-sm font-semibold text-white`}>
              {initials(student.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-foreground">{student.fullName}</p>
            <p className="truncate text-xs text-muted-foreground">{student.registerNumber}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              {isLocked ? (
                <Badge variant="outline" className="border-rose-300 bg-rose-50 text-[10px] text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                  <Lock className="mr-0.5 h-2.5 w-2.5" />
                  LOCKED
                </Badge>
              ) : (
                <Badge variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                  <ShieldAlert className="mr-0.5 h-2.5 w-2.5" />
                  WARNING
                </Badge>
              )}
              {student.department && (
                <Badge variant="outline" className="text-[10px]">{student.department}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Screenshot attempts */}
        <div className="mb-3 rounded-lg border border-border bg-muted/30 p-3">
          <p className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            <Shield className="h-3 w-3" />
            Screenshot Policy Status
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className={`text-xl font-bold ${attempts >= 3 ? 'text-rose-600 dark:text-rose-400' : attempts >= 1 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {attempts}/3
              </p>
              <p className="text-[9px] uppercase text-muted-foreground">Attempts</p>
            </div>
            <div>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {Math.max(0, 3 - attempts)}
              </p>
              <p className="text-[9px] uppercase text-muted-foreground">Remaining</p>
            </div>
            <div>
              <p className={`text-xl font-bold ${isLocked ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {isLocked ? 'L' : 'OK'}
              </p>
              <p className="text-[9px] uppercase text-muted-foreground">Status</p>
            </div>
          </div>
          {student.lockedAt && (
            <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-3 w-3" />
              Locked {formatDate(student.lockedAt)}
            </p>
          )}
        </div>

        {/* Reason (if locked) */}
        {isLocked && student.lockedReason && (
          <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50/50 p-2.5 dark:border-rose-900/40 dark:bg-rose-900/10">
            <p className="flex items-start gap-1.5 text-[11px] text-rose-700 dark:text-rose-300">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span className="break-words">{student.lockedReason}</span>
            </p>
          </div>
        )}

        {/* Contact info */}
        <div className="mb-3 space-y-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 truncate">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{student.collegeEmail}</span>
          </div>
          {student.mobile && (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3 w-3 shrink-0" />
              <span>{student.mobile}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Users className="h-3 w-3 shrink-0" />
            <span>
              {student.year || '—'} · Sec {student.section || '—'} · CGPA {student.cgpa?.toFixed(2) || '—'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 border-t border-border pt-3">
          {isLocked ? (
            <Button
              size="sm"
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={onUnlock}
            >
              <Unlock className="mr-1.5 h-3.5 w-3.5" />
              Unlock Account
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/20"
              onClick={onResetWarnings}
              disabled={attempts === 0}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset Warnings
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
