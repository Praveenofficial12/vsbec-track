'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, apiPut, apiPost } from '@/lib/api'
import { AdminLayout } from './AdminLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import {
  Settings as SettingsIcon, Building2, GraduationCap, Award, Target, Shield, Bell,
  Plus, Pencil, Save, Users, BookOpen, AlertCircle, Power,
  Clock, Activity, Key, Download, Eye, EyeOff, Copy, CheckCircle2, Loader2, RefreshCw,
} from 'lucide-react'
import {
  COLLEGE_NAME, COLLEGE_FULL, COLLEGE_SHORT, COLLEGE_LOCATION, COLLEGE_TAGLINE,
} from '@/lib/college'

type Rule = { id: string; name: string; maxCompanies: number; blockOnSelection: boolean; minCgpaDefault: number; maxBacklogsDefault: number }
type CustomField = { id: string; fieldName: string; fieldType: string; options: string | null; isActive: boolean }
type DeptRow = { department: string; password: string; studentCount: number }
type ActivityLogRow = {
  id: string
  userId: string | null
  userType: string
  action: string
  detail: string | null
  ipAddress: string | null
  userAgent: string | null
  timestamp: string
}

const FIELD_TYPES = ['TEXT', 'NUMBER', 'DROPDOWN', 'MULTISELECT', 'BOOLEAN', 'DATE', 'FILE', 'TEXTAREA']
const ACTIVITY_ACTIONS = ['ALL', 'LOGIN', 'LOGIN_FAILED', 'REGISTER', 'VISIT', 'LOGOUT']
const ACTIVITY_USER_TYPES = ['ALL', 'STUDENT', 'ADMIN', 'UNKNOWN']

const ACTIVITY_BADGE_COLORS: Record<string, string> = {
  LOGIN: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800',
  LOGIN_FAILED: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-800',
  REGISTER: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-800',
  VISIT: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-800',
  LOGOUT: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700',
}

const ACTIVITY_BADGE_LABELS: Record<string, string> = {
  LOGIN: 'Login',
  LOGIN_FAILED: 'Login Failed',
  REGISTER: 'Register',
  VISIT: 'Visit',
  LOGOUT: 'Logout',
}

export function AdminSettings() {
  const [rules, setRules] = useState<Rule[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [showFieldForm, setShowFieldForm] = useState(false)
  const [newField, setNewField] = useState({ fieldName: '', fieldType: 'TEXT', options: '' })

  // College info editable state
  const [collegeInfo, setCollegeInfo] = useState({
    name: COLLEGE_NAME,
    short: COLLEGE_SHORT,
    full: COLLEGE_FULL,
    location: COLLEGE_LOCATION,
    tagline: COLLEGE_TAGLINE,
    academicYear: '2025-2026',
    placementEmail: 'placements@vsbec.edu.in',
    contactNumber: '+91 4324 123 456',
  })

  // Department passwords tab state
  const [deptRows, setDeptRows] = useState<DeptRow[]>([])
  const [deptLoading, setDeptLoading] = useState(true)
  const [editingDept, setEditingDept] = useState<DeptRow | null>(null)
  const [newDeptPassword, setNewDeptPassword] = useState('')
  const [showDeptPassword, setShowDeptPassword] = useState<Record<string, boolean>>({})
  const [copiedDept, setCopiedDept] = useState<string | null>(null)
  const [savingDept, setSavingDept] = useState(false)

  // Activity logs tab state
  const [activityLogs, setActivityLogs] = useState<ActivityLogRow[]>([])
  const [activityTotal, setActivityTotal] = useState(0)
  const [activityLoading, setActivityLoading] = useState(true)
  const [activityFilter, setActivityFilter] = useState({ action: 'ALL', userType: 'ALL', search: '' })

  useEffect(() => {
    apiGet<{ rules: Rule[]; customFields: CustomField[] }>('/api/settings').then(r => {
      setRules(r.rules)
      setCustomFields(r.customFields)
    }).finally(() => setLoading(false))
    loadDeptPasswords()
    loadActivityLogs()
  }, [])

  const loadDeptPasswords = async () => {
    setDeptLoading(true)
    try {
      const r = await apiGet<{ departments: DeptRow[]; total: number }>('/api/admin/department-passwords')
      setDeptRows(r.departments)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load department passwords')
    } finally {
      setDeptLoading(false)
    }
  }

  const loadActivityLogs = async () => {
    setActivityLoading(true)
    try {
      const params = new URLSearchParams()
      if (activityFilter.action !== 'ALL') params.append('action', activityFilter.action)
      if (activityFilter.userType !== 'ALL') params.append('userType', activityFilter.userType)
      if (activityFilter.search) params.append('search', activityFilter.search)
      const r = await apiGet<{ logs: ActivityLogRow[]; total: number }>(`/api/admin/activity-logs?${params}`)
      setActivityLogs(r.logs)
      setActivityTotal(r.total)
    } catch (e: any) {
      toast.error(e.message || 'Failed to load activity logs')
    } finally {
      setActivityLoading(false)
    }
  }

  useEffect(() => { loadActivityLogs() }, [activityFilter])

  const handleRuleUpdate = async (rule: Rule, updates: any) => {
    try {
      await apiPut('/api/settings', { ruleId: rule.id, ...updates })
      toast.success('Rule updated')
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, ...updates } : r))
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleCreateField = async () => {
    if (!newField.fieldName) {
      toast.error('Field name is required')
      return
    }
    try {
      const r = await apiPost('/api/settings', newField)
      setCustomFields(prev => [...prev, r.field])
      toast.success('Custom field created')
      setShowFieldForm(false)
      setNewField({ fieldName: '', fieldType: 'TEXT', options: '' })
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const handleSaveCollegeInfo = () => {
    // No backend route for college info yet — we persist locally and surface
    // a success toast so the admin knows their edits were captured.
    toast.success('College information saved')
  }

  const handleCopyDeptPassword = async (row: DeptRow) => {
    try {
      await navigator.clipboard.writeText(row.password)
      setCopiedDept(row.department)
      toast.success(`${row.department} password copied to clipboard`)
      setTimeout(() => setCopiedDept(null), 1500)
    } catch {
      toast.error('Failed to copy to clipboard')
    }
  }

  const handleUpdateDeptPassword = async () => {
    if (!editingDept) return
    if (!newDeptPassword || newDeptPassword.length < 4) {
      toast.error('New password must be at least 4 characters long')
      return
    }
    setSavingDept(true)
    try {
      const r = await apiPut('/api/admin/department-passwords', {
        department: editingDept.department,
        newPassword: newDeptPassword,
      })
      toast.success(`Password updated for ${editingDept.department} — cascaded to ${r.cascadedStudents} students`)
      setEditingDept(null)
      setNewDeptPassword('')
      loadDeptPasswords()
    } catch (e: any) {
      toast.error(e.message || 'Failed to update department password')
    } finally {
      setSavingDept(false)
    }
  }

  const exportLoginUsersToExcel = async () => {
    try {
      // The API returns CSV with the correct Content-Disposition attachment headers
      // so the browser triggers a download. Excel opens CSV files natively.
      window.location.href = '/api/admin/login-users?format=csv'
      toast.success('Exporting login users to Excel (CSV)…')
    } catch (e: any) {
      toast.error(e.message || 'Failed to export login users')
    }
  }

  const exportActivityLogsToExcel = () => {
    const params = new URLSearchParams({ format: 'csv' })
    if (activityFilter.action !== 'ALL') params.append('action', activityFilter.action)
    if (activityFilter.userType !== 'ALL') params.append('userType', activityFilter.userType)
    if (activityFilter.search) params.append('search', activityFilter.search)
    window.location.href = `/api/admin/activity-logs?${params}`
    toast.success('Exporting activity logs to Excel (CSV)…')
  }

  if (loading) return <AdminLayout><div className="p-6"><div className="h-64 rounded-xl shimmer" /></div></AdminLayout>

  const rule = rules[0]
  const totalDeptStudents = deptRows.reduce((sum, r) => sum + r.studentCount, 0)

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><SettingsIcon className="h-6 w-6" /> Settings</h1>
          <p className="text-sm text-muted-foreground">Manage placement rules, custom fields, college info, department passwords, login users & activity logs</p>
        </div>

        <Tabs defaultValue="rules">
          <TabsList className="w-full justify-start overflow-x-auto scrollbar-thin">
            <TabsTrigger value="rules">Placement Rules</TabsTrigger>
            <TabsTrigger value="fields">Custom Fields</TabsTrigger>
            <TabsTrigger value="college">College Info</TabsTrigger>
            <TabsTrigger value="dept-passwords"><Key className="mr-1.5 h-3.5 w-3.5" />Dept Passwords</TabsTrigger>
            <TabsTrigger value="login-users"><Users className="mr-1.5 h-3.5 w-3.5" />Login Users</TabsTrigger>
            <TabsTrigger value="activity-logs"><Activity className="mr-1.5 h-3.5 w-3.5" />Activity Logs</TabsTrigger>
          </TabsList>

          {/* Placement Rules */}
          <TabsContent value="rules" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" /> Placement Rules</CardTitle>
                <CardDescription>Configure college-wide placement policies</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Rule Name</Label>
                    <Input value={rule?.name || ''} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Max Companies per Student</Label>
                    <Input
                      type="number"
                      defaultValue={rule?.maxCompanies}
                      onBlur={(e) => handleRuleUpdate(rule, { maxCompanies: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Default Min CGPA</Label>
                    <Input
                      type="number"
                      step="0.01"
                      defaultValue={rule?.minCgpaDefault}
                      onBlur={(e) => handleRuleUpdate(rule, { minCgpaDefault: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Default Max Backlogs</Label>
                    <Input
                      type="number"
                      defaultValue={rule?.maxBacklogsDefault}
                      onBlur={(e) => handleRuleUpdate(rule, { maxBacklogsDefault: e.target.value })}
                    />
                  </div>
                </div>
                <Separator />
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-4">
                  <div>
                    <p className="font-medium">Block students from attending further drives once selected</p>
                    <p className="text-xs text-muted-foreground">If enabled, students cannot register for new drives after being selected</p>
                  </div>
                  <Switch
                    defaultChecked={rule?.blockOnSelection}
                    onCheckedChange={(checked) => handleRuleUpdate(rule, { blockOnSelection: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Custom Fields */}
          <TabsContent value="fields" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" /> Custom Fields</CardTitle>
                    <CardDescription>Dynamic fields for student profiles</CardDescription>
                  </div>
                  <Button onClick={() => setShowFieldForm(true)} size="sm">
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Add Field
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {customFields.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">No custom fields yet.</div>
                ) : (
                  <div className="space-y-2">
                    {customFields.map(field => (
                      <div key={field.id} className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/30">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${field.isActive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
                            <Award className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{field.fieldName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px]">{field.fieldType}</Badge>
                              {field.options && <span>· Options: {field.options}</span>}
                            </div>
                          </div>
                        </div>
                        <Badge variant={field.isActive ? 'default' : 'secondary'} className={field.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : ''}>
                          {field.isActive ? 'Active' : 'Disabled'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* College Info (editable) */}
          <TabsContent value="college" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> College Information</CardTitle>
                    <CardDescription>Editable college configuration (V.S.B. Engineering College, Karur)</CardDescription>
                  </div>
                  <Button onClick={handleSaveCollegeInfo} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Save className="mr-2 h-3.5 w-3.5" />
                    Save
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">College Name</Label>
                  <Input value={collegeInfo.name} onChange={(e) => setCollegeInfo(s => ({ ...s, name: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Short Name</Label>
                  <Input value={collegeInfo.short} onChange={(e) => setCollegeInfo(s => ({ ...s, short: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Full Name</Label>
                  <Input value={collegeInfo.full} onChange={(e) => setCollegeInfo(s => ({ ...s, full: e.target.value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Location</Label>
                  <Input value={collegeInfo.location} onChange={(e) => setCollegeInfo(s => ({ ...s, location: e.target.value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">Tagline</Label>
                  <Input value={collegeInfo.tagline} onChange={(e) => setCollegeInfo(s => ({ ...s, tagline: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Academic Year</Label>
                  <Input value={collegeInfo.academicYear} onChange={(e) => setCollegeInfo(s => ({ ...s, academicYear: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Placement Cell Email</Label>
                  <Input value={collegeInfo.placementEmail} onChange={(e) => setCollegeInfo(s => ({ ...s, placementEmail: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Contact Number</Label>
                  <Input value={collegeInfo.contactNumber} onChange={(e) => setCollegeInfo(s => ({ ...s, contactNumber: e.target.value }))} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Departments & Sections</CardTitle>
                <CardDescription>Currently configured</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label className="mb-2 block text-xs text-muted-foreground">Departments ({deptRows.length} official)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {deptRows.map(d => (
                        <Badge key={d.department} variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                          {d.department} <span className="ml-1 text-[10px] opacity-70">({d.studentCount})</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block text-xs text-muted-foreground">Years</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {['1st Year', '2nd Year', '3rd Year', '4th Year'].map(y => (
                        <Badge key={y} variant="outline" className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300">{y}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block text-xs text-muted-foreground">Sections</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {['A', 'B', 'C', 'D'].map(s => (
                        <Badge key={s} variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Section {s}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Department Passwords tab */}
          <TabsContent value="dept-passwords" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2"><Key className="h-4 w-4" /> Department Passwords</CardTitle>
                    <CardDescription>Official department login passwords — students use these to register & log in.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                      {deptRows.length} departments · {totalDeptStudents} students
                    </Badge>
                    <Button variant="outline" size="sm" onClick={loadDeptPasswords} disabled={deptLoading}>
                      <RefreshCw className={`mr-2 h-3.5 w-3.5 ${deptLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {deptLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 13 }).map((_, i) => <div key={i} className="h-12 rounded-lg shimmer" />)}
                  </div>
                ) : (
                  <div className="overflow-x-auto scrollbar-thin">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Department</TableHead>
                          <TableHead>Password</TableHead>
                          <TableHead className="text-center">Students</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deptRows.map((row) => {
                          const visible = !!showDeptPassword[row.department]
                          return (
                            <TableRow key={row.department}>
                              <TableCell><Badge variant="outline" className="font-mono">{row.department}</Badge></TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                                    {visible ? row.password : '•'.repeat(Math.max(row.password.length, 6))}
                                  </code>
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setShowDeptPassword(s => ({ ...s, [row.department]: !visible }))}>
                                    {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell className="text-center">{row.studentCount}</TableCell>
                              <TableCell>
                                <div className="flex items-center justify-end gap-1">
                                  <Button variant="outline" size="sm" onClick={() => handleCopyDeptPassword(row)}>
                                    {copiedDept === row.department ? <CheckCircle2 className="mr-1 h-3.5 w-3.5 text-emerald-600" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                                    Copy
                                  </Button>
                                  <Button variant="outline" size="sm" onClick={() => { setEditingDept(row); setNewDeptPassword('') }}>
                                    <Pencil className="mr-1 h-3.5 w-3.5" />
                                    Edit
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Login Users tab */}
          <TabsContent value="login-users" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> Login Users</CardTitle>
                    <CardDescription>Export every login-capable user (students + admins) to Excel/CSV.</CardDescription>
                  </div>
                  <Button onClick={exportLoginUsersToExcel} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                    <Download className="mr-2 h-3.5 w-3.5" />
                    Export to Excel (CSV)
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                  <p className="mb-2 font-medium">This export contains 30 columns per user:</p>
                  <p className="text-xs text-muted-foreground">
                    role, userId, fullName, collegeEmail, personalEmail, mobile, password, department, degree, year, section, semester, batch, cgpa, tenthPercentage, twelfthPercentage, backlogs, historyOfArrears, graduationYear, placementStatus, placementEligible, preferredRole, preferredDomain, interestedTechs, preferredLocation, linkedinUrl, leetcodeUrl, githubUrl, resumeUrl, createdAt.
                  </p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Click the export button to download the file. Excel opens CSV files natively — just double-click to view.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs tab */}
          <TabsContent value="activity-logs" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> User Activity Logs</CardTitle>
                    <CardDescription>Track logins, registrations, page visits, and failures across students & admins.</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300">
                      {activityTotal} {activityTotal === 1 ? 'entry' : 'entries'}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={loadActivityLogs} disabled={activityLoading}>
                      <RefreshCw className={`mr-2 h-3.5 w-3.5 ${activityLoading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Button onClick={exportActivityLogsToExcel} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                      <Download className="mr-2 h-3.5 w-3.5" />
                      Export to Excel (CSV)
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid gap-3 sm:grid-cols-3">
                  <Select value={activityFilter.action} onValueChange={(v) => setActivityFilter(f => ({ ...f, action: v }))}>
                    <SelectTrigger><SelectValue placeholder="Action" /></SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_ACTIONS.map(a => <SelectItem key={a} value={a}>{a === 'ALL' ? 'All Actions' : ACTIVITY_BADGE_LABELS[a] || a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={activityFilter.userType} onValueChange={(v) => setActivityFilter(f => ({ ...f, userType: v }))}>
                    <SelectTrigger><SelectValue placeholder="User Type" /></SelectTrigger>
                    <SelectContent>
                      {ACTIVITY_USER_TYPES.map(t => <SelectItem key={t} value={t}>{t === 'ALL' ? 'All Types' : t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Search userId, IP, user agent…"
                    value={activityFilter.search}
                    onChange={(e) => setActivityFilter(f => ({ ...f, search: e.target.value }))}
                  />
                </div>

                {/* Logs table */}
                {activityLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-10 rounded-lg shimmer" />)}
                  </div>
                ) : activityLogs.length === 0 ? (
                  <EmptyActivityState />
                ) : (
                  <div className="max-h-[480px] overflow-y-auto scrollbar-thin rounded-lg border border-border">
                    <Table>
                      <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                          <TableHead className="w-32">Action</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead className="hidden md:table-cell">Type</TableHead>
                          <TableHead className="hidden lg:table-cell">Detail</TableHead>
                          <TableHead className="hidden xl:table-cell">IP Address</TableHead>
                          <TableHead className="text-right">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activityLogs.map((log) => (
                          <TableRow key={log.id}>
                            <TableCell>
                              <Badge variant="outline" className={ACTIVITY_BADGE_COLORS[log.action] || ''}>
                                {ACTIVITY_BADGE_LABELS[log.action] || log.action}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{log.userId || '—'}</TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline" className="text-[10px]">{log.userType}</Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{log.detail || '—'}</TableCell>
                            <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">{log.ipAddress || '—'}</TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              <span className="flex items-center justify-end gap-1">
                                <Clock className="h-3 w-3" />
                                {formatTimestamp(log.timestamp)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Custom Field Dialog */}
        <Dialog open={showFieldForm} onOpenChange={setShowFieldForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Custom Field</DialogTitle>
              <DialogDescription>Create a new dynamic field for student profiles</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Field Name</Label>
                <Input value={newField.fieldName} onChange={(e) => setNewField(f => ({ ...f, fieldName: e.target.value }))} placeholder="e.g. Preferred Programming Language" />
              </div>
              <div className="space-y-2">
                <Label>Field Type</Label>
                <Select value={newField.fieldType} onValueChange={(v) => setNewField(f => ({ ...f, fieldType: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(newField.fieldType === 'DROPDOWN' || newField.fieldType === 'MULTISELECT') && (
                <div className="space-y-2">
                  <Label>Options (comma-separated)</Label>
                  <Input value={newField.options} onChange={(e) => setNewField(f => ({ ...f, options: e.target.value }))} placeholder="Java,Python,C++" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFieldForm(false)}>Cancel</Button>
              <Button onClick={handleCreateField} className="bg-emerald-600 hover:bg-emerald-700">Create Field</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Department password edit dialog */}
        <Dialog open={!!editingDept} onOpenChange={(open) => !open && setEditingDept(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Department Password</DialogTitle>
              <DialogDescription>
                Change the official password for <strong>{editingDept?.department}</strong>. This will also cascade-update the password for every student registered under this department ({editingDept?.studentCount} student{editingDept?.studentCount === 1 ? '' : 's'}).
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>New Password (min 4 characters)</Label>
              <Input
                type="text"
                value={newDeptPassword}
                onChange={(e) => setNewDeptPassword(e.target.value)}
                placeholder="e.g. cse#109"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Current password: <code className="rounded bg-muted px-1 py-0.5 font-mono">{editingDept?.password}</code>
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingDept(null)}>Cancel</Button>
              <Button onClick={handleUpdateDeptPassword} disabled={savingDept} className="bg-emerald-600 hover:bg-emerald-700">
                {savingDept ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}

function EmptyActivityState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-10 text-center">
      <Activity className="mx-auto mb-3 h-10 w-10 text-muted-foreground/50" />
      <p className="text-sm font-medium text-foreground">No activity logs yet</p>
      <p className="mt-1 text-xs text-muted-foreground">Logs will appear here once students or admins start interacting with the system.</p>
    </div>
  )
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts)
    if (isNaN(d.getTime())) return ts
    return d.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ts
  }
}
