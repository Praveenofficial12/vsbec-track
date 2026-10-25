'use client'
import { useEffect, useState, useCallback } from 'react'
import { AdminLayout } from './AdminLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import { StatCard } from '@/components/common/StatCard'
import { apiGet, apiDelete, avatarColor, initials, formatDate } from '@/lib/api'
import { Search, Download, Filter, RefreshCw, Users, LogIn, LogOut, UserPlus, Eye, Activity, XCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

const ACTIONS = [
  { value: 'ALL', label: 'All Actions' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'LOGIN_FAILED', label: 'Login Failed' },
  { value: 'REGISTER', label: 'Registration' },
  { value: 'VISIT', label: 'Page Visit' },
  { value: 'LOGOUT', label: 'Logout' },
]
const USER_TYPES = ['ALL', 'STUDENT', 'ADMIN']

export function AdminStudentActivity() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('ALL')
  const [userTypeFilter, setUserTypeFilter] = useState('STUDENT')
  const [stats, setStats] = useState({ total: 0, logins: 0, registrations: 0, failedLogins: 0 })

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (actionFilter !== 'ALL') params.append('action', actionFilter)
      if (userTypeFilter !== 'ALL') params.append('userType', userTypeFilter)
      if (search) params.append('search', search)
      params.append('limit', '200')
      const r = await apiGet<{ logs: any[] }>(`/api/admin/activity-logs?${params}`)
      setLogs(r.logs || [])
      // Calculate stats from all logs
      const allR = await apiGet<{ logs: any[] }>(`/api/admin/activity-logs?userType=STUDENT&limit=500`)
      const allLogs = allR.logs || []
      setStats({
        total: allLogs.length,
        logins: allLogs.filter(l => l.action === 'LOGIN').length,
        registrations: allLogs.filter(l => l.action === 'REGISTER').length,
        failedLogins: allLogs.filter(l => l.action === 'LOGIN_FAILED').length,
      })
    } catch (e: any) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [actionFilter, userTypeFilter, search])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleExport = () => {
    if (logs.length === 0) {
      toast.error('No logs to export')
      return
    }
    const headers = ['Timestamp', 'User ID', 'User Type', 'Action', 'Detail', 'IP Address', 'User Agent']
    const rows = logs.map(l => [
      new Date(l.timestamp).toISOString(),
      l.userId || '',
      l.userType || '',
      l.action || '',
      l.detail || '',
      l.ipAddress || '',
      (l.userAgent || '').substring(0, 100),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `student_activity_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${logs.length} activity logs to CSV`)
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'LOGIN': return <LogIn className="h-3.5 w-3.5 text-emerald-600" />
      case 'LOGIN_FAILED': return <XCircle className="h-3.5 w-3.5 text-rose-600" />
      case 'REGISTER': return <UserPlus className="h-3.5 w-3.5 text-violet-600" />
      case 'VISIT': return <Eye className="h-3.5 w-3.5 text-sky-600" />
      case 'LOGOUT': return <LogOut className="h-3.5 w-3.5 text-amber-600" />
      default: return <Activity className="h-3.5 w-3.5 text-muted-foreground" />
    }
  }

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      LOGIN: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
      LOGIN_FAILED: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
      REGISTER: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300',
      VISIT: 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
      LOGOUT: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
    }
    return colors[action] || 'border-border bg-muted text-muted-foreground'
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Student Activity
            </h1>
            <p className="text-sm text-muted-foreground">Track student login, registration, and browsing activity</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={fetchLogs}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={logs.length === 0}>
              <Download className="mr-2 h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20"
              onClick={async () => {
                if (confirm('Delete ALL activity logs? This cannot be undone.')) {
                  try {
                    const r = await apiDelete('/api/admin/activity-logs?id=all')
                    toast.success(`Deleted ${r.deleted} logs`)
                    fetchLogs()
                  } catch (e: any) {
                    toast.error(e.message || 'Failed to delete logs')
                  }
                }
              }}
              disabled={logs.length === 0}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard title="Total Activities" value={stats.total} icon={<Activity className="h-5 w-5" />} accent="violet" />
          <StatCard title="Logins" value={stats.logins} icon={<LogIn className="h-5 w-5" />} accent="emerald" />
          <StatCard title="Registrations" value={stats.registrations} icon={<UserPlus className="h-5 w-5" />} accent="violet" />
          <StatCard title="Failed Logins" value={stats.failedLogins} icon={<XCircle className="h-5 w-5" />} accent="rose" />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><Filter className="h-4 w-4" /> Filters:</div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by register number, email, or detail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-36 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={userTypeFilter} onValueChange={setUserTypeFilter}>
              <SelectTrigger className="w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {USER_TYPES.map(t => <SelectItem key={t} value={t}>{t === 'ALL' ? 'All Users' : t}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Activity Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Logs ({logs.length})</CardTitle>
            <CardDescription>Recent student activity on the portal</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2 p-4">{Array.from({length: 8}).map((_,i) => <div key={i} className="h-12 rounded-lg shimmer" />)}</div>
            ) : logs.length === 0 ? (
              <EmptyState icon={<Users className="h-6 w-6" />} title="No activity logs" description="Student activity will appear here once students start using the portal." />
            ) : (
              <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="hidden md:table-cell">Detail</TableHead>
                      <TableHead className="hidden lg:table-cell">IP Address</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id} className="hover:bg-accent/30">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActionIcon(log.action)}
                            <Badge variant="outline" className={`text-xs ${getActionBadge(log.action)}`}>
                              {log.action.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className={`${avatarColor(log.userId || '?')} text-[10px] font-semibold text-white`}>
                                {initials(log.userId || '?')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{log.userId || 'Unknown'}</p>
                              <p className="text-xs text-muted-foreground">{log.userType}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          {log.detail || '—'}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          {log.ipAddress || '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatDate(log.timestamp)}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={async () => {
                              try {
                                await apiDelete(`/api/admin/activity-logs?id=${log.id}`)
                                toast.success('Log deleted')
                                fetchLogs()
                              } catch (e: any) {
                                toast.error(e.message || 'Failed to delete log')
                              }
                            }}
                            className="flex h-6 w-6 items-center justify-center rounded text-rose-600 transition-colors hover:bg-rose-50 dark:hover:bg-rose-900/20"
                            title="Delete log"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
