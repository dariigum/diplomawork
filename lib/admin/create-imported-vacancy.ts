import dbConnect from '@/lib/db/mongoose'
import { Vacancy } from '@/lib/db/schema'
import { toObjectId } from '@/lib/db/object-id'
import { buildVacancyEmbeddingText } from '@/lib/embedding-text'
import { getEmbedding } from '@/lib/ml'
import {
  normalizeEmploymentType,
  normalizeWorkFormat,
  type VacancyImportRow,
} from '@/lib/admin/import-vacancies-from-xlsx'

export type CreateImportedVacancyResult =
  | { success: true; vacancyId: string; company: string; title: string }
  | { success: false; company: string; title?: string; message: string }

export async function createImportedVacancy(
  row: VacancyImportRow,
  employerId: string,
): Promise<CreateImportedVacancyResult> {
  const employmentType = normalizeEmploymentType(row.employmentType)
  const workMode = normalizeWorkFormat(row.workFormat)

  if (!employmentType || !workMode) {
    return {
      success: false,
      company: row.company,
      title: row.title,
      message: 'Invalid employment type or work format',
    }
  }

  const city = row.city || ''
  const country = row.country || ''
  const address = workMode === 'REMOTE' ? 'Remote' : city || country || 'On-site'

  try {
    await dbConnect()

    let embedding: number[] | undefined
    try {
      const text = buildVacancyEmbeddingText({
        title: row.title,
        description: row.description,
        skillsRequired: row.skills || '',
        requirements: [],
        responsibilities: [],
      })
      embedding = await getEmbedding(text)
    } catch (error) {
      console.warn('[JobFlow] Imported vacancy saved without embedding.', error)
    }

    const vacancy = await Vacancy.create({
      employerId: toObjectId(employerId),
      title: row.title,
      description: row.description || '',
      skillsRequired: row.skills || '',
      salaryMin: row.minSalaryUsd,
      salaryMax: row.maxSalaryUsd,
      employmentType,
      workMode,
      country,
      city,
      address,
      experience: 'Any experience',
      ...(embedding ? { embedding } : {}),
    })

    return {
      success: true,
      vacancyId: vacancy.id,
      company: row.company,
      title: row.title,
    }
  } catch (error) {
    console.error('[JobFlow] createImportedVacancy failed.', error)
    return {
      success: false,
      company: row.company,
      title: row.title,
      message: 'Failed to create vacancy',
    }
  }
}
