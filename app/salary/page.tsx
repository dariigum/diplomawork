"use client"

import { useState } from "react"
import { Search, TrendingUp, DollarSign, MapPin, Briefcase } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Header } from "@/components/jobs/header"

const salaryData = [
  {
    title: "Senior Frontend Developer",
    avgSalary: "$145,000",
    minSalary: "$120,000",
    maxSalary: "$180,000",
    jobs: 1234,
    trend: "+8%"
  },
  {
    title: "Backend Engineer",
    avgSalary: "$150,000",
    minSalary: "$130,000",
    maxSalary: "$170,000",
    jobs: 987,
    trend: "+12%"
  },
  {
    title: "Full Stack Developer",
    avgSalary: "$135,000",
    minSalary: "$95,000",
    maxSalary: "$160,000",
    jobs: 2156,
    trend: "+5%"
  },
  {
    title: "DevOps Engineer",
    avgSalary: "$160,000",
    minSalary: "$140,000",
    maxSalary: "$190,000",
    jobs: 654,
    trend: "+15%"
  },
  {
    title: "UI/UX Designer",
    avgSalary: "$110,000",
    minSalary: "$90,000",
    maxSalary: "$130,000",
    jobs: 432,
    trend: "+3%"
  },
  {
    title: "Data Scientist",
    avgSalary: "$155,000",
    minSalary: "$125,000",
    maxSalary: "$185,000",
    jobs: 876,
    trend: "+10%"
  },
  {
    title: "Product Manager",
    avgSalary: "$140,000",
    minSalary: "$110,000",
    maxSalary: "$170,000",
    jobs: 543,
    trend: "+7%"
  },
  {
    title: "Mobile Developer",
    avgSalary: "$125,000",
    minSalary: "$100,000",
    maxSalary: "$150,000",
    jobs: 765,
    trend: "+6%"
  }
]

const topPayingCities = [
  { city: "San Francisco, CA", avgSalary: "$165,000" },
  { city: "New York, NY", avgSalary: "$155,000" },
  { city: "Seattle, WA", avgSalary: "$150,000" },
  { city: "Boston, MA", avgSalary: "$145,000" },
  { city: "Austin, TX", avgSalary: "$135,000" }
]

export default function SalaryPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredSalaries = salaryData.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      <Header savedJobsCount={0} />

      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Salary Explorer</h1>
          <p className="text-muted-foreground mt-2">
            Research salaries and compensation trends for your career
          </p>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">$142,000</p>
                  <p className="text-sm text-muted-foreground">Average Tech Salary</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">+8.5%</p>
                  <p className="text-sm text-muted-foreground">Year over Year Growth</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">15,000+</p>
                  <p className="text-sm text-muted-foreground">Jobs Available</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search job titles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-12"
              />
            </div>

            {/* Salary List */}
            <div className="space-y-4">
              {filteredSalaries.map((item, index) => (
                <Card key={index} className="hover:border-primary/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-lg text-foreground">{item.title}</h3>
                        <p className="text-sm text-muted-foreground">{item.jobs} open positions</p>
                      </div>
                      <Badge variant="secondary" className="text-accent bg-accent/10">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {item.trend}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{item.minSalary}</span>
                        <span className="font-semibold text-lg text-primary">{item.avgSalary}</span>
                        <span className="text-muted-foreground">{item.maxSalary}</span>
                      </div>
                      <Progress value={60} className="h-2" />
                      <p className="text-xs text-center text-muted-foreground">
                        Average salary based on market data
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Top Paying Cities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topPayingCities.map((city, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="text-sm text-foreground">{city.city}</span>
                      </div>
                      <span className="text-sm font-medium text-primary">{city.avgSalary}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground">
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-2">Get Personalized Insights</h3>
                <p className="text-sm opacity-90 mb-4">
                  Create a profile to get salary recommendations based on your skills and experience.
                </p>
                <a href="/signup" className="inline-block bg-background text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-background/90 transition-colors">
                  Create Profile
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
