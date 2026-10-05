import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: Generate report based on type
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'overall'
    const department = searchParams.get('department')
    const year = searchParams.get('year')
    const section = searchParams.get('section')

    const where: any = {}
    if (department && department !== 'ALL') where.department = department
    if (year && year !== 'ALL') where.year = year
    if (section && section !== 'ALL') where.section = section

    let data: any = {}

    if (type === 'overall') {
      const [students, companies, drives] = await Promise.all([
        db.student.findMany({ where, select: { id: true, fullName: true, registerNumber: true, department: true, year: true, section: true, cgpa: true, placementStatus: true, backlogs: true } }),
        db.company.count(),
        db.drive.count(),
      ])
      data = {
        title: 'Overall Placement Report',
        summary: {
          totalStudents: students.length,
          placed: students.filter(s => s.placementStatus === 'PLACED').length,
          unplaced: students.filter(s => s.placementStatus === 'UNPLACED').length,
          inProcess: students.filter(s => s.placementStatus === 'IN_PROCESS').length,
          companies, drives,
        },
        students,
      }
    } else if (type === 'selected') {
      const participations = await db.driveParticipation.findMany({
        where: { finalResult: 'SELECTED' },
        include: { student: true, drive: { include: { company: true } } },
      })
      data = {
        title: 'Selected Students Report',
        count: participations.length,
        records: participations.map(p => ({
          studentName: p.student.fullName,
          registerNumber: p.student.registerNumber,
          department: p.student.department,
          company: p.drive.company.name,
          jobRole: p.jobRole,
          ctc: p.ctc,
          joiningDate: p.joiningDate,
          joiningLocation: p.joiningLocation,
        })),
      }
    } else if (type === 'unplaced') {
      const students = await db.student.findMany({
        where: { ...where, placementStatus: 'UNPLACED' },
        select: { id: true, fullName: true, registerNumber: true, department: true, year: true, section: true, cgpa: true, skills: true, strongSkills: true },
      })
      data = {
        title: 'Unplaced Students Report',
        count: students.length,
        students,
      }
    } else if (type === 'department') {
      const students = await db.student.findMany({
        where,
        select: { department: true, placementStatus: true, cgpa: true },
      })
      const deptMap = new Map<string, any>()
      for (const s of students) {
        const d = s.department || 'Unknown'
        if (!deptMap.has(d)) deptMap.set(d, { department: d, total: 0, placed: 0, unplaced: 0, inProcess: 0 })
        const dept = deptMap.get(d)
        dept.total++
        if (s.placementStatus === 'PLACED') dept.placed++
        else if (s.placementStatus === 'UNPLACED') dept.unplaced++
        else dept.inProcess++
      }
      data = {
        title: 'Department-wise Placement Report',
        departments: Array.from(deptMap.values()),
      }
    }

    return NextResponse.json({ report: data })
  } catch (error) {
    console.error('Generate report error:', error)
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 })
  }
}
