'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, formatDate, STATUS_COLORS } from '@/lib/api'
import { AdminLayout } from './AdminLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import { FileText, Download, Filter, BarChart3, Users, Building2, Award, Target } from 'lucide-react'
import { toast } from 'sonner'

const REPORT_TYPES = [
  { value: 'overall', label: 'Overall Placement Report', icon: BarChart3, desc: 'Complete placement summary' },
  { value: 'selected', label: 'Selected Students Report', icon: Award, desc: 'All selected students with CTC' },
  { value: 'unplaced', label: 'Unplaced Students Report', icon: Users, desc: 'Students who need attention' },
  { value: 'department', label: 'Department-wise Report', icon: Building2, desc: 'Department-wise breakdown' },
]

export function AdminReports() {
  const [reportType, setReportType] = useState('overall')
  const [department, setDepartment] = useState('ALL')
  const [year, setYear] = useState('ALL')
  const [section, setSection] = useState('ALL')
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const generate = async () => {
    setLoading(true)
    try {
      const r = await apiGet<{ report: any }>(`/api/reports?type=${reportType}&department=${department}&year=${year}&section=${section}`)
      setReport(r.report)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { generate() }, [reportType, department, year, section])

  const handleExport = () => {
    if (!report) {
      toast.error('No report loaded yet — generate a report first.')
      return
    }

    let rows: string[][] = []
    let headerLine = ''

    if (reportType === 'overall' && Array.isArray(report.students) && report.students.length > 0) {
      headerLine = 'Register Number,Name,Department,Year,Section,CGPA,Status'
      rows = report.students.map((s: any) => [
        s.registerNumber ?? '', s.fullName ?? '', s.department ?? '',
        s.year ?? '', s.section ?? '', s.cgpa ?? '', s.placementStatus ?? '',
      ])
    } else if (reportType === 'selected' && Array.isArray(report.records) && report.records.length > 0) {
      headerLine = 'Student Name,Register Number,Department,Company,Job Role,CTC,Joining Date'
      rows = report.records.map((r: any) => [
        r.studentName ?? '', r.registerNumber ?? '', r.department ?? '',
        r.company ?? '', r.jobRole ?? '', r.ctc ?? '', r.joiningDate ?? '',
      ])
    } else if (reportType === 'unplaced' && Array.isArray(report.students) && report.students.length > 0) {
      headerLine = 'Register Number,Name,Department,Year,Section,CGPA,Skills'
      rows = report.students.map((s: any) => [
        s.registerNumber ?? '', s.fullName ?? '', s.department ?? '',
        s.year ?? '', s.section ?? '', s.cgpa ?? '', (s.skills ?? '').replace(/,/g, ';'),
      ])
    } else if (reportType === 'department' && Array.isArray(report.departments) && report.departments.length > 0) {
      headerLine = 'Department,Total,Placed,Unplaced,In Process'
      rows = report.departments.map((d: any) => [
        d.department ?? '', d.total ?? '', d.placed ?? '', d.unplaced ?? '', d.inProcess ?? '',
      ])
    }

    if (rows.length === 0) {
      // Friendly empty-state toast instead of downloading an empty CSV
      const labels: Record<string, string> = {
        overall: 'overall placement',
        selected: 'selected students',
        unplaced: 'unplaced students',
        department: 'department-wise',
      }
      toast.error(`No ${labels[reportType] || ''} records to export — adjust your filters and try again.`)
      return
    }

    const escape = (val: unknown) => {
      if (val === null || val === undefined) return ''
      const s = String(val)
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }

    const csv = [headerLine, ...rows.map((r) => r.map(escape).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${reportType}_report_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${rows.length} records to CSV`)
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6" /> Reports</h1>
            <p className="text-sm text-muted-foreground">Generate and export placement reports</p>
          </div>
          {report && (
            <Button onClick={handleExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>

        {/* Report Type Selection */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {REPORT_TYPES.map(rt => {
            const Icon = rt.icon
            const isActive = reportType === rt.value
            return (
              <Card
                key={rt.value}
                className={`cursor-pointer border-2 transition-all hover:-translate-y-1 hover:shadow-soft ${
                  isActive ? 'border-emerald-500 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-900/20' : 'border-border'
                }`}
                onClick={() => setReportType(rt.value)}
              >
                <CardContent className="p-4">
                  <Icon className={`mb-2 h-6 w-6 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'}`} />
                  <p className="font-medium">{rt.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{rt.desc}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="flex flex-wrap items-end gap-3 p-4">
            <div className="flex items-center gap-2 text-sm font-medium"><Filter className="h-4 w-4" /> Filters:</div>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Departments</SelectItem>
                {['AI-DS', 'AI-ML', 'BT', 'BME', 'CHEM', 'CIVIL', 'CCE', 'CSBS', 'CSE', 'ECE', 'EEE', 'IT', 'MECH'].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Years</SelectItem>
                {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger className="w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Sections</SelectItem>
                {['A', 'B', 'C', 'D'].map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Report Display */}
        {loading ? (
          <CardSkeleton className="h-96" />
        ) : report ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{report.title}</CardTitle>
              {report.count !== undefined && <CardDescription>{report.count} records</CardDescription>}
            </CardHeader>
            <CardContent>
              {reportType === 'overall' && (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {Object.entries(report.summary).map(([k, v]: any) => (
                      <div key={k} className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className="text-xs text-muted-foreground">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                        <p className="text-xl font-bold">{v}</p>
                      </div>
                    ))}
                  </div>
                  <div className="overflow-x-auto scrollbar-thin">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Register Number</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead className="hidden md:table-cell">Department</TableHead>
                          <TableHead>CGPA</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.students.map((s: any) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-muted-foreground">{s.registerNumber}</TableCell>
                            <TableCell className="font-medium">{s.fullName}</TableCell>
                            <TableCell className="hidden md:table-cell">{s.department}</TableCell>
                            <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">{s.cgpa?.toFixed(2)}</TableCell>
                            <TableCell><Badge variant="outline" className={STATUS_COLORS[s.placementStatus]}>{s.placementStatus.replace(/_/g, ' ')}</Badge></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}

              {reportType === 'selected' && (
                <div className="overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Register No</TableHead>
                        <TableHead className="hidden md:table-cell">Department</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead className="hidden lg:table-cell">Job Role</TableHead>
                        <TableHead>CTC</TableHead>
                        <TableHead className="hidden lg:table-cell">Joining Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.records.map((r: any, i: number) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{r.studentName}</TableCell>
                          <TableCell className="text-muted-foreground">{r.registerNumber}</TableCell>
                          <TableCell className="hidden md:table-cell">{r.department}</TableCell>
                          <TableCell>{r.company}</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">{r.jobRole || '—'}</TableCell>
                          <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">{r.ctc || '—'}</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">{formatDate(r.joiningDate)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {reportType === 'unplaced' && (
                <div className="overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Register Number</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">Department</TableHead>
                        <TableHead>CGPA</TableHead>
                        <TableHead className="hidden lg:table-cell">Skills</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.students.map((s: any) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-muted-foreground">{s.registerNumber}</TableCell>
                          <TableCell className="font-medium">{s.fullName}</TableCell>
                          <TableCell className="hidden md:table-cell">{s.department}</TableCell>
                          <TableCell className="font-semibold text-emerald-600 dark:text-emerald-400">{s.cgpa?.toFixed(2)}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {(s.skills || '').split(',').slice(0, 3).map((sk: string, i: number) => <Badge key={i} variant="outline" className="text-[10px]">{sk.trim()}</Badge>)}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {reportType === 'department' && (
                <div className="overflow-x-auto scrollbar-thin">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Department</TableHead>
                        <TableHead className="text-center">Total</TableHead>
                        <TableHead className="text-center">Placed</TableHead>
                        <TableHead className="text-center">Unplaced</TableHead>
                        <TableHead className="text-center">In Process</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.departments.map((d: any) => (
                        <TableRow key={d.department}>
                          <TableCell className="font-medium">{d.department}</TableCell>
                          <TableCell className="text-center">{d.total}</TableCell>
                          <TableCell className="text-center text-emerald-600 dark:text-emerald-400 font-semibold">{d.placed}</TableCell>
                          <TableCell className="text-center text-rose-600 dark:text-rose-400">{d.unplaced}</TableCell>
                          <TableCell className="text-center text-amber-600 dark:text-amber-400">{d.inProcess}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <EmptyState icon={<FileText className="h-6 w-6" />} title="Select a report type" description="Choose a report type above to generate." />
        )}
      </div>
    </AdminLayout>
  )
}
