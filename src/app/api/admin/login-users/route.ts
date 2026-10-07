import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * GET /api/admin/login-users
 *
 * Returns every login-capable user in the system:
 *   - Students (Student.password acts as their login password)
 *   - Admins   (AdminUser.password)
 *
 * Output formats:
 *   ?format=json (default) -> { users: [...], total }
 *   ?format=csv             -> CSV file download
 *
 * 30 columns are emitted (uniform across students & admins):
 *   role, userId, fullName, collegeEmail, personalEmail, mobile, password,
 *   department, degree, year, section, semester, batch, cgpa,
 *   tenthPercentage, twelfthPercentage, backlogs, historyOfArrears,
 *   graduationYear, placementStatus, placementEligible,
 *   preferredRole, preferredDomain, interestedTechs, preferredLocation,
 *   linkedinUrl, leetcodeUrl, githubUrl, resumeUrl, createdAt
 *
 * For admin rows, all student-only fields (department, year, cgpa, etc.)
 * are emitted as empty strings.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const format = searchParams.get('format') || 'json'
    const role = searchParams.get('role') // 'STUDENT' | 'ADMIN'
    const search = searchParams.get('search')

    // Fetch students & admins in parallel
    const [students, admins] = await Promise.all([
      db.student.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          registerNumber: true,
          fullName: true,
          collegeEmail: true,
          personalEmail: true,
          mobile: true,
          password: true,
          department: true,
          degree: true,
          year: true,
          section: true,
          semester: true,
          batch: true,
          cgpa: true,
          tenthPercentage: true,
          twelfthPercentage: true,
          backlogs: true,
          historyOfArrears: true,
          graduationYear: true,
          placementStatus: true,
          placementEligible: true,
          preferredRole: true,
          preferredDomain: true,
          interestedTechs: true,
          preferredLocation: true,
          linkedinUrl: true,
          leetcodeUrl: true,
          githubUrl: true,
          resumeUrl: true,
          createdAt: true,
        },
      }),
      db.adminUser.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          password: true,
          createdAt: true,
        },
      }),
    ])

    type UserRow = Record<string, string | number | boolean | null>

    const studentRows: UserRow[] = students.map((s) => ({
      role: 'STUDENT',
      userId: s.registerNumber,
      fullName: s.fullName,
      collegeEmail: s.collegeEmail,
      personalEmail: s.personalEmail ?? '',
      mobile: s.mobile ?? '',
      password: s.password,
      department: s.department ?? '',
      degree: s.degree ?? '',
      year: s.year ?? '',
      section: s.section ?? '',
      semester: s.semester ?? '',
      batch: s.batch ?? '',
      cgpa: s.cgpa ?? '',
      tenthPercentage: s.tenthPercentage ?? '',
      twelfthPercentage: s.twelfthPercentage ?? '',
      backlogs: s.backlogs ?? 0,
      historyOfArrears: s.historyOfArrears ?? 0,
      graduationYear: s.graduationYear ?? '',
      placementStatus: s.placementStatus,
      placementEligible: s.placementEligible,
      preferredRole: s.preferredRole ?? '',
      preferredDomain: s.preferredDomain ?? '',
      interestedTechs: s.interestedTechs ?? '',
      preferredLocation: s.preferredLocation ?? '',
      linkedinUrl: s.linkedinUrl ?? '',
      leetcodeUrl: s.leetcodeUrl ?? '',
      githubUrl: s.githubUrl ?? '',
      resumeUrl: s.resumeUrl ?? '',
      createdAt: s.createdAt instanceof Date ? s.createdAt.toISOString() : s.createdAt,
    }))

    const adminRows: UserRow[] = admins.map((a) => ({
      role: 'ADMIN',
      userId: a.email,
      fullName: a.name,
      collegeEmail: a.email,
      personalEmail: '',
      mobile: '',
      password: a.password,
      department: '',
      degree: '',
      year: '',
      section: '',
      semester: '',
      batch: '',
      cgpa: '',
      tenthPercentage: '',
      twelfthPercentage: '',
      backlogs: '',
      historyOfArrears: '',
      graduationYear: '',
      placementStatus: '',
      placementEligible: '',
      preferredRole: '',
      preferredDomain: '',
      interestedTechs: '',
      preferredLocation: '',
      linkedinUrl: '',
      leetcodeUrl: '',
      githubUrl: '',
      resumeUrl: '',
      createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
    }))

    let users: UserRow[] = [...studentRows, ...adminRows]

    // Optional filters
    if (role && role !== 'ALL') {
      users = users.filter((u) => u.role === role)
    }
    if (search) {
      const q = search.toLowerCase()
      users = users.filter((u) =>
        String(u.userId || '')
          .toLowerCase()
          .includes(q) ||
        String(u.fullName || '')
          .toLowerCase()
          .includes(q) ||
        String(u.collegeEmail || '')
          .toLowerCase()
          .includes(q)
      )
    }

    if (format === 'csv') {
      const headers = [
        'role',
        'userId',
        'fullName',
        'collegeEmail',
        'personalEmail',
        'mobile',
        'password',
        'department',
        'degree',
        'year',
        'section',
        'semester',
        'batch',
        'cgpa',
        'tenthPercentage',
        'twelfthPercentage',
        'backlogs',
        'historyOfArrears',
        'graduationYear',
        'placementStatus',
        'placementEligible',
        'preferredRole',
        'preferredDomain',
        'interestedTechs',
        'preferredLocation',
        'linkedinUrl',
        'leetcodeUrl',
        'githubUrl',
        'resumeUrl',
        'createdAt',
      ]
      const escape = (val: unknown) => {
        if (val === null || val === undefined) return ''
        const s = String(val)
        if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
        return s
      }
      const rows = users.map((u) => headers.map((h) => escape(u[h])).join(','))
      const csv = [headers.join(','), ...rows].join('\n')
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="login-users-${Date.now()}.csv"`,
        },
      })
    }

    return NextResponse.json({ users, total: users.length })
  } catch (error) {
    console.error('Get login users error:', error)
    return NextResponse.json({ error: 'Failed to fetch login users' }, { status: 500 })
  }
}
