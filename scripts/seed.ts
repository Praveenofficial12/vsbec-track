// Seed script for VSBEC Placement Management System
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const DEPARTMENTS = ['AI & DS', 'CSE', 'IT', 'ECE', 'EEE', 'MECH', 'CIVIL']
const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year']
const SECTIONS = ['A', 'B', 'C', 'D']
const SKILLS = ['Java', 'Python', 'C', 'C++', 'JavaScript', 'React', 'HTML', 'CSS', 'SQL', 'MongoDB', 'MySQL', 'Machine Learning', 'Artificial Intelligence', 'Data Science', 'Cloud', 'UI/UX', 'Testing', 'Cyber Security']

const FIRST_NAMES = ['Praveen', 'Aarav', 'Vikram', 'Diya', 'Ananya', 'Karthik', 'Priya', 'Rahul', 'Sneha', 'Arjun', 'Kavya', 'Vignesh', 'Divya', 'Surya', 'Meera', 'Gokul', 'Lakshmi', 'Sanjay', 'Anitha', 'Bala', 'Deepa', 'Hari', 'Isha', 'Jeeva', 'Keerthi', 'Madhav', 'Nila', 'Om', 'Pooja', 'Ravi', 'Sara', 'Tarun', 'Uma', 'Varun', 'Yamini', 'Zara', 'Akash', 'Bhavani', 'Chinmayi', 'Dinesh']
const LAST_NAMES = ['Kumar', 'Sharma', 'Reddy', 'Iyer', 'Nair', 'Menon', 'Pillai', 'Gupta', 'Patel', 'Singh', 'Verma', 'Rao', 'Nair', 'Krishnan', 'Subramanian', 'Raman', 'Chandran', 'Pandey', 'Joshi', 'Mehta']

const COMPANIES = [
  { name: 'TCS', website: 'https://tcs.com', industry: 'IT Services', jobRole: 'Software Engineer', ctc: '7 LPA', location: 'Pan India', logoDomain: 'tcs.com' },
  { name: 'Infosys', website: 'https://infosys.com', industry: 'IT Services', jobRole: 'Systems Engineer', ctc: '6.5 LPA', location: 'Pan India', logoDomain: 'infosys.com' },
  { name: 'Accenture', website: 'https://accenture.com', industry: 'Consulting', jobRole: 'Associate Software Engineer', ctc: '8 LPA', location: 'Bangalore', logoDomain: 'accenture.com' },
  { name: 'Cognizant', website: 'https:cognizant.com', industry: 'IT Services', jobRole: 'Programmer Analyst', ctc: '6 LPA', location: 'Chennai', logoDomain: 'cognizant.com' },
  { name: 'Wipro', website: 'https://wipro.com', industry: 'IT Services', jobRole: 'Project Engineer', ctc: '6.5 LPA', location: 'Pan India', logoDomain: 'wipro.com' },
  { name: 'Zoho', website: 'https://zoho.com', industry: 'SaaS', jobRole: 'Software Developer', ctc: '9 LPA', location: 'Chennai', logoDomain: 'zoho.com' },
  { name: 'HCLTech', website: 'https://hcltech.com', industry: 'IT Services', jobRole: 'Graduate Engineer Trainee', ctc: '6 LPA', location: 'Noida', logoDomain: 'hcltech.com' },
  { name: 'Capgemini', website: 'https://capgemini.com', industry: 'Consulting', jobRole: 'Analyst', ctc: '7.5 LPA', location: 'Mumbai', logoDomain: 'capgemini.com' },
]

function randomItem<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }
function randomItems<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}
function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals))
}
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

async function main() {
  console.log('🌱 Seeding database...')

  // Clean existing data
  await db.roundResult.deleteMany()
  await db.driveParticipation.deleteMany()
  await db.round.deleteMany()
  await db.drive.deleteMany()
  await db.notification.deleteMany()
  await db.certification.deleteMany()
  await db.project.deleteMany()
  await db.student.deleteMany()
  await db.company.deleteMany()
  await db.adminUser.deleteMany()
  await db.auditLog.deleteMany()
  await db.placementRule.deleteMany()
  await db.customField.deleteMany()

  // Create admin
  const admin = await db.adminUser.upsert({
    where: { email: 'Vsbec@2027' },
    update: {},
    create: {
      email: 'Vsbec@2027',
      name: 'Placement Officer',
      password: 'admin@123',
    },
  })
  console.log(`✅ Admin created: ${admin.email}`)

  // Create placement rules
  await db.placementRule.create({
    data: {
      name: 'Default Placement Rules',
      maxCompanies: 10,
      blockOnSelection: true,
      minCgpaDefault: 6.0,
      maxBacklogsDefault: 2,
    },
  })

  // Create custom fields
  const customFields = [
    { fieldName: 'Preferred Programming Language', fieldType: 'DROPDOWN', options: 'Java,Python,C++,JavaScript' },
    { fieldName: 'Communication Rating', fieldType: 'NUMBER', options: null },
    { fieldName: 'Internship Experience', fieldType: 'BOOLEAN', options: null },
    { fieldName: 'GitHub Profile', fieldType: 'TEXT', options: null },
    { fieldName: 'LinkedIn Profile', fieldType: 'TEXT', options: null },
  ]
  for (const cf of customFields) {
    await db.customField.create({ data: cf })
  }
  console.log(`✅ Created ${customFields.length} custom fields`)

  // Create companies
  const companyRecords = []
  for (const c of COMPANIES) {
    const company = await db.company.create({
      data: {
        ...c,
        description: `${c.name} is a leading ${c.industry.toLowerCase()} company offering excellent career opportunities.`,
        jobType: 'Full Time',
        eligibility: 'CGPA >= 6.5, No active backlogs',
      },
    })
    companyRecords.push(company)
  }
  console.log(`✅ Created ${companyRecords.length} companies`)

  // Create drives
  const drivesData = [
    { companyName: 'TCS', driveName: 'TCS Campus Drive 2026', driveDate: '2026-10-20', status: 'REGISTRATION_OPEN', minCgpa: 6.5, maxBacklogs: 0, eligibleDepartments: 'AI & DS,CSE,IT', eligibleYears: '4th Year', requiredSkills: 'Java,SQL' },
    { companyName: 'Infosys', driveName: 'Infosys Campus Recruitment 2026', driveDate: '2026-11-05', status: 'REGISTRATION_OPEN', minCgpa: 6.0, maxBacklogs: 0, eligibleDepartments: 'AI & DS,CSE,IT,ECE', eligibleYears: '4th Year', requiredSkills: 'Java,Python,SQL' },
    { companyName: 'Accenture', driveName: 'Accenture Hiring 2026', driveDate: '2026-09-25', status: 'ONGOING', minCgpa: 7.0, maxBacklogs: 0, eligibleDepartments: 'AI & DS,CSE,IT', eligibleYears: '4th Year', requiredSkills: 'JavaScript,React,SQL' },
    { companyName: 'Cognizant', driveName: 'CTS GenC 2026', driveDate: '2026-08-15', status: 'COMPLETED', minCgpa: 6.0, maxBacklogs: 1, eligibleDepartments: 'AI & DS,CSE,IT,ECE,EEE', eligibleYears: '4th Year', requiredSkills: 'Java,SQL' },
    { companyName: 'Wipro', driveName: 'Wipro Elite NLTH 2026', driveDate: '2026-09-10', status: 'COMPLETED', minCgpa: 6.5, maxBacklogs: 0, eligibleDepartments: 'AI & DS,CSE,IT,ECE,EEE,MECH,CIVIL', eligibleYears: '4th Year', requiredSkills: 'Java,Python' },
    { companyName: 'Zoho', driveName: 'Zoho Software Developer 2026', driveDate: '2026-10-30', status: 'UPCOMING', minCgpa: 7.5, maxBacklogs: 0, eligibleDepartments: 'CSE,IT,AI & DS', eligibleYears: '4th Year', requiredSkills: 'Java,C++,SQL' },
    { companyName: 'HCLTech', driveName: 'HCL TechBee 2026', driveDate: '2026-11-12', status: 'UPCOMING', minCgpa: 6.5, maxBacklogs: 1, eligibleDepartments: 'CSE,IT,ECE,EEE', eligibleYears: '4th Year', requiredSkills: 'Python,SQL' },
  ]

  const driveRecords = []
  for (const d of drivesData) {
    const company = companyRecords.find(c => c.name === d.companyName)!
    const drive = await db.drive.create({
      data: {
        companyId: company.id,
        driveName: d.driveName,
        driveDate: d.driveDate,
        applicationDeadline: d.driveDate,
        jobRole: company.jobRole,
        ctc: company.ctc,
        location: company.location,
        eligibleDepartments: d.eligibleDepartments,
        eligibleYears: d.eligibleYears,
        eligibleClasses: 'A,B,C,D',
        minCgpa: d.minCgpa,
        maxBacklogs: d.maxBacklogs,
        requiredSkills: d.requiredSkills,
        preferredSkills: 'React,Cloud',
        selectionProcess: 'Aptitude Test -> Technical Assessment -> Technical Interview -> HR Interview',
        status: d.status,
      },
    })
    driveRecords.push({ ...drive, companyName: d.companyName })
  }
  console.log(`✅ Created ${driveRecords.length} drives`)

  // Create rounds for each drive
  const roundsData = [
    { roundNumber: 1, roundName: 'Aptitude Test', description: 'Quantitative, Logical Reasoning, Verbal' },
    { roundNumber: 2, roundName: 'Technical Assessment', description: 'Coding + Technical MCQs' },
    { roundNumber: 3, roundName: 'Technical Interview', description: 'Technical discussion on core subjects' },
    { roundNumber: 4, roundName: 'HR Interview', description: 'Behavioural and HR round' },
    { roundNumber: 5, roundName: 'Final Selection', description: 'Final result declaration' },
  ]
  for (const drive of driveRecords) {
    for (const r of roundsData) {
      const isCompleted = drive.status === 'COMPLETED'
      const isOngoing = drive.status === 'ONGOING'
      let status = 'UPCOMING'
      if (isCompleted) status = 'COMPLETED'
      else if (isOngoing && r.roundNumber <= 3) status = 'COMPLETED'
      else if (isOngoing && r.roundNumber === 4) status = 'ONGOING'

      await db.round.create({
        data: {
          driveId: drive.id,
          roundNumber: r.roundNumber,
          roundName: r.roundName,
          description: r.description,
          date: drive.driveDate,
          startTime: '09:00',
          endTime: '11:00',
          status,
        },
      })
    }
  }
  console.log(`✅ Created rounds for all drives`)

  // Create students
  console.log('🌱 Creating 60 students...')
  const students = []
  for (let i = 0; i < 60; i++) {
    const firstName = randomItem(FIRST_NAMES)
    const lastName = randomItem(LAST_NAMES)
    const fullName = `${firstName} ${lastName}`
    const dept = randomItem(DEPARTMENTS)
    const year = dept === 'CSE' || dept === 'IT' || dept === 'AI & DS' ? randomItem(YEARS.slice(2)) : randomItem(YEARS)
    const section = randomItem(SECTIONS)
    const regNo = `VSB${String(2400 + i).padStart(4, '0')}`
    const cgpa = randomFloat(6.0, 9.5, 2)
    const backlogs = Math.random() < 0.8 ? 0 : randomInt(1, 3)
    const skills = randomItems(SKILLS, randomInt(3, 7))
    const strongSkills = randomItems(skills, Math.min(2, skills.length))
    const eligible = cgpa >= 6.0 && backlogs <= 2
    const placementStatus = i < 18 ? 'PLACED' : (i < 35 ? 'IN_PROCESS' : 'UNPLACED')

    const student = await db.student.create({
      data: {
        registerNumber: regNo,
        fullName,
        collegeEmail: `${regNo.toLowerCase()}@vsbec.edu.in`,
        personalEmail: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@gmail.com`,
        mobile: `+91${randomInt(7000000000, 9999999999)}`,
        password: 'student@123',
        dateOfBirth: `200${randomInt(2, 5)}-0${randomInt(1, 9)}-${String(randomInt(1, 28)).padStart(2, '0')}`,
        gender: Math.random() < 0.5 ? 'Male' : 'Female',
        department: dept,
        degree: 'B.E.',
        year,
        section,
        semester: String(randomInt(1, 8)),
        batch: '2022-2026',
        cgpa,
        tenthPercentage: randomFloat(75, 95, 2),
        twelfthPercentage: randomFloat(70, 95, 2),
        backlogs,
        historyOfArrears: backlogs + randomInt(0, 2),
        graduationYear: '2026',
        placementStatus,
        placementEligible: eligible,
        preferredRole: randomItem(['Software Engineer', 'Full Stack Developer', 'Data Analyst', 'ML Engineer', 'Cloud Engineer']),
        preferredDomain: randomItem(['Software Development', 'Data Science', 'Cloud Computing', 'Cyber Security', 'AI/ML']),
        interestedTechs: randomItems(SKILLS, 3).join(', '),
        preferredLocation: randomItem(['Chennai', 'Bangalore', 'Hyderabad', 'Pune', 'Remote']),
        skills: skills.join(', '),
        strongSkills: strongSkills.join(', '),
      },
    })
    students.push(student)

    // Add certifications
    const certCount = randomInt(1, 3)
    for (let c = 0; c < certCount; c++) {
      await db.certification.create({
        data: {
          studentId: student.id,
          name: randomItem(['AWS Certified Developer', 'Microsoft Azure Fundamentals', 'Google Cloud Associate', 'Oracle Java Certification', 'Python Institute Certification', 'Meta Frontend Developer', 'Cisco CCNA', 'Salesforce Administrator']),
          organization: randomItem(['Amazon', 'Microsoft', 'Google', 'Oracle', 'Python Institute', 'Meta', 'Cisco', 'Salesforce']),
          certDate: `2024-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`,
          credentialId: `CRT-${randomInt(100000, 999999)}`,
          credentialUrl: `https://verify.example.com/${randomInt(100000, 999999)}`,
        },
      })
    }

    // Add projects
    const projectCount = randomInt(1, 3)
    for (let p = 0; p < projectCount; p++) {
      await db.project.create({
        data: {
          studentId: student.id,
          name: randomItem(['E-Commerce Platform', 'Smart Attendance System', 'AI Chatbot', 'Portfolio Website', 'Stock Price Predictor', 'Recipe Finder App', 'Hospital Management System', 'Task Management Dashboard', 'Weather Forecasting App', 'Online Learning Platform']),
          description: 'A full-stack web application built with modern technologies.',
          technologies: randomItems(SKILLS, 3).join(', '),
          projectType: randomItem(['Web App', 'Mobile App', 'ML Project', 'System Tool']),
          githubUrl: `https://github.com/${firstName.toLowerCase()}/${randomItem(['project1', 'project2', 'project3'])}`,
          liveUrl: `https://${firstName.toLowerCase()}-demo.vercel.app`,
        },
      })
    }

    // Add notifications
    await db.notification.create({
      data: {
        studentId: student.id,
        title: 'New Drive Notification',
        message: 'TCS Campus Drive 2026 is now open for registration. Last date: 18 Oct 2026.',
        type: 'DRIVE',
      },
    })
    await db.notification.create({
      data: {
        studentId: student.id,
        title: 'Welcome to VSBEC Placement Portal',
        message: 'Complete your profile to participate in placement drives.',
        type: 'INFO',
      },
    })
  }
  console.log(`✅ Created ${students.length} students with certs, projects, notifications`)

  // Create participations for completed/ongoing drives
  const completedDrives = driveRecords.filter(d => d.status === 'COMPLETED' || d.status === 'ONGOING')
  for (const drive of completedDrives) {
    const driveRounds = await db.round.findMany({ where: { driveId: drive.id }, orderBy: { roundNumber: 'asc' } })
    const eligibleStudents = students.filter(s => {
      const deptOk = drive.eligibleDepartments?.includes(s.department || '')
      const cgpaOk = !drive.minCgpa || (s.cgpa || 0) >= drive.minCgpa
      const backlogsOk = drive.maxBacklogs === null || drive.maxBacklogs === undefined || (s.backlogs || 0) <= drive.maxBacklogs
      return deptOk && cgpaOk && backlogsOk
    }).slice(0, 25)

    for (const student of eligibleStudents) {
      const isAttending = Math.random() < 0.85
      let attendance = isAttending ? 'ATTENDING' : 'NOT_ATTENDING'
      if (!isAttending && Math.random() < 0.3) attendance = 'ABSENT'

      let currentRound = 0
      let finalResult: string | null = null
      if (isAttending) {
        if (drive.status === 'COMPLETED') {
          if (Math.random() < 0.25) {
            attendance = 'SELECTED'
            finalResult = 'SELECTED'
            currentRound = driveRounds.length
          } else if (Math.random() < 0.6) {
            attendance = 'REJECTED'
            finalResult = 'REJECTED'
            currentRound = randomInt(1, driveRounds.length - 1)
          } else {
            attendance = 'ON_HOLD'
            finalResult = 'ON_HOLD'
            currentRound = driveRounds.length - 1
          }
        } else if (drive.status === 'ONGOING') {
          attendance = 'IN_PROGRESS'
          currentRound = randomInt(2, driveRounds.length - 1)
        }
      }

      const participation = await db.driveParticipation.create({
        data: {
          studentId: student.id,
          driveId: drive.id,
          attendance,
          currentRound,
          finalResult,
          jobRole: finalResult === 'SELECTED' ? drive.jobRole : null,
          ctc: finalResult === 'SELECTED' ? drive.ctc : null,
          joiningLocation: finalResult === 'SELECTED' ? drive.location : null,
          joiningDate: finalResult === 'SELECTED' ? '2026-07-01' : null,
        },
      })

      if (isAttending && currentRound > 0) {
        for (let r = 0; r < currentRound; r++) {
          const round = driveRounds[r]
          if (!round) continue
          let status = 'CLEARED'
          if (r === currentRound - 1 && finalResult === 'REJECTED') {
            status = 'NOT_CLEARED'
          }
          await db.roundResult.create({
            data: {
              participationId: participation.id,
              roundId: round.id,
              status,
            },
          })
        }
      }
    }
  }
  console.log(`✅ Created participations and round results`)

  // Add audit logs
  const auditLogs = [
    { action: 'CREATE_DRIVE', entity: 'Drive', studentName: null, companyName: 'TCS', driveName: 'TCS Campus Drive 2026', newValue: 'REGISTRATION_OPEN' },
    { action: 'UPDATE_ROUND_RESULT', entity: 'RoundResult', studentName: 'Praveen Kumar', companyName: 'Accenture', driveName: 'Accenture Hiring 2026', previousValue: 'PENDING', newValue: 'CLEARED' },
    { action: 'MARK_SELECTED', entity: 'Participation', studentName: 'Aarav Sharma', companyName: 'Wipro', driveName: 'Wipro Elite NLTH 2026', previousValue: 'IN_PROGRESS', newValue: 'SELECTED' },
    { action: 'UPDATE_ATTENDANCE', entity: 'Participation', studentName: 'Diya Iyer', companyName: 'Cognizant', driveName: 'CTS GenC 2026', previousValue: 'NOT_ATTENDING', newValue: 'ATTENDING' },
  ]
  for (const log of auditLogs) {
    await db.auditLog.create({
      data: {
        adminEmail: 'Vsbec@2027',
        action: log.action,
        entity: log.entity,
        studentName: log.studentName,
        companyName: log.companyName,
        driveName: log.driveName,
        previousValue: log.previousValue,
        newValue: log.newValue,
      },
    })
  }
  console.log(`✅ Created audit logs`)

  console.log('🎉 Seeding complete!')
  console.log(`   - 1 Admin: Vsbec@2027 / admin@123`)
  console.log(`   - ${students.length} Students: VSB2400+ / student@123`)
  console.log(`   - ${companyRecords.length} Companies`)
  console.log(`   - ${driveRecords.length} Drives`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
