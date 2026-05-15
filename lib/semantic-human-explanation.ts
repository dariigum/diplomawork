import { semanticScoreBand, type SemanticScoreBand } from '@/lib/semantic-score-bands'

/** Tooltip / sr-only — not shown in card body. */
export const SEMANTIC_MATCH_SYSTEM_HINT =
  'Semantic match from embedding-based retrieval. Mapped cosine similarity on a 0–1 scale; not keyword search alone.'

const MAX_WORDS = 14

type TopicRule = {
  pattern: RegExp
  strong: string
  default: string
}

const TOPIC_RULES: TopicRule[] = [
  {
    pattern: /\b(python|django|fastapi|flask)\b/i,
    strong: 'Similar backend Python stack and API tooling.',
    default: 'Related Python backend engineering focus.',
  },
  {
    pattern: /\b(machine learning|ml\b|nlp|deep learning|pytorch|tensorflow)\b/i,
    strong: 'Strong overlap in ML and NLP concepts.',
    default: 'Related machine learning and NLP wording.',
  },
  {
    pattern: /\b(frontend|front-end|react|vue|angular|typescript|javascript)\b/i,
    strong: 'Related frontend engineering technologies.',
    default: 'Similar frontend stack and UI technologies.',
  },
  {
    pattern: /\b(qa|quality assurance|automation engineer|test automation|selenium)\b/i,
    strong: 'Similar platform and automation terminology.',
    default: 'Related QA and test automation wording.',
  },
  {
    pattern: /\b(devops|kubernetes|docker|terraform|aws|azure|gcp|infrastructure)\b/i,
    strong: 'Matching infrastructure and backend patterns.',
    default: 'Related infrastructure and platform engineering.',
  },
  {
    pattern: /\b(backend|back-end|api|microservice|golang|go\b|java\b|node\.?js)\b/i,
    strong: 'Similar backend services and API patterns.',
    default: 'Related backend engineering role focus.',
  },
  {
    pattern: /\b(data engineer|data analyst|sql|etl|spark)\b/i,
    strong: 'Related data engineering and analytics stack.',
    default: 'Similar data pipeline and analytics wording.',
  },
  {
    pattern: /\b(mobile|ios|android|flutter|kotlin|swift)\b/i,
    strong: 'Related mobile development technologies.',
    default: 'Similar mobile engineering role focus.',
  },
  {
    pattern: /\b(product manager|project manager|scrum|agile)\b/i,
    strong: 'Related product and delivery terminology.',
    default: 'Similar management and delivery wording.',
  },
  {
    pattern: /\b(platform|internal tools|developer experience)\b/i,
    strong: 'Similar platform and automation terminology.',
    default: 'Related platform engineering role wording.',
  },
]

const BAND_FALLBACK: Record<SemanticScoreBand, string> = {
  strong: 'Strong overlap with your search wording.',
  solid: 'Solid overlap with role wording and skills.',
  related: 'Related engineering technologies and role focus.',
  loose: 'Loosely related role wording and terminology.',
}

function clampWords(sentence: string, maxWords: number = MAX_WORDS): string {
  const trimmed = sentence.trim().replace(/\s+/g, ' ')
  const words = trimmed.split(' ').filter(Boolean)
  if (words.length <= maxWords) {
    const out = words.join(' ')
    return out.endsWith('.') ? out : `${out}.`
  }
  const cut = words.slice(0, maxWords).join(' ')
  return cut.endsWith('.') ? cut : `${cut}.`
}

function pickForBand(rule: TopicRule, band: SemanticScoreBand | null): string {
  if (band === 'strong' || band === 'solid') return rule.strong
  return rule.default
}

/**
 * Short, human-readable “Why matched” copy for semantic panel cards (presentation only).
 */
export function buildHumanSemanticMatchExplanation(params: {
  query?: string
  title: string
  semanticScore: number
}): string {
  const band = semanticScoreBand(params.semanticScore)
  const haystack = `${params.query ?? ''} ${params.title}`.trim()

  for (const rule of TOPIC_RULES) {
    if (rule.pattern.test(haystack)) {
      return clampWords(pickForBand(rule, band))
    }
  }

  const fallback = band ? BAND_FALLBACK[band] : BAND_FALLBACK.related
  return clampWords(fallback)
}
