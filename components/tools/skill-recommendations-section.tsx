'use client'

import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookOpen, Lock, Unlock } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'
import { getSkillDisplayName } from '@/lib/skill-analysis'
import type { SkillImprovementReport } from '@/lib/skill-recommendation-engine'

interface SkillRecommendationsSectionProps {
  report: SkillImprovementReport
}

/**
 * Displays top skill recommendations with details about impact.
 */
export function SkillRecommendationsSection({ report }: SkillRecommendationsSectionProps) {
  const { t } = useI18n()

  if (report.topRecommendations.length === 0) {
    return null
  }

  const getPriorityColor = (priority: number) => {
    if (priority >= 8) return 'border-red-500/40 bg-red-500/10 text-red-900 dark:text-red-100'
    if (priority >= 5) return 'border-orange-500/40 bg-orange-500/10 text-orange-900 dark:text-orange-100'
    return 'border-blue-500/40 bg-blue-500/10 text-blue-900 dark:text-blue-100'
  }

  const getSourceSignalLabel = (signal: 'applications' | 'saved' | 'market') => {
    if (signal === 'applications') return t.skillImprovement.fromApplications
    if (signal === 'saved') return t.skillImprovement.fromSaved
    return t.skillImprovement.fromMarket
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">{t.skillImprovement.topRecommendations}</h2>
        <p className="text-sm text-muted-foreground">{t.skillImprovement.gapAnalysis}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {report.topRecommendations.map((rec) => (
          <Card key={rec.skill}>
            <CardContent className="p-5">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground">{rec.displayName}</h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge variant="outline" className={getPriorityColor(rec.priority)}>
                        {t.skillImprovement.marketDemand}: {rec.priority}/10
                      </Badge>
                      <Badge variant="outline">{getSourceSignalLabel(rec.sourceSignal)}</Badge>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-muted-foreground text-xs">{t.skillImprovement.frequency}</p>
                    <p className="font-semibold">{rec.frequency} {t.skillImprovement.jobsLabel}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-muted-foreground text-xs">{t.skillImprovement.estimatedHours}</p>
                    <p className="font-semibold">{rec.estimatedLearningHours} {t.skillImprovement.hours}</p>
                  </div>
                </div>

                <div className="rounded-lg bg-primary/5 border border-primary/10 p-2 text-xs text-muted-foreground">
                  {t.skillImprovement.unlockableSkills}: {rec.unlockableSkillsCount}
                </div>

                {rec.prerequisitesUserLacks.length > 0 && (
                  <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3">
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 mb-1 flex items-center gap-1">
                      <Lock className="h-3 w-3" />
                      {t.skillImprovement.prerequisites}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {rec.prerequisitesUserLacks.map((prereq) => (
                        <Badge key={prereq} variant="outline" className="text-xs">
                          {getSkillDisplayName(prereq)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {rec.wouldUnlockJobs.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1">
                      <Unlock className="h-3 w-3 text-emerald-600" />
                      {t.skillImprovement.unlockedOpportunities}
                    </p>
                    <div className="space-y-1">
                      {rec.wouldUnlockJobs.slice(0, 3).map((job) => (
                        <div key={job.vacancyId} className="text-xs text-muted-foreground flex items-center justify-between">
                          <span className="truncate">{job.title}</span>
                          <span className="text-emerald-600 font-semibold ml-2">
                            {Math.round(job.matchScore * 100)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button className="w-full" size="sm" asChild>
                  <Link href="/resources">
                    <BookOpen className="h-3 w-3 mr-2" />
                    {t.skillImprovement.startLearning}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
