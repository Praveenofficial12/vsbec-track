'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, apiPut, csvToArray, formatDate } from '@/lib/api'
import { StudentLayout } from './StudentLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { apiPost, apiDelete } from '@/lib/api'
import {
  User, Mail, Phone, Calendar, MapPin, Award, Briefcase, FileText,
  Github, ExternalLink, Building2, GraduationCap, Save, Pencil,
  CheckCircle2, ExternalLink as LinkIcon, Code, Link2, Linkedin, Code2, Plus, Trash2, Upload, X
} from 'lucide-react'
import type { Student } from '@/lib/types'

export function StudentProfile() {
  const user = useAppStore((s) => s.user)
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<any>({})

  useEffect(() => {
    if (!user?.id) return
    apiGet<{ student: Student }>(`/api/students/${user.id}`).then((r) => {
      setStudent(r.student)
      setForm({
        personalEmail: r.student.personalEmail,
        mobile: r.student.mobile,
        preferredRole: r.student.preferredRole,
        preferredDomain: r.student.preferredDomain,
        preferredLocation: r.student.preferredLocation,
        cgpa: r.student.cgpa,
        tenthPercentage: r.student.tenthPercentage,
        twelfthPercentage: r.student.twelfthPercentage,
        backlogs: r.student.backlogs,
        linkedinUrl: r.student.linkedinUrl,
        leetcodeUrl: r.student.leetcodeUrl,
        githubUrl: r.student.githubUrl,
        resumeUrl: r.student.resumeUrl,
      })
    }).finally(() => setLoading(false))
  }, [user?.id])

  const handleSave = async () => {
    try {
      await apiPut(`/api/students/${user?.id}`, form)
      toast.success('Profile updated successfully!')
      setEditing(false)
      const r = await apiGet<{ student: Student }>(`/api/students/${user?.id}`)
      setStudent(r.student)
    } catch (e: any) {
      toast.error(e.message || 'Failed to update profile')
    }
  }

  if (loading) {
    return <StudentLayout><div className="p-6"><div className="h-64 rounded-xl shimmer" /></div></StudentLayout>
  }
  if (!student) return <StudentLayout><div className="p-6">Profile not found</div></StudentLayout>

  return (
    <StudentLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Profile</h1>
            <p className="text-sm text-muted-foreground">View and manage your placement profile</p>
          </div>
          {!editing ? (
            <Button onClick={() => setEditing(true)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {/* Header card */}
        <Card className="overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-emerald-500 to-teal-600" />
          <CardContent className="-mt-12 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Avatar className="h-24 w-24 ring-4 ring-card">
                <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white">
                  {student.fullName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 pb-2">
                <h2 className="text-xl font-bold">{student.fullName}</h2>
                <p className="text-sm text-muted-foreground">{student.registerNumber} · {student.department}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                    {student.placementStatus.replace('_', ' ')}
                  </Badge>
                  <Badge variant="outline">{student.year}</Badge>
                  <Badge variant="outline">Section {student.section}</Badge>
                  <Badge variant="outline">CGPA {student.cgpa?.toFixed(2)}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="personal">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="links">Links</TabsTrigger>
            <TabsTrigger value="certifications">Certs</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
          </TabsList>

          {/* Personal */}
          <TabsContent value="personal" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Personal Information</CardTitle>
                <CardDescription>Your personal contact details</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Full Name</Label>
                  <Input value={student.fullName} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Register Number</Label>
                  <Input value={student.registerNumber} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">College Email</Label>
                  <Input value={student.collegeEmail} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Personal Email</Label>
                  <Input
                    disabled={!editing}
                    value={editing ? form.personalEmail || '' : student.personalEmail || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, personalEmail: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Mobile Number</Label>
                  <Input
                    disabled={!editing}
                    value={editing ? form.mobile || '' : student.mobile || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, mobile: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                  <Input value={formatDate(student.dateOfBirth)} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Gender</Label>
                  <Input value={student.gender || '—'} disabled />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Placement Preferences</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Preferred Job Role</Label>
                  <Input
                    disabled={!editing}
                    value={editing ? form.preferredRole || '' : student.preferredRole || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, preferredRole: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Preferred Domain</Label>
                  <Input
                    disabled={!editing}
                    value={editing ? form.preferredDomain || '' : student.preferredDomain || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, preferredDomain: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Preferred Location</Label>
                  <Input
                    disabled={!editing}
                    value={editing ? form.preferredLocation || '' : student.preferredLocation || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, preferredLocation: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Interested Technologies</Label>
                  <Input value={student.interestedTechs || '—'} disabled />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Academic */}
          <TabsContent value="academic" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Academic Information</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Department</Label>
                  <Input value={student.department || '—'} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Degree</Label>
                  <Input value={student.degree || '—'} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Year</Label>
                  <Input value={student.year || '—'} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Section</Label>
                  <Input value={student.section || '—'} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Semester</Label>
                  <Input value={student.semester || '—'} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Batch</Label>
                  <Input value={student.batch || '—'} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">CGPA</Label>
                  <Input
                    disabled={!editing}
                    type="number"
                    step="0.01"
                    value={editing ? form.cgpa || '' : student.cgpa || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, cgpa: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Backlogs</Label>
                  <Input
                    disabled={!editing}
                    type="number"
                    value={editing ? form.backlogs ?? 0 : student.backlogs}
                    onChange={(e) => setForm((f: any) => ({ ...f, backlogs: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">10th Percentage</Label>
                  <Input value={student.tenthPercentage ? `${student.tenthPercentage}%` : '—'} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">12th Percentage</Label>
                  <Input value={student.twelfthPercentage ? `${student.twelfthPercentage}%` : '—'} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">History of Arrears</Label>
                  <Input value={student.historyOfArrears} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Graduation Year</Label>
                  <Input value={student.graduationYear || '—'} disabled />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Links Tab — LinkedIn, LeetCode, GitHub, Resume */}
          <TabsContent value="links" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Profile Links & Resume
                </CardTitle>
                <CardDescription>{editing ? 'Update your profile links below' : 'Your professional profile links'}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* LinkedIn */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Linkedin className="h-3.5 w-3.5 text-blue-600" /> LinkedIn Profile URL *
                  </Label>
                  <Input disabled={!editing} placeholder="https://linkedin.com/in/your-profile"
                    value={editing ? form.linkedinUrl || '' : student.linkedinUrl || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, linkedinUrl: e.target.value }))} />
                  {!editing && student.linkedinUrl && (
                    <a href={student.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                      <ExternalLink className="h-3 w-3" /> Visit LinkedIn
                    </a>)}
                </div>
                {/* LeetCode */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Code2 className="h-3.5 w-3.5 text-amber-600" /> LeetCode Profile URL
                  </Label>
                  <Input disabled={!editing} placeholder="https://leetcode.com/your-username"
                    value={editing ? form.leetcodeUrl || '' : student.leetcodeUrl || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, leetcodeUrl: e.target.value }))} />
                  {!editing && student.leetcodeUrl && (
                    <a href={student.leetcodeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-amber-600 hover:underline">
                      <ExternalLink className="h-3 w-3" /> Visit LeetCode
                    </a>)}
                </div>
                {/* GitHub */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Github className="h-3.5 w-3.5" /> GitHub Profile URL
                  </Label>
                  <Input disabled={!editing} placeholder="https://github.com/your-username"
                    value={editing ? form.githubUrl || '' : student.githubUrl || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, githubUrl: e.target.value }))} />
                  {!editing && student.githubUrl && (
                    <a href={student.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs hover:underline">
                      <ExternalLink className="h-3 w-3" /> Visit GitHub
                    </a>)}
                </div>
                <Separator />
                {/* Resume */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileText className="h-3.5 w-3.5 text-emerald-600" /> Resume / CV Link *
                  </Label>
                  <Input disabled={!editing} placeholder="https://drive.google.com/..."
                    value={editing ? form.resumeUrl || '' : student.resumeUrl || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, resumeUrl: e.target.value }))} />
                  {!editing && student.resumeUrl ? (
                    <a href={student.resumeUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <FileText className="h-4 w-4" /> View Resume <ExternalLink className="h-3 w-3" />
                    </a>) : !editing && <p className="text-sm text-muted-foreground">No resume link provided. Click Edit to add one.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Certifications */}
          <TabsContent value="certifications" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Certifications ({student.certifications?.length || 0})</CardTitle>
                <CardDescription>Your professional certifications</CardDescription>
              </CardHeader>
              <CardContent>
                {student.certifications?.length ? (
                  <div className="space-y-3">
                    {student.certifications.map((cert) => (
                      <div key={cert.id} className="flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/30">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                          <Award className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{cert.name}</p>
                          <p className="text-sm text-muted-foreground">{cert.organization}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(cert.certDate)}</span>
                            {cert.credentialId && <span className="flex items-center gap-1"><FileText className="h-3 w-3" /> {cert.credentialId}</span>}
                            {cert.credentialUrl && (
                              <a href={cert.credentialUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-600 hover:underline dark:text-emerald-400">
                                <ExternalLink className="h-3 w-3" /> Verify
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No certifications added yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Projects */}
          <TabsContent value="projects" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Projects ({student.projects?.length || 0})</CardTitle>
                <CardDescription>Your portfolio projects</CardDescription>
              </CardHeader>
              <CardContent>
                {student.projects?.length ? (
                  <div className="space-y-3">
                    {student.projects.map((project) => (
                      <div key={project.id} className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/30">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{project.name}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>
                            {project.technologies && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {csvToArray(project.technologies).map((t) => (
                                  <Badge key={t} variant="outline" className="text-xs">
                                    <Code className="mr-1 h-2.5 w-2.5" />
                                    {t}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                              {project.githubUrl && (
                                <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                                  <Github className="h-3 w-3" /> GitHub
                                </a>
                              )}
                              {project.liveUrl && (
                                <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-600 hover:underline dark:text-emerald-400">
                                  <LinkIcon className="h-3 w-3" /> Live Demo
                                </a>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="shrink-0">{project.projectType}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">No projects added yet.</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  )
}
