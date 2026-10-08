import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  DEPARTMENT_PASSWORDS,
  DEPARTMENTS,
  validateDepartmentPassword,
} from '@/lib/department-auth'

/**
 * GET /api/admin/department-passwords
 *
 * Returns every department's current official password plus a count of
 * students currently using that password (i.e. registered under that dept).
 */
export async function GET() {
  try {
    // Aggregate student counts per department in one query.
    const grouped = await db.student.groupBy({
      by: ['department'],
      _count: { _all: true },
    })
    const countMap: Record<string, number> = {}
    for (const g of grouped) {
      const key = (g.department || '').toUpperCase()
      countMap[key] = (countMap[key] || 0) + g._count._all
    }

    const departments = DEPARTMENTS.map((dept) => ({
      department: dept,
      password: DEPARTMENT_PASSWORDS[dept],
      studentCount: countMap[dept] || 0,
    }))

    return NextResponse.json({ departments, total: departments.length })
  } catch (error) {
    console.error('Get department passwords error:', error)
    return NextResponse.json({ error: 'Failed to fetch department passwords' }, { status: 500 })
  }
}

/**
 * PUT /api/admin/department-passwords
 *
 * Updates the official password for a single department and cascades the
 * change to every student registered under that department.
 *
 * Body:
 *   { department: string, newPassword: string }
 *
 * Side effects:
 *   - Mutates the in-memory DEPARTMENT_PASSWORDS map (so synchronous
 *     validateDepartmentPassword calls immediately reflect the new value).
 *   - Updates Student.password for every student in that department so their
 *     login still works after the change.
 *   - Writes an AuditLog entry for traceability.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const department = String(body.department || '').toUpperCase().trim()
    const newPassword = String(body.newPassword || '')

    if (!department) {
      return NextResponse.json({ error: 'Department is required' }, { status: 400 })
    }
    if (!newPassword || newPassword.length < 4) {
      return NextResponse.json(
        { error: 'New password must be at least 4 characters long' },
        { status: 400 }
      )
    }
    if (!DEPARTMENT_PASSWORDS[department]) {
      return NextResponse.json(
        { error: `Unknown department: ${department}` },
        { status: 404 }
      )
    }

    const oldPassword = DEPARTMENT_PASSWORDS[department]

    // 1) Update the in-memory registry so synchronous validators see the
    //    new value immediately.
    DEPARTMENT_PASSWORDS[department] = newPassword

    // 2) Cascade to every student registered under this department so their
    //    stored login password matches the new official password.
    const cascade = await db.student.updateMany({
      where: { department: department },
      data: { password: newPassword },
    })

    // 3) Audit trail entry.
    await db.auditLog.create({
      data: {
        adminEmail: 'Vsbec@2027',
        action: 'UPDATE_DEPARTMENT_PASSWORD',
        entity: 'Department',
        entityId: department,
        previousValue: oldPassword,
        newValue: `${newPassword} (cascaded to ${cascade.count} students)`,
      },
    })

    // Sanity check: confirm the new value is reachable via the validator.
    const validated = validateDepartmentPassword(department, newPassword)

    return NextResponse.json({
      success: true,
      department,
      previousPassword: oldPassword,
      newPassword,
      cascadedStudents: cascade.count,
      validated,
    })
  } catch (error) {
    console.error('Update department password error:', error)
    return NextResponse.json({ error: 'Failed to update department password' }, { status: 500 })
  }
}
