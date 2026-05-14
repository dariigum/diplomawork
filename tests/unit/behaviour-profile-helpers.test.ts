import { describe, expect, it } from 'vitest'
import {
  buildVacancyHaystack,
  inferVacancyCategoryIds,
  normalizeBehaviourToken,
  splitVacancySkillPhrases,
} from '@/lib/behaviour-profile'

function vac(partial: { title?: string; skillsRequired?: string; description?: string }) {
  return {
    title: partial.title ?? '',
    skillsRequired: partial.skillsRequired ?? '',
    description: partial.description ?? '',
  }
}

describe('behaviour-profile helpers', () => {
  describe('normalizeBehaviourToken', () => {
    it('lowercases and trims', () => {
      expect(normalizeBehaviourToken('  Python  ')).toBe('python')
    })

    it('collapses internal whitespace to a single space', () => {
      expect(normalizeBehaviourToken('Deep   Learning')).toBe('deep learning')
    })

    it('is deterministic for repeated calls', () => {
      const s = '  NLP   pipelines  '
      expect(normalizeBehaviourToken(s)).toBe(normalizeBehaviourToken(s))
      expect(Object.is(normalizeBehaviourToken(s), normalizeBehaviourToken(s))).toBe(true)
    })

    it('returns empty string for empty or whitespace-only input', () => {
      expect(normalizeBehaviourToken('')).toBe('')
      expect(normalizeBehaviourToken('   \t  ')).toBe('')
    })

    it('does not strip punctuation (consistent raw token shape)', () => {
      expect(normalizeBehaviourToken('C#, .NET')).toBe('c#, .net')
    })
  })

  describe('splitVacancySkillPhrases', () => {
    it('splits on commas, semicolons, slashes, and pipes', () => {
      const raw = 'Python, NLP; FastAPI / Docker | Kubernetes'
      expect(splitVacancySkillPhrases(raw)).toEqual([
        'python',
        'nlp',
        'fastapi',
        'docker',
        'kubernetes',
      ])
    })

    it('handles a single skill and noisy spacing', () => {
      expect(splitVacancySkillPhrases('  TypeScript  ')).toEqual(['typescript'])
    })

    it('ignores empty tokens and very short fragments', () => {
      expect(splitVacancySkillPhrases('Go, , ;  x')).toEqual(['go'])
    })

    it('filters tokens longer than 80 characters', () => {
      const long = 'a'.repeat(81)
      expect(splitVacancySkillPhrases(`Go, ${long}, Rust`)).toEqual(['go', 'rust'])
    })

    it('returns an empty array for empty input', () => {
      expect(splitVacancySkillPhrases('')).toEqual([])
    })

    it('preserves duplicate phrases when they appear as separate list entries', () => {
      expect(splitVacancySkillPhrases('Python, Python')).toEqual(['python', 'python'])
    })
  })

  describe('inferVacancyCategoryIds', () => {
    it('infers ai_ml from PyTorch + NLP style vacancy', () => {
      const ids = inferVacancyCategoryIds(
        vac({
          title: 'Senior ML Engineer',
          skillsRequired: 'PyTorch, NLP pipelines',
          description: 'We train neural models and ship LLM features.',
        }),
      )
      expect(ids).toContain('ai_ml')
    })

    it('infers frontend from React + Next.js + Tailwind', () => {
      const ids = inferVacancyCategoryIds(
        vac({
          title: 'Frontend developer',
          skillsRequired: 'React, Next.js, Tailwind CSS',
          description: 'We use TypeScript across the stack.',
        }),
      )
      expect(ids).toContain('frontend')
    })

    it('infers backend from Node + REST API style vacancy', () => {
      const ids = inferVacancyCategoryIds(
        vac({
          title: 'Backend engineer',
          skillsRequired: 'Node.js, PostgreSQL, REST API',
          description: 'Microservices with Express and Kafka.',
        }),
      )
      expect(ids).toContain('backend')
    })

    it('infers devops from Docker + Kubernetes + CI/CD', () => {
      const ids = inferVacancyCategoryIds(
        vac({
          title: 'Platform SRE',
          skillsRequired: 'Docker, Kubernetes, CI/CD',
          description: 'Terraform and Prometheus for observability.',
        }),
      )
      expect(ids).toContain('devops')
    })

    it('infers mobile from Flutter + React Native', () => {
      const ids = inferVacancyCategoryIds(
        vac({
          title: 'Mobile engineer',
          skillsRequired: 'Flutter, React Native',
          description: 'Shipping iOS and Android clients.',
        }),
      )
      expect(ids).toContain('mobile')
    })

    it('infers data from Snowflake + ETL style vacancy', () => {
      const ids = inferVacancyCategoryIds(
        vac({
          title: 'Analytics platform',
          skillsRequired: 'SQL, Snowflake, ETL',
          description: 'Airflow orchestration and Spark jobs.',
        }),
      )
      expect(ids).toContain('data')
    })

    it('returns multiple category ids when multiple buckets hit (insertion order follows rule list)', () => {
      const ids = inferVacancyCategoryIds(
        vac({
          title: 'Fullstack AI platform',
          skillsRequired: 'React, FastAPI, PyTorch, Docker',
          description: 'Neural ranking service with REST API and Kubernetes deployment.',
        }),
      )
      expect(ids).toEqual(expect.arrayContaining(['frontend', 'backend', 'ai_ml', 'devops']))
      expect(ids.length).toBeGreaterThanOrEqual(4)
    })

    it('returns empty array for generic office or sales text (no keyword bucket hits)', () => {
      expect(
        inferVacancyCategoryIds(
          vac({
            title: 'Office assistant',
            skillsRequired: 'Scheduling, phone calls',
            description: 'Sales support and filing.',
          }),
        ),
      ).toEqual([])
    })

    it('is deterministic for identical vacancy payloads', () => {
      const v = vac({
        title: 'ML platform',
        skillsRequired: 'PyTorch, Kubernetes',
        description: 'Dockerized training jobs.',
      })
      expect(inferVacancyCategoryIds(v)).toEqual(inferVacancyCategoryIds(v))
    })
  })

  describe('buildVacancyHaystack', () => {
    it('concatenates lowercased title, skillsRequired, and truncated description', () => {
      const h = buildVacancyHaystack(
        vac({
          title: 'Senior Engineer',
          skillsRequired: 'Go, Rust',
          description: 'Building APIs.',
        }),
      )
      expect(h.startsWith('senior engineer')).toBe(true)
      expect(h.includes('go, rust')).toBe(true)
      expect(h.includes('building apis.')).toBe(true)
    })

    it('truncates description to 800 characters while keeping title and skills fully', () => {
      const longDesc = 'z'.repeat(1200)
      const h = buildVacancyHaystack(
        vac({
          title: 'Title',
          skillsRequired: 'Skill',
          description: longDesc,
        }),
      )
      const prefix = `${'title'.toLowerCase()} ${'skill'.toLowerCase()} `
      expect(h.startsWith(prefix)).toBe(true)
      expect(h.length).toBe(prefix.length + 800)
      expect(h.endsWith('z'.repeat(800))).toBe(true)
    })

    it('treats missing-like fields as empty segments without throwing', () => {
      const h = buildVacancyHaystack({
        title: undefined as unknown as string,
        skillsRequired: null as unknown as string,
        description: undefined as unknown as string,
      })
      expect(typeof h).toBe('string')
      expect(h.trim().length).toBe(0)
    })

    it('matches normalizeBehaviourToken lowercasing for manual substring checks', () => {
      const v = vac({
        title: 'React Dashboard',
        skillsRequired: 'TypeScript',
        description: 'Tailwind UI.',
      })
      const h = buildVacancyHaystack(v)
      expect(h).toBe(buildVacancyHaystack(v))
      expect(h.includes('react')).toBe(true)
      expect(h.includes('typescript')).toBe(true)
      expect(h.includes('tailwind')).toBe(true)
    })
  })

  describe('regression / architecture assumptions', () => {
    it('keeps extraction deterministic across helper pipeline (haystack → categories)', () => {
      const v = vac({
        title: 'AI Services',
        skillsRequired: 'PyTorch',
        description: 'Docker containers.',
      })
      const h1 = buildVacancyHaystack(v)
      const h2 = buildVacancyHaystack(v)
      expect(h1).toBe(h2)
      expect(inferVacancyCategoryIds(v)).toEqual(inferVacancyCategoryIds(v))
    })

    it('exposes stable bucket ids (string slugs) from inference', () => {
      const ids = inferVacancyCategoryIds(
        vac({ title: 'React Native app', skillsRequired: 'Kotlin', description: 'Android release.' }),
      )
      for (const id of ids) {
        expect(id).toMatch(/^[a-z_]+$/)
      }
    })
  })

  describe('output safety', () => {
    it('always returns arrays from split and infer', () => {
      expect(Array.isArray(splitVacancySkillPhrases('a'))).toBe(true)
      expect(Array.isArray(inferVacancyCategoryIds(vac({})))).toBe(true)
    })

    it('never returns undefined elements in split output for typical delimited strings', () => {
      for (const x of splitVacancySkillPhrases('A, B, C')) {
        expect(x).toBeDefined()
        expect(typeof x).toBe('string')
      }
    })

    it('returns a string haystack for empty structured vacancy', () => {
      expect(typeof buildVacancyHaystack(vac({}))).toBe('string')
    })
  })
})
