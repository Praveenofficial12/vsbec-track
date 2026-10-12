import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: List all links shared in a drive's announcement area
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const links = await db.driveLink.findMany({
      where: { driveId: id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ links })
  } catch (error) {
    console.error('Get drive links error:', error)
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
  }
}

// POST: Add a new link to the drive's announcement area
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const body = await req.json()

    if (!body.url || !body.url.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Ensure URL has protocol
    let url = body.url.trim()
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url
    }

    const link = await db.driveLink.create({
      data: {
        driveId: id,
        title: body.title?.trim() || url,
        url,
        description: body.description?.trim() || null,
      },
    })

    // Notify attending students about the new link
    const attendingStudents = await db.driveParticipation.findMany({
      where: {
        driveId: id,
        attendance: { in: ['ATTENDING', 'IN_PROGRESS', 'SELECTED', 'ON_HOLD'] },
      },
      select: { studentId: true },
    })

    await Promise.all(
      attendingStudents.map((p) =>
        db.notification
          .create({
            data: {
              studentId: p.studentId,
              title: `New link shared: ${body.title || url}`,
              message: `A link "${body.title || url}" has been shared in the announcement area.`,
              type: 'DRIVE',
            },
          })
          .catch(() => null),
      ),
    )

    return NextResponse.json({ success: true, link })
  } catch (error) {
    console.error('Create drive link error:', error)
    return NextResponse.json({ error: 'Failed to add link' }, { status: 500 })
  }
}

// DELETE: Remove a link
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const linkId = searchParams.get('linkId')
    if (!linkId) {
      return NextResponse.json({ error: 'linkId is required' }, { status: 400 })
    }

    await db.driveLink.delete({ where: { id: linkId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete drive link error:', error)
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })
  }
}
