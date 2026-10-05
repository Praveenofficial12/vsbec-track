import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

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

    const student = await db.student.create({
      data: {
        registerNumber: body.registerNumber?.toUpperCase(),
        fullName: body.fullName,
        collegeEmail: body.collegeEmail?.toLowerCase(),
        personalEmail: body.personalEmail,
        mobile: body.mobile,
        password: body.password || 'student@123',
        dateOfBirth: body.dateOfBirth,
        gender: body.gender,
        department: body.department,
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
        placementStatus: 'UNPLACED',
        placementEligible: true,
      },
    })

    return NextResponse.json({ success: true, student })
  } catch (error) {
    console.error('Student registration error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
