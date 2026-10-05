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
import { toast } from 'sonner'
import {
  Settings as SettingsIcon, Building2, GraduationCap, Award, Target, Shield, Bell,
  Plus, Pencil, Trash2, Save, Users, BookOpen, AlertCircle, Power
} from 'lucide-react'

type Rule = { id: string; name: string; maxCompanies: number; blockOnSelection: boolean; minCgpaDefault: number; maxBacklogsDefault: number }
type CustomField = { id: string; fieldName: string; fieldType: string; options: string | null; isActive: boolean }

const FIELD_TYPES = ['TEXT', 'NUMBER', 'DROPDOWN', 'MULTISELECT', 'BOOLEAN', 'DATE', 'FILE', 'TEXTAREA']

export function AdminSettings() {
  const [rules, setRules] = useState<Rule[]>([])
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [showFieldForm, setShowFieldForm] = useState(false)
  const [newField, setNewField] = useState({ fieldName: '', fieldType: 'TEXT', options: '' })

  useEffect(() => {
    apiGet<{ rules: Rule[]; customFields: CustomField[] }>('/api/settings').then(r => {
      setRules(r.rules)
      setCustomFields(r.customFields)
    }).finally(() => setLoading(false))
  }, [])

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

  if (loading) return <AdminLayout><div className="p-6"><div className="h-64 rounded-xl shimmer" /></div></AdminLayout>

  const rule = rules[0]

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><SettingsIcon className="h-6 w-6" /> Settings</h1>
          <p className="text-sm text-muted-foreground">Manage placement rules, custom fields, and system configuration</p>
        </div>

        <Tabs defaultValue="rules">
          <TabsList>
            <TabsTrigger value="rules">Placement Rules</TabsTrigger>
            <TabsTrigger value="fields">Custom Fields</TabsTrigger>
            <TabsTrigger value="college">College Info</TabsTrigger>
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

          {/* College Info */}
          <TabsContent value="college" className="space-y-4 animate-fade-in-up">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> College Information</CardTitle>
                <CardDescription>Basic college configuration</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label className="text-xs text-muted-foreground">College Name</Label>
                  <Input defaultValue="VS Barkatullah Engineering College" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">College Code</Label>
                  <Input defaultValue="VSBEC" disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Academic Year</Label>
                  <Input defaultValue="2025-2026" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Placement Cell Email</Label>
                  <Input defaultValue="placements@vsbec.edu.in" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Contact Number</Label>
                  <Input defaultValue="+91 44 1234 5678" />
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
                    <Label className="mb-2 block text-xs text-muted-foreground">Departments</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {['AI & DS', 'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL'].map(d => (
                        <Badge key={d} variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">{d}</Badge>
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
      </div>
    </AdminLayout>
  )
}
