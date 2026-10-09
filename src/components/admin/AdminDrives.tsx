'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, apiPost, formatDate, STATUS_COLORS, getCompanyLogo } from '@/lib/api'
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
  CheckCircle2, Clock, AlertCircle, Filter, X, Search, Globe, Sparkles, Loader2
} from 'lucide-react'
import type { Drive, Company } from '@/lib/types'

const DEPARTMENTS = ['AI & DS', 'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year']
const CLASSES = ['A', 'B', 'C', 'D']
const SKILLS = ['Java', 'Python', 'C', 'C++', 'JavaScript', 'React', 'SQL', 'MongoDB', 'Cloud']

const EMPTY_FORM = {
  companyName: '',
  driveName: '',
  driveDate: '',
  applicationDeadline: '',
  jobRole: '',
  ctc: '',
  location: '',
  eligibleDepartments: [] as string[],
  // Default to 3rd AND 4th Year as requested
  eligibleYears: ['3rd Year', '4th Year'] as string[],
  eligibleClasses: ['A', 'B', 'C', 'D'] as string[],
  minCgpa: '6.5',
  maxBacklogs: '0',
  minTenthPercentage: '60',
  minTwelfthPercentage: '60',
  requiredSkills: [] as string[],
  preferredSkills: [] as string[],
  selectionProcess: 'Aptitude -> Coding -> GD -> Technical HR -> General HR',
  status: 'UPCOMING',
}

export function AdminDrives() {
  const setView = useAppStore((s) => s.setView)
  const setSelected = useAppStore((s) => s.setSelected)
  const [drives, setDrives] = useState<Drive[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>({ ...EMPTY_FORM })
  const [logoPreview, setLogoPreview] = useState<{ url: string; domain: string } | null>(null)
  const [logoLoading, setLogoLoading] = useState(false)
  const [creating, setCreating] = useState(false)

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

  // Auto-fetch company logo from Google (Clearbit) as the staff types the company name
  useEffect(() => {
    if (!form.companyName || form.companyName.trim().length < 2) {
      setLogoPreview(null)
      return
    }
    const timeout = setTimeout(() => {
      setLogoLoading(true)
      const cleanName = form.companyName.trim()
      const domain = cleanName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .replace(/^(the|pvt|ltd|private|limited|inc|corp|corporation|company|co)+$/, '')
      const finalDomain = `${domain}.com`
      // Google's favicon service - fetches company logos directly from Google's index
      const url = `https://www.google.com/s2/favicons?domain=${finalDomain}&sz=128`
      // Pre-load the image to verify it exists
      const img = new Image()
      img.onload = () => {
        setLogoPreview({ url, domain: finalDomain })
        setLogoLoading(false)
      }
      img.onerror = () => {
        setLogoPreview(null)
        setLogoLoading(false)
      }
      img.src = url
    }, 500)
    return () => clearTimeout(timeout)
  }, [form.companyName])

  const toggleArr = (key: string, value: string) => {
    setForm(f => {
      const arr = f[key] || []
      return { ...f, [key]: arr.includes(value) ? arr.filter((v: string) => v !== value) : [...arr, value] }
    })
  }

  const handleSubmit = async () => {
    if (!form.companyName || !form.driveName || !form.driveDate) {
      toast.error('Please fill in company name, drive name and date')
      return
    }
    setCreating(true)
    try {
      await apiPost('/api/drives', {
        companyName: form.companyName,
        driveName: form.driveName,
        driveDate: form.driveDate,
        applicationDeadline: form.applicationDeadline,
        jobRole: form.jobRole,
        ctc: form.ctc,
        location: form.location,
        eligibleDepartments: form.eligibleDepartments.join(','),
        eligibleYears: form.eligibleYears.join(','),
        eligibleClasses: form.eligibleClasses.join(','),
        minCgpa: form.minCgpa,
        maxBacklogs: form.maxBacklogs,
        minTenthPercentage: form.minTenthPercentage,
        minTwelfthPercentage: form.minTwelfthPercentage,
        requiredSkills: form.requiredSkills.join(','),
        preferredSkills: form.preferredSkills.join(','),
        selectionProcess: form.selectionProcess,
        status: form.status,
        logoDomain: logoPreview?.domain,
      })
      toast.success('Drive created successfully! Company logo fetched from Google.')
      setShowForm(false)
      setForm({ ...EMPTY_FORM })
      setLogoPreview(null)
      fetchDrives()
    } catch (e: any) {
      toast.error(e.message || 'Failed to create drive')
    } finally {
      setCreating(false)
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
            <TabsTrigger value="SELECTED">Selected</TabsTrigger>
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
              <DialogDescription>Enter company name — logo will be auto-fetched from Google</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Company Name — text input (provided by staff) */}
                <div className="space-y-2 sm:col-span-2">
                  <Label>Company Name *</Label>
                  <Input
                    value={form.companyName}
                    onChange={(e) => setForm((f: any) => ({ ...f, companyName: e.target.value }))}
                    placeholder="e.g. TCS, Infosys, Accenture..."
                    className="font-medium"
                  />
                  <p className="text-xs text-muted-foreground">
                    Type the company name. Its logo will be automatically fetched from Google and applied after the drive is created.
                  </p>
                </div>

                {/* Live Logo Preview from Google (Clearbit) */}
                {form.companyName && form.companyName.trim().length >= 2 && (
                  <div className="sm:col-span-2">
                    <div className="flex items-center gap-4 rounded-lg border border-violet-200 bg-violet-50/50 p-4 dark:border-violet-800 dark:bg-violet-900/20">
                      <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-lg bg-white shadow-soft ring-1 ring-border">
                        {logoLoading ? (
                          <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
                        ) : logoPreview ? (
                          <img
                            src={logoPreview.url}
                            alt={`${form.companyName} logo`}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <Building2 className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="flex items-center gap-1.5 text-sm font-semibold">
                          <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                          {logoLoading ? 'Fetching logo from Google...' : logoPreview ? 'Logo found!' : 'No logo found'}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {logoPreview ? (
                            <>Auto-detected domain: <code className="rounded bg-background/60 px-1 py-0.5 font-mono text-[10px]">{logoPreview.domain}</code></>
                          ) : logoLoading ? (
                            'Searching the web for company logo...'
                          ) : (
                            'A generic company icon will be used as fallback.'
                          )}
                        </p>
                      </div>
                      {logoPreview && (
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Ready
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

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

              {/* Eligibility Criteria — Year, 10th%, 12th%, CGPA */}
              <div className="space-y-4 rounded-lg border-2 border-violet-200 bg-violet-50/30 p-4 dark:border-violet-800 dark:bg-violet-900/10">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-violet-600" />
                    Eligibility Criteria
                  </p>
                  <Badge variant="outline" className="border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-[10px]">
                    Pre-filled with defaults
                  </Badge>
                </div>

                {/* Eligible Years */}
                <div>
                  <Label className="mb-2 block text-xs text-muted-foreground">
                    Eligible Years <span className="text-violet-600">(3rd & 4th Year pre-selected)</span>
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {YEARS.map(y => (
                      <button key={y} type="button" onClick={() => toggleArr('eligibleYears', y)}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-all ${form.eligibleYears.includes(y) ? 'border-violet-600 bg-violet-600 text-white shadow-soft' : 'border-border bg-background hover:bg-accent'}`}>
                        {y}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Academic criteria: 10th %, 12th %, CGPA, Backlogs */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Min 10th Percentage</Label>
                    <Input type="number" step="0.01" min="0" max="100" placeholder="e.g. 60"
                      value={form.minTenthPercentage || ''}
                      onChange={(e) => setForm((f: any) => ({ ...f, minTenthPercentage: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Min 12th Percentage</Label>
                    <Input type="number" step="0.01" min="0" max="100" placeholder="e.g. 60"
                      value={form.minTwelfthPercentage || ''}
                      onChange={(e) => setForm((f: any) => ({ ...f, minTwelfthPercentage: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Min CGPA</Label>
                    <Input type="number" step="0.01" min="0" max="10" placeholder="e.g. 6.5"
                      value={form.minCgpa}
                      onChange={(e) => setForm((f: any) => ({ ...f, minCgpa: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Max Backlogs</Label>
                    <Input type="number" min="0" placeholder="e.g. 0"
                      value={form.maxBacklogs}
                      onChange={(e) => setForm((f: any) => ({ ...f, maxBacklogs: e.target.value }))} />
                  </div>
                </div>

                <p className="text-[10px] text-muted-foreground">
                  Students must meet ALL criteria (year, 10th %, 12th %, CGPA, backlogs) to be eligible for this drive.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Selection Process</Label>
                <Textarea value={form.selectionProcess} onChange={(e) => setForm((f: any) => ({ ...f, selectionProcess: e.target.value }))} rows={2} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={creating}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Create Drive
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
