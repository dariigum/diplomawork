import { describe, expect, it } from 'vitest'
import {
  BEHAVIOUR_SCORE_CAP,
  computeVacancyBehaviourScore,
  type BehaviourProfileForScore,
  type VacancyBehaviourScoreInput,
} from '@/lib/behaviour-score'
import {
  computeHybridFinalScore,
  HYBRID_BEHAVIOUR_WEIGHT,
  HYBRID_SEMANTIC_WEIGHT,
} from '@/lib/hybrid-recommendation-score'
import { cosineSimilarity } from '@/lib/recommendation'

type PipelineCandidate = {
  id: string
  role: string
  semantic: number
  behaviour: number
}

function finalScore(c: PipelineCandidate): number {
  return computeHybridFinalScore(c.semantic, c.behaviour)
}

/** Descending final score; tie-break semantic desc, then id for stable ordering. */
function rankByPipeline(candidates: PipelineCandidate[]): string[] {
  return [...candidates]
    .sort((a, b) => {
      const df = finalScore(b) - finalScore(a)
      if (df !== 0) return df
      const ds = b.semantic - a.semantic
      if (ds !== 0) return ds
      return a.id.localeCompare(b.id)
    })
    .map((c) => c.id)
}

function profile(p: Partial<BehaviourProfileForScore>): BehaviourProfileForScore {
  return {
    preferredSkills: [],
    preferredKeywords: [],
    preferredCategories: [],
    ...p,
  }
}

function vacancy(v: Partial<VacancyBehaviourScoreInput>): VacancyBehaviourScoreInput {
  return {
    title: '',
    skillsRequired: '',
    description: '',
    ...v,
  }
}

/** Small deterministic embedding for cosine smoke (L2-normalized-ish). */
function unitEmbedding(dim: number, seed: number): number[] {
  const out = new Array<number>(dim).fill(0)
  out[seed % dim] = 1
  return out
}

describe('recommendation pipeline safety (pure helpers)', () => {
  describe('semantic-first ranking guarantee', () => {
    it('keeps AI engineer (high semantic, modest behaviour) ahead of backend role (lower semantic, max behaviour) in realistic fixture ordering', () => {
      const candidates: PipelineCandidate[] = [
        {
          id: 'ai-eng',
          role: 'AI engineer — PyTorch services',
          semantic: 0.88,
          behaviour: 0.04,
        },
        {
          id: 'backend-eng',
          role: 'Backend engineer — REST microservices',
          semantic: 0.58,
          behaviour: BEHAVIOUR_SCORE_CAP,
        },
      ]
      const order = rankByPipeline(candidates)
      expect(order[0]).toBe('ai-eng')
      expect(finalScore(candidates[0])).toBeGreaterThan(finalScore(candidates[1]))
    })

    it('keeps frontend lead (strong semantic) ahead of DevOps role boosted to max behaviour but weaker semantic', () => {
      const candidates: PipelineCandidate[] = [
        { id: 'fe', role: 'Frontend — React/Next', semantic: 0.82, behaviour: 0.02 },
        { id: 'sre', role: 'DevOps — Kubernetes', semantic: 0.62, behaviour: BEHAVIOUR_SCORE_CAP },
      ]
      expect(rankByPipeline(candidates)[0]).toBe('fe')
    })
  })

  describe('cold-start recommendation safety (behaviour = 0)', () => {
    it('orders candidates strictly by semantic score when all behaviour scores are zero', () => {
      const candidates: PipelineCandidate[] = [
        { id: 'nlp-intern', role: 'NLP internship', semantic: 0.71, behaviour: 0 },
        { id: 'fe-dev', role: 'Frontend developer', semantic: 0.9, behaviour: 0 },
        { id: 'be-dev', role: 'Backend engineer', semantic: 0.55, behaviour: 0 },
      ]
      const bySemantic = [...candidates].sort((a, b) => b.semantic - a.semantic).map((c) => c.id)
      const byPipeline = rankByPipeline(candidates)
      expect(byPipeline).toEqual(bySemantic)
    })

    it('preserves pairwise semantic ordering under zero behaviour (monotone with hybrid)', () => {
      const high = { id: 'h', role: 'h', semantic: 0.8, behaviour: 0 as const }
      const low = { id: 'l', role: 'l', semantic: 0.3, behaviour: 0 as const }
      expect(finalScore(high)).toBeGreaterThan(finalScore(low))
      expect(finalScore(high)).toBeCloseTo(high.semantic * HYBRID_SEMANTIC_WEIGHT, 12)
      expect(finalScore(low)).toBeCloseTo(low.semantic * HYBRID_SEMANTIC_WEIGHT, 12)
    })
  })

  describe('behaviour boost boundedness', () => {
    it('does not let max behaviour rescue an extremely weak semantic above a moderate semantic cold profile', () => {
      const weakBoosted = finalScore({ id: 'w', role: 'w', semantic: 0.06, behaviour: BEHAVIOUR_SCORE_CAP })
      const moderateCold = finalScore({ id: 'm', role: 'm', semantic: 0.22, behaviour: 0 })
      expect(moderateCold).toBeGreaterThan(weakBoosted)
    })

    it('caps total hybrid contribution so behaviour cannot add more than BEHAVIOUR_SCORE_CAP * 0.15 to raw blend', () => {
      const base = computeHybridFinalScore(0.4, 0)
      const boosted = computeHybridFinalScore(0.4, BEHAVIOUR_SCORE_CAP)
      expect(boosted - base).toBeLessThanOrEqual(BEHAVIOUR_SCORE_CAP * HYBRID_BEHAVIOUR_WEIGHT + 1e-9)
    })
  })

  describe('stable sorting expectations', () => {
    it('produces identical ranked id lists on repeated sorts of the same fixture set', () => {
      const candidates: PipelineCandidate[] = [
        { id: 'devops-platform', role: 'Platform — Docker/K8s', semantic: 0.68, behaviour: 0.08 },
        { id: 'ai-engineer', role: 'AI engineer', semantic: 0.84, behaviour: 0.05 },
        { id: 'frontend-developer', role: 'Frontend developer', semantic: 0.77, behaviour: 0.03 },
        { id: 'backend-engineer', role: 'Backend engineer', semantic: 0.72, behaviour: 0.02 },
        { id: 'nlp-internship', role: 'NLP internship', semantic: 0.65, behaviour: 0.12 },
      ]
      const a = rankByPipeline(candidates)
      const b = rankByPipeline(candidates)
      const c = rankByPipeline([...candidates].reverse())
      expect(a).toEqual(b)
      expect(a).toEqual(c)
    })
  })

  describe('score safety (semantic + hybrid layers)', () => {
    it('keeps cosineSimilarity outputs finite and within [0, 1] for valid embedding pairs', () => {
      const dims = [8, 16, 32]
      for (const dim of dims) {
        const a = unitEmbedding(dim, 1)
        const b = unitEmbedding(dim, 1)
        const c = unitEmbedding(dim, 2)
        for (const pair of [
          [a, b],
          [a, c],
        ] as const) {
          const s = cosineSimilarity(pair[0], pair[1])
          expect(Number.isFinite(s)).toBe(true)
          expect(s).toBeGreaterThanOrEqual(0)
          expect(s).toBeLessThanOrEqual(1)
        }
      }
    })

    it('keeps hybrid final scores finite and within [0, 1] for typical semantic/behaviour ranges', () => {
      for (const sem of [0, 0.33, 0.77, 1]) {
        for (const beh of [0, 0.05, BEHAVIOUR_SCORE_CAP]) {
          const f = computeHybridFinalScore(sem, beh)
          expect(Number.isFinite(f)).toBe(true)
          expect(f).toBeGreaterThanOrEqual(0)
          expect(f).toBeLessThanOrEqual(1)
        }
      }
    })
  })

  describe('explainability contract safety (behaviour layer)', () => {
    it('produces matched signals and non-empty explanations for a rich AI engineer style overlap', () => {
      const p = profile({
        preferredSkills: ['python', 'pytorch', 'nlp'],
        preferredKeywords: ['remote', 'research'],
        preferredCategories: ['ai_ml'],
      })
      const v = vacancy({
        title: 'AI engineer — PyTorch & NLP',
        skillsRequired: 'Python, PyTorch, transformers stack',
        description: 'Remote research team shipping neural models and LLM features.',
      })
      const r = computeVacancyBehaviourScore(p, v)
      expect(r.explanations.length).toBeGreaterThan(0)
      expect(r.matchedSkills.length + r.matchedKeywords.length + r.matchedCategories.length).toBeGreaterThan(0)
      expect(r.explanations.some((e) => e.startsWith('Matched preferred skill:'))).toBe(true)
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(r.score).toBeLessThanOrEqual(BEHAVIOUR_SCORE_CAP)
    })

    it('returns a safe stock explanation when the profile has no behaviour preferences', () => {
      const r = computeVacancyBehaviourScore(profile({}), vacancy({ title: 'Anything', skillsRequired: 'Go' }))
      expect(r.explanations).toContain('No behaviour preferences in profile; behaviour score is 0.')
      expect(r.matchedSkills).toEqual([])
    })

    it('appends no-overlap explanation when preferences exist but nothing matches', () => {
      const p = profile({
        preferredSkills: ['cobol'],
        preferredKeywords: ['mainframe'],
        preferredCategories: ['mobile'],
      })
      const r = computeVacancyBehaviourScore(
        p,
        vacancy({
          title: 'Pastry chef',
          skillsRequired: 'Baking',
          description: 'Cakes and viennoiserie.',
        }),
      )
      expect(r.explanations.some((e) => e.includes('No overlap between this vacancy and behaviour preferences.'))).toBe(
        true,
      )
    })

    it('documents additive-block explainer line for non-empty preference profiles', () => {
      const r = computeVacancyBehaviourScore(
        profile({ preferredSkills: ['go'] }),
        vacancy({ title: 'Go developer', skillsRequired: 'Go', description: '' }),
      )
      expect(r.explanations.some((e) => e.includes('additive blocks'))).toBe(true)
    })
  })

  describe('end-to-end numeric pipeline slice (cosine → hybrid, no DB)', () => {
    it('composes cosine semantic with behaviour score without leaving valid numeric ranges', () => {
      const resumeEmb = unitEmbedding(12, 2)
      const vacancyEmb = unitEmbedding(12, 2)
      const semantic = cosineSimilarity(resumeEmb, vacancyEmb)
      const p = profile({
        preferredSkills: ['kubernetes', 'docker'],
        preferredKeywords: ['remote'],
        preferredCategories: ['devops'],
      })
      const v = vacancy({
        title: 'DevOps platform engineer',
        skillsRequired: 'Docker, Kubernetes, CI/CD',
        description: 'Remote-first SRE team.',
      })
      const beh = computeVacancyBehaviourScore(p, v)
      const hybrid = computeHybridFinalScore(semantic, beh.score)
      expect(Number.isFinite(semantic) && Number.isFinite(beh.score) && Number.isFinite(hybrid)).toBe(true)
      expect(hybrid).toBeGreaterThanOrEqual(0)
      expect(hybrid).toBeLessThanOrEqual(1)
    })
  })

  describe('hybrid ranking regression protection (thesis)', () => {
    it('preserves semantic dominance: max-behaviour lift is smaller than full semantic swing at equal behaviour', () => {
      const lift = computeHybridFinalScore(0.5, BEHAVIOUR_SCORE_CAP) - computeHybridFinalScore(0.5, 0)
      const semSwing = computeHybridFinalScore(1, 0) - computeHybridFinalScore(0, 0)
      expect(lift).toBeLessThan(semSwing)
    })

    it('preserves capped behaviour channel in the hybrid blend', () => {
      expect(computeHybridFinalScore(0.6, BEHAVIOUR_SCORE_CAP)).toBe(computeHybridFinalScore(0.6, 99))
    })

    it('preserves deterministic blending for repeated evaluation', () => {
      expect(computeHybridFinalScore(0.73, 0.06)).toBe(computeHybridFinalScore(0.73, 0.06))
    })
  })
})
