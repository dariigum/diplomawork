import { Article } from "@/lib/db/schema"
import { ARTICLE_CATALOG, ARTICLE_SOURCE_URLS } from "@/lib/resources/article-catalog"
import { isEnglishDisplayText } from "@/lib/resources/article-text-locale"
import { resolveArticleMetadata } from "@/lib/resources/resolve-article-metadata"

let catalogSyncedThisProcess = false

/**
 * Syncs verified articles: fetches real title, summary and cover from source pages.
 * Removes Spanish and other articles no longer in the catalog.
 */
export async function syncArticleCatalog(): Promise<{ synced: number; removed: number }> {
  let synced = 0

  for (const entry of ARTICLE_CATALOG) {
    let metadata: Awaited<ReturnType<typeof resolveArticleMetadata>>
    try {
      metadata = await resolveArticleMetadata(entry.sourceUrl, entry.language)
    } catch (error) {
      console.warn(
        `[resources] Failed to resolve metadata for ${entry.sourceUrl}. Skipping this entry.`,
        error,
      )
      continue
    }

    if (entry.language === "en" && !isEnglishDisplayText(metadata.title)) {
      await Article.deleteMany({ sourceUrl: entry.sourceUrl })
      continue
    }

    await Article.findOneAndUpdate(
      { sourceUrl: entry.sourceUrl },
      {
        $set: {
          title: metadata.title,
          summary: metadata.summary || metadata.title,
          content: "External article — open the source link for the full text.",
          category: entry.category,
          language: entry.language,
          readTime: entry.readTime,
          imageUrl: metadata.imageUrl,
          sourceUrl: entry.sourceUrl,
        },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    )
    synced += 1
  }

  const removed = await Article.deleteMany({
    $or: [{ language: "es" }, { sourceUrl: { $nin: [...ARTICLE_SOURCE_URLS] } }],
  })

  const englishArticles = await Article.find({ language: "en" }).select("title _id").lean()
  const staleEnglishIds = englishArticles
    .filter((a) => !isEnglishDisplayText(a.title))
    .map((a) => a._id)
  let removedStaleEnglish = 0
  if (staleEnglishIds.length > 0) {
    const staleResult = await Article.deleteMany({ _id: { $in: staleEnglishIds } })
    removedStaleEnglish = staleResult.deletedCount ?? 0
  }

  return { synced, removed: (removed.deletedCount ?? 0) + removedStaleEnglish }
}

/** Runs once per server process so /resources gets real covers without re-fetching every request. */
export async function ensureArticleCatalogSynced(): Promise<void> {
  if (catalogSyncedThisProcess) return
  await syncArticleCatalog()
  catalogSyncedThisProcess = true
}
