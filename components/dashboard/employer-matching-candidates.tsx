'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sparkles, User } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n/provider'

type MatchCandidate = {
  userId: string
  resumeId: string
  candidateName: string
  matchScore: number
  fitLevel: 'Strong Fit' | 'Related' | 'Exploratory'
  overlapSkills: string[]
}

type EmployerMatchingCandidatesProps = {
  vacancies: { id: string; title: string }[]
}

function fitBadgeClass(fitLevel: MatchCandidate['fitLevel']): string {
  if (fitLevel === 'Strong Fit') {
    return 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30 dark:text-emerald-400'
  }
  if (fitLevel === 'Related') {
    return 'bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-400'
  }
  return 'bg-muted text-muted-foreground border-border'
}

function localizedFitLevel(
  fitLevel: MatchCandidate['fitLevel'],
  t: ReturnType<typeof useI18n>['t'],
): string {
  if (fitLevel === 'Strong Fit') return t.dashboard.matchFitStrong
  if (fitLevel === 'Related') return t.dashboard.matchFitRelated
  return t.dashboard.matchFitExploratory
}

export function EmployerMatchingCandidates({ vacancies }: EmployerMatchingCandidatesProps) {
  const { t } = useI18n()
  const [selectedVacancyId, setSelectedVacancyId] = useState(vacancies[0]?.id ?? '')
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
        throw new Error(data.error || t.dashboard.matchLoadError)
      }
      setCandidates(Array.isArray(data.candidates) ? data.candidates : [])
    } catch (err) {
      setCandidates([])
      setError(err instanceof Error ? err.message : t.dashboard.matchLoadError)
    } finally {
      setLoading(false)
    }
  }, [t.dashboard.matchLoadError])

  useEffect(() => {
    if (vacancies.length === 0) {
      setSelectedVacancyId('')
      setCandidates([])
      return
    }
    const exists = vacancies.some((v) => v.id === selectedVacancyId)
    const nextId = exists ? selectedVacancyId : vacancies[0].id
    if (nextId !== selectedVacancyId) {
      setSelectedVacancyId(nextId)
    }
  }, [vacancies, selectedVacancyId])

  useEffect(() => {
    if (!selectedVacancyId) return
    fetchMatches(selectedVacancyId)
  }, [selectedVacancyId, fetchMatches])

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
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="match-vacancy-select" className="text-sm font-medium shrink-0">
            {t.dashboard.matchVacancyLabel}
          </label>
          <select
            id="match-vacancy-select"
            value={selectedVacancyId}
            onChange={(e) => setSelectedVacancyId(e.target.value)}
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
            {candidates.map((c) => (
              <li
                key={c.resumeId}
                className="rounded-lg border border-border/70 bg-card p-4 space-y-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{c.candidateName}</p>
                      <p className="text-2xl font-bold text-primary tabular-nums">{c.matchScore}%</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={fitBadgeClass(c.fitLevel)}>
                    {localizedFitLevel(c.fitLevel, t)}
                  </Badge>
                </div>
                {c.overlapSkills.length > 0 && (
                  <p className="text-sm text-muted-foreground pl-11">
                    {c.overlapSkills.join(' • ')}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
