import { Header } from "@/components/jobs/header"
import { CompaniesClient, type CompanyListItem } from "@/components/companies/companies-client"
import { formatEmployerName } from "@/lib/format-employer-name"
import dbConnect from "@/lib/db/mongoose"
import { User, Vacancy, SavedVacancy } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function CompaniesPage() {
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

  const companyStats: CompanyListItem[] = await Promise.all(
    employers.map(async (emp) => {
      const openJobs = await Vacancy.countDocuments({ employerId: emp._id })
      return {
        id: emp._id.toString(),
        name: formatEmployerName(emp),
        industry: emp.industry || "Technology",
        description: emp.description || "",
        location: emp.location || "",
        employees: emp.employees || "50-200",
        openJobs,
        logoUrl: emp.logoUrl || null,
      }
    }),
  )

  const session = await getSession()
  let savedJobsCount = 0
  if (session?.user.role === "EMPLOYEE") {
    savedJobsCount = await SavedVacancy.countDocuments({ userId: session.user.id })
  }

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={savedJobsCount} />
      <CompaniesClient companies={companyStats} />
    </div>
  )
}
