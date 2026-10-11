import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST: Add a project to a student
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const project = await db.project.create({
      data: {
        studentId: body.studentId,
        name: body.name,
        description: body.description,
        technologies: body.technologies,
        projectType: body.projectType,
        githubUrl: body.githubUrl,
        liveUrl: body.liveUrl, // live demo link
      },
    })
    return NextResponse.json({ success: true, project })
  } catch (error) {
    console.error('Create project error:', error)
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 })
  }
}
