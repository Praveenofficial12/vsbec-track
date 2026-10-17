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

    // Send a welcome email to the student via the email mini-service.
    // This is fire-and-forget — don't block the registration response.
    fetch('http://localhost:3030/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: email,
        subject: 'Welcome to VSBEC Placement Portal — Registration Successful',
        html: `
          <!DOCTYPE html>
          <html><body style="font-family:Arial,sans-serif;background:#f0fdf4;padding:20px;">
            <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
              <div style="background:linear-gradient(135deg,#047857 0%,#0d9488 100%);padding:24px;text-align:center;">
                <h1 style="color:#fff;margin:0;font-size:20px;">V.S.B. Engineering College, Karur</h1>
                <p style="color:#a7f3d0;margin:4px 0 0 0;font-size:13px;">Placement Cell</p>
              </div>
              <div style="padding:24px;">
                <h2 style="color:#047857;margin:0 0 12px 0;">Registration Successful!</h2>
                <p style="color:#1e293b;font-size:14px;">Dear <strong>${body.fullName}</strong>,</p>
                <p style="color:#475569;font-size:14px;">Your registration on the VSBEC Placement Portal has been completed successfully. You can now log in using your register number and department password.</p>
                <table style="width:100%;margin:16px 0;border-collapse:collapse;">
                  <tr><td style="padding:8px;border:1px solid #e2e8f0;font-size:13px;color:#64748b;">Register Number:</td><td style="padding:8px;border:1px solid #e2e8f0;font-size:13px;font-weight:600;">${regNum}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #e2e8f0;font-size:13px;color:#64748b;">Department:</td><td style="padding:8px;border:1px solid #e2e8f0;font-size:13px;font-weight:600;">${department}</td></tr>
                  <tr><td style="padding:8px;border:1px solid #e2e8f0;font-size:13px;color:#64748b;">Email:</td><td style="padding:8px;border:1px solid #e2e8f0;font-size:13px;font-weight:600;">${email}</td></tr>
                </table>
                <p style="color:#475569;font-size:13px;">Login at: <a href="https://vsbec-track.space-z.ai" style="color:#047857;">vsbec-track.space-z.ai</a></p>
                <p style="color:#64748b;font-size:12px;margin-top:24px;">This is an automated email. Please do not reply.</p>
              </div>
            </div>
          </body></html>
        `,
      }),
    }).catch(() => { /* email is best-effort */ })

    return NextResponse.json({ success: true, student })
  } catch (error) {
    console.error('Student registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
