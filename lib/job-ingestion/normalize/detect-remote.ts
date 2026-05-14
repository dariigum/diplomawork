const REMOTE_HINTS = /\b(remote|удалён|удаленная|distributed|hybrid)\b/i

export function detectRemoteFromText(haystack: string): boolean {
  return REMOTE_HINTS.test(haystack)
}
