import * as XLSX from 'xlsx'

export const EMPLOYER_IMPORT_COLUMNS = [
  'CompanyName',
  'CEO_FirstName',
  'CEO_LastName',
  'HeadOfficeCountry',
  'HeadOfficeCity',
  'Description',
  'Email',
  'Password',
] as const

export type EmployerImportRow = {
  rowNumber: number
  companyName: string
  ceoFirstName: string
  ceoLastName: string
  headOfficeCountry: string
  headOfficeCity: string
  description: string
  email: string
  password: string
}

export type ParsedEmployerImport = {
  rows: EmployerImportRow[]
  errors: { row: number; message: string }[]
}

const COLUMN_KEY_MAP: Record<string, keyof Omit<EmployerImportRow, 'rowNumber'>> = {
  companyname: 'companyName',
  ceofirstname: 'ceoFirstName',
  ceo_firstname: 'ceoFirstName',
  ceolastname: 'ceoLastName',
  ceo_lastname: 'ceoLastName',
  headofficecountry: 'headOfficeCountry',
  headoffice_city: 'headOfficeCity',
  headofficecity: 'headOfficeCity',
  headoffice_country: 'headOfficeCountry',
  description: 'description',
  email: 'email',
  password: 'password',
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '')
    .replace(/_/g, '')
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

export function combineHeadOfficeLocation(city: string, country: string): string {
  return [city, country].map((part) => part.trim()).filter(Boolean).join(', ')
}

export function buildEmployerDescription(
  ceoFirstName: string,
  ceoLastName: string,
  description: string,
): string {
  const ceoName = `${ceoFirstName} ${ceoLastName}`.trim()
  const parts: string[] = []
  if (ceoName) parts.push(`CEO: ${ceoName}`)
  if (description.trim()) parts.push(description.trim())
  return parts.join('\n\n')
}

function mapRawRow(
  raw: Record<string, unknown>,
  rowNumber: number,
): { row?: EmployerImportRow; error?: string } {
  const mapped: Record<string, string> = {
    companyName: '',
    ceoFirstName: '',
    ceoLastName: '',
    headOfficeCountry: '',
    headOfficeCity: '',
    description: '',
    email: '',
    password: '',
  }

  for (const [header, value] of Object.entries(raw)) {
    const key = COLUMN_KEY_MAP[normalizeHeader(header)]
    if (key) mapped[key] = cellToString(value)
  }

  if (isRowEmpty(mapped)) {
    return {}
  }

  const email = mapped.email.toLowerCase()
  if (!mapped.companyName) return { error: 'CompanyName is required' }
  if (!email) return { error: 'Email is required' }
  if (!mapped.password) return { error: 'Password is required' }

  return {
    row: {
      rowNumber,
      companyName: mapped.companyName,
      ceoFirstName: mapped.ceoFirstName,
      ceoLastName: mapped.ceoLastName,
      headOfficeCountry: mapped.headOfficeCountry,
      headOfficeCity: mapped.headOfficeCity,
      description: mapped.description,
      email,
      password: mapped.password,
    },
  }
}

export function parseEmployersXlsx(buffer: ArrayBuffer): ParsedEmployerImport {
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

  const rows: EmployerImportRow[] = []
  const errors: { row: number; message: string }[] = []

  rawRows.forEach((raw, index) => {
    const rowNumber = index + 2
    const result = mapRawRow(raw, rowNumber)
    if (result.row) rows.push(result.row)
    if (result.error) errors.push({ row: rowNumber, message: result.error })
  })

  return { rows, errors }
}
