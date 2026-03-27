export interface Job {
  id: string
  title: string
  company: string
  companyLogo: string
  location: string
  salary: string
  experience: string
  employmentType: string
  skills: string[]
  description: string
  postedAt: string
  isRemote: boolean
  isFeatured: boolean
  match?: number
  reason?: string
}

export const jobs: Job[] = [
  {
    id: "1",
    title: "Senior Frontend Developer",
    company: "TechFlow Inc.",
    companyLogo: "TF",
    location: "San Francisco, CA",
    salary: "$120,000 - $180,000",
    experience: "5+ years",
    employmentType: "Full-time",
    skills: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
    description: "We're looking for a Senior Frontend Developer to join our growing team and help build next-generation web applications.",
    postedAt: "2 days ago",
    isRemote: true,
    isFeatured: true
  },
  {
    id: "2",
    title: "Backend Engineer",
    company: "DataStream",
    companyLogo: "DS",
    location: "New York, NY",
    salary: "$130,000 - $170,000",
    experience: "3-5 years",
    employmentType: "Full-time",
    skills: ["Node.js", "Python", "PostgreSQL", "AWS"],
    description: "Join our backend team to build scalable APIs and data processing pipelines for millions of users.",
    postedAt: "1 day ago",
    isRemote: false,
    isFeatured: false
  },
  {
    id: "3",
    title: "UI/UX Designer",
    company: "DesignLab",
    companyLogo: "DL",
    location: "Austin, TX",
    salary: "$90,000 - $130,000",
    experience: "3+ years",
    employmentType: "Full-time",
    skills: ["Figma", "Adobe XD", "Prototyping", "User Research"],
    description: "Create beautiful and intuitive user experiences for our suite of enterprise products.",
    postedAt: "3 days ago",
    isRemote: true,
    isFeatured: true
  },
  {
    id: "4",
    title: "DevOps Engineer",
    company: "CloudNine",
    companyLogo: "C9",
    location: "Seattle, WA",
    salary: "$140,000 - $190,000",
    experience: "4+ years",
    employmentType: "Full-time",
    skills: ["Kubernetes", "Docker", "Terraform", "CI/CD"],
    description: "Help us build and maintain our cloud infrastructure serving millions of requests daily.",
    postedAt: "5 hours ago",
    isRemote: true,
    isFeatured: false
  },
  {
    id: "5",
    title: "Product Manager",
    company: "InnovateTech",
    companyLogo: "IT",
    location: "Boston, MA",
    salary: "$110,000 - $150,000",
    experience: "5+ years",
    employmentType: "Full-time",
    skills: ["Agile", "Data Analysis", "Roadmapping", "Stakeholder Management"],
    description: "Lead product strategy and execution for our flagship B2B SaaS platform.",
    postedAt: "1 week ago",
    isRemote: false,
    isFeatured: false
  },
  {
    id: "6",
    title: "Mobile Developer",
    company: "AppWorks",
    companyLogo: "AW",
    location: "Los Angeles, CA",
    salary: "$100,000 - $140,000",
    experience: "2-4 years",
    employmentType: "Full-time",
    skills: ["React Native", "Swift", "Kotlin", "REST APIs"],
    description: "Build and maintain cross-platform mobile applications used by millions of users worldwide.",
    postedAt: "4 days ago",
    isRemote: true,
    isFeatured: true
  },
  {
    id: "7",
    title: "Data Scientist",
    company: "AnalyticsHub",
    companyLogo: "AH",
    location: "Chicago, IL",
    salary: "$125,000 - $165,000",
    experience: "3+ years",
    employmentType: "Full-time",
    skills: ["Python", "Machine Learning", "SQL", "TensorFlow"],
    description: "Apply machine learning and statistical analysis to solve complex business problems.",
    postedAt: "6 days ago",
    isRemote: true,
    isFeatured: false
  },
  {
    id: "8",
    title: "Full Stack Developer",
    company: "WebSolutions",
    companyLogo: "WS",
    location: "Denver, CO",
    salary: "$95,000 - $135,000",
    experience: "2-5 years",
    employmentType: "Contract",
    skills: ["Vue.js", "Node.js", "MongoDB", "GraphQL"],
    description: "Work on exciting greenfield projects using modern web technologies.",
    postedAt: "3 days ago",
    isRemote: false,
    isFeatured: false
  }
]

export const experienceLevels = [
  "Internship",
  "Entry Level",
  "1-2 years",
  "2-4 years",
  "3-5 years",
  "4+ years",
  "5+ years"
]

export const employmentTypes = [
  "Full-time",
  "Part-time",
  "Contract",
  "Freelance",
  "Internship"
]

export const locations = [
  "San Francisco, CA",
  "New York, NY",
  "Austin, TX",
  "Seattle, WA",
  "Boston, MA",
  "Los Angeles, CA",
  "Chicago, IL",
  "Denver, CO",
  "Remote"
]

export const salaryRanges = [
  "Under $50,000",
  "$50,000 - $80,000",
  "$80,000 - $100,000",
  "$100,000 - $130,000",
  "$130,000 - $160,000",
  "$160,000+"
]
