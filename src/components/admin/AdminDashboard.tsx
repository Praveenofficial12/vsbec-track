'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { AdminLayout } from './AdminLayout'
import { StatCard } from '@/components/common/StatCard'
import { CardSkeleton, EmptyState } from '@/components/common/States'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend, FunnelChart, Funnel, LabelList
} from 'recharts'
import {
  Users, CheckCircle2, Building2, Target, Award, Activity, TrendingUp,
  Clock, ChevronRight, BarChart3, IndianRupee, Trophy
} from 'lucide-react'
import type { AnalyticsData, Drive } from '@/lib/types'
import { formatDate, STATUS_COLORS } from '@/lib/api'

const DEPARTMENTS = ['ALL', 'AI & DS', 'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL']
const YEARS = ['ALL', 'I', 'II', 'III', 'IV']
const SECTIONS = ['ALL', 'A', 'B', 'C', 'D']

const PIE_COLORS = ['oklch(0.55 0.13 165)', 'oklch(0.6 0.16 200)', 'oklch(0.7 0.18 80)', 'oklch(0.6 0.2 320)', 'oklch(0.7 0.18 25)', 'oklch(0.65 0.16 145)', 'oklch(0.7 0.17 250)']

export function AdminDashboard() {
  const setView = useAppStore((s) => s.setView)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [drives, setDrives] = useState<Drive[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ department: 'ALL', year: 'ALL', section: 'ALL' })

  useEffect(() => {
    Promise.all([
      apiGet<AnalyticsData>(`/api/analytics?department=${filters.department}&year=${filters.year}&section=${filters.section}`),
      apiGet<{ drives: Drive[] }>('/api/drives'),
    ]).then(([a, d]) => {
      setAnalytics(a)
      setDrives(d.drives)
    }).finally(() => setLoading(false))
  }, [filters])

  if (loading || !analytics) {
    return (
      <AdminLayout>
        <div className="space-y-6 p-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{Array.from({length:8}).map((_,i)=><CardSkeleton key={i} className="h-28" />)}</div>
          <div className="grid gap-4 lg:grid-cols-2"><CardSkeleton className="h-72" /><CardSkeleton className="h-72" /></div>
        </div>
      </AdminLayout>
    )
  }

  const o = analytics.overview
  const activeDrives = drives.filter(d => d.status === 'REGISTRATION_OPEN' || d.status === 'ONGOING').slice(0, 4)

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Real-time overview of placement activities</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={filters.department} onValueChange={(v) => setFilters(f => ({ ...f, department: v }))}>
              <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.year} onValueChange={(v) => setFilters(f => ({ ...f, year: v }))}>
              <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Year" /></SelectTrigger>
              <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y === 'ALL' ? 'All Years' : y}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={filters.section} onValueChange={(v) => setFilters(f => ({ ...f, section: v }))}>
              <SelectTrigger className="h-9 w-28 text-xs"><SelectValue placeholder="Section" /></SelectTrigger>
              <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s === 'ALL' ? 'All Sections' : `Section ${s}`}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Grid - 8 cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title="Total Students" value={o.totalStudents} subtitle={`${o.eligibleStudents} eligible`} icon={<Users className="h-5 w-5" />} accent="emerald" onClick={() => setView('admin-students')} />
          <StatCard title="Total Companies" value={o.totalCompanies} subtitle={`${o.activeDrives} active drives`} icon={<Building2 className="h-5 w-5" />} accent="violet" onClick={() => setView('admin-companies')} />
          <StatCard title="Students Placed" value={o.placedStudents} subtitle={`${o.placementPercentage}% placement`} icon={<CheckCircle2 className="h-5 w-5" />} accent="amber" trend={{ value: `${o.placementPercentage}%`, positive: true }} />
          <StatCard title="Students Unplaced" value={o.unplacedStudents} subtitle="Need attention" icon={<Users className="h-5 w-5" />} accent="rose" />
          <StatCard title="In Process" value={o.inProcessStudents} subtitle="Currently in recruitment" icon={<Activity className="h-5 w-5" />} accent="sky" />
          <StatCard title="Total Selections" value={o.totalSelections} subtitle="Across all drives" icon={<Award className="h-5 w-5" />} accent="teal" trend={{ value: '+12%', positive: true }} />
          <StatCard title="Avg CTC" value={`₹${o.averageCtc} LPA`} subtitle="Across selections" icon={<IndianRupee className="h-5 w-5" />} accent="violet" />
          <StatCard title="Highest CTC" value={`₹${o.highestCtc} LPA`} subtitle="Best offer" icon={<Trophy className="h-5 w-5" />} accent="amber" />
        </div>

        {/* Charts Row 1: Department-wise bar chart + Placement status pie */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="card-hover lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4 text-emerald-600" /> Department-wise Placement</CardTitle>
                  <CardDescription>Total vs placed vs unplaced by department</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setView('admin-analytics')}>
                  Details <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.departmentWise} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 165)" vertical={false} />
                  <XAxis dataKey="department" tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 165)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 165)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'oklch(1 0 0)',
                      border: '1px solid oklch(0.92 0.01 165)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="total" name="Total" fill="oklch(0.7 0.02 165)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="placed" name="Placed" fill="oklch(0.55 0.13 165)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="inProcess" name="In Process" fill="oklch(0.7 0.18 80)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-base">Placement Status</CardTitle>
              <CardDescription>Distribution overview</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Placed', value: o.placedStudents, color: PIE_COLORS[0] },
                      { name: 'In Process', value: o.inProcessStudents, color: PIE_COLORS[2] },
                      { name: 'Unplaced', value: o.unplacedStudents, color: PIE_COLORS[4] },
                    ]}
                    cx="50%" cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {[0,1,2].map(i => <Cell key={i} fill={PIE_COLORS[i === 0 ? 0 : i === 1 ? 2 : 4]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2: Skill analytics + Funnel */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-violet-600" /> Top Skills Distribution</CardTitle>
              <CardDescription>Most common skills across students</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analytics.skillAnalytics.slice(0, 8)} layout="vertical" margin={{ top: 5, right: 20, left: 60, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 165)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 165)" />
                  <YAxis type="category" dataKey="skill" tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 165)" width={70} />
                  <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                  <Bar dataKey="count" name="Students" fill="oklch(0.6 0.16 200)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="card-hover">
            <CardHeader>
              <CardTitle className="text-base">Recruitment Funnel</CardTitle>
              <CardDescription>Stage-wise conversion for latest completed drive</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.funnel.length === 0 ? (
                <EmptyState title="No funnel data" description="Funnel will appear once a drive is completed." />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.funnel} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 165)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 165)" />
                    <YAxis type="category" dataKey="stage" tick={{ fontSize: 10 }} stroke="oklch(0.55 0.02 165)" width={90} />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="count" name="Students" radius={[0, 4, 4, 0]}>
                      {analytics.funnel.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Bar>
                    <LabelList dataKey="count" position="right" style={{ fontSize: '11px', fontWeight: 'bold' }} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Active Drives */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="card-hover lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-amber-500" /> Active Drives</CardTitle>
                  <CardDescription>Currently open for registration or in progress</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setView('admin-drives')}>
                  View All <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeDrives.length === 0 ? (
                <EmptyState icon={<Target className="h-6 w-6" />} title="No active drives" description="Create a new drive to get started." action={<Button size="sm" onClick={() => setView('admin-drives')}>Create Drive</Button>} />
              ) : (
                <div className="space-y-3">
                  {activeDrives.map(drive => (
                    <div key={drive.id} className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-all hover:border-emerald-300 hover:shadow-soft dark:hover:border-emerald-800">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-border">
                        {drive.company?.logoUrl ? (
                          <img src={drive.company.logoUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Building2 className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{drive.company?.name} · {drive.driveName}</p>
                        <p className="truncate text-xs text-muted-foreground">{drive.ctc} · {formatDate(drive.driveDate)} · {drive.participants?.length || 0} participants</p>
                      </div>
                      <Badge variant="outline" className={`shrink-0 ${STATUS_COLORS[drive.status]}`}>{drive.status.replace(/_/g, ' ')}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="card-hover">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Placement %</p>
                <p className="text-xl font-bold">{o.placementPercentage}%</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Selections</p>
                <p className="text-xl font-bold">{o.totalSelections}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active Drives</p>
                <p className="text-xl font-bold">{o.activeDrives}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">In Process</p>
                <p className="text-xl font-bold">{o.inProcessStudents}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  )
}
