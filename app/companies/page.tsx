import { Header } from "@/components/jobs/header"
import { Footer } from "@/components/jobs/footer"
import { CompaniesPageShell } from "@/components/companies/companies-page-shell"
import dbConnect from "@/lib/db/mongoose"
import { SavedVacancy } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function CompaniesPage() {
  const session = await getSession()
  let savedJobsCount = 0
  if (session?.user.role === "EMPLOYEE") {
    await dbConnect()
    savedJobsCount = await SavedVacancy.countDocuments({ userId: session.user.id })
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      <Header savedJobsCount={savedJobsCount} />
      <div className="min-w-0 flex-grow">
        <CompaniesPageShell />
      </div>
      <Footer />
    </div>
  )
}
