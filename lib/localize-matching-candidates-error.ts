import type { Dictionary } from '@/lib/i18n/dictionaries'

/** Map matching-candidates API errors to localized UI messages (no backend changes). */
export function localizeMatchingCandidatesError(
  status: number,
  apiError: string | undefined,
  dict: Dictionary,
): string {
  const msg = (apiError ?? '').toLowerCase()

  if (status === 401) return dict.dashboard.matchErrorUnauthorized
  if (status === 403) return dict.dashboard.matchErrorForbidden
  if (status === 404 || msg === 'not found') return dict.dashboard.matchErrorVacancyNotFound
  if (msg.includes('vacancyid is required') || msg.includes('invalid vacancy id')) {
    return dict.dashboard.matchErrorInvalidVacancy
  }
  if (msg.includes('embedding')) return dict.dashboard.matchErrorVacancyEmbedding
  if (msg.includes('invalid json')) return dict.dashboard.matchErrorInvalidRequest

  return dict.dashboard.matchLoadError
}
