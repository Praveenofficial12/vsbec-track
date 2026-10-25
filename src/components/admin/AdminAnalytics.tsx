'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { AdminLayout } from './AdminLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { CardSkeleton } from '@/components/common/States'
import { StatCard } from '@/components/common/StatCard'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, RadialBarChart, RadialBar
} from 'recharts'
import { Users, Building2, TrendingUp, Award, Target, Activity, IndianRupee, Trophy } from 'lucide-react'
import type { AnalyticsData } from '@/lib/types'

const DEPARTMENTS = ['ALL', 'AI & DS', 'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL']
const PIE_COLORS = ['oklch(0.55 0.13 165)', 'oklch(0.6 0.16 200)', 'oklch(0.7 0.18 80)', 'oklch(0.6 0.2 320)', 'oklch(0.7 0.18 25)', 'oklch(0.65 0.16 145)', 'oklch(0.7 0.17 250)']

export function AdminAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ department: 'ALL', year: 'ALL', section: 'ALL' })

  useEffect(() => {
    apiGet<AnalyticsData>(`/api/analytics?department=${filters.department}&year=${filters.year}&section=${filters.section}`)
      .then(r => setAnalytics(r)).finally(() => setLoading(false))
  }, [filters])

  if (loading || !analytics) {
    return <AdminLayout><div className="p-6 space-y-4"><div className="grid gap-4 sm:grid-cols-4">{Array.from({length:4}).map((_,i)=><CardSkeleton key={i} className="h-28" />)}</div><div className="grid gap-4 lg:grid-cols-2"><CardSkeleton className="h-72" /><CardSkeleton className="h-72" /></div></div></AdminLayout>
  }

  const o = analytics.overview

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground">Comprehensive placement insights</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={filters.department} onValueChange={(v) => setFilters(f => ({ ...f, department: v }))}>
              <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title="Total Students" value={o.totalStudents} icon={<Users className="h-5 w-5" />} accent="emerald" />
          <StatCard title="Placed" value={o.placedStudents} subtitle={`${o.placementPercentage}%`} icon={<Award className="h-5 w-5" />} accent="amber" />
          <StatCard title="Avg CTC" value={`₹${o.averageCtc} LPA`} icon={<IndianRupee className="h-5 w-5" />} accent="violet" />
          <StatCard title="Highest CTC" value={`₹${o.highestCtc} LPA`} icon={<Trophy className="h-5 w-5" />} accent="teal" />
        </div>

        <Tabs defaultValue="department">
          <TabsList>
            <TabsTrigger value="department">Department</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
            <TabsTrigger value="class">Class</TabsTrigger>
            <TabsTrigger value="company">Company</TabsTrigger>
            <TabsTrigger value="skill">Skills</TabsTrigger>
          </TabsList>

          {/* Department-wise */}
          <TabsContent value="department" className="space-y-4 animate-fade-in-up">
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="card-hover lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base">Department-wise Placement</CardTitle>
                  <CardDescription>Placed vs Unplaced vs In Process per department</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={analytics.departmentWise}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 165)" vertical={false} />
                      <XAxis dataKey="department" tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 165)" />
                      <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 165)" />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
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
                  <CardTitle className="text-base">Average CGPA</CardTitle>
                  <CardDescription>By department</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={analytics.departmentWise} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 165)" horizontal={false} />
                      <XAxis type="number" domain={[0, 10]} tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 165)" />
                      <YAxis type="category" dataKey="department" tick={{ fontSize: 10 }} stroke="oklch(0.55 0.02 165)" width={70} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="averageCgpa" name="Avg CGPA" fill="oklch(0.6 0.16 200)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Department table */}
            <Card>
              <CardHeader><CardTitle className="text-base">Department Breakdown</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto scrollbar-thin">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="pb-2 font-medium">Department</th>
                        <th className="pb-2 text-center font-medium">Total</th>
                        <th className="pb-2 text-center font-medium">Eligible</th>
                        <th className="pb-2 text-center font-medium">Placed</th>
                        <th className="pb-2 text-center font-medium">Unplaced</th>
                        <th className="pb-2 text-center font-medium">Avg CGPA</th>
                        <th className="pb-2 text-center font-medium">Placement %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analytics.departmentWise.map(d => (
                        <tr key={d.department} className="border-b border-border/50 transition-colors hover:bg-accent/30">
                          <td className="py-3 font-medium">{d.department}</td>
                          <td className="text-center">{d.total}</td>
                          <td className="text-center">{d.eligible}</td>
                          <td className="text-center text-emerald-600 dark:text-emerald-400 font-semibold">{d.placed}</td>
                          <td className="text-center text-rose-600 dark:text-rose-400">{d.unplaced}</td>
                          <td className="text-center">{d.averageCgpa?.toFixed(2)}</td>
                          <td className="text-center">
                            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                              {d.placementPercentage}%
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Year-wise */}
          <TabsContent value="year" className="space-y-4 animate-fade-in-up">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-base">Year-wise Distribution</CardTitle>
                <CardDescription>Total, eligible, placed, and in-process per year</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={analytics.yearWise}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 165)" vertical={false} />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 165)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 165)" />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="total" name="Total" fill="oklch(0.7 0.02 165)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="eligible" name="Eligible" fill="oklch(0.55 0.13 165)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="placed" name="Placed" fill="oklch(0.7 0.18 80)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="inProcess" name="In Process" fill="oklch(0.6 0.16 200)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Class-wise */}
          <TabsContent value="class" className="space-y-4 animate-fade-in-up">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-base">Class-wise Placement</CardTitle>
                <CardDescription>Section-wise placement percentage</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={analytics.classWise}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 165)" vertical={false} />
                    <XAxis dataKey="section" tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 165)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 165)" />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="total" name="Total" fill="oklch(0.7 0.02 165)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="placed" name="Placed" fill="oklch(0.55 0.13 165)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Company-wise */}
          <TabsContent value="company" className="space-y-4 animate-fade-in-up">
            <Card className="card-hover">
              <CardHeader>
                <CardTitle className="text-base">Company-wise Participation</CardTitle>
                <CardDescription>Registration, attendance, and selection per company</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={analytics.companyWise}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 165)" vertical={false} />
                    <XAxis dataKey="company" tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 165)" />
                    <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 165)" />
                    <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="registered" name="Registered" fill="oklch(0.7 0.02 165)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="attended" name="Attended" fill="oklch(0.55 0.13 165)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="selected" name="Selected" fill="oklch(0.7 0.18 80)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rejected" name="Rejected" fill="oklch(0.7 0.18 25)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Skill Analytics */}
          <TabsContent value="skill" className="space-y-4 animate-fade-in-up">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="text-base">Skill Distribution</CardTitle>
                  <CardDescription>Top skills across all students</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={analytics.skillAnalytics.slice(0, 10)} layout="vertical" margin={{ left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 165)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 165)" />
                      <YAxis type="category" dataKey="skill" tick={{ fontSize: 10 }} stroke="oklch(0.55 0.02 165)" width={70} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="count" name="Students" fill="oklch(0.6 0.16 200)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="card-hover">
                <CardHeader>
                  <CardTitle className="text-base">Top Strong Skills</CardTitle>
                  <CardDescription>Most commonly marked strong skills</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={analytics.strongSkillAnalytics} layout="vertical" margin={{ left: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 165)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.55 0.02 165)" />
                      <YAxis type="category" dataKey="skill" tick={{ fontSize: 10 }} stroke="oklch(0.55 0.02 165)" width={70} />
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="count" name="Students" fill="oklch(0.7 0.18 80)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
