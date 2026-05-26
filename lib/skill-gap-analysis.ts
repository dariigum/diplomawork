/**
 * Analyzes skill gaps between user's resume and job opportunities.
 * Compares what user has vs what market demands.
 */

import { extractSkillsFromText, categorizeSkills, getSkillDisplayName } from './skill-analysis'
import { SKILL_TREES, getSkillUnlocks, getMissingPrerequisites } from './skill-tree'
import { normalizeVacancySkills } from './normalize-vacancy-skills'

export interface SkillGapReport {
  userSkills: string[]
  userSkillsDisplayed: Record<string, string>
  currentLevel: 'junior' | 'mid' | 'senior'
  gapsByRole: Array<{
    roleTitle: string
    requiredSkills: string[]
    recommendedSkills: string[]
    skillGap: string[]
    opportunityCount: number
  }>
  topMissingSkills: Array<{
    skill: string
    displayName: string
    frequency: number
    priority: number // 1-10
    wouldUnlock: string[]
    prerequisites: string[]
  }>
}

/**
 * Determines user's current level based on skill depth and variety.
 */
function assessUserLevel(skills: string[]): 'junior' | 'mid' | 'senior' {
  const skillCount = skills.length
  const advancedSkillsCount = skills.filter((s) => SKILL_TREES[s]?.level === 'advanced').length

  // Heuristic: count and depth
  if (skillCount >= 15 && advancedSkillsCount >= 3) return 'senior'
  if (skillCount >= 8) return 'mid'
  return 'junior'
}

/**
 * Extracts skills from multiple vacancy job descriptions.
 */
export function extractSkillsFromVacancies(
  vacancies: Array<{
    title: string
    skillsRequired?: string | string[]
    description?: string
    requirements?: string[]
  }>,
): Record<string, number> {
  const skillFreq = new Map<string, number>()

  vacancies.forEach((vacancy) => {
    const blob = [vacancy.title, vacancy.description, vacancy.skillsRequired]
      .filter(Boolean)
      .join(' ')

    const skills = extractSkillsFromText(blob)
    skills.forEach((skill) => {
      skillFreq.set(skill, (skillFreq.get(skill) ?? 0) + 1)
    })
  })

  // Convert to Record and sort by frequency
  const result: Record<string, number> = {}
  Array.from(skillFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([skill, count]) => {
      result[skill] = count
    })

  return result
}

/**
 * Analyzes skill gaps between user and target vacancies.
 */
export function analyzeSkillGaps(
  resumeText: string,
  vacancies: Array<{
    _id?: string
    title: string
    skillsRequired?: string | string[]
    description?: string
    requirements?: string[]
  }>,
): SkillGapReport {
  // Extract user skills from resume
  const userSkills = extractSkillsFromText(resumeText)
  const userSkillsSet = new Set(userSkills)

  // Extract vacancy skills
  const vacancySkillFreq = extractSkillsFromVacancies(vacancies)
  const allVacancySkills = Object.keys(vacancySkillFreq)

  // Calculate current level
  const currentLevel = assessUserLevel(userSkills)

  // Find missing skills
  const missingSkills = allVacancySkills.filter((skill) => !userSkillsSet.has(skill))

  // Calculate skill gaps by role
  const gapsByRole = vacancies
    .slice(0, 5) // Analyze top 5 vacancies
    .map((vacancy) => {
      const vacancyBlob = [vacancy.title, vacancy.description, vacancy.skillsRequired]
        .filter(Boolean)
        .join(' ')
      const requiredSkills = extractSkillsFromText(vacancyBlob)
      const skillGap = requiredSkills.filter((s) => !userSkillsSet.has(s))

      // Classify as required or recommended based on frequency in similar roles
      const recommended = skillGap.filter(
        (skill) => vacancySkillFreq[skill] && vacancySkillFreq[skill] <= vacancies.length * 0.5,
      )

      return {
        roleTitle: vacancy.title,
        requiredSkills,
        recommendedSkills: recommended,
        skillGap,
        opportunityCount: 1,
      }
    })

  // Top missing skills with priority
  const topMissing = missingSkills
    .slice(0, 10)
    .map((skill) => {
      const frequency = vacancySkillFreq[skill]
      const priority = Math.min(10, Math.max(1, frequency || 5))
      const wouldUnlock = getSkillUnlocks(skill)
      const prerequisites = getMissingPrerequisites(skill, userSkills)

      return {
        skill,
        displayName: getSkillDisplayName(skill),
        frequency,
        priority,
        wouldUnlock,
        prerequisites,
      }
    })
    .sort((a, b) => b.priority - a.priority)

  // Display user skills with categories
  const userSkillsDisplayed = userSkills.reduce(
    (acc, skill) => {
      acc[skill] = getSkillDisplayName(skill)
      return acc
    },
    {} as Record<string, string>,
  )

  return {
    userSkills,
    userSkillsDisplayed,
    currentLevel,
    gapsByRole,
    topMissingSkills: topMissing,
  }
}

/**
 * Calculates which vacancies user could apply to if they learned a skill.
 */
export function findVacanciesUnlockedBySkill(
  skill: string,
  userSkills: string[],
  vacancies: Array<{
    _id?: string | { toString(): string }
    title: string
    skillsRequired?: string | string[]
    description?: string
    requirements?: string[]
  }>,
): Array<{
  vacancyId: string
  title: string
  matchScore: number
  remainingGap: number
}> {
  const userSkillsSet = new Set([...userSkills, skill])

  return vacancies
    .map((vacancy) => {
      const vacancyBlob = [vacancy.title, vacancy.description, vacancy.skillsRequired]
        .filter(Boolean)
        .join(' ')
      const requiredSkills = extractSkillsFromText(vacancyBlob)
      const skillGap = requiredSkills.filter((s) => !userSkillsSet.has(s))

      // Match score: percentage of skills user would have
      const matchScore = requiredSkills.length > 0 ? (requiredSkills.length - skillGap.length) / requiredSkills.length : 0

      const vacancyId = typeof vacancy._id === 'string' ? vacancy._id : vacancy._id?.toString() ?? ''

      return {
        vacancyId,
        title: vacancy.title,
        matchScore,
        remainingGap: skillGap.length,
      }
    })
    .filter((item) => item.matchScore > 0.6) // Only viable opportunities
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 5) // Top 5 opportunities
}

/**
 * Suggests a learning path based on current skills and target role path.
 */
export interface LearningPath {
  step: number
  skill: string
  displayName: string
  prerequisites: string[]
  unlocksSkills: string[]
  estimatedHoursToLearn: number
  jobsWithThisSkill: number
}

export function suggestLearningPath(
  userSkills: string[],
  missingSkills: string[],
  vacancySkillFreq: Record<string, number>,
  maxSteps = 5,
): LearningPath[] {
  const userSkillsSet = new Set(userSkills)
  const learningPath: LearningPath[] = []
  let currentSkills = new Set(userSkills)

  // Heuristic: hours estimate based on skill level
  const estimateHours = (skill: string): number => {
    const level = SKILL_TREES[skill]?.level ?? 'intermediate'
    switch (level) {
      case 'beginner':
        return 40
      case 'intermediate':
        return 80
      case 'advanced':
        return 160
    }
  }

  // Build path by selecting skills with no unsatisfied prerequisites
  for (let i = 0; i < maxSteps && missingSkills.length > 0; i++) {
    // Find learnable skills (no unmet prerequisites)
    const learnable = missingSkills.filter((skill) => {
      const prereqs = getMissingPrerequisites(skill, Array.from(currentSkills))
      return prereqs.length === 0
    })

    if (learnable.length === 0) break // No more learnable skills

    // Pick the most impactful skill (by vacancy frequency and unlocks)
    const best = learnable.reduce((prev, current) => {
      const prevScore = (vacancySkillFreq[prev] ?? 0) + getSkillUnlocks(prev).length * 2
      const currScore = (vacancySkillFreq[current] ?? 0) + getSkillUnlocks(current).length * 2
      return currScore > prevScore ? current : prev
    })

    const prerequisites = getMissingPrerequisites(best, Array.from(currentSkills))
    const unlocksSkills = getSkillUnlocks(best)

    learningPath.push({
      step: i + 1,
      skill: best,
      displayName: getSkillDisplayName(best),
      prerequisites,
      unlocksSkills,
      estimatedHoursToLearn: estimateHours(best),
      jobsWithThisSkill: vacancySkillFreq[best] ?? 0,
    })

    currentSkills.add(best)
    missingSkills = missingSkills.filter((s) => s !== best)
  }

  return learningPath
}
