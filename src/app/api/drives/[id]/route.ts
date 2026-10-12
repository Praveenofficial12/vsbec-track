import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: Drive details with rounds and participants
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const drive = await db.drive.findUnique({
      where: { id },
      include: {
        company: true,
        rounds: { orderBy: { roundNumber: 'asc' } },
        participants: {
          include: {
            student: true,
            roundResults: { include: { round: true } },
          },
        },
      },
    })

    if (!drive) return NextResponse.json({ error: 'Drive not found' }, { status: 404 })
    return NextResponse.json({ drive })
  } catch (error) {
    console.error('Get drive error:', error)
    return NextResponse.json({ error: 'Failed to fetch drive' }, { status: 500 })
  }
}

// PUT: Update drive
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const drive = await db.drive.update({
      where: { id },
      data: {
        driveName: body.driveName,
        driveDate: body.driveDate,
        applicationDeadline: body.applicationDeadline,
        jobRole: body.jobRole,
        ctc: body.ctc,
        location: body.location,
        eligibleDepartments: body.eligibleDepartments,
        eligibleYears: body.eligibleYears,
        eligibleClasses: body.eligibleClasses,
        minCgpa: body.minCgpa ? parseFloat(body.minCgpa) : null,
        maxBacklogs: body.maxBacklogs !== undefined && body.maxBacklogs !== '' ? parseInt(body.maxBacklogs) : null,
        minTenthPercentage: body.minTenthPercentage ? parseFloat(body.minTenthPercentage) : null,
        minTwelfthPercentage: body.minTwelfthPercentage ? parseFloat(body.minTwelfthPercentage) : null,
        requiredSkills: body.requiredSkills,
        preferredSkills: body.preferredSkills,
        selectionProcess: body.selectionProcess,
        announcement: body.announcement,
        status: body.status,
      },
    })
    return NextResponse.json({ success: true, drive })
  } catch (error) {
    console.error('Update drive error:', error)
    return NextResponse.json({ error: 'Failed to update drive' }, { status: 500 })
  }
}

// DELETE: Delete drive — cascade delete all related records first
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    await db.$transaction(async (tx) => {
      // Verify the drive exists
      const drive = await tx.drive.findUnique({
        where: { id },
        select: { id: true, driveName: true, companyId: true },
      })
      if (!drive) {
        throw new Error('NOT_FOUND')
      }

      // 1) Find all participation rows for this drive.
      const participations = await tx.driveParticipation.findMany({
        where: { driveId: id },
        select: { id: true },
      })
      const participationIds = participations.map((p) => p.id)

      // 2) Delete RoundResult rows referencing those participations.
      if (participationIds.length > 0) {
        await tx.roundResult.deleteMany({
          where: { participationId: { in: participationIds } },
        })
      }

      // 3) Delete DriveParticipation rows.
      await tx.driveParticipation.deleteMany({ where: { driveId: id } })

      // 4) Delete Round rows.
      await tx.round.deleteMany({ where: { driveId: id } })

      // 5) Delete DriveFile rows.
      await tx.driveFile.deleteMany({ where: { driveId: id } })

      // 6) Delete the drive itself.
      await tx.drive.delete({ where: { id } })

      // 7) Audit trail.
      await tx.auditLog.create({
        data: {
          adminEmail: 'Vsbec@2027',
          action: 'DELETE_DRIVE',
          entity: 'Drive',
          entityId: id,
          driveName: drive.driveName,
          newValue: 'Deleted',
        },
      })
    })

    return NextResponse.json({ success: true, message: 'Drive deleted successfully' })
  } catch (error: any) {
    if (error?.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 })
    }
    console.error('Delete drive error:', error)
    return NextResponse.json({ error: 'Failed to delete drive' }, { status: 500 })
  }
}
