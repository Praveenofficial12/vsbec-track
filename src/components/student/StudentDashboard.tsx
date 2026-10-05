'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet } from '@/lib/api'
import { StudentLayout } from './StudentLayout'
import { StatCard } from '@/components/common/StatCard'
import { CardSkeleton, EmptyState } from '@/components/common/States'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  TrendingUp, Target, CheckCircle2, XCircle, Activity, Award, Building2,
  ChevronRight, FileText, Calendar, Sparkles, MapPin, Briefcase, GraduationCap, AlertCircle
} from 'lucide-react'
import type { Student, Drive } from '@/lib/types'
import { formatDate, STATUS_COLORS, getCompanyLogo } from '@/lib/api'

export function StudentDashboard() {
  const user = useAppStore((s) => s.user)
  const setView = useAppStore((s) => s.setView)
  const [student, setStudent] = useState<Student | null>(null)
  const [upcomingDrives, setUpcomingDrives] = useState<Drive[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    Promise.all([
      apiGet<{ student: Student }>(`/api/students/${user.id}`),
      apiGet<{ drives: Drive[] }>(`/api/drives?status=REGISTRATION_OPEN`),
    ]).then(([sRes, dRes]) => {
      setStudent(sRes.student)
      setUpcomingDrives(dRes.drives.slice(0, 3))
    }).catch((e) => console.error(e)).finally(() => setLoading(false))
  }, [user?.id])

  if (loading) {
    return (
      <StudentLayout>
        <div className="p-6">
          <div className="space-y-4">
            <CardSkeleton />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} className="h-32" />)}
            </div>
          </div>
        </div>
      </StudentLayout>
    )
  }

  if (!student) {
    return (
      <StudentLayout>
        <div className="p-6">
          <EmptyState icon={<AlertCircle className="h-6 w-6" />} title="Profile not found" description="We couldn't load your profile." />
        </div>
      </StudentLayout>
    )
  }

  const participatedDrives = student.participations || []
  const selected = participatedDrives.filter(p => p.finalResult === 'SELECTED').length
  const rejected = participatedDrives.filter(p => p.finalResult === 'REJECTED').length
  const inProgress = participatedDrives.filter(p => p.attendance === 'IN_PROGRESS').length
  const totalRoundsCleared = participatedDrives.reduce((sum, p) => sum + (p.roundResults?.filter(r => r.status === 'CLEARED').length || 0), 0)

  const completion = Math.min(
    ((student.fullName ? 1 : 0) + (student.mobile ? 1 : 0) + (student.cgpa ? 1 : 0) +
     (student.skills ? 1 : 0) + (student.strongSkills ? 1 : 0) +
     (student.certifications && student.certifications.length > 0 ? 1 : 0) +
     (student.projects && student.projects.length > 0 ? 1 : 0) +
     (student.preferredRole ? 1 : 0)) / 8 * 100, 100)

  return (
    <StudentLayout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Welcome Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white shadow-soft-lg">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 ring-4 ring-white/30">
                <AvatarFallback className="bg-white/15 text-lg font-bold text-white">
                  {student.fullName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm text-white/80">Welcome back,</p>
                <h1 className="text-2xl font-bold">{student.fullName}</h1>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-white/90">
                  <span className="rounded-full bg-white/15 px-2 py-0.5">{student.registerNumber}</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5">{student.department}</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5">Section {student.section}</span>
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="rounded-xl bg-white/15 p-3 backdrop-blur">
                <p className="text-xs text-white/80">Placement Status</p>
                <p className="mt-1 text-lg font-bold">{student.placementStatus.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title="Companies Attended" value={participatedDrives.length} icon={<Building2 className="h-5 w-5" />} accent="emerald" />
          <StatCard title="Rounds Cleared" value={totalRoundsCleared} icon={<CheckCircle2 className="h-5 w-5" />} accent="teal" />
          <StatCard title="Selected" value={selected} icon={<Award className="h-5 w-5" />} accent="amber" />
          <StatCard title="Currently Active" value={inProgress} icon={<Activity className="h-5 w-5" />} accent="violet" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Profile Completion */}
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Profile Completion</CardTitle>
              <CardDescription>Complete your profile to be eligible for more drives</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-3xl font-bold text-foreground">{Math.round(completion)}%</span>
                <Sparkles className="h-5 w-5 text-amber-500" />
              </div>
              <Progress value={completion} className="h-2 mb-4" />
              <Button size="sm" variant="outline" onClick={() => setView('student-profile')} className="w-full">
                Complete Profile
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>

          {/* Academic Summary */}
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Academic Summary</CardTitle>
              <CardDescription>Your academic performance</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">CGPA</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{student.cgpa?.toFixed(2) || '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">10th %</span>
                <span className="text-sm font-semibold">{student.tenthPercentage ? `${student.tenthPercentage}%` : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">12th %</span>
                <span className="text-sm font-semibold">{student.twelfthPercentage ? `${student.twelfthPercentage}%` : '—'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Backlogs</span>
                <Badge variant={student.backlogs > 0 ? 'destructive' : 'secondary'}>{student.backlogs}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Eligible</span>
                <Badge variant={student.placementEligible ? 'default' : 'destructive'}>{student.placementEligible ? 'Yes' : 'No'}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Skills */}
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Your Skills</CardTitle>
              <CardDescription>{student.skills?.split(',').filter(Boolean).length || 0} skills · {student.strongSkills?.split(',').filter(Boolean).length || 0} strong</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {student.skills?.split(',').filter(Boolean).slice(0, 8).map((skill) => {
                  const isStrong = student.strongSkills?.includes(skill)
                  return (
                    <Badge
                      key={skill}
                      variant="outline"
                      className={isStrong
                        ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                      }
                    >
                      {skill}
                      {isStrong && <Award className="ml-1 h-3 w-3" />}
                    </Badge>
                  )
                })}
                {(student.skills?.split(',').length || 0) > 8 && (
                  <Badge variant="outline" className="border-muted-foreground/30">
                    +{(student.skills?.split(',').length || 0) - 8} more
                  </Badge>
                )}
              </div>
              <Button size="sm" variant="ghost" onClick={() => setView('student-skills')} className="mt-4 -ml-2">
                Manage Skills
                <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Drives */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Upcoming Drives</CardTitle>
                <CardDescription>Companies you may be eligible for</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setView('student-companies')}>
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingDrives.length === 0 ? (
              <EmptyState
                icon={<Calendar className="h-6 w-6" />}
                title="No upcoming drives"
                description="Check back later for new placement drives."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcomingDrives.map((drive) => (
                  <Card
                    key={drive.id}
                    className="group cursor-pointer border-border transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-soft-lg dark:hover:border-emerald-800"
                  >
                    <CardContent className="p-5">
                      <div className="mb-3 flex items-start gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-border">
                          {drive.company?.logoUrl ? (
                            <img src={drive.company.logoUrl} alt={drive.company.name} className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-foreground">{drive.company?.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{drive.jobRole}</p>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(drive.driveDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          <span>{drive.ctc || 'CTC on offer'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{drive.location || 'Multiple locations'}</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-4 w-full border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300"
                        onClick={() => setView('student-drives')}
                      >
                        View Details
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Placement Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Placement Activity</CardTitle>
                <CardDescription>Your placement journey</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setView('student-history')}>
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {participatedDrives.length === 0 ? (
              <EmptyState
                icon={<Target className="h-6 w-6" />}
                title="No placement activity yet"
                description="Once you participate in drives, your history will appear here."
                action={<Button size="sm" onClick={() => setView('student-drives')}>Browse Drives</Button>}
              />
            ) : (
              <div className="space-y-3">
                {participatedDrives.slice(0, 5).map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/40">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {p.drive?.company?.logoUrl ? (
                        <img src={p.drive.company.logoUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.drive?.company?.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.drive?.driveName} · Round {p.currentRound}
                      </p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 ${STATUS_COLORS[p.attendance] || STATUS_COLORS.PENDING}`}>
                      {p.attendance.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  )
}
