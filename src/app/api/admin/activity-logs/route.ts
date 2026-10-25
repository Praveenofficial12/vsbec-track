import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/admin/activity-logs
 *
 * Returns user activity logs as JSON (default) or CSV (?format=csv).
 *
 * Query params:
 *   format       - 'csv' to download as CSV, otherwise JSON
 *   action       - filter by action (LOGIN, LOGIN_FAILED, REGISTER, VISIT, LOGOUT)
 *   userType     - filter by user type (STUDENT, ADMIN, UNKNOWN)
 *   userId       - filter by exact user id (register number / email)
 *   search       - case-insensitive substring match on userId / detail / userAgent
 *   limit        - default 500
 *   offset       - default 0
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'json'
    const action = searchParams.get('action')
    const userType = searchParams.get('userType')
    const userId = searchParams.get('userId')
    const search = searchParams.get('search')
    const limit = Math.min(parseInt(searchParams.get('limit') || '500'), 5000)
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (action && action !== 'ALL') where.action = action
    if (userType && userType !== 'ALL') where.userType = userType
    if (userId) where.userId = userId
    if (search) {
      where.OR = [
        { userId: { contains: search } },
        { detail: { contains: search } },
        { userAgent: { contains: search } },
        { ipAddress: { contains: search } },
      ]
    }

    const [logs, total] = await Promise.all([
      db.userActivityLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
      }),
      db.userActivityLog.count({ where }),
    ])

    if (format === 'csv') {
      const header = [
        'id',
        'timestamp',
        'userId',
        'userType',
        'action',
        'detail',
        'ipAddress',
        'userAgent',
      ]
      const escape = (val: unknown) => {
        if (val === null || val === undefined) return ''
        const s = String(val)
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
        return s
      }
      const rows = logs.map((l) =>
        [
          l.id,
          l.timestamp instanceof Date ? l.timestamp.toISOString() : l.timestamp,
          l.userId ?? '',
          l.userType,
          l.action,
          l.detail ?? '',
          l.ipAddress ?? '',
          l.userAgent ?? '',
        ]
          .map(escape)
          .join(',')
      )
      const csv = [header.join(','), ...rows].join('\n')
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="activity-logs-${Date.now()}.csv"`,
        },
      })
    }

    return NextResponse.json({ logs, total })
  } catch (error) {
    console.error('Get activity logs error:', error)
    return NextResponse.json({ error: 'Failed to fetch activity logs' }, { status: 500 })
  }
}

// DELETE: Delete a single activity log or all logs.
// Query params:
//   id=all  → delete ALL activity logs
//   id=<id> → delete a single log entry
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'id is required (use "all" to delete all)' }, { status: 400 })
    }

    if (id === 'all') {
      const result = await db.userActivityLog.deleteMany({})
      return NextResponse.json({ success: true, deleted: result.count })
    }

    await db.userActivityLog.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete activity log error:', error)
    return NextResponse.json({ error: 'Failed to delete activity log' }, { status: 500 })
  }
}
