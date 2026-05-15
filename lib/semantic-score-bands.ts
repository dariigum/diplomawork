/** Score bands reused across API diagnostics and UI labels (deterministic thresholds). */
export const SEMANTIC_SCORE_BAND_STRONG = 0.75
export const SEMANTIC_SCORE_BAND_SOLID = 0.55
export const SEMANTIC_SCORE_BAND_RELATED = 0.35

export type SemanticScoreBand = 'strong' | 'solid' | 'related' | 'loose'

export type SemanticScoreBandCounts = {
  strong: number
  solid: number
  related: number
  loose: number
}

/** Classify a positive finite semantic score into an existing project band. */
export function semanticScoreBand(score: number): SemanticScoreBand | null {
  if (!Number.isFinite(score) || score <= 0) return null
  if (score >= SEMANTIC_SCORE_BAND_STRONG) return 'strong'
  if (score >= SEMANTIC_SCORE_BAND_SOLID) return 'solid'
  if (score >= SEMANTIC_SCORE_BAND_RELATED) return 'related'
  return 'loose'
}

/** Short tier label for UI — deterministic from score only. */
export function semanticMatchStrengthLabel(score: number): string {
  const band = semanticScoreBand(score)
  if (band === 'strong') return 'Strong semantic similarity'
  if (band === 'solid') return 'Solid semantic overlap'
  if (band === 'related') return 'Related semantic overlap'
  if (band === 'loose') return 'Loose semantic overlap'
  return 'Semantic similarity'
}

export function emptySemanticScoreBandCounts(): SemanticScoreBandCounts {
  return { strong: 0, solid: 0, related: 0, loose: 0 }
}

export function incrementSemanticScoreBandCount(counts: SemanticScoreBandCounts, band: SemanticScoreBand): void {
  counts[band] += 1
}

/** Primary semantic retrieval tier (related band and above). */
export function isPrimarySemanticScore(score: number): boolean {
  return Number.isFinite(score) && score >= SEMANTIC_SCORE_BAND_RELATED
}

/** Weak recovery tier: positive cosine below related band. */
export function isWeakSemanticScore(score: number): boolean {
  return Number.isFinite(score) && score > 0 && score < SEMANTIC_SCORE_BAND_RELATED
}

/** Label for weak-recovery UI — low-confidence wording only. */
export function weakSemanticTierLabel(score: number): string {
  if (isWeakSemanticScore(score)) return 'Loose semantic overlap'
  return 'Weak semantic relation'
}
