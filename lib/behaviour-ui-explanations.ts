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

export function isBehaviourColdStart(profile: UserBehaviourProfile): boolean {
  const { viewed, saved, applied } = profile.interactionSummary
  return viewed === 0 && saved === 0 && applied === 0
}

export function buildBehaviourSessionInsights(profile: UserBehaviourProfile): BehaviourSessionInsights {
  const neutralSemanticLine =
    'Recommendations are based on semantic resume matching (embeddings and cosine similarity).'

  const { viewed, saved, applied } = profile.interactionSummary

  if (isBehaviourColdStart(profile)) {
    return {
      coldStart: true,
      activitySummary: { viewed: 0, saved: 0, applied: 0 },
      dashboardLines: [
        neutralSemanticLine,
        'No job views, saves, or applications are recorded yet — we do not show activity-based adaptation wording.',
      ],
      productBadge: null,
      neutralSemanticLine,
    }
  }

  const dashboardLines: string[] = [
    `Recorded activity: ${viewed} view(s), ${saved} save(s), ${applied} application(s). Used only with fixed, explainable rules — not self-learning AI.`,
  ]

  const topCat = profile.preferredCategories[0]
  if (topCat) {
    const label = CATEGORY_LABELS[topCat] ?? topCat
    dashboardLines.push(
      `Inferred strongest theme from roles you interacted with: ${label} (keyword buckets on vacancy text, not a separate ML model).`,
    )
  }

  const s1 = profile.preferredSkills[0]
  if (s1) {
    const s2 = profile.preferredSkills[1]
    dashboardLines.push(
      `Common skill phrases in listings you engaged with: ${s1}${s2 ? `, ${s2}` : ''}.`,
    )
  }

  return {
    coldStart: false,
    activitySummary: { viewed, saved, applied },
    dashboardLines: dashboardLines.slice(0, 4),
    productBadge: 'Adapted using your recent activity',
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
  return 'Behaviour-aware ranking adjustment on this row (small capped weight vs semantic).'
}
