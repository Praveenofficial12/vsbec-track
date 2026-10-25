import { db } from './src/lib/db'
import { statSync } from 'fs'
import { execSync } from 'child_process'

async function main() {
  // Run seed first to populate companies + drives
  console.log('Seeding database...')
  execSync('bun scripts/seed.ts', { stdio: 'inherit' })

  // Get the TCS drive
  const drive = await db.drive.findFirst({ where: { driveName: 'TCS Campus Drive 2026' } })
  if (!drive) { console.log('No drive found'); return }
  console.log(`Adding files to: ${drive.driveName}`)

  const files = [
    { fileName: 'sample.doc', mimeType: 'application/msword', description: 'Legacy Word .doc file (TQM assignment)' },
    { fileName: 'sample.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', description: 'Modern Word .docx file (TQM assignment)' },
  ]

  for (const f of files) {
    const fullPath = `/home/z/my-project/public/uploads/drives/test/${f.fileName}`
    const stats = statSync(fullPath)
    const filePath = `/uploads/drives/test/${f.fileName}`
    const created = await db.driveFile.create({
      data: {
        driveId: drive.id,
        fileName: f.fileName,
        filePath,
        fileSize: stats.size,
        mimeType: f.mimeType,
        description: f.description,
        uploadedBy: 'admin@vsbec.edu',
      },
    })
    console.log(`✅ Added: ${created.fileName} (${created.id})`)
  }
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
