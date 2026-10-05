import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

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
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (student.password !== password) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: student.id,
        registerNumber: student.registerNumber,
        name: student.fullName,
        email: student.collegeEmail,
        role: 'STUDENT',
      },
    })
  } catch (error) {
    console.error('Student login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
