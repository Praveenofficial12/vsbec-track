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

// DELETE: Cascade-delete a student and all their dependent records
// (round results → participations → certifications → projects → notifications → student).
// Also writes an AuditLog entry for traceability.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    const student = await db.student.findUnique({ where: { id }, select: { id: true, fullName: true, registerNumber: true } })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Find every participation this student has so we can wipe their round results first.
    const participations = await db.driveParticipation.findMany({
      where: { studentId: id },
      select: { id: true },
    })
    const participationIds = participations.map((p) => p.id)

    await db.$transaction(async (tx) => {
      if (participationIds.length > 0) {
        await tx.roundResult.deleteMany({ where: { participationId: { in: participationIds } } })
      }
      await tx.driveParticipation.deleteMany({ where: { studentId: id } })
      await tx.certification.deleteMany({ where: { studentId: id } })
      await tx.project.deleteMany({ where: { studentId: id } })
      await tx.notification.deleteMany({ where: { studentId: id } })
      await tx.student.delete({ where: { id } })

      await tx.auditLog.create({
        data: {
          adminEmail: 'Vsbec@2027',
          action: 'DELETE_STUDENT',
          entity: 'Student',
          entityId: id,
          studentName: student.fullName,
          previousValue: student.registerNumber,
          newValue: 'DELETED',
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete student error:', error)
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 })
  }
}
