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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  const [showProjectForm, setShowProjectForm] = useState(false)
  const [projectForm, setProjectForm] = useState<any>({})

  const fetchStudent = async () => {
    if (!user?.id) return
    const r = await apiGet<{ student: Student }>(`/api/students/${user.id}`)
    setStudent(r.student)
  }

  useEffect(() => {
    if (!user?.id) return
    apiGet<{ student: Student }>(`/api/students/${user.id}`).then((r) => {
      setStudent(r.student)
      setForm({
        fullName: r.student.fullName,
        personalEmail: r.student.personalEmail,
        mobile: r.student.mobile,
        dateOfBirth: r.student.dateOfBirth,
        gender: r.student.gender,
        preferredRole: r.student.preferredRole,
        preferredDomain: r.student.preferredDomain,
        preferredLocation: r.student.preferredLocation,
        interestedTechs: r.student.interestedTechs,
        cgpa: r.student.cgpa,
        tenthPercentage: r.student.tenthPercentage,
        twelfthPercentage: r.student.twelfthPercentage,
        backlogs: r.student.backlogs,
        historyOfArrears: r.student.historyOfArrears,
        semester: r.student.semester,
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
                  <Input disabled={!editing} value={editing ? form.fullName || '' : student.fullName}
                    onChange={(e) => setForm((f: any) => ({ ...f, fullName: e.target.value }))} />
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
                  <Input disabled={!editing} value={editing ? form.personalEmail || '' : student.personalEmail || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, personalEmail: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Mobile Number</Label>
                  <Input disabled={!editing} value={editing ? form.mobile || '' : student.mobile || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, mobile: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Date of Birth</Label>
                  <Input disabled={!editing} type="date" value={editing ? (form.dateOfBirth || '') : (student.dateOfBirth || '')}
                    onChange={(e) => setForm((f: any) => ({ ...f, dateOfBirth: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Gender</Label>
                  {editing ? (
                    <Select value={form.gender || ''} onValueChange={(v) => setForm((f: any) => ({ ...f, gender: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : <Input value={student.gender || '—'} disabled />}
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
                  <Input disabled={!editing} value={editing ? form.interestedTechs || '' : student.interestedTechs || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, interestedTechs: e.target.value }))} placeholder="e.g. React, Node.js" />
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
                  <Input disabled={!editing} value={editing ? form.degree || '' : student.degree || '—'}
                    onChange={(e) => setForm((f: any) => ({ ...f, degree: e.target.value }))} />
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
                  <Input disabled={!editing} type="number" value={editing ? form.semester || '' : student.semester || '—'}
                    onChange={(e) => setForm((f: any) => ({ ...f, semester: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Batch</Label>
                  <Input disabled={!editing} value={editing ? form.batch || '' : student.batch || '—'}
                    onChange={(e) => setForm((f: any) => ({ ...f, batch: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">CGPA</Label>
                  <Input disabled={!editing} type="number" step="0.01" value={editing ? form.cgpa || '' : student.cgpa || ''}
                    onChange={(e) => setForm((f: any) => ({ ...f, cgpa: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Backlogs</Label>
                  <Input disabled={!editing} type="number" value={editing ? form.backlogs ?? 0 : student.backlogs}
                    onChange={(e) => setForm((f: any) => ({ ...f, backlogs: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">10th Percentage</Label>
                  <Input disabled={!editing} type="number" step="0.01" value={editing ? form.tenthPercentage || '' : (student.tenthPercentage || '')}
                    onChange={(e) => setForm((f: any) => ({ ...f, tenthPercentage: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">12th Percentage</Label>
                  <Input disabled={!editing} type="number" step="0.01" value={editing ? form.twelfthPercentage || '' : (student.twelfthPercentage || '')}
                    onChange={(e) => setForm((f: any) => ({ ...f, twelfthPercentage: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">History of Arrears</Label>
                  <Input disabled={!editing} type="number" value={editing ? form.historyOfArrears ?? 0 : student.historyOfArrears}
                    onChange={(e) => setForm((f: any) => ({ ...f, historyOfArrears: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Graduation Year</Label>
                  <Input disabled={!editing} value={editing ? form.graduationYear || '' : student.graduationYear || '—'}
                    onChange={(e) => setForm((f: any) => ({ ...f, graduationYear: e.target.value }))} />
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

          {/* Projects — with add functionality and mandatory fields */}
          <TabsContent value="projects" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Projects ({student.projects?.length || 0})</CardTitle>
                    <CardDescription>Add your projects with GitHub repo, demo link, and tech stack</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => { setShowProjectForm(true); setProjectForm({ name: '', description: '', technologies: '', projectType: '', githubUrl: '', liveUrl: '' }) }}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> Add Project
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {student.projects?.length ? (
                  <div className="space-y-3">
                    {student.projects.map((project) => (
                      <div key={project.id} className="group rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/30">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold">{project.name}</p>
                            {project.description && <p className="mt-1 text-sm text-muted-foreground">{project.description}</p>}
                            {project.technologies && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {csvToArray(project.technologies).map((t) => (
                                  <Badge key={t} variant="outline" className="text-xs">
                                    <Code className="mr-1 h-2.5 w-2.5" /> {t}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                              {project.githubUrl && (
                                <a href={project.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                                  <Github className="h-3 w-3" /> Repo Link
                                </a>
                              )}
                              {project.liveUrl && (
                                <a href={project.liveUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-600 hover:underline dark:text-emerald-400">
                                  <LinkIcon className="h-3 w-3" /> Live Demo
                                </a>
                              )}
                              {project.projectType && <span className="text-muted-foreground">· {project.projectType}</span>}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600 opacity-0 transition-opacity hover:bg-rose-50 dark:hover:bg-rose-900/20 group-hover:opacity-100"
                            onClick={async () => { if (confirm('Delete this project?')) { try { await apiDelete(`/api/projects/${project.id}`); toast.success('Project deleted'); fetchStudent(); } catch (e: any) { toast.error(e.message) } } }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border py-10 text-center">
                    <Code className="mx-auto mb-3 h-10 w-10 text-muted-foreground/40" />
                    <p className="text-sm font-medium">No projects added yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">Add your projects with GitHub repo link, live demo link, and tech stack</p>
                    <Button size="sm" variant="outline" className="mt-4" onClick={() => { setShowProjectForm(true); setProjectForm({ name: '', description: '', technologies: '', projectType: '', githubUrl: '', liveUrl: '' }) }}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add Your First Project
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Add Project Dialog */}
            <Dialog open={showProjectForm} onOpenChange={setShowProjectForm}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Add Project</DialogTitle>
                  <DialogDescription>GitHub profile is required. Fill in all fields below.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Project Name *</Label>
                    <Input value={projectForm.name || ''} onChange={(e) => setProjectForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. E-Commerce Platform" />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea value={projectForm.description || ''} onChange={(e) => setProjectForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Brief description of the project" rows={2} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Tech Stack Used *</Label>
                      <Input value={projectForm.technologies || ''} onChange={(e) => setProjectForm((f: any) => ({ ...f, technologies: e.target.value }))} placeholder="React, Node.js, MongoDB" />
                    </div>
                    <div className="space-y-2">
                      <Label>Domain *</Label>
                      <Input value={projectForm.projectType || ''} onChange={(e) => setProjectForm((f: any) => ({ ...f, projectType: e.target.value }))} placeholder="e.g. Web App / ML / Mobile" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Github className="h-3.5 w-3.5" /> GitHub Repo Link *</Label>
                    <Input value={projectForm.githubUrl || ''} onChange={(e) => setProjectForm((f: any) => ({ ...f, githubUrl: e.target.value }))} placeholder="https://github.com/username/repo" />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><LinkIcon className="h-3.5 w-3.5 text-emerald-600" /> Live Demo Link *</Label>
                    <Input value={projectForm.liveUrl || ''} onChange={(e) => setProjectForm((f: any) => ({ ...f, liveUrl: e.target.value }))} placeholder="https://your-project.vercel.app" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowProjectForm(false)}>Cancel</Button>
                  <Button onClick={async () => {
                    if (!projectForm.name || !projectForm.technologies || !projectForm.projectType || !projectForm.githubUrl || !projectForm.liveUrl) {
                      toast.error('Please fill all required fields (name, tech stack, domain, repo link, demo link)')
                      return
                    }
                    try {
                      await apiPost('/api/projects', { ...projectForm, studentId: user?.id })
                      toast.success('Project added!')
                      setShowProjectForm(false)
                      fetchStudent()
                    } catch (e: any) { toast.error(e.message) }
                  }} className="bg-emerald-600 hover:bg-emerald-700">Add Project</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </StudentLayout>
  )
}
