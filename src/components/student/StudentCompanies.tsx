'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, apiPost, formatDate, STATUS_COLORS, getCompanyLogo } from '@/lib/api'
import { StudentLayout } from './StudentLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import { Building2, Search, Calendar, Briefcase, MapPin, Globe, ExternalLink, CheckCircle2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Company, Drive, Student } from '@/lib/types'

export function StudentCompanies() {
  const user = useAppStore((s) => s.user)
  const [companies, setCompanies] = useState<Company[]>([])
  const [drives, setDrives] = useState<Drive[]>([])
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedDrive, setSelectedDrive] = useState<Drive | null>(null)

  useEffect(() => {
    Promise.all([
      apiGet<{ companies: Company[] }>('/api/companies'),
      apiGet<{ drives: Drive[] }>('/api/drives'),
      user?.id ? apiGet<{ student: Student }>(`/api/students/${user.id}`) : Promise.resolve(null),
    ]).then(([c, d, s]) => {
      setCompanies(c.companies)
      setDrives(d.drives)
      if (s) setStudent(s.student)
    }).finally(() => setLoading(false))
  }, [user?.id])

  const filteredDrives = drives.filter((d) => {
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return d.driveName.toLowerCase().includes(q) || d.company?.name?.toLowerCase().includes(q)
    }
    return true
  })

  const isEligible = (drive: Drive) => {
    if (!student) return false
    const depts = (drive.eligibleDepartments || '').split(',').map(s => s.trim())
    if (depts.length > 0 && !depts.includes(student.department || '')) return false
    if (drive.minCgpa && (student.cgpa || 0) < drive.minCgpa) return false
    if (drive.maxBacklogs !== null && drive.maxBacklogs !== undefined && (student.backlogs || 0) > drive.maxBacklogs) return false
    return true
  }

  const handleAttend = async (drive: Drive, willAttend: boolean) => {
    try {
      await apiPost('/api/participations', {
        studentId: user?.id,
        driveId: drive.id,
        attendance: willAttend ? 'ATTENDING' : 'NOT_ATTENDING',
        action: 'STUDENT_CONFIRM',
      })
      toast.success(willAttend ? 'Marked as attending!' : 'Marked as not attending')
      setSelectedDrive(null)
      // Refresh student data
      if (user?.id) {
        const r = await apiGet<{ student: Student }>(`/api/students/${user.id}`)
        setStudent(r.student)
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to update attendance')
    }
  }

  if (loading) {
    return <StudentLayout><div className="p-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} className="h-48" />)}</div></div></StudentLayout>
  }

  return (
    <StudentLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold">Companies & Drives</h1>
          <p className="text-sm text-muted-foreground">Browse all companies and placement drives</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by company or drive name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-48"><SelectValue placeholder="All statuses" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="UPCOMING">Upcoming</SelectItem>
              <SelectItem value="REGISTRATION_OPEN">Registration Open</SelectItem>
              <SelectItem value="ONGOING">Ongoing</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Drives Grid */}
        {filteredDrives.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No drives found"
            description="Try adjusting your filters or check back later."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredDrives.map((drive) => {
              const eligible = isEligible(drive)
              const alreadyParticipated = student?.participations?.some(p => p.driveId === drive.id)
              return (
                <Card
                  key={drive.id}
                  className="group cursor-pointer overflow-hidden border-border transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-soft-lg dark:hover:border-emerald-800"
                  onClick={() => setSelectedDrive(drive)}
                >
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-border">
                          {drive.company?.logoUrl ? (
                            <img src={drive.company.logoUrl} alt={drive.company.name} className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{drive.company?.name}</p>
                          <p className="text-xs text-muted-foreground">{drive.jobRole}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`shrink-0 ${STATUS_COLORS[drive.status]}`}>
                        {drive.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <p className="mb-3 line-clamp-1 text-sm font-medium">{drive.driveName}</p>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2"><Calendar className="h-3 w-3 shrink-0" /> {formatDate(drive.driveDate)}</div>
                      <div className="flex items-center gap-2"><Briefcase className="h-3 w-3 shrink-0" /> {drive.ctc || '—'}</div>
                      <div className="flex items-center gap-2"><MapPin className="h-3 w-3 shrink-0" /> {drive.location || '—'}</div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      {eligible ? (
                        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Eligible
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                          <X className="mr-1 h-3 w-3" /> Not Eligible
                        </Badge>
                      )}
                      {alreadyParticipated && (
                        <Badge variant="secondary">Applied</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Drive Detail Modal */}
        <Dialog open={!!selectedDrive} onOpenChange={(open) => !open && setSelectedDrive(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-border">
                  {selectedDrive?.company?.logoUrl ? (
                    <img src={selectedDrive.company.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <DialogTitle className="text-xl">{selectedDrive?.company?.name}</DialogTitle>
                  <DialogDescription>{selectedDrive?.driveName}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {selectedDrive && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Job Role</p>
                    <p className="font-medium">{selectedDrive.jobRole || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">CTC</p>
                    <p className="font-medium">{selectedDrive.ctc || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">{selectedDrive.location || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Drive Date</p>
                    <p className="font-medium">{formatDate(selectedDrive.driveDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Application Deadline</p>
                    <p className="font-medium">{formatDate(selectedDrive.applicationDeadline)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge variant="outline" className={STATUS_COLORS[selectedDrive.status]}>
                      {selectedDrive.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>

                {selectedDrive.eligibleDepartments && (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Eligible Departments</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDrive.eligibleDepartments.split(',').map((d) => (
                        <Badge key={d} variant="outline">{d.trim()}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDrive.requiredSkills && (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Required Skills</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedDrive.requiredSkills.split(',').map((s) => (
                        <Badge key={s} variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">{s.trim()}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDrive.minCgpa && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Min CGPA</p>
                      <p className="font-semibold">{selectedDrive.minCgpa}</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-xs text-muted-foreground">Max Backlogs</p>
                      <p className="font-semibold">{selectedDrive.maxBacklogs ?? 'No limit'}</p>
                    </div>
                  </div>
                )}

                {selectedDrive.selectionProcess && (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">Selection Process</p>
                    <p className="text-sm">{selectedDrive.selectionProcess}</p>
                  </div>
                )}

                <div className="flex gap-2 border-t border-border pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => handleAttend(selectedDrive, false)}>
                    Will Not Attend
                  </Button>
                  <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAttend(selectedDrive, true)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Will Attend
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  )
}
