import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: List drives with optional filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const companyId = searchParams.get('companyId')

    const where: any = {}
    if (status && status !== 'ALL') where.status = status
    if (companyId) where.companyId = companyId

    const drives = await db.drive.findMany({
      where,
      include: {
        company: true,
        rounds: { orderBy: { roundNumber: 'asc' } },
        participants: true,
      },
      orderBy: { driveDate: 'asc' },
    })

    return NextResponse.json({ drives })
  } catch (error) {
    console.error('Get drives error:', error)
    return NextResponse.json({ error: 'Failed to fetch drives' }, { status: 500 })
  }
}

// POST: Create drive
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const drive = await db.drive.create({
      data: {
        companyId: body.companyId,
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
        status: body.status || 'UPCOMING',
      },
    })

    // Create default rounds
    const defaultRounds = [
      { roundNumber: 1, roundName: 'Aptitude Test', description: 'Quantitative, Logical Reasoning, Verbal' },
      { roundNumber: 2, roundName: 'Technical Assessment', description: 'Coding + Technical MCQs' },
      { roundNumber: 3, roundName: 'Technical Interview', description: 'Technical discussion on core subjects' },
      { roundNumber: 4, roundName: 'HR Interview', description: 'Behavioural and HR round' },
      { roundNumber: 5, roundName: 'Final Selection', description: 'Final result declaration' },
    ]
    for (const r of defaultRounds) {
      await db.round.create({
        data: { ...r, driveId: drive.id, status: 'UPCOMING' },
      })
    }

    const company = await db.company.findUnique({ where: { id: body.companyId } })

    await db.auditLog.create({
      data: {
        adminEmail: 'Vsbec@2027',
        action: 'CREATE_DRIVE',
        entity: 'Drive',
        entityId: drive.id,
        companyName: company?.name,
        driveName: drive.driveName,
        newValue: drive.status,
      },
    })

    return NextResponse.json({ success: true, drive })
  } catch (error) {
    console.error('Create drive error:', error)
    return NextResponse.json({ error: 'Failed to create drive' }, { status: 500 })
  }
}
