import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST: Add a new round to a drive.
// Body: { roundName: string, description?: string }
// The new round is appended after the last existing round (roundNumber = max + 1).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    if (!body.roundName || !body.roundName.trim()) {
      return NextResponse.json({ error: 'Round name is required' }, { status: 400 })
    }

    // Verify the drive exists
    const drive = await db.drive.findUnique({ where: { id }, select: { id: true, driveName: true } })
    if (!drive) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 })
    }

    // Find the current max round number
    const existingRounds = await db.round.findMany({
      where: { driveId: id },
      orderBy: { roundNumber: 'desc' },
      take: 1,
      select: { roundNumber: true },
    })
    const nextRoundNumber = (existingRounds[0]?.roundNumber || 0) + 1

    // Create the new round
    const newRound = await db.round.create({
      data: {
        driveId: id,
        roundNumber: nextRoundNumber,
        roundName: body.roundName.trim(),
        description: body.description || `${body.roundName.trim()} round`,
        status: 'UPCOMING',
      },
    })

    await db.auditLog.create({
      data: {
        adminEmail: 'Vsbec@2027',
        action: 'ADD_ROUND',
        entity: 'Round',
        entityId: newRound.id,
        driveName: drive.driveName,
        newValue: `${newRound.roundName} (Round ${nextRoundNumber})`,
      },
    }).catch(() => {})

    return NextResponse.json({ success: true, round: newRound })
  } catch (error) {
    console.error('Add round error:', error)
    return NextResponse.json({ error: 'Failed to add round' }, { status: 500 })
  }
}

// GET: List all rounds for a drive (ordered by roundNumber).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const rounds = await db.round.findMany({
      where: { driveId: id },
      orderBy: { roundNumber: 'asc' },
    })
    return NextResponse.json({ rounds })
  } catch (error) {
    console.error('Get rounds error:', error)
    return NextResponse.json({ error: 'Failed to fetch rounds' }, { status: 500 })
  }
}
