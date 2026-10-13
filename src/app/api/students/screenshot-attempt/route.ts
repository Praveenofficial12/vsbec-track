import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logUserActivity, getClientIp, getUserAgent } from '@/lib/activity'

// POST /api/students/screenshot-attempt
//
// Called by the file viewer iframe (inside /api/files/view) every time the
// student presses the PrintScreen key while a file is open. The endpoint
// implements the "3-strike" account-protection policy:
//
//   - Attempt 1 → WARNING  ("1 of 2 warnings — please stop")
//   - Attempt 2 → WARNING  ("2 of 2 warnings — next attempt will lock your account")
//   - Attempt 3 → LOCK     (accountLocked=true, screenshotAttempts=3,
//                            the student is force-logged-out on next heartbeat,
//                            admin must unlock via the Restricted Actions page)
//
// The student is identified by their session token (sent in the Authorization
// header by the file viewer iframe). This is the same token the heartbeat
// uses, so we can resolve it back to a Student record via SessionTracker.
//
// Body:
//   { fileId?: string, fileName?: string }   (optional — for the audit log)
//
// Response (200):
//   {
//     attempt: 1|2|3,
//     action: 'OK'|'WARNING'|'LOCKED',
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
      select: { id: true, registerNumber: true, fullName: true, collegeEmail: true,
                screenshotAttempts: true, accountLocked: true, department: true },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // If the account is already locked, just return that status — don't
    // increment further.
    if (student.accountLocked) {
      return NextResponse.json({
        attempt: student.screenshotAttempts,
        action: 'LOCKED',
        remaining: 0,
        message: 'Your account is locked. Please contact the placement office to unlock it.',
        locked: true,
      })
    }

    const body = await req.json().catch(() => ({} as any))
    const fileId = body?.fileId || undefined
    const fileName = body?.fileName || undefined

    const newAttempts = student.screenshotAttempts + 1
    let action: 'OK' | 'WARNING' | 'LOCKED' = 'OK'
    let message = ''
    let locked = false

    if (newAttempts >= 3) {
      // 3rd attempt → lock the account.
      await db.student.update({
        where: { id: student.id },
        data: {
          screenshotAttempts: newAttempts,
          accountLocked: true,
          lockedAt: new Date(),
          lockedReason: `Screenshot policy violation — ${newAttempts} attempts (last on file: ${fileName || 'unknown'})`,
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
      message = 'Your account has been locked after 3 screenshot attempts. The placement office has been notified. Please contact the admin to unlock your account.'
    } else if (newAttempts === 2) {
      // 2nd attempt → second warning.
      await db.student.update({
        where: { id: student.id },
        data: { screenshotAttempts: newAttempts },
      })
      action = 'WARNING'
      message = `WARNING 2 of 2: Screenshot attempt detected. ONE more attempt will LOCK your account and you will be logged out. Please close the file viewer immediately.`
    } else {
      // 1st attempt → first warning.
      await db.student.update({
        where: { id: student.id },
        data: { screenshotAttempts: newAttempts },
      })
      action = 'WARNING'
      message = `WARNING 1 of 2: Screenshot attempt detected. Please do not try to capture screen content. Two more attempts will lock your account.`
    }

    // Always log the attempt so there's an audit trail.
    await logUserActivity({
      userId: registerNumber,
      userType: 'STUDENT',
      action: action === 'LOCKED' ? 'ACCOUNT_LOCKED' : 'SCREENSHOT_ATTEMPT',
      detail: `Attempt ${newAttempts}/3 — file: ${fileName || 'unknown'} — action: ${action}`,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    })

    return NextResponse.json({
      attempt: newAttempts,
      action,
      remaining: Math.max(0, 3 - newAttempts),
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
