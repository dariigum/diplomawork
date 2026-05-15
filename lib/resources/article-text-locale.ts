/** Cyrillic and related scripts used to detect non-English article titles. */
const CYRILLIC_RE = /[\u0400-\u04FF\u0500-\u052F]/

export function containsCyrillic(text: string): boolean {
  return CYRILLIC_RE.test(text)
}

/** English filter: title must be mostly Latin and must not contain Cyrillic. */
export function isEnglishDisplayText(text: string): boolean {
  const trimmed = text.trim()
  if (!trimmed || containsCyrillic(trimmed)) return false
  const latinLetters = trimmed.match(/[A-Za-z]/g)?.length ?? 0
  return latinLetters >= 3
}
