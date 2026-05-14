/**
 * Safe defaults for HeadHunter public API usage (Stage 6B).
 * Override via arguments or env where noted — keep limits conservative in production.
 */

export interface HhItFetchLimits {
  /** Max search result pages to request (each is one listings call). */
  maxPages: number
  /** HH `per_page` (1–100). */
  perPage: number
  /** Hard cap on vacancies that receive a detail fetch + normalization. */
  maxVacancies: number
}

export interface HhItFetchConfig extends HhItFetchLimits {
  /** Free-text query; keep IT-focused. */
  searchQuery: string
  baseUrl: string
  userAgent: string
  /** Optional HH area ids (e.g. country/region filters). */
  areaIds: string[]
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min
  return Math.min(max, Math.max(min, Math.floor(n)))
}

function parseAreaIds(value: string | undefined): string[] {
  if (!value?.trim()) return []
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function envInt(key: string, fallback: number, min: number, max: number): number {
  const raw = process.env[key]
  if (raw == null || raw.trim() === '') return fallback
  return clampInt(Number(raw), min, max)
}

const DEFAULT_QUERY = 'IT developer'

/**
 * Resolves fetch configuration with **small safe defaults** and env overrides.
 */
export function resolveHhItFetchConfig(overrides?: Partial<HhItFetchConfig>): HhItFetchConfig {
  const baseUrl = (overrides?.baseUrl ?? process.env.HH_API_BASE_URL ?? 'https://api.hh.ru').replace(/\/+$/, '')

  return {
    maxPages: clampInt(overrides?.maxPages ?? envInt('HH_FETCH_MAX_PAGES', 2, 1, 20), 1, 20),
    perPage: clampInt(overrides?.perPage ?? envInt('HH_FETCH_PER_PAGE', 10, 1, 100), 1, 100),
    maxVacancies: clampInt(overrides?.maxVacancies ?? envInt('HH_FETCH_MAX_VACANCIES', 24, 1, 200), 1, 200),
    searchQuery: (
      overrides?.searchQuery?.trim() ||
      process.env.HH_FETCH_SEARCH_QUERY?.trim() ||
      DEFAULT_QUERY
    ).trim(),
    baseUrl,
    userAgent:
      overrides?.userAgent?.trim() ||
      process.env.HH_USER_AGENT?.trim() ||
      'JobFlow/1.0 (job-ingestion; set HH_USER_AGENT for production)',
    areaIds: overrides?.areaIds ?? parseAreaIds(process.env.HH_FETCH_AREA_IDS),
  }
}
