import { Header } from "@/components/jobs/header"
import { Footer } from "@/components/jobs/footer"
import dbConnect from "@/lib/db/mongoose"
import { Article, SavedVacancy } from "@/lib/db/schema"
import { getSession } from "@/lib/auth"
import { parseSafeExternalUrl, toIsoDateString } from "@/lib/vacancy-detail-display"
import { ensureArticleCatalogSynced } from "@/lib/resources/sync-article-catalog"
import ResourcesClient from "./ResourcesClient"

export const dynamic = "force-dynamic"

export default async function ResourcesPage() {
  await dbConnect()
  await ensureArticleCatalogSynced()

  const rawArticles = await Article.find({}).sort({ createdAt: -1 }).lean()
  const articles = rawArticles.map((a: Record<string, unknown>) => {
    const external = parseSafeExternalUrl(a.sourceUrl)
    const sourceSite = external ? new URL(external.href).hostname.replace(/^www\./i, "") : null
    return {
      id: String((a as { _id?: unknown })._id),
      title: typeof a.title === "string" ? a.title : "Untitled article",
      summary: typeof a.summary === "string" ? a.summary : "",
      content: typeof a.content === "string" ? a.content : "",
      category: typeof a.category === "string" ? a.category : "General",
      language: typeof a.language === "string" ? a.language : "ru",
      readTime: typeof a.readTime === "string" ? a.readTime : "",
      imageUrl: typeof a.imageUrl === "string" && a.imageUrl.trim() ? a.imageUrl : "/placeholder.svg",
      sourceUrl: external?.href ?? null,
      sourceSite,
      createdAt: toIsoDateString(a.createdAt),
    }
  })

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
