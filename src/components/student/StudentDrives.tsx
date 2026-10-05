'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, formatDate, STATUS_COLORS } from '@/lib/api'
import { StudentLayout } from './StudentLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import { Building2, Calendar, CheckCircle2, XCircle, Clock, Target, Award, Briefcase } from 'lucide-react'
import type { Student, DriveParticipation } from '@/lib/types'

export function StudentDrives() {
  const user = useAppStore((s) => s.user)
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    apiGet<{ student: Student }>(`/api/students/${user.id}`).then((r) => setStudent(r.student)).finally(() => setLoading(false))
  }, [user?.id])

  if (loading) return <StudentLayout><div className="p-6 space-y-4">{Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} className="h-32" />)}</div></StudentLayout>
  if (!student) return <StudentLayout><div className="p-6">Profile not found</div></StudentLayout>

  const participations = student.participations || []
  const active = participations.filter(p => p.attendance === 'ATTENDING' || p.attendance === 'IN_PROGRESS')
  const completed = participations.filter(p => p.attendance === 'SELECTED' || p.attendance === 'REJECTED' || p.attendance === 'ON_HOLD')

  return (
    <StudentLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold">My Drives</h1>
          <p className="text-sm text-muted-foreground">Track your placement drive participation</p>
        </div>

        <Tabs defaultValue="active">
          <TabsList>
            <TabsTrigger value="active">Active ({active.length})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4 animate-fade-in-up">
            {active.length === 0 ? (
              <EmptyState icon={<Target className="h-6 w-6" />} title="No active drives" description="You're not currently participating in any drive." />
            ) : (
              active.map((p) => <DriveCard key={p.id} participation={p} />)
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 animate-fade-in-up">
            {completed.length === 0 ? (
              <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="No completed drives" description="Your completed drive history will appear here." />
            ) : (
              completed.map((p) => <DriveCard key={p.id} participation={p} />)
            )}
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  )
}

function DriveCard({ participation }: { participation: DriveParticipation }) {
  const drive = participation.drive
  if (!drive) return null
  const totalRounds = drive.rounds?.length || 0
  const clearedRounds = participation.roundResults?.filter(r => r.status === 'CLEARED').length || 0
  const progress = totalRounds > 0 ? (clearedRounds / totalRounds) * 100 : 0

  return (
    <Card className="card-hover overflow-hidden">
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-border">
            {drive.company?.logoUrl ? (
              <img src={drive.company.logoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Building2 className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{drive.company?.name}</p>
                <p className="text-sm text-muted-foreground">{drive.driveName}</p>
              </div>
              <Badge variant="outline" className={`shrink-0 ${STATUS_COLORS[participation.attendance] || STATUS_COLORS.PENDING}`}>
                {participation.attendance.replace(/_/g, ' ')}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(drive.driveDate)}</span>
              <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {drive.ctc}</span>
              <span className="flex items-center gap-1"><Target className="h-3 w-3" /> Round {participation.currentRound}/{totalRounds}</span>
              {participation.finalResult === 'SELECTED' && participation.ctc && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Award className="h-3 w-3" /> {participation.ctc}
                </span>
              )}
            </div>

            {/* Progress timeline */}
            {totalRounds > 0 && (
              <div className="mt-3 flex items-center gap-1">
                {drive.rounds?.map((round, idx) => {
                  const result = participation.roundResults?.find(r => r.roundId === round.id)
                  const status = result?.status
                  return (
                    <div key={round.id} className="flex flex-1 items-center">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                        status === 'CLEARED'
                          ? 'bg-emerald-600 text-white'
                          : status === 'NOT_CLEARED'
                          ? 'bg-rose-500 text-white'
                          : status === 'PENDING'
                          ? 'bg-amber-500 text-white animate-pulse-soft'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {status === 'CLEARED' ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
                      </div>
                      {idx < totalRounds - 1 && <div className={`h-0.5 flex-1 ${status === 'CLEARED' ? 'bg-emerald-600' : 'bg-border'}`} />}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="mt-2 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress: {clearedRounds}/{totalRounds} rounds cleared</span>
              <span className="font-medium text-foreground">{progress.toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
