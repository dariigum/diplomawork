import { describe, expect, it } from 'vitest'
import {
  BEHAVIOUR_SCORE_CAP,
  computeVacancyBehaviourScore,
  type BehaviourProfileForScore,
  type VacancyBehaviourScoreInput,
} from '@/lib/behaviour-score'

function profile(overrides: Partial<BehaviourProfileForScore>): BehaviourProfileForScore {
  return {
    preferredSkills: [],
    preferredKeywords: [],
    preferredCategories: [],
    ...overrides,
  }
}

function vacancy(overrides: Partial<VacancyBehaviourScoreInput>): VacancyBehaviourScoreInput {
  return {
    title: '',
    skillsRequired: '',
    description: '',
    ...overrides,
  }
}

describe('computeVacancyBehaviourScore', () => {
  describe('determinism', () => {
    it('returns identical results for identical inputs (deep equality)', () => {
      const p = profile({
        preferredSkills: ['python'],
        preferredKeywords: ['remote'],
        preferredCategories: ['ai_ml'],
      })
      const v = vacancy({
        title: 'ML Engineer — PyTorch',
        skillsRequired: 'Python, PyTorch',
        description: 'Remote-first team. NLP and neural networks.',
      })
      const a = computeVacancyBehaviourScore(p, v)
      const b = computeVacancyBehaviourScore(p, v)
      expect(a).toEqual(b)
      expect(JSON.stringify(a)).toBe(JSON.stringify(b))
    })
  })

  describe('no behaviour preferences', () => {
    it('returns zero score with stock explanation when all preference lists are empty', () => {
      const p = profile({})
      const v = vacancy({
        title: 'Senior Backend Engineer',
        skillsRequired: 'Go, Kubernetes',
        description: 'Microservices platform.',
      })
      const r = computeVacancyBehaviourScore(p, v)
      expect(r.score).toBe(0)
      expect(r.matchedSkills).toEqual([])
      expect(r.matchedKeywords).toEqual([])
      expect(r.matchedCategories).toEqual([])
      expect(r.rawScoreBeforeCap).toBe(0)
      expect(r.explanations).toContain('No behaviour preferences in profile; behaviour score is 0.')
    })
  })

  describe('no overlap', () => {
    it('scores zero and records no matches when vacancy is unrelated', () => {
      const p = profile({
        preferredSkills: ['cobol', 'mainframe'],
        preferredKeywords: ['assembler', 'fortran'],
        preferredCategories: ['mobile'],
      })
      const v = vacancy({
        title: 'Pastry Chef',
        skillsRequired: 'Baking, Food safety',
        description: 'Artisan bread and viennoiserie.',
      })
      const r = computeVacancyBehaviourScore(p, v)
      expect(r.score).toBe(0)
      expect(r.matchedSkills).toEqual([])
      expect(r.matchedKeywords).toEqual([])
      expect(r.matchedCategories).toEqual([])
      expect(r.rawScoreBeforeCap).toBe(0)
      expect(r.explanations.some((e) => e.includes('No overlap between this vacancy and behaviour preferences.'))).toBe(
        true,
      )
    })
  })

  describe('skill matching', () => {
    it('matches preferred skills from skillsRequired and increases score with explanations', () => {
      const p = profile({
        preferredSkills: ['python', 'nlp'],
        preferredKeywords: [],
        preferredCategories: [],
      })
      const v = vacancy({
        title: 'Applied Scientist',
        skillsRequired: 'Python, NLP, FastAPI',
        description: 'Building ranking models.',
      })
      const r = computeVacancyBehaviourScore(p, v)
      expect(r.matchedSkills.length).toBeGreaterThanOrEqual(2)
      expect(r.matchedSkills.map((s) => s.toLowerCase())).toEqual(
        expect.arrayContaining(['python', 'nlp'].map((x) => x.toLowerCase())),
      )
      expect(r.score).toBeGreaterThan(0)
      expect(r.explanations.filter((e) => e.startsWith('Matched preferred skill:'))).toEqual(
        expect.arrayContaining([expect.stringContaining('python'), expect.stringContaining('nlp')]),
      )
    })
  })

  describe('keyword matching', () => {
    it('matches preferred keywords in vacancy text and adds keyword explanations', () => {
      const p = profile({
        preferredSkills: [],
        preferredKeywords: ['internship', 'remote'],
        preferredCategories: [],
      })
      const v = vacancy({
        title: 'Software internship (remote)',
        skillsRequired: 'Git, Linux',
        description: 'Six-month internship programme. Fully remote collaboration across time zones.',
      })
      const r = computeVacancyBehaviourScore(p, v)
      expect(r.matchedKeywords.map((k) => k.toLowerCase())).toEqual(
        expect.arrayContaining(['internship', 'remote'].map((x) => x.toLowerCase())),
      )
      expect(r.score).toBeGreaterThan(0)
      expect(r.explanations.filter((e) => e.startsWith('Matched keyword:'))).toEqual(
        expect.arrayContaining([expect.stringContaining('internship'), expect.stringContaining('remote')]),
      )
    })
  })

  describe('category matching', () => {
    it('matches preferred ai_ml when vacancy text contains AI/ML needles', () => {
      const p = profile({
        preferredSkills: [],
        preferredKeywords: [],
        preferredCategories: ['ai_ml'],
      })
      const v = vacancy({
        title: 'Senior ML Engineer',
        skillsRequired: 'PyTorch, NLP pipelines',
        description: 'We train neural models and ship LLM features to production.',
      })
      const r = computeVacancyBehaviourScore(p, v)
      expect(r.matchedCategories).toContain('ai_ml')
      expect(r.score).toBeGreaterThan(0)
      expect(r.explanations.some((e) => e.startsWith('Matched category:') && e.includes('ai_ml'))).toBe(true)
    })
  })

  describe('caps and limits', () => {
    it('never exceeds BEHAVIOUR_SCORE_CAP even with heavy overlap across skills, keywords, and categories', () => {
      const manySkills = [
        'python',
        'django',
        'flask',
        'fastapi',
        'express',
        'kotlin',
        'swift',
        'rust',
        'go',
        'java',
      ]
      const manyKeywords = [
        'streaming',
        'observability',
        'monitoring',
        'security',
        'compliance',
        'reliability',
        'scalability',
        'automation',
        'documentation',
        'mentoring',
      ]
      const p = profile({
        preferredSkills: manySkills,
        preferredKeywords: manyKeywords,
        preferredCategories: ['ai_ml', 'frontend'],
      })
      const v = vacancy({
        title: 'Full-stack ML platform — React dashboard, PyTorch services',
        skillsRequired: manySkills.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', '),
        description: `${manyKeywords.join(' ')}. We use PyTorch, React, and neural networks for recommendations.`,
      })
      const r = computeVacancyBehaviourScore(p, v)
      expect(r.matchedSkills.length).toBeGreaterThanOrEqual(3)
      expect(r.matchedKeywords.length).toBeGreaterThanOrEqual(3)
      expect(r.matchedCategories.length).toBeGreaterThanOrEqual(1)
      expect(r.score).toBeLessThanOrEqual(BEHAVIOUR_SCORE_CAP)
      expect(r.score).toBe(BEHAVIOUR_SCORE_CAP)
      expect(r.rawScoreBeforeCap).toBeGreaterThan(BEHAVIOUR_SCORE_CAP)
      expect(r.explanations.some((e) => e.includes('exceeded cap') && e.includes(String(BEHAVIOUR_SCORE_CAP)))).toBe(
        true,
      )
    })

    it('respects per-block caps (skills block does not grow past 0.084 with many skill hits)', () => {
      const skills = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 'a9', 'a10'].map((_, i) => `lang${i + 1}`)
      const skillsRequired = skills.join(', ')
      const p = profile({
        preferredSkills: skills,
        preferredKeywords: [],
        preferredCategories: [],
      })
      const v = vacancy({
        title: 'Polyglot services',
        skillsRequired,
        description: '',
      })
      const r = computeVacancyBehaviourScore(p, v)
      expect(r.matchedSkills.length).toBe(skills.length)
      const skillBlock = Math.min(r.matchedSkills.length * 0.042, 0.084)
      expect(r.rawScoreBeforeCap).toBeCloseTo(skillBlock, 5)
      expect(r.score).toBeCloseTo(skillBlock, 5)
      expect(r.score).toBeLessThanOrEqual(0.084)
    })
  })

  describe('duplicate prevention', () => {
    it('deduplicates preferred skills that normalize to the same token', () => {
      const p = profile({
        preferredSkills: ['python', 'Python', 'PYTHON'],
        preferredKeywords: [],
        preferredCategories: [],
      })
      const v = vacancy({
        title: 'Backend role',
        skillsRequired: 'Python, FastAPI',
        description: '',
      })
      const r = computeVacancyBehaviourScore(p, v)
      expect(r.matchedSkills).toHaveLength(1)
      expect(r.matchedSkills[0]?.toLowerCase()).toBe('python')
    })
  })

  describe('explanations', () => {
    it('includes additive-block summary for every non-empty preference profile', () => {
      const p = profile({ preferredSkills: ['go'], preferredKeywords: [], preferredCategories: [] })
      const v = vacancy({ title: 'Go developer', skillsRequired: 'Go', description: '' })
      const r = computeVacancyBehaviourScore(p, v)
      expect(
        r.explanations.some((e) => e.includes('additive blocks') && e.includes(String(BEHAVIOUR_SCORE_CAP))),
      ).toBe(true)
    })

    it('produces non-empty explanations for rich matches', () => {
      const p = profile({
        preferredSkills: ['typescript'],
        preferredKeywords: ['remote'],
        preferredCategories: ['frontend'],
      })
      const v = vacancy({
        title: 'Remote frontend engineer — React + TypeScript',
        skillsRequired: 'TypeScript, React',
        description: 'Remote-first product squad shipping Next.js apps.',
      })
      const r = computeVacancyBehaviourScore(p, v)
      expect(r.explanations.length).toBeGreaterThan(0)
      expect(r.explanations.some((e) => e.startsWith('Matched preferred skill:'))).toBe(true)
      expect(r.explanations.some((e) => e.startsWith('Matched keyword:'))).toBe(true)
      expect(r.explanations.some((e) => e.startsWith('Matched category:'))).toBe(true)
    })
  })

  describe('output safety', () => {
    it('returns finite non-negative score and defined arrays for arbitrary vacancy text', () => {
      const p = profile({
        preferredSkills: ['rust'],
        preferredKeywords: ['remote'],
        preferredCategories: ['devops'],
      })
      const v = vacancy({
        title: 'SRE — Rust tooling on Kubernetes',
        skillsRequired: 'Rust, Docker, Kubernetes',
        description: 'Remote on-call rotation. Prometheus and Grafana.',
      })
      const r = computeVacancyBehaviourScore(p, v)
      expect(Number.isFinite(r.score)).toBe(true)
      expect(r.score).toBeGreaterThanOrEqual(0)
      expect(Array.isArray(r.matchedSkills)).toBe(true)
      expect(Array.isArray(r.matchedKeywords)).toBe(true)
      expect(Array.isArray(r.matchedCategories)).toBe(true)
      expect(Array.isArray(r.explanations)).toBe(true)
      expect(Number.isFinite(r.rawScoreBeforeCap)).toBe(true)
      expect(r.rawScoreBeforeCap).toBeGreaterThanOrEqual(0)
    })
  })
})
