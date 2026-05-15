export type ResolvedArticleMetadata = {
  title: string
  summary: string
  imageUrl: string
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&#x2F;/gi, "/")
    .replace(/&#x27;/gi, "'")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
}

function readMeta(html: string, property: string): string | null {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"),
  ]
  for (const pattern of patterns) {
    const match = html.match(pattern)
    if (match?.[1]) return decodeHtmlEntities(match[1].trim())
  }
  return null
}

function normalizeImageUrl(url: string, pageUrl: string): string {
  if (url.startsWith("//")) return `https:${url}`
  if (url.startsWith("/")) {
    const origin = new URL(pageUrl).origin
    return `${origin}${url}`
  }
  return url
}

/** Prefer article cover over generic site logo when Habr returns default OG image. */
function pickImageUrl(html: string, pageUrl: string, ogImage: string | null): string | null {
  const normalizedOg = ogImage ? normalizeImageUrl(ogImage, pageUrl) : null
  if (normalizedOg && !normalizedOg.includes("/img/habr_ru.png")) {
    return normalizedOg
  }

  const habrStorage = html.match(/https:\/\/habrastorage\.org\/[^"'\s<>]+/i)?.[0]
  if (habrStorage) return habrStorage

  return normalizedOg
}

export async function resolveArticleMetadata(
  sourceUrl: string,
  language: "ru" | "en" = "ru",
): Promise<ResolvedArticleMetadata> {
  const response = await fetch(sourceUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; JobFlow/1.0; +https://jobflow.local)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": language === "en" ? "en-US,en;q=0.9" : "ru-RU,ru;q=0.9,en;q=0.8",
    },
    redirect: "follow",
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch article metadata (${response.status}): ${sourceUrl}`)
  }

  const html = await response.text()
  const title =
    readMeta(html, "og:title") ||
    readMeta(html, "twitter:title") ||
    html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim() ||
    "Article"

  const summary =
    readMeta(html, "og:description") ||
    readMeta(html, "twitter:description") ||
    readMeta(html, "description") ||
    ""

  const ogImage = readMeta(html, "og:image") || readMeta(html, "twitter:image")
  let imageUrl = pickImageUrl(html, sourceUrl, ogImage)

  if (!imageUrl && sourceUrl.includes("developer.mozilla.org")) {
    imageUrl = "https://developer.mozilla.org/mdn-social-share.cd41f5eaca9c.png"
  }

  if (!imageUrl && sourceUrl.includes("web.dev")) {
    imageUrl = "https://web.dev/images/social-wide.jpg"
  }

  if (!imageUrl) {
    throw new Error(`No cover image found for ${sourceUrl}`)
  }

  return {
    title: decodeHtmlEntities(title).replace(/\s+\/\s+Хабр$/i, "").replace(/\s+–\s+React$/i, " – React").trim(),
    summary: summary.slice(0, 500),
    imageUrl,
  }
}
