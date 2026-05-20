'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, Compass, Loader2, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/provider'
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

export function SkillImprovementInlineSection() {
  const { t } = useI18n()
  const [report, setReport] = useState<SkillImprovementReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const run = async () => {
      try {
        setLoading(true)
        setError(null)

        const res = await fetch('/api/skill-improvement')
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || t.skillImprovement.error)
        }

        const data = (await res.json()) as SkillImprovementReport
        if (mounted) {
          setReport(data)
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : t.skillImprovement.error
        if (mounted) {
          setError(message)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    run()

    return () => {
      mounted = false
    }
  }, [t])

  const topSkills = useMemo(() => report?.topRecommendations.slice(0, 3) ?? [], [report])
  const topDirection = useMemo(() => report?.careerDirections[0] ?? null, [report])

  return (
    <Card className="border-primary/20 bg-primary/[0.03]">
      <CardHeader>
        <CardTitle className="text-lg inline-flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          {t.skillImprovement.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t.skillImprovement.analyzing}
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        )}

        {!loading && !error && report && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">{t.skillImprovement.yourLevel}: {t.skillImprovement[report.userLevel]}</Badge>
              <Badge variant="outline">{report.currentSkills.total} {t.skillImprovement.skillsDetected}</Badge>
            </div>

            {topDirection && (
              <div className="rounded-lg border border-border/60 bg-background/60 p-3 text-sm">
                <p className="font-medium text-foreground inline-flex items-center gap-1 mb-1">
                  <Compass className="h-3.5 w-3.5 text-primary" />
                  {t.skillImprovement.inlineTopDirection}
                </p>
                <p className="text-muted-foreground">
                  {t.skillImprovement.pathNames[PATH_KEY_TO_I18N_KEY[topDirection.path]]}: {Math.round(topDirection.currentFit * 100)}% → {Math.round(topDirection.potentialFit * 100)}%
                </p>
              </div>
            )}

            {topSkills.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{t.skillImprovement.inlineTopSkills}</p>
                <div className="flex flex-wrap gap-2">
                  {topSkills.map((rec) => (
                    <Badge key={rec.skill} variant="secondary">
                      {getSkillDisplayName(rec.skill)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button asChild size="sm">
              <Link href="/tools/skill-improvement" className="inline-flex items-center gap-1">
                {t.tools.open}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
