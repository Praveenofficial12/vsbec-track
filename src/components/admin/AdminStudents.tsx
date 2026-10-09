'use client'
import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, csvToArray, STATUS_COLORS, formatDate, avatarColor, initials } from '@/lib/api'
import { AdminLayout } from './AdminLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import {
  Users, Search, Download, Filter, Eye, Award, X, RefreshCw, UserCheck, ShieldCheck,
  Target, CheckCircle2, XCircle, Clock, Briefcase, GraduationCap, MapPin, Mail,
  Phone, Calendar, TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Student } from '@/lib/types'

// Per requirement: registered students can NOT be removed from the website UI.
// They can only be removed by staff directly from the database. There is no
// Delete button / dialog anywhere on this page, and the DELETE /api/students/[id]
// endpoint returns 403.

// 13 official V.S.B. Engineering College departments (matches DEPARTMENT_PASSWORDS)
const DEPARTMENTS = [
  'ALL', 'AI-DS', 'AI-ML', 'BT', 'BME', 'CHEM', 'CIVIL', 'CCE', 'CSBS', 'CSE', 'ECE', 'EEE', 'IT', 'MECH',
]
const YEARS = ['ALL', '1st Year', '2nd Year', '3rd Year', '4th Year']
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
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
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
                <SelectContent>{YEARS.map(y => <SelectItem key={y} value={y}>{y === 'ALL' ? 'All Years' : y}</SelectItem>)}</SelectContent>
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
                                className="h-7 w-7"
                                onClick={(e) => { e.stopPropagation(); handleView(s.id) }}
                              >
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Protected record — deletion requires DB access</TooltipContent>
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

        {/* Info banner: registered students are protected from UI deletion. */}
        <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <p>
            <strong>Student records are protected.</strong> Once a student registers on the website, their
            account cannot be removed from this panel. To permanently delete a student, staff must remove
            the record directly from the database.
          </p>
        </div>
      </div>
    </AdminLayout>
  )
}
