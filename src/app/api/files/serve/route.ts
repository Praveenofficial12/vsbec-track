import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Streams uploaded file bytes from PostgreSQL. This works on Vercel serverless
// runtimes, where writing files to the deployment filesystem is not persistent.
export async function GET(req: NextRequest) {
  try {
    const fileId = new URL(req.url).searchParams.get('fileId')
    if (!fileId) return NextResponse.json({ error: 'File ID is required' }, { status: 400 })

    const file = await db.driveFile.findUnique({
      where: { id: fileId },
      select: { id: true, fileName: true, filePath: true, mimeType: true, content: true },
    })
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 })

    // Legacy uploads used public filesystem paths. New uploads are database-backed.
    if (!file.content) {
      return NextResponse.json(
        { error: 'This older file is not stored in the database. Please upload it again.' },
        { status: 404 },
      )
    }

    const ext = file.fileName.toLowerCase().split('.').pop() || ''
    const contentTypes: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      xls: 'application/vnd.ms-excel',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      doc: 'application/msword',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      ppt: 'application/vnd.ms-powerpoint',
      csv: 'text/csv',
      txt: 'text/plain; charset=utf-8',
    }
    const safeName = file.fileName.replace(/[\r\n"]/g, '_')
    return new NextResponse(new Uint8Array(file.content), {
      status: 200,
      headers: {
        'Content-Type': contentTypes[ext] || file.mimeType || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${safeName}"`,
        'Cache-Control': 'private, no-store',
        'Content-Length': String(file.content.length),
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch (error) {
    console.error('File serve error:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
