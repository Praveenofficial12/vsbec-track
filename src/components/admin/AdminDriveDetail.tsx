'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, apiPut, csvToArray, formatDate, STATUS_COLORS } from '@/lib/api'
import { AdminLayout } from './AdminLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import { StatCard } from '@/components/common/StatCard'
import { toast } from 'sonner'
import {
  ArrowLeft, Calendar, Briefcase, MapPin, Users, Building2, Target,
  CheckCircle2, XCircle, Clock, Award, Activity, AlertCircle, ListChecks
} from 'lucide-react'
import type { Drive, DriveParticipation, Student } from '@/lib/types'
import { avatarColor, initials } from '@/lib/api'

export function AdminDriveDetail() {
  const driveId = useAppStore((s) => s.selectedDriveId)
  const setView = useAppStore((s) => s.setView)
  const [drive, setDrive] = useState<Drive | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  useEffect(() => {
    if (!driveId) return
    apiGet<{ drive: Drive }>(`/api/drives/${driveId}`).then(r => setDrive(r.drive)).finally(() => setLoading(false))
  }, [driveId])

  const updateParticipation = async (participation: DriveParticipation, updates: any) => {
    setUpdating(participation.id)
    try {
      await apiPut('/api/participations', { participationId: participation.id, ...updates })
      toast.success('Updated successfully')
      // Refresh
      const r = await apiGet<{ drive: Drive }>(`/api/drives/${driveId}`)
      setDrive(r.drive)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUpdating(null)
    }
  }

  if (loading) return <AdminLayout><div className="p-6 space-y-4"><CardSkeleton className="h-32" /><div className="grid gap-4 sm:grid-cols-4">{Array.from({length:4}).map((_,i)=><CardSkeleton key={i} className="h-24" />)}</div><CardSkeleton className="h-96" /></div></AdminLayout>
  if (!drive) return <AdminLayout><div className="p-6"><EmptyState icon={<AlertCircle className="h-6 w-6" />} title="Drive not found" /></div></AdminLayout>

  const participants = drive.participants || []
  const rounds = drive.rounds || []
  const attended = participants.filter(p => ['ATTENDING', 'IN_PROGRESS', 'SELECTED', 'REJECTED', 'ON_HOLD'].includes(p.attendance))
  const selected = participants.filter(p => p.finalResult === 'SELECTED')
  const rejected = participants.filter(p => p.finalResult === 'REJECTED')
  const inProgress = participants.filter(p => p.attendance === 'IN_PROGRESS')

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <button onClick={() => setView('admin-drives')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Drives
        </button>

        {/* Header */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-700 p-6 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-white/15 ring-2 ring-white/30">
                {drive.company?.logoUrl ? (
                  <img src={drive.company.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-8 w-8" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{drive.company?.name}</h1>
                <p className="text-white/80">{drive.driveName}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white/15 px-2 py-0.5">{drive.jobRole}</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5">{drive.ctc}</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5">{formatDate(drive.driveDate)}</span>
                </div>
              </div>
              <Badge variant="outline" className={`self-start ${STATUS_COLORS[drive.status]}`}>{drive.status.replace(/_/g, ' ')}</Badge>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title="Total Participants" value={participants.length} icon={<Users className="h-5 w-5" />} accent="violet" />
          <StatCard title="Attended" value={attended.length} icon={<CheckCircle2 className="h-5 w-5" />} accent="emerald" />
          <StatCard title="Selected" value={selected.length} icon={<Award className="h-5 w-5" />} accent="amber" />
          <StatCard title="In Progress" value={inProgress.length} icon={<Activity className="h-5 w-5" />} accent="sky" />
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start overflow-x-auto scrollbar-thin">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="rounds">Rounds</TabsTrigger>
            <TabsTrigger value="results">Final Results</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4 animate-fade-in-up">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Drive Details</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Job Role</span><span className="font-medium">{drive.jobRole}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">CTC</span><span className="font-medium">{drive.ctc}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium">{drive.location}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Drive Date</span><span className="font-medium">{formatDate(drive.driveDate)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Application Deadline</span><span className="font-medium">{formatDate(drive.applicationDeadline)}</span></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Eligibility Criteria</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Eligible Departments</p>
                    <div className="flex flex-wrap gap-1">
                      {csvToArray(drive.eligibleDepartments).map(d => <Badge key={d} variant="outline">{d}</Badge>)}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Required Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {csvToArray(drive.requiredSkills).map(s => (
                        <Badge key={s} variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">{s}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 rounded-lg bg-muted/50 p-2 text-center">
                      <p className="text-xs text-muted-foreground">Min CGPA</p>
                      <p className="font-semibold">{drive.minCgpa}</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-muted/50 p-2 text-center">
                      <p className="text-xs text-muted-foreground">Max Backlogs</p>
                      <p className="font-semibold">{drive.maxBacklogs ?? '—'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Selection Process</p>
                    <p className="text-xs">{drive.selectionProcess}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Participants */}
          <TabsContent value="participants" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Participants ({participants.length})</CardTitle>
                <CardDescription>Update attendance status for each student</CardDescription>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <EmptyState icon={<Users className="h-6 w-6" />} title="No participants yet" description="Students will appear here once they register for the drive." />
                ) : (
                  <div className="overflow-x-auto scrollbar-thin">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead className="hidden md:table-cell">Department</TableHead>
                          <TableHead>CGPA</TableHead>
                          <TableHead className="hidden lg:table-cell">Current Round</TableHead>
                          <TableHead>Attendance</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {participants.map(p => (
                          <TableRow key={p.id} className="group">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className={`${avatarColor(p.student?.fullName || '')} text-xs font-semibold text-white`}>
                                    {initials(p.student?.fullName || '')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{p.student?.fullName}</p>
                                  <p className="text-xs text-muted-foreground">{p.student?.registerNumber}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell"><Badge variant="outline">{p.student?.department}</Badge></TableCell>
                            <TableCell><span className="font-semibold text-emerald-600 dark:text-emerald-400">{p.student?.cgpa?.toFixed(2)}</span></TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground">Round {p.currentRound}/{rounds.length}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={STATUS_COLORS[p.attendance] || STATUS_COLORS.PENDING}>{p.attendance.replace(/_/g, ' ')}</Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={p.attendance}
                                onValueChange={(v) => updateParticipation(p, { attendance: v })}
                                disabled={updating === p.id}
                              >
                                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="REGISTERED">Registered</SelectItem>
                                  <SelectItem value="ATTENDING">Attending</SelectItem>
                                  <SelectItem value="NOT_ATTENDING">Not Attending</SelectItem>
                                  <SelectItem value="ABSENT">Absent</SelectItem>
                                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                  <SelectItem value="SELECTED">Selected</SelectItem>
                                  <SelectItem value="REJECTED">Rejected</SelectItem>
                                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                                  <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Rounds */}
          <TabsContent value="rounds" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recruitment Rounds ({rounds.length})</CardTitle>
                <CardDescription>Round-by-round configuration</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {rounds.map((round, idx) => (
                    <div key={round.id} className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/30">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                          round.status === 'COMPLETED' ? 'bg-emerald-600 text-white' :
                          round.status === 'ONGOING' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold">{round.roundName}</p>
                              <p className="text-xs text-muted-foreground">{round.description}</p>
                            </div>
                            <Badge variant="outline" className={STATUS_COLORS[round.status]}>{round.status}</Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(round.date)}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {round.startTime} - {round.endTime}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Final Results */}
          <TabsContent value="results" className="space-y-4 animate-fade-in-up">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard title="Selected" value={selected.length} icon={<CheckCircle2 className="h-5 w-5" />} accent="emerald" />
              <StatCard title="Rejected" value={rejected.length} icon={<XCircle className="h-5 w-5" />} accent="rose" />
              <StatCard title="On Hold" value={participants.filter(p => p.finalResult === 'ON_HOLD').length} icon={<Clock className="h-5 w-5" />} accent="amber" />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Final Results</CardTitle>
                <CardDescription>Update final selection status</CardDescription>
              </CardHeader>
              <CardContent>
                {attended.length === 0 ? (
                  <EmptyState icon={<ListChecks className="h-6 w-6" />} title="No results to update" description="Results will appear once students attend the drive." />
                ) : (
                  <div className="space-y-3">
                    {attended.map(p => (
                      <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className={`${avatarColor(p.student?.fullName || '')} text-xs font-semibold text-white`}>
                            {initials(p.student?.fullName || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.student?.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.student?.registerNumber} · Round {p.currentRound}/{rounds.length} cleared
                          </p>
                        </div>
                        <Select
                          value={p.finalResult || 'IN_PROGRESS'}
                          onValueChange={(v) => updateParticipation(p, {
                            finalResult: v,
                            jobRole: drive.jobRole,
                            ctc: drive.ctc,
                            joiningLocation: drive.location,
                            joiningDate: '2026-07-01',
                          })}
                          disabled={updating === p.id}
                        >
                          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SELECTED">Selected</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                            <SelectItem value="ON_HOLD">On Hold</SelectItem>
                            <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  )
}
