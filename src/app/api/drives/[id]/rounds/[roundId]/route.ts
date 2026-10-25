import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// PUT: Update a round's details (name, description, date, times, status).
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string; roundId: string }> }) {
  try {
    const { id, roundId } = await params
    const body = await req.json()

    // Verify the round belongs to this drive
    const existing = await db.round.findFirst({
      where: { id: roundId, driveId: id },
      select: { id: true },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    const updated = await db.round.update({
      where: { id: roundId },
      data: {
        roundName: body.roundName,
        description: body.description,
        date: body.date || null,
        startTime: body.startTime || null,
        endTime: body.endTime || null,
        status: body.status,
        statusUnlocked: body.statusUnlocked !== undefined ? body.statusUnlocked : undefined,
      },
    })

    await db.auditLog.create({
      data: {
        adminEmail: 'Vsbec@2027',
        action: 'UPDATE_ROUND',
        entity: 'Round',
        entityId: roundId,
        newValue: `${body.roundName} | ${body.status || 'UPCOMING'}`,
      },
    }).catch(() => {})

    return NextResponse.json({ success: true, round: updated })
  } catch (error) {
    console.error('Update round error:', error)
    return NextResponse.json({ error: 'Failed to update round' }, { status: 500 })
  }
}

// DELETE: Delete a round from a drive.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; roundId: string }> }) {
  try {
    const { id, roundId } = await params

    // Delete round results for this round first, then the round itself
    await db.roundResult.deleteMany({ where: { roundId } }).catch(() => {})
    await db.round.delete({ where: { id: roundId } })

    await db.auditLog.create({
      data: {
        adminEmail: 'Vsbec@2027',
        action: 'DELETE_ROUND',
        entity: 'Round',
        entityId: roundId,
        newValue: 'DELETED',
      },
    }).catch(() => {})

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete round error:', error)
    return NextResponse.json({ error: 'Failed to delete round' }, { status: 500 })
  }
}
