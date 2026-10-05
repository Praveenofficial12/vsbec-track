'use client'
import { useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, GraduationCap, Loader2, User, BookOpen, Target, Award, CheckCircle2, X } from 'lucide-react'
import { apiPost } from '@/lib/api'

const ALL_SKILLS = ['Java', 'Python', 'C', 'C++', 'JavaScript', 'React', 'HTML', 'CSS', 'SQL', 'MongoDB', 'MySQL', 'Machine Learning', 'Artificial Intelligence', 'Data Science', 'Cloud', 'UI/UX', 'Testing', 'Cyber Security']
const DEPARTMENTS = ['AI & DS', 'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year']
const SECTIONS = ['A', 'B', 'C', 'D']
const GENDERS = ['Male', 'Female', 'Other']

const STEPS = [
  { id: 1, name: 'Personal', icon: User },
  { id: 2, name: 'Academic', icon: BookOpen },
  { id: 3, name: 'Placement', icon: Target },
  { id: 4, name: 'Skills', icon: Award },
]

export function StudentRegister() {
  const setView = useAppStore((s) => s.setView)
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    fullName: '', registerNumber: '', collegeEmail: '', personalEmail: '', mobile: '', dateOfBirth: '', gender: '',
    department: '', degree: 'B.E.', year: '', section: '', semester: '', batch: '2022-2026', cgpa: '',
    tenthPercentage: '', twelfthPercentage: '', backlogs: '0', historyOfArrears: '0', graduationYear: '2026',
    preferredRole: '', preferredDomain: '', interestedTechs: '', preferredLocation: '',
    skills: [] as string[], strongSkills: [] as string[], password: 'student@123',
  })

  const updateForm = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }))
  const toggleSkill = (skill: string, key: 'skills' | 'strongSkills') => {
    setForm((f) => {
      const arr = f[key]
      const updated = arr.includes(skill) ? arr.filter((s) => s !== skill) : [...arr, skill]
      // Strong skills must be subset of skills
      if (key === 'skills') {
        const newStrong = updated.length === 0 ? [] : f.strongSkills.filter((s) => updated.includes(s))
        return { ...f, [key]: updated, strongSkills: newStrong }
      }
      return { ...f, [key]: updated }
    })
  }

  const completion = Math.min(
    ((form.fullName ? 1 : 0) + (form.registerNumber ? 1 : 0) + (form.collegeEmail ? 1 : 0) + (form.department ? 1 : 0) +
     (form.year ? 1 : 0) + (form.section ? 1 : 0) + (form.cgpa ? 1 : 0) + (form.skills.length > 0 ? 1 : 0)) / 8 * 100,
    100
  )

  const validateStep = () => {
    if (step === 1) {
      if (!form.fullName || !form.registerNumber || !form.collegeEmail) {
        toast.error('Please fill in full name, register number and college email')
        return false
      }
    }
    if (step === 2) {
      if (!form.department || !form.year || !form.section || !form.cgpa) {
        toast.error('Please fill in all academic fields')
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (validateStep()) setStep((s) => Math.min(s + 1, 4))
  }

  const handleSubmit = async () => {
    if (form.skills.length === 0) {
      toast.error('Please select at least one skill')
      return
    }
    setLoading(true)
    try {
      const payload = {
        ...form,
        skills: form.skills.join(', '),
        strongSkills: form.strongSkills.join(', '),
        cgpa: parseFloat(form.cgpa),
        tenthPercentage: form.tenthPercentage ? parseFloat(form.tenthPercentage) : null,
        twelfthPercentage: form.twelfthPercentage ? parseFloat(form.twelfthPercentage) : null,
        backlogs: parseInt(form.backlogs) || 0,
        historyOfArrears: parseInt(form.historyOfArrears) || 0,
      }
      const res = await apiPost('/api/auth/student-register', payload)
      if (res.success) {
        toast.success('Registration successful! Please login to continue.')
        setView('student-login')
      }
    } catch (err: any) {
      toast.error(err.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <button
          onClick={() => setView('landing')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </button>

        <Card className="overflow-hidden border-border shadow-soft-lg">
          {/* Header */}
          <div className="relative bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white">
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Student Registration</h1>
                <p className="text-sm text-white/80">Create your placement profile in minutes</p>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="border-b border-border bg-muted/40 px-6 py-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Profile Completion</span>
              <span className="text-xs font-semibold text-foreground">{Math.round(completion)}%</span>
            </div>
            <Progress value={completion} className="h-1.5" />
          </div>

          {/* Steps indicator */}
          <div className="flex items-center justify-between px-6 py-4">
            {STEPS.map((s) => {
              const isActive = step === s.id
              const isDone = step > s.id
              return (
                <div key={s.id} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all ${
                        isActive
                          ? 'border-emerald-600 bg-emerald-600 text-white scale-110'
                          : isDone
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'border-border bg-background text-muted-foreground'
                      }`}
                    >
                      {isDone ? <CheckCircle2 className="h-5 w-5" /> : <s.icon className="h-4 w-4" />}
                    </div>
                    <span className={`text-xs font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{s.name}</span>
                  </div>
                  {s.id < STEPS.length && <div className={`mx-2 h-0.5 flex-1 rounded ${step > s.id ? 'bg-emerald-600' : 'bg-border'}`} />}
                </div>
              )
            })}
          </div>

          <CardContent className="p-6 pt-2">
            {/* Step 1: Personal */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Full Name *</Label>
                    <Input value={form.fullName} onChange={(e) => updateForm('fullName', e.target.value)} placeholder="e.g. Praveen Kumar" />
                  </div>
                  <div className="space-y-2">
                    <Label>Register Number *</Label>
                    <Input value={form.registerNumber} onChange={(e) => updateForm('registerNumber', e.target.value.toUpperCase())} placeholder="e.g. VSB2400" />
                  </div>
                  <div className="space-y-2">
                    <Label>College Email *</Label>
                    <Input type="email" value={form.collegeEmail} onChange={(e) => updateForm('collegeEmail', e.target.value)} placeholder="e.g. vsb2400@vsbec.edu.in" />
                  </div>
                  <div className="space-y-2">
                    <Label>Personal Email</Label>
                    <Input type="email" value={form.personalEmail} onChange={(e) => updateForm('personalEmail', e.target.value)} placeholder="e.g. you@gmail.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Mobile Number</Label>
                    <Input value={form.mobile} onChange={(e) => updateForm('mobile', e.target.value)} placeholder="e.g. +91 9876543210" />
                  </div>
                  <div className="space-y-2">
                    <Label>Date of Birth</Label>
                    <Input type="date" value={form.dateOfBirth} onChange={(e) => updateForm('dateOfBirth', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender</Label>
                    <Select value={form.gender} onValueChange={(v) => updateForm('gender', v)}>
                      <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                      <SelectContent>
                        {GENDERS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Academic */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Department *</Label>
                    <Select value={form.department} onValueChange={(v) => updateForm('department', v)}>
                      <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Degree</Label>
                    <Input value={form.degree} onChange={(e) => updateForm('degree', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Year *</Label>
                    <Select value={form.year} onValueChange={(v) => updateForm('year', v)}>
                      <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                      <SelectContent>
                        {YEARS.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Class / Section *</Label>
                    <Select value={form.section} onValueChange={(v) => updateForm('section', v)}>
                      <SelectTrigger><SelectValue placeholder="Select section" /></SelectTrigger>
                      <SelectContent>
                        {SECTIONS.map((s) => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Semester</Label>
                    <Input type="number" min="1" max="8" value={form.semester} onChange={(e) => updateForm('semester', e.target.value)} placeholder="e.g. 6" />
                  </div>
                  <div className="space-y-2">
                    <Label>Batch</Label>
                    <Input value={form.batch} onChange={(e) => updateForm('batch', e.target.value)} placeholder="e.g. 2022-2026" />
                  </div>
                  <div className="space-y-2">
                    <Label>CGPA *</Label>
                    <Input type="number" step="0.01" min="0" max="10" value={form.cgpa} onChange={(e) => updateForm('cgpa', e.target.value)} placeholder="e.g. 8.5" />
                  </div>
                  <div className="space-y-2">
                    <Label>10th Percentage</Label>
                    <Input type="number" step="0.01" min="0" max="100" value={form.tenthPercentage} onChange={(e) => updateForm('tenthPercentage', e.target.value)} placeholder="e.g. 92.5" />
                  </div>
                  <div className="space-y-2">
                    <Label>12th / Diploma %</Label>
                    <Input type="number" step="0.01" min="0" max="100" value={form.twelfthPercentage} onChange={(e) => updateForm('twelfthPercentage', e.target.value)} placeholder="e.g. 89.5" />
                  </div>
                  <div className="space-y-2">
                    <Label>Backlogs</Label>
                    <Input type="number" min="0" value={form.backlogs} onChange={(e) => updateForm('backlogs', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>History of Arrears</Label>
                    <Input type="number" min="0" value={form.historyOfArrears} onChange={(e) => updateForm('historyOfArrears', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Graduation Year</Label>
                    <Input value={form.graduationYear} onChange={(e) => updateForm('graduationYear', e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Placement Preferences */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in-up">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Preferred Job Role</Label>
                    <Input value={form.preferredRole} onChange={(e) => updateForm('preferredRole', e.target.value)} placeholder="e.g. Software Engineer" />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Domain</Label>
                    <Input value={form.preferredDomain} onChange={(e) => updateForm('preferredDomain', e.target.value)} placeholder="e.g. Software Development" />
                  </div>
                  <div className="space-y-2">
                    <Label>Preferred Work Location</Label>
                    <Input value={form.preferredLocation} onChange={(e) => updateForm('preferredLocation', e.target.value)} placeholder="e.g. Chennai" />
                  </div>
                  <div className="space-y-2">
                    <Label>Interested Technologies</Label>
                    <Input value={form.interestedTechs} onChange={(e) => updateForm('interestedTechs', e.target.value)} placeholder="e.g. React, Node.js" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Skills */}
            {step === 4 && (
              <div className="space-y-6 animate-fade-in-up">
                <div>
                  <Label className="mb-3 block">Select Your Skills *</Label>
                  <div className="flex flex-wrap gap-2">
                    {ALL_SKILLS.map((skill) => {
                      const selected = form.skills.includes(skill)
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill, 'skills')}
                          className={`group relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
                            selected
                              ? 'border-emerald-600 bg-emerald-600 text-white shadow-soft'
                              : 'border-border bg-background text-foreground hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                          }`}
                        >
                          {skill}
                          {selected && <CheckCircle2 className="h-3 w-3" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {form.skills.length > 0 && (
                  <div>
                    <Label className="mb-3 block">Select Your Strong Skills <span className="text-xs text-muted-foreground">(max 3)</span></Label>
                    <div className="flex flex-wrap gap-2">
                      {form.skills.map((skill) => {
                        const selected = form.strongSkills.includes(skill)
                        const disabled = !selected && form.strongSkills.length >= 3
                        return (
                          <button
                            key={skill}
                            type="button"
                            disabled={disabled}
                            onClick={() => toggleSkill(skill, 'strongSkills')}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
                              selected
                                ? 'border-amber-500 bg-amber-500 text-white shadow-soft'
                                : disabled
                                ? 'cursor-not-allowed border-border bg-muted/40 text-muted-foreground/50'
                                : 'border-border bg-background text-foreground hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                            }`}
                          >
                            {selected && <X className="h-3 w-3" />}
                            {skill}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" onClick={() => step === 1 ? setView('student-login') : setStep((s) => s - 1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {step === 1 ? 'Login instead' : 'Previous'}
              </Button>
              {step < 4 ? (
                <Button onClick={handleNext} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    'Complete Registration'
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
