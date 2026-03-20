import { Header } from "@/components/jobs/header"
import { Footer } from "@/components/jobs/footer"
import dbConnect from "@/lib/db/mongoose"
import { Article, SavedVacancy } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import ResourcesClient from "./ResourcesClient"

export default async function ResourcesPage() {
  await dbConnect()
  
  const rawArticles = await Article.find({}).sort({ createdAt: -1 }).lean()
  const articles = rawArticles.map((a: any) => ({
    id: a._id.toString(),
    title: a.title,
    summary: a.summary,
    content: a.content,
    category: a.category,
    language: a.language,
    readTime: a.readTime,
    imageUrl: a.imageUrl || "/placeholder.svg",
    sourceUrl: a.sourceUrl || "#",
    createdAt: a.createdAt.toISOString()
  }))

  const session = await getSession()
  let savedJobsCount = 0
  if (session && session.user.role === 'EMPLOYEE') {
    savedJobsCount = await SavedVacancy.countDocuments({ userId: session.user.id })
  }

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={savedJobsCount} />
      <ResourcesClient initialArticles={articles} />
      <Footer />
    </div>
  )
}
