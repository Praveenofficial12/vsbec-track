'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, formatDate, STATUS_COLORS } from '@/lib/api'
import { StudentLayout } from './StudentLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import { StatCard } from '@/components/common/StatCard'
import { Building2, CheckCircle2, XCircle, Target, Award, Calendar, Briefcase } from 'lucide-react'
import type { Student } from '@/lib/types'

export function StudentHistory() {
  const user = useAppStore((s) => s.user)
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    apiGet<{ student: Student }>(`/api/students/${user.id}`).then((r) => setStudent(r.student)).finally(() => setLoading(false))
  }, [user?.id])

  if (loading) return <StudentLayout><div className="p-6 space-y-4"><div className="grid gap-4 sm:grid-cols-4">{Array.from({length:4}).map((_,i)=><CardSkeleton key={i} className="h-28" />)}</div><CardSkeleton className="h-64" /></div></StudentLayout>
  if (!student) return <StudentLayout><div className="p-6">Not found</div></StudentLayout>

  const participations = student.participations || []
  const selected = participations.filter(p => p.finalResult === 'SELECTED').length
  const rejected = participations.filter(p => p.finalResult === 'REJECTED').length
  const inProgress = participations.filter(p => p.attendance === 'IN_PROGRESS' || p.attendance === 'ATTENDING').length

  return (
    <StudentLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold">Placement History</h1>
          <p className="text-sm text-muted-foreground">Complete record of your placement journey</p>
        </div>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title="Companies Attended" value={participations.length} icon={<Building2 className="h-5 w-5" />} accent="emerald" />
          <StatCard title="Selected" value={selected} icon={<Award className="h-5 w-5" />} accent="amber" />
          <StatCard title="Rejected" value={rejected} icon={<XCircle className="h-5 w-5" />} accent="rose" />
          <StatCard title="In Progress" value={inProgress} icon={<Target className="h-5 w-5" />} accent="violet" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Placement History</CardTitle>
            <CardDescription>All your drive participations</CardDescription>
          </CardHeader>
          <CardContent>
            {participations.length === 0 ? (
              <EmptyState
                icon={<Target className="h-6 w-6" />}
                title="No placement history"
                description="Your placement journey will appear here once you participate in drives."
              />
            ) : (
              <div className="overflow-x-auto scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead className="hidden sm:table-cell">Drive</TableHead>
                      <TableHead className="hidden md:table-cell">Date</TableHead>
                      <TableHead className="text-center">Rounds</TableHead>
                      <TableHead className="text-center">Result</TableHead>
                      <TableHead className="hidden md:table-cell">CTC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participations.map((p) => (
                      <TableRow key={p.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded bg-muted">
                              {p.drive?.company?.logoUrl ? (
                                <img src={p.drive.company.logoUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Building2 className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                            <span className="font-medium">{p.drive?.company?.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">{p.drive?.driveName}</TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">{formatDate(p.drive?.driveDate)}</TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 text-sm">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            {p.roundResults?.filter(r => r.status === 'CLEARED').length || 0}/{p.drive?.rounds?.length || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={STATUS_COLORS[p.attendance] || STATUS_COLORS.PENDING}>
                            {p.attendance.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-muted-foreground">
                          {p.ctc || '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  )
}
