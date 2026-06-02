'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { formatSkillDisplayName } from '@/lib/format-skill-display-name'
import { localizeMatchingCandidatesError } from '@/lib/localize-matching-candidates-error'
import { useI18n } from '@/lib/i18n/provider'
import { useEmployerDashboardNav } from '@/components/dashboard/employer-dashboard-nav'
import { EmployerCandidateCardActions } from '@/components/dashboard/employer-candidate-card-actions'

const MAX_MATCHING_SKILLS = 5

type MatchCandidate = {
  userId: string
  resumeId: string
  candidateName: string
  matchScore: number
  fitLevel: 'Strong Fit' | 'Related' | 'Exploratory'
  overlapSkills: string[]
  cvFile?: string
  cvLink?: string
  cvUnavailable?: boolean
}

type EmployerMatchingCandidatesProps = {
  vacancies: { id: string; title: string }[]
  hideSelector?: boolean
  onCountChange?: (n: number) => void
}

function fitBadgeClassName(fitLevel: MatchCandidate['fitLevel']): string {
  if (fitLevel === 'Strong Fit') return 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400'
  if (fitLevel === 'Related') return 'border-amber-500/40 text-amber-800 dark:text-amber-400'
  return 'border-border text-muted-foreground'
}

function localizedFitLevel(
  fitLevel: MatchCandidate['fitLevel'],
  t: ReturnType<typeof useI18n>['t'],
): string {
  if (fitLevel === 'Strong Fit') return t.dashboard.matchFitStrong
  if (fitLevel === 'Related') return t.dashboard.matchFitRelated
  return t.dashboard.matchFitExploratory
}

export function EmployerMatchingCandidates({ vacancies, hideSelector, onCountChange }: EmployerMatchingCandidatesProps) {
  const { t } = useI18n()
  const { vacancyId: sharedVacancyId, setVacancyId: setSharedVacancyId } = useEmployerDashboardNav()
  const [selectedVacancyId, setSelectedVacancyId] = useState(
    () => sharedVacancyId && vacancies.some((v) => v.id === sharedVacancyId)
      ? sharedVacancyId
      : vacancies[0]?.id ?? '',
  )
  const [candidates, setCandidates] = useState<MatchCandidate[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMatches = useCallback(async (vacancyId: string) => {
    if (!vacancyId) {
      setCandidates([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/employer/matching-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vacancyId }),
      })
      const data = await res.json()
      if (!res.ok) {
        const apiError = typeof data?.error === 'string' ? data.error : undefined
        setError(localizeMatchingCandidatesError(res.status, apiError, t))
        setCandidates([])
        return
      }
      setCandidates(Array.isArray(data.candidates) ? data.candidates : [])
    } catch {
      setCandidates([])
      setError(t.dashboard.matchLoadError)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    if (vacancies.length === 0) {
      setSelectedVacancyId('')
      setCandidates([])
      return
    }
    if (sharedVacancyId && vacancies.some((v) => v.id === sharedVacancyId) && sharedVacancyId !== selectedVacancyId) {
      setSelectedVacancyId(sharedVacancyId)
      return
    }
    const exists = vacancies.some((v) => v.id === selectedVacancyId)
    const nextId = exists ? selectedVacancyId : vacancies[0].id
    if (nextId !== selectedVacancyId) {
      setSelectedVacancyId(nextId)
    }
  }, [vacancies, selectedVacancyId, sharedVacancyId])

  const handleVacancySelect = (vacancyId: string) => {
    setSelectedVacancyId(vacancyId)
    setSharedVacancyId(vacancyId)
  }

  useEffect(() => {
    if (!selectedVacancyId) return
    fetchMatches(selectedVacancyId)
  }, [selectedVacancyId, fetchMatches])

  useEffect(() => {
    onCountChange?.(candidates.length)
  }, [candidates.length, onCountChange])

  if (vacancies.length === 0) {
    return null
  }

  return (
    <Card className="rounded-xl shadow-sm border-primary/20 md:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          {t.dashboard.topMatchingCandidates}
        </CardTitle>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t.dashboard.recommendedCandidatesDescription}
        </p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {t.dashboard.topMatchingCandidatesHint}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hideSelector && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor="match-vacancy-select" className="text-sm font-medium shrink-0">
              {t.dashboard.matchVacancyLabel}
            </label>
            <select
              id="match-vacancy-select"
              value={selectedVacancyId}
              onChange={(e) => handleVacancySelect(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={loading}
            >
              {vacancies.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-sm">{t.dashboard.matchLoading}</span>
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-destructive rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
            {error}
          </p>
        )}

        {!loading && !error && candidates.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">{t.dashboard.matchNoCandidates}</p>
        )}

        {!loading && candidates.length > 0 && (
          <ul className="space-y-3">
            {candidates.map((c, index) => {
              const matchingSkills = c.overlapSkills.slice(0, MAX_MATCHING_SKILLS)
              return (
                <li
                  key={c.resumeId}
                  className="rounded-lg border border-border/60 bg-card/30 px-3 py-2.5"
                >
                  <p className="mb-1.5 text-sm font-semibold leading-snug text-foreground">
                    <span className="mr-1.5 tabular-nums text-muted-foreground">#{index + 1}</span>
                    <span className="truncate">{c.candidateName}</span>
                  </p>

                  <p className="mb-2.5 text-sm font-semibold text-primary tabular-nums">
                    {c.matchScore}% {t.chat.matchPercentLabel}
                    <span className="text-muted-foreground"> · </span>
                    <span className="text-xs font-medium text-foreground">
                      {localizedFitLevel(c.fitLevel, t)}
                    </span>
                  </p>

                  {matchingSkills.length > 0 ? (
                    <div className="mb-2">
                      <p className="mb-1 text-[11px] font-medium text-foreground">{t.chat.matchingSkills}</p>
                      <ul className="space-y-0.5 text-[11px] text-muted-foreground">
                        {matchingSkills.map((skill) => (
                          <li key={skill} className="flex gap-1.5">
                            <span className="shrink-0 text-muted-foreground/80">•</span>
                            <span className="min-w-0 truncate">{formatSkillDisplayName(skill)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <EmployerCandidateCardActions
                    resumeId={c.resumeId}
                    viewResumeLabel={t.dashboard.viewResume}
                    returnTo={selectedVacancyId
                      ? `/dashboard/employer?tab=candidates&vacancy=${selectedVacancyId}&subtab=recommended`
                      : '/dashboard/employer?tab=candidates'}
                  />
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
