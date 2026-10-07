'use client'
import { useMemo, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import {
  ArrowLeft, ArrowRight, GraduationCap, Loader2, User, BookOpen, Target, Award,
  CheckCircle2, X, Search, ShieldCheck, ShieldAlert, Key, MapPin, Linkedin, Github, BookMarked,
} from 'lucide-react'
import { apiPost } from '@/lib/api'
import { DEPARTMENTS, validateDepartmentPassword } from '@/lib/department-auth'
import { COLLEGE_NAME, COLLEGE_LOCATION, COLLEGE_IMAGES } from '@/lib/college'

// 105+ skills covering languages, frameworks, databases, cloud, soft skills etc.
const ALL_SKILLS = [
  // Languages
  'Java', 'Python', 'C', 'C++', 'C#', 'JavaScript', 'TypeScript', 'Go', 'Rust', 'Kotlin',
  'Swift', 'Ruby', 'PHP', 'Scala', 'Perl', 'R', 'MATLAB', 'Dart', 'Lua', 'Haskell',
  // Web front-end
  'HTML', 'CSS', 'React', 'Angular', 'Vue', 'Next.js', 'Svelte', 'Tailwind CSS', 'Bootstrap',
  'jQuery', 'Redux', 'Sass', 'Material UI', 'Chakra UI', 'Storybook',
  // Back-end frameworks
  'Node.js', 'Express.js', 'Spring Boot', 'Django', 'Flask', 'FastAPI', 'Ruby on Rails',
  'ASP.NET', 'Laravel', 'NestJS', 'GraphQL', 'REST APIs', 'gRPC', 'WebSockets',
  // Mobile
  'Android', 'iOS', 'React Native', 'Flutter', 'Xamarin',
  // Databases
  'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'SQLite', 'Oracle', 'Microsoft SQL Server',
  'Cassandra', 'DynamoDB', 'Elasticsearch', 'Firebase Firestore', 'Supabase',
  // Cloud / DevOps
  'Cloud', 'AWS', 'Azure', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform', 'CI/CD',
  'Jenkins', 'GitHub Actions', 'GitLab CI', 'Linux', 'Bash Scripting', 'Ansible',
  // Data / ML / AI
  'Machine Learning', 'Deep Learning', 'Artificial Intelligence', 'Data Science', 'NLP',
  'Computer Vision', 'TensorFlow', 'PyTorch', 'Keras', 'scikit-learn', 'Pandas', 'NumPy',
  'Matplotlib', 'Seaborn', 'Tableau', 'Power BI', 'Big Data', 'Hadoop', 'Spark', 'Kafka',
  // Testing / QA
  'Testing', 'Selenium', 'Cypress', 'JUnit', 'TestNG', 'Jest', 'Mocha', 'Playwright', 'Postman',
  // Security
  'Cyber Security', 'Penetration Testing', 'OWASP', 'Cryptography', 'Network Security',
  // Soft / Design / Other
  'UI/UX', 'Figma', 'Adobe XD', 'Design Thinking', 'Agile', 'Scrum', 'Project Management',
  'Communication', 'Leadership', 'Problem Solving', 'Data Structures', 'Algorithms',
  'Operating Systems', 'Computer Networks', 'DBMS', 'OOP', 'System Design',
  'Microservices', 'Event-Driven Architecture', 'Git', 'GitHub', 'GitLab', 'Bitbucket',
]

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
  const [skillSearch, setSkillSearch] = useState('')
  const [form, setForm] = useState({
    fullName: '', registerNumber: '', collegeEmail: '', personalEmail: '', mobile: '', dateOfBirth: '', gender: '',
    department: '', departmentPassword: '',
    degree: 'B.E.', year: '', section: '', semester: '', batch: '2022-2026', cgpa: '',
    tenthPercentage: '', twelfthPercentage: '', backlogs: '0', historyOfArrears: '0', graduationYear: '2026',
    preferredRole: '', preferredDomain: '', interestedTechs: '', preferredLocation: '',
    linkedinUrl: '', leetcodeUrl: '', githubUrl: '',
    skills: [] as string[], strongSkills: [] as string[],
  })

  const updateForm = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }))
  const toggleSkill = (skill: string, key: 'skills' | 'strongSkills') => {
    setForm((f) => {
      const arr = f[key]
      const updated = arr.includes(skill) ? arr.filter((s) => s !== skill) : [...arr, skill]
      if (key === 'skills') {
        const newStrong = updated.length === 0 ? [] : f.strongSkills.filter((s) => updated.includes(s))
        return { ...f, [key]: updated, strongSkills: newStrong }
      }
      return { ...f, [key]: updated }
    })
  }

  // Real-time department password validation
  const deptPasswordValid = useMemo(() => {
    if (!form.department || !form.departmentPassword) return null
    return validateDepartmentPassword(form.department, form.departmentPassword)
  }, [form.department, form.departmentPassword])

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
      if (!form.department) {
        toast.error('Please select your department')
        return false
      }
      if (!form.departmentPassword) {
        toast.error('Please enter your department security password')
        return false
      }
      if (!validateDepartmentPassword(form.department, form.departmentPassword)) {
        toast.error('Invalid department password — please check with your placement coordinator')
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

  const filteredSkills = useMemo(() => {
    const q = skillSearch.trim().toLowerCase()
    if (!q) return ALL_SKILLS
    return ALL_SKILLS.filter((s) => s.toLowerCase().includes(q))
  }, [skillSearch])

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-muted/30">
      {/* Animated background: college entrance gate image at low opacity */}
      <div className="pointer-events-none absolute inset-0">
        <img
          src={COLLEGE_IMAGES.entranceGate}
          alt="V.S.B. Engineering College entrance gate"
          className="h-full w-full object-cover opacity-10"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-teal-50/30 to-emerald-100/40 dark:from-emerald-950/30 dark:via-teal-950/20 dark:to-emerald-950/40" />
      </div>

      {/* Floating orbs */}
      <div className="animate-float pointer-events-none absolute -left-24 top-20 h-64 w-64 rounded-full bg-emerald-400/25 blur-3xl" />
      <div className="animate-float-slow pointer-events-none absolute -right-24 top-40 h-72 w-72 rounded-full bg-teal-400/20 blur-3xl" />

      <div className="relative mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <button
          onClick={() => setView('landing')}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </button>

        <Card className="animate-scale-in overflow-hidden border-border shadow-soft-lg">
          {/* Header with animated gradient text + marquee shimmer */}
          <div className="relative bg-gradient-to-br from-emerald-600 to-teal-700 p-6 text-white">
            <div className="animate-marquee pointer-events-none absolute inset-0 opacity-40" />
            <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="animate-gradient-text text-xl font-bold">Student Registration</h1>
                <p className="text-sm text-white/80">Create your placement profile in minutes</p>
                <p className="mt-1 flex items-center gap-1 text-xs text-white/70">
                  <MapPin className="h-3 w-3" /> {COLLEGE_NAME} · {COLLEGE_LOCATION}
                </p>
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
            {/* Step 1: Personal + Department Security Authentication */}
            {step === 1 && (
              <div className="space-y-5 animate-fade-in-up">
                {/* Department Security Authentication */}
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-900/20">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                      <Key className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Department Security Authentication</p>
                      <p className="text-xs text-emerald-700/80 dark:text-emerald-400/80">Select your department and enter your official department password.</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Department *</Label>
                      <Select value={form.department} onValueChange={(v) => updateForm('department', v)}>
                        <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                        <SelectContent>
                          {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Department Password *</Label>
                      <Input
                        type="password"
                        value={form.departmentPassword}
                        onChange={(e) => updateForm('departmentPassword', e.target.value)}
                        placeholder="e.g. cse#109"
                        className="bg-background"
                      />
                      {form.department && form.departmentPassword && (
                        deptPasswordValid ? (
                          <p className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck className="h-3 w-3" /> Valid {form.department} department password
                          </p>
                        ) : (
                          <p className="flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400">
                            <ShieldAlert className="h-3 w-3" /> Invalid — please check with your placement coordinator
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </div>

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

                {/* Optional social profile links */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs text-muted-foreground"><Linkedin className="h-3 w-3" /> LinkedIn URL</Label>
                    <Input value={form.linkedinUrl} onChange={(e) => updateForm('linkedinUrl', e.target.value)} placeholder="https://linkedin.com/in/..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs text-muted-foreground"><BookMarked className="h-3 w-3" /> LeetCode URL</Label>
                    <Input value={form.leetcodeUrl} onChange={(e) => updateForm('leetcodeUrl', e.target.value)} placeholder="https://leetcode.com/..." />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs text-muted-foreground"><Github className="h-3 w-3" /> GitHub URL</Label>
                    <Input value={form.githubUrl} onChange={(e) => updateForm('githubUrl', e.target.value)} placeholder="https://github.com/..." />
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
                    <Input value={form.department} disabled className="bg-muted/50" />
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

            {/* Step 4: Skills — searchable multi-select with 105+ skills */}
            {step === 4 && (
              <div className="space-y-6 animate-fade-in-up">
                <div>
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <Label>Select Your Skills * <span className="text-xs text-muted-foreground">({ALL_SKILLS.length} available)</span></Label>
                    <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
                      {form.skills.length} selected
                    </Badge>
                  </div>
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search skills (e.g. React, AWS, Python...)"
                      value={skillSearch}
                      onChange={(e) => setSkillSearch(e.target.value)}
                      className="pl-9"
                    />
                    {skillSearch && (
                      <button
                        type="button"
                        onClick={() => setSkillSearch('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto scrollbar-thin rounded-lg border border-border bg-muted/20 p-3">
                    {filteredSkills.length === 0 ? (
                      <p className="py-6 text-center text-sm text-muted-foreground">No skills match your search.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {filteredSkills.map((skill) => {
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
                    )}
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
