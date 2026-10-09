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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import {
  Users, Search, Download, Filter, Eye, Award, X, RefreshCw, UserCheck, ShieldCheck,
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
  const [selected, setSelectedStudents] = useState<string[]>([])
  // No deleteTarget / deleting state here: students registered on the website
  // can NOT be deleted from the UI. Staff must remove them directly from the
  // database. The DELETE /api/students/[id] endpoint also returns 403.
  const [totalCount, setTotalCount] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const pageSize = 100

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
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
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
    const headers = ['Register Number', 'Name', 'Email', 'Department', 'Year', 'Section', 'CGPA', 'Backlogs', 'Placement Status', 'Skills']
    const rows = students.map(s => [
      s.registerNumber, s.fullName, s.collegeEmail, s.department, s.year, s.section,
      s.cgpa, s.backlogs, s.placementStatus, s.skills?.replace(/,/g, ';')
    ])
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
            <h1 className="text-2xl font-bold">Students</h1>
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
        {selected.length > 0 && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{selected.length} selected</span>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline"><UserCheck className="mr-1 h-3.5 w-3.5" />Mark Attending</Button>
              <Button size="sm" variant="outline"><Download className="mr-1 h-3.5 w-3.5" />Export Selected</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedStudents([])}><X className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        )}

        {/* Students Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-2 p-4">{Array.from({length: 8}).map((_,i) => <div key={i} className="h-12 rounded-lg shimmer" />)}</div>
            ) : students.length === 0 ? (
              <EmptyState
                icon={<Users className="h-6 w-6" />}
                title="No students found"
                description="Try adjusting your filters to see more students."
                action={<Button variant="outline" size="sm" onClick={handleReset}><Filter className="mr-2 h-3.5 w-3.5" />Reset Filters</Button>}
              />
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"><Checkbox checked={selected.length === students.length && students.length > 0} onCheckedChange={(checked) => setSelectedStudents(checked ? students.map(s => s.id) : [])} /></TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="hidden md:table-cell">Department</TableHead>
                      <TableHead className="hidden md:table-cell">Year</TableHead>
                      <TableHead className="hidden lg:table-cell">Section</TableHead>
                      <TableHead>CGPA</TableHead>
                      <TableHead className="hidden lg:table-cell">Strong Skills</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students.map((s) => {
                      const strong = csvToArray(s.strongSkills)
                      return (
                        <TableRow
                          key={s.id}
                          className="group cursor-pointer transition-colors hover:bg-accent/40"
                          onClick={() => handleView(s.id)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox checked={selected.includes(s.id)} onCheckedChange={() => toggleSelect(s.id)} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 ring-2 ring-transparent transition-all group-hover:ring-primary/30">
                                <AvatarFallback className={`${avatarColor(s.fullName)} text-xs font-semibold text-white`}>
                                  {initials(s.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="truncate font-medium">{s.fullName}</p>
                                <p className="truncate text-xs text-muted-foreground">{s.registerNumber}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell"><Badge variant="outline">{s.department}</Badge></TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground">{s.year}</TableCell>
                          <TableCell className="hidden lg:table-cell text-muted-foreground">{s.section}</TableCell>
                          <TableCell>
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{s.cgpa?.toFixed(2)}</span>
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {strong.slice(0, 2).map(sk => (
                                <Badge key={sk} variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                  <Award className="mr-1 h-2.5 w-2.5" />{sk}
                                </Badge>
                              ))}
                              {strong.length > 2 && <Badge variant="outline" className="text-xs">+{strong.length - 2}</Badge>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_COLORS[s.placementStatus]}>
                              {s.placementStatus.replace(/_/g, ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleView(s.id) }}>
                                      <Eye className="h-3.5 w-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View profile</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
                                      onClick={(e) => { e.stopPropagation(); handleView(s.id) }}
                                    >
                                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Protected record — edit profile instead (deletion requires database access)</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

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
