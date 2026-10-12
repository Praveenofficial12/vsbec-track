import { db } from '@/lib/db'

// Email notification helper for the VSBEC Placement Management System.
//
// Emails are sent via the email mini-service (port 3030) which uses nodemailer.
// The gateway forwards requests with ?XTransformPort=3030.
//
// Two key events trigger emails:
//   1. New drive created → emails sent to all eligible registered students
//   2. Student marked SELECTED → email sent to the placement officer

export interface DriveEmailPayload {
  driveId: string
  driveName: string
  companyName: string
  jobRole?: string | null
  ctc?: string | null
  location?: string | null
  driveDate: string
  applicationDeadline?: string | null
  eligibleDepartments?: string | null
  eligibleYears?: string | null
}

export interface StudentEmailRecipient {
  id: string
  registerNumber: string
  fullName: string
  collegeEmail: string
  personalEmail?: string | null
  department?: string | null
  year?: string | null
}

export function buildDriveEmail(payload: DriveEmailPayload, student: StudentEmailRecipient): { subject: string; htmlBody: string } {
  const subject = `[VSBEC Placement] New Drive: ${payload.companyName} — ${payload.jobRole || 'Software Engineer'}`
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #047857; margin-bottom: 4px;">V.S.B. Engineering College, Karur</h2>
      <p style="color: #64748b; font-size: 13px; margin-top: 0;">Placement Cell Notification</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      <p>Dear <strong>${student.fullName}</strong>,</p>
      <p>A new placement drive has been posted on the VSBEC Placement Portal.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px 0; color: #64748b;">Company:</td><td style="padding: 8px 0; font-weight: 600;">${payload.companyName}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Drive:</td><td style="padding: 8px 0;">${payload.driveName}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Job Role:</td><td style="padding: 8px 0;">${payload.jobRole || 'Software Engineer'}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">CTC:</td><td style="padding: 8px 0;">${payload.ctc || 'As per company norms'}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Location:</td><td style="padding: 8px 0;">${payload.location || 'To be announced'}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Drive Date:</td><td style="padding: 8px 0;">${payload.driveDate}</td></tr>
      </table>
      <p>Please log in to the <strong>VSBEC Placement Portal</strong> to check your eligibility and confirm your participation.</p>
      <p style="font-size: 12px; color: #94a3b8;">V.S.B. Engineering College, Karur · Placement Cell</p>
    </div>
  `
  return { subject, htmlBody }
}

export async function findEligibleStudentsForDrive(payload: DriveEmailPayload): Promise<StudentEmailRecipient[]> {
  const where: any = { placementEligible: true }
  if (payload.eligibleDepartments) {
    const depts = payload.eligibleDepartments.split(',').map((d) => d.trim()).filter(Boolean)
    if (depts.length > 0) where.department = { in: depts }
  }
  if (payload.eligibleYears) {
    const years = payload.eligibleYears.split(',').map((y) => y.trim()).filter(Boolean)
    if (years.length > 0) where.year = { in: years }
  }
  return await db.student.findMany({
    where,
    select: { id: true, registerNumber: true, fullName: true, collegeEmail: true, personalEmail: true, department: true, year: true },
  })
}

// Send an email via the email mini-service (port 3030 through the gateway)
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    const res = await fetch('/api/email-proxy?XTransformPort=3030', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, html }),
    })
    if (!res.ok) {
      console.error(`Email send failed for ${to}: ${res.status}`)
      return false
    }
    return true
  } catch (err) {
    console.error(`Email send error for ${to}:`, err)
    return false
  }
}

export async function sendDriveCreationEmails(payload: DriveEmailPayload): Promise<{ notifiedCount: number; recipients: string[] }> {
  const eligibleStudents = await findEligibleStudentsForDrive(payload)
  if (eligibleStudents.length === 0) {
    return { notifiedCount: 0, recipients: [] }
  }

  // Create in-app Notification records
  await Promise.all(eligibleStudents.map((student) =>
    db.notification.create({
      data: {
        studentId: student.id,
        title: `New Drive: ${payload.companyName} — ${payload.jobRole || 'Software Engineer'}`,
        message: `A new placement drive has been posted. Company: ${payload.companyName}, Role: ${payload.jobRole || 'Software Engineer'}, CTC: ${payload.ctc || 'TBD'}, Date: ${payload.driveDate}.`,
        type: 'DRIVE',
      },
    }).catch(() => null),
  ))

  // Send actual emails via the email mini-service
  for (const student of eligibleStudents) {
    const email = buildDriveEmail(payload, student)
    await sendEmail(student.collegeEmail, email.subject, email.htmlBody)
  }

  // Log the notification
  await db.userActivityLog.create({
    data: {
      userId: 'system',
      userType: 'ADMIN',
      action: 'DRIVE_EMAIL_NOTIFICATION',
      detail: `Notified ${eligibleStudents.length} eligible student(s) about new drive "${payload.driveName}" (${payload.companyName}). Recipients: ${eligibleStudents.map((s) => s.collegeEmail).join(', ').substring(0, 500)}`,
    },
  }).catch(() => {})

  return {
    notifiedCount: eligibleStudents.length,
    recipients: eligibleStudents.map((s) => s.collegeEmail),
  }
}

export async function sendSelectionNotificationToOfficer(params: {
  studentName: string
  registerNumber: string
  department: string
  companyName: string
  jobRole: string
  ctc: string
  driveName: string
}): Promise<void> {
  const officerEmail = 'Vsbec@2027'
  const subject = `[VSBEC Placement] Student Selected: ${params.studentName} → ${params.companyName}`
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #047857;">🎉 Student Selected!</h2>
      <p style="color: #64748b; font-size: 13px;">VSBEC Placement Cell — Selection Notification</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      <table style="width: 100%; border-collapse: collapse;">
        <tr><td style="padding: 8px 0; color: #64748b;">Student Name:</td><td style="padding: 8px 0; font-weight: 600;">${params.studentName}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Register Number:</td><td style="padding: 8px 0;">${params.registerNumber}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Department:</td><td style="padding: 8px 0;">${params.department}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Company:</td><td style="padding: 8px 0; font-weight: 600;">${params.companyName}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Job Role:</td><td style="padding: 8px 0;">${params.jobRole}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">CTC:</td><td style="padding: 8px 0; font-weight: 600; color: #047857;">${params.ctc}</td></tr>
        <tr><td style="padding: 8px 0; color: #64748b;">Drive:</td><td style="padding: 8px 0;">${params.driveName}</td></tr>
      </table>
      <p style="margin-top: 16px;">The student has been marked as SELECTED in the placement portal.</p>
    </div>
  `

  await sendEmail(officerEmail, subject, htmlBody)

  await db.userActivityLog.create({
    data: {
      userId: 'system',
      userType: 'ADMIN',
      action: 'SELECTION_EMAIL_NOTIFICATION',
      detail: `Notified placement officer about selection: ${params.studentName} (${params.registerNumber}) selected for ${params.companyName}. Email sent to: ${officerEmail}`,
    },
  }).catch(() => {})
}
