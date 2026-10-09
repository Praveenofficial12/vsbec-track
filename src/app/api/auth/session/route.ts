import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// TTL must match the value used by the login endpoints. The client heartbeats
// every ~10s; a session is considered expired if no heartbeat has arrived in
// the last 30s.
const SESSION_TTL_MS = 30 * 1000

// GET: Validate a session token.
// Query params: token=<sessionToken>
// Returns { valid: true } if the session exists AND has a fresh heartbeat.
// Returns { valid: false, reason: 'expired' | 'invalid' | 'replaced' } otherwise.
//   - 'expired'   → no heartbeat in the last 30s (treat as logged out)
//   - 'invalid'   → token not found in the DB at all
//   - 'replaced'  → another tab logged in with the same userKey, replacing
//                   this session (we detect this by comparing this token
//                   against the most-recently-seen token for the same userKey)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const token = searchParams.get('token')
    if (!token) {
      return NextResponse.json({ valid: false, reason: 'invalid' }, { status: 400 })
    }

    const session = await db.sessionTracker.findUnique({
      where: { token },
      select: { userKey: true, lastSeen: true, token: true },
    })

    if (!session) {
      return NextResponse.json({ valid: false, reason: 'invalid' })
    }

    const now = Date.now()
    const age = now - session.lastSeen.getTime()
    if (age > SESSION_TTL_MS) {
      // Session expired — treat as logged out. Clean up the stale row too.
      await db.sessionTracker.delete({ where: { token } }).catch(() => {})
      return NextResponse.json({ valid: false, reason: 'expired' })
    }

    // Check whether this session is still the "active" one for this user.
    // If another tab logged in with the same userKey more recently, this
    // session has been replaced and should be forced out.
    const latest = await db.sessionTracker.findFirst({
      where: { userKey: session.userKey },
      orderBy: { lastSeen: 'desc' },
      select: { token: true, lastSeen: true },
    })
    if (latest && latest.token !== session.token && (now - latest.lastSeen.getTime()) <= SESSION_TTL_MS) {
      // Another live session for the same user exists → this one is replaced.
      // Delete the replaced session row so it can't be re-validated.
      await db.sessionTracker.delete({ where: { token } }).catch(() => {})
      return NextResponse.json({ valid: false, reason: 'replaced' })
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Session validation error:', error)
    return NextResponse.json({ valid: false, reason: 'error' }, { status: 500 })
  }
}

// POST: Heartbeat — refresh the lastSeen timestamp for a session token.
// Body: { token: string }
// Returns { ok: true } on success.
// Returns { ok: false, reason: 'invalid' | 'replaced' } if the session is no
//   longer the active one (in which case the client should log out).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = body?.token
    if (!token) {
      return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 })
    }

    const session = await db.sessionTracker.findUnique({
      where: { token },
      select: { userKey: true, token: true },
    })

    if (!session) {
      return NextResponse.json({ ok: false, reason: 'invalid' })
    }

    // If another tab logged in with the same userKey more recently, this
    // session has been replaced — tell the client to log out.
    const now = Date.now()
    const latest = await db.sessionTracker.findFirst({
      where: { userKey: session.userKey },
      orderBy: { lastSeen: 'desc' },
      select: { token: true, lastSeen: true },
    })
    if (latest && latest.token !== session.token && (now - latest.lastSeen.getTime()) <= SESSION_TTL_MS) {
      await db.sessionTracker.delete({ where: { token } }).catch(() => {})
      return NextResponse.json({ ok: false, reason: 'replaced' })
    }

    // Refresh the heartbeat.
    await db.sessionTracker.update({
      where: { token },
      data: { lastSeen: new Date() },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Session heartbeat error:', error)
    return NextResponse.json({ ok: false, reason: 'error' }, { status: 500 })
  }
}

// DELETE: Logout — remove the session row for the given token.
// Query params: token=<sessionToken>
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
