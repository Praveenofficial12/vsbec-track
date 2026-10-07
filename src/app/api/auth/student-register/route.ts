import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { validateDepartmentPassword } from '@/lib/department-auth'
import { logUserActivity, getClientIp, getUserAgent } from '@/lib/activity'

// POST: Student registration
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Validate department password: the student MUST provide their department's
    // official password. The same password becomes their login password.
    const department = String(body.department || '').toUpperCase().trim()
    const departmentPassword = String(body.departmentPassword || body.password || '')

    if (!department) {
      return NextResponse.json({ error: 'Department is required' }, { status: 400 })
    }

    if (!validateDepartmentPassword(department, departmentPassword)) {
      // Log failed registration attempt before returning.
      await logUserActivity({
        userId: body.registerNumber?.toUpperCase() || null,
        userType: 'STUDENT',
        action: 'LOGIN_FAILED',
        detail: `Registration rejected: invalid department password for ${department}`,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      })
      return NextResponse.json(
        { error: 'Invalid department password. Please contact your placement coordinator.' },
        { status: 401 }
      )
    }

    const existing = await db.student.findFirst({
      where: {
        OR: [
          { registerNumber: body.registerNumber?.toUpperCase() },
          { collegeEmail: body.collegeEmail?.toLowerCase() },
        ],
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: 'Student with this register number or email already exists' },
        { status: 409 }
      )
    }

    // The department password becomes the student's login password.
    const loginPassword = departmentPassword

    const student = await db.student.create({
      data: {
        registerNumber: body.registerNumber?.toUpperCase(),
        fullName: body.fullName,
        collegeEmail: body.collegeEmail?.toLowerCase(),
        personalEmail: body.personalEmail,
        mobile: body.mobile,
        password: loginPassword,
        dateOfBirth: body.dateOfBirth,
        gender: body.gender,
        department,
        degree: body.degree || 'B.E.',
        year: body.year,
        section: body.section,
        semester: body.semester,
        batch: body.batch,
        cgpa: body.cgpa ? parseFloat(body.cgpa) : null,
        tenthPercentage: body.tenthPercentage ? parseFloat(body.tenthPercentage) : null,
        twelfthPercentage: body.twelfthPercentage ? parseFloat(body.twelfthPercentage) : null,
        backlogs: body.backlogs ? parseInt(body.backlogs) : 0,
        historyOfArrears: body.historyOfArrears ? parseInt(body.historyOfArrears) : 0,
        graduationYear: body.graduationYear,
        preferredRole: body.preferredRole,
        preferredDomain: body.preferredDomain,
        interestedTechs: body.interestedTechs,
        preferredLocation: body.preferredLocation,
        skills: body.skills,
        strongSkills: body.strongSkills,
        linkedinUrl: body.linkedinUrl,
        leetcodeUrl: body.leetcodeUrl,
        githubUrl: body.githubUrl,
        resumeUrl: body.resumeUrl,
        placementStatus: 'UNPLACED',
        placementEligible: true,
      },
    })

    // Log successful registration.
    await logUserActivity({
      userId: student.registerNumber,
      userType: 'STUDENT',
      action: 'REGISTER',
      detail: `Registered as ${department} student`,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    })

    return NextResponse.json({ success: true, student })
  } catch (error) {
    console.error('Student registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
