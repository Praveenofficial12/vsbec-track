import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readFile } from 'fs/promises'
import path from 'path'

// GET: Serve a file's raw content with the correct Content-Type.
// Query params: fileId=<DriveFile id>
//
// This route reads the file from disk and streams it to the browser with
// the correct MIME type. This allows:
//   - PDFs to render in the browser's built-in PDF viewer
//   - Images to display inline
//   - Office files to be downloaded/viewed via browser plugins
//
// The Content-Disposition header is set to "inline" (not "attachment") so
// the browser tries to display the file rather than downloading it.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const fileId = searchParams.get('fileId')

    if (!fileId) {
      return NextResponse.json({ error: 'File ID is required' }, { status: 400 })
    }

    const file = await db.driveFile.findUnique({
      where: { id: fileId },
      select: { id: true, fileName: true, filePath: true, mimeType: true },
    })

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }

    const fullPath = path.join(process.cwd(), 'public', file.filePath)

    try {
      const fileBuffer = await readFile(fullPath)

      // Determine the correct content type
      let contentType = file.mimeType || 'application/octet-stream'

      // For Office files, the MIME type might be 'application/octet-stream'
      // which won't trigger the browser's viewer. Fix common types:
      const ext = file.fileName.toLowerCase().split('.').pop() || ''
      if (ext === 'xlsx' || ext === 'xls') {
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } else if (ext === 'docx' || ext === 'doc') {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      } else if (ext === 'pptx' || ext === 'ppt') {
        contentType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
      } else if (ext === 'pdf') {
        contentType = 'application/pdf'
      } else if (ext === 'png') {
        contentType = 'image/png'
      } else if (ext === 'jpg' || ext === 'jpeg') {
        contentType = 'image/jpeg'
      } else if (ext === 'gif') {
        contentType = 'image/gif'
      } else if (ext === 'txt' || ext === 'csv') {
        contentType = 'text/plain'
      }

      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${file.fileName}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Content-Length': fileBuffer.length.toString(),
        },
      })
    } catch (readError) {
      console.error('File read error:', readError)
      return NextResponse.json({ error: 'File not found on disk' }, { status: 404 })
    }
  } catch (error) {
    console.error('File serve error:', error)
    return NextResponse.json({ error: 'Failed to serve file' }, { status: 500 })
  }
}
