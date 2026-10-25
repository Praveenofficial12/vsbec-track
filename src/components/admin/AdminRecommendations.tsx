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
import { Input } from '@/components/ui/input'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import { StatCard } from '@/components/common/StatCard'
import {
  Sparkles, Target, Users, Award, TrendingUp, Zap, Building2, ChevronRight,
  CheckCircle2, AlertCircle, Download, Bell, Search, Filter, Star, BarChart3,
  GraduationCap, Briefcase,
} from 'lucide-react'
import { toast } from 'sonner'
import type { Drive, Recommendation } from '@/lib/types'

export function AdminRecommendations() {
  const [drives, setDrives] = useState<Drive[]>([])
  const [selectedDriveId, setSelectedDriveId] = useState<string>('')
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [totalCandidates, setTotalCandidates] = useState(0)
  const [loading, setLoading] = useState(true)
  const [analyzing, startAnalyze] = useTransition()
  // Enhanced features: search, filter, sort
  const [searchQuery, setSearchQuery] = useState('')
  const [minMatchScore, setMinMatchScore] = useState('0')
  const [sortBy, setSortBy] = useState<'matchScore' | 'cgpa' | 'name'>('matchScore')
  const [selectedRecs, setSelectedRecs] = useState<Set<string>>(new Set())

  useEffect(() => {
    apiGet<{ drives: Drive[] }>('/api/drives').then(r => {
      setDrives(r.drives)
      if (r.drives.length > 0) setSelectedDriveId(r.drives[0].id)
    }).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedDriveId) return
    startAnalyze(async () => {
      try {
        const r = await apiGet<{ recommendations: Recommendation[]; totalCandidates: number }>(`/api/recommendations?driveId=${selectedDriveId}`)
        setRecommendations(r.recommendations || [])
        setTotalCandidates(r.totalCandidates || 0)
        setSelectedRecs(new Set())
      } catch (e: any) {
        console.error('Recommendations fetch error:', e)
        setRecommendations([])
        setTotalCandidates(0)
      }
    })
  }, [selectedDriveId])

  // Filter + sort logic
  const filteredRecs = recommendations
    .filter(rec => {
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        const matches = rec.student.fullName.toLowerCase().includes(q) ||
          rec.student.registerNumber.toLowerCase().includes(q) ||
          rec.student.department.toLowerCase().includes(q)
        if (!matches) return false
      }
      // Match score filter
      const minScore = parseInt(minMatchScore) || 0
      if (rec.matchScore < minScore) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'matchScore') return b.matchScore - a.matchScore
      if (sortBy === 'cgpa') return (b.student.cgpa || 0) - (a.student.cgpa || 0)
      if (sortBy === 'name') return a.student.fullName.localeCompare(b.student.fullName)
      return 0
    })

  const toggleSelect = (id: string) => {
    setSelectedRecs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleExportRecommendations = () => {
    if (filteredRecs.length === 0) {
      toast.error('No recommendations to export')
      return
    }
    const headers = ['Rank', 'Name', 'Register Number', 'Department', 'Year', 'Section', 'CGPA', 'Match Score', 'Skills Matched', 'Placement Status', 'Reasons']
    const rows = filteredRecs.map((r, i) => [
      i + 1, r.student.fullName, r.student.registerNumber, r.student.department,
      r.student.year, r.student.section, r.student.cgpa, `${r.matchScore}%`,
      `${r.matchedSkills}/${r.totalRequired}`, r.student.placementStatus,
      r.reasons.join('; '),
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `recommendations_${selectedDrive?.company?.name || 'drive'}_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${filteredRecs.length} recommendations to CSV`)
  }

  const handleNotifySelected = () => {
    if (selectedRecs.size === 0) {
      toast.error('Select at least one student to notify')
      return
    }
    toast.success(`Notified ${selectedRecs.size} selected student(s) about this drive`)
    setSelectedRecs(new Set())
  }

  if (loading) return <AdminLayout><div className="p-6 space-y-4"><CardSkeleton className="h-32" /><div className="grid gap-4 sm:grid-cols-3">{Array.from({length:3}).map((_,i)=><CardSkeleton key={i} className="h-24" />)}</div><CardSkeleton className="h-96" /></div></AdminLayout>

  const selectedDrive = drives.find(d => d.id === selectedDriveId)

  // Stats
  const highMatch = recommendations.filter(r => r.matchScore >= 80).length
  const mediumMatch = recommendations.filter(r => r.matchScore >= 60 && r.matchScore < 80).length
  const lowMatch = recommendations.filter(r => r.matchScore < 60).length
  const avgScore = recommendations.length > 0 ? Math.round(recommendations.reduce((s, r) => s + r.matchScore, 0) / recommendations.length) : 0
  const placed = recommendations.filter(r => r.student.placementStatus === 'PLACED').length

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-violet-600 dark:text-violet-400" />
              Smart Recommendations
            </h1>
            <p className="text-sm text-muted-foreground">AI-powered student matching for upcoming drives</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportRecommendations} disabled={filteredRecs.length === 0}>
              <Download className="mr-2 h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button size="sm" onClick={handleNotifySelected} disabled={selectedRecs.size === 0} className="bg-violet-600 hover:bg-violet-700">
              <Bell className="mr-2 h-3.5 w-3.5" />
              Notify ({selectedRecs.size})
            </Button>
          </div>
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
                  <p className="font-bold">{selectedDrive.minCgpa || '—'}</p>
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

        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard title="Total Candidates" value={totalCandidates} icon={<Users className="h-5 w-5" />} accent="violet" />
          <StatCard title="High Match (≥80%)" value={highMatch} icon={<Award className="h-5 w-5" />} accent="emerald" />
          <StatCard title="Medium (60-79%)" value={mediumMatch} icon={<Target className="h-5 w-5" />} accent="amber" />
          <StatCard title="Low (<60%)" value={lowMatch} icon={<AlertCircle className="h-5 w-5" />} accent="rose" />
          <StatCard title="Avg Score" value={`${avgScore}%`} icon={<TrendingUp className="h-5 w-5" />} accent="sky" />
          <StatCard title="Already Placed" value={placed} icon={<CheckCircle2 className="h-5 w-5" />} accent="emerald" />
        </div>

        {/* Match Score Distribution Bar */}
        {recommendations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                Match Score Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex h-8 overflow-hidden rounded-lg">
                {highMatch > 0 && (
                  <div className="flex items-center justify-center bg-emerald-500 text-xs font-bold text-white" style={{ width: `${(highMatch / recommendations.length) * 100}%` }}>
                    {highMatch}
                  </div>
                )}
                {mediumMatch > 0 && (
                  <div className="flex items-center justify-center bg-amber-500 text-xs font-bold text-white" style={{ width: `${(mediumMatch / recommendations.length) * 100}%` }}>
                    {mediumMatch}
                  </div>
                )}
                {lowMatch > 0 && (
                  <div className="flex items-center justify-center bg-rose-400 text-xs font-bold text-white" style={{ width: `${(lowMatch / recommendations.length) * 100}%` }}>
                    {lowMatch}
                  </div>
                )}
              </div>
              <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> High (≥80%)</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> Medium (60-79%)</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" /> Low (&lt;60%)</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-medium"><Filter className="h-4 w-4" /> Filters:</div>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name, register number, department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={minMatchScore} onValueChange={setMinMatchScore}>
                <SelectTrigger className="w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">All Scores</SelectItem>
                  <SelectItem value="60">≥ 60%</SelectItem>
                  <SelectItem value="70">≥ 70%</SelectItem>
                  <SelectItem value="80">≥ 80%</SelectItem>
                  <SelectItem value="90">≥ 90%</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                <SelectTrigger className="w-36 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="matchScore">Sort: Match Score</SelectItem>
                  <SelectItem value="cgpa">Sort: CGPA</SelectItem>
                  <SelectItem value="name">Sort: Name</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recommended Students</CardTitle>
                <CardDescription>
                  {filteredRecs.length} of {recommendations.length} students shown
                  {selectedRecs.size > 0 && ` · ${selectedRecs.size} selected`}
                </CardDescription>
              </div>
              {recommendations.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (selectedRecs.size === filteredRecs.length) setSelectedRecs(new Set())
                    else setSelectedRecs(new Set(filteredRecs.map(r => r.student.id)))
                  }}
                  className="text-xs"
                >
                  {selectedRecs.size === filteredRecs.length ? 'Deselect All' : 'Select All'}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {analyzing ? (
              <div className="space-y-3">{Array.from({length: 3}).map((_,i) => <div key={i} className="h-24 rounded-lg shimmer" />)}</div>
            ) : filteredRecs.length === 0 ? (
              <EmptyState
                icon={<AlertCircle className="h-6 w-6" />}
                title={recommendations.length === 0 ? "No recommendations yet" : "No matching students"}
                description={recommendations.length === 0 ? "Select a drive to see matching students." : "Try adjusting your filters."}
              />
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto scrollbar-thin pr-1">
                {filteredRecs.map((rec, idx) => {
                  const isSelected = selectedRecs.has(rec.student.id)
                  return (
                    <div
                      key={rec.student.id}
                      className={`group rounded-lg border p-4 transition-all hover:shadow-soft ${
                        isSelected
                          ? 'border-violet-500 bg-violet-50/50 dark:border-violet-600 dark:bg-violet-900/10'
                          : 'border-border bg-card hover:border-violet-300 dark:hover:border-violet-800'
                      }`}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        {/* Checkbox + Rank */}
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(rec.student.id)}
                            className="h-4 w-4 rounded border-border accent-violet-600"
                          />
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            idx === 0 ? 'bg-amber-500 text-white' :
                            idx === 1 ? 'bg-slate-400 text-white' :
                            idx === 2 ? 'bg-amber-700 text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Student Info */}
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className={`${avatarColor(rec.student.fullName)} text-xs font-semibold text-white`}>
                              {initials(rec.student.fullName)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{rec.student.fullName}</p>
                            <p className="text-xs text-muted-foreground">{rec.student.registerNumber} · {rec.student.department}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground">
                              <span className="flex items-center gap-0.5"><GraduationCap className="h-2.5 w-2.5" /> Year {rec.student.year}</span>
                              <span>·</span>
                              <span>Section {rec.student.section}</span>
                              {rec.student.companiesAttended > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="flex items-center gap-0.5"><Briefcase className="h-2.5 w-2.5" /> {rec.student.companiesAttended} drives</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Match Score */}
                        <div className="flex-1">
                          <div className="mb-2">
                            <div className="mb-1 flex items-center justify-between">
                              <span className="text-xs font-medium text-muted-foreground">Match Score</span>
                              <span className={`text-sm font-bold ${
                                rec.matchScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                                rec.matchScore >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'
                              }`}>{rec.matchScore}%</span>
                            </div>
                            <Progress value={rec.matchScore} className="h-1.5" />
                          </div>
                          {/* Reasons */}
                          <div className="flex flex-wrap gap-1.5">
                            {rec.reasons.slice(0, 5).map((r, i) => (
                              <Badge key={i} variant="outline" className={`text-[10px] ${r.startsWith('✓') ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                                {r}
                              </Badge>
                            ))}
                          </div>
                          {/* Skill gap indicator */}
                          {rec.matchedSkills < rec.totalRequired && (
                            <p className="mt-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                              ⚠ Missing {rec.totalRequired - rec.matchedSkills} of {rec.totalRequired} required skills
                            </p>
                          )}
                        </div>

                        {/* Right column: status + CGPA */}
                        <div className="flex flex-col items-end gap-1 text-right">
                          <Badge variant="outline" className={STATUS_COLORS[rec.student.placementStatus]}>
                            {rec.student.placementStatus.replace(/_/g, ' ')}
                          </Badge>
                          <span className="text-xs text-muted-foreground">CGPA <span className="font-bold text-emerald-600 dark:text-emerald-400">{rec.student.cgpa}</span></span>
                          {rec.matchScore >= 80 && (
                            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                              <Star className="mr-0.5 h-2.5 w-2.5" /> Top Match
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
