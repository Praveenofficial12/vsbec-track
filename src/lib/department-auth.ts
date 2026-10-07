// Department password registry used to authorise student registration and login.
// Each department has one shared "official password" that students must enter
// when they register; the same password becomes their login password.

export const DEPARTMENT_PASSWORDS: Record<string, string> = {
  'AI-DS': 'aids#101',
  'AI-ML': 'aiml#102',
  'BT': 'bt#103',
  'BME': 'bme#104',
  'CHEM': 'chem#105',
  'CIVIL': 'civil#106',
  'CCE': 'cce#107',
  'CSBS': 'csbs#108',
  'CSE': 'cse#109',
  'ECE': 'ece#289',
  'EEE': 'eee#111',
  'IT': 'it#112',
  'MECH': 'mech#113',
}

export const DEPARTMENTS = Object.keys(DEPARTMENT_PASSWORDS)

/**
 * Returns true when the supplied password matches the official password for
 * the given department code. The lookup is case-sensitive on the password and
 * case-insensitive on the department code.
 */
export function validateDepartmentPassword(department: string, password: string): boolean {
  if (!department || !password) return false
  const expected = DEPARTMENT_PASSWORDS[department.toUpperCase()]
  if (!expected) return false
  return expected === password
}

/**
 * Convenience helper used when only the department code needs to be resolved
 * to its current official password (e.g. for the admin dashboard list).
 */
export function getDepartmentPassword(department: string): string | undefined {
  return DEPARTMENT_PASSWORDS[department?.toUpperCase()]
}
