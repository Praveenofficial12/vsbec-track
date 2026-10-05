'use client'
import { useEffect, useState, useTransition } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, csvToArray, avatarColor, initials, STATUS_COLORS } from '@/lib/api'
import { AdminLayout } from './AdminLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import { StatCard } from '@/components/common/StatCard'
import { Sparkles, Target, Users, Award, TrendingUp, Zap, Building2, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react'
import type { Drive, Recommendation } from '@/lib/types'

export function AdminRecommendations() {
  const [drives, setDrives] = useState<Drive[]>([])
  const [selectedDriveId, setSelectedDriveId] = useState<string>('')
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [totalCandidates, setTotalCandidates] = useState(0)
  const [loading, setLoading] = useState(true)
  const [analyzing, startAnalyze] = useTransition()

  useEffect(() => {
    apiGet<{ drives: Drive[] }>('/api/drives?status=UPCOMING').then(r => {
      setDrives(r.drives)
      if (r.drives.length > 0) setSelectedDriveId(r.drives[0].id)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedDriveId) return
    startAnalyze(async () => {
      const r = await apiGet<{ recommendations: Recommendation[]; totalCandidates: number }>(`/api/recommendations?driveId=${selectedDriveId}`)
      setRecommendations(r.recommendations)
      setTotalCandidates(r.totalCandidates)
    })
  }, [selectedDriveId])

  if (loading) return <AdminLayout><div className="p-6 space-y-4"><CardSkeleton className="h-32" /><div className="grid gap-4 sm:grid-cols-3">{Array.from({length:3}).map((_,i)=><CardSkeleton key={i} className="h-24" />)}</div><CardSkeleton className="h-96" /></div></AdminLayout>

  const selectedDrive = drives.find(d => d.id === selectedDriveId)

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-violet-600 dark:text-violet-400" />
            Smart Recommendations
          </h1>
          <p className="text-sm text-muted-foreground">AI-powered student matching for upcoming drives</p>
        </div>

        {/* Drive Selector */}
        <Card className="overflow-hidden border-violet-200 dark:border-violet-800">
          <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-6 text-white">
            <div className="mb-3 flex items-center gap-2">
              <Zap className="h-5 w-5" />
              <p className="text-sm font-semibold uppercase tracking-wider text-white/80">Select Drive to Analyze</p>
            </div>
            <Select value={selectedDriveId} onValueChange={setSelectedDriveId}>
              <SelectTrigger className="border-white/30 bg-white/15 text-white backdrop-blur hover:bg-white/25">
                <SelectValue placeholder="Select a drive" />
              </SelectTrigger>
              <SelectContent>
                {drives.map(d => <SelectItem key={d.id} value={d.id}>{d.company?.name} - {d.driveName}</SelectItem>)}
              </SelectContent>
            </Select>

            {selectedDrive && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div className="rounded-lg bg-white/10 p-2 backdrop-blur">
                  <p className="text-xs text-white/70">Min CGPA</p>
                  <p className="font-bold">{selectedDrive.minCgpa}</p>
                </div>
                <div className="rounded-lg bg-white/10 p-2 backdrop-blur">
                  <p className="text-xs text-white/70">Max Backlogs</p>
                  <p className="font-bold">{selectedDrive.maxBacklogs ?? '—'}</p>
                </div>
                <div className="rounded-lg bg-white/10 p-2 backdrop-blur">
                  <p className="text-xs text-white/70">Required Skills</p>
                  <p className="font-bold">{csvToArray(selectedDrive.requiredSkills).length}</p>
                </div>
                <div className="rounded-lg bg-white/10 p-2 backdrop-blur">
                  <p className="text-xs text-white/70">Eligible Depts</p>
                  <p className="font-bold">{csvToArray(selectedDrive.eligibleDepartments).length}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Summary */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Total Candidates" value={totalCandidates} subtitle="Matching students" icon={<Users className="h-5 w-5" />} accent="violet" />
          <StatCard title="High Match (>80%)" value={recommendations.filter(r => r.matchScore >= 80).length} subtitle="Strong candidates" icon={<Award className="h-5 w-5" />} accent="amber" />
          <StatCard title="Avg Match Score" value={`${Math.round(recommendations.reduce((s, r) => s + r.matchScore, 0) / (recommendations.length || 1))}%`} icon={<TrendingUp className="h-5 w-5" />} accent="emerald" />
        </div>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommended Students</CardTitle>
            <CardDescription>Sorted by match score - highest first</CardDescription>
          </CardHeader>
          <CardContent>
            {analyzing ? (
              <div className="space-y-3">{Array.from({length: 3}).map((_,i) => <div key={i} className="h-24 rounded-lg shimmer" />)}</div>
            ) : recommendations.length === 0 ? (
              <EmptyState icon={<AlertCircle className="h-6 w-6" />} title="No recommendations yet" description="Select a drive to see matching students." />
            ) : (
              <div className="space-y-3">
                {recommendations.map((rec, idx) => (
                  <div
                    key={rec.student.id}
                    className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-violet-300 hover:shadow-soft dark:hover:border-violet-800"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="flex items-center gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          idx === 0 ? 'bg-amber-500 text-white' :
                          idx === 1 ? 'bg-slate-400 text-white' :
                          idx === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'
                        }`}>
                          #{idx + 1}
                        </span>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className={`${avatarColor(rec.student.fullName)} text-xs font-semibold text-white`}>
                            {initials(rec.student.fullName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{rec.student.fullName}</p>
                          <p className="text-xs text-muted-foreground">{rec.student.registerNumber} · {rec.student.department}</p>
                        </div>
                      </div>

                      <div className="flex-1">
                        {/* Match Score */}
                        <div className="mb-2">
                          <div className="mb-1 flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Match Score</span>
                            <span className={`text-sm font-bold ${
                              rec.matchScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                              rec.matchScore >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                            }`}>{rec.matchScore}%</span>
                          </div>
                          <Progress
                            value={rec.matchScore}
                            className="h-1.5"
                          />
                        </div>

                        {/* Reasons */}
                        <div className="flex flex-wrap gap-1.5">
                          {rec.reasons.slice(0, 5).map((r, i) => (
                            <Badge key={i} variant="outline" className={`text-[10px] ${r.startsWith('✓') ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                              {r}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 text-right">
                        <Badge variant="outline" className={STATUS_COLORS[rec.student.placementStatus]}>
                          {rec.student.placementStatus.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-muted-foreground">CGPA <span className="font-bold text-emerald-600 dark:text-emerald-400">{rec.student.cgpa}</span></span>
                        <span className="text-xs text-muted-foreground">{rec.student.companiesAttended} drives attended</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
