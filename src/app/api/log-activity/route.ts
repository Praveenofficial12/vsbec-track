import { NextRequest, NextResponse } from 'next/server'
import { logUserActivity, getClientIp, getUserAgent, UserActivityAction } from '@/lib/activity'

/**
 * POST /api/log-activity
 *
 * Generic activity logging endpoint called by the SPA whenever a meaningful
 * user action occurs (page visit, logout, custom event). Auth flows (login /
 * register) also call /api/log-activity indirectly through the shared helper
 * `logUserActivity` so we never lose those events either.
 *
 * Body:
 *   {
 *     userId?:   string  // register number (student) or email (admin)
 *     userType?: 'STUDENT' | 'ADMIN' | 'UNKNOWN'
 *     action:    'LOGIN' | 'LOGIN_FAILED' | 'REGISTER' | 'VISIT' | 'LOGOUT'
 *     detail?:   string
 *   }
 *
 * IP and User-Agent are always derived from the request headers server-side
 * so they cannot be spoofed from the client payload.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))
    const { userId, userType, action, detail } = body || {}

    const allowed: UserActivityAction[] = [
      'LOGIN',
      'LOGIN_FAILED',
      'REGISTER',
      'VISIT',
      'LOGOUT',
    ]

    if (!action || !allowed.includes(action)) {
      return NextResponse.json(
        { error: `Invalid action. Allowed: ${allowed.join(', ')}` },
        { status: 400 }
      )
    }

    await logUserActivity({
      userId: userId ?? null,
      userType: userType ?? 'UNKNOWN',
      action,
      detail: detail ?? null,
      ipAddress: getClientIp(req),
      userAgent: getUserAgent(req),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('log-activity error:', error)
    return NextResponse.json({ error: 'Failed to log activity' }, { status: 500 })
  }
}
