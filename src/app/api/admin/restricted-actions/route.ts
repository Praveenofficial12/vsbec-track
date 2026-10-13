import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/restricted-actions
//
// Returns the list of students who have either:
//   - a locked account (accountLocked = true) — these need an admin unlock
//   - one or more screenshot attempts (warning level — not yet locked
//     but on the path to being locked)
//
// The admin uses this list on the "Restricted Actions" page to:
//   - see who is currently locked (with reason + timestamp)
//   - see who has pending warnings
//   - unlock accounts (via the separate POST endpoint)
//   - reset the warning counter for a student
//
// Query params:
//   - filter=locked     → only locked students (default: all restricted)
//   - filter=warned     → only students with warnings (not locked)
//   - filter=all        → both
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const filter = searchParams.get('filter') || 'all'

    const where: any = {}
    if (filter === 'locked') {
      where.accountLocked = true
    } else if (filter === 'warned') {
      where.AND = [
        { accountLocked: false },
        { screenshotAttempts: { gt: 0 } },
      ]
    } else {
      // all → any student with at least one screenshot attempt OR a locked flag
      where.OR = [
        { accountLocked: true },
        { screenshotAttempts: { gt: 0 } },
      ]
    }

    const students = await db.student.findMany({
      where,
      select: {
        id: true,
        registerNumber: true,
        fullName: true,
        collegeEmail: true,
        mobile: true,
        department: true,
        year: true,
        section: true,
        cgpa: true,
        placementStatus: true,
        screenshotAttempts: true,
        accountLocked: true,
        lockedAt: true,
        lockedReason: true,
        updatedAt: true,
      },
      orderBy: [
        { accountLocked: 'desc' },        // locked first
        { screenshotAttempts: 'desc' },     // then by attempt count
        { lockedAt: 'desc' },
      ],
    })

    // Summary counts for the admin dashboard badges
    const totalLocked = await db.student.count({ where: { accountLocked: true } })
    const totalWarned = await db.student.count({
      where: {
        AND: [
          { accountLocked: false },
          { screenshotAttempts: { gt: 0 } },
        ],
      },
    })

    return NextResponse.json({
      students,
      summary: {
        locked: totalLocked,
        warned: totalWarned,
        total: totalLocked + totalWarned,
      },
    })
  } catch (error) {
    console.error('Get restricted actions error:', error)
    return NextResponse.json({ error: 'Failed to fetch restricted actions' }, { status: 500 })
  }
}
