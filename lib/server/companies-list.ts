import { formatEmployerName } from "@/lib/format-employer-name"
import dbConnect from "@/lib/db/mongoose"
import { User, Vacancy } from "@/lib/db/schema"
import type { CompanyListItem } from "@/components/companies/companies-client"

export async function getCompaniesList(): Promise<CompanyListItem[]> {
  await dbConnect()

  const employers = (await User.find({ role: "EMPLOYER" }).lean()) as Array<{
    _id: { toString(): string }
    industry?: string
    description?: string
    location?: string
    employees?: string
    logoUrl?: string
    name?: string
    companyName?: string
  }>

  return Promise.all(
    employers.map(async (emp) => {
      const openJobs = await Vacancy.countDocuments({ employerId: emp._id })
      return {
        id: emp._id.toString(),
        name: formatEmployerName(emp),
        industry: emp.industry || "",
        description: emp.description || "",
        location: emp.location || "",
        employees: emp.employees || "",
        openJobs,
        logoUrl: emp.logoUrl || null,
      }
    }),
  )
}
