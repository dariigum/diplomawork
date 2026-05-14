/** Tiny HTML → plain text helper for deterministic normalization (no cheerio). */
export function stripHtmlToPlainText(value: string): string {
  const withoutTags = value.replace(/<[^>]+>/g, ' ')
  return withoutTags.replace(/\s+/g, ' ').trim()
}
