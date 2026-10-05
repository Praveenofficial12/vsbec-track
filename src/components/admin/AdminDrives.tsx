'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, apiPost, formatDate, STATUS_COLORS } from '@/lib/api'
import { AdminLayout } from './AdminLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Target, Plus, Calendar, Briefcase, MapPin, Users, Building2, ChevronRight,
  CheckCircle2, Clock, AlertCircle, Filter, X
} from 'lucide-react'
import type { Drive, Company } from '@/lib/types'

const DEPARTMENTS = ['AI & DS', 'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year']
const CLASSES = ['A', 'B', 'C', 'D']
const SKILLS = ['Java', 'Python', 'C', 'C++', 'JavaScript', 'React', 'SQL', 'MongoDB', 'Cloud']

export function AdminDrives() {
  const setView = useAppStore((s) => s.setView)
  const setSelected = useAppStore((s) => s.setSelected)
  const [drives, setDrives] = useState<Drive[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>({
    companyId: '', driveName: '', driveDate: '', applicationDeadline: '', jobRole: '', ctc: '',
    location: '', eligibleDepartments: [], eligibleYears: ['4th Year'], eligibleClasses: ['A','B','C','D'],
    minCgpa: '6.5', maxBacklogs: '0', requiredSkills: [], preferredSkills: [],
    selectionProcess: 'Aptitude Test -> Technical Assessment -> Technical Interview -> HR Interview',
    status: 'UPCOMING',
  })

  const fetchDrives = async () => {
    setLoading(true)
    try {
      const [d, c] = await Promise.all([
        apiGet<{ drives: Drive[] }>(`/api/drives${statusFilter !== 'ALL' ? `?status=${statusFilter}` : ''}`),
        apiGet<{ companies: Company[] }>('/api/companies'),
      ])
      setDrives(d.drives)
      setCompanies(c.companies)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDrives() }, [statusFilter])

  const toggleArr = (key: string, value: string) => {
    setForm(f => {
      const arr = f[key] || []
      return { ...f, [key]: arr.includes(value) ? arr.filter((v: string) => v !== value) : [...arr, value] }
    })
  }

  const handleSubmit = async () => {
    if (!form.companyId || !form.driveName || !form.driveDate) {
      toast.error('Please fill in company, drive name and date')
      return
    }
    try {
      await apiPost('/api/drives', {
        ...form,
        eligibleDepartments: form.eligibleDepartments.join(','),
        eligibleYears: form.eligibleYears.join(','),
        eligibleClasses: form.eligibleClasses.join(','),
        requiredSkills: form.requiredSkills.join(','),
        preferredSkills: form.preferredSkills.join(','),
      })
      toast.success('Drive created successfully!')
      setShowForm(false)
      setForm({
        companyId: '', driveName: '', driveDate: '', applicationDeadline: '', jobRole: '', ctc: '',
        location: '', eligibleDepartments: [], eligibleYears: ['4th Year'], eligibleClasses: ['A','B','C','D'],
        minCgpa: '6.5', maxBacklogs: '0', requiredSkills: [], preferredSkills: [],
        selectionProcess: 'Aptitude Test -> Technical Assessment -> Technical Interview -> HR Interview',
        status: 'UPCOMING',
      })
      fetchDrives()
    } catch (e: any) {
      toast.error(e.message || 'Failed to create drive')
    }
  }

  const handleView = (id: string) => {
    setSelected('driveId', id)
    setView('admin-drive-detail')
  }

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Placement Drives</h1>
            <p className="text-sm text-muted-foreground">{loading ? 'Loading...' : `${drives.length} drives`}</p>
          </div>
          <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700">
            <Plus className="mr-2 h-4 w-4" />
            Create Drive
          </Button>
        </div>

        <Tabs value={statusFilter} onValueChange={setStatusFilter}>
          <TabsList className="w-full justify-start overflow-x-auto scrollbar-thin">
            <TabsTrigger value="ALL">All</TabsTrigger>
            <TabsTrigger value="UPCOMING">Upcoming</TabsTrigger>
            <TabsTrigger value="REGISTRATION_OPEN">Open</TabsTrigger>
            <TabsTrigger value="ONGOING">Ongoing</TabsTrigger>
            <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="mt-4">
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({length: 6}).map((_,i) => <CardSkeleton key={i} className="h-56" />)}</div>
            ) : drives.length === 0 ? (
              <EmptyState
                icon={<Target className="h-6 w-6" />}
                title="No drives found"
                description="Create your first placement drive to get started."
                action={<Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" />Create Drive</Button>}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {drives.map(drive => (
                  <Card
                    key={drive.id}
                    className="group cursor-pointer border-border transition-all hover:-translate-y-1 hover:border-violet-300 hover:shadow-soft-lg dark:hover:border-violet-800"
                    onClick={() => handleView(drive.id)}
                  >
                    <CardContent className="p-5">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-border">
                            {drive.company?.logoUrl ? (
                              <img src={drive.company.logoUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <Building2 className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold">{drive.company?.name}</p>
                            <p className="truncate text-xs text-muted-foreground">{drive.jobRole}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`shrink-0 ${STATUS_COLORS[drive.status]}`}>{drive.status.replace(/_/g, ' ')}</Badge>
                      </div>

                      <p className="mb-3 line-clamp-1 text-sm font-medium">{drive.driveName}</p>

                      <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2"><Calendar className="h-3 w-3" /> {formatDate(drive.driveDate)}</div>
                        <div className="flex items-center gap-2"><Briefcase className="h-3 w-3" /> {drive.ctc}</div>
                        <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {drive.location}</div>
                        <div className="flex items-center gap-2"><Users className="h-3 w-3" /> {drive.participants?.length || 0} participants</div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                        <div className="flex flex-wrap gap-1">
                          {drive.eligibleDepartments?.split(',').slice(0, 2).map(d => (
                            <Badge key={d} variant="outline" className="text-[10px]">{d.trim()}</Badge>
                          ))}
                          {drive.eligibleDepartments && drive.eligibleDepartments.split(',').length > 2 && (
                            <Badge variant="outline" className="text-[10px]">+{drive.eligibleDepartments.split(',').length - 2}</Badge>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" className="h-7 text-xs opacity-0 transition-opacity group-hover:opacity-100">
                          Manage <ChevronRight className="ml-1 h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Create Drive Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <DialogHeader>
              <DialogTitle>Create New Placement Drive</DialogTitle>
              <DialogDescription>Configure drive details and eligibility criteria</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Company *</Label>
                  <Select value={form.companyId} onValueChange={(v) => setForm((f: any) => ({ ...f, companyId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                    <SelectContent>
                      {companies.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Drive Name *</Label>
                  <Input value={form.driveName} onChange={(e) => setForm((f: any) => ({ ...f, driveName: e.target.value }))} placeholder="e.g. TCS Campus Drive 2026" />
                </div>
                <div className="space-y-2">
                  <Label>Drive Date *</Label>
                  <Input type="date" value={form.driveDate} onChange={(e) => setForm((f: any) => ({ ...f, driveDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Application Deadline</Label>
                  <Input type="date" value={form.applicationDeadline} onChange={(e) => setForm((f: any) => ({ ...f, applicationDeadline: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Job Role</Label>
                  <Input value={form.jobRole} onChange={(e) => setForm((f: any) => ({ ...f, jobRole: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>CTC</Label>
                  <Input value={form.ctc} onChange={(e) => setForm((f: any) => ({ ...f, ctc: e.target.value }))} placeholder="e.g. 7 LPA" />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm((f: any) => ({ ...f, location: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f: any) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UPCOMING">Upcoming</SelectItem>
                      <SelectItem value="REGISTRATION_OPEN">Registration Open</SelectItem>
                      <SelectItem value="ONGOING">Ongoing</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Min CGPA</Label>
                  <Input type="number" step="0.01" value={form.minCgpa} onChange={(e) => setForm((f: any) => ({ ...f, minCgpa: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Max Backlogs</Label>
                  <Input type="number" value={form.maxBacklogs} onChange={(e) => setForm((f: any) => ({ ...f, maxBacklogs: e.target.value }))} />
                </div>
              </div>

              {/* Eligibility Criteria */}
              <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-sm font-semibold">Eligibility Criteria</p>
                <div>
                  <Label className="mb-2 block text-xs text-muted-foreground">Eligible Departments</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DEPARTMENTS.map(d => (
                      <button key={d} type="button" onClick={() => toggleArr('eligibleDepartments', d)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-all ${form.eligibleDepartments.includes(d) ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-border hover:bg-accent'}`}>
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block text-xs text-muted-foreground">Eligible Years</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {YEARS.map(y => (
                      <button key={y} type="button" onClick={() => toggleArr('eligibleYears', y)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-all ${form.eligibleYears.includes(y) ? 'border-violet-600 bg-violet-600 text-white' : 'border-border hover:bg-accent'}`}>
                        {y}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block text-xs text-muted-foreground">Required Skills</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {SKILLS.map(s => (
                      <button key={s} type="button" onClick={() => toggleArr('requiredSkills', s)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-all ${form.requiredSkills.includes(s) ? 'border-amber-500 bg-amber-500 text-white' : 'border-border hover:bg-accent'}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Selection Process</Label>
                <Textarea value={form.selectionProcess} onChange={(e) => setForm((f: any) => ({ ...f, selectionProcess: e.target.value }))} rows={2} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} className="bg-violet-600 hover:bg-violet-700">Create Drive</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
