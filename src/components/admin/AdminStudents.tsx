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
  Users, Search, Download, Filter, Eye, Award, X, RefreshCw, UserCheck
} from 'lucide-react'
import type { Student } from '@/lib/types'

const DEPARTMENTS = ['ALL', 'AI & DS', 'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL']
const YEARS = ['ALL', '1st Year', '2nd Year', '3rd Year', '4th Year']
const SECTIONS = ['ALL', 'A', 'B', 'C', 'D']
const STATUSES = ['ALL', 'PLACED', 'IN_PROCESS', 'UNPLACED']
const SKILLS = ['ALL', 'Java', 'Python', 'JavaScript', 'React', 'SQL', 'Cloud', 'Machine Learning', 'C++']

export function AdminStudents() {
  const setView = useAppStore((s) => s.setView)
  const setSelected = useAppStore((s) => s.setSelected)
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '', department: 'ALL', year: 'ALL', section: 'ALL',
    placementStatus: 'ALL', skill: 'ALL', strongSkill: 'ALL', minCgpa: '', maxBacklogs: '',
  })
  const [selected, setSelectedStudents] = useState<string[]>([])

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([k, v]) => {
        if (v && v !== 'ALL') params.append(k, v)
      })
      const r = await apiGet<{ students: Student[]; total: number }>(`/api/students?${params}`)
      setStudents(r.students)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  const handleReset = () => setFilters({ search: '', department: 'ALL', year: 'ALL', section: 'ALL', placementStatus: 'ALL', skill: 'ALL', strongSkill: 'ALL', minCgpa: '', maxBacklogs: '' })

  const toggleSelect = (id: string) => {
    setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id])
  }

  const handleView = (id: string) => {
    setSelected('studentId', id)
    setView('admin-student-detail')
  }

  const handleExport = () => {
    if (students.length === 0) return
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
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Students</h1>
            <p className="text-sm text-muted-foreground">{loading ? 'Loading...' : `${students.length} students found`}</p>
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
                      <TableHead className="w-10"></TableHead>
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
      </div>
    </AdminLayout>
  )
}
