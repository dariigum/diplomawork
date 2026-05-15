/**
 * Display-level deduplication for semantic search panel results.
 * Does not change API ranking, embeddings, or database contents.
 */

export type SemanticResultDedupeInput = {
  vacancyId: string
  semanticScore: number
  title: string
  company: string
}

/** trim · lowercase · collapse internal whitespace */
export function normalizeSemanticDedupePart(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function semanticResultDedupeKey(
  title: string,
  company: string,
  semanticScore: number,
): string {
  const t = normalizeSemanticDedupePart(title)
  const c = normalizeSemanticDedupePart(company)
  const bucket = Math.round(semanticScore * 10)
  return `${t}|${c}|${bucket}`
}

/**
 * Collapse near-duplicate rows (same normalized title, company, score bucket).
 * Keeps the highest semanticScore per key; output order follows first key appearance.
 */
export function dedupeSemanticResults<T extends SemanticResultDedupeInput>(items: readonly T[]): T[] {
  if (items.length <= 1) return [...items]

  const bestByKey = new Map<string, T>()
  for (const item of items) {
    const key = semanticResultDedupeKey(item.title, item.company, item.semanticScore)
    const prev = bestByKey.get(key)
    if (!prev || item.semanticScore > prev.semanticScore) {
      bestByKey.set(key, item)
    }
  }

  const emitted = new Set<string>()
  const out: T[] = []
  for (const item of items) {
    const key = semanticResultDedupeKey(item.title, item.company, item.semanticScore)
    if (emitted.has(key)) continue
    emitted.add(key)
    out.push(bestByKey.get(key)!)
  }

  return out
}
