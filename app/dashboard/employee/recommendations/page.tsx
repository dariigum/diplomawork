import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { EmployeeAiRecommendations } from '@/components/recommendations/employee-ai-recommendations'
import { Button } from '@/components/ui/button'

export default async function EmployeeRecommendationsPage() {
  const session = await getSession()
  if (!session || session.user.role !== 'EMPLOYEE') {
    redirect('/login')
  }

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-primary uppercase tracking-wide">JobFlow AI</p>
          <h1 className="text-3xl font-bold tracking-tight mt-1">Recommended for you</h1>
          <p className="text-muted-foreground mt-2 max-w-xl text-sm leading-relaxed">
            Personalized vacancy suggestions from your semantic profile — same backend used in the diploma demo pipeline.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/employee">← Back to dashboard</Link>
        </Button>
      </div>

      <EmployeeAiRecommendations />
    </div>
  )
}
