import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: Recommend students for a drive
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const driveId = searchParams.get('driveId')

    if (!driveId) {
      return NextResponse.json({ error: 'driveId required' }, { status: 400 })
    }

    const drive = await db.drive.findUnique({
      where: { id: driveId },
      include: { company: true },
    })

    if (!drive) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 })
    }

    const eligibleDepts = (drive.eligibleDepartments || '').split(',').map(s => s.trim()).filter(Boolean)
    const requiredSkills = (drive.requiredSkills || '').split(',').map(s => s.trim()).filter(Boolean)

    const candidates = await db.student.findMany({
      where: {
        placementEligible: true,
        OR: [
          { placementStatus: 'UNPLACED' },
          { placementStatus: 'IN_PROCESS' },
        ],
      },
      include: {
        participations: { include: { drive: { include: { company: true } } } },
      },
    })

    const recommendations = candidates
      .filter(s => {
        // Department match
        if (eligibleDepts.length > 0 && !eligibleDepts.includes(s.department || '')) return false
        // CGPA
        if (drive.minCgpa && (s.cgpa || 0) < drive.minCgpa) return false
        // Backlogs
        if (drive.maxBacklogs !== null && drive.maxBacklogs !== undefined && (s.backlogs || 0) > drive.maxBacklogs) return false
        return true
      })
      .map(s => {
        const studentSkills = (s.skills || '').split(',').map(x => x.trim()).filter(Boolean)
        const studentStrongSkills = (s.strongSkills || '').split(',').map(x => x.trim()).filter(Boolean)
        const allStudentSkills = [...studentSkills, ...studentStrongSkills]

        // Match score calculation
        let matchedSkills = 0
        const reasonMatched: string[] = []
        const reasonMissing: string[] = []

        for (const reqSkill of requiredSkills) {
          if (allStudentSkills.includes(reqSkill)) {
            matchedSkills++
            reasonMatched.push(reqSkill)
          } else {
            reasonMissing.push(reqSkill)
          }
        }

        const skillScore = requiredSkills.length > 0 ? (matchedSkills / requiredSkills.length) * 60 : 50
        const cgpaScore = Math.min(((s.cgpa || 6) / 10) * 25, 25)
        const strongSkillBonus = studentStrongSkills.filter(ss => requiredSkills.includes(ss)).length * 7.5
        const companiesAttended = s.participations.length

        const totalScore = Math.min(skillScore + cgpaScore + strongSkillBonus + 5, 100)

        const reasons: string[] = []
        reasons.push(`✓ Department: ${s.department}`)
        reasons.push(`✓ CGPA: ${s.cgpa} ${drive.minCgpa ? `>= ${drive.minCgpa}` : ''}`)
        if (s.backlogs === 0) reasons.push('✓ No active backlogs')
        for (const r of reasonMatched) {
          if (studentStrongSkills.includes(r)) reasons.push(`✓ ${r} (strong skill)`)
          else reasons.push(`✓ ${r}`)
        }
        if (reasonMissing.length > 0) {
          reasons.push(`⚠ Missing: ${reasonMissing.join(', ')}`)
        }
        reasons.push(`✓ ${companiesAttended} previous participation(s)`)
        if (s.placementStatus === 'UNPLACED') reasons.push('✓ Unplaced')
        else reasons.push('✓ In Process')

        return {
          student: {
            id: s.id,
            registerNumber: s.registerNumber,
            fullName: s.fullName,
            department: s.department,
            year: s.year,
            section: s.section,
            cgpa: s.cgpa,
            backlogs: s.backlogs,
            skills: s.skills,
            strongSkills: s.strongSkills,
            placementStatus: s.placementStatus,
            companiesAttended,
          },
          matchScore: Math.round(totalScore),
          reasons,
          matchedSkills,
          totalRequired: requiredSkills.length,
        }
      })
      .sort((a, b) => b.matchScore - a.matchScore)

    return NextResponse.json({ recommendations: recommendations.slice(0, 20), totalCandidates: recommendations.length })
  } catch (error) {
    console.error('Recommendations error:', error)
    return NextResponse.json({ error: 'Failed to get recommendations' }, { status: 500 })
  }
}
