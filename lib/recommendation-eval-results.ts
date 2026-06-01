import fs from 'fs'
import path from 'path'

export type RecommendationEvalResults = {
  precisionAt10: number | null
  recallAt10: number | null
  evaluatedUsers: number
  generatedAt: string
  methodology: string
}

const RESULTS_FILE = path.join(process.cwd(), 'scripts', 'eval-results.json')

export function getRecommendationEvalResultsPath(): string {
  return RESULTS_FILE
}

export function loadRecommendationEvalResults(): RecommendationEvalResults | null {
  try {
    if (!fs.existsSync(RESULTS_FILE)) {
      return null
    }
    const raw = fs.readFileSync(RESULTS_FILE, 'utf8')
    const parsed = JSON.parse(raw) as RecommendationEvalResults
    if (typeof parsed.evaluatedUsers !== 'number' || typeof parsed.methodology !== 'string') {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function hasComputedEvalMetrics(results: RecommendationEvalResults | null): boolean {
  if (!results) return false
  if (results.evaluatedUsers <= 0) return false
  return (
    typeof results.precisionAt10 === 'number' &&
    Number.isFinite(results.precisionAt10) &&
    typeof results.recallAt10 === 'number' &&
    Number.isFinite(results.recallAt10)
  )
}
