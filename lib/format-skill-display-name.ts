/** UI-only display names for overlap skills; does not change overlap or API data. */

const SKILL_DISPLAY_MAP: Record<string, string> = {
  typescript: 'TypeScript',
  ts: 'TypeScript',
  javascript: 'JavaScript',
  js: 'JavaScript',
  html: 'HTML',
  css: 'CSS',
  'node.js': 'Node.js',
  nodejs: 'Node.js',
  node: 'Node.js',
  'next.js': 'Next.js',
  nextjs: 'Next.js',
  react: 'React',
  reactjs: 'React',
  mongodb: 'MongoDB',
  mongo: 'MongoDB',
  vue: 'Vue.js',
  vuejs: 'Vue.js',
  angular: 'Angular',
  python: 'Python',
  java: 'Java',
  kotlin: 'Kotlin',
  swift: 'Swift',
  golang: 'Go',
  go: 'Go',
  rust: 'Rust',
  php: 'PHP',
  ruby: 'Ruby',
  docker: 'Docker',
  kubernetes: 'Kubernetes',
  k8s: 'Kubernetes',
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
  graphql: 'GraphQL',
  postgresql: 'PostgreSQL',
  postgres: 'PostgreSQL',
  mysql: 'MySQL',
  redis: 'Redis',
  tensorflow: 'TensorFlow',
  pytorch: 'PyTorch',
  figma: 'Figma',
  tailwind: 'Tailwind CSS',
  tailwindcss: 'Tailwind CSS',
  express: 'Express.js',
  'express.js': 'Express.js',
  nestjs: 'NestJS',
  'c#': 'C#',
  csharp: 'C#',
  'c++': 'C++',
  cpp: 'C++',
};

function skillLookupKeys(raw: string): string[] {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();
  const compact = lower.replace(/\s+/g, '');
  const dotted = lower.replace(/\s+/g, '.');
  return [lower, compact, dotted];
}

function toTitleCaseSkill(raw: string): string {
  return raw
    .split(/([\s,/|]+)/)
    .map((part) => {
      if (!part || /^[\s,/|]+$/.test(part)) return part;
      if (part.length <= 4 && part === part.toUpperCase()) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}

export function formatSkillDisplayName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  for (const key of skillLookupKeys(trimmed)) {
    const mapped = SKILL_DISPLAY_MAP[key];
    if (mapped) return mapped;
  }
  return toTitleCaseSkill(trimmed);
}
