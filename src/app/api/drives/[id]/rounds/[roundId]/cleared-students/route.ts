import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET: Download the list of students who CLEARED a specific round.
// Returns CSV with all student details.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string; roundId: string }> }) {
  try {
    const { id, roundId } = await params

    // Verify the round exists and belongs to this drive
    const round = await db.round.findFirst({
      where: { id: roundId, driveId: id },
      select: { id: true, roundName: true, roundNumber: true },
    })
    if (!round) {
      return NextResponse.json({ error: 'Round not found' }, { status: 404 })
    }

    // Find all round results with status CLEARED for this round,
    // including the student details.
    const results = await db.roundResult.findMany({
      where: { roundId, status: 'CLEARED' },
      include: {
        participation: {
          include: {
            student: {
              select: {
                id: true,
                registerNumber: true,
                fullName: true,
                collegeEmail: true,
                personalEmail: true,
                mobile: true,
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
                skills: true,
                strongSkills: true,
                resumeUrl: true,
                linkedinUrl: true,
                leetcodeUrl: true,
                githubUrl: true,
              },
            },
          },
        },
      },
    })

    // Build CSV
    const headers = [
      'Register Number', 'Full Name', 'College Email', 'Personal Email', 'Mobile',
      'Department', 'Degree', 'Year', 'Section', 'Semester', 'Batch',
      'CGPA', '10th %', '12th %', 'Backlogs', 'History of Arrears', 'Graduation Year',
      'Placement Status', 'Skills', 'Strong Skills', 'Resume URL', 'LinkedIn', 'LeetCode', 'GitHub',
    ]

    const rows = results.map((r) => {
      const s = r.participation.student
      return [
        s.registerNumber, s.fullName, s.collegeEmail, s.personalEmail || '', s.mobile || '',
        s.department || '', s.degree || '', s.year || '', s.section || '', s.semester || '', s.batch || '',
        s.cgpa || '', s.tenthPercentage || '', s.twelfthPercentage || '', s.backlogs, s.historyOfArrears, s.graduationYear || '',
        s.placementStatus, (s.skills || '').replace(/,/g, ';'), (s.strongSkills || '').replace(/,/g, ';'),
        s.resumeUrl || '', s.linkedinUrl || '', s.leetcodeUrl || '', s.githubUrl || '',
      ]
    })

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c || ''}"`).join(','))].join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="round_${round.roundNumber}_${round.roundName.replace(/\s+/g, '_')}_cleared_students.csv"`,
      },
    })
  } catch (error) {
    console.error('Download round cleared students error:', error)
    return NextResponse.json({ error: 'Failed to download students list' }, { status: 500 })
  }
}
