import { NextResponse } from "next/server"
import { ensureArticleCatalogSynced } from "@/lib/resources/sync-article-catalog"
import { getResourcesArticles } from "@/lib/server/resources-articles"

export async function GET() {
  try {
    void ensureArticleCatalogSynced().catch((err) => {
      console.error("[public/resources sync]", err)
    })
    const articles = await getResourcesArticles()
    return NextResponse.json({ articles })
  } catch (error) {
    console.error("[public/resources GET]", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
