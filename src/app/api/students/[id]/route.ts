import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: Get student by ID with full details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const student = await db.student.findUnique({
      where: { id },
      include: {
        certifications: true,
        projects: true,
        participations: {
          include: {
            drive: {
              include: { company: true },
            },
            roundResults: {
              include: { round: true },
            },
          },
        },
        notifications: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    return NextResponse.json({ student })
  } catch (error) {
    console.error('Get student error:', error)
    return NextResponse.json({ error: 'Failed to fetch student' }, { status: 500 })
  }
}

// PUT: Update student
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    const student = await db.student.update({
      where: { id },
      data: {
        fullName: body.fullName,
        personalEmail: body.personalEmail,
        mobile: body.mobile,
        dateOfBirth: body.dateOfBirth,
        gender: body.gender,
        cgpa: body.cgpa ? parseFloat(body.cgpa) : undefined,
        tenthPercentage: body.tenthPercentage ? parseFloat(body.tenthPercentage) : undefined,
        twelfthPercentage: body.twelfthPercentage ? parseFloat(body.twelfthPercentage) : undefined,
        backlogs: body.backlogs !== undefined ? parseInt(body.backlogs) : undefined,
        historyOfArrears: body.historyOfArrears !== undefined ? parseInt(body.historyOfArrears) : undefined,
        preferredRole: body.preferredRole,
        preferredDomain: body.preferredDomain,
        interestedTechs: body.interestedTechs,
        preferredLocation: body.preferredLocation,
        skills: body.skills,
        strongSkills: body.strongSkills,
        resumeUrl: body.resumeUrl,
        profilePhoto: body.profilePhoto,
      },
    })

    return NextResponse.json({ success: true, student })
  } catch (error) {
    console.error('Update student error:', error)
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
  }
}
