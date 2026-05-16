import "dotenv/config"
import dbConnect from "../lib/db/mongoose"
import { syncArticleCatalog } from "../lib/resources/sync-article-catalog"
import { ARTICLE_CATALOG } from "../lib/resources/article-catalog"

async function main() {
  await dbConnect()
  const { synced, removed } = await syncArticleCatalog()
  console.log(`Synced ${synced} articles from source pages. Removed ${removed} outdated entries.`)
  process.exit(0)
}

main().catch((err) => {
  console.error("Article seed failed:", err)
  process.exit(1)
})
