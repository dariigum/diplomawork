import { Header } from "@/components/jobs/header"
import { Footer } from "@/components/jobs/footer"
import { WelcomePage } from "@/components/welcome/welcome-page"
import dbConnect from "@/lib/db/mongoose"
import { SavedVacancy } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function WelcomeRoute() {
  let savedJobsCount = 0
  let isLoggedIn = false

  try {
    const session = await getSession()
    isLoggedIn = !!session?.user
    if (session?.user.role === "EMPLOYEE") {
      await dbConnect()
      savedJobsCount = await SavedVacancy.countDocuments({ userId: session.user.id })
    }
  } catch {
    savedJobsCount = 0
    isLoggedIn = false
  }

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={savedJobsCount} />
      <WelcomePage isLoggedIn={isLoggedIn} />
      <Footer />
    </div>
  )
}
