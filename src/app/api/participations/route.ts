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
    const { participationId, roundId, status, finalResult, jobRole, ctc, joiningLocation, joiningDate, source } = body

    // The `source` field marks who initiated this update. When a student
    // self-reports their round result, the audit trail records a distinct
    // STUDENT_SELF_MARK action so admins can distinguish self-reported vs
    // admin-curated updates.
    const isStudentSource = String(source || '').toUpperCase() === 'STUDENT'
    const auditAction = isStudentSource ? 'STUDENT_SELF_MARK' : undefined

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

        // When a student self-reports NOT_CLEARED or ABSENT, auto-mark the
        // participation attendance as REJECTED (consistent with the rule that
        // a student who fails a round is no longer active in that drive).
        const failedStatuses = ['NOT_CLEARED', 'ABSENT']
        const failedRound = failedStatuses.includes(status)

        if (round && participation) {
          if (status === 'CLEARED' && round.roundNumber > participation.currentRound) {
            await db.driveParticipation.update({
              where: { id: participationId },
              data: {
                currentRound: round.roundNumber,
                attendance: 'IN_PROGRESS',
              },
            })
          } else if (isStudentSource && failedRound) {
            await db.driveParticipation.update({
              where: { id: participationId },
              data: { attendance: 'REJECTED' },
            })
          }
        }

        await db.auditLog.create({
          data: {
            adminEmail: 'Vsbec@2027',
            action: auditAction || 'UPDATE_ROUND_RESULT',
            entity: 'RoundResult',
            entityId: updated.id,
            previousValue: existing.status,
            newValue: `${status}${isStudentSource ? ' (self-reported)' : ''}`,
          },
        })

        return NextResponse.json({ success: true, roundResult: updated })
      } else {
        const created = await db.roundResult.create({
          data: { participationId, roundId, status },
        })

        // Auto-REJECTED attendance when student self-reports a failure.
        if (isStudentSource && ['NOT_CLEARED', 'ABSENT'].includes(status)) {
          await db.driveParticipation.update({
            where: { id: participationId },
            data: { attendance: 'REJECTED' },
          })
        }

        await db.auditLog.create({
          data: {
            adminEmail: 'Vsbec@2027',
            action: auditAction || 'UPDATE_ROUND_RESULT',
            entity: 'RoundResult',
            entityId: created.id,
            newValue: `${status}${isStudentSource ? ' (self-reported)' : ''}`,
          },
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

    // If selected, update student placement status AND mark the drive itself
    // as "SELECTED". The drive is NOT closed — it stays open (status SELECTED,
    // not COMPLETED) so other students can continue through their rounds.
    // Only the dedicated "Mark as Completed" action on the drive header can
    // set the status to COMPLETED.
    if (finalResult === 'SELECTED') {
      const student = await db.student.findUnique({ where: { id: participation.studentId } })
      if (student && student.placementStatus !== 'PLACED') {
        await db.student.update({
          where: { id: participation.studentId },
          data: { placementStatus: 'PLACED' },
        })
      }

      // Promote the drive status to SELECTED (only if it isn't already
      // COMPLETED/CANCELLED — we never downgrade a closed drive).
      const drive = await db.drive.findUnique({
        where: { id: participation.driveId },
        select: { id: true, status: true },
      })
      if (drive && !['COMPLETED', 'CANCELLED'].includes(drive.status)) {
        await db.drive.update({
          where: { id: drive.id },
          data: { status: 'SELECTED' },
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
    } else if (finalResult && finalResult !== 'SELECTED') {
      // When a previously-selected student's result is changed away from
      // SELECTED (e.g. via "Unlock & Remove" → REJECTED), check if any other
      // student in this drive is still SELECTED. If none are, demote the
      // drive status from SELECTED back to ONGOING so the final results
      // area re-opens for editing.
      const drive = await db.drive.findUnique({
        where: { id: participation.driveId },
        select: { id: true, status: true },
      })
      if (drive && drive.status === 'SELECTED') {
        const remainingSelected = await db.driveParticipation.count({
          where: {
            driveId: drive.id,
            finalResult: 'SELECTED',
            id: { not: participationId }, // exclude the one we just changed
          },
        })
        if (remainingSelected === 0) {
          await db.drive.update({
            where: { id: drive.id },
            data: { status: 'ONGOING' },
          })
        }
      }
    }

    await db.auditLog.create({
      data: {
        adminEmail: 'Vsbec@2027',
        action: auditAction || 'MARK_FINAL_RESULT',
        entity: 'Participation',
        entityId: participationId,
        previousValue: participation.attendance,
        newValue: `${finalResult || 'IN_PROGRESS'}${isStudentSource ? ' (self-reported)' : ''}`,
      },
    })

    return NextResponse.json({ success: true, participation })
  } catch (error) {
    console.error('Update participation error:', error)
    return NextResponse.json({ error: 'Failed to update participation' }, { status: 500 })
  }
}
