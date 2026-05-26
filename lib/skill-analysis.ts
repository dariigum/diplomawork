/**
 * Skill extraction and analysis utilities.
 * Extracts technology keywords and skills from resume text.
 */

// Comprehensive list of technologies and frameworks organized by category
export const TECH_KEYWORDS = {
  // Languages
  languages: {
    javascript: ['javascript', 'js', 'typescript', 'ts', 'jsx', 'tsx'],
    python: ['python', 'py'],
    java: ['java'],
    cpp: ['c++', 'cpp'],
    csharp: ['c#', 'csharp', 'c-sharp'],
    go: ['go', 'golang'],
    rust: ['rust'],
    php: ['php'],
    ruby: ['ruby'],
    swift: ['swift'],
    kotlin: ['kotlin'],
    scala: ['scala'],
    r: ['r-language', 'r programming'],
    sql: ['sql', 'plsql', 't-sql'],
  },

  // Frontend
  frontend: {
    react: ['react', 'reactjs', 'react.js'],
    vue: ['vue', 'vuejs', 'vue.js'],
    angular: ['angular', 'angularjs'],
    svelte: ['svelte'],
    nextjs: ['next.js', 'nextjs', 'next'],
    nuxt: ['nuxt', 'nuxtjs'],
    html: ['html', 'html5'],
    css: ['css', 'css3'],
    tailwind: ['tailwind', 'tailwindcss'],
    bootstrap: ['bootstrap'],
    mui: ['material-ui', 'mui'],
    radix: ['radix-ui', 'radix'],
    webpack: ['webpack'],
    vite: ['vite'],
  },

  // Backend
  backend: {
    nodejs: ['node.js', 'nodejs', 'node'],
    express: ['express', 'expressjs'],
    django: ['django'],
    flask: ['flask'],
    fastapi: ['fastapi'],
    spring: ['spring', 'spring boot', 'springboot'],
    rails: ['ruby on rails', 'rails'],
    aspnet: ['asp.net', 'asp'],
    laravel: ['laravel'],
    gin: ['gin framework'],
    echo: ['echo framework'],
  },

  // Databases
  databases: {
    postgresql: ['postgresql', 'postgres', 'psql'],
    mysql: ['mysql'],
    mongodb: ['mongodb', 'mongo'],
    redis: ['redis'],
    elasticsearch: ['elasticsearch'],
    cassandra: ['cassandra'],
    dynamodb: ['dynamodb', 'dynamo'],
    firestore: ['firestore'],
  },

  // DevOps & Infrastructure
  devops: {
    docker: ['docker'],
    kubernetes: ['kubernetes', 'k8s'],
    terraform: ['terraform'],
    ansible: ['ansible'],
    jenkins: ['jenkins'],
    gitlab: ['gitlab-ci', 'gitlab'],
    github: ['github actions', 'github'],
    circleci: ['circleci', 'circle ci'],
    aws: ['aws', 'amazon web services'],
    gcp: ['gcp', 'google cloud'],
    azure: ['azure'],
    nginx: ['nginx'],
    apache: ['apache'],
  },

  // Testing
  testing: {
    jest: ['jest'],
    vitest: ['vitest'],
    mocha: ['mocha'],
    chai: ['chai'],
    pytest: ['pytest'],
    unittest: ['unittest'],
    junitTest: ['junit', 'testng'],
    cypress: ['cypress'],
    selenium: ['selenium'],
    playwright: ['playwright'],
  },

  // Version Control
  versionControl: {
    git: ['git', 'github', 'gitlab', 'gitea'],
    svn: ['svn', 'subversion'],
  },

  // Data & AI
  dataScience: {
    pandas: ['pandas'],
    numpy: ['numpy'],
    sklearn: ['scikit-learn', 'sklearn'],
    tensorflow: ['tensorflow'],
    pytorch: ['pytorch'],
    keras: ['keras'],
    spark: ['apache spark', 'spark'],
    jupyter: ['jupyter'],
    matplotlib: ['matplotlib'],
    plotly: ['plotly'],
  },

  // Other Tools
  tools: {
    graphql: ['graphql'],
    rest: ['rest', 'restful', 'rest api'],
    grpc: ['grpc'],
    websocket: ['websocket'],
    oauth: ['oauth', 'oauth2', 'openid'],
    jwt: ['jwt', 'json web token'],
    microservices: ['microservices'],
    serverless: ['serverless', 'lambda'],
  },
} as const

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Extracts normalized skill list from text (resume or description).
 * Returns deduped list of recognized technology keywords.
 */
export function extractSkillsFromText(text: string): string[] {
  if (!text || typeof text !== 'string') return []

  const lowerText = text.toLowerCase()
  const found = new Set<string>()

  // Check each category
  for (const skills of Object.values(TECH_KEYWORDS)) {
    for (const [skillKey, keywords] of Object.entries(skills) as Array<[string, readonly string[]]>) {
      for (const keyword of keywords) {
        const escapedKeyword = escapeRegExp(keyword)
        // Word boundary matching to avoid partial matches
        const regex = new RegExp(`\\b${escapedKeyword}\\b`, 'gi')
        if (regex.test(lowerText)) {
          found.add(skillKey)
        }
      }
    }
  }

  return Array.from(found).sort()
}

/**
 * Categorizes skills by type (language, frontend, backend, etc).
 */
export function categorizeSkills(skills: string[]): Record<string, string[]> {
  const categorized: Record<string, string[]> = {}

  Object.entries(TECH_KEYWORDS).forEach(([category, skillMap]) => {
    const matched = skills.filter((skill) => skillMap.hasOwnProperty(skill))
    if (matched.length > 0) {
      categorized[category] = matched
    }
  })

  return categorized
}

/**
 * Get human-readable name for a skill key.
 * Example: 'javascript' -> 'JavaScript'
 */
export function getSkillDisplayName(skillKey: string): string {
  const displayNames: Record<string, string> = {
    // Languages
    javascript: 'JavaScript',
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    csharp: 'C#',
    go: 'Go',
    rust: 'Rust',
    php: 'PHP',
    ruby: 'Ruby',
    swift: 'Swift',
    kotlin: 'Kotlin',
    scala: 'Scala',
    r: 'R',
    sql: 'SQL',

    // Frontend
    react: 'React',
    vue: 'Vue',
    angular: 'Angular',
    svelte: 'Svelte',
    nextjs: 'Next.js',
    nuxt: 'Nuxt',
    html: 'HTML',
    css: 'CSS',
    tailwind: 'Tailwind CSS',
    bootstrap: 'Bootstrap',
    mui: 'Material-UI',
    radix: 'Radix UI',
    webpack: 'Webpack',
    vite: 'Vite',

    // Backend
    nodejs: 'Node.js',
    express: 'Express',
    django: 'Django',
    flask: 'Flask',
    fastapi: 'FastAPI',
    spring: 'Spring',
    rails: 'Rails',
    aspnet: 'ASP.NET',
    laravel: 'Laravel',
    gin: 'Gin',
    echo: 'Echo',

    // Databases
    postgresql: 'PostgreSQL',
    mysql: 'MySQL',
    mongodb: 'MongoDB',
    redis: 'Redis',
    elasticsearch: 'Elasticsearch',
    cassandra: 'Cassandra',
    dynamodb: 'DynamoDB',
    firestore: 'Firestore',

    // DevOps
    docker: 'Docker',
    kubernetes: 'Kubernetes',
    terraform: 'Terraform',
    ansible: 'Ansible',
    jenkins: 'Jenkins',
    gitlab: 'GitLab CI',
    github: 'GitHub Actions',
    circleci: 'CircleCI',
    aws: 'AWS',
    gcp: 'Google Cloud',
    azure: 'Azure',
    nginx: 'Nginx',
    apache: 'Apache',

    // Testing
    jest: 'Jest',
    vitest: 'Vitest',
    mocha: 'Mocha',
    chai: 'Chai',
    pytest: 'pytest',
    unittest: 'unittest',
    junitTest: 'JUnit',
    cypress: 'Cypress',
    selenium: 'Selenium',
    playwright: 'Playwright',

    // Version Control
    git: 'Git',
    svn: 'SVN',

    // Data & AI
    pandas: 'Pandas',
    numpy: 'NumPy',
    sklearn: 'Scikit-learn',
    tensorflow: 'TensorFlow',
    pytorch: 'PyTorch',
    keras: 'Keras',
    spark: 'Apache Spark',
    jupyter: 'Jupyter',
    matplotlib: 'Matplotlib',
    plotly: 'Plotly',

    // Other
    graphql: 'GraphQL',
    rest: 'REST API',
    grpc: 'gRPC',
    websocket: 'WebSocket',
    oauth: 'OAuth',
    jwt: 'JWT',
    microservices: 'Microservices',
    serverless: 'Serverless',
  }

  return displayNames[skillKey] || skillKey
}

/**
 * Maps all known keywords to their skill keys for reverse lookup.
 */
export function buildKeywordToSkillMap(): Map<string, string> {
  const map = new Map<string, string>()

  for (const skillMap of Object.values(TECH_KEYWORDS)) {
    for (const [skillKey, keywords] of Object.entries(skillMap) as Array<[string, readonly string[]]>) {
      for (const keyword of keywords) {
        map.set(keyword.toLowerCase(), skillKey)
      }
    }
  }

  return map
}

/**
 * Get skill category name (for display).
 */
export function getCategoryDisplayName(category: string): string {
  const displayNames: Record<string, string> = {
    languages: 'Programming Languages',
    frontend: 'Frontend',
    backend: 'Backend',
    databases: 'Databases',
    devops: 'DevOps',
    testing: 'Testing',
    versionControl: 'Version Control',
    dataScience: 'Data Science & AI',
    tools: 'Tools & Protocols',
  }
  return displayNames[category] || category
}
