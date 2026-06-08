import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import {
  combineDegreeAndSpeciality,
  parseEmployeesXlsx,
} from '@/lib/admin/import-employees-from-xlsx'

function buildXlsxBuffer(rows: Record<string, string>[]): ArrayBuffer {
  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Employees')
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

describe('import-employees-from-xlsx', () => {
  it('combines degree and speciality with comma', () => {
    expect(combineDegreeAndSpeciality('BSc Computer Science', 'Software Engineering')).toBe(
      'BSc Computer Science, Software Engineering',
    )
    expect(combineDegreeAndSpeciality('MBA', '')).toBe('MBA')
  })

  it('parses valid employee rows from xlsx', () => {
    const buffer = buildXlsxBuffer([
      {
        FirstName: 'Ada',
        LastName: 'Lovelace',
        Email: 'ada@example.com',
        Password: 'secret123',
        ResumeTitle: 'Backend Engineer',
        Skills: 'Node.js, MongoDB',
        Experience: '3 years',
        Degree: 'BSc',
        Speciality: 'Computer Science',
        Phone: '+123456789',
        Telegram: '@ada',
      },
    ])

    const parsed = parseEmployeesXlsx(buffer)
    expect(parsed.errors).toEqual([])
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0]).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      resumeTitle: 'Backend Engineer',
      skills: 'Node.js, MongoDB',
      degree: 'BSc',
      speciality: 'Computer Science',
    })
  })

  it('reports validation errors for incomplete rows', () => {
    const buffer = buildXlsxBuffer([
      {
        FirstName: 'No',
        LastName: 'Email',
        Password: 'secret123',
        ResumeTitle: 'QA',
        Skills: 'Testing',
      },
    ])

    const parsed = parseEmployeesXlsx(buffer)
    expect(parsed.rows).toHaveLength(0)
    expect(parsed.errors[0]?.message).toBe('Email is required')
  })
})
