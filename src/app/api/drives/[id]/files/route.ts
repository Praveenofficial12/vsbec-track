import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: List all files attached to a drive (visible to attending students).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const files = await db.driveFile.findMany({
      where: { driveId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, driveId: true, fileName: true, filePath: true,
        fileSize: true, mimeType: true, description: true, uploadedBy: true,
        createdAt: true, roundName: true, locked: true,
      },
    })
    return NextResponse.json({ files })
  } catch (error) {
    console.error('Get drive files error:', error)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}

// POST: Upload a file to the drive's announcement area.
// Vercel Functions impose a request-body limit, so keep uploads below that limit
// and persist bytes in PostgreSQL (the serverless filesystem is not persistent).
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const drive = await db.drive.findUnique({ where: { id }, select: { id: true, driveName: true } })
    if (!drive) {
      return NextResponse.json({ error: 'Drive not found' }, { status: 404 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const description = formData.get('description') as string | null
    const roundName = formData.get('roundName') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Vercel Functions have a 4.5 MB request-body limit, including multipart
    // overhead. Use a conservative 4 MB file limit so the request reaches this
    // handler instead of being rejected by the platform before the route runs.
    const MAX_SIZE = 4 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File is too large. Please upload a file smaller than 4 MB. Larger files require external object storage.' },
        { status: 413 },
      )
    }

    // Vercel serverless filesystems are ephemeral/read-only. Persist the bytes
    // in PostgreSQL so uploads survive deployments and work across instances.
    const bytes = Buffer.from(await file.arrayBuffer())
    const driveFile = await db.driveFile.create({
      data: {
        driveId: id,
        fileName: file.name,
        filePath: 'pending',
        content: bytes,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        description: description || null,
        roundName: roundName || null,
      },
      select: {
        id: true, driveId: true, fileName: true, filePath: true,
        fileSize: true, mimeType: true, description: true, uploadedBy: true,
        createdAt: true, roundName: true, locked: true,
      },
    })
    const persistentPath = `db://${id}/${driveFile.id}`
    await db.driveFile.update({ where: { id: driveFile.id }, data: { filePath: persistentPath } })
    driveFile.filePath = persistentPath

    // The upload is already saved at this point. Notifications are best-effort:
    // a notification/schema issue must never turn a successful upload into an
    // "Upload failed" response, which would encourage duplicate uploads.
    try {
      const attendingStudents = await db.driveParticipation.findMany({
        where: {
          driveId: id,
          attendance: { in: ['ATTENDING', 'IN_PROGRESS', 'SELECTED', 'ON_HOLD'] },
        },
        select: { studentId: true },
      })

      await Promise.all(
        attendingStudents.map((p) =>
          db.notification.create({
            data: {
              studentId: p.studentId,
              title: `New file shared: ${file.name}`,
              message: `A file "${file.name}" has been shared in the announcement area for ${drive.driveName}. ${description || ''}`.trim(),
              type: 'DRIVE',
            },
          }).catch((notificationError) => {
            console.warn('File uploaded, but student notification failed:', notificationError)
            return null
          }),
        ),
      )
    } catch (notificationError) {
      console.warn('File uploaded, but notifications could not be created:', notificationError)
    }

    return NextResponse.json({ success: true, file: driveFile }, { status: 201 })
  } catch (error) {
    console.error('Upload drive file error:', error)
    const message = error instanceof Error ? error.message : 'Unknown upload error'
    if (message.includes('content') || message.includes('Unknown argument')) {
      return NextResponse.json(
        { error: 'The database schema is not ready for file uploads. Please contact the administrator to sync the DriveFile content column.' },
        { status: 500 },
      )
    }
    if (message.toLowerCase().includes('timeout') || message.includes('Timed out')) {
      return NextResponse.json(
        { error: 'The upload took too long. Try a smaller file (under 4 MB) and upload again.' },
        { status: 504 },
      )
    }
    return NextResponse.json({ error: 'Upload failed while saving the file. Please try a file under 4 MB; if it continues, check the deployment logs.' }, { status: 500 })
  }
}

// DELETE: Remove a file from the drive's announcement area.
// Query params: fileId=<DriveFile id>
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('fileId')
    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
    }

    const file = await db.driveFile.findUnique({ where: { id: fileId } })
    if (!file || file.driveId !== id) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    // File bytes are stored in PostgreSQL, so deleting the row removes both
    // metadata and the binary content without relying on local disk.
    await db.driveFile.delete({ where: { id: fileId } })

    return NextResponse.json({ success: true, message: 'File deleted' })
  } catch (error) {
    console.error('Delete drive file error:', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}
