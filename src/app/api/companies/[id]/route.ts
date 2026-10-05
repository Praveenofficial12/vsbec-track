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
    await db.company.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete company error:', error)
    return NextResponse.json({ error: 'Failed to delete company' }, { status: 500 })
  }
}
