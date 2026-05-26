'use client'

import Link from 'next/link'
import { ArrowUpRight, Compass, TrendingUp, Map } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n/provider'
import { getSkillDisplayName } from '@/lib/skill-analysis'
import type { SkillImprovementReport } from '@/lib/skill-recommendation-engine'

interface CareerDirectionsSectionProps {
  report: SkillImprovementReport
}
const PATH_KEY_TO_I18N_KEY = {
  frontend: 'frontend',
  backend: 'backend',
  fullstack: 'fullstack',
  devops: 'devops',
  datascience: 'datascience',
  qa: 'qa',
} as const

const PATH_ROADMAPS: Record<string, string> = {
  frontend: 'https://roadmap.sh/frontend',
  backend: 'https://roadmap.sh/backend',
  fullstack: 'https://roadmap.sh/fullstack',
  devops: 'https://roadmap.sh/devops',
  datascience: 'https://roadmap.sh/ai-data-scientist',
  qa: 'https://roadmap.sh/qa',
}

export function CareerDirectionsSection({ report }: CareerDirectionsSectionProps) {
  const { t } = useI18n()

  if (report.careerDirections.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-1">{t.skillImprovement.careerDirections}</h2>
        <p className="text-sm text-muted-foreground">{t.skillImprovement.careerDirectionsSubtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {report.careerDirections.map((direction) => {
          const pathLabel = t.skillImprovement.pathNames[PATH_KEY_TO_I18N_KEY[direction.path]]

          return (
            <Card key={direction.path} className="flex flex-col">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between gap-2 text-lg">
                  <span className="inline-flex items-center gap-2">
                    <Compass className="h-4 w-4 text-primary" />
                    {pathLabel}
                  </span>
                  <Badge variant="outline" className="text-emerald-700 border-emerald-500/30 bg-emerald-500/10">
                    +{Math.max(0, Math.round((direction.potentialFit - direction.currentFit) * 100))}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-muted-foreground text-xs">{t.skillImprovement.currentFit}</p>
                      <p className="font-semibold">{Math.round(direction.currentFit * 100)}%</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="text-muted-foreground text-xs">{t.skillImprovement.potentialFit}</p>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">{Math.round(direction.potentialFit * 100)}%</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">{t.skillImprovement.skillsToLearn}</p>
                    <div className="flex flex-wrap gap-1">
                      {direction.skillsToLearn.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {getSkillDisplayName(skill)}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {direction.exampleVacancies.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
                        <TrendingUp className="h-3 w-3 text-primary" />
                        {t.skillImprovement.vacanciesUnlockedByPath}
                      </p>
                      <div className="space-y-1">
                        {direction.exampleVacancies.map((vacancy) => (
                          <Link
                            key={`${direction.path}-${vacancy.vacancyId}`}
                            href={`/jobs/${vacancy.vacancyId}`}
                            className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60 transition-colors"
                          >
                            <span className="truncate text-xs text-muted-foreground">{vacancy.title}</span>
                            <span className="inline-flex items-center text-xs font-semibold text-primary">
                              {Math.round(vacancy.matchScore * 100)}%
                              <ArrowUpRight className="h-3 w-3 ml-1" />
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {PATH_ROADMAPS[direction.path] && (
                  <div className="pt-2 border-t border-border/50">
                    <a
                      href={PATH_ROADMAPS[direction.path]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 w-full rounded-md bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold py-2 px-3 transition-colors border border-primary/10"
                    >
                      <Map className="h-3.5 w-3.5" />
                      {t.skillImprovement.viewRoadmap}
                      <ArrowUpRight className="h-3 w-3 ml-0.5 opacity-60" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
