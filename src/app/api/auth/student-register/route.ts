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
      // Log failed registration attempt (fire-and-forget, don't block the response).
      logUserActivity({
        userId: body.registerNumber?.toUpperCase() || null,
        userType: 'STUDENT',
        action: 'LOGIN_FAILED',
        detail: `Registration rejected: invalid department password for ${department}`,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      }).catch(() => {})
      return NextResponse.json(
        { error: 'Invalid department password. Please contact your placement coordinator.' },
        { status: 401 }
      )
    }

    // Quick duplicate check — use findUnique on indexed columns for speed.
    const regNum = body.registerNumber?.toUpperCase()
    const email = body.collegeEmail?.toLowerCase()
    const [existingByReg, existingByEmail] = await Promise.all([
      regNum ? db.student.findUnique({ where: { registerNumber: regNum }, select: { id: true } }) : null,
      email ? db.student.findUnique({ where: { collegeEmail: email }, select: { id: true } }) : null,
    ])
    if (existingByReg || existingByEmail) {
      return NextResponse.json(
        { error: 'Student with this register number or email already exists' },
        { status: 409 }
      )
    }

    // The department password becomes the student's login password.
    const loginPassword = departmentPassword

    const student = await db.student.create({
      data: {
        registerNumber: regNum,
        fullName: body.fullName,
        collegeEmail: email,
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
      select: { id: true, registerNumber: true, fullName: true, collegeEmail: true, department: true },
    })

    // Log successful registration (fire-and-forget, don't block the response).
    logUserActivity({
      userId: student.registerNumber,
      userType: 'STUDENT',
      action: 'REGISTER',
      detail: `Registered as ${department} student`,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    }).catch(() => {})

    return NextResponse.json({ success: true, student })
  } catch (error) {
    console.error('Student registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
