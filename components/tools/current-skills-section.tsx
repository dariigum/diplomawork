'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/lib/i18n/provider'
import { getCategoryDisplayName, getSkillDisplayName } from '@/lib/skill-analysis'
import type { SkillImprovementReport } from '@/lib/skill-recommendation-engine'

interface CurrentSkillsSectionProps {
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

/**
 * Displays user's current skills grouped by category.
 */
export function CurrentSkillsSection({ report }: CurrentSkillsSectionProps) {
  const { t } = useI18n()

  const getLevelBadgeClass = (level: 'junior' | 'mid' | 'senior') => {
    switch (level) {
      case 'senior':
        return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100'
      case 'mid':
        return 'border-blue-500/40 bg-blue-500/10 text-blue-900 dark:text-blue-100'
      case 'junior':
        return 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100'
    }
  }

  const getLevelDisplayName = (level: 'junior' | 'mid' | 'senior') => t.skillImprovement[level]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <span>{t.skillImprovement.currentSkills}</span>
          <Badge variant="outline" className={getLevelBadgeClass(report.userLevel)}>
            {getLevelDisplayName(report.userLevel)}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.currentSkills.total === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t.skillImprovement.noActiveResume}</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{report.currentSkills.total}</span>
              <span className="text-sm text-muted-foreground">{t.skillImprovement.skillsDetected}</span>
            </div>

            {report.currentProfile.suitableDirections.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">{t.skillImprovement.canApplyNow}</p>
                <div className="flex flex-wrap gap-2">
                  {report.currentProfile.suitableDirections.map((direction) => (
                    <Badge key={direction.path} variant="outline" className="gap-1">
                      {t.skillImprovement.pathNames[PATH_KEY_TO_I18N_KEY[direction.path]]}
                      <span className="text-muted-foreground">{Math.round(direction.fitScore * 100)}%</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {Object.entries(report.currentSkills.byCategory).length === 0 ? (
                <p className="text-sm text-muted-foreground">{t.skillImprovement.updateResume}</p>
              ) : (
                Object.entries(report.currentSkills.byCategory).map(([category, skills]) => (
                  <div key={category}>
                    <h4 className="text-sm font-semibold text-foreground mb-2">
                      {getCategoryDisplayName(category)}
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {getSkillDisplayName(skill)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
