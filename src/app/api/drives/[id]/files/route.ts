import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { randomUUID } from 'crypto'

// GET: List all files attached to a drive (visible to attending students).
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const files = await db.driveFile.findMany({
      where: { driveId: id },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ files })
  } catch (error) {
    console.error('Get drive files error:', error)
    return NextResponse.json({ error: 'Failed to fetch files' }, { status: 500 })
  }
}

// POST: Upload a file to the drive's announcement area.
// Accepts multipart/form-data with a `file` field and optional `description`.
// The file is saved to /public/uploads/drives/<driveId>/ and a DriveFile record
// is created with the public path so attending students can download it.
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

    // Validate file size (max 25 MB)
    const MAX_SIZE = 25 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File size exceeds 25 MB limit' }, { status: 413 })
    }

    // Save the file to /public/uploads/drives/<driveId>/
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'drives', id)
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // Generate a unique filename to avoid collisions, preserving the extension.
    const ext = path.extname(file.name) || ''
    const uniqueName = `${randomUUID()}${ext}`
    const filePath = path.join(uploadDir, uniqueName)
    const bytes = await file.arrayBuffer()
    await writeFile(filePath, Buffer.from(bytes))

    // Public URL path for serving the file
    const publicPath = `/uploads/drives/${id}/${uniqueName}`

    // Create the DriveFile record with the round association
    const driveFile = await db.driveFile.create({
      data: {
        driveId: id,
        fileName: file.name,
        filePath: publicPath,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        description: description || null,
        roundName: roundName || null,
      },
    })

    // Create a notification for all attending students so they know a file
    // was shared in the announcement area.
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
              title: `New file shared: ${file.name}`,
              message: `A file "${file.name}" has been shared in the announcement area for ${drive.driveName}. ${description ? description : ''}`.trim(),
              type: 'DRIVE',
            },
          })
          .catch(() => null),
      ),
    )

    return NextResponse.json({ success: true, file: driveFile })
  } catch (error) {
    console.error('Upload drive file error:', error)
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
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

    // Best-effort: delete the physical file from disk
    const fullPath = path.join(process.cwd(), 'public', file.filePath)
    try {
      const { unlink } = await import('fs/promises')
      await unlink(fullPath)
    } catch {
      // ignore — the DB record is the source of truth
    }

    await db.driveFile.delete({ where: { id: fileId } })

    return NextResponse.json({ success: true, message: 'File deleted' })
  } catch (error) {
    console.error('Delete drive file error:', error)
    return NextResponse.json({ error: 'Failed to delete file' }, { status: 500 })
  }
}
