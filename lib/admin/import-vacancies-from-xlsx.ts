import * as XLSX from 'xlsx'

export const VACANCY_IMPORT_COLUMNS = [
  'Company',
  'Title',
  'Description',
  'Skills',
  'EmploymentType',
  'WorkFormat',
  'Country',
  'City',
  'MinSalaryUSD',
  'MaxSalaryUSD',
] as const

export type VacancyImportRow = {
  rowNumber: number
  company: string
  title: string
  description: string
  skills: string
  employmentType: string
  workFormat: string
  country: string
  city: string
  minSalaryUsd: number
  maxSalaryUsd: number
}

export type ParsedVacancyImport = {
  rows: VacancyImportRow[]
  errors: { row: number; message: string }[]
}

const COLUMN_KEY_MAP: Record<
  string,
  keyof Omit<VacancyImportRow, 'rowNumber' | 'minSalaryUsd' | 'maxSalaryUsd'>
> = {
  company: 'company',
  title: 'title',
  description: 'description',
  skills: 'skills',
  skillsrequired: 'skills',
  employmenttype: 'employmentType',
  workformat: 'workFormat',
  workmode: 'workFormat',
  country: 'country',
  city: 'city',
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .replace(/^\uFEFF/, '')
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

function parseSalaryUsd(value: unknown): number | null {
  if (value == null || value === '') return null
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)

  const raw = String(value).trim()
  if (!raw) return null

  // European format: 3.000,50
  if (/,\d{1,2}$/.test(raw)) {
    const normalized = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
    const parsed = Number.parseFloat(normalized)
    if (Number.isFinite(parsed)) return Math.round(parsed)
  }

  const digitsOnly = raw.replace(/[^0-9]/g, '')
  if (!digitsOnly) return null
  const parsed = Number.parseInt(digitsOnly, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function isRowEmpty(values: Record<string, string>): boolean {
  return Object.values(values).every((value) => !value)
}

export function normalizeCompanyName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function normalizeEmploymentType(
  value: string,
): 'Full-time' | 'Part-time' | 'Internship' | null {
  const normalized = value.trim().toLowerCase().replace(/-/g, ' ')
  if (!normalized) return 'Full-time'

  if (
    normalized === 'full time' ||
    normalized === 'fulltime' ||
    normalized.includes('full') ||
    normalized.includes('полн') ||
    normalized.includes('permanent') ||
    normalized.includes('contract')
  ) {
    return 'Full-time'
  }

  if (
    normalized === 'part time' ||
    normalized === 'parttime' ||
    normalized.includes('part') ||
    normalized.includes('част')
  ) {
    return 'Part-time'
  }

  if (
    normalized.includes('intern') ||
    normalized.includes('стаж') ||
    normalized.includes('trainee')
  ) {
    return 'Internship'
  }

  return null
}

export function normalizeWorkFormat(value: string): 'REMOTE' | 'ONSITE' | null {
  const normalized = value.trim().toLowerCase().replace(/-/g, ' ')
  if (!normalized) return 'REMOTE'

  if (
    normalized === 'remote' ||
    normalized === 'online' ||
    normalized.includes('remote') ||
    normalized.includes('online') ||
    normalized.includes('удал') ||
    normalized === 'wfh' ||
    normalized.includes('hybrid') ||
    normalized.includes('гибрид') ||
    normalized.includes('дистанц')
  ) {
    return 'REMOTE'
  }

  if (
    normalized === 'onsite' ||
    normalized === 'offline' ||
    normalized.includes('onsite') ||
    normalized.includes('on site') ||
    normalized.includes('offline') ||
    normalized.includes('office') ||
    normalized.includes('офис')
  ) {
    return 'ONSITE'
  }

  return null
}

function findHeaderRowIndex(matrix: unknown[][]): number {
  for (let index = 0; index < Math.min(matrix.length, 15); index += 1) {
    const row = matrix[index]
    if (!Array.isArray(row)) continue
    const headers = row.map((cell) => normalizeHeader(cell))
    if (headers.includes('company') && headers.includes('title')) {
      return index
    }
  }
  return 0
}

function matrixToRawRows(matrix: unknown[][], headerRowIndex: number): Record<string, unknown>[] {
  const headerRow = matrix[headerRowIndex]
  if (!Array.isArray(headerRow)) return []

  const headers = headerRow.map((cell) => cellToString(cell))
  const rawRows: Record<string, unknown>[] = []

  for (let rowIndex = headerRowIndex + 1; rowIndex < matrix.length; rowIndex += 1) {
    const row = matrix[rowIndex]
    if (!Array.isArray(row)) continue

    const raw: Record<string, unknown> = {}
    let hasValue = false

    headers.forEach((header, columnIndex) => {
      if (!header) return
      const value = row[columnIndex] ?? ''
      if (value !== '' && value != null) hasValue = true
      raw[header] = value
    })

    if (hasValue) rawRows.push(raw)
  }

  return rawRows
}

function mapRawRow(
  raw: Record<string, unknown>,
  rowNumber: number,
): { row?: VacancyImportRow; error?: string } {
  const mapped: Record<string, string> = {
    company: '',
    title: '',
    description: '',
    skills: '',
    employmentType: '',
    workFormat: '',
    country: '',
    city: '',
  }

  let minSalaryRaw: unknown = null
  let maxSalaryRaw: unknown = null

  for (const [header, value] of Object.entries(raw)) {
    const normalized = normalizeHeader(header)
    if (normalized === 'minsalaryusd') {
      minSalaryRaw = value
      continue
    }
    if (normalized === 'maxsalaryusd') {
      maxSalaryRaw = value
      continue
    }
    const key = COLUMN_KEY_MAP[normalized]
    if (key) {
      mapped[key] = cellToString(value)
    }
  }

  if (isRowEmpty(mapped) && minSalaryRaw == null && maxSalaryRaw == null) {
    return {}
  }

  if (!mapped.company) return { error: 'Company is required' }
  if (!mapped.title) return { error: 'Title is required' }

  const minSalaryParsed = parseSalaryUsd(minSalaryRaw)
  const maxSalaryParsed = parseSalaryUsd(maxSalaryRaw)
  const minSalaryUsd = minSalaryParsed ?? 0
  const maxSalaryUsd = maxSalaryParsed ?? minSalaryParsed ?? 0

  if (minSalaryUsd < 0 || maxSalaryUsd < 0) {
    return { error: 'Salary values must be non-negative' }
  }
  if (minSalaryUsd > maxSalaryUsd) {
    return { error: 'MinSalaryUSD cannot exceed MaxSalaryUSD' }
  }

  const employmentType = normalizeEmploymentType(mapped.employmentType)
  if (!employmentType) {
    return {
      error: `Invalid EmploymentType: "${mapped.employmentType || '(empty)'}" (use Full-time, Part-time, or Internship)`,
    }
  }

  const workFormat = normalizeWorkFormat(mapped.workFormat)
  if (!workFormat) {
    return {
      error: `Invalid WorkFormat: "${mapped.workFormat || '(empty)'}" (use Remote/Online or On-site/Offline)`,
    }
  }

  if (workFormat === 'ONSITE' && !mapped.city && !mapped.country) {
    return { error: 'City or Country is required for on-site vacancies' }
  }

  return {
    row: {
      rowNumber,
      company: mapped.company,
      title: mapped.title,
      description: mapped.description,
      skills: mapped.skills,
      employmentType: mapped.employmentType,
      workFormat: mapped.workFormat,
      country: mapped.country,
      city: mapped.city,
      minSalaryUsd,
      maxSalaryUsd,
    },
  }
}

function readSheetMatrix(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  })
}

function findVacancySheet(workbook: XLSX.WorkBook): { sheet: XLSX.WorkSheet; headerRowIndex: number } | null {
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName]
    const matrix = readSheetMatrix(sheet)
    const headerRowIndex = findHeaderRowIndex(matrix)
    const headerRow = matrix[headerRowIndex]
    if (!Array.isArray(headerRow)) continue

    const headers = headerRow.map((cell) => normalizeHeader(cell))
    if (headers.includes('company') && headers.includes('title')) {
      return { sheet, headerRowIndex }
    }
  }

  const fallbackName = workbook.SheetNames[0]
  if (!fallbackName) return null
  const sheet = workbook.Sheets[fallbackName]
  return { sheet, headerRowIndex: 0 }
}

export function parseVacanciesXlsx(buffer: ArrayBuffer): ParsedVacancyImport {
  const workbook = XLSX.read(buffer, { type: 'array' })
  const located = findVacancySheet(workbook)

  if (!located) {
    return { rows: [], errors: [{ row: 0, message: 'Workbook has no sheets' }] }
  }

  const matrix = readSheetMatrix(located.sheet)
  const rawRows = matrixToRawRows(matrix, located.headerRowIndex)

  if (rawRows.length === 0) {
    return {
      rows: [],
      errors: [
        {
          row: 0,
          message:
            'No data rows found. Check that the sheet has headers Company and Title, then vacancy rows below.',
        },
      ],
    }
  }

  const rows: VacancyImportRow[] = []
  const errors: { row: number; message: string }[] = []

  rawRows.forEach((raw, index) => {
    const rowNumber = located.headerRowIndex + index + 2
    const result = mapRawRow(raw, rowNumber)
    if (result.row) rows.push(result.row)
    if (result.error) errors.push({ row: rowNumber, message: result.error })
  })

  return { rows, errors }
}

export function formatVacancyImportErrors(
  errors: { row: number; message: string }[],
  limit = 3,
): string {
  return errors
    .slice(0, limit)
    .map((error) => (error.row > 0 ? `Row ${error.row}: ${error.message}` : error.message))
    .join('; ')
}
