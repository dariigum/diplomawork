/**
 * Display-only formatting for extracted skill / keyword phrases (UI layer).
 * Does not alter extraction or scoring pipelines.
 */
export function formatBehaviourPhraseForDisplay(raw: string, maxLength = 44): string {
  let s = (raw ?? '').trim().replace(/\s+/g, ' ')
  if (!s) return ''
  if (s.length > maxLength) {
    s = `${s.slice(0, Math.max(1, maxLength - 1)).trimEnd()}…`
  }
  return s
    .split(/\s+/)
    .map((word) => {
      if (/^[a-z]{2,}$/.test(word)) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      return word
    })
    .join(' ')
}
