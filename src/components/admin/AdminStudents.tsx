'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, apiDelete, csvToArray, STATUS_COLORS, formatDate, avatarColor, initials } from '@/lib/api'
import { AdminLayout } from './AdminLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import {
  Users, Search, Download, Filter, Eye, Award, X, RefreshCw, UserCheck,
  Target, CheckCircle2, XCircle, Clock, Briefcase, GraduationCap, MapPin, Mail,
  Phone, Trash2, AlertTriangle, TrendingUp, Building2,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Student } from '@/lib/types'

// Admins can now delete students directly from the admin panel. The DELETE
// endpoint cascade-deletes all dependent records (round results → participations
// → certifications → projects → notifications → session → student) and writes
// an AuditLog entry.

// 13 official V.S.B. Engineering College departments (matches DEPARTMENT_PASSWORDS)
const DEPARTMENTS = [
  'ALL', 'AI-DS', 'AI-ML', 'BT', 'BME', 'CHEM', 'CIVIL', 'CCE', 'CSBS', 'CSE', 'ECE', 'EEE', 'IT', 'MECH',
]
const YEARS = ['ALL', 'I', 'II', 'III', 'IV']
const SECTIONS = ['ALL', 'A', 'B', 'C', 'D']
const STATUSES = ['ALL', 'PLACED', 'IN_PROCESS', 'UNPLACED']
const SKILLS = ['ALL', 'Java', 'Python', 'JavaScript', 'React', 'SQL', 'Cloud', 'Machine Learning', 'C++']

// Round-wise filter buttons — uses the new 5-round naming convention
const ROUND_FILTERS = [
  { value: '', label: 'All Students' },
  { value: 'Aptitude', label: 'Apti Not Cleared' },
  { value: 'Coding', label: 'Coding Not Cleared' },
  { value: 'GD', label: 'GD Not Cleared' },
  { value: 'Technical HR', label: 'Technical HR Not Cleared' },
  { value: 'General HR', label: 'General HR Not Cleared' },
]

// Stats returned by the API for each student.
interface StudentStats {
  totalDrives: number
  attended: number
  totalRoundsCleared: number
  selectedCount: number
  rejectedCount: number
  onHoldCount: number
  inProgressCount: number
}

// One company returned by /api/students/company-breakdown (no companyId in request)
interface CompanyOption {
  companyId: string
  companyName: string
  logoUrl: string | null
  driveName: string
  matchCount: number
}
// One student returned when companyId IS supplied in the request.
interface CompanyStudent {
  id: string
  registerNumber: string
  fullName: string
  collegeEmail: string
  mobile: string | null
  department: string | null
  year: string | null
  section: string | null
  cgpa: number | null
  backlogs: number | null
  placementStatus: string
  driveName: string
  roundName: string
  roundStatus: string
  finalResult: string | null
}
interface CompanyBreakdownResponse {
  companies: CompanyOption[]
  students: CompanyStudent[]
  totalCompanies: number
  totalStudents: number
  roundFilter: string | null
  selectedCompanyId: string | null
}

export function AdminStudents() {
  const setView = useAppStore((s) => s.setView)
  const setSelected = useAppStore((s) => s.setSelected)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '', department: 'ALL', year: 'ALL', section: 'ALL',
    placementStatus: 'ALL', skill: 'ALL', strongSkill: 'ALL', minCgpa: '', maxBacklogs: '',
    roundNotCleared: '',
  })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  // Per-company drill-down state — only used when a "X Not Cleared"
  // round filter is active. The admin first picks a company from the
  // dropdown, then we show the list of student names who failed that
  // round at that specific company.
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [companyStudents, setCompanyStudents] = useState<CompanyStudent[]>([])
  const [companyLoading, setCompanyLoading] = useState(false)
  const [breakdownTotals, setBreakdownTotals] = useState<{ companies: number; students: number }>({ companies: 0, students: 0 })
  const pageSize = 60

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== 'ALL' && v !== '') params.append(k, v)
      })
      params.set('limit', String(pageSize))
      params.set('offset', String(currentPage * pageSize))
      const r = await apiGet<{ students: Student[]; total: number }>(`/api/students?${params}`)
      setStudents(r.students)
      setTotalCount(r.total)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters, currentPage])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  // Fetch the list of companies that have at least one student matching
  // the round filter. We only call this when a round filter is active
  // (e.g. "Apti Not Cleared"). The response populates the company
  // dropdown. We deliberately do NOT pass `companyId` here so the API
  // returns the company list only (no per-student payload).
  const fetchCompanyOptions = useCallback(async () => {
    if (!filters.roundNotCleared) {
      setCompanyOptions([])
      setCompanyStudents([])
      setSelectedCompanyId('')
      setBreakdownTotals({ companies: 0, students: 0 })
      return
    }
    setCompanyLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== 'ALL' && v !== '' && k !== 'roundNotCleared') params.append(k, v)
      })
      params.set('roundNotCleared', filters.roundNotCleared)
      const r = await apiGet<CompanyBreakdownResponse>(`/api/students/company-breakdown?${params}`)
      setCompanyOptions(r.companies || [])
      setBreakdownTotals({ companies: r.totalCompanies, students: r.totalStudents })
      // Reset the previously selected company if it is no longer in the list.
      setSelectedCompanyId((prev) => {
        if (prev && r.companies.some((c) => c.companyId === prev)) return prev
        setCompanyStudents([])
        return ''
      })
    } catch (e) {
      console.error('Company options fetch error:', e)
      setCompanyOptions([])
    } finally {
      setCompanyLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchCompanyOptions() }, [fetchCompanyOptions])

  // Fetch the student names list for the selected company. Re-runs
  // whenever the admin changes the dropdown selection.
  const fetchCompanyStudents = useCallback(async () => {
    if (!filters.roundNotCleared || !selectedCompanyId) {
      setCompanyStudents([])
      return
    }
    setCompanyLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== 'ALL' && v !== '' && k !== 'roundNotCleared') params.append(k, v)
      })
      params.set('roundNotCleared', filters.roundNotCleared)
      params.set('companyId', selectedCompanyId)
      const r = await apiGet<CompanyBreakdownResponse>(`/api/students/company-breakdown?${params}`)
      setCompanyStudents(r.students || [])
    } catch (e) {
      console.error('Company students fetch error:', e)
      setCompanyStudents([])
    } finally {
      setCompanyLoading(false)
    }
  }, [filters, selectedCompanyId])

  useEffect(() => { fetchCompanyStudents() }, [fetchCompanyStudents])

  // When the round filter changes, clear the previously selected company
  // so the dropdown starts fresh.
  useEffect(() => {
    setSelectedCompanyId('')
    setCompanyStudents([])
  }, [filters.roundNotCleared])

  const handleReset = () => setFilters({
    search: '', department: 'ALL', year: 'ALL', section: 'ALL',
    placementStatus: 'ALL', skill: 'ALL', strongSkill: 'ALL', minCgpa: '', maxBacklogs: '',
    roundNotCleared: '',
  })

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const handleView = (id: string) => {
    setSelected('studentId', id)
    setView('admin-student-detail')
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await apiDelete(`/api/students/${deleteTarget.id}`)
      toast.success(`${deleteTarget.fullName} (${deleteTarget.registerNumber}) deleted successfully`)
      setStudents(prev => prev.filter(s => s.id !== deleteTarget.id))
      setDeleteTarget(null)
      // Refresh the total count
      fetchStudents()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete student')
    } finally {
      setDeleting(false)
    }
  }

  const handleExport = () => {
    if (students.length === 0) {
      toast.error('No students to export — adjust your filters first.')
      return
    }
    const headers = ['Register Number', 'Name', 'Email', 'Department', 'Year', 'Section', 'CGPA', 'Backlogs', 'Placement Status', 'Skills', 'Drives Attended', 'Rounds Cleared', 'Selected', 'Rejected']
    const rows = students.map(s => {
      const stats = (s as any).stats as StudentStats | undefined
      return [
        s.registerNumber, s.fullName, s.collegeEmail, s.department, s.year, s.section,
        s.cgpa, s.backlogs, s.placementStatus, s.skills?.replace(/,/g, ';'),
        stats?.attended || 0, stats?.totalRoundsCleared || 0, stats?.selectedCount || 0, stats?.rejectedCount || 0,
      ]
    })
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `students_export_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${students.length} students to CSV`)
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Student Registry</h1>
            <p className="text-sm text-muted-foreground">{loading ? 'Loading...' : `${totalCount} students found (showing ${students.length})`}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={students.length === 0}>
              <Download className="mr-2 h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Round-wise filter buttons */}
        <div className="flex flex-wrap gap-2">
          {ROUND_FILTERS.map((rf) => {
            const isActive = (filters.roundNotCleared || '') === rf.value
            return (
              <Button
                key={rf.label}
                size="sm"
                variant={isActive ? 'default' : 'outline'}
                onClick={() => setFilters((f) => ({ ...f, roundNotCleared: rf.value }))}
                className={isActive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'border-border hover:border-rose-300 hover:text-rose-600 dark:hover:border-rose-800'
                }
              >
                {rf.label}
              </Button>
            )
          })}
        </div>

        {/* Per-Company Student Drill-down — only visible when a "X Not
            Cleared" round filter is active. The admin first picks a
            company from the dropdown, then we show the list of student
            names who failed that round at that specific company. */}
        {filters.roundNotCleared && (
          <Card className="border-rose-200 bg-gradient-to-br from-rose-50/60 to-amber-50/40 dark:border-rose-900/50 dark:from-rose-950/20 dark:to-amber-950/10">
            <CardContent className="p-5">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-foreground">
                      {filters.roundNotCleared} Not Cleared — by Company
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Pick a company to see the {breakdownTotals.students} student{breakdownTotals.students !== 1 ? 's' : ''} who failed {filters.roundNotCleared}.
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 font-medium shadow-sm">
                    <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    {breakdownTotals.companies} companies
                  </span>
                  <span className="flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1.5 font-medium shadow-sm">
                    <Users className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                    {breakdownTotals.students} students
                  </span>
                </div>
              </div>

              {/* Company dropdown */}
              <div className="mb-4">
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Select Company
                </label>
                <Select
                  value={selectedCompanyId}
                  onValueChange={(v) => setSelectedCompanyId(v)}
                  disabled={companyLoading || companyOptions.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue
                      placeholder={companyLoading ? 'Loading companies…' : companyOptions.length === 0 ? `No companies with "${filters.roundNotCleared} Not Cleared" results` : 'Choose a company…'}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {companyOptions.map((c) => (
                      <SelectItem key={c.companyId} value={c.companyId}>
                        <span className="flex items-center gap-2">
                          {c.logoUrl ? (
                            <img
                              src={c.logoUrl}
                              alt=""
                              className="h-4 w-4 rounded object-contain"
                              onError={(e) => { ;(e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
                            />
                          ) : null}
                          <span className="font-medium">{c.companyName}</span>
                          <span className="text-muted-foreground">— {c.driveName}</span>
                          <Badge variant="outline" className="ml-1 text-[10px]">{c.matchCount}</Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Student names list — only shown after a company is selected */}
              {selectedCompanyId && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Students who failed {filters.roundNotCleared}
                    </p>
                    {companyStudents.length > 0 && (
                      <span className="text-[11px] text-muted-foreground">
                        {companyStudents.length} student{companyStudents.length !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {companyLoading ? (
                    <div className="space-y-2">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-14 animate-pulse rounded-lg bg-muted/60" />
                      ))}
                    </div>
                  ) : companyStudents.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-rose-200 bg-background/60 p-6 text-center dark:border-rose-900/40">
                      <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                      <p className="text-sm font-medium text-foreground">No students found</p>
                      <p className="text-xs text-muted-foreground">
                        No students matching this filter for the selected company.
                      </p>
                    </div>
                  ) : (
                    <div className="max-h-[460px] overflow-y-auto rounded-lg border border-border bg-background/60
                      [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30
                      [&::-webkit-scrollbar-track]:bg-transparent">
                      <ul className="divide-y divide-border">
                        {companyStudents.map((s, idx) => (
                          <li
                            key={s.id}
                            className="group flex items-center gap-3 p-3 transition-colors hover:bg-accent/40"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-rose-100 text-xs font-bold text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
                              {idx + 1}
                            </div>
                            <Avatar className="h-9 w-9 ring-1 ring-border">
                              <AvatarFallback className={`${avatarColor(s.fullName)} text-xs font-semibold text-white`}>
                                {initials(s.fullName)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-foreground">{s.fullName}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {s.registerNumber}
                                {s.department && <span className="ml-1">· {s.department}</span>}
                                {s.year && <span className="ml-1">· {s.year}</span>}
                                {s.section && <span className="ml-1">· Sec {s.section}</span>}
                              </p>
                            </div>
                            <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                              <Badge variant="outline" className="border-rose-300 bg-rose-50 text-[10px] text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                                <XCircle className="mr-0.5 h-2.5 w-2.5" />
                                {s.roundName}: {s.roundStatus.replace(/_/g, ' ')}
                              </Badge>
                              {s.finalResult && (
                                <span className="text-[10px] text-muted-foreground">
                                  Final: <span className="font-medium">{s.finalResult.replace(/_/g, ' ')}</span>
                                </span>
                              )}
                            </div>
                            <div className="flex shrink-0 items-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 gap-1 text-xs"
                                      onClick={() => handleView(s.id)}
                                    >
                                      <Eye className="h-3.5 w-3.5" />
                                      <span className="hidden sm:inline">View</span>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View full student profile</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="relative sm:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, register number, email..."
                  value={filters.search}
                  onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
                  className="pl-9"
                />
              </div>
              <Select value={filters.department} onValueChange={(v) => setFilters(f => ({ ...f, department: v }))}>
                <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
                <SelectContent>{DEPARTMENTS.map(d => <SelectItem key={d} value={d}>{d === 'ALL' ? 'All Departments' : d}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.year} onValueChange={(v) => setFilters(f => ({ ...f, year: v }))}>
                <SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger>
                <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y === 'ALL' ? 'All Years' : `Year ${y}`}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.section} onValueChange={(v) => setFilters(f => ({ ...f, section: v }))}>
                <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>{SECTIONS.map(s => <SelectItem key={s} value={s}>{s === 'ALL' ? 'All Sections' : `Section ${s}`}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.placementStatus} onValueChange={(v) => setFilters(f => ({ ...f, placementStatus: v }))}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s === 'ALL' ? 'All Statuses' : s.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.skill} onValueChange={(v) => setFilters(f => ({ ...f, skill: v }))}>
                <SelectTrigger><SelectValue placeholder="Skill" /></SelectTrigger>
                <SelectContent>{SKILLS.map(s => <SelectItem key={s} value={s}>{s === 'ALL' ? 'All Skills' : s}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={filters.strongSkill} onValueChange={(v) => setFilters(f => ({ ...f, strongSkill: v }))}>
                <SelectTrigger><SelectValue placeholder="Strong Skill" /></SelectTrigger>
                <SelectContent>{SKILLS.map(s => <SelectItem key={s} value={s}>{s === 'ALL' ? 'All Strong Skills' : s}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Min CGPA" value={filters.minCgpa} onChange={(e) => setFilters(f => ({ ...f, minCgpa: e.target.value }))} />
                <Input placeholder="Max Backlogs" value={filters.maxBacklogs} onChange={(e) => setFilters(f => ({ ...f, maxBacklogs: e.target.value }))} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk action bar */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{selectedIds.length} selected</span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline"><UserCheck className="mr-1 h-3.5 w-3.5" />Mark Attending</Button>
              <Button size="sm" variant="outline"><Download className="mr-1 h-3.5 w-3.5" />Export Selected</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}><X className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}

        {/* Students Grid — card-based layout with participation stats */}
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} className="h-72" />)}
          </div>
        ) : students.length === 0 ? (
          <Card>
            <CardContent className="p-0">
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title="No students found"
                description="Try adjusting your filters to see more students."
                action={<Button variant="outline" size="sm" onClick={handleReset}><Filter className="mr-2 h-3.5 w-3.5" />Reset Filters</Button>}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {students.map((s) => {
              const stats = (s as any).stats as StudentStats | undefined
              const strong = csvToArray(s.strongSkills)
              const skills = csvToArray(s.skills)
              return (
                <Card
                  key={s.id}
                  className="group relative cursor-pointer border-border transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-soft-lg dark:hover:border-emerald-800"
                  onClick={() => handleView(s.id)}
                >
                  {/* Checkbox in top-left corner */}
                  <div className="absolute left-3 top-3 z-10" onClick={(e) => e.stopPropagation()}>
                    <Checkbox checked={selectedIds.includes(s.id)} onCheckedChange={() => toggleSelect(s.id)} />
                  </div>

                  <CardContent className="p-5">
                    {/* Header: avatar + name + placement status */}
                    <div className="mb-4 flex items-start gap-3">
                      <Avatar className="h-12 w-12 ring-2 ring-transparent transition-all group-hover:ring-primary/30">
                        <AvatarFallback className={`${avatarColor(s.fullName)} text-sm font-semibold text-white`}>
                          {initials(s.fullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-foreground">{s.fullName}</p>
                        <p className="truncate text-xs text-muted-foreground">{s.registerNumber}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          <Badge variant="outline" className={STATUS_COLORS[s.placementStatus]}>
                            {s.placementStatus.replace(/_/g, ' ')}
                          </Badge>
                          {s.department && (
                            <Badge variant="outline" className="text-[10px]">{s.department}</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Academic info row */}
                    <div className="mb-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.year || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">Sec {s.section || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 shrink-0" />
                        <span>CGPA: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{s.cgpa?.toFixed(2) || '—'}</span></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <XCircle className="h-3 w-3 shrink-0" />
                        <span>Backlogs: <span className="font-medium">{s.backlogs ?? 0}</span></span>
                      </div>
                    </div>

                    {/* Contact info */}
                    <div className="mb-3 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.collegeEmail}</span>
                      </div>
                      {s.mobile && (
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{s.mobile}</span>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    {skills.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {skills.slice(0, 4).map(sk => (
                            <Badge key={sk} variant="outline" className="text-[10px]">{sk}</Badge>
                          ))}
                          {skills.length > 4 && <Badge variant="outline" className="text-[10px]">+{skills.length - 4}</Badge>}
                        </div>
                      </div>
                    )}

                    {/* Strong skills */}
                    {strong.length > 0 && (
                      <div className="mb-3">
                        <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Strong Skills</p>
                        <div className="flex flex-wrap gap-1">
                          {strong.slice(0, 3).map(sk => (
                            <Badge key={sk} variant="outline" className="border-amber-300 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                              <Award className="mr-0.5 h-2.5 w-2.5" />{sk}
                            </Badge>
                          ))}
                          {strong.length > 3 && <Badge variant="outline" className="text-[10px]">+{strong.length - 3}</Badge>}
                        </div>
                      </div>
                    )}

                    {/* Placement Stats — the key new feature */}
                    <div className="rounded-lg border border-border bg-muted/30 p-3">
                      <p className="mb-2 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <Briefcase className="h-3 w-3" />
                        Placement Stats
                      </p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        <div className="rounded-md bg-blue-50 p-2 dark:bg-blue-900/20">
                          <p className="text-base font-bold text-blue-600 dark:text-blue-400">{stats?.attended || 0}</p>
                          <p className="text-[9px] uppercase text-muted-foreground">Attended</p>
                        </div>
                        <div className="rounded-md bg-emerald-50 p-2 dark:bg-emerald-900/20">
                          <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{stats?.totalRoundsCleared || 0}</p>
                          <p className="text-[9px] uppercase text-muted-foreground">Cleared</p>
                        </div>
                        <div className="rounded-md bg-amber-50 p-2 dark:bg-amber-900/20">
                          <p className="text-base font-bold text-amber-600 dark:text-amber-400">{stats?.selectedCount || 0}</p>
                          <p className="text-[9px] uppercase text-muted-foreground">Selected</p>
                        </div>
                        <div className="rounded-md bg-rose-50 p-2 dark:bg-rose-900/20">
                          <p className="text-base font-bold text-rose-600 dark:text-rose-400">{stats?.rejectedCount || 0}</p>
                          <p className="text-[9px] uppercase text-muted-foreground">Rejected</p>
                        </div>
                      </div>
                      {/* In-progress + On-hold row */}
                      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          In Progress: <span className="font-medium text-foreground">{stats?.inProgressCount || 0}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          On Hold: <span className="font-medium text-foreground">{stats?.onHoldCount || 0}</span>
                        </span>
                      </div>
                    </div>

                    {/* Actions footer */}
                    <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                      <span className="text-[10px] text-muted-foreground">
                        Registered {s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '—'}
                      </span>
                      <div className="flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={(e) => { e.stopPropagation(); handleView(s.id) }}>
                                <Eye className="h-3.5 w-3.5" />
                                View Profile
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View full profile</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-900/20"
                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(s) }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete student</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalCount > pageSize && (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Showing {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, totalCount)} of {totalCount} students
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 0}
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
              >
                ← Previous
              </Button>
              <span className="text-sm font-medium">Page {currentPage + 1} of {Math.ceil(totalCount / pageSize)}</span>
              <Button
                variant="outline"
                size="sm"
                disabled={(currentPage + 1) * pageSize >= totalCount}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next →
              </Button>
            </div>
          </div>
        )}
        {totalCount > 0 && totalCount <= pageSize && (
          <p className="text-sm text-muted-foreground">Showing all {totalCount} student{totalCount !== 1 ? 's' : ''}</p>
        )}

        {/* Delete confirmation dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-600" />
                Delete Student Record
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete <strong>{deleteTarget?.fullName}</strong>{' '}
                ({deleteTarget?.registerNumber})?
                This will also remove all of their certifications, projects, drive participations, round results,
                notifications, and login sessions. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  )
}
