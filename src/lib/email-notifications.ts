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
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;min-height:100vh;">
        <tr>
          <td align="center" style="padding:32px 16px;">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(4,120,87,0.15);max-width:600px;">
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#047857 0%,#0d9488 100%);padding:32px 40px;text-align:center;">
                  <h1 style="color:#ffffff;font-size:22px;margin:0;font-weight:700;">V.S.B. Engineering College, Karur</h1>
                  <p style="color:#a7f3d0;font-size:13px;margin:4px 0 0 0;">Placement Cell · New Drive Notification</p>
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding:32px 40px;">
                  <p style="font-size:16px;color:#1e293b;margin:0 0 8px 0;">Dear <strong>${student.fullName}</strong>,</p>
                  <p style="font-size:14px;color:#475569;margin:0 0 24px 0;">A new placement drive has been posted on the VSBEC Placement Portal. Here are the details:</p>

                  <!-- Drive Details Card -->
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;margin:0 0 24px 0;">
                    <tr>
                      <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                        <span style="font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Company</span><br>
                        <span style="font-size:18px;font-weight:700;color:#047857;">${payload.companyName}</span>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 20px;border-bottom:1px solid #e2e8f0;">
                        <table width="100%">
                          <tr>
                            <td style="width:50%;padding-right:12px;">
                              <span style="font-size:11px;color:#64748b;text-transform:uppercase;">Drive</span><br>
                              <span style="font-size:14px;color:#1e293b;font-weight:600;">${payload.driveName}</span>
                            </td>
                            <td style="width:50%;">
                              <span style="font-size:11px;color:#64748b;text-transform:uppercase;">Job Role</span><br>
                              <span style="font-size:14px;color:#1e293b;font-weight:600;">${payload.jobRole || 'Software Engineer'}</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:12px 20px;border-bottom:1px solid #e2e8f0;">
                        <table width="100%">
                          <tr>
                            <td style="width:33%;padding-right:8px;">
                              <span style="font-size:11px;color:#64748b;text-transform:uppercase;">CTC</span><br>
                              <span style="font-size:14px;color:#047857;font-weight:700;">${payload.ctc || 'As per norms'}</span>
                            </td>
                            <td style="width:33%;padding-right:8px;">
                              <span style="font-size:11px;color:#64748b;text-transform:uppercase;">Location</span><br>
                              <span style="font-size:13px;color:#1e293b;">${payload.location || 'TBA'}</span>
                            </td>
                            <td style="width:33%;">
                              <span style="font-size:11px;color:#64748b;text-transform:uppercase;">Drive Date</span><br>
                              <span style="font-size:13px;color:#1e293b;">${payload.driveDate}</span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    ${payload.eligibleYears ? `<tr><td style="padding:12px 20px;"><span style="font-size:11px;color:#64748b;text-transform:uppercase;">Eligible Years</span><br><span style="font-size:13px;color:#1e293b;">${payload.eligibleYears}</span></td></tr>` : ''}
                  </table>

                  <!-- CTA -->
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td align="center" style="padding:8px 0 24px 0;">
                        <table cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="background:linear-gradient(135deg,#047857,#0d9488);border-radius:8px;padding:14px 40px;">
                              <a href="#" style="color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;">Log in to Check Eligibility</a>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="font-size:13px;color:#64748b;margin:0;">Please log in to the <strong>VSBEC Placement Portal</strong> to check your eligibility and confirm your participation.</p>
                  <p style="font-size:12px;color:#94a3b8;margin:16px 0 0 0;">Register Number: ${student.registerNumber} · Department: ${student.department || '—'}</p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background:#1e293b;padding:20px 40px;text-align:center;">
                  <p style="color:#94a3b8;font-size:11px;margin:0;">© ${new Date().getFullYear()} V.S.B. Engineering College, Karur · Placement Cell</p>
                  <p style="color:#64748b;font-size:10px;margin:4px 0 0 0;">This is an automated email. Please do not reply.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
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
