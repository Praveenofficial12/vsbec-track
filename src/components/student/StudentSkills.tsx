'use client'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { apiGet, apiPut, csvToArray } from '@/lib/api'
import { StudentLayout } from './StudentLayout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Award, CheckCircle2, X, Star, TrendingUp, Sparkles, Code2 } from 'lucide-react'
import type { Student } from '@/lib/types'

const ALL_SKILLS = ['Java', 'Python', 'C', 'C++', 'JavaScript', 'React', 'HTML', 'CSS', 'SQL', 'MongoDB', 'MySQL', 'Machine Learning', 'Artificial Intelligence', 'Data Science', 'Cloud', 'UI/UX', 'Testing', 'Cyber Security']

export function StudentSkills() {
  const user = useAppStore((s) => s.user)
  const [student, setStudent] = useState<Student | null>(null)
  const [loading, setLoading] = useState(true)
  const [skills, setSkills] = useState<string[]>([])
  const [strongSkills, setStrongSkills] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    apiGet<{ student: Student }>(`/api/students/${user.id}`).then((r) => {
      setStudent(r.student)
      setSkills(csvToArray(r.student.skills))
      setStrongSkills(csvToArray(r.student.strongSkills))
    }).finally(() => setLoading(false))
  }, [user?.id])

  const toggleSkill = (skill: string) => {
    setSkills((prev) => {
      const arr = prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
      // Update strong skills if removed from skills
      setStrongSkills((ss) => arr.length === 0 ? [] : ss.filter((s) => arr.includes(s)))
      return arr
    })
  }

  const toggleStrongSkill = (skill: string) => {
    setStrongSkills((prev) => {
      if (prev.includes(skill)) return prev.filter((s) => s !== skill)
      if (prev.length >= 3) {
        toast.error('You can have maximum 3 strong skills')
        return prev
      }
      return [...prev, skill]
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiPut(`/api/students/${user?.id}`, {
        skills: skills.join(', '),
        strongSkills: strongSkills.join(', '),
      })
      toast.success('Skills updated successfully!')
    } catch (e: any) {
      toast.error(e.message || 'Failed to update skills')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <StudentLayout><div className="p-6"><div className="h-64 rounded-xl shimmer" /></div></StudentLayout>

  return (
    <StudentLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Skills</h1>
            <p className="text-sm text-muted-foreground">Select your skills and strong skills</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="card-hover">
            <CardContent className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <Code2 className="h-5 w-5 text-emerald-600" />
                <span className="text-sm text-muted-foreground">Total Skills</span>
              </div>
              <p className="text-3xl font-bold">{skills.length}</p>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                <span className="text-sm text-muted-foreground">Strong Skills</span>
              </div>
              <p className="text-3xl font-bold">{strongSkills.length}</p>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardContent className="p-5">
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-violet-600" />
                <span className="text-sm text-muted-foreground">Profile Strength</span>
              </div>
              <p className="text-3xl font-bold">
                {Math.min((skills.length / 10) * 100, 100).toFixed(0)}%
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              Select Your Skills
            </CardTitle>
            <CardDescription>Click to select or deselect skills</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {ALL_SKILLS.map((skill) => {
                const selected = skills.includes(skill)
                return (
                  <button
                    key={skill}
                    onClick={() => toggleSkill(skill)}
                    className={`group relative inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-all duration-200 hover:scale-105 ${
                      selected
                        ? 'border-emerald-600 bg-emerald-600 text-white shadow-soft'
                        : 'border-border bg-background text-foreground hover:border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                    }`}
                  >
                    {skill}
                    {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {skills.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-500" />
                Mark Your Strong Skills
              </CardTitle>
              <CardDescription>Select up to 3 skills that you're most confident about</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => {
                  const selected = strongSkills.includes(skill)
                  return (
                    <button
                      key={skill}
                      onClick={() => toggleStrongSkill(skill)}
                      className={`group relative inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-sm transition-all duration-200 hover:scale-105 ${
                        selected
                          ? 'border-amber-500 bg-amber-500 text-white shadow-soft'
                          : 'border-border bg-background text-foreground hover:border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                      }`}
                    >
                      <Sparkles className={`h-3.5 w-3.5 ${selected ? '' : 'opacity-0 group-hover:opacity-50'}`} />
                      {skill}
                      {selected && <X className="h-3.5 w-3.5" />}
                    </button>
                  )
                })}
              </div>
              {strongSkills.length > 0 && (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-900/20">
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    <Award className="mr-1 inline h-3 w-3" />
                    Your strong skills are highlighted in companies' recommendation engine.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </StudentLayout>
  )
}
