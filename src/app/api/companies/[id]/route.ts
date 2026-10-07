import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const company = await db.company.findUnique({
      where: { id },
      include: {
        drives: {
          include: {
            rounds: { orderBy: { roundNumber: 'asc' } },
            participants: true,
          },
          orderBy: { driveDate: 'desc' },
        },
      },
    })

    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    return NextResponse.json({ company })
  } catch (error) {
    console.error('Get company error:', error)
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const company = await db.company.update({
      where: { id },
      data: {
        name: body.name,
        website: body.website,
        description: body.description,
        industry: body.industry,
        jobRole: body.jobRole,
        location: body.location,
        ctc: body.ctc,
        eligibility: body.eligibility,
        logoUrl: body.logoUrl,
        logoDomain: body.logoDomain,
      },
    })

    await db.auditLog.create({
      data: {
        adminEmail: 'Vsbec@2027',
        action: 'UPDATE_COMPANY',
        entity: 'Company',
        entityId: company.id,
        companyName: company.name,
        newValue: 'Updated',
      },
    })

    return NextResponse.json({ success: true, company })
  } catch (error) {
    console.error('Update company error:', error)
    return NextResponse.json({ error: 'Failed to update company' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params

    // Cascade delete in the correct FK order to avoid SQLite constraint errors:
    //   RoundResult -> DriveParticipation -> Round -> Drive -> Company
    await db.$transaction(async (tx) => {
      const company = await tx.company.findUnique({
        where: { id },
        select: { id: true, name: true, drives: { select: { id: true } } },
      })
      if (!company) {
        throw new Error('NOT_FOUND')
      }

      const driveIds = company.drives.map((d) => d.id)

      if (driveIds.length > 0) {
        // 1) Find all participation rows across all drives of this company.
        const participations = await tx.driveParticipation.findMany({
          where: { driveId: { in: driveIds } },
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
        await tx.driveParticipation.deleteMany({
          where: { driveId: { in: driveIds } },
        })

        // 4) Delete Round rows.
        await tx.round.deleteMany({
          where: { driveId: { in: driveIds } },
        })

        // 5) Delete the drives themselves.
        await tx.drive.deleteMany({
          where: { id: { in: driveIds } },
        })
      }

      // 6) Finally delete the company.
      await tx.company.delete({ where: { id } })

      // 7) Audit trail.
      await tx.auditLog.create({
        data: {
          adminEmail: 'Vsbec@2027',
          action: 'DELETE_COMPANY',
          entity: 'Company',
          entityId: id,
          companyName: company.name,
          newValue: `Deleted company with ${driveIds.length} drive(s)`,
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error?.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }
    console.error('Delete company error:', error)
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
  }
}
