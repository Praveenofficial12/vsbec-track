'use client'
import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, apiPost, apiPut, formatDate, STATUS_COLORS, getCompanyLogo } from '@/lib/api'
import { StudentLayout } from './StudentLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import {
  Building2, Search, Calendar, Briefcase, MapPin, ExternalLink, CheckCircle2, X,
  Trophy, Clock, RefreshCw, AlertCircle, ListChecks, Bell, XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Company, Drive, DriveParticipation, Round, RoundResult, Student } from '@/lib/types'

const ROUND_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'CLEARED', label: 'Cleared' },
  { value: 'NOT_CLEARED', label: 'Not Cleared' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'ON_HOLD', label: 'On Hold' },
] as const

const FINAL_RESULT_OPTIONS = [
  { value: 'SELECTED', label: 'Selected', className: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
  { value: 'REJECTED', label: 'Not Selected', className: 'bg-rose-600 hover:bg-rose-700 text-white' },
  { value: 'ON_HOLD', label: 'On Hold', className: 'bg-amber-500 hover:bg-amber-600 text-white' },
] as const

export function StudentCompanies() {
  const user = useAppStore((s) => s.user)
  const [companies, setCompanies] = useState<Company[]>([])
  const [drives, setDrives] = useState<Drive[]>([])
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedDrive, setSelectedDrive] = useState<Drive | null>(null)
  const [myParticipation, setMyParticipation] = useState<DriveParticipation | null>(null)
  const [roundResults, setRoundResults] = useState<RoundResult[]>([])
  const [updatingRound, setUpdatingRound] = useState<string | null>(null)
  const [updatingFinal, setUpdatingFinal] = useState(false)
  const lastRefreshRef = useRef<number>(Date.now())

  const loadStudentAndDrives = async () => {
    try {
      const [c, d] = await Promise.all([
        apiGet<{ companies: Company[] }>('/api/companies'),
        apiGet<{ drives: Drive[] }>('/api/drives'),
      ])
      setCompanies(c.companies)
      setDrives(d.drives)
      if (user?.id) {
        const r = await apiGet<{ student: Student }>(`/api/students/${user.id}`)
        setStudent(r.student)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStudentAndDrives()
  }, [user?.id])

  // Auto-refresh every 15 seconds so the student can see round updates
  // (from admin or their own self-marks) without manually refreshing.
  useEffect(() => {
    const id = setInterval(async () => {
      // Re-fetch the selected drive's participation so the round status form
      // stays in sync if the admin updates results.
      if (selectedDrive && user?.id) {
        try {
          const r = await apiGet<{ participations: DriveParticipation[] }>(
            `/api/participations?studentId=${user.id}&driveId=${selectedDrive.id}`
          )
          const p = r.participations?.[0] || null
          setMyParticipation(p)
          setRoundResults(p?.roundResults || [])
        } catch {
          /* best-effort */
        }
      }
      lastRefreshRef.current = Date.now()
    }, 15000)
    return () => clearInterval(id)
  }, [selectedDrive, user?.id])

  // Load the student's participation whenever a drive is opened
  useEffect(() => {
    if (!selectedDrive || !user?.id) {
      setMyParticipation(null)
      setRoundResults([])
      return
    }
    apiGet<{ participations: DriveParticipation[] }>(
      `/api/participations?studentId=${user.id}&driveId=${selectedDrive.id}`
    ).then((r) => {
      const p = r.participations?.[0] || null
      setMyParticipation(p)
      setRoundResults(p?.roundResults || [])
    }).catch(() => {
      setMyParticipation(null)
      setRoundResults([])
    })
  }, [selectedDrive, user?.id])

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
    // Check eligible years (required)
    const years = (drive.eligibleYears || '').split(',').map(s => s.trim()).filter(Boolean)
    if (years.length > 0 && !years.includes(student.year || '')) return false
    // Check eligible departments (optional — if empty, all departments are eligible)
    const depts = (drive.eligibleDepartments || '').split(',').map(s => s.trim()).filter(Boolean)
    if (depts.length > 0 && !depts.includes(student.department || '')) return false
    // Check min CGPA (only if student has CGPA data)
    if (drive.minCgpa && student.cgpa !== null && student.cgpa !== undefined && (student.cgpa || 0) < drive.minCgpa) return false
    // Check max backlogs
    if (drive.maxBacklogs !== null && drive.maxBacklogs !== undefined && (student.backlogs || 0) > drive.maxBacklogs) return false
    // Check min 10th percentage (only if student has the data)
    if (drive.minTenthPercentage && student.tenthPercentage !== null && student.tenthPercentage !== undefined && (student.tenthPercentage || 0) < drive.minTenthPercentage) return false
    // Check min 12th percentage (only if student has the data)
    if (drive.minTwelfthPercentage && student.twelfthPercentage !== null && student.twelfthPercentage !== undefined && (student.twelfthPercentage || 0) < drive.minTwelfthPercentage) return false
    return true
  }

  const handleAttend = async (drive: Drive, willAttend: boolean) => {
    if (!willAttend) {
      // Confirm before marking as not attending
      if (!confirm('Are you sure you want to mark as "Will Not Attend"? This drive will be closed for you and you cannot participate in it.')) return
    } else {
      // Confirm before marking as attending
      if (!confirm(`Are you sure you want to attend "${drive.driveName}"? You can then track your round progress in this drive.`)) return
    }
    try {
      await apiPost('/api/participations', {
        studentId: user?.id,
        driveId: drive.id,
        attendance: willAttend ? 'ATTENDING' : 'NOT_ATTENDING',
        action: 'STUDENT_CONFIRM',
      })
      if (willAttend) {
        toast.success('Marked as attending! Track your rounds below.')
        // Refresh participation state
        const r = await apiGet<{ participations: DriveParticipation[] }>(
          `/api/participations?studentId=${user?.id}&driveId=${drive.id}`
        )
        const p = r.participations?.[0] || null
        setMyParticipation(p)
        setRoundResults(p?.roundResults || [])
      } else {
        toast.success('Marked as not attending. The drive is now closed for you.')
        // Close the dialog — drive is blocked for this user
        setSelectedDrive(null)
      }
      // Refresh student data
      if (user?.id) {
        const sr = await apiGet<{ student: Student }>(`/api/students/${user.id}`)
        setStudent(sr.student)
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to update attendance')
    }
  }

  const handleRoundStatusChange = async (round: Round, newStatus: string) => {
    if (!myParticipation) return

    // If marking as NOT_CLEARED or ABSENT, show confirmation popup
    if (newStatus === 'NOT_CLEARED' || newStatus === 'ABSENT') {
      const confirmed = window.confirm(
        `You have not cleared the ${round.roundName} process.\n\n` +
        `This will mark the entire drive as "Not Cleared" and close it for you. ` +
        `You will be redirected to My Drives page.\n\n` +
        `Do you want to proceed?`
      )
      if (!confirmed) return
    }

    setUpdatingRound(round.id)
    try {
      await apiPut('/api/participations', {
        participationId: myParticipation.id,
        roundId: round.id,
        status: newStatus,
        source: 'STUDENT',
      })

      if (newStatus === 'NOT_CLEARED' || newStatus === 'ABSENT') {
        // Drive is closed — show message and redirect to My Drives
        toast.success('You have not cleared the process. The drive is now closed for you.')
        setSelectedDrive(null)
        // Redirect to My Drives page
        setTimeout(() => {
          useAppStore.getState().setView('student-drives')
        }, 500)
      } else {
        toast.success(`Round "${round.roundName}" updated to ${newStatus.replace(/_/g, ' ')}`)
      }

      // Refresh participation + student
      const r = await apiGet<{ participations: DriveParticipation[] }>(
        `/api/participations?studentId=${user?.id}&driveId=${selectedDrive?.id}`
      )
      const p = r.participations?.[0] || null
      setMyParticipation(p)
      setRoundResults(p?.roundResults || [])
      if (user?.id) {
        const sr = await apiGet<{ student: Student }>(`/api/students/${user.id}`)
        setStudent(sr.student)
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to update round status')
    } finally {
      setUpdatingRound(null)
    }
  }

  const handleFinalResult = async (finalResult: string) => {
    if (!myParticipation || !selectedDrive) return

    // Show confirmation popup
    const messages: Record<string, string> = {
      'SELECTED': `You are marking yourself as "Selected" for ${selectedDrive.company?.name}.\n\nThis will close the drive. You will be redirected to My Drives.\n\nDo you want to proceed?`,
      'REJECTED': `You are marking yourself as "Not Selected" for ${selectedDrive.company?.name}.\n\nThis will close the drive. You will be redirected to My Drives.\n\nDo you want to proceed?`,
      'ON_HOLD': `You are marking your result as "On Hold" for ${selectedDrive.company?.name}.\n\nThe drive will remain open and you can re-enter details later.\n\nDo you want to proceed?`,
    }
    if (!confirm(messages[finalResult] || 'Confirm final result?')) return

    setUpdatingFinal(true)
    try {
      await apiPut('/api/participations', {
        participationId: myParticipation.id,
        finalResult,
        jobRole: selectedDrive.jobRole,
        ctc: selectedDrive.ctc,
        joiningLocation: selectedDrive.location,
        joiningDate: '2026-07-01',
        source: 'STUDENT',
      })

      if (finalResult === 'ON_HOLD') {
        toast.success('Result marked as On Hold. You can re-enter details later.')
        // Refresh to show updated state but keep dialog open
        const r = await apiGet<{ participations: DriveParticipation[] }>(
          `/api/participations?studentId=${user?.id}&driveId=${selectedDrive.id}`
        )
        const p = r.participations?.[0] || null
        setMyParticipation(p)
        setRoundResults(p?.roundResults || [])
      } else {
        // SELECTED or REJECTED — close the drive and redirect
        toast.success(`Final result: ${finalResult.replace(/_/g, ' ')}. The drive is now closed for you.`)
        setSelectedDrive(null)
        setTimeout(() => {
          useAppStore.getState().setView('student-drives')
        }, 500)
      }

      if (user?.id) {
        const sr = await apiGet<{ student: Student }>(`/api/students/${user.id}`)
        setStudent(sr.student)
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to update final result')
    } finally {
      setUpdatingFinal(false)
    }
  }

  if (loading) {
    return <StudentLayout><div className="p-6"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} className="h-48" />)}</div></div></StudentLayout>
  }

  const rounds = selectedDrive?.rounds || []
  const isAttending = myParticipation && ['ATTENDING', 'IN_PROGRESS', 'SELECTED', 'REJECTED', 'ON_HOLD'].includes(myParticipation.attendance)

  const getRoundStatus = (roundId: string): string => {
    const rr = roundResults.find((r) => r.roundId === roundId)
    return rr?.status || 'PENDING'
  }

  return (
    <StudentLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Companies & Drives</h1>
            <p className="text-sm text-muted-foreground">Browse all companies and placement drives</p>
          </div>
          <Badge variant="outline" className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
            <Clock className="mr-1 h-3 w-3" /> Auto-refreshes every 15s
          </Badge>
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
              const participation = student?.participations?.find(p => p.driveId === drive.id)
              const alreadyParticipated = !!participation
              // Block drive if student marked NOT_ATTENDING, REJECTED, or WITHDRAWN
              const driveBlocked = participation && ['NOT_ATTENDING', 'REJECTED', 'WITHDRAWN'].includes(participation.attendance)
              const canOpen = eligible && !driveBlocked
              return (
                <Card
                  key={drive.id}
                  className={`group overflow-hidden border-border transition-all ${
                    canOpen
                      ? 'cursor-pointer hover:-translate-y-1 hover:border-emerald-300 hover:shadow-soft-lg dark:hover:border-emerald-800'
                      : 'cursor-not-allowed opacity-75'
                  }`}
                  onClick={() => {
                    if (driveBlocked) {
                      toast.error('This drive is closed for you. You marked it as not attending or not cleared.')
                      return
                    }
                    if (!eligible) {
                      toast.error('You are not eligible for this drive. Please check the eligibility criteria.')
                      return
                    }
                    setSelectedDrive(drive)
                  }}
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
                      {driveBlocked && (
                        <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-900/30 dark:text-rose-300">
                          <XCircle className="mr-1 h-3 w-3" /> Closed
                        </Badge>
                      )}
                      {alreadyParticipated && !driveBlocked && (
                        <Badge variant="secondary">Applied</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Drive Detail Modal with interactive round status form */}
        <Dialog open={!!selectedDrive} onOpenChange={(open) => !open && setSelectedDrive(null)}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto scrollbar-thin">
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

                {/* Admin Announcement — visible to students */}
                {selectedDrive.announcement && (
                  <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                    <div className="flex items-start gap-2">
                      <Bell className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">📢 Announcement from Placement Office</p>
                        <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">{selectedDrive.announcement}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Attendance buttons */}
                {!isAttending && (
                  <div className="flex gap-2 border-t border-border pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => handleAttend(selectedDrive, false)}>
                      Will Not Attend
                    </Button>
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleAttend(selectedDrive, true)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Will Attend
                    </Button>
                  </div>
                )}

                {/* Interactive round status form — shown after the student
                    marks "Will Attend". The student can self-mark each
                    round and the form auto-refreshes every 15s. */}
                {isAttending && myParticipation && (
                  <div className="space-y-4 border-t border-border pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          <ListChecks className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                          Round Status
                        </p>
                        <p className="text-xs text-muted-foreground">Self-report your progress in each round. Updates every 15 seconds.</p>
                      </div>
                      <Badge variant="outline" className={STATUS_COLORS[myParticipation.attendance] || STATUS_COLORS.PENDING}>
                        {myParticipation.attendance.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    {rounds.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
                        No rounds have been configured for this drive yet.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {rounds.map((round, idx) => {
                          const status = getRoundStatus(round.id)
                          // Check if any previous round was NOT_CLEARED or ABSENT — if so, drive is closed
                          const previousRoundFailed = idx > 0 && rounds.slice(0, idx).some((prevRound) => {
                            const prevStatus = getRoundStatus(prevRound.id)
                            return prevStatus === 'NOT_CLEARED' || prevStatus === 'ABSENT'
                          })
                          // Check if all previous rounds are CLEARED — only then can this round be marked
                          const previousRoundsCleared = idx === 0 || rounds.slice(0, idx).every((prevRound) => {
                            return getRoundStatus(prevRound.id) === 'CLEARED'
                          })
                          // If drive is already rejected, lock everything
                          const driveClosed = myParticipation?.finalResult === 'REJECTED' || previousRoundFailed

                          return (
                            <div key={round.id} className={`flex flex-wrap items-center gap-3 rounded-lg border p-3 ${
                              driveClosed ? 'border-rose-200 bg-rose-50/50 dark:border-rose-800 dark:bg-rose-900/10' :
                              previousRoundsCleared ? 'border-border bg-card' : 'border-border bg-muted/30 opacity-70'
                            }`}>
                              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                status === 'CLEARED' ? 'bg-emerald-600 text-white' :
                                status === 'NOT_CLEARED' || status === 'ABSENT' ? 'bg-rose-600 text-white' :
                                status === 'ON_HOLD' ? 'bg-amber-500 text-white' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {status === 'CLEARED' ? <CheckCircle2 className="h-4 w-4" /> :
                                 status === 'NOT_CLEARED' || status === 'ABSENT' ? <X className="h-4 w-4" /> :
                                 idx + 1}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium">{round.roundName}</p>
                                <p className="truncate text-xs text-muted-foreground">{round.description}</p>
                                {driveClosed && status === 'NOT_CLEARED' && (
                                  <p className="text-[10px] font-medium text-rose-600 dark:text-rose-400">Drive closed — not cleared</p>
                                )}
                                {!previousRoundsCleared && !driveClosed && (
                                  <p className="text-[10px] text-muted-foreground">Locked — clear previous rounds first</p>
                                )}
                              </div>
                              {driveClosed ? (
                                <Badge variant="outline" className={`${STATUS_COLORS[status] || STATUS_COLORS.PENDING} text-xs`}>
                                  {status ? status.replace(/_/g, ' ') : 'Locked'}
                                </Badge>
                              ) : previousRoundsCleared ? (
                                <Select
                                  value={status}
                                  onValueChange={(v) => handleRoundStatusChange(round, v)}
                                  disabled={updatingRound === round.id}
                                >
                                  <SelectTrigger className="h-8 w-36 text-xs">
                                    {updatingRound === round.id ? 'Updating...' : <SelectValue />}
                                  </SelectTrigger>
                                  <SelectContent>
                                    {ROUND_STATUS_OPTIONS.map((opt) => (
                                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground">Locked</Badge>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Final Result section — locked until ALL rounds are marked */}
                    {myParticipation?.finalResult !== 'REJECTED' && (() => {
                      const allRoundsMarked = rounds.length > 0 && rounds.every((r) => {
                        const status = getRoundStatus(r.id)
                        return status && status !== 'PENDING'
                      })
                      return (
                    <div className={`rounded-xl border p-4 ${allRoundsMarked ? 'border-border bg-muted/30' : 'border-muted bg-muted/20 opacity-60'}`}>
                      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        Final Result
                        {!allRoundsMarked && <span className="ml-2 text-xs font-normal text-muted-foreground">(Locked — mark all rounds first)</span>}
                      </p>
                      {allRoundsMarked ? (
                        <>
                          <p className="mb-3 text-xs text-muted-foreground">
                            All rounds completed. Self-report your final outcome below.
                          </p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {FINAL_RESULT_OPTIONS.map((opt) => (
                          <Button
                            key={opt.value}
                            type="button"
                            variant="outline"
                            disabled={updatingFinal}
                            onClick={() => handleFinalResult(opt.value)}
                            className={`${opt.className} border-0`}
                          >
                            {opt.label}
                          </Button>
                        ))}
                      </div>
                      {myParticipation.finalResult && (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Current final result: <Badge variant="outline" className={STATUS_COLORS[myParticipation.finalResult] || STATUS_COLORS.PENDING}>{myParticipation.finalResult.replace(/_/g, ' ')} (self-reported)</Badge>
                        </p>
                      )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">Complete all {rounds.length} rounds above to unlock the Final Result section.</p>
                      )}
                    </div>
                    )
                    })()}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </StudentLayout>
  )
}
