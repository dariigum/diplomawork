/** Static demo data for seed:demo. Tagged users use @demo.jobflow.local for safe cleanup. */

export const DEMO_EMAIL_DOMAIN = 'demo.jobflow.local'

export const DEMO_EMPLOYER_EMAIL = `demo-employer@${DEMO_EMAIL_DOMAIN}`

export const DEMO_EMPLOYEE_EMAIL = `demo-job-seeker@${DEMO_EMAIL_DOMAIN}`

/** Default demo passwords — override via JOBFLOW_DEMO_EMPLOYER_PASSWORD / JOBFLOW_DEMO_EMPLOYEE_PASSWORD in .env when seeding */
export const DEFAULT_DEMO_EMPLOYER_PASSWORD = 'DemoEmployer!2026'
export const DEFAULT_DEMO_EMPLOYEE_PASSWORD = 'DemoSeeker!2026'

export type DemoVacancyFields = {
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

/** Vacancy payloads without employerId or embedding — filled by the seed script. */
export type DemoVacancySeed = Omit<
  DemoVacancyFields,
  'employerId' | 'embedding' | 'createdAt'
>

/** Optional demo resume aligned with Frontend/React paths for semantic matching checks. */
export const DEMO_RESUME_SEED = {
  title: 'Senior React Frontend Engineer',
  skills:
    'React, TypeScript, Next.js, Redux Toolkit, TanStack Query, TailwindCSS, Vitest, Web Vitals optimization',
  experience:
    '5 years building SPAs and Next.js SSR apps; owned design-system adoption and performance budgets.',
  education: 'BS Computer Science, Software Engineering focus',
}

export const DEMO_VACANCIES: DemoVacancySeed[] = [
  {
    title: 'Frontend Developer (React)',
    description:
      'Build accessible, responsive UIs and collaborate with UX on design systems for a SaaS recruitment product.',
    skillsRequired: 'React, TypeScript, HTML5, CSS, REST APIs',
    salaryMin: 2200,
    salaryMax: 4500,
    experience: '2+ years',
    employmentType: 'Full-time',
    workMode: 'REMOTE',
    country: '',
    city: '',
    address: 'Remote',
    requirements: [
      'Solid React fundamentals and hooks',
      'Comfortable profiling render cost and bundle size',
      'Experience integrating REST backends',
    ],
    responsibilities: [
      'Implement features from Figma specs',
      'Write unit/component tests',
      'Participate in code reviews',
      'Improve Core Web Vitals where applicable',
    ],
  },
  {
    title: 'Backend Developer (Node.js)',
    description:
      'Maintain and evolve APIs for our platform: auth, vacancy CRUD, and integration with embedding pipelines.',
    skillsRequired: 'Node.js, TypeScript, MongoDB, Express or Fastify, JWT, OpenAPI',
    salaryMin: 2500,
    salaryMax: 5200,
    experience: '3+ years',
    employmentType: 'Full-time',
    workMode: 'REMOTE',
    country: '',
    city: '',
    address: 'Remote',
    requirements: [
      'Experience with MongoDB and Mongoose or similar',
      'Secure REST design and pagination',
      'Familiarity with async job patterns',
    ],
    responsibilities: [
      'Implement and review API endpoints',
      'Optimize queries and indexing',
      'Coordinate with ML service contracts',
      'Write integration tests',
    ],
  },
  {
    title: 'React Engineer (Product Squad)',
    description:
      'Join a cross-functional squad shipping dashboard and job discovery UX with strong TypeScript hygiene.',
    skillsRequired: 'React, TypeScript, Next.js, TailwindCSS, React Hook Form, Zod',
    salaryMin: 2800,
    salaryMax: 5800,
    experience: '3+ years',
    employmentType: 'Full-time',
    workMode: 'ONSITE',
    country: 'Kazakhstan',
    city: 'Almaty',
    address: 'Almaty, hybrid 2 days',
    requirements: [
      'Next.js App Router or Pages experience',
      'Schema validation patterns (e.g. Zod)',
      'Accessibility basics (ARIA, focus management)',
    ],
    responsibilities: [
      'Own feature slices end-to-end in the web app',
      'Instrument pages for resilience and telemetry hooks',
      'Pair with backend on server actions/contracts',
    ],
  },
  {
    title: 'Python Developer (API Integrations)',
    description:
      'Develop Python microservices connecting external job sources and normalization pipelines.',
    skillsRequired: 'Python, FastAPI or Flask, pydantic, HTTP clients, asyncio',
    salaryMin: 2300,
    salaryMax: 4800,
    experience: '2+ years',
    employmentType: 'Full-time',
    workMode: 'REMOTE',
    country: '',
    city: '',
    address: 'Remote',
    requirements: [
      'Python 3.10+ typing discipline',
      'Experience with pydantic models',
      'Defensive parsing of third-party payloads',
    ],
    responsibilities: [
      'Ship and monitor integration endpoints',
      'Add retries, backoff, and structured logging',
      'Document payloads and failure modes',
    ],
  },
  {
    title: 'DevOps Engineer',
    description:
      'Operate CI/CD and container-based deployments for the web stack and ML sidecar.',
    skillsRequired: 'Docker, GitHub Actions, Linux, scripting, MongoDB backups',
    salaryMin: 2600,
    salaryMax: 5500,
    experience: '2+ years',
    employmentType: 'Full-time',
    workMode: 'REMOTE',
    country: '',
    city: '',
    address: 'Remote',
    requirements: [
      'Hands-on Dockerfile and compose experience',
      'Secrets handling awareness',
      'Basic observability (logs/metrics stubs)',
    ],
    responsibilities: [
      'Maintain build pipelines',
      'Support local dev ergonomics',
      'Document runbooks for deploy and rollback',
    ],
  },
  {
    title: 'Data Analyst (Product)',
    description:
      'Analyze funnel metrics and search quality hypotheses to guide ranking experiments.',
    skillsRequired: 'SQL, Python (pandas), statistical testing, dashboards',
    salaryMin: 1900,
    salaryMax: 3800,
    experience: '1+ years',
    employmentType: 'Full-time',
    workMode: 'REMOTE',
    country: '',
    city: '',
    address: 'Remote',
    requirements: [
      'Experience with exploratory analysis',
      'Clear communication of trade-offs',
      'Basic experimentation mindset',
    ],
    responsibilities: [
      'Produce weekly metrics snapshots',
      'Support A/B sizing where applicable',
      'Partner with PM on KPI definitions',
    ],
  },
  {
    title: 'ML Engineer (Embeddings / NLP)',
    description:
      'Maintain SBERT-backed embedding endpoints and inference reliability for vacancy and resume vectors.',
    skillsRequired: 'Python, PyTorch or transformers inference, ONNX export, REST microservices',
    salaryMin: 3500,
    salaryMax: 7500,
    experience: '2+ years',
    employmentType: 'Full-time',
    workMode: 'REMOTE',
    country: '',
    city: '',
    address: 'Remote',
    requirements: [
      'Strong linear algebra intuition',
      'Experience serving models behind HTTP APIs',
      'Latency and memory awareness',
    ],
    responsibilities: [
      'Tune batching / caching for embeddings',
      'Improve error surfaces for consumers',
      'Coordinate schema for vector dimensions',
    ],
  },
]
