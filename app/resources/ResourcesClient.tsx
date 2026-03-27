"use client"
import { useState, useMemo } from "react"
import { FileText, Video, BookOpen, Users, ArrowRight, Clock, ExternalLink } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ARTICLE_PLACEHOLDER_URL } from "@/lib/resources/curated-articles"

interface Article {
  id: string
  title: string
  summary: string
  content: string
  category: string
  language: string
  readTime: string
  imageUrl: string
  sourceUrl?: string
  sourceSite: string
  createdAt: string
}

export default function ResourcesClient({ initialArticles }: { initialArticles: Article[] }) {
  const [activeLang, setActiveLang] = useState<string>("ru")
  const [activeCat, setActiveCat] = useState<string>("All")

  const categoriesList = [
    { id: 'All', title: 'All Topics', icon: BookOpen },
    { id: 'Technology', title: 'Tech Breakdown', icon: FileText },
    { id: 'Comparison', title: 'Comparisons', icon: Users },
    { id: 'Career', title: 'Career & Market', icon: Users },
    { id: 'Anti-patterns', title: 'Anti-patterns', icon: Video },
    { id: 'AI', title: 'AI & Trends', icon: Video }
  ]

  const languages = [
    { code: 'ru', label: 'Русский' },
    { code: 'en', label: 'English' }
  ]

  const filteredArticles = useMemo(() => {
    return initialArticles.filter(a => {
      const matchLang = a.language === activeLang
      const matchCat = activeCat === 'All' ? true : a.category === activeCat
      return matchLang && matchCat
    })
  }, [initialArticles, activeLang, activeCat])

  return (
    <main className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Career Resources</h1>
          <p className="text-muted-foreground mt-2">
            Expert advice, guides, and technical deep-dives.
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
            {activeCat === 'All' ? 'Latest Articles' : `${activeCat} Articles`}
          </h2>
        </div>

        {filteredArticles.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No articles found for this language and category.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <a href={article.sourceUrl || "#"} target="_blank" rel="noopener noreferrer" key={article.id} className="block group h-full">
                <Card className="overflow-hidden group-hover:border-primary/50 group-hover:shadow-lg transition-all flex flex-col h-full cursor-pointer bg-card">
                  <div className="relative h-44 overflow-hidden bg-muted">
                    <img
                      src={article.imageUrl || ARTICLE_PLACEHOLDER_URL}
                      alt={article.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.src = ARTICLE_PLACEHOLDER_URL
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/75 via-background/10 to-transparent" />
                    <div className="absolute left-4 top-4 flex items-center gap-2">
                      <Badge variant="secondary">{article.category}</Badge>
                      <Badge variant="outline" className="bg-background/90">
                        {article.sourceSite}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-5 flex-1 flex flex-col">
                    <h3 className="font-bold text-lg text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4 flex-1">
                      {article.summary}
                    </p>
                    <div className="mt-auto space-y-3 border-t border-border pt-4">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Source: {article.sourceSite}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{article.readTime}</span>
                        </div>
                        <div className="flex items-center gap-1 text-primary font-semibold">
                          Read <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Newsletter */}
      <Card className="bg-primary text-primary-foreground max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Stay Updated</h2>
          <p className="opacity-90 mb-6 max-w-md mx-auto">
            Get the latest career tips and job market insights delivered to your inbox.
          </p>
          <div className="flex gap-3 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-4 py-2 rounded-lg bg-background text-foreground placeholder:text-muted-foreground"
            />
            <button className="px-6 py-2 bg-foreground text-background rounded-lg font-medium hover:bg-foreground/90 transition-colors">
              Subscribe
            </button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
