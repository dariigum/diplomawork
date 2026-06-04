import type { UserBehaviourProfile } from '@/lib/behaviour-profile'
import type { BehaviourSessionInsights } from '@/lib/recommendations-api-types'
import { getDictionary, type Locale } from '@/lib/i18n/dictionaries'

const CATEGORY_LABELS: Record<string, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  ai_ml: 'AI/ML',
  mobile: 'Mobile',
  devops: 'DevOps',
  data: 'Data engineering / analytics',
}

export function getBehaviourCategoryDisplayName(id: string): string {
  return CATEGORY_LABELS[id.trim().toLowerCase()] ?? id
}

export function isBehaviourColdStart(profile: UserBehaviourProfile): boolean {
  const { viewed, saved, applied } = profile.interactionSummary
  return viewed === 0 && saved === 0 && applied === 0
}

function formatMessage(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, String(value)),
    template,
  )
}

export function buildBehaviourSessionInsights(
  profile: UserBehaviourProfile,
  locale: Locale = 'en',
): BehaviourSessionInsights {
  const t = getDictionary(locale).employeeDashboard
  const neutralSemanticLine = t.behaviourSemanticLine

  const { viewed, saved, applied } = profile.interactionSummary

  if (isBehaviourColdStart(profile)) {
    return {
      coldStart: true,
      activitySummary: { viewed: 0, saved: 0, applied: 0 },
      dashboardLines: [
        neutralSemanticLine,
        t.noActivitySignal,
      ],
      productBadge: null,
      neutralSemanticLine,
    }
  }

  const dashboardLines: string[] = [
    formatMessage(t.activityOnRecord, { viewed, saved, applied }),
  ]

  const topCat = profile.preferredCategories[0]
  if (topCat) {
    const label = getBehaviourCategoryDisplayName(topCat)
    dashboardLines.push(
      formatMessage(t.strongestTheme, { label }),
    )
  }

  const s1 = profile.preferredSkills[0]
  if (s1) {
    const s2 = profile.preferredSkills[1]
    dashboardLines.push(formatMessage(t.skillPhrasesSeen, { skills: `${s1}${s2 ? `, ${s2}` : ''}` }))
  }

  return {
    coldStart: false,
    activitySummary: { viewed, saved, applied },
    dashboardLines: dashboardLines.slice(0, 4),
    productBadge: t.usesRecentActivity,
    neutralSemanticLine,
  }
}

export type CardAdaptationHint = 'semantic_only' | 'behaviour_adjusted'

export function resolveCardAdaptationHint(
  coldStart: boolean,
  behaviourScore: number,
): CardAdaptationHint {
  if (coldStart || behaviourScore <= 0) return 'semantic_only'
  return 'behaviour_adjusted'
}

/**
 * One-line card tagline from real `computeVacancyBehaviourScore` explanations, or null.
 */
export function pickBehaviourCardTagline(
  coldStart: boolean,
  behaviourScore: number,
  behaviourExplanations: string[],
  locale: Locale = 'en',
): string | null {
  if (coldStart || behaviourScore <= 0) return null
  const t = getDictionary(locale).employeeDashboard
  const matched = behaviourExplanations.find(
    (x) =>
      x.startsWith('Matched preferred skill:') ||
      x.startsWith('Matched keyword:') ||
      x.startsWith('Matched category:'),
  )
  if (matched) {
    const translated = matched
      .replace(/^Matched preferred skill:\s*(.+)$/, (_, value) => formatMessage(t.matchedPreferredSkill, { value }))
      .replace(/^Matched keyword:\s*(.+)$/, (_, value) => formatMessage(t.matchedKeyword, { value }))
      .replace(/^Matched category:\s*(.+?)(?:\s+\(.+\))?$/, (_, value) => formatMessage(t.matchedCategory, { value }))
    return translated.length > 160 ? `${translated.slice(0, 157)}…` : translated
  }
  return t.smallBehaviourAdjustment
}
