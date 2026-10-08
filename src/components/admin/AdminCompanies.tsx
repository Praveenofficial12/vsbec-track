'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, apiPost, apiPut, apiDelete, formatDate, STATUS_COLORS, getCompanyLogo } from '@/lib/api'
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
import {
  Building2, Plus, Search, Globe, Briefcase, MapPin, Calendar, ExternalLink,
  Pencil, Trash2, Target, IndianRupee, Building
} from 'lucide-react'
import { toast } from 'sonner'
import type { Company, Drive } from '@/lib/types'

export function AdminCompanies() {
  const setView = useAppStore((s) => s.setView)
  const setSelected = useAppStore((s) => s.setSelected)
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Company | null>(null)
  const [form, setForm] = useState<any>({
    name: '', website: '', description: '', industry: '', jobRole: '', location: '',
    ctc: '', jobType: 'Full Time', eligibility: '', logoDomain: '',
  })

  const fetchCompanies = async () => {
    setLoading(true)
    try {
      const r = await apiGet<{ companies: Company[] }>('/api/companies')
      setCompanies(r.companies)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCompanies() }, [])

  const handleOpenCreate = () => {
    setEditing(null)
    setForm({ name: '', website: '', description: '', industry: '', jobRole: '', location: '', ctc: '', jobType: 'Full Time', eligibility: '', logoDomain: '' })
    setShowForm(true)
  }

  const handleOpenEdit = (company: Company) => {
    setEditing(company)
    setForm({ ...company })
    setShowForm(true)
  }

  const handleSubmit = async () => {
    if (!form.name) {
      toast.error('Company name is required')
      return
    }
    try {
      if (editing) {
        await apiPut(`/api/companies/${editing.id}`, form)
        toast.success('Company updated successfully!')
      } else {
        await apiPost('/api/companies', form)
        toast.success('Company created successfully!')
      }
      setShowForm(false)
      fetchCompanies()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save company')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this company? This will also delete all related drives.')) return
    try {
      await apiDelete(`/api/companies/${id}`)
      toast.success('Company deleted')
      fetchCompanies()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const filtered = companies.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return c.name.toLowerCase().includes(q) || c.industry?.toLowerCase().includes(q) || c.jobRole?.toLowerCase().includes(q)
  })

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Companies</h1>
            <p className="text-sm text-muted-foreground">{loading ? 'Loading...' : `${companies.length} companies`}</p>
          </div>
          <Button onClick={handleOpenCreate} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Company
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search companies by name, industry, or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({length: 6}).map((_,i) => <CardSkeleton key={i} className="h-56" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" />}
            title="No companies found"
            description={search ? "Try a different search term." : "Get started by adding your first company."}
            action={!search && <Button onClick={handleOpenCreate}><Plus className="mr-2 h-4 w-4" />Add Company</Button>}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(company => {
              const drives = company.drives || []
              return (
                <Card
                  key={company.id}
                  className="group cursor-pointer overflow-hidden border-border transition-all hover:-translate-y-1 hover:border-emerald-300 hover:shadow-soft-lg dark:hover:border-emerald-800"
                  onClick={() => { setSelected('companyId', company.id); setView('admin-company-detail') }}
                >
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-muted ring-1 ring-border">
                          {company.logoUrl ? (
                            <img src={company.logoUrl} alt={company.name} className="h-full w-full object-cover" />
                          ) : (
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{company.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{company.industry || '—'}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7"
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(company) }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          onClick={(e) => { e.stopPropagation(); handleDelete(company.id) }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{company.description || 'No description available'}</p>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground"><Briefcase className="h-3 w-3 shrink-0" /> {company.jobRole || '—'}</div>
                      <div className="flex items-center gap-2 text-muted-foreground"><IndianRupee className="h-3 w-3 shrink-0" /> {company.ctc || '—'}</div>
                      <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3 w-3 shrink-0" /> {company.location || '—'}</div>
                      {company.website && (
                        <a href={company.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-emerald-600 hover:underline dark:text-emerald-400">
                          <Globe className="h-3 w-3 shrink-0" /> Visit website
                        </a>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                      <div className="flex items-center gap-1 text-xs">
                        <Target className="h-3 w-3 text-violet-600 dark:text-violet-400" />
                        <span className="font-medium">{drives.length}</span>
                        <span className="text-muted-foreground">{drives.length === 1 ? 'drive' : 'drives'}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">View Details</Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Company' : 'Create New Company'}</DialogTitle>
              <DialogDescription>{editing ? 'Update company information' : 'Add a new company to your placement database'}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Logo Preview */}
              {form.name && (
                <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-background ring-1 ring-border">
                    {form.logoDomain || form.name ? (
                      <img src={getCompanyLogo(form.name, form.logoDomain)} alt="" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : (
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="text-sm">
                    <p className="font-medium">Auto-detected logo</p>
                    <p className="text-xs text-muted-foreground">Logo will be fetched automatically based on company name/domain</p>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Company Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm((f: any) => ({ ...f, name: e.target.value }))} placeholder="e.g. TCS" />
                </div>
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input value={form.website} onChange={(e) => setForm((f: any) => ({ ...f, website: e.target.value }))} placeholder="https://" />
                </div>
                <div className="space-y-2">
                  <Label>Logo Domain</Label>
                  <Input value={form.logoDomain} onChange={(e) => setForm((f: any) => ({ ...f, logoDomain: e.target.value }))} placeholder="e.g. tcs.com" />
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Input value={form.industry} onChange={(e) => setForm((f: any) => ({ ...f, industry: e.target.value }))} placeholder="e.g. IT Services" />
                </div>
                <div className="space-y-2">
                  <Label>Job Role</Label>
                  <Input value={form.jobRole} onChange={(e) => setForm((f: any) => ({ ...f, jobRole: e.target.value }))} placeholder="e.g. Software Engineer" />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={form.location} onChange={(e) => setForm((f: any) => ({ ...f, location: e.target.value }))} placeholder="e.g. Chennai" />
                </div>
                <div className="space-y-2">
                  <Label>CTC</Label>
                  <Input value={form.ctc} onChange={(e) => setForm((f: any) => ({ ...f, ctc: e.target.value }))} placeholder="e.g. 7 LPA" />
                </div>
                <div className="space-y-2">
                  <Label>Job Type</Label>
                  <Select value={form.jobType} onValueChange={(v) => setForm((f: any) => ({ ...f, jobType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full Time">Full Time</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Part Time">Part Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Eligibility Criteria</Label>
                  <Input value={form.eligibility} onChange={(e) => setForm((f: any) => ({ ...f, eligibility: e.target.value }))} placeholder="e.g. CGPA >= 6.5, No active backlogs" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))} placeholder="Brief description of the company" rows={3} />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSubmit} className="bg-emerald-600 hover:bg-emerald-700">
                {editing ? 'Update Company' : 'Create Company'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
