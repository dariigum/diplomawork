/** Evaluation cohort — tagged users @eval.jobflow.local (safe cleanup, separate from demo). */

export const EVAL_EMAIL_DOMAIN = 'eval.jobflow.local'

export const EVAL_EMPLOYER_EMAIL = `eval-employer@${EVAL_EMAIL_DOMAIN}`

/** Override via JOBFLOW_EVAL_COHORT_PASSWORD in .env when seeding. */
export const DEFAULT_EVAL_COHORT_PASSWORD = 'EvalCohort!2026'

export const TARGET_EVAL_USER_COUNT = 50

export type EvalTrack =
  | 'frontend'
  | 'backend'
  | 'mobile'
  | 'qa'
  | 'devops'
  | 'datascience'
  | 'aiml'

export const EVAL_TRACKS: EvalTrack[] = [
  'frontend',
  'backend',
  'mobile',
  'qa',
  'devops',
  'datascience',
  'aiml',
]

/** Even distribution → 50 users (8+8+7+7+7+7+6). */
export const EVAL_USERS_PER_TRACK: Record<EvalTrack, number> = {
  frontend: 8,
  backend: 8,
  mobile: 7,
  qa: 7,
  devops: 7,
  datascience: 7,
  aiml: 6,
}

export type EvalResumeSeed = {
  title: string
  skills: string
  experience: string
  education: string
}

export type EvalEmployeeFixture = {
  key: string
  email: string
  name: string
  track: EvalTrack
  /** 1-based slot within track (used for GT rotation in interactions). */
  slot: number
  resume: EvalResumeSeed
}

const FIRST_NAMES = [
  'Aida',
  'Timur',
  'Dana',
  'Arman',
  'Zhuldyz',
  'Nursultan',
  'Madina',
  'Erlan',
  'Serik',
  'Aigerim',
  'Bolat',
  'Saltanat',
  'Yerlan',
  'Amina',
  'Askar',
  'Karina',
  'Ruslan',
  'Aliya',
  'Bekzat',
  'Dinara',
  'Marat',
  'Gulnara',
  'Sanzhar',
  'Tomiris',
  'Adilet',
  'Symbat',
  'Nurlan',
  'Aizhan',
  'Kuanysh',
  'Malika',
  'Yerbol',
  'Aruzhan',
  'Daniyar',
  'Zarina',
  'Madi',
  'Inkar',
  'Berik',
  'Aray',
  'Sholpan',
  'Talgat',
  'Kamila',
  'Miras',
  'Saule',
  'Nurbol',
  'Asem',
  'Rustem',
  'Zhansaya',
  'Alibek',
  'Meruert',
  'Baurzhan',
]

const LAST_NAMES = [
  'Nurpeisova',
  'Kassymov',
  'Suleimenova',
  'Zhaksylykov',
  'Omarova',
  'Beketov',
  'Tleubayeva',
  'Musrepov',
  'Bolatov',
  'Saparova',
  'Nurgaliyev',
  'Kudaibergen',
  'Akhmetov',
  'Zhumagulova',
  'Iskakov',
  'Tursynova',
  'Mukanov',
  'Ospanova',
  'Sadykov',
  'Amangeldiyeva',
]

const EDUCATIONS = [
  'BS Computer Science, Nazarbayev University',
  'BSc Software Engineering, Satbayev University',
  'MS Applied Mathematics & CS, KBTU',
  'BSc Information Systems, ENU',
  'BSc Computer Engineering, SDU',
  'BSc Software Engineering, IITU',
  'BSc Information Technology, KazNU',
  'BSc Computer Science, KIMEP',
  'MS Computer Science, KBTU',
  'MS Data Science, NU',
  'MS Machine Learning, IITU',
]

const TRACK_RESUME_TEMPLATES: Record<
  EvalTrack,
  { titlePrefixes: string[]; skillPool: string[]; focusAreas: string[] }
> = {
  frontend: {
    titlePrefixes: ['Frontend Engineer', 'React Developer', 'UI Engineer', 'Web Developer'],
    skillPool: [
      'React',
      'TypeScript',
      'Next.js',
      'Redux Toolkit',
      'TanStack Query',
      'TailwindCSS',
      'Vitest',
      'Storybook',
      'HTML5',
      'CSS',
      'accessibility',
      'Web Vitals',
      'Zod',
      'React Hook Form',
    ],
    focusAreas: [
      'design-system-driven SPAs',
      'job-discovery UX',
      'dashboard performance',
      'i18n-ready layouts',
      'component libraries',
    ],
  },
  backend: {
    titlePrefixes: ['Backend Engineer', 'API Developer', 'Platform Engineer', 'Integration Engineer'],
    skillPool: [
      'Node.js',
      'TypeScript',
      'MongoDB',
      'Mongoose',
      'Go',
      'gRPC',
      'REST',
      'OpenAPI',
      'JWT',
      'Redis',
      'PostgreSQL',
      'Docker',
      'async jobs',
      'observability',
    ],
    focusAreas: [
      'auth and vacancy APIs',
      'ingestion pipelines',
      'embedding microservices',
      'idempotent upserts',
      'rate limiting',
    ],
  },
  mobile: {
    titlePrefixes: ['Mobile Engineer', 'Flutter Developer', 'iOS/Android Developer', 'Mobile Product Engineer'],
    skillPool: [
      'Flutter',
      'Dart',
      'Swift',
      'Kotlin',
      'Firebase',
      'push notifications',
      'deep links',
      'REST',
      'platform channels',
      'Jetpack Compose',
      'SwiftUI',
      'mobile CI',
    ],
    focusAreas: [
      'cross-platform candidate apps',
      'offline-friendly vacancy cards',
      'secure auth flows',
      'App Store releases',
      'recruitment marketplace features',
    ],
  },
  qa: {
    titlePrefixes: ['QA Engineer', 'Test Automation Engineer', 'Quality Analyst', 'SDET'],
    skillPool: [
      'Playwright',
      'Cypress',
      'Postman',
      'test plans',
      'regression suites',
      'API contract tests',
      'CI pipelines',
      'Jira',
      'Allure',
      'load testing',
      'TypeScript',
      'manual testing',
    ],
    focusAreas: [
      'hiring workflow validation',
      'recommendation smoke paths',
      'dashboard regression',
      'search quality checks',
      'release gates',
    ],
  },
  devops: {
    titlePrefixes: ['DevOps Engineer', 'Platform Engineer', 'SRE', 'Infrastructure Engineer'],
    skillPool: [
      'Docker',
      'Kubernetes',
      'Helm',
      'GitHub Actions',
      'Terraform',
      'Prometheus',
      'Grafana',
      'Linux',
      'Bash',
      'MongoDB backups',
      'CI/CD',
      'runbooks',
    ],
    focusAreas: [
      'Next.js + ML sidecar deploys',
      'secrets rotation',
      'incident response',
      'uptime SLOs',
      'progressive delivery',
    ],
  },
  datascience: {
    titlePrefixes: ['Data Scientist', 'Analytics Engineer', 'Product Analyst', 'Research Analyst'],
    skillPool: [
      'Python',
      'pandas',
      'SQL',
      'scikit-learn',
      'A/B testing',
      'statistical inference',
      'dashboards',
      'cohort analysis',
      'experiment design',
      'visualization',
      'notebooks',
    ],
    focusAreas: [
      'funnel metrics',
      'search quality experiments',
      'offline precision/recall reports',
      'KPI definitions',
      'embedding coverage monitoring',
    ],
  },
  aiml: {
    titlePrefixes: ['ML Engineer', 'NLP Engineer', 'Applied Scientist', 'ML Platform Engineer'],
    skillPool: [
      'Python',
      'PyTorch',
      'transformers',
      'sentence embeddings',
      'FastAPI',
      'vector search',
      'ONNX',
      'MLflow',
      'cosine similarity',
      'hybrid retrieval',
      'REST microservices',
      'notebooks',
    ],
    focusAreas: [
      'vacancy/resume matching',
      'embedding inference SLOs',
      'offline eval harnesses',
      'ranking experiments',
      'LLM guardrails for recruiters',
    ],
  },
}

const SENIORITY_BY_SLOT_MOD: Record<number, string> = {
  0: 'Junior',
  1: 'Middle',
  2: 'Senior',
}

function evalEmail(key: string): string {
  return `eval-${key}@${EVAL_EMAIL_DOMAIN}`
}

function pickFrom<T>(arr: T[], index: number): T {
  return arr[index % arr.length]!
}

function buildSkills(track: EvalTrack, slot: number): string {
  const pool = TRACK_RESUME_TEMPLATES[track].skillPool
  const count = 6 + (slot % 3)
  const picked: string[] = []
  for (let i = 0; i < count; i++) {
    const skill = pickFrom(pool, slot + i * 2)
    if (!picked.includes(skill)) picked.push(skill)
  }
  return picked.join(', ')
}

function buildResume(track: EvalTrack, slot: number): EvalResumeSeed {
  const tpl = TRACK_RESUME_TEMPLATES[track]
  const seniority = SENIORITY_BY_SLOT_MOD[slot % 3]!
  const titleBase = pickFrom(tpl.titlePrefixes, slot)
  const years = 2 + (slot % 5) + (seniority === 'Senior' ? 2 : seniority === 'Middle' ? 1 : 0)
  const focus = pickFrom(tpl.focusAreas, slot + 1)

  return {
    title: `${seniority} ${titleBase}`,
    skills: buildSkills(track, slot),
    experience: `${years} years focused on ${focus}; shipped production features with code review and measurable quality outcomes.`,
    education: pickFrom(EDUCATIONS, slot + track.length),
  }
}

/** Deterministic 50 eval employees across seven tracks. */
export function generateEvalEmployeeFixtures(): EvalEmployeeFixture[] {
  const out: EvalEmployeeFixture[] = []
  let nameIdx = 0

  for (const track of EVAL_TRACKS) {
    const count = EVAL_USERS_PER_TRACK[track]
    for (let slot = 1; slot <= count; slot++) {
      const key = `${track}-${String(slot).padStart(2, '0')}`
      const first = pickFrom(FIRST_NAMES, nameIdx)
      const last = pickFrom(LAST_NAMES, nameIdx + 7)
      nameIdx += 1

      out.push({
        key,
        email: evalEmail(key),
        name: `${first} ${last}`,
        track,
        slot,
        resume: buildResume(track, slot),
      })
    }
  }

  return out
}

export const EVAL_EMPLOYEE_FIXTURES: EvalEmployeeFixture[] = generateEvalEmployeeFixtures()
