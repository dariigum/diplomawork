/**
 * Minimal shape checks compatible with `cosineSimilarity` / recommendations
 * (non-empty array of finite numbers, reasonable length).
 */
export function isValidEmbeddingVector(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 8192) return false
  for (let i = 0; i < value.length; i += 1) {
    const n = value[i]
    if (typeof n !== 'number' || !Number.isFinite(n)) return false
  }
  return true
}
