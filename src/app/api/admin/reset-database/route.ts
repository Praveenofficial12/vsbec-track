import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const mode = body.mode || 'wipe'

    if (mode === 'log_only') {
      await db.auditLog.create({
        data: {
          adminEmail: 'Vsbec@2027',
          action: body.action || 'ADMIN_ACTION',
          entity: 'System',
          newValue: JSON.stringify(body.details || {}).substring(0, 500),
        },
      }).catch(() => {})
      return NextResponse.json({ success: true, message: 'Action logged' })
    }

    // Delete ALL data
    await db.roundResult.deleteMany()
    await db.driveParticipation.deleteMany()
    await db.round.deleteMany()
    await db.drive.deleteMany()
    await db.notification.deleteMany()
    await db.certification.deleteMany()
    await db.project.deleteMany()
    await db.student.deleteMany()
    await db.company.deleteMany()
    await db.auditLog.deleteMany()
    await db.placementRule.deleteMany()
    await db.customField.deleteMany()

    if (mode === 'reseed') {
      await db.placementRule.create({
        data: { name: 'Default Placement Rules', maxCompanies: 10, blockOnSelection: true, minCgpaDefault: 6.0, maxBacklogsDefault: 2 },
      })
      const customFields = [
        { fieldName: 'Preferred Programming Language', fieldType: 'DROPDOWN', options: 'Java,Python,C++,JavaScript' },
        { fieldName: 'Communication Rating', fieldType: 'NUMBER', options: null },
        { fieldName: 'Internship Experience', fieldType: 'BOOLEAN', options: null },
        { fieldName: 'GitHub Profile', fieldType: 'TEXT', options: null },
        { fieldName: 'LinkedIn Profile', fieldType: 'TEXT', options: null },
      ]
      for (const cf of customFields) await db.customField.create({ data: cf })

      return NextResponse.json({
        success: true,
        message: 'Database wiped. Placement rules and custom fields re-created. No students/companies/drives.',
      })
    }

    return NextResponse.json({
      success: true,
      message: 'All data wiped. Admin account preserved.',
    })
  } catch (error) {
    console.error('Database reset error:', error)
    return NextResponse.json({ error: 'Failed to reset database' }, { status: 500 })
  }
}
