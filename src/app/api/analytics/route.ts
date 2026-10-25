import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: Comprehensive analytics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const department = searchParams.get('department')
    const year = searchParams.get('year')
    const section = searchParams.get('section')

    const where: any = {}
    if (department && department !== 'ALL') where.department = department
    if (year && year !== 'ALL') where.year = year
    if (section && section !== 'ALL') where.section = section

    const [students, totalCompanies, activeDrives, participations, selections] = await Promise.all([
      db.student.findMany({
        where,
        select: {
          id: true, department: true, year: true, section: true, cgpa: true,
          backlogs: true, placementStatus: true, placementEligible: true,
          skills: true, strongSkills: true,
        },
      }),
      db.company.count(),
      db.drive.count({ where: { status: { in: ['REGISTRATION_OPEN', 'ONGOING'] } } }),
      db.driveParticipation.findMany({
        include: { student: true, drive: { include: { company: true } } },
      }),
      db.driveParticipation.findMany({ where: { finalResult: 'SELECTED' } }),
    ])

    const totalStudents = students.length
    const eligibleStudents = students.filter(s => s.placementEligible).length
    const placedStudents = students.filter(s => s.placementStatus === 'PLACED').length
    const unplacedStudents = students.filter(s => s.placementStatus === 'UNPLACED').length
    const inProcessStudents = students.filter(s => s.placementStatus === 'IN_PROCESS').length
    const totalSelections = selections.length

    // Department-wise analytics
    const deptMap = new Map<string, any>()
    for (const s of students) {
      const dept = s.department || 'Unknown'
      if (!deptMap.has(dept)) {
        deptMap.set(dept, { department: dept, total: 0, eligible: 0, placed: 0, unplaced: 0, inProcess: 0, totalCgpa: 0, cgpaCount: 0 })
      }
      const d = deptMap.get(dept)
      d.total++
      if (s.placementEligible) d.eligible++
      if (s.placementStatus === 'PLACED') d.placed++
      else if (s.placementStatus === 'UNPLACED') d.unplaced++
      else d.inProcess++
      if (s.cgpa) { d.totalCgpa += s.cgpa; d.cgpaCount++ }
    }
    const departmentWise = Array.from(deptMap.values()).map(d => ({
      ...d,
      averageCgpa: d.cgpaCount > 0 ? parseFloat((d.totalCgpa / d.cgpaCount).toFixed(2)) : 0,
      placementPercentage: d.total > 0 ? parseFloat(((d.placed / d.total) * 100).toFixed(1)) : 0,
    }))

    // Year-wise analytics
    const yearMap = new Map<string, any>()
    for (const s of students) {
      const y = s.year || 'Unknown'
      if (!yearMap.has(y)) yearMap.set(y, { year: y, total: 0, eligible: 0, placed: 0, inProcess: 0 })
      const yr = yearMap.get(y)
      yr.total++
      if (s.placementEligible) yr.eligible++
      if (s.placementStatus === 'PLACED') yr.placed++
      else if (s.placementStatus === 'IN_PROCESS') yr.inProcess++
    }
    const yearWise = Array.from(yearMap.values())

    // Class-wise analytics
    const classMap = new Map<string, any>()
    for (const s of students) {
      const c = s.section || 'Unknown'
      if (!classMap.has(c)) classMap.set(c, { section: c, total: 0, placed: 0, attended: 0 })
      const cls = classMap.get(c)
      cls.total++
      if (s.placementStatus === 'PLACED') cls.placed++
    }
    const classWise = Array.from(classMap.values()).map(c => ({
      ...c,
      placementPercentage: c.total > 0 ? parseFloat(((c.placed / c.total) * 100).toFixed(1)) : 0,
    }))

    // Company-wise analytics
    const companyMap = new Map<string, any>()
    for (const p of participations) {
      const companyName = p.drive?.company?.name || 'Unknown'
      if (!companyMap.has(companyName)) {
        companyMap.set(companyName, {
          company: companyName,
          eligible: 0, registered: 0, attended: 0, selected: 0, rejected: 0,
        })
      }
      const c = companyMap.get(companyName)
      c.registered++
      if (['ATTENDING', 'IN_PROGRESS', 'SELECTED', 'REJECTED', 'ON_HOLD'].includes(p.attendance)) c.attended++
      if (p.finalResult === 'SELECTED') c.selected++
      else if (p.finalResult === 'REJECTED') c.rejected++
    }
    const companyWise = Array.from(companyMap.values())

    // Skill analytics
    const skillMap = new Map<string, number>()
    for (const s of students) {
      const skills = (s.skills || '').split(',').map(x => x.trim()).filter(Boolean)
      for (const skill of skills) {
        skillMap.set(skill, (skillMap.get(skill) || 0) + 1)
      }
    }
    const skillAnalytics = Array.from(skillMap.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)

    // Strong skill analytics
    const strongSkillMap = new Map<string, number>()
    for (const s of students) {
      const skills = (s.strongSkills || '').split(',').map(x => x.trim()).filter(Boolean)
      for (const skill of skills) {
        strongSkillMap.set(skill, (strongSkillMap.get(skill) || 0) + 1)
      }
    }
    const strongSkillAnalytics = Array.from(strongSkillMap.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Round funnel for first completed drive
    const drives = await db.drive.findMany({
      where: { status: 'COMPLETED' },
      include: { rounds: { orderBy: { roundNumber: 'asc' } }, participants: { include: { roundResults: true } } },
      take: 1,
    })
    let funnel: { stage: string; count: number }[] = []
    if (drives.length > 0) {
      const drive = drives[0]
      funnel = drive.rounds.map(round => {
        const count = drive.participants.filter(p =>
          p.roundResults.some(rr => rr.roundId === round.id && rr.status === 'CLEARED')
        ).length
        return { stage: round.roundName, count }
      })
      funnel.unshift({ stage: 'Registered', count: drive.participants.length })
    }

    // Placement percentage
    const placementPercentage = totalStudents > 0
      ? parseFloat(((placedStudents / totalStudents) * 100).toFixed(1))
      : 0

    // Average CTC of selected
    const selectedWithCtc = await db.driveParticipation.findMany({
      where: { finalResult: 'SELECTED', ctc: { not: null } },
      select: { ctc: true },
    })
    const ctcs = selectedWithCtc.map(s => parseFloat((s.ctc || '0').replace(/[^\d.]/g, ''))).filter(n => !isNaN(n) && n > 0)
    const averageCtc = ctcs.length > 0 ? parseFloat((ctcs.reduce((a, b) => a + b, 0) / ctcs.length).toFixed(2)) : 0
    const highestCtc = ctcs.length > 0 ? Math.max(...ctcs) : 0

    return NextResponse.json({
      overview: {
        totalStudents,
        eligibleStudents,
        totalCompanies,
        activeDrives,
        placedStudents,
        unplacedStudents,
        inProcessStudents,
        totalSelections,
        placementPercentage,
        averageCtc,
        highestCtc,
      },
      departmentWise,
      yearWise,
      classWise,
      companyWise,
      skillAnalytics,
      strongSkillAnalytics,
      funnel,
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
