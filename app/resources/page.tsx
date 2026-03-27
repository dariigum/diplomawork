import { Header } from "@/components/jobs/header"
import { Footer } from "@/components/jobs/footer"
import dbConnect from "@/lib/db/mongoose"
import { Article, SavedVacancy } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import ResourcesClient from "./ResourcesClient"
import { ARTICLE_PLACEHOLDER_URL } from "@/lib/resources/curated-articles"

function getSourceSite(sourceUrl?: string) {
  if (!sourceUrl) return "unknown"

  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "")
  } catch {
    return "unknown"
  }
}

export default async function ResourcesPage() {
  await dbConnect()
  
  const rawArticles = await Article.find({
    language: { $in: ["ru", "en"] },
    sourceUrl: { $exists: true, $ne: "" },
  })
    .sort({ createdAt: -1 })
    .lean()
  const articles = rawArticles.map((a: any) => ({
    id: a._id.toString(),
    title: a.title,
    summary: a.summary,
    content: a.content,
    category: a.category,
    language: a.language,
    readTime: a.readTime,
    imageUrl: a.imageUrl || ARTICLE_PLACEHOLDER_URL,
    sourceUrl: a.sourceUrl || "#",
    sourceSite: a.sourceSite || getSourceSite(a.sourceUrl),
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
