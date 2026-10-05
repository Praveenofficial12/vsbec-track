// Shared types for VSBEC Placement Management System

export type Role = 'STUDENT' | 'ADMIN'

export type ViewKey =
  | 'landing'
  | 'student-login'
  | 'admin-login'
  | 'student-register'
  | 'student-dashboard'
  | 'student-profile'
  | 'student-skills'
  | 'student-companies'
  | 'student-drives'
  | 'student-history'
  | 'student-notifications'
  | 'student-settings'
  | 'admin-dashboard'
  | 'admin-students'
  | 'admin-student-detail'
  | 'admin-companies'
  | 'admin-company-detail'
  | 'admin-drives'
  | 'admin-drive-detail'
  | 'admin-analytics'
  | 'admin-recommendations'
  | 'admin-reports'
  | 'admin-audit-logs'
  | 'admin-settings'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
  registerNumber?: string
}

export interface Student {
  id: string
  registerNumber: string
  fullName: string
  collegeEmail: string
  personalEmail?: string | null
  mobile?: string | null
  gender?: string | null
  department?: string | null
  degree?: string | null
  year?: string | null
  section?: string | null
  semester?: string | null
  batch?: string | null
  cgpa?: number | null
  tenthPercentage?: number | null
  twelfthPercentage?: number | null
  backlogs: number
  historyOfArrears: number
  graduationYear?: string | null
  placementStatus: 'PLACED' | 'IN_PROCESS' | 'UNPLACED'
  placementEligible: boolean
  preferredRole?: string | null
  preferredDomain?: string | null
  interestedTechs?: string | null
  preferredLocation?: string | null
  skills?: string | null
  strongSkills?: string | null
  resumeUrl?: string | null
  profilePhoto?: string | null
  createdAt: string
  certifications?: Certification[]
  projects?: Project[]
  participations?: DriveParticipation[]
  notifications?: Notification[]
}

export interface Certification {
  id: string
  name: string
  organization?: string | null
  certDate?: string | null
  credentialId?: string | null
  credentialUrl?: string | null
  fileUrl?: string | null
}

export interface Project {
  id: string
  name: string
  description?: string | null
  technologies?: string | null
  projectType?: string | null
  githubUrl?: string | null
  liveUrl?: string | null
}

export interface Company {
  id: string
  name: string
  website?: string | null
  description?: string | null
  industry?: string | null
  jobRole?: string | null
  location?: string | null
  ctc?: string | null
  jobType?: string | null
  eligibility?: string | null
  logoUrl?: string | null
  logoDomain?: string | null
  driveDate?: string | null
  applicationDeadline?: string | null
  drives?: Drive[]
}

export interface Drive {
  id: string
  companyId: string
  driveName: string
  driveDate: string
  applicationDeadline?: string | null
  jobRole?: string | null
  ctc?: string | null
  location?: string | null
  eligibleDepartments?: string | null
  eligibleYears?: string | null
  eligibleClasses?: string | null
  minCgpa?: number | null
  maxBacklogs?: number | null
  requiredSkills?: string | null
  preferredSkills?: string | null
  selectionProcess?: string | null
  status: 'UPCOMING' | 'REGISTRATION_OPEN' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'
  createdAt: string
  updatedAt: string
  company?: Company
  rounds?: Round[]
  participants?: DriveParticipation[]
}

export interface Round {
  id: string
  driveId: string
  roundNumber: number
  roundName: string
  description?: string | null
  date?: string | null
  startTime?: string | null
  endTime?: string | null
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED'
}

export interface DriveParticipation {
  id: string
  studentId: string
  driveId: string
  attendance: string
  currentRound: number
  finalResult?: string | null
  jobRole?: string | null
  ctc?: string | null
  joiningLocation?: string | null
  joiningDate?: string | null
  offerLetter?: string | null
  createdAt: string
  updatedAt: string
  student?: Student
  drive?: Drive
  roundResults?: RoundResult[]
}

export interface RoundResult {
  id: string
  participationId: string
  roundId: string
  status: 'CLEARED' | 'NOT_CLEARED' | 'ABSENT' | 'PENDING' | 'ON_HOLD'
  round?: Round
}

export interface Notification {
  id: string
  studentId?: string | null
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

export interface AuditLog {
  id: string
  adminEmail: string
  action: string
  entity?: string | null
  entityId?: string | null
  studentName?: string | null
  companyName?: string | null
  driveName?: string | null
  previousValue?: string | null
  newValue?: string | null
  timestamp: string
}

export interface AnalyticsData {
  overview: {
    totalStudents: number
    eligibleStudents: number
    totalCompanies: number
    activeDrives: number
    placedStudents: number
    unplacedStudents: number
    inProcessStudents: number
    totalSelections: number
    placementPercentage: number
    averageCtc: number
    highestCtc: number
  }
  departmentWise: any[]
  yearWise: any[]
  classWise: any[]
  companyWise: any[]
  skillAnalytics: { skill: string; count: number }[]
  strongSkillAnalytics: { skill: string; count: number }[]
  funnel: { stage: string; count: number }[]
}

export interface Recommendation {
  student: {
    id: string
    registerNumber: string
    fullName: string
    department: string
    year: string
    section: string
    cgpa: number
    backlogs: number
    skills: string
    strongSkills: string
    placementStatus: string
    companiesAttended: number
  }
  matchScore: number
  reasons: string[]
  matchedSkills: number
  totalRequired: number
}
