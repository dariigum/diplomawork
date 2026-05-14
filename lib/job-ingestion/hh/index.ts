/**
 * HeadHunter-specific module root (Stage 6A).
 *
 * Future stages may add HTTP fetch helpers here. For now, only shared types and normalization
 * from `RawHHVacancy` live under `normalize/` to avoid coupling to networking.
 */
export type { RawHHVacancy } from '../types/raw-hh'
export { normalizeRawHhVacancy } from '../normalize/from-hh-raw'
