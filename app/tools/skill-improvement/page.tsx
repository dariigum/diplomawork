import { Header } from '@/components/jobs/header'
import { Footer } from '@/components/jobs/footer'
import dbConnect from '@/lib/db/mongoose'
import { SavedVacancy } from '@/lib/db/schema'
import { getSession } from '@/lib/auth'
import { redirect } from 'next/navigation'
import SkillImprovementClient from './skill-improvement-client'

export const dynamic = 'force-dynamic'

export default async function SkillImprovementPage() {
  const session = await getSession()

  if (!session || session.user?.role !== 'EMPLOYEE') {
    redirect('/tools')
  }

  await dbConnect()
  const savedJobsCount = await SavedVacancy.countDocuments({ userId: session.user.id })

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header savedJobsCount={savedJobsCount} />
      <main className="flex-grow">
        <SkillImprovementClient />
      </main>
      <Footer />
    </div>
  )
}
