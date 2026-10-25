import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: Settings (placement rules + custom fields)
export async function GET() {
  try {
    const [rules, customFields] = await Promise.all([
      db.placementRule.findMany(),
      db.customField.findMany({ orderBy: { createdAt: 'asc' } }),
    ])
    return NextResponse.json({ rules, customFields })
  } catch (error) {
    console.error('Get settings error:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PUT: Update placement rule
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      ruleId, maxCompanies, blockOnSelection, minCgpaDefault, maxBacklogsDefault,
      screenshotPolicyEnabled, screenshotMaxAttempts,
    } = body

    const rule = await db.placementRule.update({
      where: { id: ruleId },
      data: {
        maxCompanies: maxCompanies !== undefined ? parseInt(maxCompanies) : undefined,
        blockOnSelection: blockOnSelection !== undefined ? blockOnSelection : undefined,
        minCgpaDefault: minCgpaDefault !== undefined ? parseFloat(minCgpaDefault) : undefined,
        maxBacklogsDefault: maxBacklogsDefault !== undefined ? parseInt(maxBacklogsDefault) : undefined,
        screenshotPolicyEnabled: screenshotPolicyEnabled !== undefined ? screenshotPolicyEnabled : undefined,
        screenshotMaxAttempts: screenshotMaxAttempts !== undefined ? parseInt(screenshotMaxAttempts) : undefined,
      },
    })

    return NextResponse.json({ success: true, rule })
  } catch (error) {
    console.error('Update settings error:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}

// POST: Add custom field
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const field = await db.customField.create({
      data: {
        fieldName: body.fieldName,
        fieldType: body.fieldType,
        options: body.options,
        isActive: true,
      },
    })
    return NextResponse.json({ success: true, field })
  } catch (error) {
    console.error('Create custom field error:', error)
    return NextResponse.json({ error: 'Failed to create custom field' }, { status: 500 })
  }
}
