import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: List participations (optionally filtered by driveId or studentId)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const driveId = searchParams.get('driveId')
    const studentId = searchParams.get('studentId')

    const where: any = {}
    if (driveId) where.driveId = driveId
    if (studentId) where.studentId = studentId

    const participations = await db.driveParticipation.findMany({
      where,
      include: {
        student: true,
        drive: { include: { company: true } },
        roundResults: { include: { round: true } },
      },
    })
    return NextResponse.json({ participations })
  } catch (error) {
    console.error('Get participations error:', error)
    return NextResponse.json({ error: 'Failed to fetch participations' }, { status: 500 })
  }
}

// POST: Create or update participation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { studentId, driveId, attendance, action } = body

    // Check existing
    const existing = await db.driveParticipation.findFirst({
      where: { studentId, driveId },
    })

    if (existing) {
      const updated = await db.driveParticipation.update({
        where: { id: existing.id },
        data: { attendance: attendance || existing.attendance },
      })

      await db.auditLog.create({
        data: {
          adminEmail: 'Vsbec@2027',
          action: action || 'UPDATE_ATTENDANCE',
          entity: 'Participation',
          entityId: updated.id,
          previousValue: existing.attendance,
          newValue: attendance,
        },
      })

      return NextResponse.json({ success: true, participation: updated })
    }

    // Create new
    const participation = await db.driveParticipation.create({
      data: {
        studentId,
        driveId,
        attendance: attendance || 'REGISTERED',
      },
    })

    // Send notification
    await db.notification.create({
      data: {
        studentId,
        title: 'Drive Registration Confirmed',
        message: `You have been registered for the drive. Attendance status: ${attendance || 'REGISTERED'}`,
        type: 'DRIVE',
      },
    })

    return NextResponse.json({ success: true, participation })
  } catch (error) {
    console.error('Create participation error:', error)
    return NextResponse.json({ error: 'Failed to create participation' }, { status: 500 })
  }
}

// PUT: Update round result or final result
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { participationId, roundId, status, finalResult, jobRole, ctc, joiningLocation, joiningDate } = body

    if (roundId) {
      // Update round result
      const existing = await db.roundResult.findFirst({
        where: { participationId, roundId },
      })

      if (existing) {
        const updated = await db.roundResult.update({
          where: { id: existing.id },
          data: { status },
        })

        // Update current round on participation
        const round = await db.round.findUnique({ where: { id: roundId } })
        const participation = await db.driveParticipation.findUnique({ where: { id: participationId } })
        if (round && participation) {
          if (status === 'CLEARED' && round.roundNumber > participation.currentRound) {
            await db.driveParticipation.update({
              where: { id: participationId },
              data: {
                currentRound: round.roundNumber,
                attendance: 'IN_PROGRESS',
              },
            })
          }
        }

        await db.auditLog.create({
          data: {
            adminEmail: 'Vsbec@2027',
            action: 'UPDATE_ROUND_RESULT',
            entity: 'RoundResult',
            entityId: updated.id,
            previousValue: existing.status,
            newValue: status,
          },
        })

        return NextResponse.json({ success: true, roundResult: updated })
      } else {
        const created = await db.roundResult.create({
          data: { participationId, roundId, status },
        })
        return NextResponse.json({ success: true, roundResult: created })
      }
    }

    // Update final result
    const participation = await db.driveParticipation.update({
      where: { id: participationId },
      data: {
        finalResult,
        attendance: finalResult || 'IN_PROGRESS',
        jobRole: jobRole || undefined,
        ctc: ctc || undefined,
        joiningLocation: joiningLocation || undefined,
        joiningDate: joiningDate || undefined,
      },
    })

    // If selected, update student placement status
    if (finalResult === 'SELECTED') {
      const student = await db.student.findUnique({ where: { id: participation.studentId } })
      if (student && student.placementStatus !== 'PLACED') {
        await db.student.update({
          where: { id: participation.studentId },
          data: { placementStatus: 'PLACED' },
        })
      }

      await db.notification.create({
        data: {
          studentId: participation.studentId,
          title: '🎉 Congratulations! You have been selected',
          message: `You have been selected for the position of ${jobRole || 'Software Engineer'} with CTC ${ctc || 'TBD'}.`,
          type: 'SELECTION',
        },
      })
    }

    await db.auditLog.create({
      data: {
        adminEmail: 'Vsbec@2027',
        action: 'MARK_FINAL_RESULT',
        entity: 'Participation',
        entityId: participationId,
        previousValue: participation.attendance,
        newValue: finalResult || 'IN_PROGRESS',
      },
    })

    return NextResponse.json({ success: true, participation })
  } catch (error) {
    console.error('Update participation error:', error)
    return NextResponse.json({ error: 'Failed to update participation' }, { status: 500 })
  }
}
