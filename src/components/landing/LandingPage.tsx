'use client'
import { useAppStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  GraduationCap, Users, Building2, TrendingUp, BarChart3, Trophy,
  Shield, Sparkles, ArrowRight, CheckCircle2, Bell, FileText, Target,
  Clock, Star, BookOpen, Award, Zap, ChevronRight, Layers, MapPin,
} from 'lucide-react'
import {
  COLLEGE_NAME, COLLEGE_LOCATION, COLLEGE_TAGLINE, COLLEGE_IMAGES,
} from '@/lib/college'

const FEATURES = [
  { icon: Users, title: 'Complete Student Profiles', desc: 'Capture academic details, skills, certifications, projects, and resumes in one centralized system.', accent: 'from-emerald-500 to-teal-500' },
  { icon: Building2, title: 'Company & Drive Management', desc: 'Create companies, configure placement drives with custom eligibility criteria.', accent: 'from-violet-500 to-purple-500' },
  { icon: Target, title: 'Round-by-Round Tracking', desc: 'Track every student through each recruitment round with visual timelines.', accent: 'from-amber-500 to-orange-500' },
  { icon: TrendingUp, title: 'Powerful Analytics', desc: 'Department-wise, year-wise, class-wise and company-wise analytics dashboards.', accent: 'from-sky-500 to-blue-500' },
  { icon: Sparkles, title: 'Smart Recommendations', desc: 'AI-powered matching of students to upcoming company drives based on skills and criteria.', accent: 'from-rose-500 to-pink-500' },
  { icon: Shield, title: 'Role-Based Security', desc: 'Separate student and admin access with proper authorization.', accent: 'from-slate-500 to-slate-600' },
]

const STATS = [
  { value: '13', label: 'Departments', icon: GraduationCap },
  { value: '5', label: 'Recruitment Rounds', icon: Target },
  { value: '100+', label: 'Skills Trackable', icon: Building2 },
  { value: '24/7', label: 'Real-time Updates', icon: TrendingUp },
]

const WORKFLOW_STEPS = [
  { step: '01', title: 'Students Register', desc: 'Students create profiles with academic, skill, and project details.', icon: Users },
  { step: '02', title: 'Admin Creates Drive', desc: 'Configure company drive with eligibility criteria and rounds.', icon: Building2 },
  { step: '03', title: 'Smart Eligibility Check', desc: 'System automatically identifies eligible students.', icon: Sparkles },
  { step: '04', title: 'Students Confirm', desc: 'Students mark attendance for upcoming drives.', icon: CheckCircle2 },
  { step: '05', title: 'Round Updates', desc: 'Admin updates results for each recruitment round.', icon: Target },
  { step: '06', title: 'Final Selection', desc: 'Mark selected, rejected, or on hold. Dashboard updates in real-time.', icon: Trophy },
]

const CAMPUS_IMAGES = [
  { src: COLLEGE_IMAGES.mainBuilding, label: 'Main Building', caption: 'Administrative block & central wing' },
  { src: COLLEGE_IMAGES.entranceArch, label: 'Entrance Arch', caption: 'Grand welcome to V.S.B. campus' },
  { src: COLLEGE_IMAGES.entranceGate, label: 'Main Gate', caption: 'The gateway to engineering excellence' },
  { src: COLLEGE_IMAGES.campusBuilding, label: 'Campus Block', caption: 'Academic block surrounded by greenery' },
  { src: COLLEGE_IMAGES.campusAerial, label: 'Campus View', caption: 'Lush green campus environment' },
  { src: COLLEGE_IMAGES.students, label: 'Student Life', caption: 'Vibrant campus community events' },
]

export function LandingPage() {
  const setView = useAppStore((s) => s.setView)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-soft animate-glow">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-tight">V.S.B. Engineering</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Karur · Placement System</p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {['Features', 'Workflow', 'Analytics', 'Roles', 'Campus'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setView('student-login')} className="hidden sm:inline-flex">
              Student Login
            </Button>
            <Button size="sm" onClick={() => setView('admin-login')} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
              Admin Portal
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 animated-gradient opacity-50" />

        {/* Floating orbs */}
        <div className="animate-float absolute -left-32 top-20 h-64 w-64 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="animate-float-slow absolute -right-32 top-40 h-72 w-72 rounded-full bg-teal-400/25 blur-3xl" />
        <div className="animate-float absolute right-20 bottom-0 h-48 w-48 rounded-full bg-amber-400/15 blur-3xl" />

        {/* Slow rotating ring */}
        <div className="animate-spin-slow pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full border-2 border-dashed border-emerald-300/40 dark:border-emerald-700/40" />
        <div className="animate-spin-slow pointer-events-none absolute -left-16 bottom-10 h-48 w-48 rounded-full border border-dashed border-teal-300/30 dark:border-teal-700/30" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="animate-bounce-in mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50/80 px-4 py-1.5 text-xs font-medium text-emerald-700 backdrop-blur dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              {COLLEGE_TAGLINE}
            </div>
            <h1 className="text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              <span className="animate-gradient-text">{COLLEGE_NAME}</span>
            </h1>
            <p className="animate-fade-in-up mt-3 text-base font-medium text-emerald-700 dark:text-emerald-400">
              {COLLEGE_LOCATION}
            </p>
            <p className="animate-fade-in-up mt-6 text-pretty text-lg leading-relaxed text-muted-foreground" style={{ animationDelay: '120ms' }}>
              The complete placement management platform for V.S.B. Engineering College, Karur. Manage students, companies, placement drives, recruitment rounds, and analytics — all in one centralized, secure, and powerful system.
            </p>
            <div className="animate-fade-in-up mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row" style={{ animationDelay: '220ms' }}>
              <Button
                size="lg"
                onClick={() => setView('student-register')}
                className="group w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-soft hover:shadow-soft-lg hover:from-emerald-700 hover:to-teal-700 sm:w-auto"
              >
                Get Started as Student
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => setView('admin-login')}
                className="group w-full border-border bg-background/80 backdrop-blur hover:bg-accent sm:w-auto"
              >
                <Shield className="mr-2 h-4 w-4" />
                Admin / Staff Portal
              </Button>
            </div>
          </div>

          {/* Stats Row */}
          <div className="mt-20 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {STATS.map((stat, idx) => (
              <Card
                key={stat.label}
                className="animate-scale-in card-hover border-border bg-card/80 backdrop-blur"
                style={{ animationDelay: `${idx * 90}ms` }}
              >
                <CardContent className="p-5">
                  <stat.icon className="mb-3 h-6 w-6 text-emerald-600" />
                  <p className="text-3xl font-bold tracking-tight text-foreground">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Marquee shimmer accent at bottom of hero */}
        <div className="animate-marquee pointer-events-none absolute bottom-0 left-0 h-1 w-full" />
      </section>

      {/* Campus Showcase */}
      <section id="campus" className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Campus Showcase</p>
            <h2 className="animate-gradient-text mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              V.S.B. Engineering College, Karur
            </h2>
            <p className="mt-4 text-muted-foreground">
              A glimpse of our beautiful campus — home to future engineers and aspiring professionals.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPUS_IMAGES.map((img, idx) => (
              <div
                key={img.label}
                className="animate-fade-in-up group relative overflow-hidden rounded-xl border border-border shadow-soft-lg"
                style={{ animationDelay: `${idx * 120}ms` }}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={img.src}
                    alt={img.label}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-80" />
                <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                  <p className="text-sm font-semibold">{img.label}</p>
                  <p className="text-xs text-white/80">{img.caption}</p>
                </div>
                <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-[10px] font-medium text-white backdrop-blur">
                  <MapPin className="h-3 w-3" /> Karur
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Features</p>
            <h2 className="animate-gradient-text mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Everything your placement cell needs</h2>
            <p className="mt-4 text-muted-foreground">A complete toolkit to manage the entire placement lifecycle — from student registration to final selection.</p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, idx) => (
              <Card
                key={feature.title}
                className="tilt-card animate-fade-in-up group relative overflow-hidden border-border bg-card"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <CardContent className="p-6">
                  <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${feature.accent} text-white shadow-soft transition-transform duration-300 group-hover:scale-110`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.desc}</p>
                </CardContent>
                <div className={`absolute -bottom-12 -right-12 h-32 w-32 rounded-full bg-gradient-to-br ${feature.accent} opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-20`} />
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Workflow</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">A seamless placement process</h2>
            <p className="mt-4 text-muted-foreground">From student registration to final selection — every step is simplified for staff productivity.</p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WORKFLOW_STEPS.map((step, idx) => (
              <div
                key={step.step}
                className="animate-fade-in-up group relative rounded-xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-soft-lg dark:hover:border-emerald-800"
                style={{ animationDelay: `${idx * 70}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 transition-all group-hover:bg-emerald-600 group-hover:text-white dark:bg-emerald-900/30 dark:text-emerald-400">
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-[10px] font-bold text-white shadow">
                      {step.step}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <ChevronRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground/40 lg:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Analytics Preview Section */}
      <section id="analytics" className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Analytics</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Insights that drive decisions</h2>
            <p className="mt-4 text-muted-foreground">Powerful dashboards help staff make informed placement decisions faster.</p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {[
              { icon: BarChart3, title: 'Department-wise Analytics', desc: 'Track placement rates per department. Identify top-performing branches.', items: ['Total, eligible & placed counts', 'Average CGPA per department', 'Placement percentage trends'] },
              { icon: Layers, title: 'Round-wise Funnel', desc: 'Visual recruitment funnel from registration to final selection.', items: ['Eligible → Registered → Attended', 'Round-by-round conversion', 'Selection vs rejection rates'] },
              { icon: BookOpen, title: 'Skill Analytics', desc: 'Understand which skills drive selections across companies.', items: ['Top skills across students', 'Skill → companies → selections', 'Strong skill distribution'] },
            ].map((card, idx) => (
              <Card
                key={card.title}
                className="animate-scale-in card-hover border-border bg-card"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <card.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold text-foreground">{card.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{card.desc}</p>
                  <ul className="mt-4 space-y-2">
                    {card.items.map((item) => (
                      <li key={item} className="flex items-start gap-2 text-sm text-foreground/80">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Roles Section */}
      <section id="roles" className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wider text-emerald-600">Roles</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Two roles, one powerful system</h2>
            <p className="mt-4 text-muted-foreground">Designed for both students and placement staff with role-based access control.</p>
          </div>

          <div className="mt-14 grid gap-6 lg:grid-cols-2">
            {/* Student Card */}
            <Card className="animate-slide-in-left group relative overflow-hidden border-border bg-card card-hover">
              <CardContent className="p-8">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-soft">
                  <GraduationCap className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Student Portal</h3>
                <p className="mt-2 text-muted-foreground">Register once, maintain your profile, and participate in placement drives.</p>
                <ul className="mt-6 space-y-3">
                  {[
                    { icon: Users, text: 'Complete profile with skills, certifications, projects' },
                    { icon: Bell, text: 'Get notified about new drives and round results' },
                    { icon: Building2, text: 'Browse upcoming eligible companies' },
                    { icon: Target, text: 'Confirm attendance for upcoming drives' },
                    { icon: FileText, text: 'View complete placement history' },
                  ].map((item) => (
                    <li key={item.text} className="flex items-start gap-3 text-sm">
                      <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-foreground/90">{item.text}</span>
                    </li>
                  ))}
                </ul>
                <Button onClick={() => setView('student-register')} className="mt-8 w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                  Register as Student
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Admin Card */}
            <Card className="animate-slide-in-right group relative overflow-hidden border-border bg-card card-hover">
              <CardContent className="p-8">
                <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-soft">
                  <Shield className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">Admin / Staff Portal</h3>
                <p className="mt-2 text-muted-foreground">Complete control center for managing placements, drives, and analytics.</p>
                <ul className="mt-6 space-y-3">
                  {[
                    { icon: BarChart3, text: 'Real-time dashboard with key placement metrics' },
                    { icon: Building2, text: 'Create and manage companies & placement drives' },
                    { icon: Target, text: 'Track rounds and update results in bulk' },
                    { icon: Sparkles, text: 'Get smart student recommendations for drives' },
                    { icon: Award, text: 'Generate comprehensive placement reports' },
                  ].map((item) => (
                    <li key={item.text} className="flex items-start gap-3 text-sm">
                      <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" />
                      <span className="text-foreground/90">{item.text}</span>
                    </li>
                  ))}
                </ul>
                <Button onClick={() => setView('admin-login')} variant="outline" className="mt-8 w-full border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50">
                  Access Admin Portal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section with campus banner background */}
      <section className="relative overflow-hidden border-t border-border text-white">
        <img
          src={COLLEGE_IMAGES.campusBanner}
          alt="V.S.B. Engineering College, Karur campus"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-800/95 via-teal-800/90 to-emerald-900/95" />
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
          <Zap className="mx-auto mb-4 h-10 w-10 animate-bounce-in" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to streamline your placements?</h2>
          <p className="mt-3 text-emerald-50/90">Join the V.S.B. Engineering College, Karur Placement Portal today and transform how your college manages placements.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="secondary" onClick={() => setView('student-register')} className="w-full bg-white text-emerald-700 hover:bg-emerald-50 sm:w-auto">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => setView('admin-login')} className="w-full border-white/30 bg-transparent text-white hover:bg-white/10 sm:w-auto">
              Login to Continue
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">V.S.B. Engineering College, Karur — Placement Management System</p>
                <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} V.S.B. Engineering College, {COLLEGE_LOCATION}. All rights reserved.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Real-time</span>
              <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Secure</span>
              <span className="flex items-center gap-1"><Star className="h-3 w-3" /> Production-ready</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
