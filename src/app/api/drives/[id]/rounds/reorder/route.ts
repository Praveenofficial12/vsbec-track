import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST: Reorder rounds in a drive.
// Body: { rounds: [{ id: string, roundNumber: number }] }
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const rounds = body.rounds as { id: string; roundNumber: number }[]

    if (!rounds || !Array.isArray(rounds) || rounds.length === 0) {
      return NextResponse.json({ error: 'rounds array is required' }, { status: 400 })
    }

    const drive = await db.drive.findUnique({ where: { id }, select: { id: true } })
    if (!drive) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 })
    }

    await db.$transaction(
      rounds.map((r) =>
        db.round.update({
          where: { id: r.id },
          data: { roundNumber: r.roundNumber },
        })
      )
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Reorder rounds error:', error)
    return NextResponse.json({ error: 'Failed to reorder rounds' }, { status: 500 })
  }
}
