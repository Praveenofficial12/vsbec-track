import { db } from './src/lib/db'
async function main() {
  const files = await db.driveFile.findMany({ take: 10, select: { id: true, fileName: true, mimeType: true, filePath: true, fileSize: true } })
  console.log('Files:', JSON.stringify(files, null, 2))
  const fileCount = await db.driveFile.count()
  console.log('Total files:', fileCount)
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
