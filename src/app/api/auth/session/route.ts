import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Session lifetime: a session is valid for at most 1 hour from its creation,
// regardless of how recently the heartbeat was received. This enforces a
// hard expiry so users are forced to re-login after 1 hour.
const SESSION_MAX_AGE_MS = 60 * 60 * 1000 // 1 hour
// Heartbeat grace period: if no heartbeat arrives within 2 minutes, the
// session is considered stale (tab closed / crashed) and expires early.
// We use 2 minutes (not 30s) so that browser refreshes — which briefly
// interrupt the heartbeat — don't log the user out.
const SESSION_HEARTBEAT_TTL_MS = 2 * 60 * 1000 // 2 minutes

// GET: Validate a session token.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) {
      return NextResponse.json({ valid: false, reason: 'invalid' }, { status: 400 })
    }

    const session = await db.sessionTracker.findUnique({
      where: { token },
      select: { userKey: true, lastSeen: true, token: true, createdAt: true },
    })

    if (!session) {
      return NextResponse.json({ valid: false, reason: 'invalid' })
    }

    const now = Date.now()

    // Hard expiry: session is invalid if more than 1 hour has passed since creation.
    const ageSinceCreation = now - session.createdAt.getTime()
    if (ageSinceCreation > SESSION_MAX_AGE_MS) {
      await db.sessionTracker.delete({ where: { token } }).catch(() => {})
      return NextResponse.json({ valid: false, reason: 'expired' })
    }

    // Heartbeat expiry: session is invalid if no heartbeat in the last 30s.
    const ageSinceHeartbeat = now - session.lastSeen.getTime()
    if (ageSinceHeartbeat > SESSION_HEARTBEAT_TTL_MS) {
      await db.sessionTracker.delete({ where: { token } }).catch(() => {})
      return NextResponse.json({ valid: false, reason: 'expired' })
    }

    // Check whether this session is still the "active" one for this user.
    const latest = await db.sessionTracker.findFirst({
      where: { userKey: session.userKey },
      orderBy: { lastSeen: 'desc' },
      select: { token: true, lastSeen: true },
    })
    if (latest && latest.token !== session.token && (now - latest.lastSeen.getTime()) <= SESSION_HEARTBEAT_TTL_MS) {
      await db.sessionTracker.delete({ where: { token } }).catch(() => {})
      return NextResponse.json({ valid: false, reason: 'replaced' })
    }

    // Return the remaining session time so the client can show a countdown
    // or warn the user before expiry.
    const remainingMs = SESSION_MAX_AGE_MS - ageSinceCreation
    return NextResponse.json({ valid: true, remainingMs })
  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json({ valid: false, reason: 'error' }, { status: 500 })
  }
}

// POST: Heartbeat — refresh the lastSeen timestamp for a session token.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = body?.token
    if (!token) {
      return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 })
    }

    const session = await db.sessionTracker.findUnique({
      where: { token },
      select: { userKey: true, token: true, createdAt: true },
    })

    if (!session) {
      return NextResponse.json({ ok: false, reason: 'invalid' })
    }

    const now = Date.now()

    // Hard expiry: 1 hour from creation.
    if (now - session.createdAt.getTime() > SESSION_MAX_AGE_MS) {
      await db.sessionTracker.delete({ where: { token } }).catch(() => {})
      return NextResponse.json({ ok: false, reason: 'expired' })
    }

    // If another tab logged in with the same userKey more recently, this
    // session has been replaced — tell the client to log out.
    const latest = await db.sessionTracker.findFirst({
      where: { userKey: session.userKey },
      orderBy: { lastSeen: 'desc' },
      select: { token: true, lastSeen: true },
    })
    if (latest && latest.token !== session.token && (now - latest.lastSeen.getTime()) <= SESSION_HEARTBEAT_TTL_MS) {
      await db.sessionTracker.delete({ where: { token } }).catch(() => {})
      return NextResponse.json({ ok: false, reason: 'replaced' })
    }

    // Refresh the heartbeat.
    await db.sessionTracker.update({
      where: { token },
      data: { lastSeen: new Date() },
    })

    const remainingMs = SESSION_MAX_AGE_MS - (now - session.createdAt.getTime())
    return NextResponse.json({ ok: true, remainingMs })
  } catch (error) {
    console.error('Session heartbeat error:', error)
    return NextResponse.json({ ok: false, reason: 'error' }, { status: 500 })
  }
}

// DELETE: Logout — remove the session row for the given token.
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) {
      return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 })
    }
    await db.sessionTracker.deleteMany({ where: { token } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Session logout error:', error)
    return NextResponse.json({ ok: false, reason: 'error' }, { status: 500 })
  }
}
