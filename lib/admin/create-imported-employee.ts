import { hashPassword } from '@/lib/auth'
import dbConnect from '@/lib/db/mongoose'
import { User, Resume } from '@/lib/db/schema'
import { toObjectId } from '@/lib/db/object-id'
import { buildResumeEmbeddingText } from '@/lib/embedding-text'
import { getEmbedding } from '@/lib/ml'
import {
  combineDegreeAndSpeciality,
  type EmployeeImportRow,
} from '@/lib/admin/import-employees-from-xlsx'

export type CreateImportedEmployeeResult =
  | { success: true; userId: string; email: string }
  | { success: false; email: string; message: string }

export async function createImportedEmployee(
  row: EmployeeImportRow,
): Promise<CreateImportedEmployeeResult> {
  const name = `${row.firstName} ${row.lastName}`.trim()
  const education = combineDegreeAndSpeciality(row.degree, row.speciality)

  try {
    await dbConnect()

    const existingUser = await User.findOne({ email: row.email }).lean()
    if (existingUser) {
      return {
        success: false,
        email: row.email,
        message: 'Email already registered',
      }
    }

    const passwordHash = await hashPassword(row.password)
    const user = await User.create({
      email: row.email,
      passwordHash,
      name,
      role: 'EMPLOYEE',
    })

    let embedding: number[] | undefined
    try {
      const text = buildResumeEmbeddingText({
        title: row.resumeTitle,
        skills: row.skills,
        experience: row.experience,
        education,
      })
      embedding = await getEmbedding(text)
    } catch (error) {
      console.warn('[JobFlow] Imported employee resume saved without embedding.', error)
    }

    await Resume.create({
      userId: toObjectId(user.id),
      title: row.resumeTitle,
      skills: row.skills,
      experience: row.experience || '',
      education: education || '',
      activeForAi: true,
      ...(embedding ? { embedding } : {}),
      phone: row.phone || '',
      telegram: row.telegram || '',
      cvLink: '',
      cvFile: '',
      linkedin: '',
      github: '',
    })

    return { success: true, userId: user.id, email: row.email }
  } catch (error) {
    console.error('[JobFlow] createImportedEmployee failed.', error)
    return {
      success: false,
      email: row.email,
      message: 'Failed to create employee',
    }
  }
}
