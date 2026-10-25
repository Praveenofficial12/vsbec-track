import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST: Add a certification to a student
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const cert = await db.certification.create({
      data: {
        studentId: body.studentId,
        name: body.name,
        organization: body.organization,
        certDate: body.certDate,
        credentialId: body.credentialId,
        credentialUrl: body.credentialUrl,
        fileUrl: body.fileUrl, // uploaded certificate file URL
      },
    })
    return NextResponse.json({ success: true, certification: cert })
  } catch (error) {
    console.error('Create certification error:', error)
    return NextResponse.json({ error: 'Failed to create certification' }, { status: 500 })
  }
}
