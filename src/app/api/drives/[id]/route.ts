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
        requiredSkills: body.requiredSkills,
        preferredSkills: body.preferredSkills,
        selectionProcess: body.selectionProcess,
        status: body.status,
      },
    })
    return NextResponse.json({ success: true, drive })
  } catch (error) {
    console.error('Update drive error:', error)
    return NextResponse.json({ error: 'Failed to update drive' }, { status: 500 })
  }
}

// DELETE: Delete drive
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.drive.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete drive error:', error)
    return NextResponse.json({ error: 'Failed to delete drive' }, { status: 500 })
  }
}
