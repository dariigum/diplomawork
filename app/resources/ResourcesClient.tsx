"use client"
import { useState, useMemo } from "react"
import Link from "next/link"
import { FileText, Video, BookOpen, Users, ArrowRight, Clock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useI18n } from "@/lib/i18n/provider"
import { isEnglishDisplayText } from "@/lib/resources/article-text-locale"

interface Article {
  id: string
  title: string
  summary: string
  content: string
  category: string
  language: string
  readTime: string
  imageUrl: string
  sourceUrl: string | null
  sourceSite: string | null
  createdAt: string | null
}

function ArticleCard({ article }: { article: Article }) {
  const { t } = useI18n()

  const card = (
    <Card className="overflow-hidden group-hover:border-primary/50 group-hover:shadow-lg transition-all flex flex-col h-full bg-card">
      <div className="relative h-40 overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={article.imageUrl}
          alt={article.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.currentTarget
            if (target.src.endsWith("/placeholder.svg")) return
            target.src = "/placeholder.svg"
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/30 to-transparent" />
      </div>
      <CardContent className="p-5 flex-1 flex flex-col">
        <Badge variant="secondary" className="mb-3 w-fit group-hover:bg-secondary/80 transition-colors">
          {article.category}
        </Badge>
        <h3 className="font-bold text-lg text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
          {article.title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">{article.summary}</p>
        {article.sourceSite && (
          <p className="text-xs text-muted-foreground mb-3">
            {t.resources.source}: {article.sourceSite}
          </p>
        )}
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium mt-auto pt-4 border-t border-border">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{article.readTime}</span>
          </div>
          {article.sourceUrl ? (
            <div className="flex items-center gap-1 text-primary font-semibold">
              {t.resources.read} <ArrowRight className="h-3 w-3" />
            </div>
          ) : (
            <span className="text-muted-foreground/80">{t.resources.noExternalLink}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )

  if (article.sourceUrl) {
    return (
      <a
        href={article.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block group h-full cursor-pointer"
      >
        {card}
      </a>
    )
  }

  return <div className="block h-full">{card}</div>
}

export default function ResourcesClient({ initialArticles }: { initialArticles: Article[] }) {
  const { t } = useI18n()
  const [activeLang, setActiveLang] = useState<string>("ru")
  const [activeCat, setActiveCat] = useState<string>("All")

  const categoriesList = [
    { id: 'All', title: t.resources.allTopics, icon: BookOpen },
    { id: 'Technology', title: t.resources.techBreakdown, icon: FileText },
    { id: 'Comparison', title: t.resources.comparisons, icon: Users },
    { id: 'Career', title: t.resources.careerMarket, icon: Users },
    { id: 'Anti-patterns', title: t.resources.antiPatterns, icon: Video },
    { id: 'AI', title: t.resources.aiTrends, icon: Video }
  ]

  const languages = [
    { code: "ru", label: "Русский" },
    { code: "en", label: "English" },
  ]

  const filteredArticles = useMemo(() => {
    return initialArticles.filter((a) => {
      const matchLang = a.language === activeLang
      const matchCat = activeCat === "All" ? true : a.category === activeCat
      const matchEnglishTitle = activeLang === "en" ? isEnglishDisplayText(a.title) : true
      return matchLang && matchCat && matchEnglishTitle
    })
  }, [initialArticles, activeLang, activeCat])

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t.resources.careerResources}</h1>
          <p className="text-muted-foreground mt-2">
            {t.resources.expertAdvice}
          </p>
        </div>

        {/* Language Switcher */}
        <div className="flex gap-2">
          {languages.map(lang => (
            <button
              key={lang.code}
              onClick={() => setActiveLang(lang.code)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeLang === lang.code 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-12">
        {categoriesList.map((category) => (
          <Card 
            key={category.id} 
            onClick={() => setActiveCat(category.id)}
            className={`hover:border-primary/50 hover:shadow-md transition-all cursor-pointer ${
              activeCat === category.id ? 'border-primary shadow-sm bg-primary/5' : ''
            }`}
          >
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <category.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-sm">{category.title}</h3>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Articles */}
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground">
            {activeCat === 'All' ? t.resources.latestArticles : `${activeCat} ${t.resources.articles}`}
          </h2>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {t.resources.noArticles}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </div>

      {/* Newsletter */}
      <Card className="bg-primary text-primary-foreground max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">{t.resources.stayUpdated}</h2>
          <p className="opacity-90 mb-6 max-w-md mx-auto">
            {t.resources.getLatestTips}
          </p>
          <div className="flex gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder={t.resources.enterEmail}
              className="flex-1 px-4 py-2 rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
            />
            <button className="px-6 py-2 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 transition-colors">
              {t.resources.subscribe}
            </button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
