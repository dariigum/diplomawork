import { describe, expect, it } from 'vitest'
import { BEHAVIOUR_SCORE_CAP } from '@/lib/behaviour-score'
import {
  HYBRID_BEHAVIOUR_WEIGHT,
  HYBRID_SEMANTIC_WEIGHT,
  computeHybridFinalScore,
} from '@/lib/hybrid-recommendation-score'

/** Expected blend after semantic clamp [0,1] and behaviour clamp [0, BEHAVIOUR_SCORE_CAP], then final [0,1]. */
function expectedBlend(semantic: number, behaviour: number): number {
  const s = Number.isFinite(semantic) ? Math.max(0, Math.min(1, semantic)) : 0
  const b = Math.max(0, Math.min(BEHAVIOUR_SCORE_CAP, behaviour))
  const raw = s * HYBRID_SEMANTIC_WEIGHT + b * HYBRID_BEHAVIOUR_WEIGHT
  return Math.max(0, Math.min(1, raw))
}

describe('hybrid-recommendation-score', () => {
  describe('weight integrity (architecture)', () => {
    it('exports semantic weight 0.85 and behaviour weight 0.15', () => {
      expect(HYBRID_SEMANTIC_WEIGHT).toBe(0.85)
      expect(HYBRID_BEHAVIOUR_WEIGHT).toBe(0.15)
    })

    it('weights sum to 1 (explainable convex blend)', () => {
      expect(HYBRID_SEMANTIC_WEIGHT + HYBRID_BEHAVIOUR_WEIGHT).toBe(1)
    })
  })

  describe('deterministic blending', () => {
    it('returns identical results for repeated calls with the same inputs', () => {
      const a = computeHybridFinalScore(0.72, 0.08)
      const b = computeHybridFinalScore(0.72, 0.08)
      const c = computeHybridFinalScore(0.72, 0.08)
      expect(a).toBe(b)
      expect(b).toBe(c)
      expect(Object.is(a, b)).toBe(true)
    })
  })

  describe('formula correctness', () => {
    it('matches semantic * 0.85 + behaviour * 0.15 for in-range inputs', () => {
      const semantic = 0.8
      const behaviour = 0.1
      const expected = semantic * HYBRID_SEMANTIC_WEIGHT + behaviour * HYBRID_BEHAVIOUR_WEIGHT
      expect(computeHybridFinalScore(semantic, behaviour)).toBeCloseTo(expected, 12)
      expect(computeHybridFinalScore(semantic, behaviour)).toBeCloseTo(0.695, 12)
    })

    it('handles boundary semantic 1 and zero behaviour', () => {
      expect(computeHybridFinalScore(1, 0)).toBeCloseTo(HYBRID_SEMANTIC_WEIGHT, 12)
    })
  })

  describe('semantic-first dominance', () => {
    it('gives higher final to high semantic + low behaviour than low semantic + max capped behaviour (typical case)', () => {
      const highSemLowBeh = computeHybridFinalScore(0.9, 0)
      const lowSemMaxBeh = computeHybridFinalScore(0.5, BEHAVIOUR_SCORE_CAP)
      expect(highSemLowBeh).toBeGreaterThan(lowSemMaxBeh)
    })

    it('keeps strong semantic ahead of moderate semantic even when behaviour favours the latter', () => {
      const strongSemantic = computeHybridFinalScore(0.82, 0.01)
      const weakerSemanticBoosted = computeHybridFinalScore(0.74, BEHAVIOUR_SCORE_CAP)
      expect(strongSemantic).toBeGreaterThan(weakerSemanticBoosted)
    })

    it('caps behaviour contribution: max behaviour lift on raw score is 0.15 * BEHAVIOUR_SCORE_CAP', () => {
      const withMaxBeh = computeHybridFinalScore(0.5, BEHAVIOUR_SCORE_CAP)
      const withZeroBeh = computeHybridFinalScore(0.5, 0)
      const maxLift = withMaxBeh - withZeroBeh
      const theoreticalMax = BEHAVIOUR_SCORE_CAP * HYBRID_BEHAVIOUR_WEIGHT
      expect(maxLift).toBeCloseTo(theoreticalMax, 12)
      expect(theoreticalMax).toBeCloseTo(0.0225, 12)
    })
  })

  describe('cold-start preservation (behaviour = 0)', () => {
    it('preserves strict ordering by semantic score when behaviour is zero', () => {
      const semA = 0.91
      const semB = 0.4
      const semC = 0.405
      const finalA = computeHybridFinalScore(semA, 0)
      const finalB = computeHybridFinalScore(semB, 0)
      const finalC = computeHybridFinalScore(semC, 0)
      expect(finalA).toBeGreaterThan(finalC)
      expect(finalC).toBeGreaterThan(finalB)
      expect(finalA).toBeCloseTo(semA * HYBRID_SEMANTIC_WEIGHT, 12)
      expect(finalB).toBeCloseTo(semB * HYBRID_SEMANTIC_WEIGHT, 12)
    })
  })

  describe('behaviour boost bounds', () => {
    it('makes max-behaviour boost noticeable but smaller than semantic span at equal mid semantic', () => {
      const mid = 0.55
      const withoutBeh = computeHybridFinalScore(mid, 0)
      const withMaxBeh = computeHybridFinalScore(mid, BEHAVIOUR_SCORE_CAP)
      const boost = withMaxBeh - withoutBeh
      expect(boost).toBeGreaterThan(0)
      expect(boost).toBeLessThan(0.05)
    })

    it('high semantic with zero behaviour still beats mid semantic with max behaviour (realistic gap)', () => {
      const high = computeHybridFinalScore(0.88, 0)
      const midBoosted = computeHybridFinalScore(0.58, BEHAVIOUR_SCORE_CAP)
      expect(high).toBeGreaterThan(midBoosted)
    })
  })

  describe('clamp safety', () => {
    it('clamps semantic to [0,1] before blending', () => {
      expect(computeHybridFinalScore(-0.5, 0)).toBe(0)
      expect(computeHybridFinalScore(1.4, 0)).toBeCloseTo(HYBRID_SEMANTIC_WEIGHT, 12)
    })

    it('clamps behaviour to [0, BEHAVIOUR_SCORE_CAP] before blending', () => {
      const capped = computeHybridFinalScore(0.6, BEHAVIOUR_SCORE_CAP)
      const excessive = computeHybridFinalScore(0.6, 99)
      expect(excessive).toBe(capped)
      const negativeBeh = computeHybridFinalScore(0.6, -10)
      const zeroBeh = computeHybridFinalScore(0.6, 0)
      expect(negativeBeh).toBe(zeroBeh)
    })

    it('returns final score in [0, 1] and always finite for clamp-handled pathological inputs', () => {
      const cases: [number, number][] = [
        [-1, -1],
        [2, 2],
        [0.5, Number.POSITIVE_INFINITY],
        [Number.NaN, 0.1],
      ]
      for (const [s, b] of cases) {
        const out = computeHybridFinalScore(s, b)
        expect(Number.isFinite(out)).toBe(true)
        expect(out).toBeGreaterThanOrEqual(0)
        expect(out).toBeLessThanOrEqual(1)
        expect(out).toBe(expectedBlend(s, b))
      }
    })

    it('treats non-finite semantic as 0 (clamp01), keeping output finite', () => {
      expect(Number.isFinite(computeHybridFinalScore(Number.NaN, 0.05))).toBe(true)
    })

    it('does not sanitize non-finite behaviour: NaN behaviour yields NaN output (callers should pass finite scores)', () => {
      const out = computeHybridFinalScore(0.5, Number.NaN)
      expect(Number.isNaN(out)).toBe(true)
    })
  })

  describe('explainability-oriented regression (thesis)', () => {
    it('preserves semantic-first thesis: zero behaviour leaves final proportional to clamped semantic', () => {
      const s = 0.73
      expect(computeHybridFinalScore(s, 0)).toBeCloseTo(Math.min(1, Math.max(0, s)) * HYBRID_SEMANTIC_WEIGHT, 12)
    })

    it('preserves deterministic blending: same pair always same float', () => {
      expect(computeHybridFinalScore(0.61, 0.04)).toBe(computeHybridFinalScore(0.61, 0.04))
    })

    it('preserves capped behaviour channel: behaviour beyond cap does not change output', () => {
      expect(computeHybridFinalScore(0.77, BEHAVIOUR_SCORE_CAP)).toBe(
        computeHybridFinalScore(0.77, BEHAVIOUR_SCORE_CAP + 0.5),
      )
    })

    it('preserves cold-start safety: ordering by semantic is unchanged when behaviour is uniformly zero', () => {
      const finals = [0.2, 0.5, 0.9].map((s) => computeHybridFinalScore(s, 0))
      expect(finals[0]).toBeLessThan(finals[1])
      expect(finals[1]).toBeLessThan(finals[2])
    })
  })
})
