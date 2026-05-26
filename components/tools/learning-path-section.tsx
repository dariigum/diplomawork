'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'
import { getSkillDisplayName } from '@/lib/skill-analysis'
import type { LearningPathItem } from '@/lib/skill-recommendation-engine'

interface LearningPathSectionProps {
  path: LearningPathItem[]
}

/**
 * Displays suggested learning path with steps and progress.
 */
export function LearningPathSection({ path }: LearningPathSectionProps) {
  const { t } = useI18n()

  if (path.length === 0) {
    return null
  }

  const totalHours = path.reduce((sum, step) => sum + step.estimatedHoursToLearn, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{t.skillImprovement.learningPath}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline gap-2">
          <span className="text-sm text-muted-foreground">{t.skillImprovement.estimatedTotalTime}</span>
          <span className="text-lg font-bold">{totalHours} {t.skillImprovement.hours}</span>
        </div>

        <div className="space-y-3">
          {path.map((step, idx) => (
            <div key={step.skill} className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {step.step}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-foreground">{step.displayName}</h4>
                  <p className="text-xs text-muted-foreground">
                    {step.estimatedHoursToLearn} {t.skillImprovement.hours} • {step.jobsWithThisSkill} {t.skillImprovement.jobsLabel}
                  </p>
                </div>
              </div>

              {step.prerequisites.length > 0 && (
                <div className="ml-11 text-xs">
                  <p className="text-muted-foreground mb-1">{t.skillImprovement.prerequisites}:</p>
                  <div className="flex flex-wrap gap-1">
                    {step.prerequisites.map((prereq) => (
                      <Badge key={prereq} variant="outline" className="text-xs">
                        {getSkillDisplayName(prereq)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {step.unlocksSkills.length > 0 && (
                <div className="ml-11 text-xs">
                  <p className="text-emerald-700 dark:text-emerald-400 mb-1 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    {t.skillImprovement.unlocks}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {step.unlocksSkills.slice(0, 3).map((unlock) => (
                      <Badge key={unlock} variant="outline" className="text-xs bg-emerald-500/10 border-emerald-500/30">
                        {getSkillDisplayName(unlock)}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {idx < path.length - 1 && (
                <div className="ml-11 flex justify-center py-1">
                  <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-sm">
          <BookOpen className="h-4 w-4 inline mr-2 text-primary" />
          <span className="text-muted-foreground">{t.skillImprovement.learningPathTip}</span>
        </div>
      </CardContent>
    </Card>
  )
}
