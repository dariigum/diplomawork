import type { NormalizedVacancyInput } from '../types/normalized-vacancy'
import type { RawHHVacancy } from '../types/raw-hh'
import mockNormalized from './mock-normalized-vacancies.json'
import mockRawHh from './mock-raw-hh-vacancies.json'

/** Typed demo vacancies — safe without live HeadHunter. */
export function loadMockNormalizedVacancies(): NormalizedVacancyInput[] {
  return mockNormalized as NormalizedVacancyInput[]
}

/** Minimal HH-shaped JSON fixtures for normalize-only tests and demos. */
export function loadMockRawHhVacancies(): RawHHVacancy[] {
  return mockRawHh as RawHHVacancy[]
}
