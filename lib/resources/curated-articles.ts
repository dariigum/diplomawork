export type CuratedArticle = {
  title: string
  summary: string
  content: string
  category: "Technology" | "Comparison" | "Career" | "Anti-patterns" | "AI"
  language: "ru" | "en"
  readTime: string
  imageUrl?: string
  sourceUrl: string
  sourceSite: string
  createdAt: string
}

export const ARTICLE_PLACEHOLDER_URL = "/images/article-placeholder.png"

export const curatedArticles: CuratedArticle[] = [
  {
    title: "Where developers feel AI coding tools are working—and where they’re missing the mark",
    summary:
      "Stack Overflow reviews where AI coding assistants help most today and where developers still see weak context, trust, and output quality.",
    content: "Read the full article on Stack Overflow Blog.",
    category: "AI",
    language: "en",
    readTime: "6 min",
    imageUrl: "/images/resources/stackoverflow-ai-tools.jpg",
    sourceUrl:
      "https://stackoverflow.blog/2024/09/23/where-developers-feel-ai-coding-tools-are-working-and-where-they-re-missing-the-mark/",
    sourceSite: "stackoverflow.blog",
    createdAt: "2024-09-23T00:00:00.000Z",
  },
  {
    title: "Vibe coding: Your roadmap to becoming an AI developer",
    summary:
      "GitHub outlines how developers can move from prompt-driven prototyping to shipping AI-powered products with stronger engineering discipline.",
    content: "Read the full article on GitHub Blog.",
    category: "AI",
    language: "en",
    readTime: "5 min",
    imageUrl: "/images/resources/github-vibe.png",
    sourceUrl:
      "https://github.blog/ai-and-ml/vibe-coding-your-roadmap-to-becoming-an-ai-developer/",
    sourceSite: "github.blog",
    createdAt: "2025-05-16T00:00:00.000Z",
  },
  {
    title: "React Labs: What We've Been Working On - March 2023",
    summary:
      "The React team shares progress on Server Components, the React Compiler, asset loading, and the long-term product direction.",
    content: "Read the full article on react.dev.",
    category: "Technology",
    language: "en",
    readTime: "7 min",
    imageUrl: "/images/resources/react-labs.png",
    sourceUrl:
      "https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023",
    sourceSite: "react.dev",
    createdAt: "2023-03-22T00:00:00.000Z",
  },
  {
    title: "Using the Fetch API",
    summary:
      "MDN's guide explains how to send requests with Fetch, work with headers, parse responses, and handle common failure cases cleanly.",
    content: "Read the full article on MDN Web Docs.",
    category: "Technology",
    language: "en",
    readTime: "8 min",
    imageUrl: "/images/resources/mdn-fetch.png",
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch",
    sourceSite: "developer.mozilla.org",
    createdAt: "2024-04-09T00:00:00.000Z",
  },
  {
    title: "WebSocket",
    summary:
      "Wikipedia gives a concise technical overview of the WebSocket protocol and why it enables low-latency two-way communication in web apps.",
    content: "Read the full article on Wikipedia.",
    category: "Technology",
    language: "en",
    readTime: "8 min",
    imageUrl: "/images/resources/websocket.png",
    sourceUrl: "https://en.wikipedia.org/wiki/WebSocket",
    sourceSite: "wikipedia.org",
    createdAt: "2024-01-15T00:00:00.000Z",
  },
  {
    title: "Почему JWT — не панацея: разбор проблем сессий и безопасности",
    summary:
      "Материал разбирает, почему JWT не решает все задачи сессий автоматически и какие риски появляются при неаккуратной реализации.",
    content: "Откройте полную статью на Хабре.",
    category: "Anti-patterns",
    language: "ru",
    readTime: "6 min",
    imageUrl: "/images/resources/habr-jwt.png",
    sourceUrl: "https://habr.com/ru/articles/884912/",
    sourceSite: "habr.com",
    createdAt: "2025-02-22T00:00:00.000Z",
  },
  {
    title: "Как понять свой уровень квалификации: junior, middle или senior",
    summary:
      "Habr Career объясняет, чем реально отличаются уровни разработчиков по самостоятельности, ответственности и влиянию на команду.",
    content: "Откройте полную статью на Habr Career.",
    category: "Career",
    language: "ru",
    readTime: "8 min",
    imageUrl: "/images/resources/habr-career.png",
    sourceUrl: "https://habr.com/ru/companies/habr_career/articles/846530/",
    sourceSite: "habr.com",
    createdAt: "2024-09-27T00:00:00.000Z",
  },
  {
    title: "Как пройти собеседование на позицию Java-разработчика",
    summary:
      "Tproger собрал практические советы по подготовке к интервью на Java-позиции: что повторить, как отвечать и на чем обычно срезаются кандидаты.",
    content: "Откройте полную статью на Tproger.",
    category: "Career",
    language: "ru",
    readTime: "9 min",
    imageUrl: "/images/resources/tproger-java.png",
    sourceUrl: "https://tproger.ru/articles/kak-projti-sobesedovanie-na-poziciyu-java-razrabotchika",
    sourceSite: "tproger.ru",
    createdAt: "2024-11-18T00:00:00.000Z",
  },
  {
    title: "Отличия junior, middle и senior разработчиков — объясняют эксперты",
    summary:
      "Эксперты Tproger разбирают, как меняются ожидания к разработчику по мере роста опыта, зоны ответственности и уровня принятия решений.",
    content: "Откройте полную статью на Tproger.",
    category: "Career",
    language: "ru",
    readTime: "7 min",
    imageUrl: "/images/resources/tproger-levels.jpg",
    sourceUrl: "https://tproger.ru/experts/junior-middle-senior-developers-differences",
    sourceSite: "tproger.ru",
    createdAt: "2024-07-03T00:00:00.000Z",
  },
  {
    title: "Простым языком об HTTP",
    summary:
      "Статья на Хабре простыми словами объясняет, что происходит с HTTP-запросом от браузера до сервера и почему это важно понимать разработчику.",
    content: "Откройте полную статью на Хабре.",
    category: "Technology",
    language: "ru",
    readTime: "9 min",
    imageUrl: "/images/resources/habr-http.png",
    sourceUrl: "https://habr.com/ru/articles/215117/",
    sourceSite: "habr.com",
    createdAt: "2014-03-08T00:00:00.000Z",
  },
  {
    title: "Переходим с Node.js на Go... Но это не точно",
    summary:
      "Автор делится опытом сравнения Node.js и Go на реальном проекте и разбирает компромиссы по производительности, удобству и зрелости инструментов.",
    content: "Откройте полную статью на Хабре.",
    category: "Comparison",
    language: "ru",
    readTime: "7 min",
    imageUrl: "/images/resources/habr-node-go.jpg",
    sourceUrl: "https://habr.com/ru/articles/890882/",
    sourceSite: "habr.com",
    createdAt: "2025-03-24T00:00:00.000Z",
  },
]
