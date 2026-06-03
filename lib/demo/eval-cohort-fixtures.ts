/** Evaluation cohort — tagged users @eval.jobflow.local (safe cleanup, separate from demo). */

export const EVAL_EMAIL_DOMAIN = 'eval.jobflow.local'

export const EVAL_EMPLOYER_EMAIL = `eval-employer@${EVAL_EMAIL_DOMAIN}`

/** Override via JOBFLOW_EVAL_COHORT_PASSWORD in .env when seeding. */
export const DEFAULT_EVAL_COHORT_PASSWORD = 'EvalCohort!2026'

export type EvalTrack =
  | 'frontend'
  | 'backend'
  | 'mobile'
  | 'qa'
  | 'devops'
  | 'datascience'
  | 'aiml'

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
  resume: EvalResumeSeed
}

function evalEmail(key: string): string {
  return `eval-${key}@${EVAL_EMAIL_DOMAIN}`
}

/** 14 EMPLOYEE profiles across seven tracks (12–15 requirement). */
export const EVAL_EMPLOYEE_FIXTURES: EvalEmployeeFixture[] = [
  {
    key: 'frontend-01',
    email: evalEmail('frontend-01'),
    name: 'Aida Nurpeisova',
    track: 'frontend',
    resume: {
      title: 'Senior Frontend Engineer (React)',
      skills:
        'React, TypeScript, Next.js, Redux Toolkit, TanStack Query, TailwindCSS, Vitest, accessibility, Core Web Vitals',
      experience:
        '6 years shipping design-system-driven SPAs and Next.js dashboards for B2B SaaS; led performance budgets and component libraries.',
      education: 'BS Computer Science, Nazarbayev University',
    },
  },
  {
    key: 'frontend-02',
    email: evalEmail('frontend-02'),
    name: 'Timur Kassymov',
    track: 'frontend',
    resume: {
      title: 'Frontend Developer — Product UI',
      skills:
        'React, JavaScript, CSS Modules, Figma handoff, React Hook Form, Zod, Storybook, Jest, RTL testing',
      experience:
        '4 years in product squads; owned job-search filters, saved-vacancy flows, and i18n-ready layouts.',
      education: 'BSc Software Engineering, Satbayev University',
    },
  },
  {
    key: 'backend-01',
    email: evalEmail('backend-01'),
    name: 'Dana Suleimenova',
    track: 'backend',
    resume: {
      title: 'Backend Engineer (Node.js / TypeScript)',
      skills:
        'Node.js, TypeScript, MongoDB, Mongoose, REST, OpenAPI, JWT, Redis, unit and integration testing',
      experience:
        '5 years building auth, vacancy CRUD, and recommendation APIs; integrated embedding microservices and rate limits.',
      education: 'MS Applied Mathematics & CS, KBTU',
    },
  },
  {
    key: 'backend-02',
    email: evalEmail('backend-02'),
    name: 'Arman Zhaksylykov',
    track: 'backend',
    resume: {
      title: 'Software Engineer — Go & Platform APIs',
      skills: 'Go, gRPC, PostgreSQL, MongoDB, Docker, OpenAPI, observability, idempotent ingestion patterns',
      experience:
        '4 years on high-throughput ingestion adapters and search backends; strong focus on schema validation and retries.',
      education: 'BSc Information Systems, ENU',
    },
  },
  {
    key: 'mobile-01',
    email: evalEmail('mobile-01'),
    name: 'Zhuldyz Omarova',
    track: 'mobile',
    resume: {
      title: 'Mobile Engineer (Flutter)',
      skills:
        'Flutter, Dart, Firebase, push notifications, deep links, REST, platform channels, CI for iOS/Android',
      experience:
        '5 years delivering cross-platform candidate apps with offline-friendly vacancy cards and secure auth.',
      education: 'BSc Computer Engineering, SDU',
    },
  },
  {
    key: 'mobile-02',
    email: evalEmail('mobile-02'),
    name: 'Nursultan Beketov',
    track: 'mobile',
    resume: {
      title: 'iOS & Android Developer',
      skills: 'Swift, Kotlin, Jetpack Compose, SwiftUI, REST, GraphQL basics, App Store release process',
      experience:
        '3 years maintaining native modules and shared networking layer for recruitment marketplace features.',
      education: 'BSc Software Engineering, IITU',
    },
  },
  {
    key: 'qa-01',
    email: evalEmail('qa-01'),
    name: 'Madina Tleubayeva',
    track: 'qa',
    resume: {
      title: 'QA Engineer — Web & API',
      skills:
        'Manual and automated testing, Playwright, Cypress, Postman, test plans, regression suites, bug triage, Jira',
      experience:
        '4 years validating hiring workflows, application forms, and recommendation smoke paths in agile teams.',
      education: 'BSc Information Technology, KazNU',
    },
  },
  {
    key: 'qa-02',
    email: evalEmail('qa-02'),
    name: 'Erlan Musrepov',
    track: 'qa',
    resume: {
      title: 'Senior QA Automation Engineer',
      skills: 'Playwright, TypeScript, API contract tests, CI pipelines, load testing basics, Allure reporting',
      experience:
        '6 years automating critical paths for dashboards and search; partnered with ML team on offline eval fixtures.',
      education: 'BSc Computer Science, KIMEP',
    },
  },
  {
    key: 'devops-01',
    email: evalEmail('devops-01'),
    name: 'Serik Bolatov',
    track: 'devops',
    resume: {
      title: 'DevOps / Platform Engineer',
      skills:
        'Docker, Kubernetes, Helm, GitHub Actions, Terraform basics, Prometheus, Linux, MongoDB backups, runbooks',
      experience:
        '5 years operating Next.js + Python ML sidecar stacks; improved deploy reliability and secrets rotation.',
      education: 'BSc Telecommunications, KazATU',
    },
  },
  {
    key: 'devops-02',
    email: evalEmail('devops-02'),
    name: 'Aigerim Saparova',
    track: 'devops',
    resume: {
      title: 'Site Reliability Engineer',
      skills: 'SRE practices, incident response, Grafana, Loki, Kubernetes, CI/CD, capacity planning, Bash automation',
      experience:
        '4 years on uptime SLOs for API gateways and embedding inference; documented rollback and restore drills.',
      education: 'MS Computer Science, KBTU',
    },
  },
  {
    key: 'datascience-01',
    email: evalEmail('datascience-01'),
    name: 'Bolat Nurgaliyev',
    track: 'datascience',
    resume: {
      title: 'Data Scientist — Product Analytics',
      skills: 'Python, pandas, scikit-learn, SQL, A/B testing, statistical inference, dashboards, experiment design',
      experience:
        '4 years analyzing funnel metrics and search quality; supported ranking experiments with offline precision/recall.',
      education: 'MS Data Science, NU',
    },
  },
  {
    key: 'datascience-02',
    email: evalEmail('datascience-02'),
    name: 'Saltanat Kudaibergen',
    track: 'datascience',
    resume: {
      title: 'Analytics Engineer',
      skills: 'SQL, dbt mindset, Python, visualization, cohort analysis, metric definitions, stakeholder communication',
      experience:
        '3 years building hiring funnel reports and embedding coverage monitors for ML platform stakeholders.',
      education: 'BSc Economics & Statistics, KBTU',
    },
  },
  {
    key: 'aiml-01',
    email: evalEmail('aiml-01'),
    name: 'Yerlan Akhmetov',
    track: 'aiml',
    resume: {
      title: 'ML Engineer — NLP & Embeddings',
      skills:
        'Python, PyTorch, transformers, sentence embeddings, FastAPI, vector search, MRR/nDCG evaluation, ONNX',
      experience:
        '5 years serving SBERT-style models for vacancy/resume matching and maintaining inference SLOs.',
      education: 'MS Machine Learning, IITU',
    },
  },
  {
    key: 'aiml-02',
    email: evalEmail('aiml-02'),
    name: 'Amina Zhumagulova',
    track: 'aiml',
    resume: {
      title: 'Applied Scientist — Recommendation Systems',
      skills:
        'Python, hybrid retrieval, cosine similarity, behaviour signals, offline eval harnesses, MLflow, notebooks',
      experience:
        '4 years prototyping semantic + behaviour blends and documenting holdout methodology for product teams.',
      education: 'PhD coursework AI, KazNU',
    },
  },
]
