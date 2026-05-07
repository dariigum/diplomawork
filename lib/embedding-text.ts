function normalizeTextPart(value: unknown): string {
  if (value == null) return ''
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean).join(', ')
  return String(value).trim()
}

function joinParts(parts: Array<string | undefined | null>): string {
  return parts.map(p => (p ?? '').trim()).filter(Boolean).join('\n')
}

export function buildResumeEmbeddingText(input: {
  title?: string
  skills?: string
  experience?: string
  education?: string
}): string {
  const title = normalizeTextPart(input.title)
  const skills = normalizeTextPart(input.skills)
  const experience = normalizeTextPart(input.experience)
  const education = normalizeTextPart(input.education)

  return joinParts([
    title && `Title: ${title}`,
    skills && `Skills: ${skills}`,
    experience && `Experience: ${experience}`,
    education && `Education: ${education}`,
  ])
}

export function buildVacancyEmbeddingText(input: {
  title?: string
  description?: string
  skillsRequired?: string
  requirements?: string[]
  responsibilities?: string[]
}): string {
  const title = normalizeTextPart(input.title)
  const description = normalizeTextPart(input.description)
  const skillsRequired = normalizeTextPart(input.skillsRequired)
  const requirements = normalizeTextPart(input.requirements)
  const responsibilities = normalizeTextPart(input.responsibilities)

  return joinParts([
    title && `Title: ${title}`,
    description && `Description: ${description}`,
    skillsRequired && `Skills required: ${skillsRequired}`,
    requirements && `Requirements: ${requirements}`,
    responsibilities && `Responsibilities: ${responsibilities}`,
  ])
}

