import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await db.certification.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete certification error:', error)
    return NextResponse.json({ error: 'Failed to delete certification' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()
    const cert = await db.certification.update({
      where: { id },
      data: {
        name: body.name,
        organization: body.organization,
        certDate: body.certDate,
        credentialId: body.credentialId,
        credentialUrl: body.credentialUrl,
        fileUrl: body.fileUrl,
      },
    })
    return NextResponse.json({ success: true, certification: cert })
  } catch (error) {
    console.error('Update certification error:', error)
    return NextResponse.json({ error: 'Failed to update certification' }, { status: 500 })
  }
}
