import { db } from './src/lib/db'
async function main() {
  // Find the Accenture drive details
  const drive = await db.drive.findFirst({ where: { driveName: 'Accenture Hiring 2026' } })
  if (!drive) { console.log('No Accenture drive'); return }
  console.log(`Drive: ${drive.driveName}, eligibleYears: ${drive.eligibleYears}, eligibleDeps: ${drive.eligibleDepartments}`)
  
  // Find attending students on this drive
  const parts = await db.driveParticipation.findMany({
    where: { driveId: drive.id, attendance: 'IN_PROGRESS' },
    include: { 
      student: { select: { registerNumber: true, collegeEmail: true, department: true, fullName: true, year: true } },
    },
    take: 5,
  })
  console.log('Attending students:')
  parts.forEach(p => console.log(` - ${p.student.registerNumber} / ${p.student.collegeEmail} (${p.student.department}, ${p.student.year}): ${p.student.fullName}`))
  // Get the files attached
  const files = await db.driveFile.findMany({ where: { driveId: drive.id }, select: { id: true, fileName: true } })
  console.log('Files:')
  files.forEach(f => console.log(` - ${f.fileName} (${f.id})`))
}
main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1) })
