import { Header } from "@/components/jobs/header"
import { ToolsHubClient } from "@/components/tools/tools-hub-client"
import { getToolsHubContext } from "@/app/actions/tools-hub"

export const dynamic = "force-dynamic"

export default async function ToolsPage() {
  const { role, employee, employer, savedJobsCount } = await getToolsHubContext()

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={savedJobsCount} />
      <main className="container mx-auto px-4 py-8">
        <ToolsHubClient role={role === "EMPLOYEE" || role === "EMPLOYER" ? role : null} employee={employee} employer={employer} />
      </main>
    </div>
  )
}
