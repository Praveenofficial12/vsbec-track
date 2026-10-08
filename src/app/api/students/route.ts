import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: List students with filters
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
    // NEW: filter students who failed (NOT_CLEARED / ABSENT) a specific round
    // identified by its name (e.g. "Aptitude", "Coding", "GD", "Technical HR",
    // "General HR"). Performs a substring match so "Aptitude" also matches
    // legacy round names like "Aptitude Test".
    const roundNotCleared = searchParams.get('roundNotCleared')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

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
    if (skill) {
      where.skills = { contains: skill }
    }
    if (strongSkill) {
      where.strongSkills = { contains: strongSkill }
    }
    if (roundNotCleared) {
      // Only return students who have at least one round result with status
      // NOT_CLEARED or ABSENT in a round whose name contains the supplied
      // value (case-insensitive on the round name where supported).
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

    const [students, total] = await Promise.all([
      db.student.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          registerNumber: true,
          fullName: true,
          collegeEmail: true,
          mobile: true,
          gender: true,
          department: true,
          degree: true,
          year: true,
          section: true,
          semester: true,
          batch: true,
          cgpa: true,
          tenthPercentage: true,
          twelfthPercentage: true,
          backlogs: true,
          historyOfArrears: true,
          graduationYear: true,
          placementStatus: true,
          placementEligible: true,
          preferredRole: true,
          preferredDomain: true,
          interestedTechs: true,
          preferredLocation: true,
          skills: true,
          strongSkills: true,
          resumeUrl: true,
          profilePhoto: true,
          // Public profile links (new)
          linkedinUrl: true,
          leetcodeUrl: true,
          githubUrl: true,
          createdAt: true,
        },
      }),
      db.student.count({ where }),
    ])

    return NextResponse.json({ students, total })
  } catch (error) {
    console.error('Get students error:', error)
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 })
  }
}
