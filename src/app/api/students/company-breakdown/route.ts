import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: Per-company placement breakdown for the students that match the
// supplied filters. Used by the admin "Student Registry" page when the
// "Apti Not Cleared" / "Coding Not Cleared" / "GD Not Cleared" /
// "Technical HR Not Cleared" / "General HR Not Cleared" filter is active.
//
// Returns an array of cards (one per company) with:
//   - companyId, companyName, logoUrl
//   - attended     — total participations by the filtered students with this company
//   - cleared      — total rounds cleared by those students with this company
//   - selectedCount, rejectedCount, onHoldCount, inProgressCount
//   - notClearedCount — count of round results with status NOT_CLEARED or ABSENT
//                      for THIS specific company (the most actionable number
//                      when an admin is looking at a "X Not Cleared" filter)
//
// All filter query params are identical to /api/students so the same set of
// students is aggregated.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const department = searchParams.get('department')
    const year = searchParams.get('year')
    const section = searchParams.get('section')
    const search = searchParams.get('search')
    const placementStatus = searchParams.get('placementStatus')
    const skill = searchParams.get('skill')
    const strongSkill = searchParams.get('strongSkill')
    const minCgpa = searchParams.get('minCgpa')
    const maxBacklogs = searchParams.get('maxBacklogs')
    const roundNotCleared = searchParams.get('roundNotCleared')

    const where: any = {}
    if (department && department !== 'ALL') where.department = department
    if (year && year !== 'ALL') where.year = year
    if (section && section !== 'ALL') where.section = section
    if (placementStatus && placementStatus !== 'ALL') where.placementStatus = placementStatus
    if (minCgpa) where.cgpa = { gte: parseFloat(minCgpa) }
    if (maxBacklogs !== null && maxBacklogs !== undefined && maxBacklogs !== '') {
      where.backlogs = { lte: parseInt(maxBacklogs) }
    }
    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { registerNumber: { contains: search.toUpperCase() } },
        { collegeEmail: { contains: search.toLowerCase() } },
      ]
    }
    if (skill) where.skills = { contains: skill }
    if (strongSkill) where.strongSkills = { contains: strongSkill }
    if (roundNotCleared) {
      where.participations = {
        some: {
          roundResults: {
            some: {
              status: { in: ['NOT_CLEARED', 'ABSENT'] },
              round: { roundName: { contains: roundNotCleared } },
            },
          },
        },
      }
    }

    // Pull every participation for every matching student in one query,
    // including its rounds and the company info. We then aggregate in JS
    // to avoid a SQL GROUP BY that Prisma/SQLite can't easily express.
    const students = await db.student.findMany({
      where,
      select: {
        id: true,
        participations: {
          select: {
            id: true,
            attendance: true,
            finalResult: true,
            roundResults: {
              select: {
                id: true,
                status: true,
                round: { select: { roundName: true } },
              },
            },
            drive: {
              select: {
                id: true,
                driveName: true,
                company: { select: { id: true, name: true, logoUrl: true } },
              },
            },
          },
        },
      },
    })

    type CompanyAgg = {
      companyId: string
      companyName: string
      logoUrl: string | null
      driveName: string
      attended: number
      cleared: number
      selectedCount: number
      rejectedCount: number
      onHoldCount: number
      inProgressCount: number
      notClearedCount: number
      studentCount: number
    }

    // Aggregate by (companyId, driveName) — the same company may run multiple
    // drives, and an admin tracking "Apti Not Cleared" wants to see which
    // specific drive of a company caused the bottleneck. Group by drive.
    const byKey = new Map<string, CompanyAgg>()
    const studentCompanyPairs = new Set<string>()

    for (const s of students) {
      for (const p of s.participations || []) {
        const comp = p.drive?.company
        if (!comp) continue
        const driveName = p.drive?.driveName || comp.name || 'Unknown Drive'
        const key = `${comp.id}__${driveName}`
        if (!byKey.has(key)) {
          byKey.set(key, {
            companyId: comp.id,
            companyName: comp.name || 'Unknown Company',
            logoUrl: comp.logoUrl || null,
            driveName,
            attended: 0,
            cleared: 0,
            selectedCount: 0,
            rejectedCount: 0,
            onHoldCount: 0,
            inProgressCount: 0,
            notClearedCount: 0,
            studentCount: 0,
          })
        }
        const agg = byKey.get(key)!

        // De-dupe student+company pairs so studentCount reflects unique
        // students rather than participations (a student might be in
        // multiple drives of the same company, but they're still one student).
        const pairKey = `${s.id}__${key}`
        if (!studentCompanyPairs.has(pairKey)) {
          studentCompanyPairs.add(pairKey)
          agg.studentCount += 1
        }

        // Attended = student actually showed up for at least one round with this company
        const didAttend =
          ['ATTENDING', 'IN_PROGRESS', 'SELECTED', 'REJECTED', 'ON_HOLD'].includes(p.attendance) ||
          (p.roundResults && p.roundResults.length > 0)
        if (didAttend) agg.attended += 1

        // Cleared rounds count
        agg.cleared += (p.roundResults?.filter((r) => r.status === 'CLEARED').length) || 0

        // Final result distribution
        if (p.finalResult === 'SELECTED') agg.selectedCount += 1
        else if (p.finalResult === 'REJECTED') agg.rejectedCount += 1
        else if (p.finalResult === 'ON_HOLD') agg.onHoldCount += 1
        else if (['ATTENDING', 'IN_PROGRESS'].includes(p.attendance) && !p.finalResult) {
          agg.inProgressCount += 1
        }

        // Not-cleared rounds — count any round result with NOT_CLEARED or ABSENT
        // for THIS company's drive. This is the key number for the filter.
        agg.notClearedCount += (p.roundResults?.filter((r) =>
          r.status === 'NOT_CLEARED' || r.status === 'ABSENT'
        ).length) || 0
      }
    }

    const breakdown = Array.from(byKey.values()).sort(
      (a, b) => b.notClearedCount - a.notClearedCount || b.attended - a.attended,
    )

    return NextResponse.json({
      breakdown,
      totalCompanies: new Set(breakdown.map((b) => b.companyId)).size,
      totalDrives: breakdown.length,
      totalStudents: students.length,
      roundFilter: roundNotCleared || null,
    })
  } catch (error) {
    console.error('Company breakdown error:', error)
    return NextResponse.json({ error: 'Failed to compute company breakdown' }, { status: 500 })
  }
}
