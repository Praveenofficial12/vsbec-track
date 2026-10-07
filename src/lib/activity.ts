// Shared helpers for recording user activity into the UserActivityLog table.
// All auth / tracking API routes funnel through `logUserActivity` so we keep
// IP + user-agent extraction in one place.

import { db } from '@/lib/db'

export type UserActivityAction =
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'REGISTER'
  | 'VISIT'
  | 'LOGOUT'

export interface LogActivityInput {
  userId?: string | null
  userType?: 'STUDENT' | 'ADMIN' | 'UNKNOWN'
  action: UserActivityAction
  detail?: string | null
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Extract the most accurate client IP from a Next.js request. Falls back through
 * the common forwarded headers, then to x-real-ip / x-vercel-forwarded-for.
 */
export function getClientIp(req: Request): string | null {
  const headers = req.headers
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  const vercelFwd = headers.get('x-vercel-forwarded-for')
  if (vercelFwd) return vercelFwd.split(',')[0].trim()
  return null
}

/**
 * Extract the User-Agent header (used for device / browser fingerprinting in
 * audit reports).
 */
export function getUserAgent(req: Request): string | null {
  return req.headers.get('user-agent')
}

/**
 * Persist a single activity row. Failures are swallowed (logged to console)
 * so they never break the calling auth flow.
 */
export async function logUserActivity(input: LogActivityInput): Promise<void> {
  try {
    await db.userActivityLog.create({
      data: {
        userId: input.userId ?? null,
        userType: input.userType ?? 'UNKNOWN',
        action: input.action,
        detail: input.detail ?? null,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    })
  } catch (err) {
    // Activity logging must never throw back to the caller.
    console.error('logUserActivity failed:', err)
  }
}
