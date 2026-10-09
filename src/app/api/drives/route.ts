import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendDriveCreationEmails } from '@/lib/email-notifications'

// GET: List drives with optional filters
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const companyId = searchParams.get('companyId')

    const where: any = {}
    if (status && status !== 'ALL') where.status = status
    if (companyId) where.companyId = companyId

    const drives = await db.drive.findMany({
      where,
      include: {
        company: true,
        rounds: { orderBy: { roundNumber: 'asc' } },
        participants: true,
      },
      orderBy: { driveDate: 'asc' },
    })

    return NextResponse.json({ drives })
  } catch (error) {
    console.error('Get drives error:', error)
    return NextResponse.json({ error: 'Failed to fetch drives' }, { status: 500 })
  }
}

// Helper: derive a clean domain from a company name
function deriveDomainFromName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // strip spaces & punctuation
    .replace(/^(the|pvt|ltd|private|limited|inc|corp|corporation|company|co)+$/, '')
  return `${cleaned}.com`
}

// Helper: auto-fetch company logo URL from Google (favicon service)
// Google indexes company favicons and serves them via this endpoint at multiple sizes
function fetchCompanyLogo(name: string, domain?: string): { logoUrl: string; logoDomain: string } {
  const cleanName = name.trim()
  const finalDomain = domain?.trim() || deriveDomainFromName(cleanName)
  // Google's favicon service — fetches the company's icon directly from Google's index
  // sz=128 returns a high-resolution icon suitable for display
  const logoUrl = `https://www.google.com/s2/favicons?domain=${finalDomain}&sz=128`
  return { logoUrl, logoDomain: finalDomain }
}

// POST: Create drive (accepts companyName text input OR companyId)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    let companyId = body.companyId

    // NEW FLOW: If staff provides a company name (text input), look up or create the company
    // and automatically fetch its logo from Google (via Clearbit logo service)
    if (!companyId && body.companyName) {
      const companyName = String(body.companyName).trim()

      // Try to find an existing company with this name (case-insensitive)
      const existing = await db.company.findFirst({
        where: { name: { equals: companyName } },
      })

      if (existing) {
        // Reuse existing company; ensure it has a logo
        if (!existing.logoUrl) {
          const { logoUrl, logoDomain } = fetchCompanyLogo(companyName, existing.logoDomain || undefined)
          await db.company.update({
            where: { id: existing.id },
            data: { logoUrl, logoDomain },
          })
        }
        companyId = existing.id
      } else {
        // Create a new company on the fly with the logo auto-fetched from Google
        const { logoUrl, logoDomain } = fetchCompanyLogo(companyName, body.logoDomain)

        const newCompany = await db.company.create({
          data: {
            name: companyName,
            website: body.website || `https://${logoDomain}`,
            description: body.companyDescription || `${companyName} placement drive at VSBEC.`,
            industry: body.industry || 'IT Services',
            jobRole: body.jobRole || 'Software Engineer',
            location: body.location || 'Pan India',
            ctc: body.ctc || '',
            jobType: 'Full Time',
            eligibility: body.eligibility || '',
            logoUrl,
            logoDomain,
          },
        })
        companyId = newCompany.id
      }
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 })
    }

    const drive = await db.drive.create({
      data: {
        companyId,
        driveName: body.driveName,
        driveDate: body.driveDate,
        applicationDeadline: body.applicationDeadline,
        jobRole: body.jobRole,
        ctc: body.ctc,
        location: body.location,
        eligibleDepartments: body.eligibleDepartments,
        eligibleYears: body.eligibleYears,
        eligibleClasses: body.eligibleClasses,
        minCgpa: body.minCgpa ? parseFloat(body.minCgpa) : null,
        maxBacklogs: body.maxBacklogs !== undefined && body.maxBacklogs !== '' ? parseInt(body.maxBacklogs) : null,
        minTenthPercentage: body.minTenthPercentage ? parseFloat(body.minTenthPercentage) : null,
        minTwelfthPercentage: body.minTwelfthPercentage ? parseFloat(body.minTwelfthPercentage) : null,
        requiredSkills: body.requiredSkills,
        preferredSkills: body.preferredSkills,
        selectionProcess: body.selectionProcess,
        status: body.status || 'UPCOMING',
      },
    })

    // Create rounds based on the selection process text the admin entered.
    // Parse the selection process string (e.g. "Aptitude -> Coding -> GD -> Technical HR -> General HR")
    // and create one round per stage so the round status always matches the selection process.
    const selectionProcessText = body.selectionProcess || 'Aptitude -> Coding -> GD -> Technical HR -> General HR'
    const stageNames = selectionProcessText
      .split(/->|,|>/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0)

    const defaultDescriptions: Record<string, string> = {
      'Aptitude': 'Quantitative, Logical Reasoning, Verbal',
      'Coding': 'Online coding assessment + technical MCQs',
      'GD': 'Group Discussion',
      'Technical HR': 'Technical interview on core subjects',
      'General HR': 'General / behavioural HR interview',
    }

    const roundsToCreate = stageNames.length > 0
      ? stageNames.map((name: string, idx: number) => ({
          roundNumber: idx + 1,
          roundName: name,
          description: defaultDescriptions[name] || `${name} round`,
        }))
      : [
        { roundNumber: 1, roundName: 'Aptitude', description: 'Quantitative, Logical Reasoning, Verbal' },
        { roundNumber: 2, roundName: 'Coding', description: 'Online coding assessment + technical MCQs' },
        { roundNumber: 3, roundName: 'GD', description: 'Group Discussion' },
        { roundNumber: 4, roundName: 'Technical HR', description: 'Technical interview on core subjects' },
        { roundNumber: 5, roundName: 'General HR', description: 'General / behavioural HR interview' },
      ]

    for (const r of roundsToCreate) {
      await db.round.create({
        data: { ...r, driveId: drive.id, status: 'UPCOMING' },
      })
    }

    const company = await db.company.findUnique({ where: { id: companyId } })

    await db.auditLog.create({
      data: {
        adminEmail: 'Vsbec@2027',
        action: 'CREATE_DRIVE',
        entity: 'Drive',
        entityId: drive.id,
        companyName: company?.name,
        driveName: drive.driveName,
        newValue: drive.status,
      },
    })

    // Send email + in-app notifications to all eligible students who have
    // registered on the portal. This runs in the background so the admin
    // gets an immediate response; the notifications are created best-effort.
    const emailPayload = {
      driveId: drive.id,
      driveName: drive.driveName,
      companyName: company?.name || 'Unknown Company',
      jobRole: drive.jobRole,
      ctc: drive.ctc,
      location: drive.location,
      driveDate: drive.driveDate,
      applicationDeadline: drive.applicationDeadline,
      eligibleDepartments: drive.eligibleDepartments,
      eligibleYears: drive.eligibleYears,
    }
    // Fire-and-forget — don't block the drive creation response on email sending.
    sendDriveCreationEmails(emailPayload)
      .then((result) => {
        console.log(`[Drive ${drive.id}] Notified ${result.notifiedCount} eligible students`)
      })
      .catch((err) => {
        console.error(`[Drive ${drive.id}] Email notification failed:`, err)
      })

    return NextResponse.json({ success: true, drive, company })
  } catch (error) {
    console.error('Create drive error:', error)
    return NextResponse.json({ error: 'Failed to create drive' }, { status: 500 })
  }
}
