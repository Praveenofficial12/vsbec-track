'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, apiPut, csvToArray, formatDate, STATUS_COLORS, avatarColor, initials } from '@/lib/api'
import { AdminLayout } from './AdminLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import { StatCard } from '@/components/common/StatCard'
import { ArrowLeft, User, Award, Building2, Target, CheckCircle2, XCircle, ExternalLink, Code, Calendar, Briefcase, Github } from 'lucide-react'
import { toast } from 'sonner'
import type { Student } from '@/lib/types'

export function AdminStudentDetail() {
  const studentId = useAppStore((s) => s.selectedStudentId)
  const setView = useAppStore((s) => s.setView)
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    if (!studentId) return
    apiGet<{ student: Student }>(`/api/students/${studentId}`).then(r => {
      setStudent(r.student)
      setForm({ cgpa: r.student.cgpa, backlogs: r.student.backlogs, placementEligible: r.student.placementEligible })
    }).finally(() => setLoading(false))
  }, [studentId])

  const handleSave = async () => {
    try {
      await apiPut(`/api/students/${studentId}`, form)
      toast.success('Student updated!')
      setEditing(false)
      const r = await apiGet<{ student: Student }>(`/api/students/${studentId}`)
      setStudent(r.student)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (loading) return <AdminLayout><div className="p-6 space-y-4"><CardSkeleton className="h-32" /><div className="grid gap-4 sm:grid-cols-4">{Array.from({length:4}).map((_,i)=><CardSkeleton key={i} className="h-24" />)}</div><CardSkeleton className="h-96" /></div></AdminLayout>
  if (!student) return <AdminLayout><div className="p-6"><EmptyState title="Student not found" /></div></AdminLayout>

  const participations = student.participations || []
  const selected = participations.filter(p => p.finalResult === 'SELECTED').length
  const rejected = participations.filter(p => p.finalResult === 'REJECTED').length
  const inProgress = participations.filter(p => p.attendance === 'IN_PROGRESS').length
  const roundsCleared = participations.reduce((sum, p) => sum + (p.roundResults?.filter(r => r.status === 'CLEARED').length || 0), 0)

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <button onClick={() => setView('admin-students')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Students
        </button>

        {/* Header Card */}
        <Card className="overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <CardContent className="-mt-12 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Avatar className="h-24 w-24 ring-4 ring-card">
                <AvatarFallback className={`${avatarColor(student.fullName)} text-2xl font-bold text-white`}>
                  {initials(student.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 pb-2">
                <h2 className="text-xl font-bold">{student.fullName}</h2>
                <p className="text-sm text-muted-foreground">{student.registerNumber} · {student.department}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={STATUS_COLORS[student.placementStatus]}>{student.placementStatus.replace(/_/g, ' ')}</Badge>
                  <Badge variant="outline">{student.year}</Badge>
                  <Badge variant="outline">Section {student.section}</Badge>
                  <Badge variant="outline">CGPA {student.cgpa?.toFixed(2)}</Badge>
                  <Badge variant="outline">{student.backlogs} Backlogs</Badge>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit'}</Button>
                {editing && <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">Save</Button>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title="Companies Attended" value={participations.length} icon={<Building2 className="h-5 w-5" />} accent="emerald" />
          <StatCard title="Rounds Cleared" value={roundsCleared} icon={<CheckCircle2 className="h-5 w-5" />} accent="teal" />
          <StatCard title="Selected" value={selected} icon={<Award className="h-5 w-5" />} accent="amber" />
          <StatCard title="In Progress" value={inProgress} icon={<Target className="h-5 w-5" />} accent="violet" />
        </div>

        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader><CardTitle className="text-base">Personal Information</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
                <div><Label className="text-xs text-muted-foreground">Full Name</Label><p className="font-medium">{student.fullName}</p></div>
                <div><Label className="text-xs text-muted-foreground">Register Number</Label><p className="font-medium">{student.registerNumber}</p></div>
                <div><Label className="text-xs text-muted-foreground">College Email</Label><p className="font-medium">{student.collegeEmail}</p></div>
                <div><Label className="text-xs text-muted-foreground">Personal Email</Label><p className="font-medium">{student.personalEmail || '—'}</p></div>
                <div><Label className="text-xs text-muted-foreground">Mobile</Label><p className="font-medium">{student.mobile || '—'}</p></div>
                <div><Label className="text-xs text-muted-foreground">Date of Birth</Label><p className="font-medium">{formatDate(student.dateOfBirth)}</p></div>
                <div><Label className="text-xs text-muted-foreground">Gender</Label><p className="font-medium">{student.gender || '—'}</p></div>
                <div><Label className="text-xs text-muted-foreground">Preferred Role</Label><p className="font-medium">{student.preferredRole || '—'}</p></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academic" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader><CardTitle className="text-base">Academic Information</CardTitle></CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
                <div><Label className="text-xs text-muted-foreground">Department</Label><p className="font-medium">{student.department}</p></div>
                <div><Label className="text-xs text-muted-foreground">Degree</Label><p className="font-medium">{student.degree}</p></div>
                <div><Label className="text-xs text-muted-foreground">Year</Label><p className="font-medium">{student.year}</p></div>
                <div><Label className="text-xs text-muted-foreground">Section</Label><p className="font-medium">{student.section}</p></div>
                <div><Label className="text-xs text-muted-foreground">Semester</Label><p className="font-medium">{student.semester}</p></div>
                <div><Label className="text-xs text-muted-foreground">Batch</Label><p className="font-medium">{student.batch}</p></div>
                <div>
                  <Label className="text-xs text-muted-foreground">CGPA</Label>
                  {editing ? (
                    <Input type="number" step="0.01" value={form.cgpa || ''} onChange={(e) => setForm((f: any) => ({ ...f, cgpa: e.target.value }))} className="mt-1 h-8" />
                  ) : (
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{student.cgpa?.toFixed(2)}</p>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Backlogs</Label>
                  {editing ? (
                    <Input type="number" value={form.backlogs ?? 0} onChange={(e) => setForm((f: any) => ({ ...f, backlogs: e.target.value }))} className="mt-1 h-8" />
                  ) : (
                    <p className="font-medium">{student.backlogs}</p>
                  )}
                </div>
                <div><Label className="text-xs text-muted-foreground">History of Arrears</Label><p className="font-medium">{student.historyOfArrears}</p></div>
                <div><Label className="text-xs text-muted-foreground">10th %</Label><p className="font-medium">{student.tenthPercentage ? `${student.tenthPercentage}%` : '—'}</p></div>
                <div><Label className="text-xs text-muted-foreground">12th %</Label><p className="font-medium">{student.twelfthPercentage ? `${student.twelfthPercentage}%` : '—'}</p></div>
                <div><Label className="text-xs text-muted-foreground">Graduation Year</Label><p className="font-medium">{student.graduationYear}</p></div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skills" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader><CardTitle className="text-base">Skills</CardTitle><CardDescription>{csvToArray(student.skills).length} skills, {csvToArray(student.strongSkills).length} strong</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="mb-2 block text-xs text-muted-foreground">Strong Skills</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {csvToArray(student.strongSkills).map(s => (
                      <Badge key={s} variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        <Award className="mr-1 h-3 w-3" />{s}
                      </Badge>
                    ))}
                    {csvToArray(student.strongSkills).length === 0 && <p className="text-sm text-muted-foreground">No strong skills marked.</p>}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block text-xs text-muted-foreground">All Skills</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {csvToArray(student.skills).map(s => (
                      <Badge key={s} variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">{s}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {student.certifications && student.certifications.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Certifications</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {student.certifications.map(c => (
                      <div key={c.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-3">
                        <Award className="mt-0.5 h-5 w-5 text-amber-500" />
                        <div className="flex-1">
                          <p className="font-medium">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.organization} · {formatDate(c.certDate)}</p>
                        </div>
                        {c.credentialUrl && <a href={c.credentialUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline dark:text-emerald-400"><ExternalLink className="h-4 w-4" /></a>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {student.projects && student.projects.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base">Projects</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {student.projects.map(p => (
                      <div key={p.id} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium">{p.name}</p>
                          <Badge variant="outline">{p.projectType}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                        {p.technologies && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {csvToArray(p.technologies).map(t => <Badge key={t} variant="outline" className="text-xs"><Code className="mr-1 h-2.5 w-2.5" />{t}</Badge>)}
                          </div>
                        )}
                        <div className="mt-2 flex gap-3 text-xs">
                          {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground"><Github className="h-3 w-3" />GitHub</a>}
                          {p.liveUrl && <a href={p.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-600 hover:underline dark:text-emerald-400"><ExternalLink className="h-3 w-3" />Live</a>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader><CardTitle className="text-base">Placement History</CardTitle></CardHeader>
              <CardContent>
                {participations.length === 0 ? (
                  <EmptyState icon={<Target className="h-6 w-6" />} title="No placement activity" description="This student has not participated in any drives yet." />
                ) : (
                  <div className="space-y-3">
                    {participations.map(p => (
                      <div key={p.id} className="rounded-lg border border-border bg-card p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-muted">
                              {p.drive?.company?.logoUrl ? (
                                <img src={p.drive.company.logoUrl} alt="" className="h-full w-full object-cover" />
                              ) : (
                                <Building2 className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{p.drive?.company?.name}</p>
                              <p className="text-xs text-muted-foreground">{p.drive?.driveName} · {formatDate(p.drive?.driveDate)}</p>
                            </div>
                          </div>
                          <Badge variant="outline" className={STATUS_COLORS[p.attendance]}>{p.attendance.replace(/_/g, ' ')}</Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><CheckCircle2 className="h-3 w-3 text-emerald-600" /> {p.roundResults?.filter(r => r.status === 'CLEARED').length || 0}/{p.drive?.rounds?.length || 0} rounds cleared</span>
                          {p.ctc && <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><Briefcase className="h-3 w-3" /> {p.ctc}</span>}
                          {p.jobRole && <span>{p.jobRole}</span>}
                        </div>
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
