import { hashPassword } from '@/lib/auth'
import dbConnect from '@/lib/db/mongoose'
import { User } from '@/lib/db/schema'
import {
  buildEmployerDescription,
  combineHeadOfficeLocation,
  type EmployerImportRow,
} from '@/lib/admin/import-employers-from-xlsx'

export type CreateImportedEmployerResult =
  | { success: true; userId: string; email: string }
  | { success: false; email: string; message: string }

export async function createImportedEmployer(
  row: EmployerImportRow,
): Promise<CreateImportedEmployerResult> {
  const location = combineHeadOfficeLocation(row.headOfficeCity, row.headOfficeCountry)
  const description = buildEmployerDescription(row.ceoFirstName, row.ceoLastName, row.description)

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
      name: row.companyName,
      role: 'EMPLOYER',
      location,
      description,
    })

    return { success: true, userId: user.id, email: row.email }
  } catch (error) {
    console.error('[JobFlow] createImportedEmployer failed.', error)
    return {
      success: false,
      email: row.email,
      message: 'Failed to create employer',
    }
  }
}
