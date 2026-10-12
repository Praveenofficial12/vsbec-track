'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, apiPost, apiPut, apiDelete, csvToArray, formatDate, STATUS_COLORS, avatarColor, initials } from '@/lib/api'
import { AdminLayout } from './AdminLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { EmptyState, CardSkeleton } from '@/components/common/States'
import { StatCard } from '@/components/common/StatCard'
import { toast } from 'sonner'
import { openFileViewer } from '@/lib/file-viewer'
import {
  ArrowLeft, Calendar, Briefcase, MapPin, Users, Building2, Target,
  CheckCircle2, XCircle, Clock, Award, Activity, AlertCircle, ListChecks,
  Trophy, Loader2, Download, IndianRupee, Trash2, RotateCcw, PartyPopper, Bell, Save, Lock,
  UploadCloud, FileText, File as FileIcon, Paperclip, ExternalLink,
} from 'lucide-react'
import type { Drive, DriveParticipation, Student } from '@/lib/types'

// Drive file metadata returned by the /api/drives/[id]/files endpoint.
interface DriveFile {
  id: string
  driveId: string
  fileName: string
  filePath: string
  fileSize: number
  mimeType: string
  description: string | null
  uploadedBy: string
  createdAt: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return <FileIcon className="h-4 w-4 text-violet-500" />
  if (mimeType.includes('pdf')) return <FileText className="h-4 w-4 text-rose-500" />
  if (mimeType.includes('word') || mimeType.includes('document')) return <FileText className="h-4 w-4 text-blue-500" />
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileText className="h-4 w-4 text-emerald-500" />
  if (mimeType.includes('zip') || mimeType.includes('compressed')) return <FileText className="h-4 w-4 text-amber-500" />
  return <Paperclip className="h-4 w-4 text-muted-foreground" />
}

export function AdminDriveDetail() {
  const driveId = useAppStore((s) => s.selectedDriveId)
  const setView = useAppStore((s) => s.setView)
  const [drive, setDrive] = useState<Drive | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [markingComplete, setMarkingComplete] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<DriveParticipation | null>(null)
  const [removing, setRemoving] = useState(false)
  const [editEligibility, setEditEligibility] = useState(false)
  const [eligForm, setEligForm] = useState({})
  // Confirmation popup state for marking a student as SELECTED. Once
  // confirmed, the final result is locked (the Select in the Final Results
  // tab becomes disabled) and the drive itself stays ONGOING — only the
  // dedicated "Remove from Selected" button on the Selected Students tab
  // can unlock it.
  const [selectTarget, setSelectTarget] = useState<DriveParticipation | null>(null)
  const [selecting, setSelecting] = useState(false)
  // Celebration popup shown after a student is successfully marked SELECTED.
  const [celebration, setCelebration] = useState<DriveParticipation | null>(null)
  // Drive files (uploaded to the announcement area, shared with attending students)
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [fileDescription, setFileDescription] = useState('')
  const [deletingFile, setDeletingFile] = useState<string | null>(null)
  // Drive links (shared in the announcement area)
  const [driveLinks, setDriveLinks] = useState<any[]>([])
  const [linkTitle, setLinkTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkDesc, setLinkDesc] = useState('')
  const [addingLink, setAddingLink] = useState(false)
  const [deletingLink, setDeletingLink] = useState<string | null>(null)

  const refreshLinks = async () => {
    if (!driveId) return
    try {
      const r = await apiGet<{ links: any[] }>(`/api/drives/${driveId}/links`)
      setDriveLinks(r.links || [])
    } catch { /* best-effort */ }
  }

  const handleAddLink = async () => {
    if (!driveId) return
    if (!linkUrl.trim()) {
      toast.error('URL is required')
      return
    }
    setAddingLink(true)
    try {
      await apiPost(`/api/drives/${driveId}/links`, {
        title: linkTitle.trim() || undefined,
        url: linkUrl.trim(),
        description: linkDesc.trim() || undefined,
      })
      toast.success('Link shared with attending students')
      setLinkTitle('')
      setLinkUrl('')
      setLinkDesc('')
      await refreshLinks()
    } catch (e: any) {
      toast.error(e.message || 'Failed to add link')
    } finally {
      setAddingLink(false)
    }
  }

  const handleDeleteLink = async (linkId: string) => {
    if (!driveId) return
    setDeletingLink(linkId)
    try {
      await apiDelete(`/api/drives/${driveId}/links?linkId=${linkId}`)
      toast.success('Link deleted')
      await refreshLinks()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete link')
    } finally {
      setDeletingLink(null)
    }
  }

  // Round editing state
  const [editingRound, setEditingRound] = useState<string | null>(null)
  const [roundForm, setRoundForm] = useState<{ roundName: string; description: string; date: string; startTime: string; endTime: string; status: string }>({ roundName: '', description: '', date: '', startTime: '', endTime: '', status: 'UPCOMING' })
  const [savingRound, setSavingRound] = useState(false)
  // Add-round state
  const [showAddRound, setShowAddRound] = useState(false)
  const [newRoundName, setNewRoundName] = useState('')
  const [newRoundDesc, setNewRoundDesc] = useState('')
  const [addingRound, setAddingRound] = useState(false)
  // Delete-round state
  const [deletingRoundId, setDeletingRoundId] = useState<string | null>(null)

  const refreshDrive = async () => {
    if (!driveId) return
    const r = await apiGet<{ drive: Drive }>(`/api/drives/${driveId}`)
    setDrive(r.drive)
  }

  const refreshFiles = async () => {
    if (!driveId) return
    try {
      const r = await apiGet<{ files: DriveFile[] }>(`/api/drives/${driveId}/files`)
      setDriveFiles(r.files || [])
    } catch { /* best-effort */ }
  }

  useEffect(() => {
    if (!driveId) return
    apiGet<{ drive: Drive }>(`/api/drives/${driveId}`).then(r => setDrive(r.drive)).finally(() => setLoading(false))
    refreshFiles()
    refreshLinks()
  }, [driveId])

  const updateParticipation = async (participation: DriveParticipation, updates: any) => {
    setUpdating(participation.id)
    try {
      await apiPut('/api/participations', { participationId: participation.id, ...updates })
      toast.success('Updated successfully')
      await refreshDrive()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setUpdating(null)
    }
  }

  // When the admin picks "SELECTED" in the Final Results dropdown we do NOT
  // update immediately. Instead we open a confirmation popup so the admin can
  // review the offer details (job role, CTC, joining location, joining date)
  // before the result is locked in. Only after confirmation do we call the
  // API — which also marks the DRIVE status as SELECTED (not COMPLETED), so
  // the final results area locks for new selections but the drive itself
  // stays open for the remaining students.
  const handleConfirmSelect = async () => {
    if (!selectTarget || !drive) return
    setSelecting(true)
    try {
      await apiPut('/api/participations', {
        participationId: selectTarget.id,
        finalResult: 'SELECTED',
        jobRole: drive.jobRole,
        ctc: drive.ctc,
        joiningLocation: drive.location,
        joiningDate: '2026-07-01',
      })
      await refreshDrive()
      // Show the celebration popup and trigger the confetti toast.
      setCelebration(selectTarget)
      toast.success(`${selectTarget.student?.fullName} marked as SELECTED — drive marked as SELECTED (final results locked, drive stays open)`, {
        icon: <PartyPopper className="h-4 w-4" />,
      })
      setSelectTarget(null)
    } catch (e: any) {
      toast.error(e.message || 'Failed to mark as selected')
    } finally {
      setSelecting(false)
    }
  }

  const handleMarkComplete = async () => {
    if (!drive) return
    setMarkingComplete(true)
    try {
      await apiPut(`/api/drives/${drive.id}`, { status: 'COMPLETED' })
      toast.success('Drive marked as completed')
      await refreshDrive()
    } catch (e: any) {
      toast.error(e.message || 'Failed to mark drive as completed')
    } finally {
      setMarkingComplete(false)
    }
  }

  const handleReopenDrive = async () => {
    if (!drive) return
    setMarkingComplete(true)
    try {
      await apiPut(`/api/drives/${drive.id}`, { status: 'ONGOING' })
      toast.success('Drive reopened — status set to Ongoing')
      await refreshDrive()
    } catch (e: any) {
      toast.error(e.message || 'Failed to reopen drive')
    } finally {
      setMarkingComplete(false)
    }
  }

  const handleRemoveSelected = async () => {
    if (!removeTarget || !driveId) return
    setRemoving(true)
    try {
      // The cleanest way to "remove" a selected student from a drive is to
      // null-out their finalResult via the participations PUT endpoint.
      // This keeps the audit trail intact (we don't delete the participation)
      // but un-marks them as selected. The API also checks if any other
      // selected students remain; if not, the drive status is demoted from
      // SELECTED back to ONGOING so the final results area re-opens.
      await apiPut('/api/participations', {
        participationId: removeTarget.id,
        finalResult: 'REJECTED',
        attendance: 'REJECTED',
      })
      toast.success(`${removeTarget.student?.fullName} removed from selected list — final results area re-opened`)
      await refreshDrive()
      setRemoveTarget(null)
    } catch (e: any) {
      toast.error(e.message || 'Failed to remove student')
    } finally {
      setRemoving(false)
    }
  }

  // Start editing a round — populate the form with the round's current values.
  const startEditRound = (round: any) => {
    setEditingRound(round.id)
    setRoundForm({
      roundName: round.roundName || '',
      description: round.description || '',
      date: round.date || '',
      startTime: round.startTime || '',
      endTime: round.endTime || '',
      status: round.status || 'UPCOMING',
    })
  }

  // Save the edited round via PUT /api/drives/<id>/rounds/<roundId>
  const handleSaveRound = async (roundId: string) => {
    if (!driveId) return
    setSavingRound(true)
    try {
      await apiPut(`/api/drives/${driveId}/rounds/${roundId}`, roundForm)
      toast.success('Round updated successfully')
      setEditingRound(null)
      await refreshDrive()
    } catch (e: any) {
      toast.error(e.message || 'Failed to update round')
    } finally {
      setSavingRound(false)
    }
  }

  // Download the list of students who cleared a specific round as CSV.
  const handleDownloadClearedStudents = (roundId: string, roundName: string) => {
    if (!driveId) return
    // Trigger the CSV download via a direct browser navigation
    window.open(`/api/drives/${driveId}/rounds/${roundId}/cleared-students`, '_blank')
  }

  // Add a new round to the drive via POST /api/drives/<id>/rounds
  const handleAddRound = async () => {
    if (!driveId) return
    if (!newRoundName.trim()) {
      toast.error('Round name is required')
      return
    }
    setAddingRound(true)
    try {
      await apiPost(`/api/drives/${driveId}/rounds`, {
        roundName: newRoundName.trim(),
        description: newRoundDesc.trim() || undefined,
      })
      toast.success(`Round "${newRoundName}" added successfully`)
      setNewRoundName('')
      setNewRoundDesc('')
      setShowAddRound(false)
      await refreshDrive()
    } catch (e: any) {
      toast.error(e.message || 'Failed to add round')
    } finally {
      setAddingRound(false)
    }
  }

  // Delete a round from the drive via DELETE /api/drives/<id>/rounds/<roundId>
  const handleDeleteRound = async (roundId: string, roundName: string) => {
    if (!driveId) return
    setDeletingRoundId(roundId)
    try {
      await apiDelete(`/api/drives/${driveId}/rounds/${roundId}`)
      toast.success(`Round "${roundName}" deleted`)
      await refreshDrive()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete round')
    } finally {
      setDeletingRoundId(null)
    }
  }

  const handleExportSelected = () => {
    if (!drive) return
    const selected = (drive.participants || []).filter((p) => p.finalResult === 'SELECTED')
    if (selected.length === 0) {
      toast.error('No selected students to export')
      return
    }
    const headers = ['Register Number', 'Name', 'Email', 'Department', 'Year', 'Section', 'Job Role', 'CTC', 'Joining Location', 'Joining Date']
    const rows = selected.map(p => [
      p.student?.registerNumber || '',
      p.student?.fullName || '',
      p.student?.collegeEmail || '',
      p.student?.department || '',
      p.student?.year || '',
      p.student?.section || '',
      p.jobRole || drive.jobRole || '',
      p.ctc || drive.ctc || '',
      p.joiningLocation || drive.location || '',
      p.joiningDate || '',
    ])
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${drive.company?.name || 'drive'}_selected_students_${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${selected.length} selected students to CSV`)
  }

  if (loading) return <AdminLayout><div className="p-6 space-y-4"><CardSkeleton className="h-32" /><div className="grid gap-4 sm:grid-cols-4">{Array.from({length:4}).map((_,i)=><CardSkeleton key={i} className="h-24" />)}</div><CardSkeleton className="h-96" /></div></AdminLayout>
  if (!drive) return <AdminLayout><div className="p-6"><EmptyState icon={<AlertCircle className="h-6 w-6" />} title="Drive not found" /></div></AdminLayout>

  const participants = drive.participants || []
  const rounds = drive.rounds || []
  const attended = participants.filter(p => ['ATTENDING', 'IN_PROGRESS', 'SELECTED', 'REJECTED', 'ON_HOLD'].includes(p.attendance))
  const selected = participants.filter(p => p.finalResult === 'SELECTED')
  const rejected = participants.filter(p => p.finalResult === 'REJECTED')
  const inProgress = participants.filter(p => p.attendance === 'IN_PROGRESS')
  const isCompleted = drive.status === 'COMPLETED'
  // "SELECTED" drive status = at least one student has been marked SELECTED
  // in the final result. The drive is NOT closed — the Final Results area is
  // locked (no new selections) but the "Mark as Completed" button is still
  // available to formally close the drive.
  const isSelected = drive.status === 'SELECTED'

  // Total CTC of selected students (parse the drive CTC for numeric value)
  const ctcNumeric = parseFloat((drive.ctc || '').replace(/[^0-9.]/g, '')) || 0
  const totalCtcValue = selected.length * ctcNumeric

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <button onClick={() => setView('admin-drives')} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Drives
        </button>

        {/* Header with Mark as Completed / Reopen Drive button */}
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-violet-600 to-purple-700 p-6 text-white">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-white/15 ring-2 ring-white/30">
                {drive.company?.logoUrl ? (
                  <img src={drive.company.logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Building2 className="h-8 w-8" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{drive.company?.name}</h1>
                <p className="text-white/80">{drive.driveName}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-white/15 px-2 py-0.5">{drive.jobRole}</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5">{drive.ctc}</span>
                  <span className="rounded-full bg-white/15 px-2 py-0.5">{formatDate(drive.driveDate)}</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={`self-start ${STATUS_COLORS[drive.status]}`}>{drive.status.replace(/_/g, ' ')}</Badge>
                {isCompleted ? (
                  <Button
                    onClick={handleReopenDrive}
                    disabled={markingComplete}
                    variant="secondary"
                    size="sm"
                    className="bg-white text-violet-700 hover:bg-violet-50"
                  >
                    {markingComplete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                    Reopen Drive
                  </Button>
                ) : (
                  <Button
                    onClick={handleMarkComplete}
                    disabled={markingComplete}
                    variant="secondary"
                    size="sm"
                    className="bg-white text-violet-700 hover:bg-violet-50"
                  >
                    {markingComplete ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                    Mark as Completed
                  </Button>
                )}
              </div>
            </div>
          </div>
          {isCompleted && (
            <div className="animate-bounce-in flex items-center gap-2 border-t border-emerald-200 bg-emerald-50 px-6 py-3 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
              <PartyPopper className="h-4 w-4" />
              <p className="text-sm font-medium">This drive is completed — {selected.length} student{selected.length === 1 ? '' : 's'} selected, {rejected.length} not selected.</p>
            </div>
          )}
          {isSelected && (
            <div className="animate-bounce-in flex items-center gap-2 border-t border-emerald-300 bg-emerald-50 px-6 py-3 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              <Trophy className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-medium">
                {selected.length} student{selected.length === 1 ? '' : 's'} selected — final results are locked. The drive remains open for the remaining students. Use <strong>Mark as Completed</strong> to formally close it.
              </p>
            </div>
          )}
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard title="Total Participants" value={participants.length} icon={<Users className="h-5 w-5" />} accent="violet" />
          <StatCard title="Attended" value={attended.length} icon={<CheckCircle2 className="h-5 w-5" />} accent="emerald" />
          <StatCard title="Selected" value={selected.length} icon={<Award className="h-5 w-5" />} accent="amber" />
          <StatCard title="In Progress" value={inProgress.length} icon={<Activity className="h-5 w-5" />} accent="sky" />
        </div>

        <Tabs defaultValue="overview">
          <TabsList className="w-full justify-start overflow-x-auto scrollbar-thin">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="participants">Participants</TabsTrigger>
            <TabsTrigger value="rounds">Rounds</TabsTrigger>
            <TabsTrigger value="results">Final Results</TabsTrigger>
            <TabsTrigger value="selected">
              <Trophy className="mr-1.5 h-3.5 w-3.5" />
              Selected Students
              {selected.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                  {selected.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-4 animate-fade-in-up">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-base">Drive Details</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Job Role</span><span className="font-medium">{drive.jobRole}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">CTC</span><span className="font-medium">{drive.ctc}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Location</span><span className="font-medium">{drive.location}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Drive Date</span><span className="font-medium">{formatDate(drive.driveDate)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Application Deadline</span><span className="font-medium">{formatDate(drive.applicationDeadline)}</span></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Eligibility Criteria</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => {
                      setEditEligibility(!editEligibility)
                      if (!editEligibility) {
                        setEligForm({
                          minCgpa: drive.minCgpa?.toString() || '',
                          maxBacklogs: drive.maxBacklogs?.toString() || '',
                          minTenthPercentage: drive.minTenthPercentage?.toString() || '',
                          minTwelfthPercentage: drive.minTwelfthPercentage?.toString() || '',
                          eligibleYears: drive.eligibleYears || '',
                        })
                      }
                    }}>
                      {editEligibility ? 'Cancel' : 'Edit Criteria'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {editEligibility ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="mb-1.5 block text-xs text-muted-foreground">Eligible Years (comma-separated)</Label>
                        <Input value={eligForm.eligibleYears} onChange={(e) => setEligForm((f: any) => ({ ...f, eligibleYears: e.target.value }))} placeholder="III,IV" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="mb-1.5 block text-xs text-muted-foreground">Min CGPA</Label>
                          <Input type="number" step="0.01" value={eligForm.minCgpa} onChange={(e) => setEligForm((f: any) => ({ ...f, minCgpa: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="mb-1.5 block text-xs text-muted-foreground">Max Backlogs</Label>
                          <Input type="number" value={eligForm.maxBacklogs} onChange={(e) => setEligForm((f: any) => ({ ...f, maxBacklogs: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="mb-1.5 block text-xs text-muted-foreground">Min 10th Percentage</Label>
                          <Input type="number" step="0.01" value={eligForm.minTenthPercentage} onChange={(e) => setEligForm((f: any) => ({ ...f, minTenthPercentage: e.target.value }))} />
                        </div>
                        <div>
                          <Label className="mb-1.5 block text-xs text-muted-foreground">Min 12th Percentage</Label>
                          <Input type="number" step="0.01" value={eligForm.minTwelfthPercentage} onChange={(e) => setEligForm((f: any) => ({ ...f, minTwelfthPercentage: e.target.value }))} />
                        </div>
                      </div>
                      <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={async () => {
                        try {
                          await apiPut(`/api/drives/${driveId}`, {
                            eligibleYears: eligForm.eligibleYears,
                            minCgpa: eligForm.minCgpa || undefined,
                            maxBacklogs: eligForm.maxBacklogs !== '' ? eligForm.maxBacklogs : undefined,
                            minTenthPercentage: eligForm.minTenthPercentage || undefined,
                            minTwelfthPercentage: eligForm.minTwelfthPercentage || undefined,
                          })
                          toast.success('Eligibility criteria updated!')
                          setEditEligibility(false)
                          await refreshDrive()
                        } catch (e: any) { toast.error(e.message) }
                      }}>
                        <Save className="mr-2 h-3.5 w-3.5" /> Save Criteria
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">Eligible Years</p>
                        <div className="flex flex-wrap gap-1">
                          {csvToArray(drive.eligibleYears).map(y => <Badge key={y} variant="outline">{y}</Badge>)}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-xs text-muted-foreground">Min CGPA</p>
                          <p className="font-semibold">{drive.minCgpa || '—'}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-xs text-muted-foreground">Max Backlogs</p>
                          <p className="font-semibold">{drive.maxBacklogs ?? '—'}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-xs text-muted-foreground">Min 10th %</p>
                          <p className="font-semibold">{drive.minTenthPercentage || '—'}</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-2 text-center">
                          <p className="text-xs text-muted-foreground">Min 12th %</p>
                          <p className="font-semibold">{drive.minTwelfthPercentage || '—'}</p>
                        </div>
                      </div>
                    </>
                  )}
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Selection Process</p>
                    <p className="text-xs">{drive.selectionProcess}</p>
                  </div>
                </CardContent>
              </Card>

              {/* Admin Announcement — post messages visible to students */}
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    Drive Announcement
                  </CardTitle>
                  <CardDescription>Post a message or update visible to all students viewing this drive</CardDescription>
                </CardHeader>
                <CardContent>
                  <textarea
                    className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                    placeholder="Type an announcement for students (e.g., Round 1 starts at 9 AM tomorrow. Bring your laptop.)"
                    defaultValue={drive.announcement || ''}
                    onBlur={async (e) => {
                      try {
                        await apiPut(`/api/drives/${driveId}`, { announcement: e.target.value })
                        toast.success('Announcement updated')
                      } catch {
                        toast.error('Failed to update announcement')
                      }
                    }}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">Click outside the text area to save. Students will see this message in the drive details.</p>

                  {/* Link Sharing Section — share links with attending students */}
                  <div className="mt-4 border-t border-border pt-4">
                    <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <ExternalLink className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      Share Links with Attending Students
                    </p>
                    <p className="mb-3 text-xs text-muted-foreground">
                      Share external links (Google Drive, YouTube, websites, etc.) that attending students can open.
                    </p>

                    {/* Add link form */}
                    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <Input
                          placeholder="Link title (e.g. 'Study Material')"
                          value={linkTitle}
                          onChange={(e) => setLinkTitle(e.target.value)}
                          className="text-sm"
                        />
                        <Input
                          placeholder="https://... (URL is required)"
                          value={linkUrl}
                          onChange={(e) => setLinkUrl(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <Input
                        placeholder="Optional description"
                        value={linkDesc}
                        onChange={(e) => setLinkDesc(e.target.value)}
                        className="mt-2 text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        disabled={addingLink || !linkUrl.trim()}
                        onClick={handleAddLink}
                        className="mt-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                      >
                        {addingLink ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Share Link
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Shared links list */}
                    {driveLinks.length > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Shared Links ({driveLinks.length})
                        </p>
                        {driveLinks.map((l) => (
                          <div
                            key={l.id}
                            className="group flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/30"
                          >
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                              <ExternalLink className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <a
                                href={l.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="break-all text-sm font-medium text-foreground hover:text-emerald-600 hover:underline dark:hover:text-emerald-400"
                              >
                                {l.title}
                              </a>
                              {l.description && (
                                <p className="truncate text-xs text-muted-foreground">{l.description}</p>
                              )}
                              <p className="truncate text-[10px] text-muted-foreground">
                                {l.url} · {new Date(l.createdAt).toLocaleString()}
                              </p>
                            </div>
                            <a
                              href={l.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20"
                              title="Open link"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <button
                              onClick={() => handleDeleteLink(l.id)}
                              disabled={deletingLink === l.id}
                              className="flex h-7 w-7 items-center justify-center rounded-md text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-900/20"
                              title="Delete link"
                            >
                              {deletingLink === l.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Participants */}
          <TabsContent value="participants" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">All Participants ({participants.length})</CardTitle>
                <CardDescription>Update attendance status for each student</CardDescription>
              </CardHeader>
              <CardContent>
                {participants.length === 0 ? (
                  <EmptyState icon={<Users className="h-6 w-6" />} title="No participants yet" description="Students will appear here once they register for the drive." />
                ) : (
                  <div className="overflow-x-auto scrollbar-thin">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead className="hidden md:table-cell">Department</TableHead>
                          <TableHead>CGPA</TableHead>
                          <TableHead className="hidden lg:table-cell">Current Round</TableHead>
                          <TableHead>Attendance</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {participants.map(p => (
                          <TableRow key={p.id} className="group">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className={`${avatarColor(p.student?.fullName || '')} text-xs font-semibold text-white`}>
                                    {initials(p.student?.fullName || '')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{p.student?.fullName}</p>
                                  <p className="text-xs text-muted-foreground">{p.student?.registerNumber}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell"><Badge variant="outline">{p.student?.department}</Badge></TableCell>
                            <TableCell><span className="font-semibold text-emerald-600 dark:text-emerald-400">{p.student?.cgpa?.toFixed(2)}</span></TableCell>
                            <TableCell className="hidden lg:table-cell text-muted-foreground">Round {p.currentRound}/{rounds.length}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={STATUS_COLORS[p.attendance] || STATUS_COLORS.PENDING}>{p.attendance.replace(/_/g, ' ')}</Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={p.attendance}
                                onValueChange={(v) => updateParticipation(p, { attendance: v })}
                                disabled={updating === p.id}
                              >
                                <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="REGISTERED">Registered</SelectItem>
                                  <SelectItem value="ATTENDING">Attending</SelectItem>
                                  <SelectItem value="NOT_ATTENDING">Not Attending</SelectItem>
                                  <SelectItem value="ABSENT">Absent</SelectItem>
                                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                  <SelectItem value="SELECTED">Selected</SelectItem>
                                  <SelectItem value="REJECTED">Rejected</SelectItem>
                                  <SelectItem value="ON_HOLD">On Hold</SelectItem>
                                  <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                                </SelectContent>
                              </Select>
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

          {/* Rounds */}
          <TabsContent value="rounds" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Recruitment Rounds ({rounds.length})</CardTitle>
                    <CardDescription>Add, edit, or delete rounds. Changes are immediately visible to students.</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setShowAddRound(!showAddRound)} className="bg-emerald-600 hover:bg-emerald-700">
                    + Add Round
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Add Round Form */}
                {showAddRound && (
                  <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-700 dark:bg-emerald-900/10">
                    <p className="mb-3 text-sm font-semibold text-foreground">Add New Round</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label className="text-xs">Round Name *</Label>
                        <Input value={newRoundName} onChange={(e) => setNewRoundName(e.target.value)} placeholder="e.g. Technical Interview" className="mt-1" />
                      </div>
                      <div>
                        <Label className="text-xs">Description (optional)</Label>
                        <Input value={newRoundDesc} onChange={(e) => setNewRoundDesc(e.target.value)} placeholder="e.g. Core subjects technical interview" className="mt-1" />
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={handleAddRound} disabled={addingRound} className="bg-emerald-600 hover:bg-emerald-700">
                        {addingRound ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                        {addingRound ? 'Adding...' : 'Add Round'}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowAddRound(false); setNewRoundName(''); setNewRoundDesc('') }}>Cancel</Button>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {rounds.map((round, idx) => (
                    <div key={round.id} className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/30">
                      {editingRound === round.id ? (
                        /* Edit form */
                        <div className="space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label className="text-xs">Round Name</Label>
                              <Input value={roundForm.roundName} onChange={(e) => setRoundForm(f => ({ ...f, roundName: e.target.value }))} className="mt-1" />
                            </div>
                            <div>
                              <Label className="text-xs">Status</Label>
                              <Select value={roundForm.status} onValueChange={(v) => setRoundForm(f => ({ ...f, status: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="UPCOMING">Upcoming</SelectItem>
                                  <SelectItem value="ONGOING">Ongoing</SelectItem>
                                  <SelectItem value="COMPLETED">Completed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div>
                            <Label className="text-xs">Description</Label>
                            <Input value={roundForm.description} onChange={(e) => setRoundForm(f => ({ ...f, description: e.target.value }))} className="mt-1" />
                          </div>
                          <div className="grid gap-3 sm:grid-cols-3">
                            <div>
                              <Label className="text-xs">Date</Label>
                              <Input type="date" value={roundForm.date} onChange={(e) => setRoundForm(f => ({ ...f, date: e.target.value }))} className="mt-1" />
                            </div>
                            <div>
                              <Label className="text-xs">Start Time</Label>
                              <Input type="time" value={roundForm.startTime} onChange={(e) => setRoundForm(f => ({ ...f, startTime: e.target.value }))} className="mt-1" />
                            </div>
                            <div>
                              <Label className="text-xs">End Time</Label>
                              <Input type="time" value={roundForm.endTime} onChange={(e) => setRoundForm(f => ({ ...f, endTime: e.target.value }))} className="mt-1" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleSaveRound(round.id)} disabled={savingRound} className="bg-emerald-600 hover:bg-emerald-700">
                              {savingRound ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1 h-3.5 w-3.5" />}
                              Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingRound(null)}>Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        /* Display mode */
                        <div className="flex items-start gap-3">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                            round.status === 'COMPLETED' ? 'bg-emerald-600 text-white' :
                            round.status === 'ONGOING' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate font-semibold">{round.roundName}</p>
                                <p className="truncate text-xs text-muted-foreground">{round.description}</p>
                              </div>
                              <Badge variant="outline" className={STATUS_COLORS[round.status]}>{round.status}</Badge>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(round.date)}</span>
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {round.startTime || '—'} - {round.endTime || '—'}</span>
                            </div>
                            {/* Action buttons: Edit + Download cleared students + Delete */}
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => startEditRound(round)}>
                                <Save className="h-3 w-3" /> Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                                onClick={() => handleDownloadClearedStudents(round.id, round.roundName)}
                              >
                                <Download className="h-3 w-3" /> Download Cleared Students
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 gap-1 text-xs border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20"
                                onClick={() => {
                                  if (confirm(`Delete round "${round.roundName}"? This will also delete all round results for this round. This cannot be undone.`)) {
                                    handleDeleteRound(round.id, round.roundName)
                                  }
                                }}
                                disabled={deletingRoundId === round.id}
                              >
                                {deletingRoundId === round.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                Delete
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Final Results */}
          <TabsContent value="results" className="space-y-4 animate-fade-in-up">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard title="Selected" value={selected.length} icon={<CheckCircle2 className="h-5 w-5" />} accent="emerald" />
              <StatCard title="Rejected" value={rejected.length} icon={<XCircle className="h-5 w-5" />} accent="rose" />
              <StatCard title="On Hold" value={participants.filter(p => p.finalResult === 'ON_HOLD').length} icon={<Clock className="h-5 w-5" />} accent="amber" />
            </div>

            {/* When the drive is in SELECTED state (at least one student
                selected), the Final Results area is closed for new selections.
                The drive itself is NOT closed — use "Mark as Completed" to
                formally close it. */}
            {isSelected && (
              <div className="flex items-center gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-700 dark:bg-emerald-900/20">
                <Lock className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                    Final Results area is locked
                  </p>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    A student has been marked as Selected — the final result is locked and the drive is marked as <strong>SELECTED</strong>.
                    The drive remains open for other students. To unlock and edit a selected student's result, use the <strong>Unlock &amp; Remove</strong> button on the Selected Students tab.
                  </p>
                </div>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Final Results</CardTitle>
                <CardDescription>Update final selection status</CardDescription>
              </CardHeader>
              <CardContent>
                {attended.length === 0 ? (
                  <EmptyState icon={<ListChecks className="h-6 w-6" />} title="No results to update" description="Results will appear once students attend the drive." />
                ) : (
                  <div className="space-y-3">
                    {attended.map(p => {
                      const pSelected = p.finalResult === 'SELECTED'
                      return (
                      <div key={p.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className={`${avatarColor(p.student?.fullName || '')} text-xs font-semibold text-white`}>
                            {initials(p.student?.fullName || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{p.student?.fullName}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.student?.registerNumber} · Round {p.currentRound}/{rounds.length} cleared
                          </p>
                        </div>
                        <Select
                          value={p.finalResult || 'IN_PROGRESS'}
                          onValueChange={(v) => {
                            // SELECTED is gated behind a confirmation popup
                            // and locks the result once applied. The drive
                            // itself stays open — selection does not close
                            // the drive for the remaining students.
                            if (v === 'SELECTED') {
                              setSelectTarget(p)
                              return
                            }
                            updateParticipation(p, { finalResult: v })
                          }}
                          // Disable the dropdown for already-selected students
                          // (locked result) OR when the whole drive is in the
                          // SELECTED state (final results area closed).
                          disabled={updating === p.id || pSelected || isSelected}
                        >
                          <SelectTrigger className={`h-8 w-36 text-xs ${pSelected ? 'border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : isSelected ? 'opacity-60' : ''}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SELECTED">Selected</SelectItem>
                            <SelectItem value="REJECTED">Rejected</SelectItem>
                            <SelectItem value="ON_HOLD">On Hold</SelectItem>
                            <SelectItem value="WITHDRAWN">Withdrawn</SelectItem>
                          </SelectContent>
                        </Select>
                        {pSelected && (
                          <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                            <Lock className="mr-1 h-3 w-3" /> Locked
                          </Badge>
                        )}
                      </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Selected Students tab */}
          <TabsContent value="selected" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      Selected Students
                    </CardTitle>
                    <CardDescription>
                      {selected.length} student{selected.length === 1 ? '' : 's'} selected for {drive.company?.name} · {drive.jobRole}
                    </CardDescription>
                  </div>
                  <Button onClick={handleExportSelected} size="sm" variant="outline" disabled={selected.length === 0}>
                    <Download className="mr-2 h-3.5 w-3.5" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {selected.length === 0 ? (
                  <EmptyState
                    icon={<Trophy className="h-6 w-6" />}
                    title="No selected students yet"
                    description="Mark students as SELECTED in the Final Results tab — they'll appear here."
                  />
                ) : (
                  <>
                    {/* Summary stats */}
                    <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                        <p className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300"><Users className="h-3 w-3" /> Selected</p>
                        <p className="mt-1 text-xl font-bold text-amber-700 dark:text-amber-300">{selected.length}</p>
                      </div>
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-900/20">
                        <p className="flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-300"><IndianRupee className="h-3 w-3" /> CTC per student</p>
                        <p className="mt-1 text-xl font-bold text-emerald-700 dark:text-emerald-300">{drive.ctc || '—'}</p>
                      </div>
                      <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 dark:border-violet-800 dark:bg-violet-900/20">
                        <p className="flex items-center gap-1 text-xs text-violet-700 dark:text-violet-300"><Award className="h-3 w-3" /> Total CTC value</p>
                        <p className="mt-1 text-xl font-bold text-violet-700 dark:text-violet-300">
                          {totalCtcValue > 0 ? `₹${totalCtcValue.toFixed(1)} LPA` : '—'}
                        </p>
                      </div>
                    </div>

                    <div className="overflow-x-auto scrollbar-thin">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Student</TableHead>
                            <TableHead className="hidden md:table-cell">Department</TableHead>
                            <TableHead className="hidden lg:table-cell">Job Role</TableHead>
                            <TableHead>CTC</TableHead>
                            <TableHead className="hidden lg:table-cell">Joining Date</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selected.map(p => (
                            <TableRow key={p.id} className="group">
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className={`${avatarColor(p.student?.fullName || '')} text-xs font-semibold text-white`}>
                                      {initials(p.student?.fullName || '')}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="text-sm font-medium">{p.student?.fullName}</p>
                                    <p className="text-xs text-muted-foreground">{p.student?.registerNumber}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell"><Badge variant="outline">{p.student?.department}</Badge></TableCell>
                              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{p.jobRole || drive.jobRole}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                                  {p.ctc || drive.ctc}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{formatDate(p.joiningDate)}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-rose-600 opacity-0 transition-opacity hover:bg-rose-50 hover:text-rose-700 group-hover:opacity-100 dark:hover:bg-rose-900/20"
                                  onClick={() => setRemoveTarget(p)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Remove selected student confirmation */}
      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlock & Remove Selected Student</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlock and remove <strong>{removeTarget?.student?.fullName}</strong> ({removeTarget?.student?.registerNumber}) from the selected list?
              Their participation record stays intact but the locked final result will be changed to <strong>Rejected</strong>, which re-opens the result for further editing.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveSelected}
              disabled={removing}
              className="bg-rose-600 hover:bg-rose-700"
            >
              {removing ? 'Removing…' : 'Unlock & Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation popup shown BEFORE a student is marked SELECTED.
          Once confirmed, the result is locked — it can only be unlocked via
          the dedicated "Unlock & Remove" button on the Selected Students tab.
          The drive itself stays ONGOING; we never auto-close a drive just
          because one student was selected. */}
      <AlertDialog open={!!selectTarget} onOpenChange={(open) => !open && setSelectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Confirm Final Selection
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  You are about to mark <strong>{selectTarget?.student?.fullName}</strong>{' '}
                  ({selectTarget?.student?.registerNumber}) as <strong className="text-emerald-600 dark:text-emerald-400">SELECTED</strong>.
                </p>
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs">
                  <p className="mb-2 font-medium text-foreground">Offer details that will be recorded:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li><span className="font-medium text-foreground">Job Role:</span> {drive?.jobRole || '—'}</li>
                    <li><span className="font-medium text-foreground">CTC:</span> {drive?.ctc || '—'}</li>
                    <li><span className="font-medium text-foreground">Joining Location:</span> {drive?.location || '—'}</li>
                    <li><span className="font-medium text-foreground">Joining Date:</span> 2026-07-01</li>
                  </ul>
                </div>
                <p className="text-xs text-muted-foreground">
                  Once confirmed, this final result will be <strong>locked</strong> and the drive will be marked as <strong>SELECTED</strong> (the final results area closes for new selections).
                  The drive itself stays open — other students can continue through their rounds. To undo this later, use the
                  dedicated <em>Unlock &amp; Remove</em> button on the Selected Students tab, or use <em>Mark as Completed</em> to formally close the drive.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={selecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSelect}
              disabled={selecting}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {selecting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Locking…</> : <><Lock className="mr-2 h-4 w-4" /> Confirm &amp; Lock Selection</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Celebration popup shown AFTER a student is successfully marked SELECTED. */}
      <AlertDialog open={!!celebration} onOpenChange={(open) => !open && setCelebration(null)}>
        <AlertDialogContent className="border-emerald-200 dark:border-emerald-800">
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-soft-lg">
              <PartyPopper className="h-8 w-8" />
            </div>
            <div>
              <AlertDialogTitle className="text-center text-xl">Congratulations!</AlertDialogTitle>
              <AlertDialogDescription className="mt-2 text-center">
                <strong className="text-foreground">{celebration?.student?.fullName}</strong>{' '}
                ({celebration?.student?.registerNumber}) has been marked as <strong className="text-emerald-600 dark:text-emerald-400">SELECTED</strong>{' '}
                for <strong className="text-foreground">{drive?.company?.name}</strong>.
              </AlertDialogDescription>
            </div>
            <div className="grid w-full grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Job Role</p>
                <p className="font-medium">{drive?.jobRole || '—'}</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">CTC</p>
                <p className="font-medium text-emerald-600 dark:text-emerald-400">{drive?.ctc || '—'}</p>
              </div>
            </div>
            <div className="flex w-full items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 dark:border-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>Final result is locked and the drive is marked as <strong>SELECTED</strong>. The drive stays open for the remaining students — use <strong>Mark as Completed</strong> to formally close it.</span>
            </div>
            <AlertDialogAction className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => setCelebration(null)}>
              Continue
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  )
}
