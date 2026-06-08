import { cookies } from "next/headers"
import dbConnect from "@/lib/db/mongoose"
import { Article } from "@/lib/db/schema"
import { getDictionary } from "@/lib/i18n/dictionaries"
import { parseSafeExternalUrl, toIsoDateString } from "@/lib/vacancy-detail-display"

export type ResourceArticleDto = {
  id: string
  title: string
  summary: string
  content: string
  category: string
  language: string
  readTime: string
  imageUrl: string
  sourceUrl: string | null
  sourceSite: string | null
  createdAt: string | null
}

export async function getResourcesArticles(): Promise<ResourceArticleDto[]> {
  await dbConnect()

  const cookieStore = await cookies()
  const locale = cookieStore.get("NEXT_LOCALE")?.value || "en"
  const t = getDictionary(locale)

  const rawArticles = await Article.find({}).sort({ createdAt: -1 }).lean()

  return rawArticles.map((a) => {
    const external = parseSafeExternalUrl(a.sourceUrl)
    const sourceSite = external ? new URL(external.href).hostname.replace(/^www\./i, "") : null
    return {
      id: String(a._id),
      title: typeof a.title === "string" ? a.title : t.resources.untitledArticle,
      summary: typeof a.summary === "string" ? a.summary : "",
      content: typeof a.content === "string" ? a.content : "",
      category: typeof a.category === "string" ? a.category : t.resources.generalCategory,
      language: typeof a.language === "string" ? a.language : "ru",
      readTime: typeof a.readTime === "string" ? a.readTime : "",
      imageUrl: typeof a.imageUrl === "string" && a.imageUrl.trim() ? a.imageUrl : "/placeholder.svg",
      sourceUrl: external?.href ?? null,
      sourceSite,
      createdAt: toIsoDateString(a.createdAt),
    }
  })
}
