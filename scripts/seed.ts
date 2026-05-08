import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Vacancy, Article } from '../lib/db/schema';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/diplomawork';

type SeedEmployerInput = {
  email: string;
  name: string;
  industry: string;
  description: string;
  location: string;
  employees: string;
  logoUrl: string;
  website?: string;
};

type SeedVacancyInput = {
  employerName: string;
  title: string;
  description: string;
  skillsRequired: string;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
  experience?: string;
  employmentType?: string;
  workFormat?: string;
  workMode?: 'REMOTE' | 'ONSITE';
  country?: string;
  city?: string;
  address?: string;
  requirements?: string[];
  responsibilities?: string[];
};

function initials(name: string) {
  const parts = name
    .replace(/[^a-zA-Zа-яА-Я0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const first = parts[0]?.[0] ?? 'C';
  const second = parts[1]?.[0] ?? (parts[0]?.[1] ?? '');
  return (first + second).toUpperCase();
}

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  await Vacancy.deleteMany({});
  await Article.deleteMany({});
  await User.deleteMany({ role: 'EMPLOYER' });

  // 1. Create Companies (Employers)
  const passwordHash = await bcrypt.hash('password123', 10);
  const employers: SeedEmployerInput[] = [
    {
      email: 'hr@kaspi.kz',
      name: 'Kaspi.kz',
      industry: 'FinTech',
      description: 'Kaspi.kz is the Kazakhstan Super App featuring payments, marketplace, and fintech services.',
      location: 'Almaty, Kazakhstan',
      employees: '5000+',
      logoUrl: 'K',
      website: 'https://kaspi.kz',
    },
    {
      email: 'hr@yandex.ru',
      name: 'Yandex',
      industry: 'IT & Internet',
      description:
        'Technology company building consumer products, cloud, and ML-powered services at massive scale.',
      location: 'Moscow / Remote',
      employees: '10000+',
      logoUrl: 'Y',
      website: 'https://yandex.com',
    },
    {
      email: 'hr@kolesa.kz',
      name: 'Kolesa Group',
      industry: 'E-commerce',
      description:
        'Kazakhstan IT company creating products for auto, real estate, and local services markets.',
      location: 'Almaty, Kazakhstan',
      employees: '501-1000',
      logoUrl: 'KG',
      website: 'https://kolesa.group',
    },
    {
      email: 'jobs@airastana.kz',
      name: 'Air Astana',
      industry: 'Aviation',
      description: 'National airline with a strong focus on service quality, safety, and digital transformation.',
      location: 'Astana, Kazakhstan',
      employees: '5000+',
      logoUrl: initials('Air Astana'),
      website: 'https://airastana.com',
    },
    {
      email: 'people@tele2.kz',
      name: 'Tele2/Altel',
      industry: 'Telecom',
      description: 'Mobile operator focused on customer experience, network quality, and digital services.',
      location: 'Almaty, Kazakhstan',
      employees: '1001-5000',
      logoUrl: initials('Tele2 Altel'),
    },
    {
      email: 'hr@halykbank.kz',
      name: 'Halyk Bank',
      industry: 'Banking',
      description: 'Universal bank with a large retail client base and expanding digital channels.',
      location: 'Almaty, Kazakhstan',
      employees: '10000+',
      logoUrl: initials('Halyk Bank'),
    },
    {
      email: 'hr@magnum.kz',
      name: 'Magnum Cash&Carry',
      industry: 'Retail',
      description: 'Retail chain investing in supply chain automation, analytics, and omnichannel.',
      location: 'Almaty, Kazakhstan',
      employees: '5000+',
      logoUrl: initials('Magnum Cash&Carry'),
    },
    {
      email: 'careers@chocolife.me',
      name: 'Chocolife.me',
      industry: 'E-commerce',
      description: 'Marketplace for services and deals, focusing on growth, retention, and performance marketing.',
      location: 'Almaty / Remote',
      employees: '201-500',
      logoUrl: initials('Chocolife'),
    },
    {
      email: 'team@edutech.kz',
      name: 'EduTech Lab',
      industry: 'Education',
      description: 'EdTech product team building LMS and learning analytics for schools and universities.',
      location: 'Remote',
      employees: '51-200',
      logoUrl: initials('EduTech Lab'),
    },
    {
      email: 'hr@healthplus.kz',
      name: 'HealthPlus Clinic',
      industry: 'Healthcare',
      description: 'Private clinic network improving patient experience via online booking and telemedicine.',
      location: 'Almaty, Kazakhstan',
      employees: '201-500',
      logoUrl: initials('HealthPlus'),
    },
    {
      email: 'careers@logix.kz',
      name: 'LogiX',
      industry: 'Logistics',
      description: 'Last-mile logistics platform working with couriers, warehouses, and route optimization.',
      location: 'Shymkent / Remote',
      employees: '201-500',
      logoUrl: initials('LogiX'),
    },
    {
      email: 'jobs@agrovision.kz',
      name: 'AgroVision',
      industry: 'AgriTech',
      description: 'Precision agriculture team working with drones, IoT sensors, and farm analytics.',
      location: 'Kostanay, Kazakhstan',
      employees: '51-200',
      logoUrl: initials('AgroVision'),
    },
    {
      email: 'hire@fincloud.io',
      name: 'FinCloud',
      industry: 'SaaS',
      description: 'B2B SaaS for finance teams: billing, reporting, and workflow automation.',
      location: 'Remote',
      employees: '51-200',
      logoUrl: initials('FinCloud'),
      website: 'https://fincloud.io',
    },
    {
      email: 'talent@studio-nomad.com',
      name: 'Nomad Studio',
      industry: 'Design & Development',
      description: 'Product design and development studio building web/mobile experiences for startups.',
      location: 'Remote',
      employees: '11-50',
      logoUrl: initials('Nomad Studio'),
    },
    {
      email: 'careers@citygov.kz',
      name: 'CityGov Digital',
      industry: 'GovTech',
      description: 'Digital services team improving municipal online services and internal workflows.',
      location: 'Astana, Kazakhstan',
      employees: '201-500',
      logoUrl: initials('CityGov Digital'),
    },
  ];

  const createdEmployers = await User.insertMany(
    employers.map((e) => ({
      ...e,
      passwordHash,
      role: 'EMPLOYER',
    }))
  );
  const employerByName = new Map(createdEmployers.map((e) => [e.name, e]));
  console.log(`Created ${createdEmployers.length} companies.`);

  // 2. Create Vacancies (Jobs + Freelance)
  const jobs: SeedVacancyInput[] = [
    // Software / Data
    {
      employerName: 'Kolesa Group',
      title: 'Senior React Frontend Developer',
      description:
        'Lead migration to a modern Next.js stack and build high-performance UI for a large user base. Focus on Web Vitals, DX, and component quality.',
      skillsRequired: 'React, TypeScript, Next.js, TanStack Query, TailwindCSS',
      salaryMin: 4000,
      salaryMax: 6500,
      salaryCurrency: 'USD',
      experience: '4+ years',
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      country: 'Kazakhstan',
      city: 'Almaty',
      address: 'Almaty / Remote',
      requirements: [
        '4+ years with React and TypeScript',
        'Experience with SSR/SSG and performance optimization',
        'Strong UI architecture and design system practices',
      ],
      responsibilities: [
        'Own key frontend areas and improve performance',
        'Mentor developers and review code',
        'Collaborate with product and design teams',
      ],
    },
    {
      employerName: 'Kaspi.kz',
      title: 'Node.js Backend Engineer (High-load)',
      description:
        'Build highly available services processing large volumes of requests. Work with observability, idempotency, and reliability patterns.',
      skillsRequired: 'Node.js, TypeScript, PostgreSQL, Redis, Kafka, OpenTelemetry',
      salaryMin: 4500,
      salaryMax: 7500,
      salaryCurrency: 'USD',
      experience: '5+ years',
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      country: 'Kazakhstan',
      city: 'Astana',
      address: 'Astana / Remote',
      requirements: [
        'Production experience with distributed systems',
        'Strong SQL skills and data modeling',
        'Experience with message brokers and async processing',
      ],
      responsibilities: [
        'Design and implement resilient services',
        'Improve latency and reduce operational toil',
        'Write tests and participate in incident reviews',
      ],
    },
    {
      employerName: 'Yandex',
      title: 'Machine Learning Engineer (NLP)',
      description:
        'Work on ranking, query understanding, and LLM-powered features. Build data pipelines and deploy models with strong latency constraints.',
      skillsRequired: 'Python, PyTorch, Transformers, ML Systems, MLOps',
      salaryMin: 5000,
      salaryMax: 9000,
      salaryCurrency: 'USD',
      experience: '3+ years',
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      country: 'Russia',
      city: 'Moscow',
      address: 'Remote',
      requirements: ['Strong ML fundamentals', 'Hands-on with transformer models', 'Experience shipping models to prod'],
      responsibilities: ['Train/fine-tune models', 'Optimize inference', 'Partner with backend teams on deployment'],
    },
    {
      employerName: 'FinCloud',
      title: 'Product Analyst (SaaS)',
      description:
        'Own product metrics, build dashboards, and run experiments to improve activation and retention. Partner with PM and engineering.',
      skillsRequired: 'SQL, Product Analytics, A/B Testing, Amplitude/Mixpanel, Python',
      salaryMin: 2500,
      salaryMax: 4500,
      salaryCurrency: 'USD',
      experience: '2+ years',
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      country: '',
      city: '',
      address: 'Remote',
      responsibilities: ['Define metrics and reporting', 'Analyze funnels and cohorts', 'Support experiment design'],
    },
    {
      employerName: 'LogiX',
      title: 'Data Engineer',
      description:
        'Build reliable data ingestion and modeling for logistics events (orders, couriers, routes). Deliver clean datasets for BI and ML.',
      skillsRequired: 'Python, SQL, Airflow, dbt, BigQuery/Snowflake, Kafka',
      salaryMin: 3200,
      salaryMax: 5200,
      salaryCurrency: 'USD',
      experience: '3+ years',
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      country: 'Kazakhstan',
      city: 'Shymkent',
      address: 'Shymkent / Remote',
      requirements: ['Solid SQL and data modeling', 'Experience with orchestration and ELT', 'Practical data quality approach'],
    },

    // Mobile
    {
      employerName: 'Kaspi.kz',
      title: 'Mobile Developer (Flutter)',
      description:
        'Develop cross-platform features, integrate APIs, and improve reliability. Work closely with product and QA in a fast release cycle.',
      skillsRequired: 'Flutter, Dart, REST APIs, Firebase, CI/CD',
      salaryMin: 2800,
      salaryMax: 4500,
      salaryCurrency: 'USD',
      experience: '2+ years',
      employmentType: 'Full-time',
      workMode: 'ONSITE',
      country: 'Kazakhstan',
      city: 'Almaty',
      address: 'Almaty',
      workFormat: 'Office/Hybrid',
    },
    {
      employerName: 'EduTech Lab',
      title: 'iOS Developer (Swift)',
      description: 'Build learning app features, offline-first modules, and push notification flows. Improve app startup and crash rates.',
      skillsRequired: 'Swift, UIKit/SwiftUI, Combine, REST, CI',
      salaryMin: 2200,
      salaryMax: 4200,
      salaryCurrency: 'USD',
      experience: '2+ years',
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      address: 'Remote',
    },

    // DevOps / Security
    {
      employerName: 'Kolesa Group',
      title: 'DevOps / SRE Engineer',
      description:
        'Improve reliability and developer experience. Operate Kubernetes, observability, and CI/CD with a strong focus on automation.',
      skillsRequired: 'Kubernetes, Terraform, AWS, Linux, CI/CD, Prometheus',
      salaryMin: 3200,
      salaryMax: 5500,
      salaryCurrency: 'USD',
      experience: '2-4 years',
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      address: 'Almaty / Hybrid',
    },
    {
      employerName: 'Halyk Bank',
      title: 'Application Security Engineer',
      description:
        'Partner with engineering teams to improve secure SDLC, threat modeling, and application security tooling. Hands-on role with CI and reviews.',
      skillsRequired: 'AppSec, OWASP, SAST/DAST, Threat Modeling, SDLC, Cloud Security',
      salaryMin: 3500,
      salaryMax: 6000,
      salaryCurrency: 'USD',
      experience: '3+ years',
      employmentType: 'Full-time',
      workMode: 'ONSITE',
      country: 'Kazakhstan',
      city: 'Almaty',
      address: 'Almaty',
      workFormat: 'Office',
    },

    // Business / Operations
    {
      employerName: 'Air Astana',
      title: 'Business Analyst (Digital Products)',
      description:
        'Gather requirements, map processes, and help deliver features for booking, loyalty, and customer support flows.',
      skillsRequired: 'Business Analysis, BPMN/UML, Agile, Stakeholder Management',
      salaryMin: 1500,
      salaryMax: 3000,
      salaryCurrency: 'USD',
      experience: '2+ years',
      employmentType: 'Full-time',
      workMode: 'ONSITE',
      country: 'Kazakhstan',
      city: 'Astana',
      address: 'Astana',
    },
    {
      employerName: 'Magnum Cash&Carry',
      title: 'Supply Chain Planner',
      description:
        'Plan demand and replenishment, improve inventory health, and coordinate with procurement and warehouse teams.',
      skillsRequired: 'Supply Chain, Excel, Forecasting, ERP, Communication',
      salaryMin: 700,
      salaryMax: 1400,
      salaryCurrency: 'USD',
      experience: '1-3 years',
      employmentType: 'Full-time',
      workMode: 'ONSITE',
      country: 'Kazakhstan',
      city: 'Almaty',
      address: 'Almaty',
    },
    {
      employerName: 'HealthPlus Clinic',
      title: 'Customer Support Specialist (Medical Services)',
      description:
        'Help patients with appointments, explain services, and resolve issues via phone/chat. Work with CRM and scheduling systems.',
      skillsRequired: 'Customer Support, CRM, Communication, Empathy',
      salaryMin: 500,
      salaryMax: 900,
      salaryCurrency: 'USD',
      experience: 'Any experience',
      employmentType: 'Full-time',
      workMode: 'ONSITE',
      country: 'Kazakhstan',
      city: 'Almaty',
      address: 'Almaty',
    },
  ];

  const freelance: SeedVacancyInput[] = [
    {
      employerName: 'Nomad Studio',
      title: 'Freelance UI/UX Designer for Mobile Banking',
      description:
        'Project: design 15–20 screens for a mobile banking feature set (onboarding, cards, transfers). Deliver Figma file + clickable prototype. 3–4 weeks.',
      skillsRequired: 'Figma, Mobile UI, UX, Design Systems, Prototyping',
      salaryMin: 1200,
      salaryMax: 2500,
      salaryCurrency: 'USD',
      experience: '2+ years',
      employmentType: 'Freelance',
      workFormat: 'Project-based',
      workMode: 'REMOTE',
      address: 'Remote',
      requirements: ['Portfolio with fintech/mobile work', 'Ability to work with design system components', 'Clear communication'],
      responsibilities: ['Create wireframes and final UI', 'Prepare components and styles', 'Handoff to developers'],
    },
    {
      employerName: 'Chocolife.me',
      title: 'Freelance Copywriter (RU/KZ): Promo landing',
      description:
        'Write copy for a promo landing page + email series (RU preferred, KZ as a plus). Deliver headlines, value props, FAQs. 1 week turnaround.',
      skillsRequired: 'Copywriting, Marketing, Russian, SEO basics',
      salaryMin: 150,
      salaryMax: 400,
      salaryCurrency: 'USD',
      experience: '1+ years',
      employmentType: 'Freelance',
      workFormat: 'Project-based',
      workMode: 'REMOTE',
      address: 'Remote',
    },
    {
      employerName: 'AgroVision',
      title: 'Freelance Computer Vision Engineer (Drone imagery)',
      description:
        'Prototype: detect crop stress areas from drone imagery. Provide notebook + inference script and brief report. 2–3 weeks.',
      skillsRequired: 'Python, OpenCV, PyTorch, Segmentation, Geospatial basics',
      salaryMin: 800,
      salaryMax: 2000,
      salaryCurrency: 'USD',
      experience: '2+ years',
      employmentType: 'Freelance',
      workFormat: 'Project-based',
      workMode: 'REMOTE',
      address: 'Remote',
      requirements: ['Experience with segmentation models', 'Ability to work with large images/tiling', 'Reproducible code'],
    },
    {
      employerName: 'CityGov Digital',
      title: 'Freelance Full-stack Developer: Internal dashboard',
      description:
        'Build a small internal dashboard (users, requests, exports). Stack: Next.js + MongoDB. Deliver MVP in 3 weeks with deployment instructions.',
      skillsRequired: 'Next.js, TypeScript, MongoDB, Auth, TailwindCSS',
      salaryMin: 900,
      salaryMax: 2200,
      salaryCurrency: 'USD',
      experience: '3+ years',
      employmentType: 'Freelance',
      workFormat: 'Project-based',
      workMode: 'REMOTE',
      address: 'Remote',
      responsibilities: ['Implement UI + API routes', 'Add auth and roles', 'Provide deployment and handoff'],
    },
    {
      employerName: 'Tele2/Altel',
      title: 'Freelance Network Automation: Reporting script',
      description:
        'Write a script to collect daily network KPIs from internal endpoints and build a report (CSV + simple chart). 5–7 days.',
      skillsRequired: 'Python, APIs, Data Processing, Linux, Scheduling (cron)',
      salaryMin: 300,
      salaryMax: 700,
      salaryCurrency: 'USD',
      experience: '2+ years',
      employmentType: 'Freelance',
      workFormat: 'Short-term',
      workMode: 'REMOTE',
      address: 'Remote',
    },
    {
      employerName: 'FinCloud',
      title: 'Freelance QA Engineer: Regression pack',
      description:
        'Create a regression test pack for a SaaS app (critical flows + edge cases). Prefer Playwright, but manual checklist is OK. 1–2 weeks.',
      skillsRequired: 'QA, Test Design, Playwright (nice), Bug Reporting, Jira',
      salaryMin: 250,
      salaryMax: 900,
      salaryCurrency: 'USD',
      experience: '1+ years',
      employmentType: 'Freelance',
      workFormat: 'Project-based',
      workMode: 'REMOTE',
      address: 'Remote',
    },
  ];

  const moreJobs: SeedVacancyInput[] = [
    // More variety: marketing, sales, design, HR, finance, junior roles, etc.
    {
      employerName: 'Chocolife.me',
      title: 'Performance Marketing Manager',
      description:
        'Drive growth through paid channels (search/social), improve CAC and ROAS, and collaborate with product analytics for experiments.',
      skillsRequired: 'Google Ads, Meta Ads, Analytics, Experimentation, Budgeting',
      salaryMin: 1200,
      salaryMax: 2500,
      salaryCurrency: 'USD',
      experience: '2+ years',
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      address: 'Almaty / Remote',
    },
    {
      employerName: 'Magnum Cash&Carry',
      title: 'Junior Data Analyst',
      description:
        'Build reports for sales and inventory, maintain dashboards, and support business stakeholders with ad-hoc analysis.',
      skillsRequired: 'Excel, SQL, Power BI/Tableau, Communication',
      salaryMin: 600,
      salaryMax: 1100,
      salaryCurrency: 'USD',
      experience: '0-1 years',
      employmentType: 'Full-time',
      workMode: 'ONSITE',
      country: 'Kazakhstan',
      city: 'Almaty',
      address: 'Almaty',
    },
    {
      employerName: 'Halyk Bank',
      title: 'Financial Controller',
      description:
        'Support monthly closing, budgeting, and reporting. Collaborate with business units and audit for accuracy and compliance.',
      skillsRequired: 'Accounting, IFRS, Excel, Reporting, Attention to detail',
      salaryMin: 1300,
      salaryMax: 2200,
      salaryCurrency: 'USD',
      experience: '3+ years',
      employmentType: 'Full-time',
      workMode: 'ONSITE',
      address: 'Almaty',
    },
    {
      employerName: 'EduTech Lab',
      title: 'Content Manager (Education)',
      description:
        'Manage course content pipeline, coordinate authors, ensure quality and consistency, and publish materials in the platform.',
      skillsRequired: 'Content Management, Editing, Communication, Organization',
      salaryMin: 700,
      salaryMax: 1300,
      salaryCurrency: 'USD',
      experience: '1-3 years',
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      address: 'Remote',
    },
    {
      employerName: 'Nomad Studio',
      title: 'Product Designer',
      description:
        'Design web and mobile products end-to-end: discovery, flows, UI, prototyping, and handoff. Strong craft and communication required.',
      skillsRequired: 'Figma, UX, UI, Prototyping, Design Systems',
      salaryMin: 2000,
      salaryMax: 4200,
      salaryCurrency: 'USD',
      experience: '3+ years',
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      address: 'Remote',
    },
    {
      employerName: 'LogiX',
      title: 'Operations Coordinator (Logistics)',
      description:
        'Coordinate deliveries, resolve incidents, and communicate with couriers and customers. Work with dispatch tools and SLAs.',
      skillsRequired: 'Operations, Communication, Problem Solving, CRM',
      salaryMin: 550,
      salaryMax: 950,
      salaryCurrency: 'USD',
      experience: 'Any experience',
      employmentType: 'Full-time',
      workMode: 'ONSITE',
      address: 'Shymkent',
    },
    {
      employerName: 'Air Astana',
      title: 'IT Support Engineer',
      description:
        'Provide L1/L2 support for internal tools, endpoints, and network access. Document issues and escalate when needed.',
      skillsRequired: 'Windows/macOS, Networking basics, ITSM, Troubleshooting',
      salaryMin: 650,
      salaryMax: 1200,
      salaryCurrency: 'USD',
      experience: '1+ years',
      employmentType: 'Full-time',
      workMode: 'ONSITE',
      address: 'Astana',
    },
    {
      employerName: 'Kaspi.kz',
      title: 'Junior QA Engineer (Manual)',
      description:
        'Test web and mobile features, write test cases, and report bugs. Grow into automation with mentorship.',
      skillsRequired: 'QA, Test Cases, Bug Reporting, API basics',
      salaryMin: 900,
      salaryMax: 1600,
      salaryCurrency: 'USD',
      experience: '0-1 years',
      employmentType: 'Full-time',
      workMode: 'ONSITE',
      address: 'Almaty',
    },
    {
      employerName: 'Kolesa Group',
      title: 'Product Manager (Marketplace)',
      description:
        'Own a marketplace area: define roadmap, prioritize, and collaborate with engineering, design, and analytics.',
      skillsRequired: 'Product Management, Discovery, Analytics, Communication, Agile',
      salaryMin: 2800,
      salaryMax: 5200,
      salaryCurrency: 'USD',
      experience: '3+ years',
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      address: 'Almaty / Remote',
    },
  ];

  // Expand with a deterministic set of additional IT roles across different domains.
  const itRoleTemplates: Omit<SeedVacancyInput, 'employerName'>[] = [
    {
      title: 'Backend Engineer (Java)',
      description: 'Build APIs and services, ensure performance and reliability, and contribute to architecture decisions.',
      skillsRequired: 'Java, Spring Boot, PostgreSQL, Kafka, Docker',
      salaryMin: 2500,
      salaryMax: 5200,
      salaryCurrency: 'USD',
      experience: '3+ years',
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      address: 'Remote',
      requirements: ['Solid OOP and concurrency knowledge', 'Strong SQL', 'Production troubleshooting skills'],
    },
    {
      title: 'Frontend Developer (Vue)',
      description: 'Develop user-facing features, maintain component libraries, and ensure performance and accessibility.',
      skillsRequired: 'Vue.js, TypeScript, Pinia/Vuex, CSS, Testing',
      salaryMin: 1800,
      salaryMax: 3800,
      salaryCurrency: 'USD',
      experience: '2+ years',
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      address: 'Remote',
    },
    {
      title: 'QA Automation Engineer',
      description: 'Build and maintain automated tests, improve test reliability, and integrate with CI pipelines.',
      skillsRequired: 'Playwright/Cypress, TypeScript/JavaScript, CI, Test Design',
      salaryMin: 2000,
      salaryMax: 4200,
      salaryCurrency: 'USD',
      experience: '2+ years',
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      address: 'Remote',
    },
    {
      title: 'UI/UX Designer (Web)',
      description: 'Design modern interfaces, build reusable components, and collaborate closely with engineering for delivery.',
      skillsRequired: 'Figma, UX, UI, Prototyping, Design Systems',
      salaryMin: 1500,
      salaryMax: 3200,
      salaryCurrency: 'USD',
      experience: '2+ years',
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      address: 'Remote',
    },
    {
      title: 'Project Manager (IT)',
      description: 'Coordinate delivery, manage scope, and communicate with stakeholders. Help teams deliver predictably.',
      skillsRequired: 'Project Management, Agile, Communication, Risk management',
      salaryMin: 1300,
      salaryMax: 2800,
      salaryCurrency: 'USD',
      experience: '2+ years',
      employmentType: 'Full-time',
      workMode: 'REMOTE',
      address: 'Remote',
    },
  ];

  const employerRotation = [
    'Kaspi.kz',
    'Kolesa Group',
    'FinCloud',
    'EduTech Lab',
    'LogiX',
    'Chocolife.me',
    'CityGov Digital',
    'Nomad Studio',
    'Tele2/Altel',
    'Halyk Bank',
  ];
  const generated: SeedVacancyInput[] = [];
  for (let i = 0; i < 40; i++) {
    const tpl = itRoleTemplates[i % itRoleTemplates.length];
    const employerName = employerRotation[i % employerRotation.length];
    const city = ['Almaty', 'Astana', 'Shymkent', 'Karaganda', 'Aktobe', 'Remote'][i % 6];
    const workMode: 'REMOTE' | 'ONSITE' = city === 'Remote' ? 'REMOTE' : i % 3 === 0 ? 'ONSITE' : 'REMOTE';
    generated.push({
      employerName,
      ...tpl,
      city: city === 'Remote' ? '' : city,
      country: city === 'Remote' ? '' : 'Kazakhstan',
      workMode,
      address: city === 'Remote' ? 'Remote' : `${city}${workMode === 'REMOTE' ? ' / Hybrid' : ''}`,
      workFormat: workMode === 'REMOTE' ? 'Remote/Hybrid' : 'Office',
      // Small variation to avoid identical titles in feeds
      title: i % 2 === 0 ? tpl.title : `${tpl.title} (${i % 4 === 0 ? 'Product team' : 'Platform'})`,
    });
  }

  const allVacancies: SeedVacancyInput[] = [...jobs, ...moreJobs, ...generated, ...freelance];
  const vacanciesData = allVacancies.map((v) => {
    const employer = employerByName.get(v.employerName);
    if (!employer) throw new Error(`Unknown employer in seed: ${v.employerName}`);
    return {
      employerId: employer._id,
      title: v.title,
      description: v.description,
      skillsRequired: v.skillsRequired,
      salaryMin: v.salaryMin ?? null,
      salaryMax: v.salaryMax ?? null,
      salaryCurrency: v.salaryCurrency ?? 'KZT',
      experience: v.experience ?? 'Any experience',
      employmentType: v.employmentType ?? 'Full-time',
      workFormat: v.workFormat ?? '',
      workMode: v.workMode ?? 'REMOTE',
      country: v.country ?? '',
      city: v.city ?? '',
      address: v.address ?? (v.workMode === 'ONSITE' ? '' : 'Remote'),
      requirements: v.requirements ?? [],
      responsibilities: v.responsibilities ?? [],
      createdAt: new Date(),
    };
  });

  await Vacancy.insertMany(vacanciesData);
  const freelanceCount = vacanciesData.filter((v) => (v.employmentType || '').toLowerCase().includes('freelance')).length;
  console.log(`Created ${vacanciesData.length} vacancies (${freelanceCount} freelance).`);

  // 3. Create Real External Articles
  const articlesData = [
    // Tech Breakdown (RU)
    { title: "Что происходит внутри HTTP-запроса", category: "Technology", language: "ru", readTime: "5 min", summary: "Детальный разбор жизненного цикла HTTP-запроса от браузера до сервера и обратно.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/215117/" },
    { title: "Как работает JWT (и почему его ломают)", category: "Technology", language: "ru", readTime: "7 min", summary: "Разбираем структуру JSON Web Token и частые уязвимости при реализации.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/340146/" },
    { title: "REST vs GraphQL — когда что использовать", category: "Technology", language: "ru", readTime: "6 min", summary: "Честное сравнение подходов к API.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/493576/" },
    { title: "Что такое WebSockets и где они реально нужны", category: "Technology", language: "ru", readTime: "4 min", summary: "Разница между HTTP Polling, Server-Sent Events и WebSockets.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/462433/" },
    // Comparisons (RU)
    { title: "Flutter vs React Native в 2025", category: "Comparison", language: "ru", readTime: "8 min", summary: "Что выбрать для нового мобильного проекта в реалиях 2025 года.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/766420/" },
    { title: "MongoDB vs PostgreSQL", category: "Comparison", language: "ru", readTime: "9 min", summary: "NoSQL или реляционная БД? Честные плюсы и минусы.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/480838/" },
    { title: "Node.js vs Go для backend", category: "Comparison", language: "ru", readTime: "7 min", summary: "Кто побеждает в битве за высоконагруженные микросервисы.", content: "External article...", sourceUrl: "https://tproger.ru/articles/go-vs-nodejs" },
    { title: "Linux vs macOS для разработки", category: "Comparison", language: "ru", readTime: "5 min", summary: "Какая ОС удобнее для программиста.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/653607/" },
    { title: "Firebase vs свой backend", category: "Comparison", language: "ru", readTime: "6 min", summary: "Стоит ли писать свой бекенд или довериться BaaS.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/729742/" },
    // Career (RU)
    { title: "Как подготовиться к техническому собеседованию", category: "Career", language: "ru", readTime: "10 min", summary: "Пошаговый план подготовки к техническим интервью по Node.js и Flutter.", content: "External article...", sourceUrl: "https://tproger.ru/articles/kak-podgotovitsya-k-sobesedovaniyu-na-razrabotchika" },
    { title: "Что реально спрашивают на интервью в СНГ", category: "Career", language: "ru", readTime: "6 min", summary: "Специфика рынка СНГ и частые вопросы HR и технических интервьюеров.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/744376/" },
    { title: "Портфолио разработчика: что должно быть", category: "Career", language: "ru", readTime: "4 min", summary: "Как упаковать свои пет-проекты, чтобы их заметили.", content: "External article...", sourceUrl: "https://tproger.ru/articles/portfolio-razrabotchika" },
    { title: "Junior → Middle: что нужно прокачать", category: "Career", language: "ru", readTime: "7 min", summary: "Ключевые навыки для перехода на следующий грейд.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/699784/" },
    { title: "Какие технологии сейчас переоценены", category: "Career", language: "ru", readTime: "5 min", summary: "На что не стоит тратить время при обучении в этом году.", content: "External article...", sourceUrl: "https://tproger.ru/articles/pereocenennyye-tekhnologii" },
    // Anti-patterns (RU)
    { title: "5 ошибок в backend, которые убивают производительность", category: "Anti-patterns", language: "ru", readTime: "6 min", summary: "Утечки памяти, N+1 запросы и другие распространённые ошибки бекендера.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/776086/" },
    { title: "Почему твой код не масштабируется", category: "Anti-patterns", language: "ru", readTime: "8 min", summary: "Архитектурные ошибки при создании приложений.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/508660/" },
    { title: "Типичные ошибки в Flutter", category: "Anti-patterns", language: "ru", readTime: "5 min", summary: "setState в цикле и перерисовка всего дерева виджетов.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/598093/" },
    { title: "Почему твой API небезопасен", category: "Anti-patterns", language: "ru", readTime: "7 min", summary: "Разбор частых уязвимостей в публичных API.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/731578/" },
    // AI (RU)
    { title: "Как использовать AI в разработке (реальные кейсы)", category: "AI", language: "ru", readTime: "6 min", summary: "GitHub Copilot, ChatGPT и другие инструменты разработчика в повседневности.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/798905/" },
    { title: "Где ChatGPT ускоряет разработку, а где мешает", category: "AI", language: "ru", readTime: "5 min", summary: "Взгляд практика на хайп вокруг нейросетей.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/763076/" },
    { title: "AI в мобильных приложениях: CoreML и TF Lite", category: "AI", language: "ru", readTime: "4 min", summary: "Интеграция machine learning прямо в мобильное приложение.", content: "External article...", sourceUrl: "https://habr.com/ru/articles/683560/" },
    { title: "Будет ли нужен junior-разработчик через 5 лет", category: "AI", language: "ru", readTime: "8 min", summary: "Рассуждения о рынке труда в эпоху генеративного ИИ.", content: "External article...", sourceUrl: "https://tproger.ru/articles/nuzhen-li-budet-junior-razrabotchik" },

    // English articles
    { title: "React Server Components Deep Dive", category: "Technology", language: "en", readTime: "7 min", summary: "A comprehensive guide to React Server Components and when to use them in Next.js.", content: "External article...", sourceUrl: "https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023" },
    { title: "Node.js vs Bun: Which Runtime to Use in 2025", category: "Comparison", language: "en", readTime: "8 min", summary: "A practical comparison of Node.js and Bun runtimes for modern backend development.", content: "External article...", sourceUrl: "https://dev.to/builderio/bun-vs-node-js-everything-you-need-to-know-5723" },
    { title: "10 JavaScript Anti-patterns to Avoid", category: "Anti-patterns", language: "en", readTime: "6 min", summary: "Common JavaScript mistakes that reduce maintainability and performance.", content: "External article...", sourceUrl: "https://dev.to/alexdevero/10-javascript-anti-patterns-to-avoid-5eho" },
    { title: "How to Land Your First Developer Job in 2025", category: "Career", language: "en", readTime: "9 min", summary: "Actionable steps for junior developers to get hired in a competitive market.", content: "External article...", sourceUrl: "https://dev.to/genicsblog/how-to-get-your-first-developer-job-3gpc" },
    { title: "How AI Coding Tools Are Changing Software Development", category: "AI", language: "en", readTime: "5 min", summary: "An honest analysis of GitHub Copilot, Cursor, and other AI tools in the daily workflow.", content: "External article...", sourceUrl: "https://stackoverflow.blog/2024/01/09/how-to-use-ai-coding-tools-in-your-development-workflow/" },

    // Spanish articles
    { title: "Docker y Kubernetes para Principiantes", category: "Technology", language: "es", readTime: "9 min", summary: "Guía práctica para orquestación de contenedores desde cero.", content: "External article...", sourceUrl: "https://dev.to/sebastianordobas/kubernetes-para-principiantes-24aj" },
    { title: "React vs Vue en 2025: ¿Cuál elegir?", category: "Comparison", language: "es", readTime: "7 min", summary: "Comparativa honesta de los dos frameworks más populares para el frontend.", content: "External article...", sourceUrl: "https://dev.to/baumannzone/react-vs-vue-en-2023-cual-elegir-pfl" },
    { title: "Cómo conseguir tu primer trabajo como desarrollador", category: "Career", language: "es", readTime: "8 min", summary: "Consejos prácticos para juniors en el mercado laboral tecnológico.", content: "External article...", sourceUrl: "https://dev.to/manuartero/como-conseguir-tu-primer-trabajo-como-desarrollador-web-1cif" },
  ];

  await Article.insertMany(articlesData);
  console.log(`Created ${articlesData.length} articles with external links.`);

  console.log('Advanced Seeding completed successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
