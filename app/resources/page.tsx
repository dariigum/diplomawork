import Link from "next/link"
import { FileText, Video, BookOpen, Users, ArrowRight, Clock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Header } from "@/components/jobs/header"

const articles = [
  {
    title: "How to Write a Standout Resume in 2024",
    category: "Resume",
    readTime: "5 min read",
    image: "/placeholder.svg"
  },
  {
    title: "10 Most Common Interview Questions (And How to Answer Them)",
    category: "Interview",
    readTime: "8 min read",
    image: "/placeholder.svg"
  },
  {
    title: "Negotiating Your Salary: A Complete Guide",
    category: "Career",
    readTime: "6 min read",
    image: "/placeholder.svg"
  },
  {
    title: "Remote Work Best Practices for 2024",
    category: "Remote",
    readTime: "4 min read",
    image: "/placeholder.svg"
  },
  {
    title: "Building Your Personal Brand on LinkedIn",
    category: "Networking",
    readTime: "7 min read",
    image: "/placeholder.svg"
  },
  {
    title: "Career Change: How to Transition to Tech",
    category: "Career",
    readTime: "10 min read",
    image: "/placeholder.svg"
  }
]

const categories = [
  {
    icon: FileText,
    title: "Resume Tips",
    description: "Create a resume that stands out",
    count: 24
  },
  {
    icon: Video,
    title: "Interview Prep",
    description: "Ace your next interview",
    count: 18
  },
  {
    icon: BookOpen,
    title: "Career Guides",
    description: "Navigate your career path",
    count: 32
  },
  {
    icon: Users,
    title: "Networking",
    description: "Build valuable connections",
    count: 15
  }
]

export default function ResourcesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={0} />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Career Resources</h1>
          <p className="text-muted-foreground mt-2">
            Expert advice and guides to help you land your dream job
          </p>
        </div>

        {/* Categories */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {categories.map((category, index) => (
            <Card key={index} className="hover:border-primary/30 hover:shadow-md transition-all cursor-pointer">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <category.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{category.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                <p className="text-xs text-primary mt-3">{category.count} articles</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Featured Articles */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">Featured Articles</h2>
            <Link href="#" className="text-primary hover:underline flex items-center gap-1 text-sm">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article, index) => (
              <Card key={index} className="overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer">
                <div className="h-40 bg-muted" />
                <CardContent className="p-5">
                  <Badge variant="secondary" className="mb-3">{article.category}</Badge>
                  <h3 className="font-semibold text-foreground line-clamp-2 mb-2">
                    {article.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{article.readTime}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Newsletter */}
        <Card className="bg-primary text-primary-foreground">
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
              <button className="px-6 py-2 bg-background text-foreground rounded-lg font-medium hover:bg-background/90 transition-colors">
                Subscribe
              </button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
