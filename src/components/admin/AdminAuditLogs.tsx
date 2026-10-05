'use client'
import { useEffect, useState } from 'react'
import { apiGet, formatDateTime } from '@/lib/api'
import { AdminLayout } from './AdminLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import { ScrollText, Search, Shield, User, Building2, Target, Pencil, CheckCircle2, Award } from 'lucide-react'
import type { AuditLog } from '@/lib/types'

const ACTION_ICONS: Record<string, any> = {
  CREATE_DRIVE: Target,
  CREATE_COMPANY: Building2,
  UPDATE_COMPANY: Pencil,
  UPDATE_ROUND_RESULT: CheckCircle2,
  MARK_FINAL_RESULT: Award,
  MARK_SELECTED: Award,
  UPDATE_ATTENDANCE: User,
}

const ACTION_COLORS: Record<string, string> = {
  CREATE: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  UPDATE: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  DELETE: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
}

function getActionCategory(action: string): string {
  if (action.startsWith('CREATE')) return 'CREATE'
  if (action.startsWith('UPDATE') || action.startsWith('MARK')) return 'UPDATE'
  if (action.startsWith('DELETE')) return 'DELETE'
  return 'UPDATE'
}

export function AdminAuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    apiGet<{ logs: AuditLog[] }>('/api/audit-logs').then(r => setLogs(r.logs)).finally(() => setLoading(false))
  }, [])

  const filtered = logs.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return l.action.toLowerCase().includes(q) || l.studentName?.toLowerCase().includes(q) || l.companyName?.toLowerCase().includes(q) || l.adminEmail.toLowerCase().includes(q)
  })

  if (loading) return <AdminLayout><div className="p-6 space-y-3">{Array.from({length: 6}).map((_,i) => <CardSkeleton key={i} className="h-20" />)}</div></AdminLayout>

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><ScrollText className="h-6 w-6" /> Audit Logs</h1>
          <p className="text-sm text-muted-foreground">Track all admin actions and changes</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by action, student, company, admin..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Log ({filtered.length})</CardTitle>
            <CardDescription>Latest 100 actions</CardDescription>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <EmptyState icon={<ScrollText className="h-6 w-6" />} title="No logs found" description="Try adjusting your search." />
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin pr-2">
                {filtered.map((log) => {
                  const Icon = ACTION_ICONS[log.action] || ScrollText
                  const category = getActionCategory(log.action)
                  return (
                    <div key={log.id} className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/30">
                      <Avatar className="h-9 w-9 ring-2 ring-transparent transition-all group-hover:ring-primary/30">
                        <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-semibold text-white">
                          <Shield className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className={ACTION_COLORS[category]}>
                            <Icon className="mr-1 h-2.5 w-2.5" />
                            {log.action.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{formatDateTime(log.timestamp)}</span>
                        </div>
                        <p className="mt-1 text-sm">
                          <span className="text-muted-foreground">Admin</span>{' '}
                          <span className="font-medium">{log.adminEmail}</span>{' '}
                          {log.studentName && <><span className="text-muted-foreground">on student</span> <span className="font-medium">{log.studentName}</span>{' '}</>}
                          {log.companyName && <><span className="text-muted-foreground">for</span> <span className="font-medium">{log.companyName}</span>{' '}</>}
                          {log.driveName && <><span className="text-muted-foreground">drive</span> <span className="font-medium">{log.driveName}</span></>}
                        </p>
                        {log.previousValue && log.newValue && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            <span className="line-through">{log.previousValue}</span>
                            <span className="mx-1">→</span>
                            <span className="font-medium text-foreground">{log.newValue}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
