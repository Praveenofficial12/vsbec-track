import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'
import { validateDepartmentPassword } from '@/lib/department-auth'
import { logUserActivity, getClientIp, getUserAgent } from '@/lib/activity'

// How long a session is considered "active" without a heartbeat.
// The client heartbeats every ~10s, so 30s gives us plenty of margin
// (a tab that crashed or was closed will have its session auto-expire
// after 30s and the same user can log in elsewhere).
const SESSION_TTL_MS = 30 * 1000

// POST: Student login
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { registerNumber, password } = body

    if (!registerNumber || !password) {
      return NextResponse.json({ error: 'Register number and password required' }, { status: 400 })
    }

    const student = await db.student.findFirst({
      where: {
        OR: [
          { registerNumber: registerNumber.toUpperCase() },
          { collegeEmail: registerNumber.toLowerCase() },
        ],
      },
    })

    if (!student) {
      await logUserActivity({
        userId: registerNumber,
        userType: 'STUDENT',
        action: 'LOGIN_FAILED',
        detail: 'Student record not found',
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      })
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Validate department password on login: the supplied password must match
    // the current official password for the student's department.
    if (!validateDepartmentPassword(student.department || '', password)) {
      await logUserActivity({
        userId: student.registerNumber,
        userType: 'STUDENT',
        action: 'LOGIN_FAILED',
        detail: `Invalid department password for ${student.department || 'unknown'}`,
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      })
      return NextResponse.json(
        { error: 'Invalid department password. Please contact your placement coordinator.' },
        { status: 401 }
      )
    }

    // Defensive: also verify it matches the stored password (in case the dept
    // password was changed via the admin cascade without re-syncing this
    // student record, we still require them to use the latest official one).
    if (student.password !== password) {
      await logUserActivity({
        userId: student.registerNumber,
        userType: 'STUDENT',
        action: 'LOGIN_FAILED',
        detail: 'Stored password mismatch',
        ipAddress: getClientIp(req),
        userAgent: getUserAgent(req),
      })
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Single-session enforcement: if there's already a live session for this
    // student, DELETE the old session and create a new one. This allows the
    // same student to log in on a new window — the old window will be
    // force-logged-out on its next heartbeat (reason: 'replaced').
    const userKey = `STUDENT:${student.registerNumber}`
    await db.sessionTracker.deleteMany({ where: { userKey } }).catch(() => {})

    // Create a fresh session token for this tab.
    const token = randomUUID()
    await db.sessionTracker.create({
      data: { userKey, userType: 'STUDENT', token },
    })

    await logUserActivity({
      userId: student.registerNumber,
      userType: 'STUDENT',
      action: 'LOGIN',
      detail: `Logged in (${student.department || 'unknown'})`,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    })

    return NextResponse.json({
      success: true,
      user: {
        id: student.id,
        registerNumber: student.registerNumber,
        name: student.fullName,
        email: student.collegeEmail,
        role: 'STUDENT',
        department: student.department,
      },
      sessionToken: token,
    })
  } catch (error) {
    console.error('Student login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
