import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: Returns the list of companies that have at least one student matching
// the supplied round filter (and any other filters).
//
// Query params (identical to /api/students):
//   - roundNotCleared  (e.g. "Aptitude", "Coding", "GD", "Technical HR", "General HR")
//   - department, year, section, placementStatus, skill, strongSkill,
//     minCgpa, maxBacklogs, search
//   - companyId        (optional) — when supplied, the response also includes
//                      the names of the matching students for that company.
//
// Response shape:
//   {
//     companies: [{ companyId, companyName, logoUrl, driveName, matchCount }],
//     students:  [{ id, registerNumber, fullName, collegeEmail, mobile,
//                   department, year, section, cgpa, placementStatus,
//                   driveName, roundName, roundStatus }]
//                   // students[] is empty unless companyId is supplied
//     totalCompanies: number,
//     totalStudents: number,
//     roundFilter: string | null
//   }
//
// This endpoint powers the admin Student Registry "X Not Cleared" filter:
//   1) Admin clicks "Apti Not Cleared" -> frontend calls this endpoint with
//      no companyId -> receives a list of companies that have students who
//      failed aptitude. The dropdown is populated with this list.
//   2) Admin picks a company from the dropdown -> frontend calls this
//      endpoint again with companyId=<id> -> receives the list of student
//      names who failed aptitude at that specific company.
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
    const companyIdFilter = searchParams.get('companyId')

    // Build the student-level where clause (the same filters the Student
    // Registry page uses).
    const studentWhere: any = {}
    if (department && department !== 'ALL') studentWhere.department = department
    if (year && year !== 'ALL') studentWhere.year = year
    if (section && section !== 'ALL') studentWhere.section = section
    if (placementStatus && placementStatus !== 'ALL') studentWhere.placementStatus = placementStatus
    if (minCgpa) studentWhere.cgpa = { gte: parseFloat(minCgpa) }
    if (maxBacklogs !== null && maxBacklogs !== undefined && maxBacklogs !== '') {
      studentWhere.backlogs = { lte: parseInt(maxBacklogs) }
    }
    if (search) {
      studentWhere.OR = [
        { fullName: { contains: search } },
        { registerNumber: { contains: search.toUpperCase() } },
        { collegeEmail: { contains: search.toLowerCase() } },
      ]
    }
    if (skill) studentWhere.skills = { contains: skill }
    if (strongSkill) studentWhere.strongSkills = { contains: strongSkill }

    // The round-not-cleared constraint requires the student to have at
    // least one RoundResult with status NOT_CLEARED or ABSENT in a round
    // whose name contains the supplied value.
    if (roundNotCleared) {
      studentWhere.participations = {
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

    // Always pull every matching student with their participations and
    // round results so we can compute both the company dropdown AND the
    // per-company student list from a single query.
    const students = await db.student.findMany({
      where: studentWhere,
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
        cgpa: true,
        backlogs: true,
        placementStatus: true,
        placementEligible: true,
        preferredRole: true,
        preferredDomain: true,
        skills: true,
        strongSkills: true,
        createdAt: true,
        participations: {
          select: {
            id: true,
            attendance: true,
            finalResult: true,
            roundResults: {
              select: {
                id: true,
                status: true,
                round: { select: { roundName: true, roundNumber: true } },
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

    // Build the list of companies that have at least one matching student
    // participation (with a not-cleared round result for the supplied
    // round filter). Also collect the per-company student names if
    // companyIdFilter is supplied.
    type CompanyRow = {
      companyId: string
      companyName: string
      logoUrl: string | null
      driveName: string
      matchCount: number
    }
    type StudentRow = {
      id: string
      registerNumber: string
      fullName: string
      collegeEmail: string
      mobile: string | null
      department: string | null
      year: string | null
      section: string | null
      cgpa: number | null
      backlogs: number | null
      placementStatus: string
      driveName: string
      roundName: string
      roundStatus: string
      finalResult: string | null
    }

    const companiesMap = new Map<string, CompanyRow>()
    const studentsOut: StudentRow[] = []
    const seenStudentCompany = new Set<string>() // dedupe student+company

    for (const s of students) {
      for (const p of s.participations || []) {
        const comp = p.drive?.company
        if (!comp) continue

        // Find the round results that match the filter (or any
        // NOT_CLEARED/ABSENT result if no round filter is supplied).
        const matchingRoundResults = (p.roundResults || []).filter((r) => {
          if (!roundNotCleared) {
            return r.status === 'NOT_CLEARED' || r.status === 'ABSENT'
          }
          return (
            (r.status === 'NOT_CLEARED' || r.status === 'ABSENT') &&
            r.round?.roundName?.includes(roundNotCleared)
          )
        })

        if (matchingRoundResults.length === 0) continue

        const driveName = p.drive?.driveName || comp.name || 'Unknown Drive'
        const key = `${comp.id}__${driveName}`

        // Add to the company dropdown list (deduped by company+drive).
        if (!companiesMap.has(key)) {
          companiesMap.set(key, {
            companyId: comp.id,
            companyName: comp.name || 'Unknown Company',
            logoUrl: comp.logoUrl || null,
            driveName,
            matchCount: 0,
          })
        }
        const companyRow = companiesMap.get(key)!
        const studentCompanyKey = `${s.id}__${key}`
        if (!seenStudentCompany.has(studentCompanyKey)) {
          seenStudentCompany.add(studentCompanyKey)
          companyRow.matchCount += 1
        }

        // If a specific company is selected, also collect the student
        // names for that company. Use the FIRST matching round result
        // for the roundName/roundStatus fields (an admin investigating
        // "Apti Not Cleared" usually only cares about that one round).
        if (companyIdFilter && comp.id === companyIdFilter) {
          const firstMatch = matchingRoundResults[0]
          studentsOut.push({
            id: s.id,
            registerNumber: s.registerNumber,
            fullName: s.fullName,
            collegeEmail: s.collegeEmail,
            mobile: s.mobile,
            department: s.department,
            year: s.year,
            section: s.section,
            cgpa: s.cgpa,
            backlogs: s.backlogs,
            placementStatus: s.placementStatus,
            driveName,
            roundName: firstMatch?.round?.roundName || roundNotCleared || 'Unknown Round',
            roundStatus: firstMatch?.status || 'NOT_CLEARED',
            finalResult: p.finalResult,
          })
        }
      }
    }

    // Sort companies by matchCount desc (worst-performing first), then name.
    const companies = Array.from(companiesMap.values()).sort(
      (a, b) => b.matchCount - a.matchCount || a.companyName.localeCompare(b.companyName),
    )

    // Sort students by registerNumber.
    studentsOut.sort((a, b) => a.registerNumber.localeCompare(b.registerNumber))

    return NextResponse.json({
      companies,
      students: studentsOut,
      totalCompanies: companies.length,
      totalStudents: students.length,
      roundFilter: roundNotCleared || null,
      selectedCompanyId: companyIdFilter || null,
    })
  } catch (error) {
    console.error('Company breakdown error:', error)
    return NextResponse.json({ error: 'Failed to compute company breakdown' }, { status: 500 })
  }
}
