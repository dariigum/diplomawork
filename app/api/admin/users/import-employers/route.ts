import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import {
  createImportedEmployer,
  type CreateImportedEmployerResult,
} from '@/lib/admin/create-imported-employer'
import { parseEmployersXlsx } from '@/lib/admin/import-employers-from-xlsx'

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
    const parsed = parseEmployersXlsx(buffer)

    if (parsed.rows.length === 0 && parsed.errors.length > 0) {
      return NextResponse.json(
        {
          error: 'No valid rows found in spreadsheet',
          created: 0,
          skipped: 0,
          errors: parsed.errors,
        },
        { status: 400 },
      )
    }

    const rowResults: CreateImportedEmployerResult[] = []
    for (const row of parsed.rows) {
      rowResults.push(await createImportedEmployer(row))
    }

    const created = rowResults.filter((result) => result.success).length
    const skipped = rowResults.filter((result) => !result.success).length
    const errors = [
      ...parsed.errors,
      ...rowResults
        .filter((result): result is Extract<CreateImportedEmployerResult, { success: false }> => !result.success)
        .map((result) => ({
          row: 0,
          email: result.email,
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
    console.error('[JobFlow] import-employers failed.', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
