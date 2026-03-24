import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, Vacancy, Article } from '../lib/db/schema';
import * as dotenv from 'dotenv';
import path from 'path';

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
