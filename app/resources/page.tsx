import { Header } from "@/components/jobs/header"
import { Footer } from "@/components/jobs/footer"
import { ResourcesPageShell } from "@/components/resources/resources-page-shell"
import dbConnect from "@/lib/db/mongoose"
import { SavedVacancy } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function ResourcesPage() {
  const session = await getSession()
  let savedJobsCount = 0
  if (session?.user.role === "EMPLOYEE") {
    await dbConnect()
    savedJobsCount = await SavedVacancy.countDocuments({ userId: session.user.id })
  }

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={savedJobsCount} />
      <ResourcesPageShell />
      <Footer />
    </div>
  )
}
