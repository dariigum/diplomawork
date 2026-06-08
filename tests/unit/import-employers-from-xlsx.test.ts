import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import {
  buildEmployerDescription,
  combineHeadOfficeLocation,
  parseEmployersXlsx,
} from '@/lib/admin/import-employers-from-xlsx'

function buildXlsxBuffer(rows: Record<string, string>[]): ArrayBuffer {
  const sheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, 'Employers')
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

describe('import-employers-from-xlsx', () => {
  it('combines head office city and country', () => {
    expect(combineHeadOfficeLocation('Almaty', 'Kazakhstan')).toBe('Almaty, Kazakhstan')
  })

  it('builds description with CEO line', () => {
    expect(buildEmployerDescription('Jane', 'Doe', 'Fintech startup')).toBe(
      'CEO: Jane Doe\n\nFintech startup',
    )
  })

  it('parses valid employer rows from xlsx', () => {
    const buffer = buildXlsxBuffer([
      {
        CompanyName: 'Acme Corp',
        CEO_FirstName: 'John',
        CEO_LastName: 'Smith',
        HeadOfficeCountry: 'Kazakhstan',
        HeadOfficeCity: 'Almaty',
        Description: 'Hiring platform',
        Email: 'hr@acme.com',
        Password: 'secret123',
      },
    ])

    const parsed = parseEmployersXlsx(buffer)
    expect(parsed.errors).toEqual([])
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0]).toMatchObject({
      companyName: 'Acme Corp',
      ceoFirstName: 'John',
      ceoLastName: 'Smith',
      headOfficeCountry: 'Kazakhstan',
      headOfficeCity: 'Almaty',
      email: 'hr@acme.com',
    })
  })
})
