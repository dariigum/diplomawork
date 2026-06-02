/** Display label: first 5 chars of basename + "..." + extension (e.g. `resum...pdf`). */
export function formatSelectedFileLabel(fileName: string): string {
  const trimmed = fileName.trim()
  if (!trimmed) return ''

  const lastDot = trimmed.lastIndexOf('.')
  const hasExt = lastDot > 0 && lastDot < trimmed.length - 1
  const base = hasExt ? trimmed.slice(0, lastDot) : trimmed
  const ext = hasExt ? trimmed.slice(lastDot + 1) : ''

  const prefix = base.slice(0, 5)
  return ext ? `${prefix}...${ext}` : `${prefix}...`
}
