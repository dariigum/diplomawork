/**
 * Skill improvement recommendation engine.
 * Builds a profile from resume + user vacancy intent (saved/applied) and suggests growth paths.
 */

import { categorizeSkills, extractSkillsFromText, getSkillDisplayName } from './skill-analysis'
import { normalizeStringArray } from './normalize-string-array'
import { normalizeVacancySkills } from './normalize-vacancy-skills'
import { SKILL_TREES, getMissingPrerequisites, getSkillUnlocks, type SkillPath } from './skill-tree'

export type SkillImprovementVacancy = {
  _id?: string | { toString(): string }
  title: string
  skillsRequired?: string | string[]
  description?: string
  requirements?: string | string[]
  responsibilities?: string | string[]
}

export type SkillSourceType = 'saved' | 'applied' | 'market'

export type SkillImprovementInput = {
  resumeText: string
  savedVacancies: SkillImprovementVacancy[]
  appliedVacancies: SkillImprovementVacancy[]
  marketVacancies?: SkillImprovementVacancy[]
}

export interface SkillRecommendation {
  skill: string
  displayName: string
  priority: number // 1-10
  frequency: number // in how many relevant vacancies it appears
  prerequisitesUserLacks: string[]
  wouldUnlockJobs: Array<{
    vacancyId: string
    title: string
    matchScore: number
  }>
  estimatedLearningHours: number
  level: 'beginner' | 'intermediate' | 'advanced'
  sourceSignal: 'applications' | 'saved' | 'market'
  unlockableSkillsCount: number
}

export interface LearningPathItem {
  step: number
  skill: string
  displayName: string
  prerequisites: string[]
  unlocksSkills: string[]
  estimatedHoursToLearn: number
  jobsWithThisSkill: number
}

export interface CareerDirectionOpportunity {
  path: SkillPath
  currentFit: number
  potentialFit: number
  skillsToLearn: string[]
  exampleVacancies: Array<{
    vacancyId: string
    title: string
    matchScore: number
  }>
}

export interface IndividualProgram {
  personalizedAdvice: string[]
  metrics: {
    marketDemandScore: number
    skillMatchPercentage: number
    activeOpportunitiesCount: number
    growthPotential: number
  }
  improvementProposals: Array<{
    aspect: string
    currentStatus: string
    recommendation: string
    resources: string[]
  }>
}

export interface SkillImprovementReport {
  analysisTimestamp: Date
  sourceStats: {
    savedVacancies: number
    appliedVacancies: number
    marketVacancies: number
  }
  currentSkills: {
    total: number
    byCategory: Record<string, string[]>
    displayNames: Record<string, string>
  }
  currentProfile: {
    suitableDirections: Array<{
      path: SkillPath
      fitScore: number
      matchingSkills: string[]
    }>
  }
  userLevel: 'junior' | 'mid' | 'senior'
  topRecommendations: SkillRecommendation[]
  learningPath: LearningPathItem[]
  careerDirections: CareerDirectionOpportunity[]
  nextSteps: string[]
  individualProgram?: IndividualProgram
}


type EnrichedVacancy = {
  id: string
  title: string
  source: SkillSourceType
  requiredSkills: string[]
  primaryPath: SkillPath | null
}

const SOURCE_WEIGHT: Record<SkillSourceType, number> = {
  applied: 1.9,
  saved: 1.4,
  market: 0.8,
}

const PATHS: SkillPath[] = ['frontend', 'backend', 'fullstack', 'devops', 'datascience', 'qa']

function assessUserLevel(skills: string[]): 'junior' | 'mid' | 'senior' {
  const skillCount = skills.length
  const advancedSkillsCount = skills.filter((s) => SKILL_TREES[s]?.level === 'advanced').length

  if (skillCount >= 15 && advancedSkillsCount >= 3) return 'senior'
  if (skillCount >= 8) return 'mid'
  return 'junior'
}

function estimateLearningHours(skill: string): number {
  const level = SKILL_TREES[skill]?.level ?? 'intermediate'
  if (level === 'beginner') return 40
  if (level === 'advanced') return 160
  return 80
}

function toVacancyId(raw: SkillImprovementVacancy['_id'], fallbackTitle: string, index: number): string {
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object' && typeof raw.toString === 'function') {
    const fromObj = raw.toString()
    if (fromObj) return fromObj
  }
  return `vac-${index}-${fallbackTitle.toLowerCase().replace(/\s+/g, '-')}`
}

function extractVacancySkills(vacancy: SkillImprovementVacancy): string[] {
  const textBlob = [
    vacancy.title,
    vacancy.description,
    vacancy.skillsRequired,
    normalizeStringArray(vacancy.requirements).join(' '),
    normalizeStringArray(vacancy.responsibilities).join(' '),
    normalizeVacancySkills(vacancy.skillsRequired).join(' '),
  ]
    .filter(Boolean)
    .join(' ')

  return extractSkillsFromText(textBlob)
}

function classifyVacancyPath(title: string, skills: string[]): SkillPath | null {
  const scores: Record<SkillPath, number> = {
    frontend: 0,
    backend: 0,
    fullstack: 0,
    devops: 0,
    datascience: 0,
    qa: 0,
  }

  for (const skill of skills) {
    const tree = SKILL_TREES[skill]
    if (!tree) continue
    for (const path of tree.path) {
      scores[path] += 1
    }
  }

  const titleLower = title.toLowerCase()
  if (/front\s*-?end|ui\b|ux\b/.test(titleLower)) scores.frontend += 2
  if (/back\s*-?end|api\b|server/.test(titleLower)) scores.backend += 2
  if (/full\s*-?stack/.test(titleLower)) scores.fullstack += 2
  if (/devops|platform|sre|infrastructure/.test(titleLower)) scores.devops += 2
  if (/data|machine learning|ml\b|ai\b|analyst|scientist/.test(titleLower)) scores.datascience += 2
  if (/qa\b|quality|test automation|tester/.test(titleLower)) scores.qa += 2

  let bestPath: SkillPath | null = null
  let bestScore = 0

  for (const path of PATHS) {
    if (scores[path] > bestScore) {
      bestScore = scores[path]
      bestPath = path
    }
  }

  return bestScore > 0 ? bestPath : null
}

function calculateMatchScore(requiredSkills: string[], skillsSet: Set<string>): number {
  if (requiredSkills.length === 0) return 0
  const covered = requiredSkills.filter((skill) => skillsSet.has(skill)).length
  return covered / requiredSkills.length
}

function normalizeFit(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function buildPathDemandSkills(vacancies: EnrichedVacancy[]): Record<SkillPath, string[]> {
  const scoreMap: Record<SkillPath, Map<string, number>> = {
    frontend: new Map(),
    backend: new Map(),
    fullstack: new Map(),
    devops: new Map(),
    datascience: new Map(),
    qa: new Map(),
  }

  for (const vacancy of vacancies) {
    if (!vacancy.primaryPath) continue
    const pathMap = scoreMap[vacancy.primaryPath]
    for (const skill of vacancy.requiredSkills) {
      pathMap.set(skill, (pathMap.get(skill) ?? 0) + SOURCE_WEIGHT[vacancy.source])
    }
  }

  const out = {} as Record<SkillPath, string[]>
  for (const path of PATHS) {
    out[path] = Array.from(scoreMap[path].entries())
      .sort((a, b) => b[1] - a[1])
      .map(([skill]) => skill)
  }
  return out
}

function getVacancyOpportunityList(
  vacancies: EnrichedVacancy[],
  currentSkills: Set<string>,
  addedSkills: string[],
): Array<{ vacancyId: string; title: string; matchScore: number }> {
  if (addedSkills.length === 0) return []

  const upgradedSkills = new Set(currentSkills)
  for (const skill of addedSkills) {
    upgradedSkills.add(skill)
  }

  return vacancies
    .map((vacancy) => {
      const current = calculateMatchScore(vacancy.requiredSkills, currentSkills)
      const target = calculateMatchScore(vacancy.requiredSkills, upgradedSkills)
      return {
        vacancyId: vacancy.id,
        title: vacancy.title,
        matchScore: target,
        delta: target - current,
      }
    })
    .filter((item) => item.matchScore >= 0.65 && item.delta >= 0.15)
    .sort((a, b) => b.delta - a.delta || b.matchScore - a.matchScore)
    .slice(0, 5)
    .map(({ vacancyId, title, matchScore }) => ({ vacancyId, title, matchScore: normalizeFit(matchScore) }))
}

/**
 * Main function to generate skill improvement report.
 */
export async function generateSkillImprovementReport(
  input: SkillImprovementInput,
): Promise<SkillImprovementReport> {
  const resumeText = (input.resumeText ?? '').trim()
  const savedVacancies = input.savedVacancies ?? []
  const appliedVacancies = input.appliedVacancies ?? []
  const marketVacancies = input.marketVacancies ?? []

  const userSkills = extractSkillsFromText(resumeText)
  const userSkillsSet = new Set(userSkills)

  const allInputVacancies: Array<{ vacancy: SkillImprovementVacancy; source: SkillSourceType }> = [
    ...appliedVacancies.map((vacancy) => ({ vacancy, source: 'applied' as const })),
    ...savedVacancies.map((vacancy) => ({ vacancy, source: 'saved' as const })),
    ...marketVacancies.map((vacancy) => ({ vacancy, source: 'market' as const })),
  ]

  const deduped = new Map<string, EnrichedVacancy>()
  allInputVacancies.forEach(({ vacancy, source }, index) => {
    const id = toVacancyId(vacancy._id, vacancy.title, index)
    const key = `${id}-${source}`
    if (deduped.has(key)) return

    const requiredSkills = extractVacancySkills(vacancy)
    deduped.set(key, {
      id,
      title: vacancy.title,
      source,
      requiredSkills,
      primaryPath: classifyVacancyPath(vacancy.title, requiredSkills),
    })
  })

  const vacancies = Array.from(deduped.values())

  const emptyReport: SkillImprovementReport = {
    analysisTimestamp: new Date(),
    sourceStats: {
      savedVacancies: savedVacancies.length,
      appliedVacancies: appliedVacancies.length,
      marketVacancies: marketVacancies.length,
    },
    currentSkills: {
      total: userSkills.length,
      byCategory: categorizeSkills(userSkills),
      displayNames: userSkills.reduce<Record<string, string>>((acc, skill) => {
        acc[skill] = getSkillDisplayName(skill)
        return acc
      }, {}),
    },
    currentProfile: {
      suitableDirections: [],
    },
    userLevel: assessUserLevel(userSkills),
    topRecommendations: [],
    learningPath: [],
    careerDirections: [],
    nextSteps: [],
    individualProgram: {
      personalizedAdvice: ['Загрузите ваше резюме и сохраните несколько вакансий, чтобы получить индивидуальные советы.'],
      metrics: {
        marketDemandScore: 0,
        skillMatchPercentage: 0,
        activeOpportunitiesCount: 0,
        growthPotential: 0,
      },
      improvementProposals: [],
    }
  }

  if (!resumeText) {
    emptyReport.nextSteps = ['resume_required', 'add_resume_skills']
    return emptyReport
  }

  if (vacancies.length === 0) {
    emptyReport.nextSteps = ['add_saved_or_applied']
    return emptyReport
  }

  const missingSkillSignals = new Map<
    string,
    {
      weighted: number
      frequency: number
      sources: Set<SkillSourceType>
    }
  >()

  for (const vacancy of vacancies) {
    const uniqueSkills = Array.from(new Set(vacancy.requiredSkills))
    for (const skill of uniqueSkills) {
      if (userSkillsSet.has(skill)) continue
      const prev = missingSkillSignals.get(skill) ?? {
        weighted: 0,
        frequency: 0,
        sources: new Set<SkillSourceType>(),
      }
      prev.weighted += SOURCE_WEIGHT[vacancy.source]
      prev.frequency += 1
      prev.sources.add(vacancy.source)
      missingSkillSignals.set(skill, prev)
    }
  }

  const scoredMissingSkills = Array.from(missingSkillSignals.entries())
    .map(([skill, signal]) => {
      const unlockableSkillsCount = getSkillUnlocks(skill).length
      const prerequisitesUserLacks = getMissingPrerequisites(skill, userSkills)
      const prerequisitePenalty = Math.min(3, prerequisitesUserLacks.length)

      const rawPriority = signal.weighted * 1.4 + signal.frequency * 0.7 + unlockableSkillsCount * 0.6 - prerequisitePenalty
      const priority = Math.max(1, Math.min(10, Math.round(rawPriority)))

      let sourceSignal: SkillRecommendation['sourceSignal'] = 'market'
      if (signal.sources.has('applied')) sourceSignal = 'applications'
      else if (signal.sources.has('saved')) sourceSignal = 'saved'

      return {
        skill,
        signal,
        priority,
        prerequisitesUserLacks,
        unlockableSkillsCount,
        sourceSignal,
      }
    })
    .sort((a, b) => b.priority - a.priority || b.signal.weighted - a.signal.weighted)

  const topRecommendations: SkillRecommendation[] = scoredMissingSkills.slice(0, 8).map((item) => {
    const tree = SKILL_TREES[item.skill]
    const level = tree?.level ?? 'intermediate'
    const opportunities = getVacancyOpportunityList(vacancies, userSkillsSet, [item.skill])

    return {
      skill: item.skill,
      displayName: getSkillDisplayName(item.skill),
      priority: item.priority,
      frequency: item.signal.frequency,
      prerequisitesUserLacks: item.prerequisitesUserLacks,
      wouldUnlockJobs: opportunities,
      estimatedLearningHours: estimateLearningHours(item.skill),
      level,
      sourceSignal: item.sourceSignal,
      unlockableSkillsCount: item.unlockableSkillsCount,
    }
  })

  const missingSkillSet = new Set(scoredMissingSkills.map((entry) => entry.skill))
  const learningPath: LearningPathItem[] = []
  const plannedSkills = new Set(userSkills)

  while (learningPath.length < 5 && missingSkillSet.size > 0) {
    const candidates = Array.from(missingSkillSet).map((skill) => {
      const signal = missingSkillSignals.get(skill)
      if (!signal) return null

      const prereqs = getMissingPrerequisites(skill, Array.from(plannedSkills))
      if (prereqs.length > 0) return null

      const unlockScore = getSkillUnlocks(skill).length
      const score = signal.weighted + signal.frequency * 0.5 + unlockScore

      return {
        skill,
        score,
        signal,
      }
    }).filter((value): value is { skill: string; score: number; signal: { weighted: number; frequency: number; sources: Set<SkillSourceType> } } => Boolean(value))

    if (candidates.length === 0) break

    candidates.sort((a, b) => b.score - a.score)
    const next = candidates[0]

    learningPath.push({
      step: learningPath.length + 1,
      skill: next.skill,
      displayName: getSkillDisplayName(next.skill),
      prerequisites: getMissingPrerequisites(next.skill, Array.from(userSkillsSet)),
      unlocksSkills: getSkillUnlocks(next.skill),
      estimatedHoursToLearn: estimateLearningHours(next.skill),
      jobsWithThisSkill: next.signal.frequency,
    })

    plannedSkills.add(next.skill)
    missingSkillSet.delete(next.skill)
  }

  const pathDemandSkills = buildPathDemandSkills(vacancies)

  const suitableDirections = PATHS
    .map((path) => {
      const demanded = pathDemandSkills[path].slice(0, 8)
      if (demanded.length === 0) return null

      const matchingSkills = demanded.filter((skill) => userSkillsSet.has(skill))
      if (matchingSkills.length === 0) return null

      const fitScore = matchingSkills.length / demanded.length
      return {
        path,
        fitScore: normalizeFit(fitScore),
        matchingSkills: matchingSkills.slice(0, 5),
      }
    })
    .filter((value): value is { path: SkillPath; fitScore: number; matchingSkills: string[] } => Boolean(value))
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, 4)

  const careerDirections: CareerDirectionOpportunity[] = PATHS
    .map((path) => {
      const pathVacancies = vacancies.filter((vacancy) => vacancy.primaryPath === path)
      if (pathVacancies.length === 0) return null

      const demanded = pathDemandSkills[path]
      const currentFitAvg =
        pathVacancies.reduce((sum, vacancy) => sum + calculateMatchScore(vacancy.requiredSkills, userSkillsSet), 0) /
        pathVacancies.length

      const skillsToLearn: string[] = []
      const simulationSkills = new Set(userSkillsSet)

      for (const skill of demanded) {
        if (skillsToLearn.length >= 3) break
        if (simulationSkills.has(skill)) continue

        const missingPrereqs = getMissingPrerequisites(skill, Array.from(simulationSkills))
        if (missingPrereqs.length > 1) continue

        skillsToLearn.push(skill)
        simulationSkills.add(skill)
      }

      if (skillsToLearn.length === 0) {
        for (const skill of demanded) {
          if (skillsToLearn.length >= 2) break
          if (userSkillsSet.has(skill)) continue
          skillsToLearn.push(skill)
        }
      }

      if (skillsToLearn.length === 0) return null

      const potentialFitAvg =
        pathVacancies.reduce((sum, vacancy) => sum + calculateMatchScore(vacancy.requiredSkills, simulationSkills), 0) /
        pathVacancies.length

      const unlocked = getVacancyOpportunityList(pathVacancies, userSkillsSet, skillsToLearn)
      const meaningfulGain = potentialFitAvg - currentFitAvg >= 0.1 || unlocked.length > 0
      if (!meaningfulGain) return null

      return {
        path,
        currentFit: normalizeFit(currentFitAvg),
        potentialFit: normalizeFit(potentialFitAvg),
        skillsToLearn,
        exampleVacancies: unlocked.slice(0, 3),
      }
    })
    .filter((value): value is CareerDirectionOpportunity => Boolean(value))
    .sort(
      (a, b) =>
        b.exampleVacancies.length - a.exampleVacancies.length ||
        b.potentialFit - b.currentFit - (a.potentialFit - a.currentFit),
    )
    .slice(0, 4)

  const nextSteps: string[] = []
  if (userSkills.length < 5) {
    nextSteps.push('add_more_resume_details')
  }
  if (topRecommendations.length > 0) {
    nextSteps.push(`learn:${topRecommendations[0].skill}`)
  }
  if (careerDirections.length > 0) {
    nextSteps.push(`explore_path:${careerDirections[0].path}`)
  }
  if (savedVacancies.length + appliedVacancies.length < 5) {
    nextSteps.push('add_more_signals')
  }

  // --- INDIVIDUAL GROWTH PROGRAM GENERATION ---
  const personalizedAdvice: string[] = []
  
  // 1. Level-based advice
  const level = assessUserLevel(userSkills)
  if (level === 'junior') {
    personalizedAdvice.push(
      'Вы находитесь на начальном этапе карьеры (Junior). Сейчас важнее всего заложить прочный фундамент базовых навыков. Не распыляйтесь на множество фреймворков, сфокусируйтесь на освоении 1-2 ключевых инструментов до автоматизма.'
    )
  } else if (level === 'mid') {
    personalizedAdvice.push(
      'Вы уверенный специалист уровня Middle. Ваша главная точка роста — углубление в архитектурные паттерны, оптимизацию производительности и автоматизацию процессов (например, Docker/CI/CD). Это поможет вам выделиться среди других кандидатов.'
    )
  } else {
    personalizedAdvice.push(
      'Вы специалист уровня Senior с богатым набором навыков. Для дальнейшего роста сфокусируйтесь на системном проектировании (System Design), масштабировании инфраструктуры и развитии лидерских качеств. Рассмотрите возможность наставничества.'
    )
  }

  // 2. Dynamic top direction/path advice based on actual saved/applied vacancies
  const pathCounts: Record<string, number> = {}
  for (const v of vacancies) {
    if (v.primaryPath) {
      pathCounts[v.primaryPath] = (pathCounts[v.primaryPath] || 0) + 1
    }
  }
  const topPath = Object.entries(pathCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  if (topPath === 'frontend') {
    personalizedAdvice.push(
      'Анализ ваших интересов показывает выраженную склонность к Frontend-разработке. Современный фронтенд требует не только верстки, но и работы с состоянием приложения (State Management) и оптимизации рендеринга. Уделите внимание TypeScript и сборщикам (Vite/Webpack).'
    )
  } else if (topPath === 'backend') {
    personalizedAdvice.push(
      'Судя по сохраненным вакансиям, вас привлекает Backend-разработка. Уделите особое внимание проектированию REST/GraphQL API, оптимизации SQL-запросов и работе с кэшированием (Redis). Это критические навыки для любого серверного разработчика.'
    )
  } else if (topPath === 'datascience') {
    personalizedAdvice.push(
      'Вы интересуетесь Data Science и AI/ML технологиями. Помимо изучения библиотек (Pandas, PyTorch), обязательно развивайте навыки работы со статистикой, математическим анализом и предобработкой данных. Качественные данные — залог успешной модели.'
    )
  } else if (topPath === 'devops') {
    personalizedAdvice.push(
      'Ваши интересы лежат в области DevOps и автоматизации инфраструктуры. Освойте методологию Infrastructure as Code (IaC) с помощью Terraform, разберитесь в оркестрации Docker-контейнеров в Kubernetes и методах непрерывной интеграции (CI/CD).'
    )
  } else if (topPath === 'qa') {
    personalizedAdvice.push(
      'Вы проявляете интерес к тестированию ПО (QA). Автоматизация тестирования (например, с использованием Playwright или Selenium) сейчас крайне востребована на рынке и поможет вам вырасти в доходах в 1.5-2 раза по сравнению с ручным тестированием.'
    )
  } else {
    personalizedAdvice.push(
      'Ваш профиль сочетает в себе разносторонние интересы (Fullstack/Generalist). Это отличная позиция для стартапов, где ценятся универсальные инженеры. Постарайтесь выбрать один стержневой стек (например, Node.js + React), чтобы углубить знания перед выходом на рынок.'
    )
  }

  // 3. Next skill priorities
  if (topRecommendations.length > 0) {
    const primarySkill = topRecommendations[0].displayName
    personalizedAdvice.push(
      `Изучение навыка "${primarySkill}" является вашей приоритетной задачей №1. Он фигурирует в большинстве интересных вам вакансий и разблокирует доступ к новым предложениям работодателей.`
    )
  }

  // 4. Saved vs Applied ratio
  if (appliedVacancies.length > 0 && savedVacancies.length > 0) {
    personalizedAdvice.push(
      'Отличная активность! Вы сбалансированно отбираете вакансии в избранное и отправляете отклики. Это позволяет алгоритмам точнее подбирать рекомендации.'
    )
  } else if (appliedVacancies.length === 0 && savedVacancies.length > 0) {
    personalizedAdvice.push(
      'Вы сохранили несколько вакансий, но пока не отправили ни одного отклика. Не бойтесь откликаться, даже если ваш стек совпадает не на 100%. Работодатели часто готовы обучать перспективных кандидатов.'
    )
  }

  // Calculate Metrics
  let userSkillsHits = 0
  for (const vacancy of vacancies) {
    for (const s of vacancy.requiredSkills) {
      if (userSkillsSet.has(s)) userSkillsHits++
    }
  }
  const totalRequiredSkillsCount = vacancies.reduce((acc, v) => acc + v.requiredSkills.length, 0)
  const marketDemandScore = totalRequiredSkillsCount > 0
    ? Math.round(Math.min(100, Math.max(15, (userSkillsHits / totalRequiredSkillsCount) * 100 + 20)))
    : 50

  const matchRates = vacancies.map(v => calculateMatchScore(v.requiredSkills, userSkillsSet))
  const avgMatch = matchRates.length > 0 ? (matchRates.reduce((a, b) => a + b, 0) / matchRates.length) * 100 : 0
  const skillMatchPercentage = Math.round(avgMatch)

  const activeOpportunitiesCount = vacancies.filter(v => calculateMatchScore(v.requiredSkills, userSkillsSet) >= 0.5).length

  const top3Skills = topRecommendations.slice(0, 3).map(r => r.skill)
  const upgradedSkills = new Set([...userSkills, ...top3Skills])
  const currentMatchAvg = vacancies.reduce((sum, v) => sum + calculateMatchScore(v.requiredSkills, userSkillsSet), 0) / (vacancies.length || 1)
  const potentialMatchAvg = vacancies.reduce((sum, v) => sum + calculateMatchScore(v.requiredSkills, upgradedSkills), 0) / (vacancies.length || 1)
  const growthPotential = Math.round(Math.max(0, (potentialMatchAvg - currentMatchAvg) * 100))

  // Improvement proposals
  const improvementProposals = []

  // Aspect 1: Language
  const hasTs = userSkillsSet.has('typescript')
  const hasJs = userSkillsSet.has('javascript')
  const hasPython = userSkillsSet.has('python')
  
  if (hasTs) {
    improvementProposals.push({
      aspect: 'Программирование и стандарты кода',
      currentStatus: 'В резюме указан TypeScript — отличный стандарт для современной разработки.',
      recommendation: 'Изучите продвинутые возможности типов (Generics, Utility Types, Decorators) и архитектурные паттерны SOLID.',
      resources: ['Продвинутый TypeScript', 'Паттерны проектирования ПО', 'Чистый код (Refactoring)'],
    })
  } else if (hasJs) {
    improvementProposals.push({
      aspect: 'Программирование и стандарты кода',
      currentStatus: 'Вы владеете JavaScript, но современные проекты требуют строгой типизации.',
      recommendation: 'Перейдите на TypeScript. Это сократит количество ошибок на 15% и повысит привлекательность резюме для крупных компаний.',
      resources: ['Основы TypeScript для JS-разработчиков', 'Асинхронный JavaScript (ES6+)', 'Архитектура веб-приложений'],
    })
  } else if (hasPython) {
    improvementProposals.push({
      aspect: 'Программирование и стандарты кода',
      currentStatus: 'Вы владеете Python — отличным языком для бэкенда и анализа данных.',
      recommendation: 'Углубитесь в асинхронное программирование (asyncio) и типизацию данных с помощью pydantic и type hints.',
      resources: ['Асинхронный Python', 'Веб-разработка с FastAPI', 'Статическая типизация в Python'],
    })
  } else {
    improvementProposals.push({
      aspect: 'Программирование и стандарты кода',
      currentStatus: 'В резюме не обнаружены популярные языки программирования (JS, Python, TS, Java).',
      recommendation: 'Определите целевое направление и начните изучение базового языка: JavaScript (для веб-интерфейсов) или Python (для бэкенда/данных).',
      resources: ['Курс "JavaScript с нуля"', 'Основы программирования на Python', 'Алгоритмы и структуры данных'],
    })
  }

  // Aspect 2: Databases
  const hasSql = userSkillsSet.has('sql') || userSkillsSet.has('postgresql') || userSkillsSet.has('mysql')
  const hasNoSql = userSkillsSet.has('mongodb') || userSkillsSet.has('redis')
  
  if (hasSql && hasNoSql) {
    improvementProposals.push({
      aspect: 'Работа с базами данных',
      currentStatus: 'Отличный профиль! Вы владеете как реляционными (SQL), так и NoSQL базами данных.',
      recommendation: 'Изучите вопросы оптимизации запросов, создания индексов, кэширования данных и масштабирования (репликация/шардирование).',
      resources: ['Оптимизация PostgreSQL', 'Кэширование с Redis', 'Проектирование высоконагруженных БД'],
    })
  } else if (hasSql) {
    improvementProposals.push({
      aspect: 'Работа с базами данных',
      currentStatus: 'У вас есть навыки работы с реляционными БД (SQL).',
      recommendation: 'Добавьте в стек NoSQL решение (например, MongoDB для документов или Redis для кэширования), так как гибридные хранилища используются в 80% проектов.',
      resources: ['Основы MongoDB для разработчиков', 'Использование Redis для кэширования', 'Проектирование схем данных'],
    })
  } else if (hasNoSql) {
    improvementProposals.push({
      aspect: 'Работа с базами данных',
      currentStatus: 'Вы работаете с NoSQL решениями.',
      recommendation: 'Изучите стандартный SQL (PostgreSQL/MySQL). Реляционная алгебра и транзакции (ACID) требуются практически на любом собеседовании.',
      resources: ['Интерактивный тренажер SQL', 'Основы реляционных БД', 'Транзакции и оконные функции'],
    })
  } else {
    improvementProposals.push({
      aspect: 'Работа с базами данных',
      currentStatus: 'В резюме отсутствуют навыки работы с базами данных.',
      recommendation: 'Изучите основы SQL. Умение писать простые SELECT/INSERT/JOIN запросы — обязательный минимум для IT-специалиста.',
      resources: ['Интерактивный курс SQL', 'Введение в базы данных', 'Связи таблиц и нормализация'],
    })
  }

  // Aspect 3: Infrastructure
  const hasDocker = userSkillsSet.has('docker')
  const hasK8s = userSkillsSet.has('kubernetes')
  
  if (hasK8s) {
    improvementProposals.push({
      aspect: 'Инфраструктура и развертывание',
      currentStatus: 'Вы владеете сложной оркестрацией контейнеров (Kubernetes).',
      recommendation: 'Изучите инструменты GitOps (ArgoCD), шаблонизаторы Helm и облачные провайдеры (AWS/GCP) для построения отказоустойчивых систем.',
      resources: ['Продвинутый Kubernetes', 'DevOps практики с ArgoCD', 'Облачная архитектура AWS'],
    })
  } else if (hasDocker) {
    improvementProposals.push({
      aspect: 'Инфраструктура и развертывание',
      currentStatus: 'Вы умеете контейнеризировать приложения с помощью Docker.',
      recommendation: 'Освойте основы Docker Compose для локальной разработки и познакомьтесь с Kubernetes для понимания промышленного деплоя.',
      resources: ['Оркестрация с Docker Compose', 'Kubernetes для разработчиков', 'Настройка CI/CD пайплайнов'],
    })
  } else {
    improvementProposals.push({
      aspect: 'Инфраструктура и развертывание',
      currentStatus: 'В резюме нет навыков контейнеризации (Docker).',
      recommendation: 'Изучите основы Docker. Умение упаковать приложение в контейнер требуется в 90% современных вакансий.',
      resources: ['Docker для начинающих разработчиков', 'Создание Dockerfile', 'Деплой контейнеров'],
    })
  }

  // Aspect 4: Testing & Culture
  const hasTesting = userSkillsSet.has('jest') || userSkillsSet.has('cypress') || userSkillsSet.has('pytest') || userSkillsSet.has('playwright') || userSkillsSet.has('selenium')
  
  if (hasTesting) {
    improvementProposals.push({
      aspect: 'Инженерная культура и тестирование',
      currentStatus: 'У вас есть опыт написания тестов — это показатель зрелости инженера.',
      recommendation: 'Внедрите методологию TDD (Test-Driven Development) в свои пет-проекты и разберитесь с интеграционным E2E тестированием.',
      resources: ['Методология TDD на практике', 'Сквозное тестирование с Cypress/Playwright', 'Настройка тестового покрытия'],
    })
  } else {
    improvementProposals.push({
      aspect: 'Инженерная культура и тестирование',
      currentStatus: 'Навыки автоматического тестирования не указаны.',
      recommendation: 'Изучите написание базовых Unit-тестов (например, Jest для JS или PyTest для Python). Наличие тестов в пет-проектах повышает шансы на оффер на 40%.',
      resources: ['Введение в Unit-тестирование', 'Основы Jest/PyTest', 'Как писать тестируемый код'],
    })
  }

  const individualProgram: IndividualProgram = {
    personalizedAdvice,
    metrics: {
      marketDemandScore,
      skillMatchPercentage,
      activeOpportunitiesCount,
      growthPotential,
    },
    improvementProposals,
  }

  return {
    analysisTimestamp: new Date(),
    sourceStats: {
      savedVacancies: savedVacancies.length,
      appliedVacancies: appliedVacancies.length,
      marketVacancies: marketVacancies.length,
    },
    currentSkills: {
      total: userSkills.length,
      byCategory: categorizeSkills(userSkills),
      displayNames: userSkills.reduce<Record<string, string>>((acc, skill) => {
        acc[skill] = getSkillDisplayName(skill)
        return acc
      }, {}),
    },
    currentProfile: {
      suitableDirections,
    },
    userLevel: assessUserLevel(userSkills),
    topRecommendations,
    learningPath,
    careerDirections,
    nextSteps,
    individualProgram,
  }
}

/**
 * Format recommendation for display.
 */
export function formatRecommendationForDisplay(rec: SkillRecommendation): string {
  const parts: string[] = []
  parts.push(`Learn ${rec.displayName}`)

  if (rec.prerequisitesUserLacks.length > 0) {
    parts.push(`(requires: ${rec.prerequisitesUserLacks.map(getSkillDisplayName).join(', ')})`)
  }

  parts.push(`- ${rec.frequency} jobs need this, ~${rec.wouldUnlockJobs.length} become accessible`)

  return parts.join(' ')
}
