import type { EvalTrack } from './eval-cohort-fixtures'
import { EVAL_TRACKS } from './eval-cohort-fixtures'

export const VACANCIES_PER_TRACK = 15

export const TARGET_EVAL_VACANCY_COUNT = VACANCIES_PER_TRACK * EVAL_TRACKS.length

export type EvalVacancySeed = {
  externalId: string
  track: EvalTrack
  title: string
  description: string
  skillsRequired: string
  salaryMin: number
  salaryMax: number
  experience: string
  employmentType: string
  workMode: 'REMOTE' | 'ONSITE'
  country: string
  city: string
  address: string
  requirements: string[]
  responsibilities: string[]
}

type VacancyTemplate = {
  roleTitles: string[]
  descriptionIntros: string[]
  skillSets: string[]
  salaryBands: Array<{ min: number; max: number }>
}

const TRACK_VACANCY_TEMPLATES: Record<EvalTrack, VacancyTemplate> = {
  frontend: {
    roleTitles: [
      'React UI Engineer',
      'Frontend Developer — Design System',
      'Senior React Engineer — Dashboards',
      'Next.js Product Engineer',
      'Accessibility-focused UI Engineer',
      'Frontend Engineer — Job Discovery',
      'Web Performance Engineer',
      'TypeScript Frontend Developer',
      'Component Library Engineer',
      'SSR/SSG Frontend Specialist',
      'Frontend Engineer — Forms & Validation',
      'Product Frontend Engineer',
      'React Native Web Hybrid Engineer',
      'Frontend Engineer — Analytics Widgets',
      'Staff Frontend Engineer',
    ],
    descriptionIntros: [
      'Build accessible, responsive interfaces for a recruitment SaaS platform.',
      'Own job-search filters, saved vacancies, and recommendation surfaces.',
      'Collaborate with UX on design tokens and Storybook documentation.',
      'Improve Core Web Vitals and bundle budgets on candidate dashboards.',
    ],
    skillSets: [
      'React, TypeScript, Next.js, TailwindCSS, Storybook',
      'React, TypeScript, TanStack Query, Vitest, Web Vitals',
      'Next.js, React, TypeScript, Zod, React Hook Form',
      'React, HTML5, CSS, accessibility, axe-core, Playwright',
      'React, TypeScript, Figma handoff, REST APIs, Jest',
      'React, Redux Toolkit, CSS Modules, RTL testing, i18n',
    ],
    salaryBands: [
      { min: 2200, max: 4800 },
      { min: 2500, max: 5400 },
      { min: 2800, max: 6000 },
      { min: 3000, max: 6200 },
    ],
  },
  backend: {
    roleTitles: [
      'Node.js Backend Engineer',
      'API Engineer — Vacancy Platform',
      'Senior Backend Developer — Ingestion',
      'Go Microservices Engineer',
      'Platform Backend Engineer',
      'Python Integration Engineer',
      'Backend Engineer — Auth & Sessions',
      'REST API Engineer',
      'Backend Engineer — Search Services',
      'Data Layer Engineer — MongoDB',
      'Backend Engineer — Webhooks',
      'Contract-first API Developer',
      'Backend Engineer — Rate Limiting',
      'Observability-focused Backend Engineer',
      'Staff Backend Engineer',
    ],
    descriptionIntros: [
      'Maintain and evolve REST APIs for auth, vacancies, and recommendations.',
      'Build idempotent ingestion adapters with structured logging and retries.',
      'Ship secure multi-tenant employer APIs with pagination and indexing.',
      'Integrate ML embedding endpoints with defensive timeouts and fallbacks.',
    ],
    skillSets: [
      'Node.js, TypeScript, MongoDB, Express, OpenAPI, JWT',
      'Node.js, TypeScript, Mongoose, async jobs, structured logging',
      'Go, gRPC, MongoDB, OpenAPI, Docker, observability',
      'Python, FastAPI, pydantic, HTTP clients, MongoDB',
      'Node.js, PostgreSQL or MongoDB, API design, rate limiting',
      'Node.js, Redis, JWT, integration tests, OpenAPI',
    ],
    salaryBands: [
      { min: 2700, max: 5800 },
      { min: 2900, max: 6000 },
      { min: 3200, max: 6500 },
      { min: 3500, max: 7200 },
    ],
  },
  mobile: {
    roleTitles: [
      'Flutter Mobile Engineer',
      'Senior Mobile Developer',
      'React Native Engineer',
      'iOS Engineer — Candidate App',
      'Android Engineer — Job Alerts',
      'Mobile Engineer — Offline Mode',
      'Cross-platform Mobile Developer',
      'Mobile Engineer — Push Notifications',
      'Mobile QA Partner Engineer',
      'Mobile Engineer — Deep Links',
      'Kotlin/Swift Product Engineer',
      'Mobile Performance Engineer',
      'Mobile Engineer — Secure Auth',
      'Mobile Release Engineer',
      'Staff Mobile Engineer',
    ],
    descriptionIntros: [
      'Ship cross-platform apps for saved vacancies and application tracking.',
      'Integrate secure auth, push notifications, and marketing deep links.',
      'Collaborate with backend on REST contracts and resilient offline caches.',
      'Maintain CI for iOS/Android stores with crash analytics dashboards.',
    ],
    skillSets: [
      'Flutter, Dart, Firebase, REST, deep links',
      'Swift, Kotlin, mobile CI, REST, App Store processes',
      'React Native, TypeScript, Redux, mobile analytics',
      'Flutter, Dart, XCTest basics, Firebase Crashlytics',
      'Kotlin, Jetpack Compose, REST, Material Design',
      'Swift, SwiftUI, REST, push notifications',
    ],
    salaryBands: [
      { min: 2400, max: 5000 },
      { min: 2600, max: 5400 },
      { min: 3000, max: 6100 },
      { min: 2800, max: 5600 },
    ],
  },
  qa: {
    roleTitles: [
      'QA Engineer — Web Application',
      'QA Automation Engineer',
      'Senior QA — Release Quality',
      'QA Engineer — ML Product Surfaces',
      'SDET — API Contracts',
      'QA Engineer — Search & Ranking',
      'Manual QA — Hiring Funnels',
      'Playwright Automation Lead',
      'QA Engineer — Mobile Web',
      'Regression Test Engineer',
      'QA Analyst — Experimentation',
      'Quality Engineer — CI Gates',
      'QA Engineer — Accessibility',
      'Performance Test Engineer',
      'Staff QA Engineer',
    ],
    descriptionIntros: [
      'Validate hiring workflows, application forms, and recommendation ordering.',
      'Automate critical dashboard paths with Playwright and API contract tests.',
      'Own release checklists and exploratory testing for ingestion integrations.',
      'Partner with data team on offline metric fixtures and smoke harnesses.',
    ],
    skillSets: [
      'Playwright, test plans, bug triage, Jira, API testing with Postman',
      'Playwright, TypeScript, Cypress, GitHub Actions, Allure',
      'Manual QA, API tests, regression suites, risk-based testing',
      'QA methodology, SQL basics, Python scripts for fixtures, Jira',
      'Playwright, contract tests, CI pipelines, load testing basics',
      'Cypress, Postman, test documentation, agile ceremonies',
    ],
    salaryBands: [
      { min: 1800, max: 3800 },
      { min: 2000, max: 4200 },
      { min: 2200, max: 4500 },
      { min: 2400, max: 4800 },
    ],
  },
  devops: {
    roleTitles: [
      'DevOps Engineer — CI/CD',
      'Platform Engineer — Kubernetes',
      'SRE — Reliability & Incidents',
      'DevOps Engineer — Observability',
      'Infrastructure Engineer — Terraform',
      'Release Engineer — GitHub Actions',
      'DevOps Engineer — MongoDB Ops',
      'Container Platform Engineer',
      'DevOps Engineer — Secrets & IAM',
      'On-call SRE — API Gateway',
      'DevOps Engineer — Cost Optimization',
      'Build Engineer — Monorepo',
      'DevOps Engineer — ML Sidecar Deploy',
      'Backup & Restore Engineer',
      'Staff Platform Engineer',
    ],
    descriptionIntros: [
      'Harden multi-environment deploys for the web app and Python ML sidecar.',
      'Implement observability, runbooks, and incident drills for embedding services.',
      'Maintain Helm charts, progressive delivery, and secrets rotation patterns.',
      'Improve pipeline reliability with test splitting and cache hygiene.',
    ],
    skillSets: [
      'Docker, GitHub Actions, Linux, secrets management, MongoDB backups',
      'Kubernetes, Helm, Terraform basics, Prometheus, Bash',
      'SRE, Grafana, incident management, Kubernetes, CI/CD',
      'Prometheus, Loki, OpenTelemetry basics, Docker, GitHub Actions',
      'Kubernetes, Helm, Linux, Bash automation, runbooks',
      'Docker, CI/CD, MongoDB backups, monitoring, on-call',
    ],
    salaryBands: [
      { min: 2700, max: 5500 },
      { min: 3000, max: 6200 },
      { min: 3100, max: 6400 },
      { min: 2800, max: 5600 },
    ],
  },
  datascience: {
    roleTitles: [
      'Data Scientist — Product Funnels',
      'Analytics Engineer — Search Quality',
      'Data Analyst — BI & Reporting',
      'Research Data Scientist — Matching',
      'Experimentation Analyst',
      'Product Data Scientist',
      'SQL Analytics Engineer',
      'Cohort Analyst — Hiring',
      'Data Scientist — Embedding Coverage',
      'Metrics Engineer — KPIs',
      'Visualization Specialist',
      'Statistical Analyst — A/B Tests',
      'Data Scientist — Retention',
      'Forecasting Analyst',
      'Staff Data Scientist',
    ],
    descriptionIntros: [
      'Analyze hiring funnel metrics and support ranking experiments with clear reports.',
      'Define KPIs for semantic search and recommendation offline evaluation.',
      'Build weekly snapshots for stakeholders with reproducible notebooks.',
      'Prototype precision/recall harnesses and segment analyses for matching quality.',
    ],
    skillSets: [
      'Python, pandas, SQL, A/B testing, statistical inference, dashboards',
      'SQL, Python, experiment design, data visualization, stakeholder communication',
      'SQL, Excel, Python, BI tools, cohort analysis',
      'Python, scikit-learn, notebooks, precision recall, pandas',
      'Python, SQL, pandas, hypothesis testing, matplotlib',
      'SQL, dbt mindset, Python, metric definitions, dashboards',
    ],
    salaryBands: [
      { min: 2000, max: 4200 },
      { min: 2400, max: 5000 },
      { min: 2600, max: 5200 },
      { min: 2800, max: 5800 },
    ],
  },
  aiml: {
    roleTitles: [
      'ML Engineer — Dense Retrieval',
      'NLP Engineer — Vacancy Text',
      'Applied ML Engineer — Hybrid Ranking',
      'ML Platform Engineer — Inference',
      'Research Engineer — LLM Guardrails',
      'Embedding Service Engineer',
      'ML Engineer — Recommender Systems',
      'Scientist — Offline Evaluation',
      'ML Engineer — Vector Index Maintenance',
      'NLP Engineer — Multilingual Embeddings',
      'Applied Scientist — Behaviour Signals',
      'ML Engineer — Model Compression',
      'Data/ML Engineer — Feature Pipelines',
      'ML Engineer — Batch Inference',
      'Staff ML Engineer',
    ],
    descriptionIntros: [
      'Maintain embedding endpoints and vector compatibility for vacancy/resume pairs.',
      'Improve embedding text builders and offline ranking benchmarks.',
      'Blend semantic and behaviour signals with documented holdout methodology.',
      'Tune latency, batching, and error surfaces for real-time inference.',
    ],
    skillSets: [
      'Python, PyTorch, transformers, FastAPI, cosine similarity, MLflow',
      'Python, NLP, sentence-transformers, evaluation metrics, REST services',
      'Python, recommendation systems, behaviour features, offline eval, MongoDB',
      'Python, ONNX, FastAPI, Docker, monitoring, GPU basics',
      'Python, LLM APIs, pytest, JSON schema, safety evaluation',
      'Python, PyTorch, vector search, REST microservices, notebooks',
    ],
    salaryBands: [
      { min: 3300, max: 7000 },
      { min: 3500, max: 7400 },
      { min: 3600, max: 7500 },
      { min: 3700, max: 7800 },
    ],
  },
}

function padSlug(n: number): string {
  return String(n).padStart(3, '0')
}

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length]!
}

function buildVacancy(track: EvalTrack, index1Based: number): EvalVacancySeed {
  const tpl = TRACK_VACANCY_TEMPLATES[track]
  const slug = padSlug(index1Based)
  const i = index1Based - 1
  const title = tpl.roleTitles[i] ?? `${track} Specialist ${slug}`
  const intro = pick(tpl.descriptionIntros, i)
  const squad = pick(
    ['Product Squad', 'Platform Team', 'Search & Recommendations', 'Candidate Experience'],
    i + track.length,
  )
  const skillsRequired = pick(tpl.skillSets, i + index1Based)
  const band = pick(tpl.salaryBands, i)
  const workMode: 'REMOTE' | 'ONSITE' = i % 4 === 2 ? 'ONSITE' : 'REMOTE'
  const primarySkill = skillsRequired.split(',')[0]?.trim() ?? track

  return {
    externalId: `EVAL:${track}-${slug}`,
    track,
    title: `${title} (${squad})`,
    description: `${intro} Work with engineering and product in the ${squad} to deliver measurable outcomes for candidates and employers.`,
    skillsRequired,
    salaryMin: band.min + (i % 3) * 50,
    salaryMax: band.max + (i % 4) * 80,
    experience: i < 5 ? '1+ years' : i < 10 ? '2+ years' : '3+ years',
    employmentType: 'Full-time',
    workMode,
    country: workMode === 'ONSITE' ? 'Kazakhstan' : '',
    city: workMode === 'ONSITE' ? (i % 2 === 0 ? 'Almaty' : 'Astana') : '',
    address: workMode === 'ONSITE' ? 'Hybrid 2 days on-site' : 'Remote',
    requirements: [
      `Strong ${primarySkill} fundamentals`,
      'Clear communication in cross-functional teams',
      'Comfortable with code review and iterative delivery',
    ],
    responsibilities: [
      'Ship features with maintainable tests',
      'Participate in design and incident retrospectives',
      'Document trade-offs and operational notes',
    ],
  }
}

/** Deterministic 105 EVAL vacancies (15 per track). */
export function generateEvalVacancies(): EvalVacancySeed[] {
  const out: EvalVacancySeed[] = []
  for (const track of EVAL_TRACKS) {
    for (let n = 1; n <= VACANCIES_PER_TRACK; n++) {
      out.push(buildVacancy(track, n))
    }
  }
  return out
}

export const EVAL_COHORT_VACANCIES: EvalVacancySeed[] = generateEvalVacancies()

export function evalVacancyExternalId(track: EvalTrack, index1Based: number): string {
  return `EVAL:${track}-${padSlug(index1Based)}`
}

export function evalVacancyExternalIdsForTrack(track: EvalTrack): string[] {
  return Array.from({ length: VACANCIES_PER_TRACK }, (_, i) => evalVacancyExternalId(track, i + 1))
}
