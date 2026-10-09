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
        linkedinUrl: body.linkedinUrl,
        leetcodeUrl: body.leetcodeUrl,
        githubUrl: body.githubUrl,
      },
    })

    return NextResponse.json({ success: true, student })
  } catch (error) {
    console.error('Update student error:', error)
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
  }
}

// DELETE: DISABLED per requirement — students registered on the website cannot
// be removed through the API/UI. They can only be removed by staff directly
// from the database (e.g. via Prisma Studio, sqlite3 CLI, or a DB console).
// The cascade-delete logic is intentionally left commented below for staff
// reference if they ever need to run it directly against the database.
//
// export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
//   ... cascade-delete RoundResult → DriveParticipation → Certification →
//       Project → Notification → Student, then write an AuditLog entry ...
// }
export async function DELETE() {
  return NextResponse.json(
    {
      error:
        'Student deletion is disabled on the website. Registered students can only be removed by staff directly from the database.',
      hint: 'Use Prisma Studio (bunx prisma studio) or the sqlite3 CLI to remove the Student row manually. The cascade delete order is: RoundResult → DriveParticipation → Certification → Project → Notification → Student.',
    },
    { status: 403 },
  )
}
