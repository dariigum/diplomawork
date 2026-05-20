'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n/provider'
import { CurrentSkillsSection } from '@/components/tools/current-skills-section'
import { SkillRecommendationsSection } from '@/components/tools/skill-recommendations-section'
import { LearningPathSection } from '@/components/tools/learning-path-section'
import { CareerDirectionsSection } from '@/components/tools/career-directions-section'
import { getSkillDisplayName } from '@/lib/skill-analysis'
import type { SkillImprovementReport } from '@/lib/skill-recommendation-engine'

const PATH_KEY_TO_I18N_KEY = {
  frontend: 'frontend',
  backend: 'backend',
  fullstack: 'fullstack',
  devops: 'devops',
  datascience: 'datascience',
  qa: 'qa',
} as const

/**
 * Skill Improvement page component.
 * Full feature view with all sections and analysis.
 */
export default function SkillImprovementClient() {
  const { t } = useI18n()
  const [report, setReport] = useState<SkillImprovementReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchReport = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/skill-improvement')

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || t.skillImprovement.error)
        }

        const data = (await res.json()) as SkillImprovementReport
        setReport(data)
      } catch (err) {
        const message = err instanceof Error ? err.message : t.skillImprovement.error
        setError(message)
        console.error('Skill analysis error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [t])

  const renderedNextSteps = useMemo(() => {
    if (!report) return []

    return report.nextSteps.map((step) => {
      if (step === 'add_more_resume_details') return t.skillImprovement.stepAddMoreResumeDetails
      if (step === 'add_more_signals') return t.skillImprovement.stepAddMoreSignals
      if (step === 'resume_required') return t.skillImprovement.stepResumeRequired
      if (step === 'add_resume_skills') return t.skillImprovement.stepAddResumeSkills
      if (step === 'add_saved_or_applied') return t.skillImprovement.stepAddSavedOrApplied

      if (step.startsWith('learn:')) {
        const skill = step.slice('learn:'.length)
        return `${t.skillImprovement.learnStepPrefix} ${getSkillDisplayName(skill)}`
      }

      if (step.startsWith('explore_path:')) {
        const pathKey = step.slice('explore_path:'.length) as keyof typeof PATH_KEY_TO_I18N_KEY
        const label = PATH_KEY_TO_I18N_KEY[pathKey]
          ? t.skillImprovement.pathNames[PATH_KEY_TO_I18N_KEY[pathKey]]
          : pathKey
        return `${t.skillImprovement.explorePathPrefix} ${label}`
      }

      return step
    })
  }, [report, t])

  return (
    <div className="bg-background pb-12">
      <div className="border-b border-border/50 bg-muted/30">
        <div className="container max-w-6xl mx-auto px-4 py-8">
          <Link href="/tools" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            {t.skillImprovement.backToCareerHub}
          </Link>
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">{t.skillImprovement.title}</h1>
            <p className="text-muted-foreground">{t.skillImprovement.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="container max-w-6xl mx-auto px-4 py-12">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-muted-foreground">{t.skillImprovement.analyzing}</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {report && (
          <div className="space-y-8">
            <Card className="border-border/60">
              <CardContent className="p-4">
                <div className="grid gap-3 sm:grid-cols-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t.skillImprovement.sourceSaved}</p>
                    <p className="font-semibold text-foreground">{report.sourceStats.savedVacancies}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t.skillImprovement.sourceApplied}</p>
                    <p className="font-semibold text-foreground">{report.sourceStats.appliedVacancies}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t.skillImprovement.sourceMarket}</p>
                    <p className="font-semibold text-foreground">{report.sourceStats.marketVacancies}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <CurrentSkillsSection report={report} />

            {report.topRecommendations.length > 0 && (
              <SkillRecommendationsSection report={report} />
            )}

            {report.careerDirections.length > 0 && (
              <CareerDirectionsSection report={report} />
            )}

            {report.learningPath.length > 0 && (
              <LearningPathSection path={report.learningPath} />
            )}

            {renderedNextSteps.length > 0 && (
              <div className="rounded-lg border border-border/50 bg-muted/30 p-6">
                <h2 className="text-lg font-semibold text-foreground mb-4">{t.skillImprovement.nextSteps}</h2>
                <ul className="space-y-2">
                  {renderedNextSteps.map((step, idx) => (
                    <li key={idx} className="flex gap-3 text-sm text-muted-foreground">
                      <span className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {!loading && !error && !report && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t.skillImprovement.noActiveResume}</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/employee">{t.skillImprovement.goToDashboard}</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
