'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, formatDate, STATUS_COLORS, csvToArray } from '@/lib/api'
import { AdminLayout } from './AdminLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { StatCard } from '@/components/common/StatCard'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import { ArrowLeft, Building2, Globe, Briefcase, MapPin, Calendar, Target, Users, ExternalLink, IndianRupee, ChevronRight } from 'lucide-react'
import type { Company } from '@/lib/types'

export function AdminCompanyDetail() {
  const companyId = useAppStore((s) => s.selectedCompanyId)
  const setView = useAppStore((s) => s.setView)
  const setSelected = useAppStore((s) => s.setSelected)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!companyId) return
    apiGet<{ company: Company }>(`/api/companies/${companyId}`).then(r => setCompany(r.company)).finally(() => setLoading(false))
  }, [companyId])

  if (loading) return <AdminLayout><div className="p-6 space-y-4"><CardSkeleton className="h-32" /><div className="grid gap-4 sm:grid-cols-3">{Array.from({length:3}).map((_,i)=><CardSkeleton key={i} className="h-24" />)}</div><CardSkeleton className="h-96" /></div></AdminLayout>
  if (!company) return <AdminLayout><div className="p-6"><EmptyState title="Company not found" /></div></AdminLayout>

  const drives = company.drives || []
  const totalParticipants = drives.reduce((sum, d) => sum + (d.participants?.length || 0), 0)
  const totalSelected = drives.reduce((sum, d) => sum + (d.participants?.filter(p => p.finalResult === 'SELECTED').length || 0), 0)

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <button onClick={() => setView('admin-companies')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Companies
        </button>

        {/* Header */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-white/15 ring-2 ring-white/30">
                {company.logoUrl ? (
                  <img src={company.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-8 w-8" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{company.name}</h1>
                <p className="text-white/80">{company.industry} · {company.jobRole}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {company.ctc && <span className="rounded-full bg-white/15 px-2 py-0.5">{company.ctc}</span>}
                  {company.location && <span className="rounded-full bg-white/15 px-2 py-0.5">{company.location}</span>}
                  {company.jobType && <span className="rounded-full bg-white/15 px-2 py-0.5">{company.jobType}</span>}
                </div>
              </div>
              {company.website && (
                <a href={company.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm backdrop-blur hover:bg-white/25">
                  <Globe className="h-4 w-4" /> Visit Website
                </a>
              )}
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="Total Drives" value={drives.length} icon={<Target className="h-5 w-5" />} accent="violet" />
          <StatCard title="Total Participants" value={totalParticipants} icon={<Users className="h-5 w-5" />} accent="emerald" />
          <StatCard title="Total Selected" value={totalSelected} icon={<Target className="h-5 w-5" />} accent="amber" />
        </div>

        {/* Company Info */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">About {company.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="text-muted-foreground">{company.description || 'No description available.'}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-2"><Briefcase className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{company.jobRole || '—'}</span></div>
                <div className="flex items-center gap-2"><IndianRupee className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{company.ctc || '—'}</span></div>
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{company.location || '—'}</span></div>
                <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{formatDate(company.driveDate)}</span></div>
              </div>
              <Separator />
              <div>
                <p className="text-xs text-muted-foreground">Eligibility Criteria</p>
                <p className="font-medium">{company.eligibility || '—'}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Industry</CardTitle>
            </CardHeader>
            <CardContent>
              <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300">{company.industry || '—'}</Badge>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Job Type</span><span className="font-medium">{company.jobType || '—'}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Logo Domain</span><span className="font-medium">{company.logoDomain || '—'}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Drives */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Placement Drives</CardTitle>
            <CardDescription>All drives conducted for this company</CardDescription>
          </CardHeader>
          <CardContent>
            {drives.length === 0 ? (
              <EmptyState icon={<Target className="h-6 w-6" />} title="No drives yet" description="Create a drive for this company." action={<Button onClick={() => setView('admin-drives')}>Create Drive</Button>} />
            ) : (
              <div className="space-y-3">
                {drives.map(drive => (
                  <div
                    key={drive.id}
                    className="group flex cursor-pointer items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-emerald-300 hover:shadow-soft dark:hover:border-emerald-800"
                    onClick={() => { setSelected('driveId', drive.id); setView('admin-drive-detail') }}
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30">
                      <Target className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{drive.driveName}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(drive.driveDate)}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {drive.participants?.length || 0} participants</span>
                        {drive.ctc && <span>{drive.ctc}</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className={STATUS_COLORS[drive.status]}>{drive.status.replace(/_/g, ' ')}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
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

