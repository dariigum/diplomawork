import dbConnect from '@/lib/db/mongoose'
import { User } from '@/lib/db/schema'
import { normalizeCompanyName } from '@/lib/admin/import-vacancies-from-xlsx'

export async function buildEmployerIdByCompanyMap(): Promise<Map<string, string>> {
  await dbConnect()
  const employers = await User.find({ role: 'EMPLOYER' }).select('name').lean()
  const map = new Map<string, string>()

  for (const employer of employers) {
    const name = typeof employer.name === 'string' ? employer.name : ''
    const key = normalizeCompanyName(name)
    if (!key) continue
    map.set(key, String(employer._id))
  }

  return map
}

export function resolveEmployerId(
  company: string,
  employerByCompany: Map<string, string>,
): string | null {
  return employerByCompany.get(normalizeCompanyName(company)) ?? null
}
