import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Vacancy, Article } from '../lib/db/schema';
import * as dotenv from 'dotenv';
import path from 'path';
import { curatedArticles } from '../lib/resources/curated-articles';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/diplomawork';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  await Vacancy.deleteMany({});
  await Article.deleteMany({});
  await User.deleteMany({ role: 'EMPLOYER' });

  // 1. Create Companies (Employers)
  const kaspi = await User.create({
    email: 'hr@kaspi.kz',
    passwordHash: await bcrypt.hash('password123', 10),
    name: 'Kaspi.kz',
    role: 'EMPLOYER',
    industry: 'FinTech',
    description: 'Kaspi.kz is the Kazakhstan Super App featuring payments, marketplace, and fintech services.',
    location: 'Almaty, Kazakhstan',
    employees: '5000+',
    logoUrl: 'K'
  });

  const yandex = await User.create({
    email: 'hr@yandex.ru',
    passwordHash: await bcrypt.hash('password123', 10),
    name: 'Yandex',
    role: 'EMPLOYER',
    industry: 'IT & Internet',
    description: 'Russian multinational technology company specializing in Internet-related products and services.',
    location: 'Moscow / Remote',
    employees: '10000+',
    logoUrl: 'Y'
  });

  const kolesa = await User.create({
    email: 'hr@kolesa.kz',
    passwordHash: await bcrypt.hash('password123', 10),
    name: 'Kolesa Group',
    role: 'EMPLOYER',
    industry: 'E-commerce',
    description: 'The largest IT company in Kazakhstan creating products for the auto, real estate, and services markets.',
    location: 'Almaty, Kazakhstan',
    employees: '501-1000',
    logoUrl: 'KG'
  });

  console.log('Created dynamic companies.');

  // 2. Create Vacancies
  const vacanciesData = [
    {
      employerId: kolesa._id,
      title: "Senior React Frontend Developer",
      description: "We are looking for a Senior Frontend Developer to lead the migration of our legacy systems to a modern Next.js stack, ensuring high performance, scalability, and SEO compliance for our massive user base.",
      skillsRequired: "React, TypeScript, Next.js, Redux, TailwindCSS",
      salaryMin: 4000,
      salaryMax: 6000,
      experience: "3-5 years",
      employmentType: "Full-time",
      address: "Almaty, Kazakhstan",
      requirements: [
        "4+ years of professional React experience",
        "Deep understanding of Next.js and SSR/SSG patterns",
        "Experience building scalable design systems",
        "Strong understanding of Web Vitals and frontend optimization"
      ],
      responsibilities: [
        "Lead the implementation of new SPA features",
        "Mentor junior and middle developers",
        "Participate in architectural reviews and decisions",
        "Optimize existing codebase for fast layout and paint times"
      ]
    },
    {
      employerId: kaspi._id,
      title: "Node.js Backend Engineer",
      description: "Join our FinTech core team. You will be building highly available microservices processing millions of transactions per day in a zero-downtime environment. A strong background in high-load systems is required.",
      skillsRequired: "Node.js, Express, MongoDB, PostgreSQL, Kafka",
      salaryMin: 4500,
      salaryMax: 7000,
      experience: "5+ years",
      employmentType: "Full-time",
      address: "Astana / Remote",
      requirements: [
        "Proven experience dealing with highly concurrent Node.js apps",
        "Expertise in MongoDB aggregations and PostgreSQL sharding",
        "Experience with message brokers like Kafka or RabbitMQ",
        "Solid understanding of software design patterns and clean architecture"
      ],
      responsibilities: [
        "Design and architect resilient microservices",
        "Integrate with 3rd-party banking and payment APIs",
        "Identify and resolve performance bottlenecks",
        "Write robust unit and integration tests (Jest/Mocha)"
      ]
    },
    {
      employerId: yandex._id,
      title: "Machine Learning Engineer (NLP)",
      description: "Yandex is looking for an ML Engineer to significantly improve its core Search and NLP capabilities utilizing large language models.",
      skillsRequired: "Python, PyTorch, C++, Machine Learning, NLP",
      salaryMin: 5000,
      salaryMax: 9000,
      experience: "3+ years",
      employmentType: "Full-time",
      address: "Remote",
      requirements: [
        "Strong fundamental mathematical background",
        "Hands-on experience with modern Transformer architectures",
        "Proficiency in Python and PyTorch",
        "Experience deploying highly optimized models to production using ONNX/TensorRT"
      ],
      responsibilities: [
        "Train and fine-tune Large Language Models",
        "Optimize model inference times for real-time applications",
        "Collaborate with backend engineers to deploy robust inference APIs",
        "Stay up-to-date with cutting edge ML research"
      ]
    },
    {
      employerId: kolesa._id,
      title: "DevOps / SRE Engineer",
      description: "You'll be instrumental in shaping our infrastructure as code, maintaining absolute reliability, and empowering our developers to deploy seamlessly and safely.",
      skillsRequired: "AWS, Kubernetes, Terraform, Docker, CI/CD",
      salaryMin: 3500,
      salaryMax: 5500,
      experience: "2-4 years",
      employmentType: "Full-time",
      address: "Almaty / Hybrid",
      requirements: [
        "Deep understanding of Linux OS",
        "Hands-on production configuration of Kubernetes",
        "Extensive CI/CD pipeline building experience (GitLab / GitHub Actions)",
        "Database administration and tuning experience"
      ],
      responsibilities: [
        "Maintain and optimize our AWS EKS clusters",
        "Write and maintain Terraform scripts for IaC",
        "Monitor system performance using Prometheus/Grafana",
        "Automate the deployment workflows"
      ]
    },
    {
      employerId: kaspi._id,
      title: "Middle Mobile Developer (Flutter)",
      description: "Join our mobile team rewriting legacy native screens into high-performance cross-platform Flutter experiences. Fast-paced, high-impact environment.",
      skillsRequired: "Flutter, Dart, Firebase, REST APIs",
      salaryMin: 3000,
      salaryMax: 4500,
      experience: "2+ years",
      employmentType: "Full-time",
      address: "Almaty",
      requirements: [
        "Strong understanding of Dart and the Flutter framework",
        "Experience with state management libraries (Provider, Riverpod, BLoC)",
        "Familiarity with native integrations (method channels)",
        "Experience publishing apps to App Store and Google Play"
      ],
      responsibilities: [
        "Develop pixel-perfect UIs from Figma designs",
        "Implement complex state management correctly",
        "Integrate strictly typed RESTful APIs",
        "Fix bugs and improve overall app reliability"
      ]
    }
  ];

  await Vacancy.insertMany(vacanciesData);
  console.log('Created 5 detailed vacancies.');

  // 3. Create verified external articles
  await Article.insertMany(
    curatedArticles.map((article) => ({
      ...article,
      createdAt: new Date(article.createdAt),
    }))
  );
  console.log(`Created ${curatedArticles.length} verified external articles.`);

  console.log('Advanced Seeding completed successfully!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
