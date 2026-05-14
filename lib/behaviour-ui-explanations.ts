import type { UserBehaviourProfile } from '@/lib/behaviour-profile'
import type { BehaviourSessionInsights } from '@/lib/recommendations-api-types'

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

export function buildBehaviourSessionInsights(profile: UserBehaviourProfile): BehaviourSessionInsights {
  const neutralSemanticLine =
    'Recommendations use semantic resume similarity (embeddings and cosine on the server).'

  const { viewed, saved, applied } = profile.interactionSummary

  if (isBehaviourColdStart(profile)) {
    return {
      coldStart: true,
      activitySummary: { viewed: 0, saved: 0, applied: 0 },
      dashboardLines: [
        neutralSemanticLine,
        'No views, saves, or applications yet — activity-based wording stays off until there is real signal.',
      ],
      productBadge: null,
      neutralSemanticLine,
    }
  }

  const dashboardLines: string[] = [
    `On record: ${viewed} views · ${saved} saves · ${applied} applies — fixed, explainable rules only (not self-learning).`,
  ]

  const topCat = profile.preferredCategories[0]
  if (topCat) {
    const label = getBehaviourCategoryDisplayName(topCat)
    dashboardLines.push(
      `Strongest theme from roles you opened: ${label} (keyword bucketing on vacancy text, not a separate ML model).`,
    )
  }

  const s1 = profile.preferredSkills[0]
  if (s1) {
    const s2 = profile.preferredSkills[1]
    dashboardLines.push(`Skill phrases seen in those listings: ${s1}${s2 ? `, ${s2}` : ''}.`)
  }

  return {
    coldStart: false,
    activitySummary: { viewed, saved, applied },
    dashboardLines: dashboardLines.slice(0, 4),
    productBadge: 'Uses your recent job activity',
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
): string | null {
  if (coldStart || behaviourScore <= 0) return null
  const matched = behaviourExplanations.find(
    (x) =>
      x.startsWith('Matched preferred skill:') ||
      x.startsWith('Matched keyword:') ||
      x.startsWith('Matched category:'),
  )
  if (matched) return matched.length > 160 ? `${matched.slice(0, 157)}…` : matched
  return 'Small behaviour-informed adjustment on this row (capped vs semantic).'
}
