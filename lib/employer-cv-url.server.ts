import {
  employerCvRawIndicatesUpload,
  resolveEmployerCvHref,
} from '@/lib/employer-cv-url'

export type ResolvedEmployerCv = {
  cvFile?: string
  /** DB referenced a CV but URL could not be normalized safely. */
  cvUnavailable?: boolean
}

/**
 * Exposes a safe cvFile href for employer APIs.
 * Does not stat the filesystem (avoids false "unavailable" when cwd/deploy paths differ).
 */
export function resolveEmployerCvForApi(
  rawCvFile: unknown,
  rawCvLink?: unknown,
): ResolvedEmployerCv {
  const href = resolveEmployerCvHref(rawCvFile, rawCvLink)
  if (href) {
    return { cvFile: href }
  }

  const hadReference =
    employerCvRawIndicatesUpload(rawCvFile) || employerCvRawIndicatesUpload(rawCvLink)
  return hadReference ? { cvUnavailable: true } : {}
}
