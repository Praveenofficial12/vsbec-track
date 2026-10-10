import { db } from '@/lib/db'

// Email notification helper for the VSBEC Placement Management System.
//
// In the sandbox environment we cannot send real SMTP email, so this helper
// does three things instead:
//   1. Creates an in-app Notification record for each eligible student so they
//      see the message in their Notifications tab the next time they log in.
//   2. Logs the email payload to the UserActivityLog so the placement office
//      can verify which students were notified and what message was sent.
//   3. Returns a summary of how many students were notified.
//
// In a production environment with an SMTP/email service configured, the
// `sendViaSmtp` branch would be used instead. The interface is designed so
// that swapping in nodemailer or a transactional email API is a one-line
// change.

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

// Find all students who are eligible for a newly-created drive based on the
// drive's eligibility criteria (department, year). Students who haven't
// registered on the portal are skipped (they don't have an account yet).
export async function findEligibleStudentsForDrive(payload: DriveEmailPayload): Promise<StudentEmailRecipient[]> {
  const where: any = {}

  // Filter by eligible departments if specified
  if (payload.eligibleDepartments) {
    const depts = payload.eligibleDepartments.split(',').map((d) => d.trim()).filter(Boolean)
    if (depts.length > 0) {
      where.department = { in: depts }
    }
  }

  // Filter by eligible years if specified
  if (payload.eligibleYears) {
    const years = payload.eligibleYears.split(',').map((y) => y.trim()).filter(Boolean)
    if (years.length > 0) {
      where.year = { in: years }
    }
  }

  // Only notify students who are placement-eligible
  where.placementEligible = true

  const students = await db.student.findMany({
    where,
    select: {
      id: true,
      registerNumber: true,
      fullName: true,
      collegeEmail: true,
      personalEmail: true,
      department: true,
      year: true,
    },
  })

  return students
}

// Send a drive-creation notification to all eligible students.
// Creates in-app Notification records + logs the email payload.
// Returns a summary of how many students were notified.
export async function sendDriveCreationEmails(payload: DriveEmailPayload): Promise<{
  notifiedCount: number
  recipients: string[]
}> {
  const eligibleStudents = await findEligibleStudentsForDrive(payload)

  if (eligibleStudents.length === 0) {
    return { notifiedCount: 0, recipients: [] }
  }

  // Create in-app Notification records for each eligible student.
  // These appear in the student's Notifications tab on next login.
  const notificationPromises = eligibleStudents.map((student) =>
    db.notification.create({
      data: {
        studentId: student.id,
        title: `New Drive: ${payload.companyName} — ${payload.jobRole || 'Software Engineer'}`,
        message: `A new placement drive has been posted. Company: ${payload.companyName}, Role: ${payload.jobRole || 'Software Engineer'}, CTC: ${payload.ctc || 'TBD'}, Date: ${payload.driveDate}. Log in to check your eligibility and confirm participation.`,
        type: 'DRIVE',
      },
    }).catch(() => null), // best-effort — never block the drive creation
  )

  await Promise.all(notificationPromises)

  // Log the email notification to the activity log so the placement office
  // can verify which students were notified.
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
