import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/db/mongoose'
import { Vacancy } from '@/lib/db/schema'
import { getEmbedding } from '@/lib/ml'
import {
  rankVacanciesByKeywordFallback,
  resolveKeywordFallbackActivation,
  type KeywordFallbackVacancyInput,
} from '@/lib/semantic-keyword-fallback'
import {
  rankVacanciesBySemanticQueryFromEmbeddingWithStats,
  resolveWeakSemanticActivation,
  type SemanticVacancyInput,
} from '@/lib/semantic-job-search'
import type { SemanticSearchApiErrorBody, SemanticSearchApiSuccessBody } from '@/lib/semantic-search-api-types'
import {
  buildSemanticConceptExplanation,
  extractSemanticConceptsFromVacancies,
  type SemanticConceptVacancyInput,
} from '@/lib/semantic-search-concepts'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

function parseLimit(raw: string | null): number {
  if (raw === null || raw === '') return DEFAULT_LIMIT
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n)) return DEFAULT_LIMIT
  return Math.min(MAX_LIMIT, Math.max(1, n))
}

export async function GET(request: NextRequest) {
  const qRaw = request.nextUrl.searchParams.get('q')
  const query = typeof qRaw === 'string' ? qRaw.trim() : ''

  if (qRaw === null || qRaw === '' || query === '') {
    const body: SemanticSearchApiErrorBody = {
      error: 'Query parameter `q` is required and must be non-empty after trimming.',
      code: 'EMPTY_QUERY',
    }
    return NextResponse.json(body, { status: 400 })
  }

  const limit = parseLimit(request.nextUrl.searchParams.get('limit'))

  let queryEmbedding: number[]
  try {
    queryEmbedding = await getEmbedding(query)
  } catch (e) {
    console.warn('[JobFlow] Semantic search embedding failed.', e)
    const body: SemanticSearchApiErrorBody = {
      error: 'Embedding service is unavailable or returned an error. Semantic search cannot run.',
      code: 'SEMANTIC_SEARCH_UNAVAILABLE',
    }
    return NextResponse.json(body, { status: 503 })
  }

  if (!Array.isArray(queryEmbedding) || queryEmbedding.length === 0) {
    const body: SemanticSearchApiErrorBody = {
      error: 'Embedding service returned an empty vector. Semantic search cannot run.',
      code: 'SEMANTIC_SEARCH_UNAVAILABLE',
    }
    return NextResponse.json(body, { status: 503 })
  }

  try {
    await dbConnect()
    const [semanticDocs, allDocs] = await Promise.all([
      Vacancy.find({
        embedding: { $exists: true, $ne: null },
      })
        .populate('employerId', 'name')
        .lean(),
      Vacancy.find({})
        .populate('employerId', 'name')
        .lean(),
    ])

    const docs = semanticDocs

    const { results, weakResults, stats } = rankVacanciesBySemanticQueryFromEmbeddingWithStats({
      queryEmbedding,
      vacancies: docs as SemanticVacancyInput[],
      limit,
    })

    const weakActivation = resolveWeakSemanticActivation({
      primaryCount: results.length,
      weakCandidateCount: weakResults.length,
      topSemanticScore: stats.topSemanticScore,
    })

    let weakSemantic: SemanticSearchApiSuccessBody['weakSemantic']
    if (weakActivation.enabled && weakActivation.reason && weakResults.length > 0) {
      weakSemantic = {
        enabled: true,
        reason: weakActivation.reason,
        results: weakResults,
      }
    }

    const fallbackActivation = resolveKeywordFallbackActivation({
      semanticCount: results.length,
      topSemanticScore: stats.topSemanticScore,
      compatibleEmbeddings: stats.compatibleEmbeddings,
      checkedEmbeddings: stats.checkedEmbeddings,
    })

    let fallback: SemanticSearchApiSuccessBody['fallback']
    if (fallbackActivation.enabled && fallbackActivation.reason) {
      const excludeIds = new Set([
        ...results.map((r) => r.vacancyId),
        ...weakResults.map((r) => r.vacancyId),
      ])
      const fallbackResults = rankVacanciesByKeywordFallback({
        query,
        vacancies: allDocs as KeywordFallbackVacancyInput[],
        excludeVacancyIds: excludeIds,
        limit,
      })
      fallback = {
        enabled: true,
        reason: fallbackActivation.reason,
        results: fallbackResults,
      }
    }

    const byId = new Map<string, (typeof docs)[number]>()
    for (const d of docs) {
      byId.set(String((d as { _id: unknown })._id), d)
    }

    const conceptVacancies: SemanticConceptVacancyInput[] = []
    for (const r of results) {
      const d = byId.get(r.vacancyId)
      if (!d) continue
      conceptVacancies.push({
        title: String((d as { title?: unknown }).title ?? ''),
        skillsRequired: String((d as { skillsRequired?: unknown }).skillsRequired ?? ''),
        description: String((d as { description?: unknown }).description ?? ''),
      })
    }

    const concepts = extractSemanticConceptsFromVacancies(conceptVacancies, { maxConcepts: 22 })
    const conceptExplanation = buildSemanticConceptExplanation({
      conceptCount: concepts.length,
      topConcepts: concepts.slice(0, 3).map((c) => c.concept),
    })

    const body: SemanticSearchApiSuccessBody = {
      query,
      semantic: true,
      count: results.length,
      results,
      stats,
      ...(weakSemantic ? { weakSemantic } : {}),
      ...(fallback ? { fallback } : {}),
      ...(concepts.length > 0 ? { concepts, conceptExplanation } : {}),
    }
    return NextResponse.json(body, { status: 200 })
  } catch (e) {
    console.warn('[JobFlow] Semantic search vacancy load or ranking failed.', e)
    const body: SemanticSearchApiErrorBody = {
      error: 'Semantic search could not complete. Try again shortly.',
      code: 'SEMANTIC_SEARCH_UNAVAILABLE',
    }
    return NextResponse.json(body, { status: 503 })
  }
}
