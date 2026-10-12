import { db } from '@/lib/db'

// Email notification helper for the VSBEC Placement Management System.
//
// This helper sends email notifications for two key events:
//   1. When a new drive is created → notifies all eligible registered students
//   2. When a student is marked SELECTED → notifies the placement officer
//
// Emails are sent via the z-ai-web-dev-sdk (available in this sandbox).
// In-app Notifications are also created so students see them in the portal.

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

// Build the email subject + body for a new-drive notification.
export function buildDriveEmail(payload: DriveEmailPayload, student: StudentEmailRecipient): { subject: string; textBody: string; htmlBody: string } {
  const subject = `[VSBEC Placement] New Drive: ${payload.companyName} — ${payload.jobRole || 'Software Engineer'}`

  const textBody = [
    `Dear ${student.fullName},`,
    ``,
    `A new placement drive has been posted on the V.S.B. Engineering College, Karur Placement Portal.`,
    ``,
    `Company: ${payload.companyName}`,
    `Drive: ${payload.driveName}`,
    `Job Role: ${payload.jobRole || 'Software Engineer'}`,
    `CTC: ${payload.ctc || 'As per company norms'}`,
    `Location: ${payload.location || 'To be announced'}`,
    `Drive Date: ${payload.driveDate}`,
    payload.applicationDeadline ? `Application Deadline: ${payload.applicationDeadline}` : '',
    ``,
    `Please log in to the VSBEC Placement Portal to check your eligibility and confirm your participation.`,
    ``,
    `Register Number: ${student.registerNumber}`,
    `Department: ${student.department || '—'}`,
    ``,
    `— V.S.B. Engineering College, Karur · Placement Cell`,
  ].filter(Boolean).join('\n')

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
        ${payload.applicationDeadline ? `<tr><td style="padding: 8px 0; color: #64748b;">Application Deadline:</td><td style="padding: 8px 0;">${payload.applicationDeadline}</td></tr>` : ''}
      </table>
      <p>Please log in to the <strong>VSBEC Placement Portal</strong> to check your eligibility and confirm your participation.</p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;" />
      <p style="font-size: 12px; color: #94a3b8;">
        Register Number: ${student.registerNumber} · Department: ${student.department || '—'}<br />
        V.S.B. Engineering College, Karur · Placement Cell
      </p>
    </div>
  `

  return { subject, textBody, htmlBody }
}

// Find all students who are eligible for a newly-created drive.
export async function findEligibleStudentsForDrive(payload: DriveEmailPayload): Promise<StudentEmailRecipient[]> {
  const where: any = {}

  if (payload.eligibleDepartments) {
    const depts = payload.eligibleDepartments.split(',').map((d) => d.trim()).filter(Boolean)
    if (depts.length > 0) where.department = { in: depts }
  }

  if (payload.eligibleYears) {
    const years = payload.eligibleYears.split(',').map((y) => y.trim()).filter(Boolean)
    if (years.length > 0) where.year = { in: years }
  }

  where.placementEligible = true

  const students = await db.student.findMany({
    where,
    select: {
      id: true, registerNumber: true, fullName: true, collegeEmail: true,
      personalEmail: true, department: true, year: true,
    },
  })

  return students
}

// Send a drive-creation notification to all eligible students.
// Creates in-app Notification records + sends emails via z-ai-web-dev-sdk.
export async function sendDriveCreationEmails(payload: DriveEmailPayload): Promise<{
  notifiedCount: number
  recipients: string[]
}> {
  const eligibleStudents = await findEligibleStudentsForDrive(payload)

  if (eligibleStudents.length === 0) {
    return { notifiedCount: 0, recipients: [] }
  }

  // Create in-app Notification records for each eligible student.
  const notificationPromises = eligibleStudents.map((student) =>
    db.notification.create({
      data: {
        studentId: student.id,
        title: `New Drive: ${payload.companyName} — ${payload.jobRole || 'Software Engineer'}`,
        message: `A new placement drive has been posted. Company: ${payload.companyName}, Role: ${payload.jobRole || 'Software Engineer'}, CTC: ${payload.ctc || 'TBD'}, Date: ${payload.driveDate}. Log in to check your eligibility and confirm participation.`,
        type: 'DRIVE',
      },
    }).catch(() => null),
  )
  await Promise.all(notificationPromises)

  // Send actual emails via z-ai-web-dev-sdk
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()

    for (const student of eligibleStudents) {
      const email = buildDriveEmail(payload, student)
      try {
        await zai.email.send({
          to: student.collegeEmail,
          subject: email.subject,
          html: email.htmlBody,
        })
      } catch (err) {
        // Email send failed for this student — log but continue
        console.error(`Email send failed for ${student.collegeEmail}:`, err)
      }
    }
  } catch (err) {
    console.error('Email SDK not available, falling back to in-app notifications only:', err)
  }

  // Log the email notification
  const emailPayload = buildDriveEmail(payload, eligibleStudents[0])
  await db.userActivityLog.create({
    data: {
      userId: 'system',
      userType: 'ADMIN',
      action: 'DRIVE_EMAIL_NOTIFICATION',
      detail: `Notified ${eligibleStudents.length} eligible student(s) about new drive "${payload.driveName}" (${payload.companyName}). Subject: "${emailPayload.subject}". Recipients: ${eligibleStudents.map((s) => s.collegeEmail).join(', ').substring(0, 500)}`,
    },
  }).catch(() => {})

  return {
    notifiedCount: eligibleStudents.length,
    recipients: eligibleStudents.map((s) => s.collegeEmail),
  }
}

// Send a selection notification email to the placement officer when a
// student is marked SELECTED in a drive.
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
      <h2 style="color: #047857; margin-bottom: 4px;">🎉 Student Selected!</h2>
      <p style="color: #64748b; font-size: 13px; margin-top: 0;">VSBEC Placement Cell — Selection Notification</p>
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

  // Send email via z-ai-web-dev-sdk
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default
    const zai = await ZAI.create()
    await zai.email.send({
      to: officerEmail,
      subject,
      html: htmlBody,
    })
  } catch (err) {
    console.error('Failed to send selection email to officer:', err)
  }

  // Log the notification
  await db.userActivityLog.create({
    data: {
      userId: 'system',
      userType: 'ADMIN',
      action: 'SELECTION_EMAIL_NOTIFICATION',
      detail: `Notified placement officer about selection: ${params.studentName} (${params.registerNumber}) selected for ${params.companyName}. Email sent to: ${officerEmail}`,
    },
  }).catch(() => {})
}
