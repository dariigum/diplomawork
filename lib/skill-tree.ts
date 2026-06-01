/**
 * Skill tree definitions and learning paths.
 * Maps skills to prerequisites, job roles, and learning paths.
 */

export type SkillPath = 'frontend' | 'backend' | 'fullstack' | 'devops' | 'datascience' | 'qa'

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced'

/**
 * Defines prerequisites and unlocks for each skill.
 */
export const SKILL_TREES: Record<string, {
  path: SkillPath[]
  prerequisites: string[]
  unlocks: string[] // Jobs that become available with this skill
  level: SkillLevel
  description: string
}> = {
  // Frontend Path
  html: {
    path: ['frontend'],
    prerequisites: [],
    unlocks: [],
    level: 'beginner',
    description: 'Basic HTML markup - foundation of web development',
  },
  css: {
    path: ['frontend'],
    prerequisites: ['html'],
    unlocks: [],
    level: 'beginner',
    description: 'Styling and layout for web pages',
  },
  javascript: {
    path: ['frontend', 'backend', 'fullstack'],
    prerequisites: ['html', 'css'],
    unlocks: ['react', 'vue', 'angular', 'nextjs'],
    level: 'intermediate',
    description: 'Core programming language for web development',
  },
  typescript: {
    path: ['frontend', 'backend', 'fullstack'],
    prerequisites: ['javascript'],
    unlocks: [],
    level: 'intermediate',
    description: 'Type-safe JavaScript superset',
  },
  react: {
    path: ['frontend', 'fullstack'],
    prerequisites: ['javascript', 'html', 'css'],
    unlocks: ['nextjs'],
    level: 'intermediate',
    description: 'Popular React library for building UIs',
  },
  nextjs: {
    path: ['frontend', 'fullstack'],
    prerequisites: ['react'],
    unlocks: [],
    level: 'advanced',
    description: 'React framework with SSR and static generation',
  },
  vue: {
    path: ['frontend', 'fullstack'],
    prerequisites: ['javascript', 'html', 'css'],
    unlocks: ['nuxt'],
    level: 'intermediate',
    description: 'Progressive JavaScript framework',
  },
  nuxt: {
    path: ['frontend', 'fullstack'],
    prerequisites: ['vue'],
    unlocks: [],
    level: 'advanced',
    description: 'Vue framework with SSR capabilities',
  },
  angular: {
    path: ['frontend', 'fullstack'],
    prerequisites: ['typescript', 'javascript'],
    unlocks: [],
    level: 'advanced',
    description: 'Full-featured Angular framework',
  },
  tailwind: {
    path: ['frontend', 'fullstack'],
    prerequisites: ['css'],
    unlocks: [],
    level: 'beginner',
    description: 'Utility-first CSS framework',
  },

  // Backend Path
  nodejs: {
    path: ['backend', 'fullstack'],
    prerequisites: ['javascript'],
    unlocks: ['express', 'nextjs'],
    level: 'intermediate',
    description: 'JavaScript runtime for server-side development',
  },
  express: {
    path: ['backend', 'fullstack'],
    prerequisites: ['nodejs', 'javascript'],
    unlocks: [],
    level: 'intermediate',
    description: 'Lightweight Node.js web framework',
  },
  python: {
    path: ['backend', 'datascience'],
    prerequisites: [],
    unlocks: ['django', 'flask', 'fastapi', 'numpy', 'pandas'],
    level: 'beginner',
    description: 'Versatile programming language',
  },
  django: {
    path: ['backend', 'fullstack'],
    prerequisites: ['python'],
    unlocks: [],
    level: 'intermediate',
    description: 'Full-featured Python web framework',
  },
  flask: {
    path: ['backend', 'fullstack'],
    prerequisites: ['python'],
    unlocks: [],
    level: 'beginner',
    description: 'Lightweight Python web framework',
  },
  fastapi: {
    path: ['backend', 'fullstack'],
    prerequisites: ['python'],
    unlocks: [],
    level: 'intermediate',
    description: 'Modern, fast Python API framework',
  },
  java: {
    path: ['backend', 'fullstack'],
    prerequisites: [],
    unlocks: ['spring'],
    level: 'intermediate',
    description: 'Enterprise-grade programming language',
  },
  spring: {
    path: ['backend', 'fullstack'],
    prerequisites: ['java'],
    unlocks: [],
    level: 'advanced',
    description: 'Comprehensive Spring framework for Java',
  },
  csharp: {
    path: ['backend', 'fullstack'],
    prerequisites: [],
    unlocks: ['aspnet'],
    level: 'intermediate',
    description: 'Microsoft C# programming language',
  },
  aspnet: {
    path: ['backend', 'fullstack'],
    prerequisites: ['csharp'],
    unlocks: [],
    level: 'intermediate',
    description: '.NET framework for building web applications',
  },
  go: {
    path: ['backend', 'devops'],
    prerequisites: [],
    unlocks: [],
    level: 'intermediate',
    description: 'Efficient systems programming language',
  },
  rust: {
    path: ['backend', 'devops'],
    prerequisites: [],
    unlocks: [],
    level: 'advanced',
    description: 'Systems language with memory safety',
  },
  php: {
    path: ['backend', 'fullstack'],
    prerequisites: [],
    unlocks: ['laravel'],
    level: 'beginner',
    description: 'Widely-used server-side scripting language',
  },
  laravel: {
    path: ['backend', 'fullstack'],
    prerequisites: ['php'],
    unlocks: [],
    level: 'intermediate',
    description: 'Elegant PHP web framework',
  },

  // Database Path
  sql: {
    path: ['backend', 'fullstack', 'datascience'],
    prerequisites: [],
    unlocks: ['postgresql', 'mysql'],
    level: 'intermediate',
    description: 'Relational database fundamentals',
  },
  postgresql: {
    path: ['backend', 'fullstack'],
    prerequisites: ['sql'],
    unlocks: [],
    level: 'intermediate',
    description: 'Advanced open-source SQL database',
  },
  mysql: {
    path: ['backend', 'fullstack'],
    prerequisites: ['sql'],
    unlocks: [],
    level: 'beginner',
    description: 'Popular open-source relational database',
  },
  mongodb: {
    path: ['backend', 'fullstack'],
    prerequisites: [],
    unlocks: [],
    level: 'intermediate',
    description: 'NoSQL document database',
  },
  redis: {
    path: ['backend', 'fullstack', 'devops'],
    prerequisites: [],
    unlocks: [],
    level: 'advanced',
    description: 'In-memory data structure store',
  },

  // DevOps Path
  docker: {
    path: ['devops', 'backend', 'fullstack'],
    prerequisites: [],
    unlocks: ['kubernetes'],
    level: 'intermediate',
    description: 'Container platform for deployment',
  },
  kubernetes: {
    path: ['devops', 'backend'],
    prerequisites: ['docker'],
    unlocks: [],
    level: 'advanced',
    description: 'Container orchestration system',
  },
  terraform: {
    path: ['devops'],
    prerequisites: [],
    unlocks: [],
    level: 'advanced',
    description: 'Infrastructure-as-code provisioning tool',
  },
  aws: {
    path: ['devops', 'backend', 'fullstack'],
    prerequisites: [],
    unlocks: ['docker'],
    level: 'intermediate',
    description: 'Amazon Web Services cloud platform',
  },
  gcp: {
    path: ['devops', 'backend'],
    prerequisites: [],
    unlocks: [],
    level: 'intermediate',
    description: 'Google Cloud Platform services',
  },
  azure: {
    path: ['devops', 'backend'],
    prerequisites: [],
    unlocks: [],
    level: 'intermediate',
    description: 'Microsoft Azure cloud services',
  },

  // Testing Path
  jest: {
    path: ['frontend', 'fullstack'],
    prerequisites: ['javascript'],
    unlocks: [],
    level: 'intermediate',
    description: 'JavaScript testing framework',
  },
  cypress: {
    path: ['frontend', 'fullstack'],
    prerequisites: ['javascript'],
    unlocks: [],
    level: 'intermediate',
    description: 'End-to-end testing framework',
  },
  pytest: {
    path: ['backend', 'datascience'],
    prerequisites: ['python'],
    unlocks: [],
    level: 'intermediate',
    description: 'Python testing framework',
  },

  // Data Science Path
  numpy: {
    path: ['datascience'],
    prerequisites: ['python'],
    unlocks: ['pandas'],
    level: 'intermediate',
    description: 'Numerical computing library',
  },
  pandas: {
    path: ['datascience'],
    prerequisites: ['python', 'numpy'],
    unlocks: [],
    level: 'intermediate',
    description: 'Data manipulation and analysis library',
  },
  sklearn: {
    path: ['datascience'],
    prerequisites: ['python', 'numpy', 'pandas'],
    unlocks: [],
    level: 'advanced',
    description: 'Machine learning library',
  },
  tensorflow: {
    path: ['datascience'],
    prerequisites: ['python', 'numpy'],
    unlocks: [],
    level: 'advanced',
    description: 'Deep learning framework',
  },
  pytorch: {
    path: ['datascience'],
    prerequisites: ['python', 'numpy'],
    unlocks: [],
    level: 'advanced',
    description: 'Deep learning framework',
  },

  // QA Path
  selenium: {
    path: ['qa'],
    prerequisites: [],
    unlocks: [],
    level: 'intermediate',
    description: 'Web automation testing tool',
  },
  playwright: {
    path: ['qa'],
    prerequisites: [],
    unlocks: [],
    level: 'intermediate',
    description: 'Modern browser automation tool',
  },
}

/**
 * Get all skills needed for a specific path.
 */
export function getSkillsForPath(path: SkillPath): string[] {
  return Object.entries(SKILL_TREES)
    .filter(([_key, tree]) => tree.path.includes(path))
    .map(([key]) => key)
}

/**
 * Calculate skill prerequisites (returns null if no prerequisites).
 */
export function getSkillPrerequisites(skill: string): string[] {
  return SKILL_TREES[skill]?.prerequisites ?? []
}

/**
 * Get skills that unlock by learning this skill.
 */
export function getSkillUnlocks(skill: string): string[] {
  return SKILL_TREES[skill]?.unlocks ?? []
}

/**
 * Check if a skill has prerequisites that aren't met.
 */
export function getMissingPrerequisites(skill: string, userSkills: string[]): string[] {
  const prerequisites = getSkillPrerequisites(skill)
  return prerequisites.filter((prereq) => !userSkills.includes(prereq))
}

/**
 * Suggest next skill to learn based on current skills and target path.
 * Returns skills ordered by priority (prerequisites first, then most unlocks).
 */
export function suggestNextSkills(userSkills: string[], targetPath: SkillPath, limit = 5): string[] {
  const pathSkills = getSkillsForPath(targetPath)
  const unlearned = pathSkills.filter((skill) => !userSkills.includes(skill))

  // Score each skill: lower is better
  const scored = unlearned.map((skill) => {
    const missingPrereqs = getMissingPrerequisites(skill, userSkills)
    const unlocks = getSkillUnlocks(skill)

    // Prioritize: no missing prerequisites, then by unlocks count, then by level
    const tree = SKILL_TREES[skill]!
    const levelScore = { beginner: 0, intermediate: 1, advanced: 2 }[tree.level]

    return {
      skill,
      score: missingPrereqs.length * 100 - unlocks.length * 10 + levelScore,
      missingPrereqs,
      unlocks,
    }
  })

  return scored.sort((a, b) => a.score - b.score).slice(0, limit).map((x) => x.skill)
}
