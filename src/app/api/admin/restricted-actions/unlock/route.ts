import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { logUserActivity, getClientIp, getUserAgent } from '@/lib/activity'

// POST /api/admin/restricted-actions/unlock
//
// Unlocks a student account that was previously locked due to the
// screenshot policy (3 attempts). The admin uses this on the
// "Restricted Actions" page to release the lock so the student can
// log in again.
//
// Body:
//   { studentId: string, action: 'unlock' | 'reset-warnings', reason?: string }
//
// Actions:
//   - 'unlock'         → clear accountLocked, lockedAt, lockedReason AND
//                        reset screenshotAttempts back to 0. The student
//                        can immediately log in again.
//   - 'reset-warnings' → only reset screenshotAttempts back to 0 (does NOT
//                        unlock a locked account). Used to give a student
//                        a fresh start before they hit the 3-attempt lock.
//
// Returns the updated student record.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { studentId, action, reason } = body || {}

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
    }
    if (!['unlock', 'reset-warnings'].includes(action)) {
      return NextResponse.json({ error: 'action must be "unlock" or "reset-warnings"' }, { status: 400 })
    }

    const student = await db.student.findUnique({
      where: { id: studentId },
      select: { id: true, registerNumber: true, fullName: true, collegeEmail: true,
                screenshotAttempts: true, accountLocked: true, lockedReason: true, department: true },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    let updateData: any = {}
    let logDetail = ''

    if (action === 'unlock') {
      updateData = {
        accountLocked: false,
        lockedAt: null,
        lockedReason: null,
        screenshotAttempts: 0,
      }
      logDetail = `Account unlocked by admin — previous reason: ${student.lockedReason || 'unknown'}${reason ? ` — admin note: ${reason}` : ''}`
    } else {
      // reset-warnings
      updateData = {
        screenshotAttempts: 0,
      }
      logDetail = `Screenshot warning counter reset by admin — previous attempts: ${student.screenshotAttempts}${reason ? ` — admin note: ${reason}` : ''}`
    }

    const updated = await db.student.update({
      where: { id: studentId },
      data: updateData,
      select: {
        id: true, registerNumber: true, fullName: true, collegeEmail: true,
        department: true, year: true, section: true,
        screenshotAttempts: true, accountLocked: true, lockedAt: true, lockedReason: true,
      },
    })

    // Audit log
    await logUserActivity({
      userId: 'ADMIN',
      userType: 'ADMIN',
      action: action === 'unlock' ? 'ACCOUNT_UNLOCKED' : 'WARNINGS_RESET',
      detail: `${logDetail} — student: ${student.registerNumber} (${student.fullName})`,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    })

    return NextResponse.json({
      success: true,
      student: updated,
      message:
        action === 'unlock'
          ? `${student.fullName} (${student.registerNumber}) has been unlocked. They can now log in.`
          : `Warning counter reset for ${student.fullName} (${student.registerNumber}).`,
    })
  } catch (error) {
    console.error('Unlock student error:', error)
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 })
  }
}
