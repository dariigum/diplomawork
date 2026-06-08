import * as XLSX from 'xlsx'

export const EMPLOYEE_IMPORT_COLUMNS = [
  'FirstName',
  'LastName',
  'Email',
  'Password',
  'ResumeTitle',
  'Skills',
  'Experience',
  'Degree',
  'Speciality',
  'Phone',
  'Telegram',
] as const

export type EmployeeImportRow = {
  rowNumber: number
  firstName: string
  lastName: string
  email: string
  password: string
  resumeTitle: string
  skills: string
  experience: string
  degree: string
  speciality: string
  phone: string
  telegram: string
}

export type ParsedEmployeeImport = {
  rows: EmployeeImportRow[]
  errors: { row: number; message: string }[]
}

const COLUMN_KEY_MAP: Record<string, keyof Omit<EmployeeImportRow, 'rowNumber'>> = {
  firstname: 'firstName',
  lastname: 'lastName',
  email: 'email',
  password: 'password',
  resumetitle: 'resumeTitle',
  skills: 'skills',
  experience: 'experience',
  degree: 'degree',
  speciality: 'speciality',
  specialty: 'speciality',
  phone: 'phone',
  telegram: 'telegram',
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '')
}

function cellToString(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return String(value).trim()
}

function isRowEmpty(values: Record<string, string>): boolean {
  return Object.values(values).every((value) => !value)
}

export function combineDegreeAndSpeciality(degree: string, speciality: string): string {
  return [degree, speciality].map((part) => part.trim()).filter(Boolean).join(', ')
}

function mapRawRow(
  raw: Record<string, unknown>,
  rowNumber: number,
): { row?: EmployeeImportRow; error?: string } {
  const mapped: Record<string, string> = {
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    resumeTitle: '',
    skills: '',
    experience: '',
    degree: '',
    speciality: '',
    phone: '',
    telegram: '',
  }

  for (const [header, value] of Object.entries(raw)) {
    const key = COLUMN_KEY_MAP[normalizeHeader(header)]
    if (key) mapped[key] = cellToString(value)
  }

  if (isRowEmpty(mapped)) {
    return {}
  }

  const email = mapped.email.toLowerCase()
  if (!email) return { error: 'Email is required' }
  if (!mapped.password) return { error: 'Password is required' }
  if (!mapped.resumeTitle) return { error: 'ResumeTitle is required' }
  if (!mapped.skills) return { error: 'Skills is required' }
  if (!mapped.firstName && !mapped.lastName) return { error: 'FirstName or LastName is required' }

  return {
    row: {
      rowNumber,
      firstName: mapped.firstName,
      lastName: mapped.lastName,
      email,
      password: mapped.password,
      resumeTitle: mapped.resumeTitle,
      skills: mapped.skills,
      experience: mapped.experience,
      degree: mapped.degree,
      speciality: mapped.speciality,
      phone: mapped.phone,
      telegram: mapped.telegram,
    },
  }
}

export function parseEmployeesXlsx(buffer: ArrayBuffer): ParsedEmployeeImport {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { rows: [], errors: [{ row: 0, message: 'Workbook has no sheets' }] }
  }

  const sheet = workbook.Sheets[sheetName]
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' })
  if (rawRows.length === 0) {
    return { rows: [], errors: [{ row: 0, message: 'Sheet is empty' }] }
  }

  const rows: EmployeeImportRow[] = []
  const errors: { row: number; message: string }[] = []

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2
    const result = mapRawRow(raw, rowNumber)
    if (result.row) rows.push(result.row)
    if (result.error) errors.push({ row: rowNumber, message: result.error })
  })

  return { rows, errors }
}
