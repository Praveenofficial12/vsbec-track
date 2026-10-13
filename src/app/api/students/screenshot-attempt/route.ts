import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logUserActivity, getClientIp, getUserAgent } from '@/lib/activity'

// POST /api/students/screenshot-attempt
//
// Called by the student portal whenever the PrintScreen key is pressed
// (the listener is attached globally in StudentLayout so it works on every
// student page, not just inside the file viewer iframe).
//
// Implements the "3-strike" account-protection policy:
//
//   - Attempt 1 → WARNING  ("Screenshot attempt 1 of 3 detected...")
//   - Attempt 2 → WARNING  ("Screenshot attempt 2 of 3 detected. ONE more attempt will LOCK your account.")
//   - Attempt 3 → LOCK     (accountLocked=true, screenshotAttempts=3,
//                            the student is force-logged-out on next heartbeat,
//                            admin is notified via AuditLog, admin must unlock
//                            via the Restricted Actions page)
//
// The policy can be toggled on/off by the admin from Settings → Screenshot
// Policy. When disabled, this endpoint returns a no-op success response.
//
// The student is identified by their session token (Authorization: Bearer).
//
// Body:
//   { fileId?: string, fileName?: string, page?: string }   (optional — for the audit log)
//
// Response (200):
//   {
//     enabled: boolean,
//     attempt: number,
//     maxAttempts: number,
//     action: 'DISABLED'|'WARNING'|'LOCKED',
//     remaining: number,
//     message: string,
//     locked: boolean
//   }
export async function POST(req: NextRequest) {
  try {
    // Resolve the student from the session token header.
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : req.headers.get('x-session-token') || ''

    if (!token) {
      return NextResponse.json(
        { error: 'No session token supplied' },
        { status: 401 },
      )
    }

    const session = await db.sessionTracker.findFirst({
      where: { token },
      select: { id: true, userKey: true, userType: true },
    })

    if (!session || session.userType !== 'STUDENT') {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 },
      )
    }

    // userKey format: "STUDENT:<registerNumber>"
    const registerNumber = session.userKey.replace(/^STUDENT:/, '')
    const student = await db.student.findFirst({
      where: { registerNumber },
      select: {
        id: true, registerNumber: true, fullName: true, collegeEmail: true,
        department: true, year: true, section: true,
        screenshotAttempts: true, accountLocked: true,
      },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Read the screenshot policy toggle from PlacementRule (singleton row).
    const rule = await db.placementRule.findFirst({
      select: { id: true, screenshotPolicyEnabled: true, screenshotMaxAttempts: true },
    })
    const policyEnabled = rule?.screenshotPolicyEnabled ?? true
    const maxAttempts = rule?.screenshotMaxAttempts ?? 3

    // If the policy is disabled, return a no-op so the client doesn't show
    // warnings. The PrintScreen keypress is still blocked at the browser
    // level to discourage capturing, but no counter is incremented.
    if (!policyEnabled) {
      return NextResponse.json({
        enabled: false,
        attempt: 0,
        maxAttempts,
        action: 'DISABLED',
        remaining: maxAttempts,
        message: 'Screenshot policy is currently disabled by the admin.',
        locked: false,
      })
    }

    // If the account is already locked, just return that status — don't
    // increment further.
    if (student.accountLocked) {
      return NextResponse.json({
        enabled: true,
        attempt: student.screenshotAttempts,
        maxAttempts,
        action: 'LOCKED',
        remaining: 0,
        message: 'Your account has been locked due to restrictions. Please call the admin to unlock the account.',
        locked: true,
      })
    }

    const body = await req.json().catch(() => ({} as any))
    const fileId = body?.fileId || undefined
    const fileName = body?.fileName || undefined
    const page = body?.page || undefined

    const newAttempts = student.screenshotAttempts + 1
    let action: 'WARNING' | 'LOCKED' = 'WARNING'
    let message = ''
    let locked = false

    if (newAttempts >= maxAttempts) {
      // Final attempt → lock the account.
      await db.student.update({
        where: { id: student.id },
        data: {
          screenshotAttempts: newAttempts,
          accountLocked: true,
          lockedAt: new Date(),
          lockedReason: `Screenshot policy violation — ${newAttempts} attempts (last on file: ${fileName || 'unknown'}, page: ${page || 'unknown'})`,
        },
      })
      // Force-logout every active session for this student so they can't
      // keep browsing. The heartbeat on their other tabs will detect the
      // missing session and bounce them to the login page.
      await db.sessionTracker.deleteMany({
        where: { userKey: `STUDENT:${registerNumber}` },
      }).catch(() => {})

      action = 'LOCKED'
      locked = true
      message = 'Your account has been locked due to restrictions. Please call the admin to unlock the account.'

      // Notify the admin — create an AuditLog entry that surfaces on the
      // admin dashboard "Recent Activity" widget and the Restricted Actions
      // page (locked count badge in the sidebar).
      await db.auditLog.create({
        data: {
          adminEmail: 'system@vsbec.edu',
          action: 'ACCOUNT_LOCKED',
          entity: 'Student',
          entityId: student.id,
          studentName: `${student.fullName} (${student.registerNumber})`,
          companyName: undefined,
          driveName: undefined,
          previousValue: `Attempts: ${newAttempts - 1}`,
          newValue: `LOCKED — ${newAttempts}/${maxAttempts} screenshot attempts (file: ${fileName || 'unknown'}, page: ${page || 'unknown'})`,
        },
      }).catch(() => {})
    } else {
      // Warning attempt — increment counter and show a message that
      // includes the attempt count and the consequences of the next one.
      await db.student.update({
        where: { id: student.id },
        data: { screenshotAttempts: newAttempts },
      })
      action = 'WARNING'
      const remaining = Math.max(0, maxAttempts - newAttempts)
      if (remaining === 1) {
        // Next attempt will lock — strong warning.
        message = `⚠️ Screenshot attempt ${newAttempts} of ${maxAttempts} detected.\n\nWARNING: This is your FINAL warning. ONE more screenshot attempt will LOCK your account immediately and you will be logged out. You will need to contact the admin to unlock your account.\n\nPlease close the file viewer and stop attempting to capture screen content.`
      } else {
        // Still has >1 attempts left.
        message = `⚠️ Screenshot attempt ${newAttempts} of ${maxAttempts} detected.\n\nAttempts remaining before lock: ${remaining}.\n\nPlease do not try to capture screen content. Repeated attempts will lock your account and you will need admin permission to unlock it.`
      }
    }

    // Always log the attempt so there's an audit trail.
    await logUserActivity({
      userId: registerNumber,
      userType: 'STUDENT',
      action: action === 'LOCKED' ? 'ACCOUNT_LOCKED' : 'SCREENSHOT_ATTEMPT',
      detail: `Attempt ${newAttempts}/${maxAttempts} — file: ${fileName || 'unknown'}, page: ${page || 'unknown'} — action: ${action}`,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    })

    return NextResponse.json({
      enabled: true,
      attempt: newAttempts,
      maxAttempts,
      action,
      remaining: Math.max(0, maxAttempts - newAttempts),
      message,
      locked,
    })
  } catch (error) {
    console.error('Screenshot attempt error:', error)
    return NextResponse.json(
      { error: 'Failed to record screenshot attempt' },
      { status: 500 },
    )
  }
}

// GET /api/students/screenshot-attempt?token=...
//
// Returns the current screenshot policy state + the student's current
// attempt count. Used by the student layout to decide whether to attach
// the PrintScreen listener and to show the current attempt count in a
// toast on page load.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token') || ''

    const rule = await db.placementRule.findFirst({
      select: { screenshotPolicyEnabled: true, screenshotMaxAttempts: true },
    })
    const policyEnabled = rule?.screenshotPolicyEnabled ?? true
    const maxAttempts = rule?.screenshotMaxAttempts ?? 3

    // If no token, just return the policy state (used by the student layout
    // to decide whether to attach the listener).
    if (!token) {
      return NextResponse.json({
        enabled: policyEnabled,
        maxAttempts,
        attempt: 0,
        locked: false,
      })
    }

    const session = await db.sessionTracker.findFirst({
      where: { token },
      select: { userKey: true, userType: true },
    })

    if (!session || session.userType !== 'STUDENT') {
      return NextResponse.json({
        enabled: policyEnabled,
        maxAttempts,
        attempt: 0,
        locked: false,
      })
    }

    const registerNumber = session.userKey.replace(/^STUDENT:/, '')
    const student = await db.student.findFirst({
      where: { registerNumber },
      select: { screenshotAttempts: true, accountLocked: true },
    })

    return NextResponse.json({
      enabled: policyEnabled,
      maxAttempts,
      attempt: student?.screenshotAttempts || 0,
      locked: student?.accountLocked || false,
    })
  } catch (error) {
    console.error('Screenshot policy GET error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch screenshot policy state' },
      { status: 500 },
    )
  }
}
