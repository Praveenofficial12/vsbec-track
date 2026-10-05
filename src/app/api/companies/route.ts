import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: List companies
export async function GET() {
  try {
    const companies = await db.company.findMany({
      include: { drives: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ companies })
  } catch (error) {
    console.error('Get companies error:', error)
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 })
  }
}

// POST: Create company
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const company = await db.company.create({
      data: {
        name: body.name,
        website: body.website,
        description: body.description,
        industry: body.industry,
        jobRole: body.jobRole,
        location: body.location,
        ctc: body.ctc,
        jobType: body.jobType || 'Full Time',
        eligibility: body.eligibility,
        logoUrl: body.logoUrl || `https://logo.clearbit.com/${body.logoDomain || body.name?.toLowerCase().replace(/\s+/g, '') + '.com'}`,
        logoDomain: body.logoDomain,
        driveDate: body.driveDate,
        applicationDeadline: body.applicationDeadline,
      },
    })

    // Audit log
    await db.auditLog.create({
      data: {
        adminEmail: 'Vsbec@2027',
        action: 'CREATE_COMPANY',
        entity: 'Company',
        entityId: company.id,
        companyName: company.name,
        newValue: 'Created',
      },
    })

    return NextResponse.json({ success: true, company })
  } catch (error) {
    console.error('Create company error:', error)
    return NextResponse.json({ error: 'Failed to create company' }, { status: 500 })
  }
}
