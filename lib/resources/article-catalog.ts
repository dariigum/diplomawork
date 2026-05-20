/** Verified external articles only — titles and covers are resolved from source pages at sync time. */
export type ArticleSource = {
  sourceUrl: string
  category: string
  language: "ru" | "en"
  readTime: string
}

export const ARTICLE_CATALOG: ArticleSource[] = [
  // —— Technology (RU) ——
  { sourceUrl: "https://habr.com/ru/articles/215117/", category: "Technology", language: "ru", readTime: "5 min" },
  { sourceUrl: "https://habr.com/ru/articles/340146/", category: "Technology", language: "ru", readTime: "7 min" },
  { sourceUrl: "https://habr.com/ru/articles/790272/", category: "Technology", language: "ru", readTime: "6 min" },
  { sourceUrl: "https://habr.com/ru/articles/696252/", category: "Technology", language: "ru", readTime: "8 min" },
  { sourceUrl: "https://habr.com/ru/articles/480838/", category: "Technology", language: "ru", readTime: "6 min" },
  { sourceUrl: "https://habr.com/ru/articles/667214/", category: "Technology", language: "ru", readTime: "7 min" },
  { sourceUrl: "https://habr.com/ru/articles/766444/", category: "Technology", language: "ru", readTime: "5 min" },
  { sourceUrl: "https://habr.com/ru/articles/963298/", category: "Technology", language: "ru", readTime: "9 min" },
  { sourceUrl: "https://habr.com/ru/articles/888328/", category: "Technology", language: "ru", readTime: "8 min" },

  // —— Comparison (RU) ——
  { sourceUrl: "https://habr.com/ru/articles/272735/", category: "Comparison", language: "ru", readTime: "9 min" },
  { sourceUrl: "https://habr.com/ru/articles/197590/", category: "Comparison", language: "ru", readTime: "8 min" },
  { sourceUrl: "https://habr.com/ru/articles/692736/", category: "Comparison", language: "ru", readTime: "7 min" },

  // —— Career (RU) ——
  { sourceUrl: "https://habr.com/ru/articles/879902/", category: "Career", language: "ru", readTime: "10 min" },
  { sourceUrl: "https://habr.com/ru/articles/530458/", category: "Career", language: "ru", readTime: "8 min" },
  { sourceUrl: "https://habr.com/ru/articles/896690/", category: "Career", language: "ru", readTime: "7 min" },
  { sourceUrl: "https://habr.com/ru/articles/283880/", category: "Career", language: "ru", readTime: "6 min" },
  { sourceUrl: "https://habr.com/ru/articles/808689/", category: "Career", language: "ru", readTime: "6 min" },
  { sourceUrl: "https://habr.com/ru/articles/495800/", category: "Career", language: "ru", readTime: "6 min" },
  { sourceUrl: "https://habr.com/ru/articles/199136/", category: "Career", language: "ru", readTime: "5 min" },
  { sourceUrl: "https://habr.com/ru/articles/231071/", category: "Career", language: "ru", readTime: "8 min" },

  // —— Anti-patterns (RU) ——
  { sourceUrl: "https://habr.com/ru/articles/598093/", category: "Anti-patterns", language: "ru", readTime: "5 min" },
  { sourceUrl: "https://habr.com/ru/articles/731578/", category: "Anti-patterns", language: "ru", readTime: "6 min" },
  { sourceUrl: "https://habr.com/ru/articles/251089/", category: "Anti-patterns", language: "ru", readTime: "6 min" },

  // —— AI (RU) ——
  { sourceUrl: "https://habr.com/ru/articles/910122/", category: "AI", language: "ru", readTime: "9 min" },
  { sourceUrl: "https://habr.com/ru/articles/1030854/", category: "AI", language: "ru", readTime: "8 min" },
  { sourceUrl: "https://habr.com/ru/articles/846732/", category: "AI", language: "ru", readTime: "6 min" },
  { sourceUrl: "https://habr.com/ru/articles/448892/", category: "AI", language: "ru", readTime: "8 min" },
  { sourceUrl: "https://habr.com/ru/articles/548010/", category: "AI", language: "ru", readTime: "7 min" },

  // —— Technology (EN) — English-only sources (MDN, React, web.dev) ——
  {
    sourceUrl: "https://react.dev/blog/2024/04/25/react-19",
    category: "Technology",
    language: "en",
    readTime: "8 min",
  },
  {
    sourceUrl: "https://react.dev/learn/thinking-in-react",
    category: "Technology",
    language: "en",
    readTime: "10 min",
  },
  {
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview",
    category: "Technology",
    language: "en",
    readTime: "8 min",
  },
  {
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Introduction",
    category: "Technology",
    language: "en",
    readTime: "7 min",
  },
  {
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch",
    category: "Technology",
    language: "en",
    readTime: "8 min",
  },
  {
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions",
    category: "Technology",
    language: "en",
    readTime: "8 min",
  },
  {
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures",
    category: "Technology",
    language: "en",
    readTime: "8 min",
  },
  {
    sourceUrl: "https://react.dev/learn/managing-state",
    category: "Technology",
    language: "en",
    readTime: "8 min",
  },
  {
    sourceUrl: "https://web.dev/articles/vitals",
    category: "Technology",
    language: "en",
    readTime: "6 min",
  },

  // —— Comparison (EN) ——
  {
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Learn/Server-side/First_steps/Client-Server_overview",
    category: "Comparison",
    language: "en",
    readTime: "9 min",
  },
  {
    sourceUrl: "https://web.dev/articles/why-https-matters",
    category: "Comparison",
    language: "en",
    readTime: "5 min",
  },
  {
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API",
    category: "Comparison",
    language: "en",
    readTime: "7 min",
  },
  {
    sourceUrl: "https://web.dev/articles/rail",
    category: "Comparison",
    language: "en",
    readTime: "7 min",
  },

  // —— Career (EN) ——
  {
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Learn/Getting_started_with_the_web",
    category: "Career",
    language: "en",
    readTime: "10 min",
  },
  {
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Web_mechanics/How_does_the_Internet_work",
    category: "Career",
    language: "en",
    readTime: "8 min",
  },
  {
    sourceUrl: "https://web.dev/articles/lcp",
    category: "Career",
    language: "en",
    readTime: "7 min",
  },
  {
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Learn/Common_questions/Tools_and_setup/set_up_a_local_testing_server",
    category: "Career",
    language: "en",
    readTime: "6 min",
  },
  {
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Lazy_loading",
    category: "Career",
    language: "en",
    readTime: "7 min",
  },
  {
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG",
    category: "Career",
    language: "en",
    readTime: "7 min",
  },

  // —— Anti-patterns (EN) ——
  {
    sourceUrl: "https://web.dev/articles/avoid-large-complex-layouts-and-layout-thrashing",
    category: "Anti-patterns",
    language: "en",
    readTime: "6 min",
  },
  {
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors",
    category: "Anti-patterns",
    language: "en",
    readTime: "5 min",
  },
  {
    sourceUrl: "https://web.dev/articles/optimize-cls",
    category: "Anti-patterns",
    language: "en",
    readTime: "6 min",
  },
  {
    sourceUrl: "https://web.dev/articles/rendering-performance",
    category: "Anti-patterns",
    language: "en",
    readTime: "7 min",
  },
  {
    sourceUrl: "https://react.dev/learn/choosing-the-state-structure",
    category: "Anti-patterns",
    language: "en",
    readTime: "8 min",
  },

  // —— AI (EN) ——
  {
    sourceUrl: "https://web.dev/explore/ai",
    category: "AI",
    language: "en",
    readTime: "7 min",
  },
  {
    sourceUrl: "https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API",
    category: "AI",
    language: "en",
    readTime: "8 min",
  },
  {
    sourceUrl: "https://web.dev/articles/ai-overview",
    category: "AI",
    language: "en",
    readTime: "6 min",
  },
  {
    sourceUrl: "https://react.dev/blog/2023/03/22/react-labs-what-we-have-been-working-on-march-2023",
    category: "AI",
    language: "en",
    readTime: "7 min",
  },
]

export const ARTICLE_SOURCE_URLS = new Set(ARTICLE_CATALOG.map((entry) => entry.sourceUrl))
