import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import {
  formatVacancyImportErrors,
  normalizeCompanyName,
  normalizeEmploymentType,
  normalizeWorkFormat,
  parseVacanciesXlsx,
} from '@/lib/admin/import-vacancies-from-xlsx'

function buildXlsxBuffer(rows: Record<string, string | number>[]): ArrayBuffer {
  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Vacancies')
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

function buildAoaBuffer(rows: unknown[][]): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Vacancies')
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

describe('import-vacancies-from-xlsx', () => {
  it('normalizes company names for matching', () => {
    expect(normalizeCompanyName('  Acme   Corp ')).toBe('acme corp')
  })

  it('normalizes employment types including Russian', () => {
    expect(normalizeEmploymentType('Full-time')).toBe('Full-time')
    expect(normalizeEmploymentType('part time')).toBe('Part-time')
    expect(normalizeEmploymentType('Полная занятость')).toBe('Full-time')
    expect(normalizeEmploymentType('Contract')).toBe('Full-time')
    expect(normalizeEmploymentType('unknown')).toBeNull()
  })

  it('normalizes work formats including Russian, hybrid, and online/offline', () => {
    expect(normalizeWorkFormat('Remote')).toBe('REMOTE')
    expect(normalizeWorkFormat('Online')).toBe('REMOTE')
    expect(normalizeWorkFormat('On-site')).toBe('ONSITE')
    expect(normalizeWorkFormat('Offline')).toBe('ONSITE')
    expect(normalizeWorkFormat('Hybrid')).toBe('REMOTE')
    expect(normalizeWorkFormat('Гибрид')).toBe('REMOTE')
    expect(normalizeWorkFormat('Удалённо')).toBe('REMOTE')
    expect(normalizeWorkFormat('unknown')).toBeNull()
  })

  it('parses valid vacancy rows from xlsx', () => {
    const buffer = buildXlsxBuffer([
      {
        Company: 'Acme Corp',
        Title: 'Backend Developer',
        Description: 'Build APIs',
        Skills: 'Node.js, MongoDB',
        EmploymentType: 'Full-time',
        WorkFormat: 'Remote',
        Country: 'Kazakhstan',
        City: 'Almaty',
        MinSalaryUSD: 3000,
        MaxSalaryUSD: 5000,
      },
    ])

    const parsed = parseVacanciesXlsx(buffer)
    expect(parsed.errors).toEqual([])
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0]).toMatchObject({
      company: 'Acme Corp',
      title: 'Backend Developer',
      skills: 'Node.js, MongoDB',
      minSalaryUsd: 3000,
      maxSalaryUsd: 5000,
    })
  })

  it('parses rows when salaries are empty (defaults to 0)', () => {
    const buffer = buildXlsxBuffer([
      {
        Company: 'Acme Corp',
        Title: 'QA Engineer',
        Description: 'Test apps',
        Skills: 'Testing',
        EmploymentType: 'Full-time',
        WorkFormat: 'Remote',
        Country: 'Kazakhstan',
        City: 'Almaty',
        MinSalaryUSD: '',
        MaxSalaryUSD: '',
      },
    ])

    const parsed = parseVacanciesXlsx(buffer)
    expect(parsed.errors).toEqual([])
    expect(parsed.rows[0]).toMatchObject({ minSalaryUsd: 0, maxSalaryUsd: 0 })
  })

  it('detects header row when a title row precedes headers', () => {
    const buffer = buildAoaBuffer([
      ['Vacancy import'],
      [
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
      ],
      ['Acme Corp', 'Dev', 'Build APIs', 'JS', 'Full-time', 'Remote', 'KZ', 'Almaty', 1000, 2000],
    ])

    const parsed = parseVacanciesXlsx(buffer)
    expect(parsed.errors).toEqual([])
    expect(parsed.rows).toHaveLength(1)
  })

  it('reports salary validation errors', () => {
    const buffer = buildXlsxBuffer([
      {
        Company: 'Acme Corp',
        Title: 'QA Engineer',
        Description: 'Test apps',
        EmploymentType: 'Full-time',
        WorkFormat: 'Remote',
        Country: '',
        City: '',
        MinSalaryUSD: 6000,
        MaxSalaryUSD: 4000,
      },
    ])

    const parsed = parseVacanciesXlsx(buffer)
    expect(parsed.rows).toHaveLength(0)
    expect(parsed.errors[0]?.message).toContain('MinSalaryUSD')
  })

  it('parses realistic KZ vacancy export with Online/Offline work formats', () => {
    const buffer = buildAoaBuffer([
      [
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
      ],
      [
        'QazaqTech Solutions',
        'Senior Backend Developer',
        'Build APIs',
        'Node.js',
        'Full Time',
        'Offline',
        'Kazakhstan',
        'Astana',
        2500,
        4500,
      ],
      [
        'QazaqTech Solutions',
        'Frontend Developer',
        'Build UI',
        'React',
        'Part-Time',
        'Online',
        'Kazakhstan',
        'Almaty',
        1500,
        2500,
      ],
    ])

    const parsed = parseVacanciesXlsx(buffer)
    expect(parsed.errors).toEqual([])
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.rows[0]?.workFormat).toBe('Offline')
    expect(parsed.rows[1]?.workFormat).toBe('Online')
  })

  it('formats import errors for API responses', () => {
    expect(
      formatVacancyImportErrors([
        { row: 3, message: 'Invalid EmploymentType' },
        { row: 5, message: 'Company is required' },
      ]),
    ).toBe('Row 3: Invalid EmploymentType; Row 5: Company is required')
  })
})
