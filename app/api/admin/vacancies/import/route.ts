import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { createImportedVacancy, type CreateImportedVacancyResult } from '@/lib/admin/create-imported-vacancy'
import { formatVacancyImportErrors, parseVacanciesXlsx } from '@/lib/admin/import-vacancies-from-xlsx'
import {
  buildEmployerIdByCompanyMap,
  resolveEmployerId,
} from '@/lib/admin/resolve-employer-by-company'

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || typeof file !== 'object' || !('arrayBuffer' in file)) {
      return NextResponse.json({ error: 'XLSX file is required' }, { status: 400 })
    }

    const upload = file as File
    if (!upload.name.toLowerCase().endsWith('.xlsx')) {
      return NextResponse.json({ error: 'Only .xlsx files are supported' }, { status: 400 })
    }

    const buffer = await upload.arrayBuffer()
    const parsed = parseVacanciesXlsx(buffer)

    if (parsed.rows.length === 0 && parsed.errors.length > 0) {
      console.warn('[JobFlow] import-vacancies parse errors:', parsed.errors)
      return NextResponse.json(
        {
          error: `No valid rows found in spreadsheet. ${formatVacancyImportErrors(parsed.errors)}`,
          created: 0,
          skipped: 0,
          errors: parsed.errors,
        },
        { status: 400 },
      )
    }

    const employerByCompany = await buildEmployerIdByCompanyMap()
    const rowResults: CreateImportedVacancyResult[] = []

    for (const row of parsed.rows) {
      const employerId = resolveEmployerId(row.company, employerByCompany)
      if (!employerId) {
        rowResults.push({
          success: false,
          company: row.company,
          title: row.title,
          message: `Company not found: ${row.company}`,
        })
        continue
      }

      rowResults.push(await createImportedVacancy(row, employerId))
    }

    const created = rowResults.filter((result) => result.success).length
    const skipped = rowResults.filter((result) => !result.success).length
    const errors = [
      ...parsed.errors,
      ...rowResults
        .filter((result): result is Extract<CreateImportedVacancyResult, { success: false }> => !result.success)
        .map((result) => ({
          row: 0,
          company: result.company,
          title: result.title,
          message: result.message,
        })),
    ]

    return NextResponse.json({
      created,
      skipped,
      totalRows: parsed.rows.length,
      errors,
    })
  } catch (error) {
    console.error('[JobFlow] import-vacancies failed.', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
